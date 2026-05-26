import * as SQLite from "expo-sqlite";

import { schemaSql } from "@/db/schema";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("nrepubreader.db").then(async (db) => {
      await db.execAsync("PRAGMA foreign_keys = ON;");
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync(schemaSql);
      await ensureColumn(db, "books", "format", "TEXT NOT NULL DEFAULT 'epub'");
      await ensureColumn(db, "reading_progress", "position", "INTEGER");
      await ensureColumn(db, "reader_preferences", "language", "TEXT NOT NULL DEFAULT 'zh-CN'");
      return db;
    });
  }

  return databasePromise;
}

async function ensureColumn(db: SQLite.SQLiteDatabase, table: string, column: string, definition: string) {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
  if (!columns.some((item) => item.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}
