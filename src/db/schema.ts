export const schemaSql = `
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  author TEXT,
  coverPath TEXT,
  filePath TEXT NOT NULL,
  identifier TEXT,
  fileHash TEXT NOT NULL UNIQUE,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  lastOpenedAt TEXT
);

CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS book_series (
  bookId TEXT NOT NULL,
  seriesId TEXT NOT NULL,
  orderIndex INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bookId, seriesId),
  FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (seriesId) REFERENCES series(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reading_progress (
  bookId TEXT PRIMARY KEY NOT NULL,
  chapterHref TEXT,
  cfi TEXT,
  percentage REAL NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (bookId) REFERENCES books(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reader_preferences (
  id TEXT PRIMARY KEY NOT NULL,
  themeMode TEXT NOT NULL,
  fontFamily TEXT NOT NULL,
  fontSize INTEGER NOT NULL,
  lineHeight REAL NOT NULL,
  backgroundColor TEXT NOT NULL,
  textColor TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_books_last_opened ON books(lastOpenedAt);
CREATE INDEX IF NOT EXISTS idx_book_series_series ON book_series(seriesId, orderIndex);
`;
