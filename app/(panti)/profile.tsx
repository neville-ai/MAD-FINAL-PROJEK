import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, Alert, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PantiProfileScreen() {
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

  const addRequest = useMutation((api as any).requests.addRequest);
  const updateRequest = useMutation((api as any).requests.updateRequest);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [population, setPopulation] = useState("");
  const [urgency, setUrgency] = useState<"normal" | "butuh" | "urgent">("normal");
  const [phone, setPhone] = useState("");
  const [pantiType, setPantiType] = useState<"panti asuhan" | "panti jompo">("panti asuhan");
  const [operatingHours, setOperatingHours] = useState("");
  const [notes, setNotes] = useState("");

  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (existingRequest) {
      setName(existingRequest.receiverName || "");
      setAddress(existingRequest.address || "");
      setPopulation(existingRequest.population?.toString() || "");
      setUrgency(existingRequest.urgency || "normal");
      setPhone(existingRequest.contactPhone || "");
      setPantiType(existingRequest.pantiType || "panti asuhan");
      setOperatingHours(existingRequest.operatingHours || "");
      setNotes(existingRequest.notes || "");
    }
  }, [existingRequest]);

  const handleUpdate = async () => {
    if (!name.trim() || !address.trim() || !population.trim()) {
      Alert.alert("Gagal", "Nama, Alamat, dan Jumlah Anak wajib diisi!");
      return;
    }
    try {
      setIsUpdating(true);
      if (existingRequest) {
        await updateRequest({
          requestId: existingRequest._id,
          receiverName: name,
          population: Number(population) || 0,
          neededQuantity: Number(population) * 2, // AUTO AI calculation
          address,
          urgency,
          contactPhone: phone,
          pantiType,
          operatingHours,
          notes,
        });
        Alert.alert("Sukses", "Profil Panti berhasil diperbarui!");
      } else {
        await addRequest({
          receiverName: name,
          population: Number(population) || 0,
          neededQuantity: Number(population) * 2, // AUTO AI calculation
          lat: -6.2, // mock lat
          lng: 106.8, // mock lng
          address,
          urgency,
          contactPhone: phone,
          pantiType,
          operatingHours,
          notes,
          createdBy: userId as any,
        });
        Alert.alert("Sukses", "Profil Panti berhasil dibuat!");
      }
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan profil.");
    } finally {
      setIsUpdating(false);
    }
  };

  const completedDonations = (donationsForRequest || []).filter((d: any) => d.status === "completed").length;

  if (!userId) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profil Publik Panti</Text>
          <Text style={styles.subtitle}>
            Data ini akan dilihat oleh calon donatur. Pastikan akurat!
          </Text>
        </View>

        {/* Statistik Canggih Tambahan */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📦 Reputasi Penerimaan</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{completedDonations}</Text>
              <Text style={styles.statLabel}>Donasi Diterima</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.success + '10', borderColor: colors.success + '30' }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>Aktif</Text>
              <Text style={styles.statLabel}>Status Panti</Text>
            </View>
          </View>
        </View>

        {/* Form Biodata */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Identitas Utama</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>🏠 Nama Panti</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Contoh: Panti Asuhan Harapan"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>🏢 Jenis Panti</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.radio, pantiType === "panti asuhan" && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                onPress={() => setPantiType("panti asuhan")}
              >
                <Text style={[styles.radioText, pantiType === "panti asuhan" && { color: colors.primary }]}>Panti Asuhan</Text>
              </Pressable>
              <Pressable
                style={[styles.radio, pantiType === "panti jompo" && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                onPress={() => setPantiType("panti jompo")}
              >
                <Text style={[styles.radioText, pantiType === "panti jompo" && { color: colors.primary }]}>Panti Jompo</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📝 Deskripsi Singkat</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="Contoh: Kami mendidik 50 anak yatim piatu..."
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Kontak & Lokasi</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>📍 Alamat Lengkap (WAJIB 🔥)</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Jalan, RT/RW, Kota"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>📞 Nomor Kontak</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="Contoh: 08123456789"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>🕒 Jam Operasional</Text>
            <TextInput
              style={styles.input}
              value={operatingHours}
              onChangeText={setOperatingHours}
              placeholder="Contoh: 08:00 - 17:00 WIB"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Data Inti (AI Prediksi)</Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.label}>👶 Jumlah Anak / Penghuni</Text>
            <TextInput
              style={styles.input}
              value={population}
              onChangeText={setPopulation}
              keyboardType="number-pad"
              placeholder="Contoh: 50"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>🍱 Kebutuhan Harian (Otomatis)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, color: colors.primary, fontWeight: '700' }]}
              value={population ? `${Number(population) * 2} Porsi / Hari` : "0 Porsi / Hari"}
              editable={false}
            />
            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
              *Dihitung otomatis oleh AI berdasarkan jumlah penghuni.
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>🔴 Status Urgency (WAJIB 🔥)</Text>
            <View style={styles.row}>
              <Pressable
                style={[styles.radio, urgency === "normal" && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                onPress={() => setUrgency("normal")}
              >
                <Text style={styles.radioText}>🟢 Normal</Text>
              </Pressable>
              <Pressable
                style={[styles.radio, urgency === "butuh" && { borderColor: '#f5a623', backgroundColor: '#f5a623' + '10' }]}
                onPress={() => setUrgency("butuh")}
              >
                <Text style={styles.radioText}>🟡 Butuh</Text>
              </Pressable>
              <Pressable
                style={[styles.radio, urgency === "urgent" && { borderColor: colors.danger, backgroundColor: colors.danger + '10' }]}
                onPress={() => setUrgency("urgent")}
              >
                <Text style={styles.radioText}>🔴 Urgent</Text>
              </Pressable>
            </View>
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
            <Text style={styles.buttonText}>Simpan Profil Panti</Text>
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
    row: {
      flexDirection: 'row',
      gap: 8,
    },
    radio: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      alignItems: 'center',
      backgroundColor: colors.bg,
    },
    radioText: {
      fontSize: 12,
      fontWeight: '600',
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
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
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
  });
