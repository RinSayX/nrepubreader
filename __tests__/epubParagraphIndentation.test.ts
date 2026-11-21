/** @jest-environment jsdom */

import { createContext, runInContext } from "node:vm";

import { READER_HTML } from "@/features/reader/webview/readerHtml";

const readerScript = READER_HTML.slice(READER_HTML.lastIndexOf("<script>") + "<script>".length, READER_HTML.lastIndexOf("</script>"));

function createReader(markup: string, css = "") {
  document.head.innerHTML = "";
  const sheet = document.createElement("style");
  sheet.textContent = css;
  document.head.appendChild(sheet);
  document.body.innerHTML = markup;
  const context = createContext({
    window: { addEventListener: jest.fn() },
    document: { addEventListener: jest.fn() },
    chapterDocument: document
  });
  runInContext(readerScript, context);
  return {
    apply: () => runInContext("applyAutomaticParagraphIndentation(chapterDocument)", context),
    loadChapter: () => runInContext(`
      const hooks = [];
      state.rendition = { hooks: { content: { register: (hook) => hooks.push(hook) } } };
      installRenditionContentHooks();
      hooks[0]({ document: chapterDocument });
    `, context)
  };
}

function element(id: string) {
  return document.getElementById(id) as HTMLElement;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("EPUB automatic paragraph indentation", () => {
  it("indents Chinese prose by two character widths without changing its text nodes", () => {
    const reader = createReader('<p id="prose">这是正文，<span>包含行内文字。</span></p>');
    const paragraph = element("prose");
    const originalText = paragraph.textContent;
    const originalNodes = Array.from(paragraph.childNodes);

    reader.apply();

    expect(paragraph.style.textIndent).toBe("2em");
    expect(paragraph.textContent).toBe(originalText);
    expect(Array.from(paragraph.childNodes)).toEqual(originalNodes);
  });

  it.each(["1em", "3em", "32px", "-2em", "calc(1em + 2px)"])("keeps an existing %s CSS indent", (indent) => {
    const reader = createReader('<p id="prose">已经有缩进的正文。</p>', `p { text-indent: ${indent}; }`);

    reader.apply();

    expect(element("prose").style.textIndent).toBe("");
    expect(window.getComputedStyle(element("prose")).textIndent).toBe(indent);
  });

  it("keeps an existing inline indent", () => {
    const reader = createReader('<p id="prose" style="text-indent: 1.5em !important">正文。</p>');

    reader.apply();

    expect(element("prose").style.textIndent).toBe("1.5em");
  });

  it("honors inherited indentation resolved by the browser", () => {
    const reader = createReader('<div style="text-indent: 2em"><p id="prose">继承缩进的正文。</p></div>');
    const originalGetComputedStyle = window.getComputedStyle.bind(window);
    // JSDOM does not resolve inherited text-indent values.
    jest.spyOn(window, "getComputedStyle").mockImplementation((target) => {
      const style = originalGetComputedStyle(target);
      if (target === element("prose")) {
        style.textIndent = "32px";
      }
      return style;
    });

    reader.apply();

    expect(element("prose").style.textIndent).toBe("");
  });

  it("adds an indent when the book explicitly sets a zero indent", () => {
    const reader = createReader('<p id="prose">原来没有缩进的正文。</p>', "p { text-indent: 0 !important; }");

    reader.apply();

    expect(element("prose").style.textIndent).toBe("2em");
    expect(element("prose").style.getPropertyPriority("text-indent")).toBe("important");
  });

  it.each(["\u3000\u3000", "\u00a0\u00a0\u00a0\u00a0", "\n  <span>\u3000\u3000</span>"])("keeps existing visible whitespace indentation: %s", (prefix) => {
    const reader = createReader(`<p id="prose">${prefix}已经通过空格缩进的正文。</p>`);

    reader.apply();

    expect(element("prose").style.textIndent).toBe("");
  });

  it("keeps leading spaces when the book preserves whitespace", () => {
    const reader = createReader('<p id="prose" style="white-space: pre-wrap">    已经缩进的正文。</p>');

    reader.apply();

    expect(element("prose").style.textIndent).toBe("");
  });

  it("skips headings, aligned text, images, navigation, and structured content", () => {
    const reader = createReader(`
      <h2 id="heading">第一章</h2>
      <p id="title" class="chapter-title">第一章</p>
      <div role="heading" id="role-title">卷标题</div>
      <p id="center" style="text-align: center">居中的文字</p>
      <p id="right" style="text-align: right">右对齐的文字</p>
      <p id="image"><img src="cover.jpg" />图片说明</p>
      <nav><p id="navigation">目录文字</p></nav>
      <div epub:type="titlepage"><p id="titlepage">书籍标题</p></div>
      <ul><li><p id="list">列表文字</p></li></ul>
      <table><tbody><tr><td><p id="table">表格文字</p></td></tr></tbody></table>
      <blockquote><p id="quote">引用文字</p></blockquote>
      <p id="english">An English paragraph.</p>
      <p id="empty"> </p>
    `);

    reader.apply();

    document.querySelectorAll<HTMLElement>("[id]").forEach((node) => expect(node.style.textIndent).toBe(""));
  });

  it("indents leaf div paragraphs without indenting their containers", () => {
    const reader = createReader('<div id="container"><div id="div-prose"><span>使用 div 的正文。</span></div><p id="prose">普通段落。</p></div>');

    reader.apply();

    expect(element("container").style.textIndent).toBe("");
    expect(element("div-prose").style.textIndent).toBe("2em");
    expect(element("prose").style.textIndent).toBe("2em");
  });

  it("does not add indentation twice", () => {
    const reader = createReader('<p id="prose">正文内容。</p>');
    reader.apply();
    const originalStyle = element("prose").style.cssText;

    reader.apply();

    expect(element("prose").style.cssText).toBe(originalStyle);
  });

  it("applies indentation through the EPUB chapter content hook", () => {
    const reader = createReader('<p id="prose">新加载章节的正文。</p>');

    reader.loadChapter();

    expect(element("prose").style.textIndent).toBe("2em");
  });
});
