export type ThemeMode = "light" | "dark";

export type SortMode = "recent" | "created" | "title";

export type BookFormat = "epub" | "txt";

export type Book = {
  id: string;
  title: string;
  author: string | null;
  coverPath: string | null;
  filePath: string;
  identifier: string | null;
  fileHash: string;
  format: BookFormat;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
};

export type Series = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SeriesSummary = Series & {
  bookCount: number;
  latestOpenedAt: string | null;
  coverPaths: (string | null)[];
};

export type BookSeries = {
  bookId: string;
  seriesId: string;
  orderIndex: number;
};

export type ReadingProgress = {
  bookId: string;
  chapterHref: string | null;
  cfi: string | null;
  position: number | null;
  percentage: number;
  updatedAt: string;
};

export type ReaderPreference = {
  themeMode: ThemeMode;
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  backgroundColor: string;
  textColor: string;
};

export type TocItem = {
  id: string;
  label: string;
  href: string;
  level: number;
};

export type RootStackParamList = {
  Library: undefined;
  BookDetail: { bookId: string };
  Series: { seriesId: string; seriesName?: string };
  Settings: undefined;
  About: undefined;
  Reader: { bookId: string };
};

export type ReaderThemePayload = {
  themeMode: ThemeMode;
  backgroundColor: string;
  textColor: string;
};

export type ReaderFontPayload = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
};

export type ReaderToWebMessage =
  | {
      type: "START_BOOK_TRANSFER";
      payload: {
        bookId: string;
        totalChunks?: number;
        initialCfi?: string | null;
        initialPosition?: number | null;
        title?: string;
        theme: ReaderThemePayload;
        font: ReaderFontPayload;
      };
    }
  | { type: "BOOK_CHUNK"; payload: { bookId: string; chunk: string; index: number } }
  | { type: "FINISH_BOOK_TRANSFER"; payload: { bookId: string } }
  | { type: "NEXT_PAGE" }
  | { type: "PREV_PAGE" }
  | { type: "GO_TO_HREF"; payload: { href: string } }
  | {
      type: "APPLY_READER_SETTINGS";
      payload: {
        theme: ReaderThemePayload;
        font: ReaderFontPayload;
      };
    };

export type WebToReaderMessage =
  | { type: "WEB_READY" }
  | { type: "BOOK_CHUNK_RECEIVED"; payload: { bookId: string; index: number } }
  | { type: "BOOK_READY"; payload: { title: string; toc: TocItem[] } }
  | {
      type: "LOCATION_CHANGED";
      payload: {
        bookId: string;
        chapterHref: string | null;
        cfi: string | null;
        position?: number | null;
        percentage: number;
      };
    }
  | { type: "RENDER_ERROR"; payload: { code: string; message: string } };
