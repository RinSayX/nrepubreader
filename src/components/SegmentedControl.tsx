import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "@/theme/tokens";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.root}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            accessibilityRole="button"
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.item, active && styles.active]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    backgroundColor: colors.paperAlt,
    borderRadius: radii.md,
    padding: 3
  },
  item: {
    flex: 1,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6
  },
  active: {
    backgroundColor: "#ffffff"
  },
  label: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: "600"
  },
  activeLabel: {
    color: colors.ink
  }
});
