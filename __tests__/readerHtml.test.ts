import { READER_HTML } from "@/reader/readerHtml";

describe("reader HTML dependencies", () => {
  it("bundles JSZip before epub.js without loading reader scripts from a CDN", () => {
    const jszipIndex = READER_HTML.indexOf("JSZip v3.10.1");
    const epubIndex = READER_HTML.indexOf("EPUBJS_VERSION");

    expect(jszipIndex).toBeGreaterThan(-1);
    expect(epubIndex).toBeGreaterThan(-1);
    expect(jszipIndex).toBeLessThan(epubIndex);
    expect(READER_HTML).not.toContain("cdn.jsdelivr.net");
    expect(READER_HTML).not.toContain("<script src=");
  });

  it("shows the first page before generating full-book locations", () => {
    const displayIndex = READER_HTML.indexOf("state.rendition.display");
    const locationIndex = READER_HTML.indexOf("state.book.locations.generate");

    expect(displayIndex).toBeGreaterThan(-1);
    expect(locationIndex).toBeGreaterThan(-1);
    expect(displayIndex).toBeLessThan(locationIndex);
  });

  it("supports chunked book transfer from React Native", () => {
    expect(READER_HTML).toContain("START_BOOK_TRANSFER");
    expect(READER_HTML).toContain("BOOK_CHUNK");
    expect(READER_HTML).toContain("FINISH_BOOK_TRANSFER");
    expect(READER_HTML).toContain("BOOK_CHUNK_RECEIVED");
  });

  it("computes progress before and after full location generation", () => {
    expect(READER_HTML).toContain("computeReadingPercentage");
    expect(READER_HTML).toContain("state.rendition.currentLocation()");
    expect(READER_HTML).toContain("locationsReady");
    expect(READER_HTML).not.toContain("location.start?.percentage");
  });

  it("locks only the outer reader scroll without clipping epub iframe pages", () => {
    expect(READER_HTML).toContain("overscroll-behavior: none");
    expect(READER_HTML).not.toContain("lockRenditionScroll");
    expect(READER_HTML).not.toContain("overflow: hidden !important");
  });

  it("supports horizontal swipe page navigation away from system gesture edges", () => {
    expect(READER_HTML).toContain("installSwipeNavigation");
    expect(READER_HTML).toContain("SWIPE_EDGE_GUARD");
    expect(READER_HTML).toContain("state.rendition.next()");
    expect(READER_HTML).toContain("state.rendition.prev()");
  });

  it("keeps tap page navigation outside the epub iframe coordinate system", () => {
    expect(READER_HTML).not.toContain("TAP_LEFT_RATIO");
    expect(READER_HTML).not.toContain("TAP_RIGHT_RATIO");
  });
});
