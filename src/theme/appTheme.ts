import type { ReaderPreference } from "@/types";

import { colors } from "@/theme/tokens";

export function getAppTheme(preference: ReaderPreference) {
  const isDark = preference.themeMode === "dark";

  return {
    isDark,
    background: isDark ? colors.darkPaper : colors.paper,
    panel: isDark ? colors.darkPanel : "#ffffff",
    panelAlt: isDark ? "#2b2b2b" : colors.paperAlt,
    text: isDark ? colors.darkInk : colors.ink,
    muted: isDark ? "#b8b1a6" : colors.muted,
    border: isDark ? "#3a3a3a" : colors.border,
    accent: colors.accent,
    accentSoft: isDark ? "#243d3b" : colors.accentSoft
  };
}
