import { useFonts } from "expo-font";
import { NotoSansSC_400Regular } from "@expo-google-fonts/noto-sans-sc/400Regular";

export const fontOptions = [
  { label: "系统默认", value: "System" },
  { label: "Noto Sans SC", value: "Noto Sans SC" },
  { label: "PingFang SC", value: "PingFang SC" }
];

export function useAppFonts() {
  const [loaded] = useFonts({
    "Noto Sans SC": NotoSansSC_400Regular
  });

  return loaded;
}
