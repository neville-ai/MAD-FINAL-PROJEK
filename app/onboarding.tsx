import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

export default function OnboardingScreen() {
  const router = useRouter();
  // @ts-ignore: Menghindari error TS sebelum `npx convex dev` mendeteksi file users.ts baru
  const saveUserMutation = useMutation(api.users.saveUser);

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<'donor' | 'receiver' | null>(null);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectRole = (selectedRole: 'donor' | 'receiver') => {
    setRole(selectedRole);
    setStep(2); 
  };

  const handleFinish = async () => {
    if (!name.trim()) return Alert.alert("Perhatian", "Mohon masukkan nama!");

    setIsSubmitting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = undefined;
      let lng = undefined;

      if (status === 'granted') {
        // Menggunakan getLastKnown untuk menghindari hang (macet) di emulator / saat GPS lambat
        const location = await Location.getLastKnownPositionAsync({});
        if (location) {
          lat = location.coords.latitude;
          lng = location.coords.longitude;
        }
      } else {
        Alert.alert("Info", "Izin lokasi tidak diberikan. Lanjut tanpa lokasi.");
      }

      // Simpan ke Convex
      const userId = await saveUserMutation({ name, role: role!, lat, lng });

      // Simpan login state di lokal
      await AsyncStorage.setItem('userId', userId);
      await AsyncStorage.setItem('userRole', role!);

      // Redirect
      if (role === 'donor') {
        router.replace('/(tabs)' as any); 
      } else {
        router.replace('/(tabs)/receiver-dashboard' as any); // Pastikan receiver dashboard ada, atau ubah path-nya
      }
    } catch (error) {
      Alert.alert("Error", "Gagal menyimpan data pengguna.");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {step === 1 ? (
        <View style={styles.content}>
          <Text style={styles.title}>Pilih Peran Anda</Text>
          <Text style={styles.subtitle}>Bagaimana Anda ingin menggunakan aplikasi ini?</Text>

          <View style={styles.cardsContainer}>
            <TouchableOpacity 
              style={[styles.card, styles.donorCard]} 
              onPress={() => handleSelectRole('donor')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>🤝</Text>
              </View>
              <Text style={styles.cardTitle}>Saya Donatur</Text>
              <Text style={styles.cardDesc}>Ingin berbagi makanan</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.card, styles.receiverCard]} 
              onPress={() => handleSelectRole('receiver')}
              activeOpacity={0.8}
            >
              <View style={styles.iconContainer}>
                <Text style={styles.iconText}>🏠</Text>
              </View>
              <Text style={styles.cardTitle}>Saya Panti</Text>
              <Text style={styles.cardDesc}>Perlu bantuan makanan</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.content}
        >
          <TouchableOpacity onPress={() => setStep(1)} disabled={isSubmitting} style={styles.backButton}>
            <Text style={styles.backText}>← Kembali</Text>
          </TouchableOpacity>

          <Text style={styles.title}>
            {role === 'donor' ? 'Halo, Calon Donatur!' : 'Halo, Pengurus Panti!'}
          </Text>
          <Text style={styles.subtitle}>Siapa nama Anda atau nama Panti Anda?</Text>

          <TextInput
            style={styles.input}
            placeholder="Ketik nama di sini..."
            placeholderTextColor="#aaa"
            value={name}
            onChangeText={setName}
            autoFocus
            editable={!isSubmitting}
          />

          <TouchableOpacity style={styles.primaryButton} onPress={handleFinish} disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Selesai & Lanjutkan</Text>
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 24,
  },
  cardsContainer: {
    flexDirection: 'column',
    gap: 16, 
  },
  card: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3, 
  },
  donorCard: {
    backgroundColor: '#fff',
    borderColor: '#4CAF50',
  },
  receiverCard: {
    backgroundColor: '#fff',
    borderColor: '#3B82F6', 
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    color: '#6B7280',
  },
  backButton: {
    marginBottom: 24,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 32,
  },
  primaryButton: {
    backgroundColor: '#111827',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
