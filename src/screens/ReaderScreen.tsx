import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as FileSystem from "expo-file-system/legacy";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, FlatList, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { encodeReaderMessage, parseWebReaderMessage, preferenceToReaderPayload } from "@/reader/messages";
import { READER_HTML } from "@/reader/readerHtml";
import { TXT_READER_HTML } from "@/reader/txtReaderHtml";
import {
  getAncestorTocIdsForHref,
  getCollapsibleTocIds,
  getVisibleTocItems,
  hasTocChildren,
  isCurrentChapter
} from "@/reader/toc";
import { colors, spacing } from "@/theme/tokens";
import { useLibraryStore } from "@/store/libraryStore";
import type { Book, ReaderToWebMessage, RootStackParamList, TocItem } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Reader">;

const EDGE_GESTURE_GUARD = 44;
const PAGE_TAP_LEFT_RATIO = 0.36;
const PAGE_TAP_RIGHT_RATIO = 0.64;

function formatBookProgress(percentage: number) {
  return `${Math.round(Math.max(0, Math.min(1, percentage)) * 100)}%`;
}

export function ReaderScreen({ navigation, route }: Props) {
  const { bookId } = route.params;
  const { width } = useWindowDimensions();
  const webRef = useRef<WebView>(null);
  const hasSentLoadRef = useRef(false);
  const tocDrawerProgress = useRef(new Animated.Value(0)).current;
  const preference = useLibraryStore((state) => state.preference);
  const getBook = useLibraryStore((state) => state.getBook);
  const getProgress = useLibraryStore((state) => state.getProgress);
  const saveProgress = useLibraryStore((state) => state.saveProgress);
  const markBookOpened = useLibraryStore((state) => state.markBookOpened);
  const [book, setBook] = useState<Book | null>(null);
  const [initialCfi, setInitialCfi] = useState<string | null>(null);
  const [initialPosition, setInitialPosition] = useState<number | null>(null);
  const [webReady, setWebReady] = useState(false);
  const [progressLabel, setProgressLabel] = useState(formatBookProgress(0));
  const [toc, setToc] = useState<TocItem[]>([]);
  const [collapsedTocIds, setCollapsedTocIds] = useState<Set<string>>(new Set());
  const [currentChapterHref, setCurrentChapterHref] = useState<string | null>(null);
  const [tocVisible, setTocVisible] = useState(false);
  const isDark = preference.themeMode === "dark";
  const tocDrawerWidth = Math.min(Math.max(width * 0.82, 280), 380);
  const visibleToc = useMemo(() => getVisibleTocItems(toc, collapsedTocIds), [collapsedTocIds, toc]);
  const collapsibleTocIds = useMemo(() => getCollapsibleTocIds(toc), [toc]);
  const tocDrawerTranslateX = tocDrawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [-tocDrawerWidth, 0]
  });
  const leftTapZoneWidth = Math.max(0, width * PAGE_TAP_LEFT_RATIO - EDGE_GESTURE_GUARD);
  const rightTapZoneWidth = Math.max(0, width * (1 - PAGE_TAP_RIGHT_RATIO) - EDGE_GESTURE_GUARD);
  const readerChromeStyle = { backgroundColor: preference.backgroundColor };
  const readerChromeTextStyle = { color: preference.textColor };

  const send = useCallback((message: ReaderToWebMessage) => {
    webRef.current?.injectJavaScript(`window.readerBridge && window.readerBridge.receive(${encodeReaderMessage(message)}); true;`);
  }, []);

  const sendBookToWebView = useCallback(
    (nextBook: Book, fileBase64: string) => {
      const chunkSize = 64 * 1024;
      send({
        type: "START_BOOK_TRANSFER",
        payload: {
          bookId: nextBook.id,
          title: nextBook.title,
          initialCfi,
          initialPosition,
          ...preferenceToReaderPayload(preference)
        }
      });

      for (let offset = 0, index = 0; offset < fileBase64.length; offset += chunkSize, index += 1) {
        send({
          type: "BOOK_CHUNK",
          payload: {
            bookId: nextBook.id,
            chunk: fileBase64.slice(offset, offset + chunkSize),
            index
          }
        });
      }

      send({ type: "FINISH_BOOK_TRANSFER", payload: { bookId: nextBook.id } });
    },
    [initialCfi, initialPosition, preference, send]
  );

  useEffect(() => {
    hasSentLoadRef.current = false;
    setWebReady(false);
    setToc([]);
    setCollapsedTocIds(new Set());
    setCurrentChapterHref(null);
    void Promise.all([getBook(bookId), getProgress(bookId)]).then(([nextBook, progress]) => {
      setBook(nextBook);
      setInitialCfi(progress?.cfi ?? null);
      setInitialPosition(progress?.position ?? null);
      if (progress) {
        setProgressLabel(formatBookProgress(progress.percentage));
      } else {
        setProgressLabel(formatBookProgress(0));
      }
    });
  }, [bookId, getBook, getProgress]);

  useEffect(() => {
    if (book && webReady && !hasSentLoadRef.current) {
      hasSentLoadRef.current = true;
      void (async () => {
        try {
          const fileBase64 = await FileSystem.readAsStringAsync(book.filePath, {
            encoding: FileSystem.EncodingType.Base64
          });
          await markBookOpened(book.id);
          sendBookToWebView(book, fileBase64);
        } catch (error) {
          hasSentLoadRef.current = false;
          Alert.alert("打开失败", error instanceof Error ? error.message : "无法读取本地书籍文件。");
        }
      })();
    }
  }, [book, markBookOpened, sendBookToWebView, webReady]);

  useEffect(() => {
    if (webReady) {
      send({ type: "APPLY_READER_SETTINGS", payload: preferenceToReaderPayload(preference) });
    }
  }, [preference, send, webReady]);

  function jumpToChapter(item: TocItem) {
    send({ type: "GO_TO_HREF", payload: { href: item.href } });
    setCurrentChapterHref(item.href);
    closeToc();
  }

  function openToc() {
    if (currentChapterHref) {
      const ancestorIds = getAncestorTocIdsForHref(toc, currentChapterHref);
      setCollapsedTocIds((current) => {
        const next = new Set(current);
        ancestorIds.forEach((id) => next.delete(id));
        return next;
      });
    }
    setTocVisible(true);
  }

  function closeToc() {
    Animated.timing(tocDrawerProgress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true
    }).start(() => setTocVisible(false));
  }

  useEffect(() => {
    if (tocVisible) {
      tocDrawerProgress.setValue(0);
      Animated.timing(tocDrawerProgress, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true
      }).start();
    }
  }, [tocDrawerProgress, tocVisible]);

  function toggleTocItem(item: TocItem) {
    setCollapsedTocIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  if (!book) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: preference.backgroundColor }]}>
        <ActivityIndicator color={colors.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={[styles.root, { backgroundColor: preference.backgroundColor }]}>
      <View style={[styles.topBar, readerChromeStyle]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Text style={[styles.iconText, readerChromeTextStyle]}>返回</Text>
        </Pressable>
        <Text numberOfLines={1} style={[styles.readerTitle, readerChromeTextStyle]}>
          {book.title}
        </Text>
        <Pressable onPress={openToc} style={styles.iconButton}>
          <Text style={[styles.iconText, readerChromeTextStyle]}>目录</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Settings")} style={styles.iconButton}>
          <Text style={[styles.iconText, readerChromeTextStyle]}>设置</Text>
        </Pressable>
      </View>

      <View style={styles.readerSurface}>
        <WebView
          ref={webRef}
          originWhitelist={["*"]}
          key={book.id}
          source={{ html: book.format === "txt" ? TXT_READER_HTML : READER_HTML, baseUrl: "" }}
          javaScriptEnabled
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onMessage={(event) => {
            const message = parseWebReaderMessage(event.nativeEvent.data);
            if (!message) {
              return;
            }

            if (message.type === "WEB_READY") {
              setWebReady(true);
            }

            if (message.type === "BOOK_READY") {
              const nextToc = message.payload.toc.filter((item) => Boolean(item.href));
              setToc(nextToc);
              setCollapsedTocIds(new Set(getCollapsibleTocIds(nextToc)));
            }

            if (message.type === "LOCATION_CHANGED") {
              const percentage = Math.max(0, Math.min(1, message.payload.percentage));
              setCurrentChapterHref(message.payload.chapterHref);
              setProgressLabel(formatBookProgress(percentage));
              void saveProgress({
                bookId: message.payload.bookId,
                chapterHref: message.payload.chapterHref,
                cfi: message.payload.cfi,
                position: message.payload.position ?? null,
                percentage
              });
            }

            if (message.type === "RENDER_ERROR") {
              Alert.alert("打开失败", message.payload.message);
            }
          }}
          style={styles.webview}
        />
        <View pointerEvents="box-none" style={styles.tapOverlay}>
          <Pressable
            style={[styles.pageTapZone, { left: EDGE_GESTURE_GUARD, width: leftTapZoneWidth }]}
            onPress={() => send({ type: "PREV_PAGE" })}
          />
          <Pressable
            style={[styles.pageTapZone, { right: EDGE_GESTURE_GUARD, width: rightTapZoneWidth }]}
            onPress={() => send({ type: "NEXT_PAGE" })}
          />
        </View>
      </View>

      <View style={[styles.bottomBar, readerChromeStyle]}>
        <View style={styles.bottomSlot}>
          <Pressable style={styles.pageButton} onPress={() => send({ type: "PREV_PAGE" })}>
            <Text style={[styles.pageText, readerChromeTextStyle]}>上一页</Text>
          </Pressable>
        </View>
        <View style={styles.progressSlot}>
          <Text style={[styles.progress, readerChromeTextStyle]}>{progressLabel}</Text>
        </View>
        <View style={[styles.bottomSlot, styles.rightSlot]}>
          <Pressable style={styles.pageButton} onPress={() => send({ type: "NEXT_PAGE" })}>
            <Text style={[styles.pageText, readerChromeTextStyle]}>下一页</Text>
          </Pressable>
        </View>
      </View>

      <Modal visible={tocVisible} animationType="fade" transparent onRequestClose={closeToc}>
        <View style={styles.modalScrim}>
          <Pressable style={styles.scrimCloseArea} onPress={closeToc} />
          <Animated.View
            style={[
              styles.tocPanel,
              { width: tocDrawerWidth, transform: [{ translateX: tocDrawerTranslateX }] },
              isDark && styles.darkTocPanel
            ]}
          >
            <View style={styles.tocHeader}>
              <View style={styles.tocHeaderText}>
                <Text style={[styles.tocTitle, isDark && styles.darkText]}>目录</Text>
              </View>
              <Pressable style={styles.closeButton} onPress={closeToc}>
                <Text style={styles.closeText}>关闭</Text>
              </Pressable>
            </View>

            <View style={styles.tocTools}>
              <Pressable style={styles.toolButton} onPress={() => setCollapsedTocIds(new Set(collapsibleTocIds))}>
                <Text style={styles.toolButtonText}>全部收起</Text>
              </Pressable>
              <Pressable style={styles.toolButton} onPress={() => setCollapsedTocIds(new Set())}>
                <Text style={styles.toolButtonText}>全部展开</Text>
              </Pressable>
            </View>

            <FlatList
              data={visibleToc}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={[styles.emptyToc, isDark && styles.darkMutedText]}>这本书没有可用目录。</Text>}
              renderItem={({ item }) => {
                const active = isCurrentChapter(item.href, currentChapterHref);
                const tocIndex = toc.findIndex((tocItem) => tocItem.id === item.id);
                const hasChildren = hasTocChildren(toc, tocIndex);
                const collapsed = collapsedTocIds.has(item.id);
                return (
                  <Pressable
                    style={[styles.tocRow, active && styles.activeTocRow, { paddingLeft: spacing.lg + item.level * 18 }]}
                    onPress={() => jumpToChapter(item)}
                  >
                    <Pressable
                      disabled={!hasChildren}
                      onPress={() => toggleTocItem(item)}
                      style={[styles.tocToggle, !hasChildren && styles.emptyToggle]}
                    >
                      <Text style={[styles.tocToggleText, isDark && styles.darkText]}>
                        {hasChildren ? (collapsed ? "+" : "-") : ""}
                      </Text>
                    </Pressable>
                    <Text style={[styles.tocItemText, isDark && styles.darkText, active && styles.activeTocText]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  topBar: {
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "rgba(251,247,239,0.96)"
  },
  iconButton: {
    minWidth: 56,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  iconText: {
    fontWeight: "800"
  },
  readerTitle: {
    flex: 1,
    color: colors.ink,
    textAlign: "center",
    fontWeight: "800"
  },
  darkText: {
    color: colors.darkInk
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent"
  },
  readerSurface: {
    flex: 1
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject
  },
  pageTapZone: {
    position: "absolute",
    top: 0,
    bottom: 0
  },
  bottomBar: {
    minHeight: 54,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center"
  },
  bottomSlot: {
    flex: 1,
    alignItems: "flex-start"
  },
  rightSlot: {
    alignItems: "flex-end"
  },
  progressSlot: {
    flex: 1,
    alignItems: "center"
  },
  pageButton: {
    width: 88,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  pageText: {
    fontWeight: "800"
  },
  progress: {
    color: colors.ink,
    fontWeight: "800"
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-start",
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  scrimCloseArea: {
    ...StyleSheet.absoluteFillObject
  },
  tocPanel: {
    height: "100%",
    zIndex: 1,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: colors.paper,
    overflow: "hidden"
  },
  darkTocPanel: {
    backgroundColor: colors.darkPanel
  },
  tocHeader: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  tocHeaderText: {
    flex: 1,
    gap: spacing.xs
  },
  tocTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  darkMutedText: {
    color: "#b8b1a6"
  },
  closeButton: {
    minWidth: 54,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: colors.accentSoft
  },
  closeText: {
    color: colors.accent,
    fontWeight: "800"
  },
  tocTools: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  toolButton: {
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    backgroundColor: colors.accentSoft
  },
  toolButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "800"
  },
  emptyToc: {
    padding: spacing.lg,
    color: colors.muted
  },
  tocRow: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  tocToggle: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: "rgba(47,111,115,0.12)"
  },
  emptyToggle: {
    backgroundColor: "transparent"
  },
  tocToggleText: {
    color: colors.accent,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "800"
  },
  activeTocRow: {
    backgroundColor: colors.accentSoft
  },
  tocItemText: {
    flex: 1,
    color: colors.ink,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600"
  },
  activeTocText: {
    color: colors.accent,
    fontWeight: "800"
  }
});
