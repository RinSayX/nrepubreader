import * as FileSystem from "expo-file-system/legacy";

import type { Book } from "@/types";

export async function deleteBookFiles(book: Book) {
  await deleteIfExists(book.filePath);
  if (book.coverPath) {
    await deleteIfExists(book.coverPath);
  }
}

async function deleteIfExists(uri: string) {
  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
