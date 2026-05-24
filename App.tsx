import "react-native-gesture-handler";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BookDetailScreen } from "@/screens/BookDetailScreen";
import { LibraryScreen } from "@/screens/LibraryScreen";
import { ReaderScreen } from "@/screens/ReaderScreen";
import { SeriesScreen } from "@/screens/SeriesScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";
import { getAppTheme } from "@/theme/appTheme";
import { useAppFonts } from "@/theme/fonts";
import { colors } from "@/theme/tokens";
import { useLibraryStore } from "@/store/libraryStore";
import type { RootStackParamList } from "@/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const fontsLoaded = useAppFonts();
  const initialize = useLibraryStore((state) => state.initialize);
  const ready = useLibraryStore((state) => state.ready);
  const error = useLibraryStore((state) => state.error);
  const preference = useLibraryStore((state) => state.preference);
  const theme = getAppTheme(preference);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  if (!fontsLoaded || !ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.background }}>
        {error ? (
          <Text style={{ color: theme.text, padding: 16, textAlign: "center" }}>{error}</Text>
        ) : (
          <ActivityIndicator color={colors.accent} />
        )}
      </View>
    );
  }

  const isDark = preference.themeMode === "dark";

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            contentStyle: { backgroundColor: theme.background }
          }}
        >
          <Stack.Screen name="Library" component={LibraryScreen} options={{ title: "书库" }} />
          <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: "书籍详情" }} />
          <Stack.Screen name="Series" component={SeriesScreen} options={({ route }) => ({ title: route.params.seriesName ?? "系列详情" })} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "阅读设置" }} />
          <Stack.Screen name="Reader" component={ReaderScreen} options={{ title: "", headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
