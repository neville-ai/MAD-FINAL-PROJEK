import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import useTheme from "@/hooks/useTheme";

export default function DonationScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Tambah Donasi</Text>
        <Text style={styles.description}>
          Halaman ini disiapkan sebagai tujuan navigasi dari Home. Kamu bisa
          lanjutkan dengan form donasi makanan.
        </Text>
        <Pressable style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Kembali</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      justifyContent: "center",
      backgroundColor: colors.bg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
    },
    description: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    button: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: "center",
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
  });
