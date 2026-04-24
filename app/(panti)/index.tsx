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
  View,
} from "react-native";

function createStyles(colors: any) {
  return StyleSheet.create({
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
}

export default function ReceiverDashboard() {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    async function getUserId() {
      const id = await AsyncStorage.getItem("userId");
      setUserId(id);
    }
    getUserId();
  }, []);

  const existingRequest = useQuery(
    (api as any).requests.getRequestByCreator, 
    userId ? { creatorId: userId as any } : "skip"
  );

  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (existingRequest) {
      setRequestId(existingRequest._id);
    }
  }, [existingRequest]);

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
  useEffect(() => {
    const anyNew = incomingDonations.some((d: any) => d.status === "available");
    if (anyNew) {
      Alert.alert("Info", "Ada donasi yang sedang dikirim ke panti Anda.");
    }
  }, [incomingDonations.length]);

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
          <Text style={styles.sectionTitle}>Profil Singkat Panti</Text>
          <Text style={{ fontWeight: '700', color: colors.text }}>{existingRequest?.receiverName || "Profil Belum Diisi"}</Text>
          <Text style={{ color: colors.textMuted }}>{existingRequest?.address || "-"}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 6 }}>Jumlah anak: {existingRequest?.population || 0}</Text>
          <Text style={{ color: colors.textMuted }}>Kebutuhan (perkiraan): {Number(existingRequest?.population || '0') * 2} porsi</Text>
          <Text style={{ marginTop: 8, fontWeight: '700', color: existingRequest?.urgency === 'urgent' ? colors.danger : existingRequest?.urgency === 'butuh' ? colors.warning : colors.success }}>
            {existingRequest?.urgency === 'urgent' ? '🔴 Urgent' : existingRequest?.urgency === 'butuh' ? '🟡 Butuh Bantuan' : '🟢 Normal'}
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
          <Text style={styles.sectionTitle}>Statistik Kebutuhan (AI)</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <View style={[styles.statusBox, { flex: 1, backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>
                {Number(existingRequest?.population || '0') * 2}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '600' }}>Porsi / Hari</Text>
            </View>
            <View style={[styles.statusBox, { flex: 1, backgroundColor: '#f5a623' + '10', borderColor: '#f5a623' + '30' }]}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: '#f5a623' }}>
                {(Number(existingRequest?.population || '0') * 2) * 7}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '600' }}>Porsi / Minggu</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 12, fontStyle: 'italic' }}>
            *Kalkulasi ini berdasarkan jumlah anak yang terdaftar di profil Panti Anda.
          </Text>
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

