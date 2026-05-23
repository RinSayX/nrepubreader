import { useFonts } from "expo-font";
import { NotoSansSC_400Regular } from "@expo-google-fonts/noto-sans-sc";
import { NotoSerifSC_400Regular } from "@expo-google-fonts/noto-serif-sc";

export const fontOptions = [
  { label: "系统默认", value: "System" },
  { label: "Noto Sans SC", value: "Noto Sans SC" },
  { label: "Noto Serif SC", value: "Noto Serif SC" },
  { label: "PingFang SC", value: "PingFang SC" },
  { label: "Source Han Serif", value: "Source Han Serif SC" }
];

export function useAppFonts() {
  const [loaded] = useFonts({
    "Noto Sans SC": NotoSansSC_400Regular,
    "Noto Serif SC": NotoSerifSC_400Regular
  });

  return loaded;
}
