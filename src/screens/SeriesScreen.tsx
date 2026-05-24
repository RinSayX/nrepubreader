import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/components/BookCover";
import { PrimaryButton } from "@/components/PrimaryButton";
import { UNASSIGNED_SERIES_ID, UNASSIGNED_SERIES_NAME } from "@/repositories/seriesConstants";
import { getAppTheme } from "@/theme/appTheme";
import { colors, spacing } from "@/theme/tokens";
import { useLibraryStore } from "@/store/libraryStore";
import type { Book, RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Series">;

export function SeriesScreen({ navigation, route }: Props) {
  const { seriesId } = route.params;
  const series = useLibraryStore((state) => state.series.find((item) => item.id === seriesId));
  const allBooks = useLibraryStore((state) => state.books);
  const loading = useLibraryStore((state) => state.loading);
  const preference = useLibraryStore((state) => state.preference);
  const listBooksInSeries = useLibraryStore((state) => state.listBooksInSeries);
  const deleteSeries = useLibraryStore((state) => state.deleteSeries);
  const addBookToSeries = useLibraryStore((state) => state.addBookToSeries);
  const importBookToSeries = useLibraryStore((state) => state.importBookToSeries);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addVisible, setAddVisible] = useState(false);
  const isUnassigned = seriesId === UNASSIGNED_SERIES_ID;
  const theme = getAppTheme(preference);

  const title = useMemo(() => (isUnassigned ? UNASSIGNED_SERIES_NAME : (series?.name ?? "系列")), [isUnassigned, series?.name]);
  const addableBooks = useMemo(
    () => allBooks.filter((book) => !books.some((seriesBook) => seriesBook.id === book.id)),
    [allBooks, books]
  );

  const refreshSeriesBooks = useCallback(async () => {
    setBooks(await listBooksInSeries(seriesId));
    setLoadError(null);
  }, [listBooksInSeries, seriesId]);

  useEffect(() => {
    void refreshSeriesBooks().catch(() => {
      setLoadError("加载系列图书失败，请返回书库后重试。");
    });
  }, [refreshSeriesBooks]);

  function confirmDelete() {
    if (isUnassigned) {
      return;
    }

    Alert.alert("删除系列", "只删除系列分组，不会删除书籍。", [
      { text: "取消", style: "cancel" },
      {
        text: "删除",
        style: "destructive",
        onPress: () => {
          void deleteSeries(seriesId).then(() => navigation.goBack());
        }
      }
    ]);
  }

  async function addBook(book: Book) {
    try {
      await addBookToSeries(book.id, seriesId);
      await refreshSeriesBooks();
      setLoadError(null);
    } catch {
      setLoadError("添加图书失败，请稍后重试。");
    }
  }

  async function importBook() {
    try {
      const imported = await importBookToSeries(seriesId);
      if (imported.length > 0) {
        await refreshSeriesBooks();
        setAddVisible(false);
        setLoadError(null);
      }
    } catch {
      setLoadError("导入图书失败，请确认文件为 EPUB 后重试。");
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: theme.background }]}>
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {isUnassigned ? "这些书还没有放入任何系列" : `${books.length} 本图书`}
          </Text>
        </View>
        {!isUnassigned ? (
          <View style={styles.headerActions}>
            <PrimaryButton variant="secondary" onPress={() => setAddVisible(true)}>
              添加图书
            </PrimaryButton>
            <PrimaryButton variant="danger" onPress={confirmDelete}>
              删除系列
            </PrimaryButton>
          </View>
        ) : null}
      </View>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.muted }]}>{isUnassigned ? "没有未分系列的书。" : "这个系列还没有书。"}</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { borderColor: theme.border }]}
            onPress={() => navigation.navigate("BookDetail", { bookId: item.id })}
          >
            <BookCover book={item} size="sm" />
            <View style={styles.meta}>
              <Text style={[styles.bookTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.author, { color: theme.muted }]}>{item.author ?? "未知作者"}</Text>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={addVisible} animationType="slide" transparent onRequestClose={() => setAddVisible(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.addPanel, { backgroundColor: theme.background }]}>
            <View style={styles.addHeader}>
              <View style={styles.headerText}>
                <Text style={[styles.addTitle, { color: theme.text }]}>添加图书</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>选择要放入「{title}」的书</Text>
              </View>
              <PrimaryButton variant="secondary" onPress={() => setAddVisible(false)}>
                关闭
              </PrimaryButton>
            </View>
            <View style={styles.addActions}>
              <PrimaryButton onPress={importBook} disabled={loading}>
                导入 EPUB
              </PrimaryButton>
            </View>

            <FlatList
              data={addableBooks}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>没有可添加的图书。</Text>}
              renderItem={({ item }) => (
                <View style={[styles.row, { borderColor: theme.border }]}>
                  <BookCover book={item} size="sm" />
                  <View style={styles.meta}>
                    <Text style={[styles.bookTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.author, { color: theme.muted }]}>{item.author ?? "未知作者"}</Text>
                  </View>
                  <Pressable
                    style={[styles.addButton, { backgroundColor: theme.accentSoft }]}
                    onPress={() => {
                      void addBook(item);
                    }}
                  >
                    <Text style={styles.addButtonText}>加入</Text>
                  </Pressable>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.paper
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.ink
  },
  headerText: {
    flex: 1,
    gap: spacing.xs
  },
  subtitle: {
    color: colors.muted
  },
  empty: {
    color: colors.muted
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md
  },
  row: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  meta: {
    flex: 1,
    gap: spacing.xs
  },
  bookTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  author: {
    color: colors.muted
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  addPanel: {
    maxHeight: "78%",
    minHeight: "48%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: spacing.lg,
    backgroundColor: colors.paper
  },
  addHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  addActions: {
    flexDirection: "row",
    marginBottom: spacing.md
  },
  addTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  },
  addButton: {
    minWidth: 54,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    backgroundColor: colors.accentSoft
  },
  addButtonText: {
    color: colors.accent,
    fontWeight: "800"
  }
});
