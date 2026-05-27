import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { ReactNode } from "react";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RootStackParamList } from "@/navigation/types";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getTranslations } from "@/i18n";
import { getAppTheme } from "@/theme/appTheme";
import { colors, spacing } from "@/theme/tokens";
import { useLibraryStore } from "@/features/library/store/libraryStore";
import type { Book, SeriesSummary } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Library">;

const GRID_COLUMNS = 3;
const GRID_GAP = 16;
const SCREEN_HORIZONTAL_PADDING = spacing.lg * 2;
const COVER_ASPECT_RATIO = 1.43;
const LONG_PRESS_RELEASE_SUPPRESS_MS = 800;

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
  const suppressPressUntilRef = useRef(0);
  const t = getTranslations(preference.language);
  const libraryItems = useMemo(
    () => sortLibraryItems([...seriesSummaries.map((series) => seriesToItem(series, t)), ...unassignedBooks.map((book) => bookToItem(book, t))]),
    [seriesSummaries, t, unassignedBooks]
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
      Alert.alert(t.library.createSeriesFailed, t.library.createSeriesFailedMessage);
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

  function openAbout() {
    setSettingsMenuVisible(false);
    navigation.navigate("About");
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
    suppressPressUntilRef.current = Date.now() + LONG_PRESS_RELEASE_SUPPRESS_MS;
    setSelectedKeys(new Set([libraryItemKey(item)]));
    setManaging(true);
  }

  function handleLibraryItemPress(item: LibraryItem) {
    if (Date.now() < suppressPressUntilRef.current) {
      return;
    }
    if (managing) {
      toggleSelection(item);
      return;
    }
    if (item.type === "series") {
      navigation.navigate("Series", { seriesId: item.id, seriesName: item.title });
      return;
    }
    navigation.navigate("BookDetail", { bookId: item.id });
  }

  function confirmDeleteSelected() {
    if (selectedItems.length === 0) {
      return;
    }

    const selectedBooks = unassignedBooks.filter((book) => selectedKeys.has(libraryItemKey(bookToItem(book, t))));
    const selectedSeries = seriesSummaries.filter((series) => selectedKeys.has(libraryItemKey(seriesToItem(series, t))));
    const nonEmptySeriesCount = selectedSeries.filter((series) => series.bookCount > 0).length;
    const emptySeriesCount = selectedSeries.length - nonEmptySeriesCount;
    const messageParts = [];

    if (selectedBooks.length > 0) {
      messageParts.push(t.library.unassignedBooks(selectedBooks.length));
    }
    if (nonEmptySeriesCount > 0) {
      const booksInSeriesCount = selectedSeries.reduce((sum, series) => sum + series.bookCount, 0);
      messageParts.push(t.library.seriesAndBooks(nonEmptySeriesCount, booksInSeriesCount));
    }
    if (emptySeriesCount > 0) {
      messageParts.push(t.library.emptySeries(emptySeriesCount));
    }
    const deleteBookFilesNote =
      selectedBookCount > 0 ? t.library.deleteBookFilesNote : t.library.deleteEmptySeriesNote;

    Alert.alert(
      t.library.deleteSelectedTitle,
      t.library.deleteSelectedMessage(messageParts.join(preference.language === "en" ? ", " : "、"), deleteBookFilesNote),
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
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
                Alert.alert(t.library.deleteFailed, t.library.deleteFailedMessage);
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
              {t.library.selectedItems(selectedItems.length)}
            </Text>
            <Text style={[styles.manageHint, { color: theme.muted }]} numberOfLines={1}>
              {t.library.includesBooks(selectedBookCount)}
            </Text>
          </View>
          <View style={styles.manageActions}>
            <PrimaryButton variant="secondary" onPress={exitManageMode}>
              {t.common.cancel}
            </PrimaryButton>
            <PrimaryButton variant="danger" onPress={confirmDeleteSelected} disabled={selectedItems.length === 0 || loading}>
              {t.common.delete}
              {selectedItems.length ? `(${selectedItems.length})` : ""}
            </PrimaryButton>
          </View>
        </View>
      ) : (
        <View style={styles.toolbar}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t.library.searchPlaceholder}
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
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{hasSearch ? t.library.emptySearchTitle : t.library.emptyLibraryTitle}</Text>
            <Text style={[styles.emptyText, { color: theme.muted }]}>
              {hasSearch ? t.library.emptySearchHint : t.library.emptyLibraryHint}
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
            onPress={() => handleLibraryItemPress(item)}
            onLongPress={!managing ? () => enterManageModeWithSelection(item) : undefined}
          />
        )}
      />

      <ActionMenu title={t.library.add} visible={addMenuVisible} theme={theme} onClose={() => setAddMenuVisible(false)}>
        <MenuItem label={t.library.importBooks} theme={theme} onPress={() => void handleImportBook()} />
        <MenuItem label={t.library.newSeries} theme={theme} onPress={openCreateSeries} />
      </ActionMenu>

      <ActionMenu title={t.library.settings} visible={settingsMenuVisible} theme={theme} onClose={() => setSettingsMenuVisible(false)}>
        <MenuItem label={t.library.readerSettings} theme={theme} onPress={openReaderSettings} />
        <MenuItem label={t.library.manageLibrary} theme={theme} onPress={enterManageMode} disabled={libraryItems.length === 0} />
        <MenuItem label={t.library.about} theme={theme} onPress={openAbout} />
      </ActionMenu>

      <Modal visible={createSeriesVisible} animationType="fade" transparent onRequestClose={() => setCreateSeriesVisible(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.dialog, { backgroundColor: theme.background }]}>
            <Text style={[styles.dialogTitle, { color: theme.text }]}>{t.library.newSeriesTitle}</Text>
            <TextInput
              value={seriesName}
              onChangeText={setSeriesName}
              placeholder={t.library.seriesPlaceholder}
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
                {t.common.cancel}
              </PrimaryButton>
              <PrimaryButton variant="secondary" onPress={handleCreateSeries} disabled={!seriesName.trim()}>
                {t.library.create}
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

function seriesToItem(series: SeriesSummary, t: ReturnType<typeof getTranslations>): LibraryItem {
  return {
    type: "series",
    id: series.id,
    title: series.name,
    subtitle: t.library.seriesBookCount(series.bookCount),
    coverPath: series.coverPaths[0] ?? null,
    sortTitle: series.name,
    recentDate: series.latestOpenedAt ?? series.createdAt,
    createdDate: series.createdAt,
    bookCount: series.bookCount
  };
}

function bookToItem(book: Book, t: ReturnType<typeof getTranslations>): LibraryItem {
  return {
    type: "book",
    id: book.id,
    title: book.title,
    subtitle: book.author ?? t.common.unknownAuthor,
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
