import { TXT_READER_HTML } from "@/reader/txtReaderHtml";

describe("TXT reader HTML", () => {
  it("supports TXT transfer through the shared reader bridge", () => {
    expect(TXT_READER_HTML).toContain("START_BOOK_TRANSFER");
    expect(TXT_READER_HTML).toContain("BOOK_CHUNK");
    expect(TXT_READER_HTML).toContain("FINISH_BOOK_TRANSFER");
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

  it("uses paginated columns and reports character positions", () => {
    expect(TXT_READER_HTML).toContain("column-fill: auto");
    expect(TXT_READER_HTML).toContain("columnWidth");
    expect(TXT_READER_HTML).toContain("position");
    expect(TXT_READER_HTML).toContain("percentageForPage");
  });
});
