import type { TocItem } from "@/types";

export function normalizeHref(href: string | null) {
  return (href ?? "").split("#")[0];
}

export function isCurrentChapter(itemHref: string, currentHref: string | null) {
  const normalizedItem = normalizeHref(itemHref);
  const normalizedCurrent = normalizeHref(currentHref);
  return Boolean(normalizedItem && normalizedCurrent && normalizedCurrent.endsWith(normalizedItem));
}

export function currentTocLabel(toc: TocItem[], currentHref: string) {
  return toc.find((item) => isCurrentChapter(item.href, currentHref))?.label ?? currentHref;
}

export function hasTocChildren(toc: TocItem[], index: number) {
  return Boolean(toc[index + 1] && toc[index + 1].level > toc[index].level);
}

export function getCollapsibleTocIds(toc: TocItem[]) {
  return toc.filter((_item, index) => hasTocChildren(toc, index)).map((item) => item.id);
}

export function getVisibleTocItems(toc: TocItem[], collapsedIds: Set<string>) {
  const hiddenLevels: number[] = [];

  return toc.filter((item) => {
    while (hiddenLevels.length > 0 && item.level <= hiddenLevels[hiddenLevels.length - 1]) {
      hiddenLevels.pop();
    }

    const hidden = hiddenLevels.length > 0;
    if (collapsedIds.has(item.id)) {
      hiddenLevels.push(item.level);
    }

    return !hidden;
  });
}

export function getAncestorTocIdsForHref(toc: TocItem[], href: string | null) {
  if (!href) {
    return [];
  }

  const stack: TocItem[] = [];
  for (const item of toc) {
    while (stack.length > 0 && item.level <= stack[stack.length - 1].level) {
      stack.pop();
    }

    if (isCurrentChapter(item.href, href)) {
      return stack.map((ancestor) => ancestor.id);
    }

    stack.push(item);
  }

  return [];
}
