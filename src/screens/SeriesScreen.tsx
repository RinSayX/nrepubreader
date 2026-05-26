import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover } from "@/components/BookCover";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getTranslations } from "@/i18n";
import { UNASSIGNED_SERIES_ID } from "@/repositories/seriesConstants";
import { getAppTheme } from "@/theme/appTheme";
import { colors, spacing } from "@/theme/tokens";
import { useLibraryStore } from "@/store/libraryStore";
import type { Book, RootStackParamList } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Series">;

const LONG_PRESS_RELEASE_SUPPRESS_MS = 800;

export function SeriesScreen({ navigation, route }: Props) {
  const { seriesId } = route.params;
  const series = useLibraryStore((state) => state.series.find((item) => item.id === seriesId));
  const seriesSummary = useLibraryStore((state) => state.seriesSummaries.find((item) => item.id === seriesId));
  const unassignedBooks = useLibraryStore((state) => state.unassignedBooks);
  const loading = useLibraryStore((state) => state.loading);
  const preference = useLibraryStore((state) => state.preference);
  const listBooksInSeries = useLibraryStore((state) => state.listBooksInSeries);
  const deleteBooks = useLibraryStore((state) => state.deleteBooks);
  const addBookToSeries = useLibraryStore((state) => state.addBookToSeries);
  const importBookToSeries = useLibraryStore((state) => state.importBookToSeries);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addVisible, setAddVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const suppressPressUntilRef = useRef(0);
  const isUnassigned = seriesId === UNASSIGNED_SERIES_ID;
  const theme = getAppTheme(preference);
  const t = getTranslations(preference.language);

  const title = useMemo(
    () => (isUnassigned ? t.series.unassignedTitle : (series?.name ?? seriesSummary?.name ?? route.params.seriesName ?? t.nav.seriesDetail)),
    [isUnassigned, route.params.seriesName, series?.name, seriesSummary?.name, t.nav.seriesDetail, t.series.unassignedTitle]
  );
  const addableBooks = useMemo(() => unassignedBooks, [unassignedBooks]);
  const selectedBooks = useMemo(() => books.filter((book) => selectedBookIds.has(book.id)), [books, selectedBookIds]);

  const refreshSeriesBooks = useCallback(async () => {
    setBooks(await listBooksInSeries(seriesId));
    setLoadError(null);
  }, [listBooksInSeries, seriesId]);

  useEffect(() => {
    void refreshSeriesBooks().catch(() => {
      setLoadError(t.series.loadFailed);
    });
  }, [refreshSeriesBooks, t.series.loadFailed]);

  useEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  useEffect(() => {
    setSelectedBookIds((current) => {
      const existingIds = new Set(books.map((book) => book.id));
      const next = new Set([...current].filter((id) => existingIds.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [books]);

  function exitManageMode() {
    setManaging(false);
    setSelectedBookIds(new Set());
  }

  function toggleBookSelection(bookId: string) {
    setSelectedBookIds((current) => {
      const next = new Set(current);
      if (next.has(bookId)) {
        next.delete(bookId);
      } else {
        next.add(bookId);
      }
      return next;
    });
  }

  function enterManageModeWithBook(bookId: string) {
    suppressPressUntilRef.current = Date.now() + LONG_PRESS_RELEASE_SUPPRESS_MS;
    setSelectedBookIds(new Set([bookId]));
    setManaging(true);
  }

  function handleBookPress(bookId: string) {
    if (Date.now() < suppressPressUntilRef.current) {
      return;
    }
    if (managing) {
      toggleBookSelection(bookId);
      return;
    }
    navigation.navigate("BookDetail", { bookId });
  }

  function selectAllBooks() {
    setSelectedBookIds(new Set(books.map((book) => book.id)));
  }

  function confirmDeleteSelectedBooks() {
    if (selectedBooks.length === 0) {
      return;
    }

    const emptySeriesNote = !isUnassigned && selectedBooks.length === books.length ? t.series.emptySeriesNote : "";

    Alert.alert(
      t.series.deleteSelectedTitle,
      t.series.deleteSelectedMessage(selectedBooks.length, emptySeriesNote),
      [
        { text: t.common.cancel, style: "cancel" },
        {
          text: t.common.delete,
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteBooks(selectedBooks);
                await refreshSeriesBooks();
                exitManageMode();
              } catch {
                setLoadError(t.series.deleteFailed);
              }
            })();
          }
        }
      ]
    );
  }

  async function addBook(book: Book) {
    try {
      await addBookToSeries(book.id, seriesId);
      await refreshSeriesBooks();
      setLoadError(null);
    } catch {
      setLoadError(t.series.addFailed);
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
      setLoadError(t.series.importFailed);
    }
  }

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: theme.background }]}>
      {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {managing ? t.series.selectedBooks(selectedBooks.length) : isUnassigned ? t.series.unassignedSubtitle : t.series.bookCount(books.length)}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {managing ? (
            <>
              <PrimaryButton variant="secondary" onPress={selectAllBooks} disabled={books.length === 0 || selectedBooks.length === books.length}>
                {t.series.selectAll}
              </PrimaryButton>
              <PrimaryButton variant="secondary" onPress={exitManageMode}>
                {t.common.cancel}
              </PrimaryButton>
              <PrimaryButton variant="danger" onPress={confirmDeleteSelectedBooks} disabled={selectedBooks.length === 0 || loading}>
                {t.common.delete}
                {selectedBooks.length ? `(${selectedBooks.length})` : ""}
              </PrimaryButton>
            </>
          ) : (
            <>
              {!isUnassigned ? (
                <PrimaryButton variant="secondary" onPress={() => setAddVisible(true)}>
                  {t.series.addBooks}
                </PrimaryButton>
              ) : null}
              <PrimaryButton variant="secondary" onPress={() => setManaging(true)} disabled={books.length === 0}>
                {t.series.manage}
              </PrimaryButton>
            </>
          )}
        </View>
      </View>
      <FlatList
        data={books}
        keyExtractor={(item) => item.id}
        extraData={`${managing}-${Array.from(selectedBookIds).join(",")}`}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.muted }]}>{isUnassigned ? t.series.emptyUnassigned : t.series.emptySeries}</Text>
        }
        renderItem={({ item }) => {
          const selected = selectedBookIds.has(item.id);
          return (
            <Pressable
              style={[
                styles.row,
                { borderColor: theme.border },
                managing && { backgroundColor: theme.panel },
                selected && { backgroundColor: theme.accentSoft }
              ]}
              onPress={() => handleBookPress(item.id)}
              onLongPress={!managing ? () => enterManageModeWithBook(item.id) : undefined}
              delayLongPress={500}
            >
              <BookCover book={item} size="sm" />
              <View style={styles.meta}>
                <Text style={[styles.bookTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.author, { color: theme.muted }]}>{item.author ?? t.common.unknownAuthor}</Text>
              </View>
              {managing ? (
                <View style={[styles.selectionBadge, selected && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                  <Text style={[styles.selectionText, selected && styles.selectionTextSelected]}>{selected ? "✓" : ""}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        }}
      />

      <Modal visible={addVisible} animationType="slide" transparent onRequestClose={() => setAddVisible(false)}>
        <View style={styles.modalScrim}>
          <View style={[styles.addPanel, { backgroundColor: theme.background }]}>
            <View style={styles.addHeader}>
              <View style={styles.headerText}>
                <Text style={[styles.addTitle, { color: theme.text }]}>{t.series.addBooksTitle}</Text>
                <Text style={[styles.subtitle, { color: theme.muted }]}>{t.series.addBooksSubtitle(title)}</Text>
              </View>
              <PrimaryButton variant="secondary" onPress={() => setAddVisible(false)}>
                {t.common.close}
              </PrimaryButton>
            </View>
            <View style={styles.addActions}>
              <PrimaryButton onPress={importBook} disabled={loading}>
                {t.library.importBooks}
              </PrimaryButton>
            </View>

            <FlatList
              data={addableBooks}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={<Text style={[styles.empty, { color: theme.muted }]}>{t.series.noAddableBooks}</Text>}
              renderItem={({ item }) => (
                <View style={[styles.row, { borderColor: theme.border }]}>
                  <BookCover book={item} size="sm" />
                  <View style={styles.meta}>
                    <Text style={[styles.bookTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.author, { color: theme.muted }]}>{item.author ?? t.common.unknownAuthor}</Text>
                  </View>
                  <Pressable
                    style={[styles.addButton, { backgroundColor: theme.accentSoft }]}
                    onPress={() => {
                      void addBook(item);
                    }}
                  >
                    <Text style={styles.addButtonText}>{t.series.add}</Text>
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
    alignItems: "stretch",
    gap: spacing.md,
    marginBottom: spacing.lg
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
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
    paddingHorizontal: spacing.sm,
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
  },
  selectionBadge: {
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
