export const TXT_READER_HTML = String.raw`
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <style>
      html, body, #viewer {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
        overscroll-behavior: none;
        touch-action: none;
      }

      body {
        background: #fbf7ef;
        color: #202124;
        -webkit-user-select: none;
        user-select: none;
      }

      #viewer {
        position: relative;
        box-sizing: border-box;
      }

      #content, #measure {
        height: 100%;
        box-sizing: border-box;
        padding: 20px 22px;
      }

      #content {
        overflow: hidden;
      }

      #measure {
        position: fixed;
        left: -10000px;
        top: -10000px;
        visibility: hidden;
        pointer-events: none;
        height: auto;
        min-height: 0;
      }

      .chapter-title {
        margin: 0 0 18px;
        font-size: 1.18em;
        line-height: 1.45;
        font-weight: 800;
        white-space: pre-wrap;
        overflow-wrap: break-word;
      }

      .chapter-body {
        white-space: pre-wrap;
        overflow-wrap: break-word;
      }

      #loader, #error {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Noto Sans SC", sans-serif;
        text-align: center;
      }

      #error {
        display: none;
        color: #a83b3b;
      }
    </style>
  </head>
  <body>
    <div id="viewer"><div id="content"></div></div>
    <div id="measure"></div>
    <div id="loader">正在打开书籍</div>
    <div id="error"></div>
    <script>
      const state = {
        bookId: null,
        title: "",
        text: "",
        chapters: [],
        transfer: null,
        currentChapterIndex: 0,
        currentPage: 0,
        pageStarts: [0],
        pageEnds: [],
        pageCount: 1,
        theme: null,
        font: null
      };

      const SWIPE_EDGE_GUARD = 44;
      const SWIPE_MIN_DISTANCE = 56;
      const SWIPE_MAX_VERTICAL_DISTANCE = 80;
      const VIRTUAL_CHAPTER_SIZE = 20000;
      const MIN_PAGE_CHARS = 20;

      function post(message) {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(message));
      }

      function showError(code, message) {
        document.getElementById("loader").style.display = "none";
        const error = document.getElementById("error");
        error.textContent = message;
        error.style.display = "flex";
        post({ type: "RENDER_ERROR", payload: { code, message } });
      }

      function setLoaderText(message) {
        document.getElementById("loader").textContent = message;
      }

      function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function base64ToBytes(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i += 1) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      }

      function decodeBytes(bytes) {
        const bom0 = bytes[0];
        const bom1 = bytes[1];
        const bom2 = bytes[2];

        if (bom0 === 0xef && bom1 === 0xbb && bom2 === 0xbf) {
          return new TextDecoder("utf-8").decode(bytes.slice(3));
        }
        if (bom0 === 0xff && bom1 === 0xfe) {
          return new TextDecoder("utf-16le").decode(bytes.slice(2));
        }
        if (bom0 === 0xfe && bom1 === 0xff) {
          return new TextDecoder("utf-16be").decode(bytes.slice(2));
        }

        const utf8Text = new TextDecoder("utf-8").decode(bytes);
        if (replacementRatio(utf8Text) < 0.01) {
          return utf8Text;
        }

        try {
          return new TextDecoder("gb18030").decode(bytes);
        } catch (_error) {
          return utf8Text;
        }
      }

      function replacementRatio(text) {
        if (!text) {
          return 0;
        }
        const replacements = (text.match(/\ufffd/g) || []).length;
        return replacements / text.length;
      }

      function normalizeText(text) {
        return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
      }

      function splitChapters(text) {
        const chapters = [];
        const linePattern = /(^|\n)([^\n]{0,8}(?:第\s*[0-9０-９零〇一二三四五六七八九十百千万两壹贰叁肆伍陆柒捌玖拾佰仟]+\s*[章节回卷部集篇]|卷\s*[0-9０-９零〇一二三四五六七八九十百千万两]+|Chapter\s+\d+)[^\n]{0,80})/gi;
        let match;

        while ((match = linePattern.exec(text)) !== null) {
          const title = match[2].trim();
          const startOffset = match.index + match[1].length;
          if (!title || chapters.some((chapter) => Math.abs(chapter.startOffset - startOffset) < 2)) {
            continue;
          }
          chapters.push({
            id: "txt-chapter-" + chapters.length,
            title,
            startOffset,
            endOffset: text.length
          });
        }

        for (let index = 0; index < chapters.length - 1; index += 1) {
          chapters[index].endOffset = chapters[index + 1].startOffset;
        }

        if (chapters.length > 0) {
          return chapters;
        }

        const virtualChapters = [];
        const total = Math.max(1, Math.ceil(text.length / VIRTUAL_CHAPTER_SIZE));
        for (let index = 0; index < total; index += 1) {
          virtualChapters.push({
            id: "txt-part-" + index,
            title: total === 1 ? "正文" : "第 " + (index + 1) + " 部分",
            startOffset: index * VIRTUAL_CHAPTER_SIZE,
            endOffset: Math.min(text.length, (index + 1) * VIRTUAL_CHAPTER_SIZE)
          });
        }
        return virtualChapters;
      }

      function tocFromChapters(chapters) {
        return chapters.map((chapter) => ({
          id: chapter.id,
          label: chapter.title,
          href: "txt:" + chapter.startOffset,
          level: 0
        }));
      }

      function currentChapter() {
        return state.chapters[state.currentChapterIndex] || state.chapters[0] || null;
      }

      function currentChapterText() {
        const chapter = currentChapter();
        if (!chapter) {
          return "";
        }
        return state.text.slice(chapter.startOffset, chapter.endOffset);
      }

      function currentChapterTitleEnd() {
        const chapter = currentChapter();
        const text = currentChapterText();
        if (!chapter || !chapter.id.startsWith("txt-chapter-") || !text) {
          return 0;
        }

        const newlineIndex = text.indexOf("\n");
        const firstLineEnd = newlineIndex >= 0 ? newlineIndex : text.length;
        const firstLine = text.slice(0, firstLineEnd);
        if (firstLine.trim() !== chapter.title) {
          return 0;
        }

        return newlineIndex >= 0 ? newlineIndex + 1 : text.length;
      }

      function currentPosition() {
        const chapter = currentChapter();
        if (!chapter) {
          return 0;
        }

        const chapterLength = Math.max(0, chapter.endOffset - chapter.startOffset);
        const localStart = state.pageStarts[state.currentPage] ?? 0;
        if (chapterLength <= 1) {
          return chapter.startOffset;
        }

        return chapter.startOffset + clamp(localStart, 0, Math.max(0, chapterLength - 1));
      }

      function chapterIndexForPosition(position) {
        let currentIndex = 0;
        for (let index = 0; index < state.chapters.length; index += 1) {
          if (position >= state.chapters[index].startOffset) {
            currentIndex = index;
          } else {
            break;
          }
        }
        return currentIndex;
      }

      function chapterForPosition(position) {
        return state.chapters[chapterIndexForPosition(position)] || null;
      }

      function percentageForPage() {
        if (!state.text || state.text.length <= 1) {
          return 0;
        }
        return clamp(currentPosition() / Math.max(1, state.text.length - 1), 0, 1);
      }

      function postLocation() {
        if (!state.bookId) {
          return;
        }

        const position = currentPosition();
        const chapter = chapterForPosition(position);
        post({
          type: "LOCATION_CHANGED",
          payload: {
            bookId: state.bookId,
            chapterHref: chapter ? "txt:" + chapter.startOffset : null,
            cfi: null,
            position,
            percentage: percentageForPage()
          }
        });
      }

      function applySettings(theme, font) {
        state.theme = theme;
        state.font = font;

        const fontFamily = font.fontFamily === "System"
          ? '-apple-system, BlinkMacSystemFont, "Noto Sans SC", "PingFang SC", sans-serif'
          : '"' + font.fontFamily + '", "Noto Sans SC", "PingFang SC", sans-serif';

        document.body.style.background = theme.backgroundColor;
        document.body.style.color = theme.textColor;

        const content = document.getElementById("content");
        content.style.background = theme.backgroundColor;
        content.style.color = theme.textColor;
        content.style.fontFamily = fontFamily;
        content.style.fontSize = font.fontSize + "px";
        content.style.lineHeight = font.lineHeight;

        const measure = document.getElementById("measure");
        measure.style.background = theme.backgroundColor;
        measure.style.color = theme.textColor;
        measure.style.fontFamily = fontFamily;
        measure.style.fontSize = font.fontSize + "px";
        measure.style.lineHeight = font.lineHeight;

        if (state.bookId && state.text) {
          renderChapterAtPosition(currentPosition());
        }
      }

      function renderCurrentChapter() {
        const content = document.getElementById("content");
        const chapterText = currentChapterText();
        const start = state.pageStarts[state.currentPage] ?? 0;
        const end = ensurePageEnd(state.currentPage);
        renderChapterSlice(content, start, end);
      }

      function resetChapterPagination(position, preferredPage) {
        const chapter = currentChapter();
        const localPosition = chapter ? clamp(position - chapter.startOffset, 0, Math.max(0, chapter.endOffset - chapter.startOffset - 1)) : 0;
        state.pageStarts = [0];
        state.pageEnds = [];
        state.currentPage = 0;

        if (Number.isFinite(preferredPage)) {
          while (state.currentPage < preferredPage && ensurePageEnd(state.currentPage) < currentChapterText().length) {
            moveToNextPageWithinChapter();
          }
          return;
        }

        while (ensurePageEnd(state.currentPage) <= localPosition && ensurePageEnd(state.currentPage) < currentChapterText().length) {
          moveToNextPageWithinChapter();
        }
      }

      function syncMeasureWidth() {
        const viewer = document.getElementById("viewer");
        const content = document.getElementById("content");
        const measure = document.getElementById("measure");
        const pageWidth = Math.max(1, viewer.clientWidth);
        content.style.width = pageWidth + "px";
        measure.style.width = pageWidth + "px";
      }

      function renderChapterSlice(container, start, end) {
        const text = currentChapterText();
        const titleEnd = currentChapterTitleEnd();
        container.textContent = "";

        if (start === 0 && titleEnd > 0) {
          const title = document.createElement("h1");
          title.className = "chapter-title";
          title.textContent = text.slice(0, Math.max(0, titleEnd - 1)).trim() || currentChapter().title;
          container.appendChild(title);

          const body = document.createElement("div");
          body.className = "chapter-body";
          body.textContent = text.slice(titleEnd, end) || " ";
          container.appendChild(body);
          return;
        }

        const body = document.createElement("div");
        body.className = "chapter-body";
        body.textContent = text.slice(start, end) || " ";
        container.appendChild(body);
      }

      function pageFits(start, end) {
        const viewer = document.getElementById("viewer");
        const measure = document.getElementById("measure");
        renderChapterSlice(measure, start, end);
        return measure.scrollHeight <= viewer.clientHeight + 1;
      }

      function findPageEnd(start) {
        const text = currentChapterText();
        if (start >= text.length) {
          return text.length;
        }

        let low = Math.min(text.length, start + MIN_PAGE_CHARS);
        let high = text.length;

        if (!pageFits(start, low)) {
          return low;
        }

        while (low < high) {
          const mid = Math.min(high, Math.ceil((low + high + 1) / 2));
          if (pageFits(start, mid)) {
            low = mid;
          } else {
            high = mid - 1;
          }
        }

        return clamp(preferBreakEnd(text, start, low), start + 1, text.length);
      }

      function preferBreakEnd(text, start, end) {
        const searchStart = Math.max(start + 1, end - 120);
        const slice = text.slice(searchStart, end);
        const newline = slice.lastIndexOf("\n");
        if (newline >= 20) {
          return searchStart + newline + 1;
        }
        return end;
      }

      function ensurePageEnd(pageIndex) {
        if (typeof state.pageEnds[pageIndex] === "number") {
          return state.pageEnds[pageIndex];
        }

        const start = state.pageStarts[pageIndex] ?? 0;
        const end = findPageEnd(start);
        state.pageEnds[pageIndex] = end;
        state.pageCount = Math.max(state.pageCount, pageIndex + 1);
        return end;
      }

      function moveToNextPageWithinChapter() {
        const end = ensurePageEnd(state.currentPage);
        const textLength = currentChapterText().length;
        if (end >= textLength) {
          return false;
        }
        state.currentPage += 1;
        if (typeof state.pageStarts[state.currentPage] !== "number") {
          state.pageStarts[state.currentPage] = end;
        }
        state.pageCount = Math.max(state.pageCount, state.currentPage + 1);
        return true;
      }

      function renderChapterAtPosition(position, preferredPage) {
        state.currentChapterIndex = chapterIndexForPosition(position);
        syncMeasureWidth();
        resetChapterPagination(position, preferredPage);
        renderPage();
      }

      function renderPage() {
        renderCurrentChapter();
        postLocation();
      }

      function nextPage() {
        if (moveToNextPageWithinChapter()) {
          renderPage();
          return;
        }

        if (state.currentChapterIndex < state.chapters.length - 1) {
          state.currentChapterIndex += 1;
          syncMeasureWidth();
          resetChapterPagination(state.chapters[state.currentChapterIndex].startOffset, 0);
          renderPage();
        }
      }

      function prevPage() {
        if (state.currentPage > 0) {
          state.currentPage -= 1;
          renderPage();
          return;
        }

        if (state.currentChapterIndex > 0) {
          state.currentChapterIndex -= 1;
          syncMeasureWidth();
          resetChapterPagination(state.chapters[state.currentChapterIndex].endOffset - 1, Number.MAX_SAFE_INTEGER);
          renderPage();
        }
      }

      function goToHref(href) {
        const match = /^txt:(\d+)$/.exec(href || "");
        if (!match) {
          return;
        }
        renderChapterAtPosition(Number(match[1]), 0);
      }

      function installSwipeNavigation() {
        let startX = 0;
        let startY = 0;
        let startedInSystemGestureZone = false;

        document.addEventListener("touchstart", (event) => {
          const touch = event.changedTouches && event.changedTouches[0];
          if (!touch) {
            return;
          }

          startX = touch.clientX;
          startY = touch.clientY;
          const width = window.innerWidth || 0;
          startedInSystemGestureZone = startX <= SWIPE_EDGE_GUARD || startX >= width - SWIPE_EDGE_GUARD;
        }, { passive: true });

        document.addEventListener("touchend", (event) => {
          const touch = event.changedTouches && event.changedTouches[0];
          const width = window.innerWidth || 0;
          if (!touch || startedInSystemGestureZone || width <= 0) {
            return;
          }

          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          if (absX >= SWIPE_MIN_DISTANCE && absY <= SWIPE_MAX_VERTICAL_DISTANCE && absX >= absY * 1.35) {
            if (deltaX < 0) {
              nextPage();
            } else {
              prevPage();
            }
          }
        }, { passive: true });
      }

      function loadBook(payload) {
        try {
          state.bookId = payload.bookId;
          state.title = payload.title || "";
          document.getElementById("loader").style.display = "flex";
          document.getElementById("error").style.display = "none";
          setLoaderText("正在打开书籍");

          const bytes = base64ToBytes(payload.fileBase64);
          state.text = normalizeText(decodeBytes(bytes));
          state.chapters = splitChapters(state.text);

          applySettings(payload.theme, payload.font);

          requestAnimationFrame(() => {
            setLoaderText("正在排版章节");
            renderChapterAtPosition(payload.initialPosition || 0);
            document.getElementById("loader").style.display = "none";
            post({
              type: "BOOK_READY",
              payload: {
                title: state.title,
                toc: tocFromChapters(state.chapters)
              }
            });
          });
        } catch (error) {
          showError("TXT_RENDER_FAILED", error && error.message ? error.message : "TXT 渲染失败。");
        }
      }

      function receive(message) {
        switch (message.type) {
          case "START_BOOK_TRANSFER":
            state.transfer = { payload: message.payload, chunks: [], received: 0 };
            setLoaderText("正在打开");
            break;
          case "BOOK_CHUNK":
            if (state.transfer && state.transfer.payload.bookId === message.payload.bookId) {
              if (typeof state.transfer.chunks[message.payload.index] === "undefined") {
                state.transfer.received += 1;
              }
              state.transfer.chunks[message.payload.index] = message.payload.chunk;
              if (state.transfer.payload.totalChunks) {
                setLoaderText("正在打开 " + Math.round((state.transfer.received / state.transfer.payload.totalChunks) * 100) + "%");
              }
              post({ type: "BOOK_CHUNK_RECEIVED", payload: { bookId: message.payload.bookId, index: message.payload.index } });
            }
            break;
          case "FINISH_BOOK_TRANSFER":
            if (state.transfer && state.transfer.payload.bookId === message.payload.bookId) {
              setLoaderText("正在解析书籍");
              const payload = {
                ...state.transfer.payload,
                fileBase64: state.transfer.chunks.join("")
              };
              state.transfer = null;
              loadBook(payload);
            }
            break;
          case "NEXT_PAGE":
            nextPage();
            break;
          case "PREV_PAGE":
            prevPage();
            break;
          case "GO_TO_HREF":
            goToHref(message.payload.href);
            break;
          case "APPLY_READER_SETTINGS":
            applySettings(message.payload.theme, message.payload.font);
            break;
        }
      }

      window.addEventListener("resize", () => renderChapterAtPosition(currentPosition()));
      installSwipeNavigation();
      window.readerBridge = { receive };
      window.addEventListener("message", (event) => receive(JSON.parse(event.data)));
      document.addEventListener("message", (event) => receive(JSON.parse(event.data)));
      post({ type: "WEB_READY" });
    </script>
  </body>
</html>
`;
