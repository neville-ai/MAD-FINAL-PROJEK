import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DonorHistoryScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [donorId, setDonorId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserId() {
      const id = await AsyncStorage.getItem("userId");
      if (id) {
        setDonorId(id);
      }
    }
    loadUserId();
  }, []);

  const history = useQuery((api as any).donations?.getDonorHistory, 
    donorId ? { donorId: donorId as any } : "skip"
  ) || [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Riwayat Donasi</Text>
          <Text style={styles.subtitle}>
            Pantau status donasi yang telah Anda salurkan.
          </Text>
        </View>

        {!donorId ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : history.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>Anda belum membuat donasi apapun.</Text>
          </View>
        ) : (
          history.map((donation: any) => (
            <View key={donation._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.pantiName}>{donation.receiverName}</Text>
                <View style={[
                  styles.badge, 
                  { backgroundColor: donation.status === 'completed' ? colors.success + '20' : colors.primary + '20' }
                ]}>
                  <Text style={[
                    styles.badgeText,
                    { color: donation.status === 'completed' ? colors.success : colors.primary }
                  ]}>
                    {donation.status === 'completed' ? 'Diterima' : 'Dalam Pengantaran'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Jenis:</Text>
                <Text style={styles.detailValue}>{donation.foodType}</Text>
              </View>
              
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Jumlah:</Text>
                <Text style={styles.detailValue}>{donation.quantity} {donation.unit}</Text>
              </View>
              
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Tanggal:</Text>
                <Text style={styles.detailValue}>{new Date(donation.createdAt).toLocaleDateString("id-ID", {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}</Text>
              </View>
              
              {donation.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>"{donation.notes}"</Text>
                </View>
              )}
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
    pantiName: {
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
      width: 60,
      fontSize: 14,
      color: colors.textMuted,
    },
    detailValue: {
      flex: 1,
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
    },
    notesBox: {
      marginTop: 12,
      padding: 12,
      backgroundColor: colors.bg,
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    notesText: {
      fontSize: 13,
      fontStyle: "italic",
      color: colors.textMuted,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textMuted,
      textAlign: "center",
    }
  });
