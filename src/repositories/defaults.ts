import type { ReaderPreference } from "@/types";

export const DEFAULT_READER_PREFERENCE: ReaderPreference = {
  themeMode: "light",
  fontFamily: "System",
  fontSize: 18,
  lineHeight: 1.65,
  backgroundColor: "#fbf7ef",
  textColor: "#202124"
};

export const READER_PREFERENCE_ID = "default";

export function nowIso() {
  return new Date().toISOString();
}
