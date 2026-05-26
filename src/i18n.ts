import type { AppLanguage } from "@/types";

export const languageOptions: { label: string; value: AppLanguage }[] = [
  { label: "简体中文", value: "zh-CN" },
  { label: "English", value: "en" }
];

export function getTranslations(language: AppLanguage) {
  return translations[language] ?? translations["zh-CN"];
}

const translations = {
  "zh-CN": {
    nav: {
      library: "书库",
      bookDetail: "书籍详情",
      seriesDetail: "系列详情",
      settings: "阅读设置",
      about: "关于"
    },
    common: {
      cancel: "取消",
      close: "关闭",
      delete: "删除",
      unknownAuthor: "未知作者",
      operationFailed: "操作失败，请稍后重试。"
    },
    bookImport: {
      invalidFile: "请选择 .epub 或 .txt 文件。",
      untitledBook: "未命名书籍",
      untitledTxt: "未命名 TXT"
    },
    settings: {
      language: "语言",
      nightMode: "夜间模式",
      nightModeHint: "同步应用外壳和阅读页颜色",
      font: "字体",
      fontSize: "字号",
      lineHeight: "行高",
      colors: "背景与文字",
      presets: {
        paper: "纸张",
        white: "纯白",
        eyeCare: "护眼",
        night: "夜间"
      }
    },
    library: {
      createSeriesFailed: "创建失败",
      createSeriesFailedMessage: "请换一个系列名称。",
      deleteFailed: "删除失败",
      deleteFailedMessage: "部分内容可能没有删除成功，请刷新后重试。",
      selectedItems: (count: number) => `已选择 ${count} 项`,
      includesBooks: (count: number) => `包含 ${count} 本书`,
      unassignedBooks: (count: number) => `${count} 本未加入系列的书`,
      seriesAndBooks: (seriesCount: number, bookCount: number) => `${seriesCount} 个系列及其中 ${bookCount} 本书`,
      emptySeries: (count: number) => `${count} 个空系列`,
      deleteBookFilesNote: "相关书籍文件、封面和阅读进度会从本机移除，删除后无法恢复。",
      deleteEmptySeriesNote: "空系列删除后无法恢复。",
      deleteSelectedTitle: "删除所选内容",
      deleteSelectedMessage: (items: string, note: string) => `将删除 ${items}。${note}`,
      searchPlaceholder: "搜索书名、系列或作者",
      emptySearchTitle: "没有找到匹配项",
      emptyLibraryTitle: "还没有书",
      emptySearchHint: "换一个关键词试试。",
      emptyLibraryHint: "导入 EPUB 或 TXT 后，单本书会直接显示；也可以创建系列来收纳多册小说。",
      add: "添加",
      importBooks: "导入书籍",
      newSeries: "新建系列",
      settings: "设置",
      readerSettings: "阅读设置",
      manageLibrary: "管理书库",
      about: "关于",
      newSeriesTitle: "新建系列",
      seriesPlaceholder: "例如：三体",
      create: "创建",
      seriesBookCount: (count: number) => `${count} 本图书`
    },
    about: {
      description: "仅本地离线使用的 EPUB/TXT 阅读器",
      version: "版本",
      build: "构建号",
      license: "许可证",
      repository: "开源项目地址",
      licenseFile: "许可证文件",
      thirdPartyNotices: "第三方组件声明",
      unknown: "未知",
      openLinkFailed: "无法打开链接"
    },
    bookDetail: {
      loadFailed: "加载书籍信息失败，请返回书库后重试。",
      joinFailed: "加入系列失败，请稍后重试。",
      missing: "书籍不存在。",
      startReading: "开始阅读",
      joinSeries: "加入系列",
      series: "所属系列",
      noSeries: "未加入系列",
      singleSeriesOnly: "一本书只能加入一个系列",
      noSeriesCreated: "还没有系列，请先在书库页创建。",
      current: "当前",
      join: "加入"
    },
    reader: {
      back: "返回",
      toc: "目录",
      settings: "设置",
      openFailed: "打开失败",
      prevPage: "上一页",
      nextPage: "下一页",
      close: "关闭",
      collapseAll: "全部收起",
      expandAll: "全部展开",
      emptyToc: "这本书没有可用目录。",
      readFileFailed: "无法读取本地书籍文件。",
      transferTimeout: "书籍传输超时，请重试。",
      transferRestarted: "新的书籍传输已开始。"
    },
    series: {
      loadFailed: "加载系列图书失败，请返回书库后重试。",
      deleteFailed: "删除图书失败，部分内容可能没有删除成功，请刷新后重试。",
      addFailed: "添加图书失败，请稍后重试。",
      importFailed: "导入图书失败，请确认文件为 EPUB 或 TXT 后重试。",
      unassignedTitle: "未分系列",
      selectedBooks: (count: number) => `已选择 ${count} 本`,
      unassignedSubtitle: "这些书还没有放入任何系列",
      bookCount: (count: number) => `${count} 本图书`,
      selectAll: "全选",
      addBooks: "添加图书",
      manage: "管理",
      emptyUnassigned: "没有未分系列的书。",
      emptySeries: "这个系列还没有书。",
      addBooksTitle: "添加图书",
      addBooksSubtitle: (title: string) => `选择要放入「${title}」的书`,
      noAddableBooks: "没有可添加的图书。",
      add: "加入",
      deleteSelectedTitle: "删除所选图书",
      deleteSelectedMessage: (count: number, note: string) =>
        `将删除 ${count} 本书。书籍文件、封面和阅读进度会从本机移除，删除后无法恢复。${note}`,
      emptySeriesNote: " 删除后该系列会保留为空系列。"
    }
  },
  en: {
    nav: {
      library: "Library",
      bookDetail: "Book Details",
      seriesDetail: "Series Details",
      settings: "Reading Settings",
      about: "About"
    },
    common: {
      cancel: "Cancel",
      close: "Close",
      delete: "Delete",
      unknownAuthor: "Unknown author",
      operationFailed: "Operation failed. Please try again later."
    },
    bookImport: {
      invalidFile: "Please select an .epub or .txt file.",
      untitledBook: "Untitled book",
      untitledTxt: "Untitled TXT"
    },
    settings: {
      language: "Language",
      nightMode: "Night mode",
      nightModeHint: "Apply colors to the app shell and reader",
      font: "Font",
      fontSize: "Font size",
      lineHeight: "Line height",
      colors: "Background and text",
      presets: {
        paper: "Paper",
        white: "White",
        eyeCare: "Eye care",
        night: "Night"
      }
    },
    library: {
      createSeriesFailed: "Create failed",
      createSeriesFailedMessage: "Please use another series name.",
      deleteFailed: "Delete failed",
      deleteFailedMessage: "Some items may not have been deleted. Please refresh and try again.",
      selectedItems: (count: number) => `${count} selected`,
      includesBooks: (count: number) => `Includes ${count} book${count === 1 ? "" : "s"}`,
      unassignedBooks: (count: number) => `${count} unassigned book${count === 1 ? "" : "s"}`,
      seriesAndBooks: (seriesCount: number, bookCount: number) =>
        `${seriesCount} series and ${bookCount} book${bookCount === 1 ? "" : "s"} in them`,
      emptySeries: (count: number) => `${count} empty series`,
      deleteBookFilesNote: "Book files, covers, and reading progress will be removed from this device. This cannot be undone.",
      deleteEmptySeriesNote: "Empty series will be deleted. This cannot be undone.",
      deleteSelectedTitle: "Delete selected items",
      deleteSelectedMessage: (items: string, note: string) => `This will delete ${items}. ${note}`,
      searchPlaceholder: "Search books, series, or authors",
      emptySearchTitle: "No matches",
      emptyLibraryTitle: "No books yet",
      emptySearchHint: "Try another keyword.",
      emptyLibraryHint: "Import EPUB or TXT files, or create a series for multi-volume novels.",
      add: "Add",
      importBooks: "Import books",
      newSeries: "New series",
      settings: "Settings",
      readerSettings: "Reading settings",
      manageLibrary: "Manage library",
      about: "About",
      newSeriesTitle: "New series",
      seriesPlaceholder: "e.g. The Three-Body Problem",
      create: "Create",
      seriesBookCount: (count: number) => `${count} book${count === 1 ? "" : "s"}`
    },
    about: {
      description: "An offline-only EPUB/TXT reader",
      version: "Version",
      build: "Build",
      license: "License",
      repository: "Source repository",
      licenseFile: "License file",
      thirdPartyNotices: "Third-party notices",
      unknown: "Unknown",
      openLinkFailed: "Unable to open link"
    },
    bookDetail: {
      loadFailed: "Failed to load book details. Please return to the library and try again.",
      joinFailed: "Failed to add this book to the series. Please try again later.",
      missing: "Book not found.",
      startReading: "Start reading",
      joinSeries: "Add to series",
      series: "Series",
      noSeries: "Not in a series",
      singleSeriesOnly: "A book can belong to only one series",
      noSeriesCreated: "No series yet. Create one from the library first.",
      current: "Current",
      join: "Add"
    },
    reader: {
      back: "Back",
      toc: "Contents",
      settings: "Settings",
      openFailed: "Open failed",
      prevPage: "Previous",
      nextPage: "Next",
      close: "Close",
      collapseAll: "Collapse all",
      expandAll: "Expand all",
      emptyToc: "This book has no available contents.",
      readFileFailed: "Unable to read the local book file.",
      transferTimeout: "Book transfer timed out. Please try again.",
      transferRestarted: "A new book transfer has started."
    },
    series: {
      loadFailed: "Failed to load series books. Please return to the library and try again.",
      deleteFailed: "Failed to delete books. Some items may not have been deleted. Please refresh and try again.",
      addFailed: "Failed to add book. Please try again later.",
      importFailed: "Failed to import books. Please make sure the files are EPUB or TXT.",
      unassignedTitle: "Unassigned",
      selectedBooks: (count: number) => `${count} selected`,
      unassignedSubtitle: "These books are not in any series",
      bookCount: (count: number) => `${count} book${count === 1 ? "" : "s"}`,
      selectAll: "Select all",
      addBooks: "Add books",
      manage: "Manage",
      emptyUnassigned: "No unassigned books.",
      emptySeries: "This series has no books yet.",
      addBooksTitle: "Add books",
      addBooksSubtitle: (title: string) => `Choose books for ${title}`,
      noAddableBooks: "No books available to add.",
      add: "Add",
      deleteSelectedTitle: "Delete selected books",
      deleteSelectedMessage: (count: number, note: string) =>
        `This will delete ${count} book${count === 1 ? "" : "s"}. Book files, covers, and reading progress will be removed from this device. This cannot be undone.${note}`,
      emptySeriesNote: " The series will remain as an empty series."
    }
  }
};
