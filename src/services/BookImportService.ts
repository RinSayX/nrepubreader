import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { cryptoRandomId, LibraryRepository } from "@/repositories/LibraryRepository";
import { parseEpubMetadataFromBase64 } from "@/services/epubMetadata";
import type { Book } from "@/types";

const BOOKS_DIR = `${FileSystem.documentDirectory ?? ""}books/`;
const COVERS_DIR = `${FileSystem.documentDirectory ?? ""}covers/`;

export class BookImportService {
  constructor(private readonly libraryRepository: LibraryRepository) {}

  async pickAndImport(): Promise<Book | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/epub+zip", "application/octet-stream"],
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    return this.importFromUri(result.assets[0].uri, result.assets[0].name);
  }

  async importFromUri(uri: string, originalName: string): Promise<Book> {
    if (!originalName.toLowerCase().endsWith(".epub")) {
      throw new Error("请选择 .epub 文件。");
    }

    await ensureDirectory(BOOKS_DIR);
    await ensureDirectory(COVERS_DIR);

    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const fileHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, base64);
    const existing = await this.libraryRepository.findBookByHash(fileHash);
    if (existing) {
      return existing;
    }

    const metadata = await parseEpubMetadataFromBase64(base64);
    const bookId = cryptoRandomId();
    const safeName = `${bookId}.epub`;
    const filePath = `${BOOKS_DIR}${safeName}`;
    await FileSystem.copyAsync({ from: uri, to: filePath });

    let coverPath: string | null = null;
    if (metadata.coverImage) {
      const extension = mimeToExtension(metadata.coverImage.mimeType);
      coverPath = `${COVERS_DIR}${bookId}.${extension}`;
      await FileSystem.writeAsStringAsync(coverPath, metadata.coverImage.base64, {
        encoding: FileSystem.EncodingType.Base64
      });
    }

    return this.libraryRepository.insertBook({
      id: bookId,
      title: metadata.title,
      author: metadata.author,
      coverPath,
      filePath,
      identifier: metadata.identifier,
      fileHash
    });
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
