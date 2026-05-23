import {
  currentTocLabel,
  getAncestorTocIdsForHref,
  getCollapsibleTocIds,
  getVisibleTocItems,
  hasTocChildren,
  isCurrentChapter
} from "@/reader/toc";
import type { TocItem } from "@/types";

const toc: TocItem[] = [
  { id: "part-1", label: "第一部", href: "part1.xhtml", level: 0 },
  { id: "chapter-1", label: "第一章", href: "chapter1.xhtml", level: 1 },
  { id: "chapter-2", label: "第二章", href: "chapter2.xhtml", level: 1 },
  { id: "part-2", label: "第二部", href: "part2.xhtml", level: 0 },
  { id: "chapter-3", label: "第三章", href: "folder/chapter3.xhtml", level: 1 }
];

describe("toc helpers", () => {
  it("detects collapsible parent items", () => {
    expect(hasTocChildren(toc, 0)).toBe(true);
    expect(hasTocChildren(toc, 1)).toBe(false);
    expect(getCollapsibleTocIds(toc)).toEqual(["part-1", "part-2"]);
  });

  it("hides descendants of collapsed items", () => {
    expect(getVisibleTocItems(toc, new Set(["part-1"])).map((item) => item.id)).toEqual([
      "part-1",
      "part-2",
      "chapter-3"
    ]);
  });

  it("finds ancestors for the current chapter", () => {
    expect(getAncestorTocIdsForHref(toc, "folder/chapter3.xhtml")).toEqual(["part-2"]);
  });

  it("matches and labels the current chapter by normalized href", () => {
    expect(isCurrentChapter("chapter1.xhtml#anchor", "chapter1.xhtml")).toBe(true);
    expect(currentTocLabel(toc, "folder/chapter3.xhtml#page")).toBe("第三章");
  });
});
