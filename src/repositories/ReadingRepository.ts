import type { SQLiteDatabase } from "expo-sqlite";

import { DEFAULT_READER_PREFERENCE, READER_PREFERENCE_ID, nowIso } from "@/repositories/defaults";
import type { ReaderPreference, ReadingProgress } from "@/types";

export class ReadingRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async getProgress(bookId: string): Promise<ReadingProgress | null> {
    const row = await this.db.getFirstAsync<ReadingProgress>(
      "SELECT * FROM reading_progress WHERE bookId = ?;",
      bookId
    );
    return row ?? null;
  }

  async saveProgress(progress: Omit<ReadingProgress, "updatedAt">): Promise<ReadingProgress> {
    const updatedAt = nowIso();
    await this.db.runAsync(
      `INSERT INTO reading_progress (bookId, chapterHref, cfi, position, percentage, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(bookId) DO UPDATE SET
         chapterHref = excluded.chapterHref,
         cfi = excluded.cfi,
         position = excluded.position,
         percentage = excluded.percentage,
         updatedAt = excluded.updatedAt;`,
      progress.bookId,
      progress.chapterHref,
      progress.cfi,
      progress.position,
      progress.percentage,
      updatedAt
    );

    return { ...progress, updatedAt };
  }

  async getPreference(): Promise<ReaderPreference> {
    const row = await this.db.getFirstAsync<ReaderPreference>(
      "SELECT themeMode, fontFamily, fontSize, lineHeight, backgroundColor, textColor FROM reader_preferences WHERE id = ?;",
      READER_PREFERENCE_ID
    );
    return row ?? DEFAULT_READER_PREFERENCE;
  }

  async savePreference(preference: ReaderPreference): Promise<ReaderPreference> {
    await this.db.runAsync(
      `INSERT INTO reader_preferences
        (id, themeMode, fontFamily, fontSize, lineHeight, backgroundColor, textColor, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         themeMode = excluded.themeMode,
         fontFamily = excluded.fontFamily,
         fontSize = excluded.fontSize,
         lineHeight = excluded.lineHeight,
         backgroundColor = excluded.backgroundColor,
         textColor = excluded.textColor,
         updatedAt = excluded.updatedAt;`,
      READER_PREFERENCE_ID,
      preference.themeMode,
      preference.fontFamily,
      preference.fontSize,
      preference.lineHeight,
      preference.backgroundColor,
      preference.textColor,
      nowIso()
    );

    return preference;
  }
}
