import { ScrollView, StyleSheet, Switch, Text, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { fontOptions } from "@/theme/fonts";
import { getAppTheme } from "@/theme/appTheme";
import { colors, spacing } from "@/theme/tokens";
import { useLibraryStore } from "@/store/libraryStore";

const colorPresets = [
  { label: "纸张", backgroundColor: "#fbf7ef", textColor: "#202124" },
  { label: "纯白", backgroundColor: "#ffffff", textColor: "#1f2933" },
  { label: "护眼", backgroundColor: "#edf5e1", textColor: "#22312a" },
  { label: "夜间", backgroundColor: "#151515", textColor: "#ece7dd" }
];

export function SettingsScreen() {
  const preference = useLibraryStore((state) => state.preference);
  const savePreference = useLibraryStore((state) => state.savePreference);
  const theme = getAppTheme(preference);

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.row}>
          <View>
            <Text style={[styles.label, { color: theme.text }]}>夜间模式</Text>
            <Text style={[styles.hint, { color: theme.muted }]}>同步应用外壳和阅读页颜色</Text>
          </View>
          <Switch
            value={preference.themeMode === "dark"}
            onValueChange={(value) =>
              void savePreference({
                ...preference,
                themeMode: value ? "dark" : "light",
                backgroundColor: value ? "#151515" : "#fbf7ef",
                textColor: value ? "#ece7dd" : "#202124"
              })
            }
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>字体</Text>
        <View style={styles.optionGrid}>
          {fontOptions.map((font) => {
            const selected = preference.fontFamily === font.value;
            return (
              <Pressable
                key={font.value}
                style={[
                  styles.option,
                  { backgroundColor: theme.panel, borderColor: theme.border },
                  selected && styles.selectedOption
                ]}
                onPress={() => void savePreference({ ...preference, fontFamily: font.value })}
              >
                <Text style={[styles.optionText, { color: theme.text }, font.value !== "System" && { fontFamily: font.value }]}>
                  {font.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>字号</Text>
        <View style={styles.stepperRow}>
          {[16, 18, 20, 22, 24].map((size) => (
            <Pressable
              key={size}
              style={[
                styles.sizeButton,
                { backgroundColor: theme.panel, borderColor: theme.border },
                preference.fontSize === size && styles.selectedOption
              ]}
              onPress={() => void savePreference({ ...preference, fontSize: size })}
            >
              <Text style={[styles.optionText, { color: theme.text }]}>{size}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>行高</Text>
        <View style={styles.stepperRow}>
          {[1.4, 1.55, 1.65, 1.8, 2].map((lineHeight) => (
            <Pressable
              key={lineHeight}
              style={[
                styles.sizeButton,
                { backgroundColor: theme.panel, borderColor: theme.border },
                preference.lineHeight === lineHeight && styles.selectedOption
              ]}
              onPress={() => void savePreference({ ...preference, lineHeight })}
            >
              <Text style={[styles.optionText, { color: theme.text }]}>{lineHeight}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>背景与文字</Text>
        <View style={styles.optionGrid}>
          {colorPresets.map((preset) => {
            const selected = preference.backgroundColor === preset.backgroundColor && preference.textColor === preset.textColor;
            return (
              <Pressable
                key={preset.label}
                style={[styles.colorOption, selected && styles.selectedOption, { backgroundColor: preset.backgroundColor }]}
                onPress={() =>
                  void savePreference({
                    ...preference,
                    backgroundColor: preset.backgroundColor,
                    textColor: preset.textColor,
                    themeMode: preset.label === "夜间" ? "dark" : "light"
                  })
                }
              >
                <Text style={[styles.colorLabel, { color: preset.textColor }]}>{preset.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg
  },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  label: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "800"
  },
  hint: {
    marginTop: 4,
    color: colors.muted
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "800"
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  option: {
    minHeight: 44,
    minWidth: "47%",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border
  },
  selectedOption: {
    borderWidth: 2,
    borderColor: colors.accent
  },
  optionText: {
    color: colors.ink,
    fontWeight: "700"
  },
  stepperRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  sizeButton: {
    minWidth: 48,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  colorOption: {
    minWidth: "47%",
    minHeight: 64,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth
  },
  colorLabel: {
    fontWeight: "800"
  }
});
