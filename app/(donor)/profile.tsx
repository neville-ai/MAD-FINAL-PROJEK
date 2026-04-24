import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DonorProfileScreen() {
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

  const userData = useQuery((api as any).users.getUserById, userId ? { userId: userId as any } : "skip");
  const donorHistory = useQuery((api as any).donations.getDonorHistory, userId ? { donorId: userId as any } : "skip");
  const updateUserProfile = useMutation((api as any).users.updateUserProfile);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [favoriteFood, setFavoriteFood] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (userData) {
      setName(userData.name || "");
      setPhone(userData.phone || "");
      setAddress(userData.address || "");
      setFavoriteFood(userData.favoriteFood || "");
    }
  }, [userData]);

  const handleUpdate = async () => {
    if (!phone.trim()) {
      Alert.alert("Gagal", "Nomor Kontak (WAJIB) harus diisi!");
      return;
    }
    try {
      setIsUpdating(true);
      await updateUserProfile({
        userId: userId as any,
        name,
        phone,
        address,
        favoriteFood,
      });
      Alert.alert("Sukses", "Profil Donatur berhasil diperbarui!");
    } catch (error) {
      Alert.alert("Error", "Gagal memperbarui profil.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (!userId || userData === undefined) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const totalDonations = donorHistory ? donorHistory.length : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Biodata Donatur</Text>
          <Text style={styles.subtitle}>
            Lengkapi identitas Anda untuk mempermudah koordinasi.
          </Text>
        </View>

        {/* Statistik & Reputasi */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>⭐ Reputasi & Jejak Kebaikan</Text>
          
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>15</Text>
              <Text style={styles.statLabel}>Level Donatur</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{totalDonations}x</Text>
              <Text style={styles.statLabel}>Total Donasi</Text>
            </View>
          </View>
          
          <View style={styles.ratingRow}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Rating dari Panti:</Text>
            <Text style={{ color: '#f5a623', fontSize: 18, letterSpacing: 2 }}>⭐⭐⭐⭐⭐</Text>
          </View>
        </View>

        {/* Form Biodata */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Identitas Utama</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>📧 Email (Login)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.textMuted }]}
              value={userData.email}
              editable={false}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>👤 Nama Lengkap / Instansi</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Contoh: Budi Santoso"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📞 Nomor Kontak (WAJIB 🔥)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Contoh: 081234567890"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📍 Lokasi / Kota Anda</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Contoh: Jakarta Selatan"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* AI Preferences */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🧠 Preferensi Donasi (AI)</Text>
          <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 12 }}>
            Data ini membantu AI mencocokkan Anda dengan panti yang membutuhkan jenis makanan tersebut.
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>🥗 Jenis Makanan Favorit (Sering didonasikan)</Text>
            <TextInput
              style={styles.input}
              value={favoriteFood}
              onChangeText={setFavoriteFood}
              placeholder="Contoh: Nasi, Sayur, Tempe"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <Pressable
          style={[styles.button, isUpdating && { opacity: 0.7 }]}
          onPress={handleUpdate}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Simpan Profil</Text>
          )}
        </Pressable>
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
      paddingBottom: 40,
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
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      color: colors.text,
      fontSize: 16,
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
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
      gap: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.primary + '10',
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primary + '30',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 4,
      fontWeight: '600',
    },
    ratingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.bg,
      padding: 12,
      borderRadius: 8,
    }
  });
