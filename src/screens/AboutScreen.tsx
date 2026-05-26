import Constants from "expo-constants";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getAppTheme } from "@/theme/appTheme";
import { colors, spacing } from "@/theme/tokens";
import { useLibraryStore } from "@/store/libraryStore";

const REPOSITORY_URL = "https://github.com/RinSayX/nrepubreader";
const LICENSE_URL = `${REPOSITORY_URL}/blob/main/LICENSE`;
const THIRD_PARTY_NOTICES_URL = `${REPOSITORY_URL}/blob/main/THIRD_PARTY_NOTICES.md`;

export function AboutScreen() {
  const preference = useLibraryStore((state) => state.preference);
  const theme = getAppTheme(preference);
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "未知";
  const buildVersion = Constants.nativeBuildVersion ?? null;

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.panel, { backgroundColor: theme.panel, borderColor: theme.border }]}>
          <Text style={[styles.appName, { color: theme.text }]}>ReadEPUB</Text>
          <Text style={[styles.description, { color: theme.muted }]}>仅本地离线使用的 EPUB/TXT 阅读器</Text>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <InfoRow label="版本" value={`v${appVersion}`} theme={theme} />
          {buildVersion ? <InfoRow label="构建号" value={buildVersion} theme={theme} /> : null}
          <InfoRow label="许可证" value="MIT License" theme={theme} />
          <LinkRow label="开源项目地址" value={REPOSITORY_URL} theme={theme} onPress={() => void openUrl(REPOSITORY_URL)} />
          <LinkRow label="许可证文件" value="LICENSE" theme={theme} onPress={() => void openUrl(LICENSE_URL)} />
          <LinkRow
            label="第三方组件声明"
            value="THIRD_PARTY_NOTICES.md"
            theme={theme}
            onPress={() => void openUrl(THIRD_PARTY_NOTICES_URL)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof getAppTheme> }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.text }]} selectable>
        {value}
      </Text>
    </View>
  );
}

function LinkRow({
  label,
  value,
  theme,
  onPress
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof getAppTheme>;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]} onPress={onPress}>
      <View style={styles.linkCopy}>
        <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
        <Text style={[styles.linkValue, { color: theme.accent }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
    </Pressable>
  );
}

async function openUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("无法打开链接", url);
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper
  },
  content: {
    padding: spacing.lg
  },
  panel: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "#ffffff",
    padding: spacing.lg,
    overflow: "hidden"
  },
  appName: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900"
  },
  description: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
    backgroundColor: colors.border
  },
  row: {
    minHeight: 56,
    justifyContent: "center",
    paddingVertical: spacing.md,
    gap: spacing.xs
  },
  linkRow: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.md
  },
  linkCopy: {
    flex: 1,
    gap: spacing.xs
  },
  label: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "700"
  },
  value: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800"
  },
  linkValue: {
    color: colors.accent,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "800"
  },
  chevron: {
    color: colors.muted,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "400"
  },
  pressed: {
    opacity: 0.72
  }
});
