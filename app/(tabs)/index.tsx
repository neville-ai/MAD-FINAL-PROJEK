import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAction, useQuery } from "convex/react";
import { router } from "expo-router";

import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";

type RequestItem = {
  _id: string;
  receiverName: string;
  population: number;
  neededQuantity: number;
  urgency: "normal" | "urgent";
};

function getUrgencyLabel(urgency: RequestItem["urgency"]) {
  return urgency === "urgent" ? "Urgent" : "Normal";
}

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const requestsQuery = useQuery(api.requests.getAllRequests) as
    | RequestItem[]
    | undefined;
  const requests = requestsQuery ?? [];
  const predictDonationNeed = useAction(
    (api as any).aiNeeds.predictDonationNeed as any,
  );
  const [foodType, setFoodType] = useState("tempe");
  const [days, setDays] = useState("1");
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<{
    estimatedKg: number;
    confidence: "low" | "medium" | "high";
    assumptions: string;
    reasoning: string;
    model?: string;
  } | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const aiInsight = useMemo(() => {
    const totalLocations = requests.length;
    const urgentLocations = requests.filter(
      (request) => request.urgency === "urgent",
    ).length;

    return {
      totalLocations,
      urgentLocations,
    };
  }, [requests]);

  const topRecommendation = useMemo(() => {
    if (requests.length === 0) {
      return null;
    }

    return requests.reduce((highest, current) =>
      current.neededQuantity > highest.neededQuantity ? current : highest,
    );
  }, [requests]);
  const targetLocation = topRecommendation ?? requests[0] ?? null;

  async function handlePredictNeed() {
    if (!targetLocation) {
      setPredictionError("Belum ada data panti untuk dihitung.");
      return;
    }

    const parsedDays = Number(days);
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      setPredictionError("Jumlah hari harus berupa angka lebih dari 0.");
      return;
    }

    try {
      setPredictionError(null);
      setIsPredicting(true);
      const result = await predictDonationNeed({
        receiverName: targetLocation.receiverName,
        population: targetLocation.population,
        foodType: foodType.trim() || "tempe",
        mealsPerDay: 2,
        days: parsedDays,
        isUrgent: targetLocation.urgency === "urgent",
      });
      setPrediction(result);
    } catch {
      setPredictionError("Prediksi gagal. Coba lagi beberapa saat.");
    } finally {
      setIsPredicting(false);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>ZERO DROP</Text>
          <Text style={styles.title}>Home Dashboard</Text>
          <Text style={styles.description}>
            Ringkasan kebutuhan pangan lokasi penerima dan rekomendasi prioritas
            berdasarkan data Convex.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AI Insight</Text>
          <View style={styles.insightRow}>
            <View style={styles.insightChip}>
              <Text style={styles.insightValue}>{aiInsight.totalLocations}</Text>
              <Text style={styles.insightLabel}>Total Lokasi</Text>
            </View>
            <View style={styles.insightChip}>
              <Text style={[styles.insightValue, { color: colors.danger }]}>
                {aiInsight.urgentLocations}
              </Text>
              <Text style={styles.insightLabel}>Lokasi Urgent</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Rekomendasi AI</Text>
          {topRecommendation ? (
            <View style={styles.recommendationBody}>
              <Text style={styles.placeName}>{topRecommendation.receiverName}</Text>
              <Text style={styles.recommendationText}>
                Jumlah penghuni: {topRecommendation.population} orang
              </Text>
              <Text style={styles.recommendationText}>
                Kebutuhan harian: {topRecommendation.population * 2} porsi
              </Text>
              <Text style={styles.recommendationText}>
                Status: {getUrgencyLabel(topRecommendation.urgency)}
              </Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              Belum ada data lokasi. Tambahkan request terlebih dahulu.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Semua Lokasi</Text>
          {requests.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada data lokasi saat ini.</Text>
          ) : (
            requests.map((location) => (
              <View key={location._id} style={styles.listItem}>
                <Text style={styles.listTitle}>{location.receiverName}</Text>
                <Text style={styles.listSubtitle}>
                  {location.population} penghuni
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Navigasi</Text>
          <Pressable style={styles.button} onPress={() => router.push("/map")}>
            <Text style={styles.buttonText}>Buka Halaman Map</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => router.push("/donation")}
          >
            <Text style={styles.buttonText}>Buka Halaman Tambah Donasi</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AI Prediksi Kebutuhan Donasi</Text>
          {targetLocation ? (
            <Text style={styles.description}>
              Target: {targetLocation.receiverName} ({targetLocation.population}{" "}
              anak)
            </Text>
          ) : (
            <Text style={styles.emptyText}>Belum ada target panti.</Text>
          )}

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Jenis makanan</Text>
            <TextInput
              value={foodType}
              onChangeText={setFoodType}
              placeholder="Contoh: tempe"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Durasi (hari)</Text>
            <TextInput
              value={days}
              onChangeText={setDays}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <Pressable
            style={[styles.button, isPredicting && styles.buttonDisabled]}
            onPress={handlePredictNeed}
            disabled={isPredicting}
          >
            {isPredicting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Hitung Prediksi AI</Text>
            )}
          </Pressable>

          {predictionError ? (
            <Text style={styles.errorText}>{predictionError}</Text>
          ) : null}

          {prediction ? (
            <View style={styles.predictionCard}>
              <Text style={styles.predictionTitle}>
                Estimasi donasi {foodType}: {prediction.estimatedKg} kg
              </Text>
              <Text style={styles.predictionMeta}>
                Confidence: {prediction.confidence.toUpperCase()}
                {prediction.model ? ` • Model: ${prediction.model}` : ""}
              </Text>
              <Text style={styles.predictionText}>
                Asumsi: {prediction.assumptions}
              </Text>
              <Text style={styles.predictionText}>
                Penjelasan: {prediction.reasoning}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      padding: 16,
      gap: 12,
      paddingBottom: 24,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: 16,
      gap: 10,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
    },
    title: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "700",
    },
    description: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: "700",
      marginBottom: 4,
    },
    insightRow: {
      flexDirection: "row",
      gap: 10,
    },
    insightChip: {
      flex: 1,
      backgroundColor: colors.bg,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    insightValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
    },
    insightLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    recommendationBody: {
      gap: 6,
    },
    placeName: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    recommendationText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    listItem: {
      backgroundColor: colors.bg,
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 3,
    },
    listTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: "700",
    },
    listSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
    buttonDisabled: {
      opacity: 0.8,
    },
    formRow: {
      gap: 6,
    },
    formLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "600",
    },
    input: {
      backgroundColor: colors.bg,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      fontSize: 14,
    },
    errorText: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "600",
    },
    predictionCard: {
      backgroundColor: colors.bg,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      gap: 6,
    },
    predictionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
    },
    predictionMeta: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    predictionText: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
  });
