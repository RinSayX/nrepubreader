import { posix as path } from "node:path";
import { URL } from "node:url";
import { createContext, runInContext } from "node:vm";

import { READER_HTML } from "@/features/reader/webview/readerHtml";
import type { TocItem, WebToReaderMessage } from "@/types";

type NavigationEntry = { href: string; label?: string; subitems?: NavigationEntry[] };

const readerScript = READER_HTML.slice(READER_HTML.lastIndexOf("<script>") + "<script>".length, READER_HTML.lastIndexOf("</script>"));

function createReader(navigationPath: string, sectionHrefs: string[], useNcx = false) {
  const messages: WebToReaderMessage[] = [];
  const display = jest.fn().mockResolvedValue(undefined);
  const book = {
    packaging: useNcx ? { ncxPath: navigationPath } : { navPath: navigationPath },
    resolve: (href: string) => path.resolve("/OEBPS", href),
    path: { relative: (href: string) => path.relative("/OEBPS", href) },
    spine: {
      get: (href: string) => sectionHrefs.map((sectionHref) => ({ href: sectionHref })).find((section) =>
        decodeURI(section.href) === decodeURI(href.split("#")[0])
      )
    }
  };
  const context = createContext({
    URL,
    setTimeout,
    clearTimeout,
    window: {
      addEventListener: jest.fn(),
      ReactNativeWebView: {
        postMessage: (raw: string) => messages.push(JSON.parse(raw) as WebToReaderMessage)
      }
    },
    document: { addEventListener: jest.fn() },
    book,
    rendition: { display }
  });
  runInContext(readerScript, context);
  runInContext("state.book = book; state.rendition = rendition;", context);
  messages.length = 0;

  return {
    display,
    messages,
    flatten: (items: NavigationEntry[]): TocItem[] => {
      context.items = items;
      return runInContext('flattenToc(items, 0, "")', context) as TocItem[];
    },
    jump: (href: string): Promise<void> => {
      context.href = href;
      return runInContext("goToHref(href)", context) as Promise<void>;
    }
  };
}

describe("EPUB navigation", () => {
  it.each([
    ["Text/nav.xhtml", "section-000004.xhtml#heading", "Text/section-000004.xhtml#heading"],
    ["Navigation/nav.xhtml", "../Text/chapter.xhtml#heading", "Text/chapter.xhtml#heading"],
    ["nav.xhtml", "Text/chapter.xhtml#heading", "Text/chapter.xhtml#heading"],
    ["Text/nav.xhtml", "Text/chapter.xhtml#heading", "Text/chapter.xhtml#heading"],
    ["Text/nav.xhtml", "./chapter.xhtml#heading", "Text/chapter.xhtml#heading"]
  ])("resolves %s links to %s", (navPath, href, expected) => {
    const reader = createReader(navPath, [expected.split("#")[0]]);

    expect(reader.flatten([{ href }])[0].href).toBe(expected);
  });

  it("uses the navigation directory when two chapters have the same filename", () => {
    const reader = createReader("Text/nav.xhtml", ["chapter.xhtml", "Text/chapter.xhtml"]);

    expect(reader.flatten([{ href: "chapter.xhtml#heading" }])[0].href).toBe("Text/chapter.xhtml#heading");
  });

  it("resolves NCX links relative to the NCX file", () => {
    const reader = createReader("Navigation/toc.ncx", ["Text/chapter.xhtml"], true);

    expect(reader.flatten([{ href: "../Text/chapter.xhtml#heading" }])[0].href).toBe("Text/chapter.xhtml#heading");
  });

  it("preserves nested entries, anchors, and encoded Chinese filenames", () => {
    const reader = createReader("Text/nav.xhtml", ["Text/volume.xhtml", "Text/第一章.xhtml"]);
    const items = reader.flatten([{
      href: "volume.xhtml#heading",
      subitems: [{ href: "%E7%AC%AC%E4%B8%80%E7%AB%A0.xhtml#heading" }]
    }]);

    expect(items.map((item) => [item.href, item.level])).toEqual([
      ["Text/volume.xhtml#heading", 0],
      ["Text/第一章.xhtml#heading", 1]
    ]);
  });

  it("keeps unresolved and external links without guessing another chapter", () => {
    const reader = createReader("Text/nav.xhtml", ["Other/chapter.xhtml"]);

    expect(reader.flatten([{ href: "missing.xhtml#heading" }])[0].href).toBe("missing.xhtml#heading");
    expect(reader.flatten([{ href: "https://example.com/chapter.xhtml" }])[0].href).toBe("https://example.com/chapter.xhtml");
  });

  it("displays the normalized section and anchor", async () => {
    const reader = createReader("Text/nav.xhtml", ["Text/section-000004.xhtml"]);
    const [item] = reader.flatten([{ href: "section-000004.xhtml#heading" }]);

    await reader.jump(item.href);

    expect(reader.display).toHaveBeenCalledWith("Text/section-000004.xhtml#heading");
    expect(reader.messages).toEqual([]);
  });

  it("rejects missing targets before they can block the rendition queue", async () => {
    const reader = createReader("Text/nav.xhtml", ["Text/chapter.xhtml"]);

    await reader.jump("missing.xhtml#heading");

    expect(reader.display).not.toHaveBeenCalled();
    expect(reader.messages).toEqual([{
      type: "RENDER_ERROR",
      payload: { code: "NAVIGATION_FAILED", message: expect.any(String) }
    }]);
  });

  it("reports rendition failures to React Native", async () => {
    const reader = createReader("nav.xhtml", ["Text/chapter.xhtml"]);
    reader.display.mockRejectedValueOnce(new Error("No Section Found"));

    await reader.jump("Text/chapter.xhtml#heading");

    expect(reader.messages).toEqual([{
      type: "RENDER_ERROR",
      payload: { code: "NAVIGATION_FAILED", message: expect.stringContaining("No Section Found") }
    }]);
  });

  it("reports a timeout when rendition display never finishes", async () => {
    jest.useFakeTimers();
    try {
      const reader = createReader("nav.xhtml", ["Text/chapter.xhtml"]);
      reader.display.mockReturnValueOnce(new Promise(() => undefined));
      const jump = reader.jump("Text/chapter.xhtml#heading");

      jest.advanceTimersByTime(20000);
      await jump;

      expect(reader.messages).toEqual([{
        type: "RENDER_ERROR",
        payload: { code: "NAVIGATION_FAILED", message: expect.stringContaining("超时") }
      }]);
    } finally {
      jest.useRealTimers();
    }
  });
});
