import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { useAction, useQuery, useMutation } from "convex/react";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";

export default function DonationScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const requests = useQuery((api as any).requests.getAllRequests) || [];
  const predictDonationNeed = useAction((api as any).aiNeeds.predictDonationNeed as any);
  const addDonation = useMutation((api as any).donations?.addDonation as any) || (async () => {});

  const [selectedPantiId, setSelectedPantiId] = useState<string | null>(null);
  const [foodType, setFoodType] = useState("tempe");
  const [days, setDays] = useState("1");
  const [donationAmount, setDonationAmount] = useState("");
  const [donationHours, setDonationHours] = useState("2");
  
  const [isPredicting, setIsPredicting] = useState(false);
  const [prediction, setPrediction] = useState<{
    estimatedKg: number;
    confidence: string;
    assumptions: string;
    reasoning: string;
  } | null>(null);
  const [predictionError, setPredictionError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const targetLocation = requests.find((r: any) => r._id === selectedPantiId) || null;

  useEffect(() => {
    if (requests.length > 0 && !selectedPantiId) {
      setSelectedPantiId((requests[0] as any)._id);
    }
  }, [requests]);

  async function handlePredictNeed() {
    if (!targetLocation) {
      setPredictionError("Pilih panti tujuan terlebih dahulu.");
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
        receiverName: targetLocation.receiverName as string,
        population: targetLocation.population as number,
        foodType: foodType.trim() || "tempe",
        mealsPerDay: 2,
        days: parsedDays,
      });
      setPrediction(result);
      if (!donationAmount) {
        setDonationAmount(result.estimatedKg.toString());
      }
    } catch {
      setPredictionError("Prediksi gagal. Coba lagi.");
    } finally {
      setIsPredicting(false);
    }
  }

  async function handleConfirmDonation() {
    if (!targetLocation) return;
    if (!donationAmount || Number(donationAmount) <= 0) {
      Alert.alert("Error", "Masukkan jumlah donasi yang valid.");
      return;
    }

    try {
      setIsSubmitting(true);
      const donorId = await AsyncStorage.getItem("userId");
      
      await addDonation({
         donorId: donorId as any,
         requestId: targetLocation._id as any,
         foodType: foodType.trim() || "makanan",
         quantity: Number(donationAmount),
         unit: "kg",
         notes: `Akan dikirim dalam ${donationHours} jam.`,
      });
      
      Alert.alert(
        "Donasi Berhasil!", 
        "Terima kasih atas donasi Anda. Anda dapat melihat statusnya di riwayat donasi.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Gagal mengirim donasi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Tambah Donasi</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pilih Panti Tujuan</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pantiList}>
            {requests.map((req: any) => (
              <Pressable
                key={req._id}
                style={[
                  styles.pantiChip,
                  selectedPantiId === req._id && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setSelectedPantiId(req._id)}
              >
                <Text style={[
                  styles.pantiName,
                  selectedPantiId === req._id && { color: "#FFF" }
                ]}>{req.receiverName}</Text>
                <Text style={[
                  styles.pantiPop,
                  selectedPantiId === req._id && { color: "rgba(255,255,255,0.8)" }
                ]}>{req.population} anak</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Detail Donasi</Text>
          
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Jenis makanan</Text>
            <TextInput
              value={foodType}
              onChangeText={setFoodType}
              placeholder="Contoh: tempe, beras, ayam"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <View style={styles.predictionBox}>
            <Text style={styles.formLabel}>Bantuan durasi hari (Untuk AI Hitung Kebutuhan)</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                value={days}
                onChangeText={setDays}
                keyboardType="number-pad"
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable
                style={[styles.predictBtn, isPredicting && { opacity: 0.7 }]}
                onPress={handlePredictNeed}
                disabled={isPredicting}
              >
                {isPredicting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.predictText}>Hitung Prediksi</Text>
                )}
              </Pressable>
            </View>
            
            {predictionError && <Text style={{ color: colors.danger, marginTop: 4, fontSize: 13 }}>{predictionError}</Text>}
            
            {prediction && (
              <View style={styles.predictionResult}>
                <Text style={styles.predictionValue}>Rekomendasi AI: {prediction.estimatedKg} kg</Text>
                <Text style={styles.predictionMeta}>Asumsi: {prediction.assumptions}</Text>
              </View>
            )}
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Jumlah (dalam Kg)</Text>
            <TextInput
              value={donationAmount}
              onChangeText={setDonationAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input, 
                { fontSize: 18, fontWeight: 'bold' },
                prediction && Number(donationAmount) < (prediction.estimatedKg * 0.8) && { borderColor: colors.danger, borderWidth: 1.5 }
              ]}
            />
            {prediction && Number(donationAmount) < (prediction.estimatedKg * 0.8) && (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={16} color={colors.danger} />
                <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600', flex: 1 }}>
                  Tidak cukup untuk {targetLocation?.population} anak (disarankan {prediction.estimatedKg} kg).
                </Text>
              </View>
            )}
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Estimasi waktu pengiriman (jam dari sekarang)</Text>
            <TextInput
              value={donationHours}
              onChangeText={setDonationHours}
              keyboardType="number-pad"
              style={styles.input}
            />
          </View>

        </View>

        <Pressable
          style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
          onPress={handleConfirmDonation}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>Kirim Donasi</Text>
          )}
        </Pressable>

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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    backBtn: {
      padding: 4,
    },
    content: {
      padding: 16,
      gap: 16,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 4,
    },
    pantiList: {
      gap: 8,
      paddingVertical: 4,
    },
    pantiChip: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 8,
      minWidth: 160,
    },
    pantiName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 2,
    },
    pantiPop: {
      fontSize: 12,
      color: colors.textMuted,
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
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 16,
    },
    predictionBox: {
      backgroundColor: colors.bg,
      padding: 12,
      borderRadius: 12,
      gap: 8,
      marginVertical: 4,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    predictBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    predictText: {
      color: "#FFF",
      fontWeight: '600',
      fontSize: 13,
    },
    predictionResult: {
      marginTop: 8,
    },
    predictionValue: {
      color: colors.primary,
      fontWeight: 'bold',
      fontSize: 15,
      marginBottom: 2,
    },
    predictionMeta: {
      color: colors.textMuted,
      fontSize: 12,
      fontStyle: 'italic',
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
      backgroundColor: colors.danger + '15',
      padding: 10,
      borderRadius: 8,
    },
    submitButton: {
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: "center",
      marginTop: 10,
      elevation: 2,
    },
    submitButtonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "700",
    },
  });
