import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors, radii, spacing } from "@/theme/tokens";

export function PrimaryButton({
  children,
  onPress,
  variant = "primary",
  disabled = false
}: {
  children: ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <Text style={[styles.label, variant !== "primary" && styles.secondaryLabel]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center"
  },
  primary: {
    backgroundColor: colors.accent
  },
  secondary: {
    backgroundColor: colors.accentSoft
  },
  danger: {
    backgroundColor: "#f2dada"
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    opacity: 0.8
  },
  label: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryLabel: {
    color: colors.ink
  }
});
