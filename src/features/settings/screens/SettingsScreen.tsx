import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getTranslations, languageOptions } from "@/i18n";
import { fontOptions } from "@/theme/fonts";
import { getAppTheme } from "@/theme/appTheme";
import { colors, spacing } from "@/theme/tokens";
import { useLibraryStore } from "@/features/library/store/libraryStore";
import { MAX_FONT_SIZE, MIN_FONT_SIZE, normalizeFontSize } from "@/features/settings/fontSize";

const colorPresets = [
  { key: "paper", backgroundColor: "#fbf7ef", textColor: "#202124" },
  { key: "white", backgroundColor: "#ffffff", textColor: "#1f2933" },
  { key: "eyeCare", backgroundColor: "#edf5e1", textColor: "#22312a" },
  { key: "night", backgroundColor: "#151515", textColor: "#ece7dd" }
] as const;

export function SettingsScreen() {
  const preference = useLibraryStore((state) => state.preference);
  const savePreference = useLibraryStore((state) => state.savePreference);
  const theme = getAppTheme(preference);
  const t = getTranslations(preference.language);
  const [fontSizeInput, setFontSizeInput] = useState(String(preference.fontSize));

  useEffect(() => {
    setFontSizeInput(String(preference.fontSize));
  }, [preference.fontSize]);

  function updateFontSize(value: number) {
    const fontSize = normalizeFontSize(value, preference.fontSize);
    setFontSizeInput(String(fontSize));
    if (fontSize !== preference.fontSize) {
      void savePreference({ ...preference, fontSize }).catch(() => {
        setFontSizeInput(String(preference.fontSize));
        Alert.alert(t.common.operationFailed);
      });
    }
  }

  const displayedFontSize = fontSizeInput ? normalizeFontSize(Number(fontSizeInput), preference.fontSize) : preference.fontSize;

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.settings.language}</Text>
        <View style={styles.optionGrid}>
          {languageOptions.map((language) => {
            const selected = preference.language === language.value;
            return (
              <Pressable
                key={language.value}
                style={[
                  styles.option,
                  { backgroundColor: theme.panel, borderColor: theme.border },
                  selected && styles.selectedOption
                ]}
                onPress={() => void savePreference({ ...preference, language: language.value })}
              >
                <Text style={[styles.optionText, { color: theme.text }]}>{language.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.row}>
          <View>
            <Text style={[styles.label, { color: theme.text }]}>{t.settings.nightMode}</Text>
            <Text style={[styles.hint, { color: theme.muted }]}>{t.settings.nightModeHint}</Text>
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

        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.settings.font}</Text>
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
                  {typeof font.label === "string" ? font.label : font.label[preference.language]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.settings.fontSize}</Text>
        <View style={styles.stepperRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.settings.decreaseFontSize}
            disabled={displayedFontSize <= MIN_FONT_SIZE}
            style={[styles.sizeButton, { backgroundColor: theme.panel, borderColor: theme.border }, displayedFontSize <= MIN_FONT_SIZE && styles.disabledButton]}
            onPress={() => updateFontSize(displayedFontSize - 1)}
          >
            <Text style={[styles.stepperSymbol, { color: theme.text }]}>-</Text>
          </Pressable>
          <TextInput
            accessibilityLabel={t.settings.fontSize}
            style={[styles.fontSizeInput, { color: theme.text, backgroundColor: theme.panel, borderColor: theme.border }]}
            value={fontSizeInput}
            onChangeText={(value) => setFontSizeInput(value.replace(/\D/g, ""))}
            onEndEditing={() => updateFontSize(fontSizeInput ? Number(fontSizeInput) : preference.fontSize)}
            keyboardType="number-pad"
            returnKeyType="done"
            maxLength={2}
            selectTextOnFocus
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.settings.increaseFontSize}
            disabled={displayedFontSize >= MAX_FONT_SIZE}
            style={[styles.sizeButton, { backgroundColor: theme.panel, borderColor: theme.border }, displayedFontSize >= MAX_FONT_SIZE && styles.disabledButton]}
            onPress={() => updateFontSize(displayedFontSize + 1)}
          >
            <Text style={[styles.stepperSymbol, { color: theme.text }]}>+</Text>
          </Pressable>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.settings.lineHeight}</Text>
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

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text }]}>{t.settings.justifyText}</Text>
          <Switch
            accessibilityLabel={t.settings.justifyText}
            value={preference.textAlign === "justify"}
            onValueChange={(value) => void savePreference({ ...preference, textAlign: value ? "justify" : "left" })}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t.settings.colors}</Text>
        <View style={styles.optionGrid}>
          {colorPresets.map((preset) => {
            const selected = preference.backgroundColor === preset.backgroundColor && preference.textColor === preset.textColor;
            return (
              <Pressable
                key={preset.key}
                style={[styles.colorOption, selected && styles.selectedOption, { backgroundColor: preset.backgroundColor }]}
                onPress={() =>
                  void savePreference({
                    ...preference,
                    backgroundColor: preset.backgroundColor,
                    textColor: preset.textColor,
                    themeMode: preset.key === "night" ? "dark" : "light"
                  })
                }
              >
                <Text style={[styles.colorLabel, { color: preset.textColor }]}>{t.settings.presets[preset.key]}</Text>
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
  stepperSymbol: {
    fontSize: 24,
    fontWeight: "600"
  },
  fontSizeInput: {
    width: 72,
    height: 44,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: 0,
    textAlign: "center",
    fontSize: 20
  },
  disabledButton: {
    opacity: 0.4
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
