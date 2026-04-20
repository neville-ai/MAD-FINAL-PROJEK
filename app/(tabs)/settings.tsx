import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import useTheme from "@/hooks/useTheme";

export default function SettingsScreen() {
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Pengaturan dasar untuk tema aplikasi dan fondasi pengembangan fitur
          Zero Drop berikutnya.
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Theme mode</Text>
          <Text style={styles.value}>{isDarkMode ? "Dark" : "Light"}</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={toggleDarkMode}>
          <Text style={styles.buttonText}>Switch theme</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      padding: 24,
      justifyContent: "center",
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 24,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 28,
      fontWeight: "700",
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 15,
      lineHeight: 22,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 14,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    label: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "600",
    },
    value: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: "700",
    },
    button: {
      alignSelf: "flex-start",
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 999,
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
  });
