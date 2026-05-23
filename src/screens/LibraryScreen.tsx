import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "@/components/PrimaryButton";
import { getAppTheme } from "@/theme/appTheme";
import { colors, spacing } from "@/theme/tokens";
import { useLibraryStore } from "@/store/libraryStore";
import type { Book, RootStackParamList, SeriesSummary } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Library">;

const GRID_COLUMNS = 3;
const GRID_GAP = 16;
const SCREEN_HORIZONTAL_PADDING = spacing.lg * 2;
const COVER_ASPECT_RATIO = 1.43;

type LibraryItem =
  | {
      type: "series";
      id: string;
      title: string;
      subtitle: string;
      coverPath: string | null;
      sortTitle: string;
      recentDate: string | null;
      createdDate: string;
    }
  | {
      type: "book";
      id: string;
      title: string;
      subtitle: string;
      coverPath: string | null;
      sortTitle: string;
      recentDate: string | null;
      createdDate: string;
    };

export function LibraryScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const seriesSummaries = useLibraryStore((state) => state.seriesSummaries);
  const unassignedBooks = useLibraryStore((state) => state.unassignedBooks);
  const loading = useLibraryStore((state) => state.loading);
  const error = useLibraryStore((state) => state.error);
  const preference = useLibraryStore((state) => state.preference);
  const importBook = useLibraryStore((state) => state.importBook);
  const createSeries = useLibraryStore((state) => state.createSeries);
  const [seriesName, setSeriesName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const libraryItems = useMemo(
    () => sortLibraryItems([...seriesSummaries.map(seriesToItem), ...unassignedBooks.map(bookToItem)]),
    [seriesSummaries, unassignedBooks]
  );
  const visibleItems = useMemo(() => filterLibraryItems(libraryItems, searchQuery), [libraryItems, searchQuery]);
  const hasSearch = searchQuery.trim().length > 0;
  const availableGridWidth = Math.max(0, width - SCREEN_HORIZONTAL_PADDING - GRID_GAP * (GRID_COLUMNS - 1));
  const cardWidth = Math.max(1, Math.floor(availableGridWidth / GRID_COLUMNS));
  const theme = getAppTheme(preference);

  async function handleCreateSeries() {
    const name = seriesName.trim();
    if (!name) {
      return;
    }
    try {
      const created = await createSeries(name);
      setSeriesName("");
      navigation.navigate("Series", { seriesId: created.id });
    } catch {
      Alert.alert("创建失败", "请换一个系列名称。");
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>我的书库</Text>
        <View style={styles.headerActions}>
          <PrimaryButton variant="secondary" onPress={() => navigation.navigate("Settings")}>
            阅读设置
          </PrimaryButton>
          <PrimaryButton onPress={importBook} disabled={loading}>
            导入 EPUB
          </PrimaryButton>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.searchRow}>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索书名、系列或作者"
          placeholderTextColor={theme.muted}
          style={[styles.input, { backgroundColor: theme.panel, borderColor: theme.border, color: theme.text }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {hasSearch ? (
          <PrimaryButton variant="secondary" onPress={() => setSearchQuery("")}>
            清除
          </PrimaryButton>
        ) : null}
      </View>

      <View style={styles.createSeriesRow}>
        <TextInput
          value={seriesName}
          onChangeText={setSeriesName}
          placeholder="新建系列，例如：凡人修仙传"
          placeholderTextColor={theme.muted}
          style={[styles.input, { backgroundColor: theme.panel, borderColor: theme.border, color: theme.text }]}
          returnKeyType="done"
          onSubmitEditing={handleCreateSeries}
        />
        <PrimaryButton variant="secondary" onPress={handleCreateSeries} disabled={!seriesName.trim()}>
          创建
        </PrimaryButton>
      </View>

      {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}

      <FlatList
        key="library-grid"
        numColumns={3}
        data={visibleItems}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={visibleItems.length === 0 ? styles.emptyList : styles.libraryGrid}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{hasSearch ? "没有找到匹配项" : "还没有书"}</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              {hasSearch ? "换一个关键词试试。" : "导入 EPUB 后，单本书会直接显示；也可以创建系列来收纳多册小说。"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <LibraryBookRow
            item={item}
            width={cardWidth}
            theme={theme}
            onPress={() =>
              item.type === "series"
                ? navigation.navigate("Series", { seriesId: item.id })
                : navigation.navigate("BookDetail", { bookId: item.id })
            }
          />
        )}
      />
    </SafeAreaView>
  );
}

function LibraryBookRow({
  item,
  onPress,
  width,
  theme
}: {
  item: LibraryItem;
  onPress: () => void;
  width: number;
  theme: ReturnType<typeof getAppTheme>;
}) {
  const coverHeight = Math.round(width * COVER_ASPECT_RATIO);

  return (
    <Pressable style={[styles.bookRow, { width }]} onPress={onPress}>
      <View style={[styles.cover, { width, height: coverHeight, backgroundColor: theme.accentSoft }]}>
        {item.coverPath ? (
          <Image source={{ uri: item.coverPath }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <Text style={styles.coverGlyph}>{item.title.slice(0, 1)}</Text>
        )}
      </View>
      <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={2}>
        {item.title}
      </Text>
    </Pressable>
  );
}

function seriesToItem(series: SeriesSummary): LibraryItem {
  return {
    type: "series",
    id: series.id,
    title: series.name,
    subtitle: `${series.bookCount} 本图书`,
    coverPath: series.coverPaths[0] ?? null,
    sortTitle: series.name,
    recentDate: series.latestOpenedAt ?? series.createdAt,
    createdDate: series.createdAt
  };
}

function bookToItem(book: Book): LibraryItem {
  return {
    type: "book",
    id: book.id,
    title: book.title,
    subtitle: book.author ?? "未知作者",
    coverPath: book.coverPath,
    sortTitle: book.title,
    recentDate: book.lastOpenedAt ?? book.createdAt,
    createdDate: book.createdAt
  };
}

function sortLibraryItems(items: LibraryItem[]) {
  return [...items].sort((left, right) => (right.recentDate ?? "").localeCompare(left.recentDate ?? ""));
}

function filterLibraryItems(items: LibraryItem[], query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => normalizeSearchText(`${item.title} ${item.subtitle}`).includes(normalizedQuery));
}

function normalizeSearchText(value: string) {
  return value.trim().toLocaleLowerCase();
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.paper
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.lg
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.ink
  },
  error: {
    color: colors.danger,
    fontSize: 14
  },
  loader: {
    marginTop: spacing.sm
  },
  createSeriesRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  searchRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    color: colors.ink
  },
  libraryGrid: {
    gap: GRID_GAP,
    paddingBottom: spacing.xl
  },
  gridRow: {
    gap: GRID_GAP
  },
  emptyList: {
    flexGrow: 1
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink
  },
  emptyText: {
    color: colors.muted,
    textAlign: "center"
  },
  bookRow: {
    gap: spacing.sm
  },
  cover: {
    borderRadius: 6,
    backgroundColor: colors.accentSoft,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden"
  },
  coverGlyph: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: "900"
  },
  coverImage: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 6,
    backgroundColor: colors.accent
  },
  bookTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700",
    color: colors.ink,
    textAlign: "center"
  }
});
