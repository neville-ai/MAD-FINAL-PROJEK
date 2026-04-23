import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ReceiverDashboard() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [population, setPopulation] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "butuh" | "urgent">("normal");
  const [isUpdating, setIsUpdating] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const addRequest = useMutation((api as any).requests.addRequest);
  const updateRequest = useMutation((api as any).requests.updateRequest);
  // If we have a requestId for this panti, fetch donations specifically for it
  const donationsForRequest = useQuery(
    (api as any).donations.getDonationsByRequest,
    requestId ? { requestId } : "skip",
  ) as any[] | undefined;

  const incomingDonations = donationsForRequest ?? [];
  const inTransit = incomingDonations.filter((d: any) => d.status === "available");
  const completed = incomingDonations.filter((d: any) => d.status === "completed");

  const updateStatus = useMutation((api as any).donations?.updateDonationStatus as any) || (async () => {});

  const handleAcceptDonation = async (donationId: string) => {
    try {
      await updateStatus({ donationId, status: "completed" });
      Alert.alert("Sukses", "Donasi telah ditandai sebagai Diterima!");
    } catch (e) {
      Alert.alert("Error", "Gagal memperbarui status donasi.");
    }
  };

  // Simple notification simulation: when there's a new 'available' donation, alert the user
  React.useEffect(() => {
    const anyNew = incomingDonations.some((d: any) => d.status === "available");
    if (anyNew) {
      // show a brief alert - in a real app this could be push notifications or in-app banner
      Alert.alert("Info", "Ada donasi yang sedang dikirim ke panti Anda.");
    }
  }, [incomingDonations.length]);

  // Load current userId and fetch existing request if present
  useEffect(() => {
    let mounted = true;
    (async () => {
      const id = await AsyncStorage.getItem("userId");
      if (!mounted) return;
      if (id) {
        setUserId(id);
        try {
          const req = await (api as any).requests.getRequestByCreator(id);
          if (req) {
            setRequestId(req._id);
            setName(req.receiverName || "");
            setAddress(req.address || "");
            setPopulation(String(req.population || ""));
            setUrgency(req.urgency || "normal");
          }
        } catch (e) {
          // ignore
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      let result: any = null;
      if (requestId) {
        result = await updateRequest({
          requestId,
          receiverName: name,
          population: Number(population) || 0,
          neededQuantity: Number(population) * 2,
          address,
          urgency,
        });
      } else {
        result = await addRequest({
          receiverName: name,
          population: Number(population) || 0,
          neededQuantity: Number(population) * 2, // Asumsi 2 porsi
          lat: -6.2, // mock lat
          lng: 106.8, // mock lng
          address: address,
          urgency,
          createdBy: userId || undefined,
        });

        // If result contains _id (inserted document), store for later donation queries
        if (result && result._id) {
          setRequestId(result._id);
        }
      }
      Alert.alert("Sukses", "Profil Panti Asuhan telah diperbarui!");
    } catch (error) {
      Alert.alert("Gagal", "Terjadi kesalahan saat menyimpan profil.");
    } finally {
      setIsUpdating(false);
    }
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

        {/* Dashboard summary: shows current local profile and urgency */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profil Singkat Panti</Text>
          <Text style={{ fontWeight: '700', color: colors.text }}>{name}</Text>
          <Text style={{ color: colors.textMuted }}>{address}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>Jumlah anak: {population}</Text>
          <Text style={{ color: colors.textMuted }}>Kebutuhan (perkiraan): {Number(population || '0') * 2} porsi</Text>
          <Text style={{ marginTop: 8, fontWeight: '700', color: urgency === 'urgent' ? colors.danger : urgency === 'butuh' ? colors.warning : colors.success }}>
            {urgency === 'urgent' ? '🔴 Urgent' : urgency === 'butuh' ? '🟡 Butuh Bantuan' : '🟢 Normal'}
          </Text>
        </View>

        <View style={styles.card}>
          <Pressable style={[styles.button, { backgroundColor: colors.bg, borderColor: colors.primary, borderWidth: 1, marginTop: 0 }]} onPress={() => router.push("/notifications" as any)}>
            <Text style={[styles.buttonText, { color: colors.primary }]}>🔔 Buka Notifikasi</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Donasi Dalam Pengantaran</Text>
          {inTransit.length === 0 ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusText}>Belum ada donasi yang sedang diantar.</Text>
            </View>
          ) : (
            inTransit.map((donation: any) => (
              <View key={donation._id} style={[styles.statusBox, { marginBottom: 10, borderColor: colors.primary }]}>
                <Text style={{ fontWeight: 'bold', color: colors.text }}>Donatur: {donation.donorName}</Text>
                <Text style={{ color: colors.textMuted }}>Membawa: {donation.quantity} {donation.unit} {donation.foodType}</Text>
                {donation.notes && (
                  <Text style={{ color: colors.primary, marginTop: 4, fontStyle: 'italic' }}>"{donation.notes}"</Text>
                )}
                <Pressable 
                  style={[styles.button, { marginTop: 12, paddingVertical: 10 }]} 
                  onPress={() => handleAcceptDonation(donation._id)}
                >
                  <Text style={styles.buttonText}>Terima Donasi (Selesai)</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Riwayat Donasi (Diterima)</Text>
          {completed.length === 0 ? (
            <Text style={styles.statusText}>Belum ada riwayat penerimaan donasi.</Text>
          ) : (
            completed.map((donation: any) => (
              <View key={donation._id} style={[styles.statusBox, { marginBottom: 10, backgroundColor: colors.bg }]}>
                <Text style={{ fontWeight: 'bold', color: colors.text }}>{donation.donorName}</Text>
                <Text style={{ color: colors.textMuted }}>{donation.foodType} — {donation.quantity} {donation.unit}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{new Date(donation.createdAt).toLocaleString()}</Text>
                <Text style={{ color: colors.success, marginTop: 4, fontSize: 12, fontWeight: "600" }}>{donation.status === 'completed' ? '✓ Diterima' : donation.status}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Update Kebutuhan Panti</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nama Panti Asuhan</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Alamat Lengkap</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Jumlah Anak Panti</Text>
            <TextInput
              style={styles.input}
              value={population}
              onChangeText={setPopulation}
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Prioritas (Urgency)</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.radio, urgency === "normal" && { borderColor: colors.primary }]}
                onPress={() => setUrgency("normal")}
              >
                <Text style={styles.radioText}>🟢 Normal</Text>
              </Pressable>
              <Pressable
                style={[styles.radio, urgency === "butuh" && { borderColor: colors.warning || "#f5a623" }]}
                onPress={() => setUrgency("butuh")}
              >
                <Text style={styles.radioText}>🟡 Butuh Bantuan</Text>
              </Pressable>
              <Pressable
                style={[styles.radio, urgency === "urgent" && { borderColor: colors.danger || "#d9534f" }]}
                onPress={() => setUrgency("urgent")}
              >
                <Text style={styles.radioText}>🔴 Urgent</Text>
              </Pressable>
            </View>
          </View>

          <Pressable style={[styles.button, isUpdating && { opacity: 0.7 }]} onPress={handleUpdate} disabled={isUpdating}>
            <Text style={styles.buttonText}>{isUpdating ? "Menyimpan..." : "Simpan Profil"}</Text>
          </Pressable>

          <Pressable
            style={[styles.button, { backgroundColor: colors.danger, marginTop: 10 }]}
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
