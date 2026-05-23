import type { SQLiteDatabase } from "expo-sqlite";
import * as Crypto from "expo-crypto";

import type { Book, Series, SeriesSummary, SortMode } from "@/types";
import { nowIso } from "@/repositories/defaults";

type BookInsert = Omit<Book, "createdAt" | "updatedAt" | "lastOpenedAt">;

export class LibraryRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async listBooks(sort: SortMode): Promise<Book[]> {
    const orderBy =
      sort === "title"
        ? "title COLLATE NOCASE ASC"
        : sort === "created"
          ? "createdAt DESC"
          : "COALESCE(lastOpenedAt, createdAt) DESC";

    return this.db.getAllAsync<Book>(`SELECT * FROM books ORDER BY ${orderBy};`);
  }

  async getBook(bookId: string): Promise<Book | null> {
    const row = await this.db.getFirstAsync<Book>("SELECT * FROM books WHERE id = ?;", bookId);
    return row ?? null;
  }

  async findBookByHash(fileHash: string): Promise<Book | null> {
    const row = await this.db.getFirstAsync<Book>("SELECT * FROM books WHERE fileHash = ?;", fileHash);
    return row ?? null;
  }

  async insertBook(book: BookInsert): Promise<Book> {
    const timestamp = nowIso();
    await this.db.runAsync(
      `INSERT INTO books
        (id, title, author, coverPath, filePath, identifier, fileHash, createdAt, updatedAt, lastOpenedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);`,
      book.id,
      book.title,
      book.author,
      book.coverPath,
      book.filePath,
      book.identifier,
      book.fileHash,
      timestamp,
      timestamp
    );

    return { ...book, createdAt: timestamp, updatedAt: timestamp, lastOpenedAt: null };
  }

  async deleteBook(book: Book): Promise<void> {
    await this.db.runAsync("DELETE FROM books WHERE id = ?;", book.id);
  }

  async markOpened(bookId: string): Promise<void> {
    const timestamp = nowIso();
    await this.db.runAsync("UPDATE books SET lastOpenedAt = ?, updatedAt = ? WHERE id = ?;", timestamp, timestamp, bookId);
  }

  async listSeries(): Promise<Series[]> {
    return this.db.getAllAsync<Series>("SELECT * FROM series ORDER BY name COLLATE NOCASE ASC;");
  }

  async listSeriesSummaries(sort: SortMode): Promise<SeriesSummary[]> {
    const orderBy =
      sort === "title"
        ? "s.name COLLATE NOCASE ASC"
        : sort === "created"
          ? "s.createdAt DESC"
          : "COALESCE(latestOpenedAt, s.createdAt) DESC, s.name COLLATE NOCASE ASC";

    const seriesRows = await this.db.getAllAsync<
      Series & { bookCount: number; latestOpenedAt: string | null; coverPathsCsv: string | null }
    >(
      `SELECT
         s.*,
         (
           SELECT COUNT(*)
           FROM book_series bs
           WHERE bs.seriesId = s.id
         ) AS bookCount,
         (
           SELECT MAX(COALESCE(b.lastOpenedAt, b.createdAt))
           FROM book_series bs
           INNER JOIN books b ON b.id = bs.bookId
           WHERE bs.seriesId = s.id
         ) AS latestOpenedAt,
         (
           SELECT GROUP_CONCAT(coverPath, '||')
           FROM (
             SELECT b.coverPath AS coverPath
             FROM book_series bs
             INNER JOIN books b ON b.id = bs.bookId
             WHERE bs.seriesId = s.id AND b.coverPath IS NOT NULL
             ORDER BY b.title COLLATE NOCASE ASC
             LIMIT 3
           )
         ) AS coverPathsCsv
       FROM series s
       ORDER BY ${orderBy};`
    );

    const summaries = seriesRows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      bookCount: row.bookCount,
      latestOpenedAt: row.latestOpenedAt,
      coverPaths: splitCoverPaths(row.coverPathsCsv)
    }));

    return summaries;
  }

  async createSeries(name: string, description: string | null = null): Promise<Series> {
    const timestamp = nowIso();
    const series: Series = {
      id: cryptoRandomId(),
      name: name.trim(),
      description,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await this.db.runAsync(
      "INSERT INTO series (id, name, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?);",
      series.id,
      series.name,
      series.description,
      series.createdAt,
      series.updatedAt
    );

    return series;
  }

  async updateSeries(seriesId: string, patch: Pick<Series, "name" | "description">): Promise<void> {
    await this.db.runAsync(
      "UPDATE series SET name = ?, description = ?, updatedAt = ? WHERE id = ?;",
      patch.name.trim(),
      patch.description,
      nowIso(),
      seriesId
    );
  }

  async deleteSeries(seriesId: string): Promise<void> {
    await this.db.runAsync("DELETE FROM series WHERE id = ?;", seriesId);
  }

  async listSeriesForBook(bookId: string): Promise<Series[]> {
    return this.db.getAllAsync<Series>(
      `SELECT s.* FROM series s
       INNER JOIN book_series bs ON bs.seriesId = s.id
       WHERE bs.bookId = ?
       ORDER BY bs.orderIndex ASC, s.name COLLATE NOCASE ASC;`,
      bookId
    );
  }

  async listBooksInSeries(seriesId: string): Promise<Book[]> {
    return this.db.getAllAsync<Book>(
      `SELECT b.* FROM books b
       INNER JOIN book_series bs ON bs.bookId = b.id
       WHERE bs.seriesId = ?
       ORDER BY b.title COLLATE NOCASE ASC;`,
      seriesId
    );
  }

  async listUnassignedBooks(): Promise<Book[]> {
    return this.db.getAllAsync<Book>(
      `SELECT b.* FROM books b
       LEFT JOIN book_series bs ON bs.bookId = b.id
       WHERE bs.bookId IS NULL
       ORDER BY COALESCE(b.lastOpenedAt, b.createdAt) DESC, b.title COLLATE NOCASE ASC;`
    );
  }

  async addBookToSeries(bookId: string, seriesId: string): Promise<void> {
    await this.db.runAsync("DELETE FROM book_series WHERE bookId = ?;", bookId);

    const maxRow = await this.db.getFirstAsync<{ maxOrder: number | null }>(
      "SELECT MAX(orderIndex) AS maxOrder FROM book_series WHERE seriesId = ?;",
      seriesId
    );
    const orderIndex = (maxRow?.maxOrder ?? -1) + 1;

    await this.db.runAsync(
      "INSERT OR IGNORE INTO book_series (bookId, seriesId, orderIndex) VALUES (?, ?, ?);",
      bookId,
      seriesId,
      orderIndex
    );
  }

  async removeBookFromSeries(bookId: string, seriesId: string): Promise<void> {
    await this.db.runAsync("DELETE FROM book_series WHERE bookId = ? AND seriesId = ?;", bookId, seriesId);
  }

}

function splitCoverPaths(value: string | null) {
  if (!value) {
    return [];
  }

  return value.split("||").filter(Boolean).slice(0, 3);
}

export function cryptoRandomId() {
  if (typeof Crypto.randomUUID === "function") {
    return Crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
