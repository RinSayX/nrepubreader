import { Image, StyleSheet, Text, View } from "react-native";

import { colors } from "@/theme/tokens";
import type { Book } from "@/types";

export function BookCover({ book, size = "md" }: { book: Book; size?: "sm" | "md" | "lg" }) {
  const width = size === "sm" ? 54 : size === "lg" ? 104 : 72;
  const height = Math.round(width * 1.42);

  if (book.coverPath) {
    return <Image source={{ uri: book.coverPath }} style={[styles.cover, { width, height }]} resizeMode="cover" />;
  }

  return (
    <View style={[styles.placeholder, { width, height }]}>
      <Text numberOfLines={3} style={styles.placeholderText}>
        {book.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: 6,
    backgroundColor: colors.paperAlt
  },
  placeholder: {
    borderRadius: 6,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    padding: 6
  },
  placeholderText: {
    color: colors.accent,
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    fontWeight: "700"
  }
});
