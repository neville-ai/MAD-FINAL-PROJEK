import { api } from "@/convex/_generated/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation } from "convex/react";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function OnboardingScreen() {
  const router = useRouter();
  // @ts-ignore: Menghindari error TS sebelum `npx convex dev` mendeteksi file users.ts baru
  const authenticateUserMutation = useMutation(api.users.authenticateUser);

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<"donor" | "receiver" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectRole = (selectedRole: "donor" | "receiver") => {
    setRole(selectedRole);
    setStep(2);
  };

  const handleFinish = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert("Perhatian", "Email dan Password wajib diisi!");
    }

    setIsSubmitting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = undefined;
      let lng = undefined;

      if (status === "granted") {
        const location = await Location.getLastKnownPositionAsync({});
        if (location) {
          lat = location.coords.latitude;
          lng = location.coords.longitude;
        }
      }

      // Autentikasi (Login / Register) ke Convex
      const result = await authenticateUserMutation({
        email,
        password,
        role: role!,
        lat,
        lng,
      });

      // Jika server mengembalikan object error, tampilkan pesan singkatnya
      if (result && (result as any).error) {
        Alert.alert("Gagal", (result as any).error);
        return;
      }

      const userId = (result as any).userId;
      if (!userId) {
        Alert.alert("Error", "Hasil autentikasi tidak valid.");
        return;
      }

      // Simpan login state di lokal
      await AsyncStorage.setItem("userId", userId);
      await AsyncStorage.setItem("userRole", role!);

      // Redirect
      if (role === "donor") {
        router.replace("/(donor)" as any);
      } else {
        router.replace("/(panti)" as any);
      }
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan data pengguna.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {step === 1 ? (
          <View style={styles.content}>
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                {/* Ganti 'my-logo.png' dengan nama file gambar Anda di folder assets/images */}
                <Image
                  source={require("../assets/images/logo zero.png")}
                  style={styles.logo}
                  resizeMode="contain"
                  defaultSource={{
                    uri: "https://via.placeholder.com/150?text=Logo+Anda",
                  }}
                />
              </View>
              <Text style={styles.title}>Selamat Datang di Zero Drop</Text>
              <Text style={styles.subtitle}>Pilih peran Anda</Text>
            </View>

            <View style={styles.cardsContainer}>
              {/* Card Donatur (Hijau) */}
              <TouchableOpacity
                style={[styles.card, styles.donorCard]}
                activeOpacity={0.8}
                onPress={() => handleSelectRole("donor")}
              >
                <View style={styles.contentRow}>
                  <View style={[styles.iconBox, styles.donorIconBox]}>
                    <Text style={styles.iconText}>🤝</Text>
                  </View>
                  <View style={styles.textColumn}>
                    <Text style={[styles.cardTitle, styles.donorText]}>
                      Saya Donatur
                    </Text>
                    <Text style={styles.cardDesc}>
                      Bantu mereka yang membutuhkan dengan berbagi donasi
                      makanan harian.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Card Panti (Biru) */}
              <TouchableOpacity
                style={[styles.card, styles.receiverCard]}
                activeOpacity={0.8}
                onPress={() => handleSelectRole("receiver")}
              >
                <View style={styles.contentRow}>
                  <View style={[styles.iconBox, styles.receiverIconBox]}>
                    <Text style={styles.iconText}>🏠</Text>
                  </View>
                  <View style={styles.textColumn}>
                    <Text style={[styles.cardTitle, styles.receiverText]}>
                      Saya Panti
                    </Text>
                    <Text style={styles.cardDesc}>
                      Ajukan atau kelola suplai makanan masuk untuk kebutuhan
                      panti.
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.content}
          >
            <TouchableOpacity
              onPress={() => setStep(1)}
              disabled={isSubmitting}
              style={styles.backButton}
            >
              <Text style={styles.backText}>← Kembali</Text>
            </TouchableOpacity>

            <View style={styles.headerContainer}>
              <Text style={styles.title}>
                {role === "donor" ? "Login Donatur" : "Login Panti"}
              </Text>
              <Text style={styles.subtitle}>
                Masukkan Email dan Password Anda
              </Text>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Email..."
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              editable={!isSubmitting}
            />

            <TextInput
              style={styles.input}
              placeholder="Password..."
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isSubmitting}
            />

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleFinish}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Masuk / Daftar</Text>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    flex: 1,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  headerContainer: {
    marginBottom: 40,
    alignItems: "center", // Agar Logo dan teks posisinya rapi di tengah
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 8,
    lineHeight: 36,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
  },
  cardsContainer: {
    gap: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#94A3B8",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
        shadowColor: "#94A3B8",
      },
    }),
  },
  donorCard: {
    borderColor: "#E2E8F0",
    backgroundColor: "#F0FDF4",
  },
  donorIconBox: {
    backgroundColor: "#DCFCE7",
  },
  donorText: {
    color: "#166534",
  },
  receiverCard: {
    borderColor: "#E2E8F0",
    backgroundColor: "#EFF6FF",
  },
  receiverIconBox: {
    backgroundColor: "#DBEAFE",
  },
  receiverText: {
    color: "#1E40AF",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 20,
  },
  iconText: {
    fontSize: 30,
  },
  textColumn: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },
  backButton: {
    marginBottom: 30,
    alignSelf: "flex-start",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 24,
    fontSize: 18,
    color: "#0F172A",
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: "#0F172A",
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
