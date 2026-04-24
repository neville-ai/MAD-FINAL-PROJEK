import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PantiHistoryScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserId() {
      const id = await AsyncStorage.getItem("userId");
      if (id) {
        setUserId(id);
      }
    }
    loadUserId();
  }, []);

  const existingRequest = useQuery(
    (api as any).requests.getRequestByCreator, 
    userId ? { creatorId: userId as any } : "skip"
  );

  const donationsForRequest = useQuery(
    (api as any).donations.getDonationsByRequest,
    existingRequest ? { requestId: existingRequest._id } : "skip",
  ) as any[] | undefined;

  const completed = (donationsForRequest || []).filter((d: any) => d.status === "completed");

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Riwayat Donasi</Text>
          <Text style={styles.subtitle}>
            Daftar donasi yang telah sukses diterima oleh panti Anda.
          </Text>
        </View>

        {!userId || donationsForRequest === undefined ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : completed.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>Belum ada riwayat penerimaan donasi.</Text>
          </View>
        ) : (
          completed.map((donation: any) => (
            <View key={donation._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.donorName}>{donation.donorName}</Text>
                <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
                  <Text style={[styles.badgeText, { color: colors.success }]}>
                    ✓ Telah Diterima
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Membawa:</Text>
                <Text style={styles.detailValue}>{donation.quantity} {donation.unit} {donation.foodType}</Text>
              </View>
              
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Selesai:</Text>
                <Text style={styles.detailValue}>{new Date(donation.createdAt).toLocaleDateString("id-ID", {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</Text>
              </View>
            </View>
          ))
        )}
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
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 12,
    },
    donorName: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
      flex: 1,
    },
    badge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: "700",
    },
    detailsRow: {
      flexDirection: "row",
      marginBottom: 8,
    },
    detailLabel: {
      width: 80,
      fontSize: 14,
      color: colors.textMuted,
    },
    detailValue: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: "center",
    }
  });
