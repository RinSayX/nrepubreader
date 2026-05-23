import type { ReaderPreference, ReaderToWebMessage, WebToReaderMessage } from "@/types";

export function encodeReaderMessage(message: ReaderToWebMessage) {
  return JSON.stringify(message).replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$/g, "\\$");
}

export function parseWebReaderMessage(raw: string): WebToReaderMessage | null {
  try {
    const message = JSON.parse(raw);
    if (!message || typeof message.type !== "string") {
      return null;
    }
    return message as WebToReaderMessage;
  } catch {
    return null;
  }
}

export function preferenceToReaderPayload(preference: ReaderPreference) {
  return {
    theme: {
      themeMode: preference.themeMode,
      backgroundColor: preference.backgroundColor,
      textColor: preference.textColor
    },
    font: {
      fontFamily: preference.fontFamily,
      fontSize: preference.fontSize,
      lineHeight: preference.lineHeight
    }
  };
}
