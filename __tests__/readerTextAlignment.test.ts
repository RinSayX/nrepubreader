/** @jest-environment jsdom */

import { createContext, runInContext } from "node:vm";

import { preferenceToReaderPayload } from "@/features/reader/webview/messages";
import { READER_HTML } from "@/features/reader/webview/readerHtml";
import { TXT_READER_HTML } from "@/features/reader/webview/txtReaderHtml";
import { DEFAULT_READER_PREFERENCE } from "@/repositories/defaults";

function scriptFromHtml(html: string) {
  return html.slice(html.lastIndexOf("<script>") + "<script>".length, html.lastIndexOf("</script>"));
}

function createEpubReader(markup: string) {
  document.head.innerHTML = "";
  document.body.innerHTML = markup;
  const context = createContext({
    window: { addEventListener: jest.fn() },
    document: { body: { style: {} }, addEventListener: jest.fn() },
    chapterDocument: document,
    settings: preferenceToReaderPayload(DEFAULT_READER_PREFERENCE)
  });
  runInContext(scriptFromHtml(READER_HTML), context);
  runInContext(`
    state.rendition = {
      themes: { default() {} },
      getContents: () => [{ document: chapterDocument }]
    };
  `, context);

  return {
    applySettings: (textAlign?: "justify" | "left") => {
      context.settings.font.textAlign = textAlign;
      runInContext("applySettings(settings.theme, settings.font)", context);
    }
  };
}

function paragraph(id = "prose") {
  return document.getElementById(id) as HTMLElement;
}

describe("reader text alignment", () => {
  it("defaults new reader preferences and bridge messages to justified text", () => {
    expect(DEFAULT_READER_PREFERENCE.textAlign).toBe("justify");
    expect(preferenceToReaderPayload(DEFAULT_READER_PREFERENCE).font.textAlign).toBe("justify");
  });

  it("sends an explicitly selected left alignment to the reader", () => {
    expect(preferenceToReaderPayload({ ...DEFAULT_READER_PREFERENCE, textAlign: "left" }).font.textAlign).toBe("left");
  });

  it("applies justified text to open EPUB paragraphs while keeping last lines at the start", () => {
    const reader = createEpubReader('<p id="prose" style="text-align: left !important">正文内容。</p>');

    reader.applySettings("justify");

    expect(paragraph().style.textAlign).toBe("justify");
    expect(paragraph().style.textAlignLast).toBe("start");
    expect(paragraph().style.getPropertyPriority("text-align")).toBe("important");
  });

  it("switches already displayed EPUB paragraphs between left and justified alignment", () => {
    const reader = createEpubReader('<p id="prose">正文内容。</p>');
    reader.applySettings("justify");

    reader.applySettings("left");
    expect(paragraph().style.textAlign).toBe("left");

    reader.applySettings("justify");
    expect(paragraph().style.textAlign).toBe("justify");
  });

  it("keeps special EPUB formatting and existing paragraph indentation", () => {
    const reader = createEpubReader(`
      <h2 id="heading">章节标题</h2>
      <p id="center" style="text-align: center">居中标题</p>
      <p id="right" style="text-align: right">署名</p>
      <p id="prose" style="text-indent: 2em">正文内容。</p>
    `);

    reader.applySettings("justify");
    reader.applySettings("left");

    expect(paragraph("heading").style.textAlign).toBe("");
    expect(paragraph("center").style.textAlign).toBe("center");
    expect(paragraph("right").style.textAlign).toBe("right");
    expect(paragraph().style.textIndent).toBe("2em");
  });

  it("uses justified text when an older reader message omits the setting", () => {
    const reader = createEpubReader('<p id="prose">正文内容。</p>');

    reader.applySettings();

    expect(paragraph().style.textAlign).toBe("justify");
  });

  it("uses the same TXT alignment for pagination measurement and visible text", () => {
    document.documentElement.innerHTML = TXT_READER_HTML;
    const context = createContext({
      document,
      window: { addEventListener: jest.fn() },
      settings: preferenceToReaderPayload(DEFAULT_READER_PREFERENCE)
    });
    runInContext(scriptFromHtml(TXT_READER_HTML), context);

    runInContext("applySettings(settings.theme, settings.font)", context);
    expect(paragraph("content").style.textAlign).toBe("justify");
    expect(paragraph("measure").style.textAlign).toBe("justify");
    expect(paragraph("content").style.textAlignLast).toBe("start");
    expect(paragraph("measure").style.textAlignLast).toBe("start");

    context.settings.font.textAlign = "left";
    runInContext("applySettings(settings.theme, settings.font)", context);
    expect(paragraph("content").style.textAlign).toBe("left");
    expect(paragraph("measure").style.textAlign).toBe("left");
  });
});
