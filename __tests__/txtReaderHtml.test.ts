import { TXT_READER_HTML } from "@/reader/txtReaderHtml";

describe("TXT reader HTML", () => {
  it("supports TXT transfer through the shared reader bridge", () => {
    expect(TXT_READER_HTML).toContain("START_BOOK_TRANSFER");
    expect(TXT_READER_HTML).toContain("BOOK_CHUNK");
    expect(TXT_READER_HTML).toContain("FINISH_BOOK_TRANSFER");
    expect(TXT_READER_HTML).toContain("BOOK_CHUNK_RECEIVED");
  });

  it("decodes common Chinese TXT encodings", () => {
    expect(TXT_READER_HTML).toContain('TextDecoder("utf-8")');
    expect(TXT_READER_HTML).toContain('TextDecoder("gb18030")');
  });

  it("builds a generated table of contents from chapter headings", () => {
    expect(TXT_READER_HTML).toContain("splitChapters");
    expect(TXT_READER_HTML).toContain("tocFromChapters");
    expect(TXT_READER_HTML).toContain("txt:");
  });

  it("measures and renders one TXT page at a time", () => {
    expect(TXT_READER_HTML).toContain('id="measure"');
    expect(TXT_READER_HTML).toContain("findPageEnd");
    expect(TXT_READER_HTML).toContain("pageFits");
    expect(TXT_READER_HTML).toContain("ensurePageEnd");
    expect(TXT_READER_HTML).not.toContain("columnWidth");
    expect(TXT_READER_HTML).not.toContain("translate3d");
    expect(TXT_READER_HTML).toContain("position");
    expect(TXT_READER_HTML).toContain("percentageForPage");
  });

  it("renders only the active TXT chapter instead of the whole book", () => {
    expect(TXT_READER_HTML).toContain("currentChapterText");
    expect(TXT_READER_HTML).toContain("renderChapterAtPosition");
    expect(TXT_READER_HTML).not.toContain("content.textContent = state.text");
  });

  it("does not report progress before a TXT book id is loaded", () => {
    expect(TXT_READER_HTML).toContain("if (!state.bookId)");
    expect(TXT_READER_HTML).toContain("state.bookId && state.text");
  });
});
