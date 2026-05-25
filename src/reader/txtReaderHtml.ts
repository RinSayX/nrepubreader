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

      #content {
        height: 100%;
        box-sizing: border-box;
        padding: 20px 22px;
        white-space: pre-wrap;
        overflow-wrap: break-word;
        column-gap: 0;
        column-fill: auto;
        will-change: transform;
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
    <div id="loader">正在打开书籍</div>
    <div id="error"></div>
    <script>
      const state = {
        bookId: null,
        title: "",
        text: "",
        chapters: [],
        transfer: null,
        currentPage: 0,
        pageCount: 1,
        theme: null,
        font: null
      };

      const SWIPE_EDGE_GUARD = 44;
      const SWIPE_MIN_DISTANCE = 56;
      const SWIPE_MAX_VERTICAL_DISTANCE = 80;
      const VIRTUAL_CHAPTER_SIZE = 20000;

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

      function currentPosition() {
        if (state.pageCount <= 1 || state.text.length <= 1) {
          return 0;
        }
        return Math.round((state.currentPage / (state.pageCount - 1)) * Math.max(0, state.text.length - 1));
      }

      function chapterForPosition(position) {
        let current = state.chapters[0] || null;
        for (const chapter of state.chapters) {
          if (position >= chapter.startOffset) {
            current = chapter;
          } else {
            break;
          }
        }
        return current;
      }

      function percentageForPage() {
        if (state.pageCount <= 1) {
          return 0;
        }
        return clamp(state.currentPage / (state.pageCount - 1), 0, 1);
      }

      function postLocation() {
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

        repaginate(currentPosition());
      }

      function repaginate(position) {
        const viewer = document.getElementById("viewer");
        const content = document.getElementById("content");
        const pageWidth = Math.max(1, viewer.clientWidth);

        content.style.columnWidth = pageWidth + "px";
        content.style.width = pageWidth + "px";

        requestAnimationFrame(() => {
          state.pageCount = Math.max(1, Math.ceil(content.scrollWidth / pageWidth));
          const targetPosition = Number.isFinite(position) ? position : currentPosition();
          state.currentPage = pageForPosition(targetPosition);
          renderPage();
        });
      }

      function pageForPosition(position) {
        if (state.text.length <= 1 || state.pageCount <= 1) {
          return 0;
        }
        return clamp(Math.floor((position / Math.max(1, state.text.length - 1)) * (state.pageCount - 1)), 0, state.pageCount - 1);
      }

      function renderPage() {
        const viewer = document.getElementById("viewer");
        const content = document.getElementById("content");
        const pageWidth = Math.max(1, viewer.clientWidth);
        state.currentPage = clamp(state.currentPage, 0, state.pageCount - 1);
        content.style.transform = "translateX(" + (-state.currentPage * pageWidth) + "px)";
        postLocation();
      }

      function nextPage() {
        if (state.currentPage < state.pageCount - 1) {
          state.currentPage += 1;
          renderPage();
        }
      }

      function prevPage() {
        if (state.currentPage > 0) {
          state.currentPage -= 1;
          renderPage();
        }
      }

      function goToHref(href) {
        const match = /^txt:(\d+)$/.exec(href || "");
        if (!match) {
          return;
        }
        state.currentPage = pageForPosition(Number(match[1]));
        renderPage();
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

          const content = document.getElementById("content");
          content.textContent = state.text || " ";
          applySettings(payload.theme, payload.font);

          requestAnimationFrame(() => {
            repaginate(payload.initialPosition || 0);
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
            state.transfer = { payload: message.payload, chunks: [] };
            setLoaderText("正在接收书籍");
            break;
          case "BOOK_CHUNK":
            if (state.transfer && state.transfer.payload.bookId === message.payload.bookId) {
              state.transfer.chunks[message.payload.index] = message.payload.chunk;
            }
            break;
          case "FINISH_BOOK_TRANSFER":
            if (state.transfer && state.transfer.payload.bookId === message.payload.bookId) {
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

      window.addEventListener("resize", () => repaginate(currentPosition()));
      installSwipeNavigation();
      window.readerBridge = { receive };
      window.addEventListener("message", (event) => receive(JSON.parse(event.data)));
      document.addEventListener("message", (event) => receive(JSON.parse(event.data)));
      post({ type: "WEB_READY" });
    </script>
  </body>
</html>
`;
