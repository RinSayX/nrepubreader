import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
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
      bookCount: number;
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
  const deleteBooks = useLibraryStore((state) => state.deleteBooks);
  const deleteSeriesAndBooks = useLibraryStore((state) => state.deleteSeriesAndBooks);
  const [seriesName, setSeriesName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [settingsMenuVisible, setSettingsMenuVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [createSeriesVisible, setCreateSeriesVisible] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const libraryItems = useMemo(
    () => sortLibraryItems([...seriesSummaries.map(seriesToItem), ...unassignedBooks.map(bookToItem)]),
    [seriesSummaries, unassignedBooks]
  );
  const visibleItems = useMemo(() => filterLibraryItems(libraryItems, searchQuery), [libraryItems, searchQuery]);
  const hasSearch = searchQuery.trim().length > 0;
  const availableGridWidth = Math.max(0, width - SCREEN_HORIZONTAL_PADDING - GRID_GAP * (GRID_COLUMNS - 1));
  const cardWidth = Math.max(1, Math.floor(availableGridWidth / GRID_COLUMNS));
  const theme = getAppTheme(preference);
  const selectedItems = useMemo(
    () => libraryItems.filter((item) => selectedKeys.has(libraryItemKey(item))),
    [libraryItems, selectedKeys]
  );
  const selectedBookCount = selectedItems.reduce((sum, item) => sum + (item.type === "series" ? item.bookCount : 1), 0);

  async function handleCreateSeries() {
    const name = seriesName.trim();
    if (!name) {
      return;
    }
    try {
      const created = await createSeries(name);
      setSeriesName("");
      setCreateSeriesVisible(false);
      navigation.navigate("Series", { seriesId: created.id, seriesName: created.name });
    } catch {
      Alert.alert("创建失败", "请换一个系列名称。");
    }
  }

  function exitManageMode() {
    setManaging(false);
    setSelectedKeys(new Set());
  }

  async function handleImportBook() {
    setAddMenuVisible(false);
    await importBook();
  }

  function openCreateSeries() {
    setAddMenuVisible(false);
    setCreateSeriesVisible(true);
  }

  function openReaderSettings() {
    setSettingsMenuVisible(false);
    navigation.navigate("Settings");
  }

  function enterManageMode() {
    setSettingsMenuVisible(false);
    setManaging(true);
  }

  function toggleSelection(item: LibraryItem) {
    const key = libraryItemKey(item);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function enterManageModeWithSelection(item: LibraryItem) {
    setSelectedKeys(new Set([libraryItemKey(item)]));
    setManaging(true);
  }

  function confirmDeleteSelected() {
    if (selectedItems.length === 0) {
      return;
    }

    const selectedBooks = unassignedBooks.filter((book) => selectedKeys.has(libraryItemKey(bookToItem(book))));
    const selectedSeries = seriesSummaries.filter((series) => selectedKeys.has(libraryItemKey(seriesToItem(series))));
    const nonEmptySeriesCount = selectedSeries.filter((series) => series.bookCount > 0).length;
    const emptySeriesCount = selectedSeries.length - nonEmptySeriesCount;
    const messageParts = [];

    if (selectedBooks.length > 0) {
      messageParts.push(`${selectedBooks.length} 本未加入系列的书`);
    }
    if (nonEmptySeriesCount > 0) {
      const booksInSeriesCount = selectedSeries.reduce((sum, series) => sum + series.bookCount, 0);
      messageParts.push(`${nonEmptySeriesCount} 个系列及其中 ${booksInSeriesCount} 本书`);
    }
    if (emptySeriesCount > 0) {
      messageParts.push(`${emptySeriesCount} 个空系列`);
    }
    const deleteBookFilesNote =
      selectedBookCount > 0 ? "相关书籍文件、封面和阅读进度会从本机移除，删除后无法恢复。" : "空系列删除后无法恢复。";

    Alert.alert(
      "删除所选内容",
      `将删除 ${messageParts.join("、")}。${deleteBookFilesNote}`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "删除",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                if (selectedBooks.length > 0) {
                  await deleteBooks(selectedBooks);
                }
                for (const series of selectedSeries) {
                  await deleteSeriesAndBooks(series.id);
                }
                exitManageMode();
              } catch {
                Alert.alert("删除失败", "部分内容可能没有删除成功，请刷新后重试。");
              }
            })();
          }
        }
      ]
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: theme.background }]}>
      {managing ? (
        <View style={styles.manageToolbar}>
          <View style={styles.manageCopy}>
            <Text style={[styles.manageTitle, { color: theme.text }]} numberOfLines={1}>
              已选择 {selectedItems.length} 项
            </Text>
            <Text style={[styles.manageHint, { color: theme.muted }]} numberOfLines={1}>
              包含 {selectedBookCount} 本书
            </Text>
          </View>
          <View style={styles.manageActions}>
            <PrimaryButton variant="secondary" onPress={exitManageMode}>
              取消
            </PrimaryButton>
            <PrimaryButton variant="danger" onPress={confirmDeleteSelected} disabled={selectedItems.length === 0 || loading}>
              删除{selectedItems.length ? `(${selectedItems.length})` : ""}
            </PrimaryButton>
          </View>
        </View>
      ) : (
        <View style={styles.toolbar}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="搜索书名、系列或作者"
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { backgroundColor: theme.panel, borderColor: theme.border, color: theme.text }]}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <CircleButton label="+" variant="primary" theme={theme} onPress={() => setAddMenuVisible(true)} />
          <CircleButton label="⚙" variant="secondary" theme={theme} onPress={() => setSettingsMenuVisible(true)} />
        </View>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}

      <FlatList
        key="library-grid"
        numColumns={3}
        data={visibleItems}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        extraData={`${managing}-${Array.from(selectedKeys).join(",")}`}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={visibleItems.length === 0 ? styles.emptyList : styles.libraryGrid}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{hasSearch ? "没有找到匹配项" : "还没有书"}</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              {hasSearch ? "换一个关键词试试。" : "导入 EPUB 或 TXT 后，单本书会直接显示；也可以创建系列来收纳多册小说。"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <LibraryBookRow
            item={item}
            width={cardWidth}
            theme={theme}
            managing={managing}
            selected={selectedKeys.has(libraryItemKey(item))}
            onPress={() =>
              managing
                ? toggleSelection(item)
                : item.type === "series"
                  ? navigation.navigate("Series", { seriesId: item.id, seriesName: item.title })
                  : navigation.navigate("BookDetail", { bookId: item.id })
            }
            onLongPress={!managing ? () => enterManageModeWithSelection(item) : undefined}
          />
        )}
      />

      <ActionMenu title="添加" visible={addMenuVisible} theme={theme} onClose={() => setAddMenuVisible(false)}>
        <MenuItem label="导入书籍" theme={theme} onPress={() => void handleImportBook()} />
        <MenuItem label="新建系列" theme={theme} onPress={openCreateSeries} />
      </ActionMenu>

      <ActionMenu title="设置" visible={settingsMenuVisible} theme={theme} onClose={() => setSettingsMenuVisible(false)}>
        <MenuItem label="阅读设置" theme={theme} onPress={openReaderSettings} />
        <MenuItem label="管理书库" theme={theme} onPress={enterManageMode} disabled={libraryItems.length === 0} />
      </ActionMenu>

      <Modal visible={createSeriesVisible} animationType="fade" transparent onRequestClose={() => setCreateSeriesVisible(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.dialog, { backgroundColor: theme.background }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>新建系列</Text>
            <TextInput
              value={seriesName}
              onChangeText={setSeriesName}
              placeholder="例如：三体"
              placeholderTextColor={theme.muted}
              style={[styles.input, { backgroundColor: theme.panel, borderColor: theme.border, color: theme.text }]}
              returnKeyType="done"
              onSubmitEditing={handleCreateSeries}
              autoFocus
            />
            <View style={styles.dialogActions}>
              <PrimaryButton
                variant="secondary"
                onPress={() => {
                  setSeriesName("");
                  setCreateSeriesVisible(false);
                }}
              >
                取消
              </PrimaryButton>
              <PrimaryButton variant="secondary" onPress={handleCreateSeries} disabled={!seriesName.trim()}>
                创建
              </PrimaryButton>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CircleButton({
  label,
  onPress,
  theme,
  variant
}: {
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof getAppTheme>;
  variant: "primary" | "secondary";
}) {
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.circleButton,
        {
          backgroundColor: isPrimary ? theme.accent : theme.accentSoft,
          borderColor: isPrimary ? theme.accent : theme.border
        },
        pressed && styles.pressed
      ]}
    >
      <Text style={[styles.circleButtonText, { color: isPrimary ? "#ffffff" : theme.accent }]}>{label}</Text>
    </Pressable>
  );
}

function ActionMenu({
  title,
  visible,
  onClose,
  theme,
  children
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  theme: ReturnType<typeof getAppTheme>;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.menuScrim} onPress={onClose}>
        <Pressable style={[styles.menuPanel, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={[styles.menuTitle, { color: theme.muted }]}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function MenuItem({
  label,
  onPress,
  theme,
  disabled = false
}: {
  label: string;
  onPress: () => void;
  theme: ReturnType<typeof getAppTheme>;
  disabled?: boolean;
}) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.menuItem, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.menuItemText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function LibraryBookRow({
  item,
  onPress,
  onLongPress,
  width,
  theme,
  managing,
  selected
}: {
  item: LibraryItem;
  onPress: () => void;
  onLongPress?: () => void;
  width: number;
  theme: ReturnType<typeof getAppTheme>;
  managing: boolean;
  selected: boolean;
}) {
  const coverHeight = Math.round(width * COVER_ASPECT_RATIO);

  return (
    <Pressable style={[styles.bookRow, { width }]} onPress={onPress} onLongPress={onLongPress} delayLongPress={500}>
      <View
        style={[
          styles.cover,
          { width, height: coverHeight, backgroundColor: theme.accentSoft },
          selected && { borderColor: theme.accent, borderWidth: 2 }
        ]}
      >
        {item.coverPath ? (
          <Image source={{ uri: item.coverPath }} style={styles.coverImage} resizeMode="cover" />
        ) : (
          <Text style={styles.coverPlaceholderTitle} numberOfLines={5} adjustsFontSizeToFit minimumFontScale={0.76}>
            {item.title}
          </Text>
        )}
        {managing ? (
          <View style={[styles.selectionBadge, selected && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
            <Text style={[styles.selectionText, selected && styles.selectionTextSelected]}>{selected ? "✓" : ""}</Text>
          </View>
        ) : null}
      </View>
      <Text style={[styles.bookTitle, { color: theme.text }]} numberOfLines={1}>
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
    createdDate: series.createdAt,
    bookCount: series.bookCount
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

function libraryItemKey(item: Pick<LibraryItem, "type" | "id">) {
  return `${item.type}:${item.id}`;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.paper
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.lg,
    gap: spacing.sm
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "#ffffff",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    color: colors.ink
  },
  circleButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "#ffffff"
  },
  circleButtonText: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink
  },
  manageToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.lg,
    gap: spacing.sm
  },
  manageCopy: {
    flex: 1,
    gap: spacing.xs
  },
  manageTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "800",
    color: colors.ink
  },
  manageActions: {
    flexDirection: "row",
    flexShrink: 0,
    gap: spacing.sm
  },
  error: {
    color: colors.danger,
    fontSize: 14
  },
  manageHint: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 15
  },
  loader: {
    marginTop: spacing.sm
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    color: colors.ink
  },
  menuScrim: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-start",
    paddingTop: 72,
    paddingHorizontal: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.18)"
  },
  menuPanel: {
    width: 180,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    backgroundColor: colors.paper
  },
  menuTitle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  menuItem: {
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  menuItemText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "700"
  },
  modalScrim: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  dialog: {
    width: "100%",
    maxWidth: 420,
    gap: spacing.md,
    borderRadius: 8,
    padding: spacing.lg,
    backgroundColor: colors.paper
  },
  dialogTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "800"
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.75
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
    overflow: "hidden",
    borderColor: "transparent",
    borderWidth: 0
  },
  coverPlaceholderTitle: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "center",
    paddingHorizontal: spacing.sm
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
  },
  selectionBadge: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 2,
    borderColor: colors.border
  },
  selectionText: {
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "900"
  },
  selectionTextSelected: {
    color: "#ffffff"
  }
});
