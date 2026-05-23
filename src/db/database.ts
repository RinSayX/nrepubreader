import * as SQLite from "expo-sqlite";

import { schemaSql } from "@/db/schema";

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("nrepubreader.db").then(async (db) => {
      await db.execAsync("PRAGMA foreign_keys = ON;");
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync(schemaSql);
      return db;
    });
  }

  return databasePromise;
}
