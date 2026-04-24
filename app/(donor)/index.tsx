import { Ionicons } from "@expo/vector-icons";
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
import { useAction, useQuery, useMutation } from "convex/react";
import { router } from "expo-router";

import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";

type RequestItem = {
  _id: string;
  receiverName: string;
  population: number;
  neededQuantity: number;
  latitude?: number;
  longitude?: number;
};

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

  const addDonation = useMutation((api as any).donations?.addDonation as any) || (async () => {});
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
  const [donationHours, setDonationHours] = useState("2");
  const [donationAmount, setDonationAmount] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [donationSuccess, setDonationSuccess] = useState(false);
  const [selectedPantiId, setSelectedPantiId] = useState<string | null>(null);

  const aiInsight = useMemo(() => {
    return {
      totalLocations: requests.length,
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

  const targetLocation = useMemo(() => {
    if (!selectedPantiId) return null;
    return requests.find(r => r._id === selectedPantiId) || null;
  }, [selectedPantiId, requests]);

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
      });
      setPrediction(result);
      setDonationAmount(result.estimatedKg.toString());
    } catch {
      setPredictionError("Prediksi gagal. Coba lagi beberapa saat.");
    } finally {
      setIsPredicting(false);
    }
  }

  async function handleConfirmDonation() {
    if (!targetLocation) return;
    try {
      setIsConfirming(true);
      const donorId = await AsyncStorage.getItem("userId");
      
      const doAddDonation = api.donations?.addDonation;
      if (doAddDonation) {
        await addDonation({
           donorId: donorId as any,
           requestId: targetLocation._id as any,
           foodType: foodType.trim() || "makanan",
           quantity: Number(donationAmount) || (prediction ? prediction.estimatedKg : 10),
           unit: "kg",
           notes: `Akan dikirim dalam ${donationHours} jam.`,
        });
      }
      setTimeout(() => {
        setDonationSuccess(true);
        setIsConfirming(false);
      }, 1000);
    } catch (e) {
      console.error(e);
      setIsConfirming(false);
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
          <Text style={styles.sectionTitle}>Insight Lokasi Panti</Text>
          <View style={styles.insightRow}>
            <View style={styles.insightChip}>
              <Text style={styles.insightValue}>{aiInsight.totalLocations}</Text>
              <Text style={styles.insightLabel}>Total Panti Terdaftar</Text>
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
              <Pressable 
                key={location._id} 
                style={[
                  styles.listItem, 
                  selectedPantiId === location._id && { borderColor: colors.primary, backgroundColor: colors.primary + '05', borderWidth: 2 }
                ]}
                onPress={() => {
                  if (selectedPantiId === location._id) {
                    setSelectedPantiId(null);
                  } else {
                    setSelectedPantiId(location._id);
                  }
                  setPrediction(null); // Reset prediction when changing or deselecting target
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={styles.listTitle}>{location.receiverName}</Text>
                    <Text style={styles.listSubtitle}>
                      {location.population} penghuni
                    </Text>
                  </View>
                  {selectedPantiId === location._id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </View>
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Navigasi</Text>
          
          <Pressable style={[styles.button, { backgroundColor: colors.bg, borderColor: colors.primary, borderWidth: 1 }]} onPress={() => router.push("/notifications" as any)}>
            <Text style={[styles.buttonText, { color: colors.primary }]}>🔔 Buka Notifikasi</Text>
          </Pressable>

          <Pressable style={[styles.button, { marginTop: 10 }]} onPress={() => router.push("/map")}>
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
            <View style={{ marginBottom: 12, padding: 12, backgroundColor: colors.primary + '10', borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '20' }}>
              <Text style={[styles.description, { color: colors.primary, fontWeight: '700' }]}>
                🎯 Target: {targetLocation.receiverName}
              </Text>
              <Text style={[styles.description, { fontSize: 12 }]}>
                ({targetLocation.population} anak • Kebutuhan dasar: {targetLocation.population * 2} porsi/hari)
              </Text>
            </View>
          ) : (
            <View style={{ padding: 16, alignItems: 'center', backgroundColor: colors.bg, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name="hand-right-outline" size={32} color={colors.textMuted} />
              <Text style={[styles.emptyText, { textAlign: 'center', marginTop: 8 }]}>
                Silakan pilih salah satu panti dari daftar "Semua Lokasi" di atas untuk memulai prediksi AI.
              </Text>
            </View>
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
              <Text style={styles.predictionText}>
                Asumsi: {prediction.assumptions}
              </Text>
              
              <View style={{ marginTop: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 12 }}>
                <Text style={styles.sectionTitle}>Konfirmasi Pengiriman</Text>
                <Text style={styles.description}>Beri tahu panti bahwa Anda akan mengirimkan donasi ini.</Text>
                
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Jumlah donasi (kg)</Text>
                  <TextInput
                    value={donationAmount}
                    onChangeText={setDonationAmount}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                  {prediction && Number(donationAmount) < (prediction.estimatedKg * 0.8) && (
                    <Text style={{ color: colors.warning, fontSize: 13, fontWeight: '600' }}>
                      Peringatan: Jumlah tidak cukup untuk {targetLocation?.population} anak
                    </Text>
                  )}
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Estimasi tiba (jam)</Text>
                  <TextInput
                    value={donationHours}
                    onChangeText={setDonationHours}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
                
                <Pressable
                  style={[styles.button, { marginTop: 10, backgroundColor: colors.primary }, isConfirming && styles.buttonDisabled]}
                  onPress={handleConfirmDonation}
                  disabled={isConfirming || donationSuccess}
                >
                  <Text style={styles.buttonText}>
                    {donationSuccess ? "Terkonfirmasi ✓" : isConfirming ? "Memproses..." : "Kirim Konfirmasi ke Panti"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <Pressable
            style={[styles.button, { backgroundColor: colors.danger }]}
            onPress={async () => {
              await AsyncStorage.clear();
              router.replace("/onboarding");
            }}
          >
            <Text style={styles.buttonText}>Keluar (Logout)</Text>
          </Pressable>
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
