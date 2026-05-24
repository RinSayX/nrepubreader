import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/components/BookCover";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getAppTheme } from "@/theme/appTheme";
import { colors, spacing } from "@/theme/tokens";
import { useLibraryStore } from "@/store/libraryStore";
import type { Book, RootStackParamList, Series } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "BookDetail">;

export function BookDetailScreen({ navigation, route }: Props) {
  const { bookId } = route.params;
  const allSeries = useLibraryStore((state) => state.series);
  const preference = useLibraryStore((state) => state.preference);
  const getBook = useLibraryStore((state) => state.getBook);
  const listSeriesForBook = useLibraryStore((state) => state.listSeriesForBook);
  const addBookToSeries = useLibraryStore((state) => state.addBookToSeries);
  const [book, setBook] = useState<Book | null>(null);
  const [bookSeries, setBookSeries] = useState<Series[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [seriesPickerVisible, setSeriesPickerVisible] = useState(false);
  const theme = getAppTheme(preference);

  const refreshBookDetail = useCallback(async () => {
    const [nextBook, nextSeries] = await Promise.all([getBook(bookId), listSeriesForBook(bookId)]);
    setBook(nextBook);
    setBookSeries(nextSeries);
    setLoadError(null);
  }, [bookId, getBook, listSeriesForBook]);

  useEffect(() => {
    void refreshBookDetail().catch(() => {
      setLoadError("加载书籍信息失败，请返回书库后重试。");
    });
  }, [refreshBookDetail]);

  async function joinSeries(series: Series) {
    try {
      await addBookToSeries(bookId, series.id);
      await refreshBookDetail();
      setSeriesPickerVisible(false);
    } catch {
      setLoadError("加入系列失败，请稍后重试。");
    }
  }

  if (!book) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
        <Text style={[styles.muted, { color: theme.muted }]}>书籍不存在。</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: theme.background }]}>
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      <View style={styles.hero}>
        <BookCover book={book} size="lg" />
        <View style={styles.heroText}>
          <Text style={[styles.title, { color: theme.text }]}>{book.title}</Text>
          <Text style={[styles.author, { color: theme.muted }]}>{book.author ?? "未知作者"}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton onPress={() => navigation.navigate("Reader", { bookId: book.id })}>开始阅读</PrimaryButton>
        <PrimaryButton variant="secondary" onPress={() => setSeriesPickerVisible(true)}>
          加入系列
        </PrimaryButton>
      </View>

      <View style={[styles.seriesSummary, { backgroundColor: theme.panel, borderColor: theme.border }]}>
        <View style={styles.seriesSummaryText}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>所属系列</Text>
          <Text style={[styles.muted, { color: theme.muted }]}>{bookSeries[0]?.name ?? "未加入系列"}</Text>
        </View>
      </View>

      <Modal visible={seriesPickerVisible} animationType="slide" transparent onRequestClose={() => setSeriesPickerVisible(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.pickerPanel, { backgroundColor: theme.background }]}>
            <View style={styles.pickerHeader}>
              <View style={styles.seriesSummaryText}>
                <Text style={[styles.pickerTitle, { color: theme.text }]}>加入系列</Text>
                <Text style={[styles.muted, { color: theme.muted }]}>一本书只能加入一个系列</Text>
              </View>
              <PrimaryButton variant="secondary" onPress={() => setSeriesPickerVisible(false)}>
                关闭
              </PrimaryButton>
            </View>

            <FlatList
              data={allSeries}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={[styles.muted, { color: theme.muted }]}>还没有系列，请先在书库页创建。</Text>}
              renderItem={({ item }) => {
                const selected = bookSeries[0]?.id === item.id;
                return (
                  <Pressable
                    style={[
                      styles.seriesRow,
                      { borderColor: theme.border },
                      selected && { backgroundColor: theme.accentSoft }
                    ]}
                    onPress={() => void joinSeries(item)}
                  >
                    <Text style={[styles.seriesName, { color: theme.text }]}>{item.name}</Text>
                    <Text style={styles.seriesState}>{selected ? "当前" : "加入"}</Text>
                  </Pressable>
                );
              }}
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
    gap: spacing.lg,
    backgroundColor: colors.paper
  },
  hero: {
    flexDirection: "row",
    gap: spacing.lg
  },
  heroText: {
    flex: 1,
    justifyContent: "center",
    gap: spacing.sm
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: colors.ink
  },
  author: {
    fontSize: 16,
    color: colors.muted
  },
  muted: {
    color: colors.muted
  },
  error: {
    color: colors.danger,
    fontSize: 14
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.ink
  },
  seriesSummary: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  seriesSummaryText: {
    flex: 1,
    gap: spacing.xs
  },
  seriesRow: {
    minHeight: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  seriesName: {
    color: colors.ink,
    fontWeight: "700"
  },
  seriesState: {
    color: colors.accent,
    fontWeight: "700"
  },
  modalScrim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  pickerPanel: {
    maxHeight: "70%",
    minHeight: "42%",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    padding: spacing.lg,
    backgroundColor: colors.paper
  },
  pickerHeader: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  pickerTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800"
  }
});
