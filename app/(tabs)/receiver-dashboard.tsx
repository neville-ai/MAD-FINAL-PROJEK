import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import useTheme from "@/hooks/useTheme";

export default function ReceiverDashboard() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [population, setPopulation] = useState("50");
  const [neededQuantity, setNeededQuantity] = useState("100");
  const [urgency, setUrgency] = useState<"normal" | "urgent">("normal");

  const handleUpdate = () => {
    // Di sini logika mutation convex untuk update data panti
    Alert.alert("Sukses", "Data kebutuhan makanan & penghuni telah diupdate!");
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard Panti</Text>
          <Text style={styles.subtitle}>
            Kelola kebutuhan harian dan status bantuan Anda.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Status Bantuan Terkini</Text>
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>Belum ada donasi masuk hari ini.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Update Kebutuhan Panti</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Jumlah Penghuni (Anak + Pengurus)</Text>
            <TextInput
              style={styles.input}
              value={population}
              onChangeText={setPopulation}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Kebutuhan Makanan Harian (Porsi)</Text>
            <TextInput
              style={styles.input}
              value={neededQuantity}
              onChangeText={setNeededQuantity}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tingkat Urgensi</Text>
            <View style={styles.row}>
              <Pressable
                style={[
                  styles.radio,
                  urgency === "normal" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setUrgency("normal")}
              >
                <Text
                  style={[
                    styles.radioText,
                    urgency === "normal" && { color: "#fff" },
                  ]}
                >
                  Normal
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.radio,
                  { borderColor: colors.danger },
                  urgency === "urgent" && { backgroundColor: colors.danger },
                ]}
                onPress={() => setUrgency("urgent")}
              >
                <Text
                  style={[
                    styles.radioText,
                    urgency === "urgent" && { color: "#fff" },
                  ]}
                >
                  Urgent
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.button} onPress={handleUpdate}>
            <Text style={styles.buttonText}>Kirim Permintaan Bantuan</Text>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: 16,
      paddingTop: 48,
      gap: 16,
      paddingBottom: 24,
    },
    header: {
      marginBottom: 8,
    },
    title: {
      fontSize: 28,
      fontWeight: "800",
      color: colors.text,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textMuted,
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      marginBottom: 16,
    },
    statusBox: {
      backgroundColor: colors.bg,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusText: {
      color: colors.textMuted,
      fontSize: 14,
      fontStyle: "italic",
    },
    formGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      padding: 12,
      borderRadius: 10,
      fontSize: 16,
      color: colors.text,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
    radio: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      borderRadius: 10,
      alignItems: "center",
    },
    radioText: {
      fontWeight: "600",
      color: colors.text,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 16,
      borderRadius: 12,
      alignItems: "center",
      marginTop: 8,
    },
    buttonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
  });
