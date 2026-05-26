import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { getTranslations } from "@/i18n";
import { cryptoRandomId, LibraryRepository } from "@/repositories/LibraryRepository";
import { parseEpubMetadataFromBase64 } from "@/services/epubMetadata";
import type { AppLanguage, Book } from "@/types";

const BOOKS_DIR = `${FileSystem.documentDirectory ?? ""}books/`;
const COVERS_DIR = `${FileSystem.documentDirectory ?? ""}covers/`;
const IMPORT_CONCURRENCY = 2;
const METADATA_ENRICHMENT_CONCURRENCY = 1;

type BookInsert = Omit<Book, "createdAt" | "updatedAt" | "lastOpenedAt">;
type ExistingBookImport = { kind: "existing"; book: Book; fileHash: string };
type NewBookImport = { kind: "new"; book: BookInsert; fileHash: string };
type PreparedBookImport = ExistingBookImport | NewBookImport;

export class BookImportService {
  private readonly t: ReturnType<typeof getTranslations>;

  constructor(
    private readonly libraryRepository: LibraryRepository,
    language: AppLanguage = "zh-CN",
    private readonly onBackgroundMetadataUpdated?: () => void
  ) {
    this.t = getTranslations(language);
  }

  async pickAndImport(): Promise<Book | null> {
    const books = await this.pickAndImportMany();
    return books[0] ?? null;
  }

  async pickAndImportMany(): Promise<Book[]> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/epub+zip", "text/plain", "application/octet-stream"],
      copyToCacheDirectory: true,
      multiple: true
    });

    if (result.canceled) {
      return [];
    }

    const prepared = await mapWithConcurrency(result.assets, IMPORT_CONCURRENCY, (asset) => this.prepareImportFromAsset(asset));
    const imported = await this.commitPreparedImports(prepared);
    this.enrichEpubMetadataInBackground(imported);
    return imported;
  }

  async importFromUri(uri: string, originalName: string): Promise<Book> {
    const [book] = await this.commitPreparedImports([await this.prepareImportFromUri(uri, originalName)]);
    if (!book) {
      throw new Error(this.t.common.operationFailed);
    }
    this.enrichEpubMetadataInBackground([book]);
    return book;
  }

  private prepareImportFromAsset(asset: DocumentPicker.DocumentPickerAsset): Promise<PreparedBookImport> {
    return this.prepareImportFromUri(asset.uri, asset.name, asset.size);
  }

  private async prepareImportFromUri(uri: string, originalName: string, originalSize?: number): Promise<PreparedBookImport> {
    const lowerName = originalName.toLowerCase();
    if (lowerName.endsWith(".txt")) {
      return this.prepareTxtFromUri(uri, originalName, originalSize);
    }
    if (lowerName.endsWith(".epub")) {
      return this.prepareEpubFromUri(uri, originalName, originalSize);
    }
    throw new Error(this.t.bookImport.invalidFile);
  }

  private async prepareEpubFromUri(uri: string, originalName: string, originalSize?: number): Promise<PreparedBookImport> {
    await ensureDirectory(BOOKS_DIR);

    const bookId = cryptoRandomId();
    const filePath = `${BOOKS_DIR}${bookId}.epub`;
    await FileSystem.copyAsync({ from: uri, to: filePath });

    const fileHash = await hashCopiedFile(filePath, originalName, originalSize);
    const existing = await this.libraryRepository.findBookByHash(fileHash);
    if (existing) {
      await deleteFileIfExists(filePath);
      return { kind: "existing", book: existing, fileHash };
    }

    return {
      kind: "new",
      fileHash,
      book: {
        id: bookId,
        title: titleFromFileName(originalName, this.t.bookImport.untitledBook),
        author: null,
        coverPath: null,
        filePath,
        identifier: null,
        fileHash,
        format: "epub"
      }
    };
  }

  private async prepareTxtFromUri(uri: string, originalName: string, originalSize?: number): Promise<PreparedBookImport> {
    await ensureDirectory(BOOKS_DIR);

    const bookId = cryptoRandomId();
    const filePath = `${BOOKS_DIR}${bookId}.txt`;
    await FileSystem.copyAsync({ from: uri, to: filePath });

    const fileHash = await hashCopiedFile(filePath, originalName, originalSize);
    const existing = await this.libraryRepository.findBookByHash(fileHash);
    if (existing) {
      await deleteFileIfExists(filePath);
      return { kind: "existing", book: existing, fileHash };
    }

    return {
      kind: "new",
      fileHash,
      book: {
        id: bookId,
        title: titleFromFileName(originalName, this.t.bookImport.untitledTxt),
        author: null,
        coverPath: null,
        filePath,
        identifier: null,
        fileHash,
        format: "txt"
      }
    };
  }

  private async commitPreparedImports(prepared: PreparedBookImport[]): Promise<Book[]> {
    const knownBooksByHash = new Map<string, Book>();
    const newImportsByHash = new Map<string, NewBookImport>();
    const orderedSlots: (Book | { fileHash: string })[] = [];
    const skippedDuplicateImports: NewBookImport[] = [];

    for (const item of prepared) {
      if (item.kind === "existing") {
        knownBooksByHash.set(item.fileHash, item.book);
        orderedSlots.push(item.book);
        continue;
      }

      const knownBook = knownBooksByHash.get(item.fileHash);
      if (knownBook) {
        skippedDuplicateImports.push(item);
        orderedSlots.push(knownBook);
        continue;
      }

      if (newImportsByHash.has(item.fileHash)) {
        skippedDuplicateImports.push(item);
        orderedSlots.push({ fileHash: item.fileHash });
        continue;
      }

      newImportsByHash.set(item.fileHash, item);
      orderedSlots.push({ fileHash: item.fileHash });
    }

    const insertedBooks = await this.libraryRepository.insertBooks([...newImportsByHash.values()].map((item) => item.book));
    for (const book of insertedBooks) {
      knownBooksByHash.set(book.fileHash, book);
    }
    await Promise.all(skippedDuplicateImports.map(cleanupPreparedImport));

    return orderedSlots.flatMap((slot) => {
      if ("id" in slot) {
        return [slot];
      }
      const book = knownBooksByHash.get(slot.fileHash);
      return book ? [book] : [];
    });
  }

  private enrichEpubMetadataInBackground(books: Book[]) {
    const epubBooks = books.filter((book) => book.format === "epub");
    if (epubBooks.length === 0) {
      return;
    }

    void mapWithConcurrency(epubBooks, METADATA_ENRICHMENT_CONCURRENCY, (book) => this.enrichEpubMetadata(book)).catch(() => {
      // Metadata is an enhancement step; failed parsing should not undo the import.
    });
  }

  private async enrichEpubMetadata(book: Book) {
    await ensureDirectory(COVERS_DIR);

    const base64 = await FileSystem.readAsStringAsync(book.filePath, { encoding: FileSystem.EncodingType.Base64 });
    const metadata = await parseEpubMetadataFromBase64(base64, book.title);
    let coverPath = book.coverPath;

    if (metadata.coverImage) {
      const extension = mimeToExtension(metadata.coverImage.mimeType);
      coverPath = `${COVERS_DIR}${book.id}.${extension}`;
      await FileSystem.writeAsStringAsync(coverPath, metadata.coverImage.base64, {
        encoding: FileSystem.EncodingType.Base64
      });
    }

    await this.libraryRepository.updateBookMetadata(book.id, {
      title: metadata.title || book.title,
      author: metadata.author,
      coverPath,
      identifier: metadata.identifier
    });
    this.onBackgroundMetadataUpdated?.();
  }
}

async function ensureDirectory(path: string) {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

function mimeToExtension(mimeType: string) {
  if (mimeType.includes("png")) {
    return "png";
  }
  if (mimeType.includes("webp")) {
    return "webp";
  }
  return "jpg";
}

function titleFromFileName(fileName: string, fallbackTitle: string) {
  return fileName.replace(/\.[^.]+$/, "").trim() || fallbackTitle;
}

async function hashCopiedFile(filePath: string, originalName: string, originalSize?: number) {
  const info = await FileSystem.getInfoAsync(filePath, { md5: true });
  if (info.exists && info.md5) {
    return `md5:${info.md5}`;
  }

  const size = info.exists ? info.size : (originalSize ?? 0);
  return `quick:${originalName.trim().toLocaleLowerCase()}:${size}`;
}

async function cleanupPreparedImport(item: NewBookImport) {
  await Promise.all([deleteFileIfExists(item.book.filePath), deleteFileIfExists(item.book.coverPath)]);
}

async function deleteFileIfExists(path: string | null) {
  if (!path) {
    return;
  }
  await FileSystem.deleteAsync(path, { idempotent: true });
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(Math.max(1, concurrency), items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    })
  );

  return results;
}
