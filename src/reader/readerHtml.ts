export const READER_HTML = String.raw`
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
        -webkit-overflow-scrolling: auto;
        user-select: none;
      }

      #viewer {
        box-sizing: border-box;
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
    <script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js"></script>
  </head>
  <body>
    <div id="viewer"></div>
    <div id="loader">正在打开书籍</div>
    <div id="error"></div>
    <script>
      const state = {
        bookId: null,
        book: null,
        rendition: null,
        theme: null,
        font: null,
        transfer: null
      };

      const SWIPE_EDGE_GUARD = 44;
      const SWIPE_MIN_DISTANCE = 56;
      const SWIPE_MAX_VERTICAL_DISTANCE = 80;

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

      function withTimeout(promise, milliseconds, message) {
        let timeoutId;
        const timeout = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(message)), milliseconds);
        });
        return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
      }

      function applySettings(theme, font) {
        state.theme = theme;
        state.font = font;

        document.body.style.background = theme.backgroundColor;
        document.body.style.color = theme.textColor;

        if (!state.rendition) {
          return;
        }

        const fontFamily = font.fontFamily === "System"
          ? '-apple-system, BlinkMacSystemFont, "Noto Sans SC", "PingFang SC", sans-serif'
          : '"' + font.fontFamily + '", "Noto Sans SC", "PingFang SC", sans-serif';

        state.rendition.themes.default({
          body: {
            "background": theme.backgroundColor + " !important",
            "color": theme.textColor + " !important",
            "font-family": fontFamily + " !important",
            "font-size": font.fontSize + "px !important",
            "line-height": font.lineHeight + " !important"
          },
          "p, div, span, li": {
            "font-family": fontFamily + " !important",
            "line-height": font.lineHeight + " !important"
          },
          "a": {
            "color": theme.themeMode === "dark" ? "#8fd8d2" : "#2f6f73"
          },
          "::selection": {
            "background": theme.themeMode === "dark" ? "#375653" : "#d8ecea"
          }
        });
      }

      function base64ToArrayBuffer(base64) {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i += 1) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      }

      function flattenToc(items, level, path) {
        return (items || []).flatMap((item, index) => {
          const itemPath = path ? path + "." + index : String(index);
          const current = {
            id: item.id || item.href || itemPath,
            label: item.label || "未命名章节",
            href: item.href,
            level
          };
          return [current, ...flattenToc(item.subitems || [], level + 1, itemPath)];
        });
      }

      function clampPercentage(value) {
        if (!Number.isFinite(value)) {
          return 0;
        }
        return Math.max(0, Math.min(1, value));
      }

      function computeReadingPercentage(location) {
        const cfi = location.start?.cfi;
        if (state.book.locations && cfi) {
          const locationPercentage = state.book.locations.percentageFromCfi(cfi);
          if (Number.isFinite(locationPercentage) && locationPercentage > 0) {
            return clampPercentage(locationPercentage);
          }
        }

        if (Number.isFinite(location.start?.percentage) && location.start.percentage > 0) {
          return clampPercentage(location.start.percentage);
        }

        const spineItems = state.book.spine?.spineItems || state.book.spine?.items || [];
        const spineLength = spineItems.length || 1;
        const spineIndex = Number.isFinite(location.start?.index) ? location.start.index : 0;
        const displayed = location.start?.displayed;
        const chapterProgress = displayed?.total ? (displayed.page - 1) / displayed.total : 0;
        return clampPercentage((spineIndex + chapterProgress) / spineLength);
      }

      function postLocation(location) {
        post({
          type: "LOCATION_CHANGED",
          payload: {
            bookId: state.bookId,
            chapterHref: location.start?.href || null,
            cfi: location.start?.cfi || null,
            percentage: computeReadingPercentage(location)
          }
        });
      }

      function installSwipeNavigation(doc) {
        if (!doc || doc.__nrepubSwipeNavigationInstalled) {
          return;
        }
        doc.__nrepubSwipeNavigationInstalled = true;

        let startX = 0;
        let startY = 0;
        let startedInSystemGestureZone = false;
        const view = doc.defaultView || window;

        doc.addEventListener("touchstart", (event) => {
          const touch = event.changedTouches && event.changedTouches[0];
          if (!touch) {
            return;
          }

          startX = touch.clientX;
          startY = touch.clientY;
          const width = view.innerWidth || window.innerWidth || 0;
          startedInSystemGestureZone = startX <= SWIPE_EDGE_GUARD || startX >= width - SWIPE_EDGE_GUARD;
        }, { passive: true });

        doc.addEventListener("touchend", (event) => {
          const touch = event.changedTouches && event.changedTouches[0];
          if (!touch || startedInSystemGestureZone || !state.rendition) {
            return;
          }

          const deltaX = touch.clientX - startX;
          const deltaY = touch.clientY - startY;
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          if (absX < SWIPE_MIN_DISTANCE || absY > SWIPE_MAX_VERTICAL_DISTANCE || absX < absY * 1.35) {
            return;
          }

          if (deltaX < 0) {
            state.rendition.next();
          } else {
            state.rendition.prev();
          }
        }, { passive: true });
      }

      function installRenditionSwipeNavigation() {
        if (!state.rendition) {
          return;
        }

        installSwipeNavigation(document);
        state.rendition.hooks.content.register((contents) => {
          installSwipeNavigation(contents.document);
        });
      }

      async function loadBook(payload) {
        try {
          if (!window.ePub) {
            showError("EPUBJS_MISSING", "epub.js 未加载，请确认设备可访问脚本资源。");
            return;
          }
          if (!window.JSZip) {
            showError("JSZIP_MISSING", "JSZip 未加载，请确认设备可访问脚本资源。");
            return;
          }

          state.bookId = payload.bookId;
          document.getElementById("loader").style.display = "flex";
          document.getElementById("error").style.display = "none";
          setLoaderText("正在打开书籍");

          const arrayBuffer = base64ToArrayBuffer(payload.fileBase64);
          state.book = window.ePub(arrayBuffer);
          state.rendition = state.book.renderTo("viewer", {
            width: "100%",
            height: "100%",
            flow: "paginated",
            spread: "none",
            manager: "default"
          });
          installRenditionSwipeNavigation();

          applySettings(payload.theme, payload.font);

          state.rendition.on("relocated", postLocation);

          try {
            await withTimeout(
              state.rendition.display(payload.initialCfi || undefined),
              20000,
              "书籍首屏渲染超时。"
            );
          } catch (displayError) {
            await withTimeout(state.rendition.display(), 20000, "书籍首页渲染超时。");
          }
          document.getElementById("loader").style.display = "none";

          state.book.ready
            .then(() => state.book.loaded.navigation)
            .then((navigation) => {
              post({
                type: "BOOK_READY",
                payload: {
                  title: state.book.package?.metadata?.title || "",
                  toc: flattenToc(navigation.toc || [], 0, "")
                }
              });
            })
            .catch((error) => {
              post({ type: "RENDER_ERROR", payload: { code: "TOC_FAILED", message: error?.message || "目录加载失败。" } });
            });

          state.book.locations.generate(1200)
            .then(() => {
              const currentLocation = state.rendition.currentLocation();
              if (currentLocation?.start) {
                postLocation(currentLocation);
              }
            })
            .catch(() => undefined);
        } catch (error) {
          showError("RENDER_FAILED", error && error.message ? error.message : "书籍渲染失败。");
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
            state.rendition && state.rendition.next();
            break;
          case "PREV_PAGE":
            state.rendition && state.rendition.prev();
            break;
          case "GO_TO_HREF":
            state.rendition && state.rendition.display(message.payload.href);
            break;
          case "APPLY_READER_SETTINGS":
            applySettings(message.payload.theme, message.payload.font);
            break;
        }
      }

      window.readerBridge = { receive };
      window.addEventListener("message", (event) => receive(JSON.parse(event.data)));
      document.addEventListener("message", (event) => receive(JSON.parse(event.data)));
      post({ type: "WEB_READY" });
    </script>
  </body>
</html>
`;
