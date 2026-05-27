import "react-native-gesture-handler";

import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getTranslations } from "@/i18n";
import type { RootStackParamList } from "@/app/navigation/types";
import { BookDetailScreen } from "@/features/library/screens/BookDetailScreen";
import { LibraryScreen } from "@/features/library/screens/LibraryScreen";
import { useLibraryStore } from "@/features/library/store/libraryStore";
import { ReaderScreen } from "@/features/reader/screens/ReaderScreen";
import { SeriesScreen } from "@/features/series/screens/SeriesScreen";
import { AboutScreen } from "@/features/settings/screens/AboutScreen";
import { SettingsScreen } from "@/features/settings/screens/SettingsScreen";
import { getAppTheme } from "@/theme/appTheme";
import { useAppFonts } from "@/theme/fonts";
import { colors } from "@/theme/tokens";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const fontsLoaded = useAppFonts();
  const initialize = useLibraryStore((state) => state.initialize);
  const ready = useLibraryStore((state) => state.ready);
  const error = useLibraryStore((state) => state.error);
  const preference = useLibraryStore((state) => state.preference);
  const theme = getAppTheme(preference);
  const t = getTranslations(preference.language);

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
          <Stack.Screen name="Library" component={LibraryScreen} options={{ title: t.nav.library }} />
          <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: t.nav.bookDetail }} />
          <Stack.Screen name="Series" component={SeriesScreen} options={({ route }) => ({ title: route.params.seriesName ?? t.nav.seriesDetail })} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t.nav.settings }} />
          <Stack.Screen name="About" component={AboutScreen} options={{ title: t.nav.about }} />
          <Stack.Screen name="Reader" component={ReaderScreen} options={{ title: "", headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
