import { create } from "zustand";

import { getDatabase } from "@/db/database";
import { LibraryRepository } from "@/repositories/LibraryRepository";
import { ReadingRepository } from "@/repositories/ReadingRepository";
import { BookImportService } from "@/services/BookImportService";
import { deleteBookFiles } from "@/services/BookFileService";
import type { Book, ReaderPreference, ReadingProgress, Series, SeriesSummary, SortMode } from "@/types";

type LibraryStore = {
  ready: boolean;
  loading: boolean;
  error: string | null;
  sortMode: SortMode;
  books: Book[];
  unassignedBooks: Book[];
  series: Series[];
  seriesSummaries: SeriesSummary[];
  preference: ReaderPreference;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  setSortMode: (sortMode: SortMode) => Promise<void>;
  importBook: () => Promise<Book[]>;
  importBookToSeries: (seriesId: string) => Promise<Book[]>;
  deleteBook: (book: Book) => Promise<void>;
  markBookOpened: (bookId: string) => Promise<void>;
  createSeries: (name: string, description?: string | null) => Promise<Series>;
  updateSeries: (seriesId: string, patch: Pick<Series, "name" | "description">) => Promise<void>;
  deleteSeries: (seriesId: string) => Promise<void>;
  addBookToSeries: (bookId: string, seriesId: string) => Promise<void>;
  removeBookFromSeries: (bookId: string, seriesId: string) => Promise<void>;
  listSeriesForBook: (bookId: string) => Promise<Series[]>;
  listBooksInSeries: (seriesId: string) => Promise<Book[]>;
  getBook: (bookId: string) => Promise<Book | null>;
  getProgress: (bookId: string) => Promise<ReadingProgress | null>;
  saveProgress: (progress: Omit<ReadingProgress, "updatedAt">) => Promise<void>;
  savePreference: (preference: ReaderPreference) => Promise<void>;
};

export const useLibraryStore = create<LibraryStore>((set, get) => ({
  ready: false,
  loading: false,
  error: null,
  sortMode: "recent",
  books: [],
  unassignedBooks: [],
  series: [],
  seriesSummaries: [],
  preference: {
    themeMode: "light",
    fontFamily: "System",
    fontSize: 18,
    lineHeight: 1.65,
    backgroundColor: "#fbf7ef",
    textColor: "#202124"
  },

  async initialize() {
    if (get().ready) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const db = await getDatabase();
      const readingRepo = new ReadingRepository(db);
      const preference = await readingRepo.getPreference();
      set({ preference, ready: true });
      await get().refresh();
    } catch (error) {
      set({ error: errorMessage(error) });
    } finally {
      set({ loading: false });
    }
  },

  async refresh() {
    const db = await getDatabase();
    const repo = new LibraryRepository(db);
    const [books, unassignedBooks, series, seriesSummaries] = await Promise.all([
      repo.listBooks(get().sortMode),
      repo.listUnassignedBooks(),
      repo.listSeries(),
      repo.listSeriesSummaries(get().sortMode)
    ]);
    set({ books, unassignedBooks, series, seriesSummaries });
  },

  async setSortMode(sortMode) {
    set({ sortMode });
    await get().refresh();
  },

  async importBook() {
    set({ loading: true, error: null });
    try {
      const db = await getDatabase();
      const repo = new LibraryRepository(db);
      const imported = await new BookImportService(repo).pickAndImportMany();
      if (imported.length > 0) {
        await get().refresh();
      }
      return imported;
    } catch (error) {
      set({ error: errorMessage(error) });
      return [];
    } finally {
      set({ loading: false });
    }
  },

  async importBookToSeries(seriesId) {
    set({ loading: true, error: null });
    try {
      const db = await getDatabase();
      const repo = new LibraryRepository(db);
      const imported = await new BookImportService(repo).pickAndImportMany();
      if (imported.length > 0) {
        for (const book of imported) {
          await repo.addBookToSeries(book.id, seriesId);
        }
        await get().refresh();
      }
      return imported;
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  async deleteBook(book) {
    const db = await getDatabase();
    const repo = new LibraryRepository(db);
    await repo.deleteBook(book);
    await deleteBookFiles(book);
    await get().refresh();
  },

  async markBookOpened(bookId) {
    const db = await getDatabase();
    await new LibraryRepository(db).markOpened(bookId);
    await get().refresh();
  },

  async createSeries(name, description = null) {
    const db = await getDatabase();
    const series = await new LibraryRepository(db).createSeries(name, description);
    await get().refresh();
    return series;
  },

  async updateSeries(seriesId, patch) {
    const db = await getDatabase();
    await new LibraryRepository(db).updateSeries(seriesId, patch);
    await get().refresh();
  },

  async deleteSeries(seriesId) {
    const db = await getDatabase();
    await new LibraryRepository(db).deleteSeries(seriesId);
    await get().refresh();
  },

  async addBookToSeries(bookId, seriesId) {
    const db = await getDatabase();
    await new LibraryRepository(db).addBookToSeries(bookId, seriesId);
    await get().refresh();
  },

  async removeBookFromSeries(bookId, seriesId) {
    const db = await getDatabase();
    await new LibraryRepository(db).removeBookFromSeries(bookId, seriesId);
    await get().refresh();
  },

  async listSeriesForBook(bookId) {
    const db = await getDatabase();
    return new LibraryRepository(db).listSeriesForBook(bookId);
  },

  async listBooksInSeries(seriesId) {
    const db = await getDatabase();
    return new LibraryRepository(db).listBooksInSeries(seriesId);
  },

  async getBook(bookId) {
    const db = await getDatabase();
    return new LibraryRepository(db).getBook(bookId);
  },

  async getProgress(bookId) {
    const db = await getDatabase();
    return new ReadingRepository(db).getProgress(bookId);
  },

  async saveProgress(progress) {
    const db = await getDatabase();
    await new ReadingRepository(db).saveProgress(progress);
  },

  async savePreference(preference) {
    const db = await getDatabase();
    await new ReadingRepository(db).savePreference(preference);
    set({ preference });
  }
}));

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后重试。";
}
