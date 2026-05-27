import {
  encodeReaderMessage,
  parseWebReaderMessage,
  preferenceToReaderPayload
} from "@/features/reader/webview/messages";
import type { ReaderPreference } from "@/types";

describe("reader message helpers", () => {
  it("encodes RN to WebView messages for injection", () => {
    const encoded = encodeReaderMessage({ type: "NEXT_PAGE" });
    expect(encoded).toContain("NEXT_PAGE");
  });

  it("encodes book transfer messages", () => {
    const encoded = encodeReaderMessage({
      type: "BOOK_CHUNK",
      payload: { bookId: "book-1", chunk: "YWJj", index: 0 }
    });

    expect(encoded).toContain("BOOK_CHUNK");
    expect(encoded).toContain("YWJj");
  });

  it("parses valid WebView messages", () => {
    const parsed = parseWebReaderMessage(
      JSON.stringify({
        type: "LOCATION_CHANGED",
        payload: { bookId: "book-1", chapterHref: "a.xhtml", cfi: "epubcfi(/6/2)", percentage: 0.5 }
      })
    );

    expect(parsed?.type).toBe("LOCATION_CHANGED");
  });

  it("ignores invalid WebView messages", () => {
    expect(parseWebReaderMessage("not-json")).toBeNull();
  });

  it("maps preferences into reader theme and font payloads", () => {
    const preference: ReaderPreference = {
      themeMode: "dark",
      language: "zh-CN",
      fontFamily: "Noto Serif SC",
      fontSize: 20,
      lineHeight: 1.8,
      backgroundColor: "#151515",
      textColor: "#ece7dd"
    };

    expect(preferenceToReaderPayload(preference)).toEqual({
      theme: {
        themeMode: "dark",
        backgroundColor: "#151515",
        textColor: "#ece7dd"
      },
      font: {
        fontFamily: "Noto Serif SC",
        fontSize: 20,
        lineHeight: 1.8
      }
    });
  });
});
