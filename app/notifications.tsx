import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

export default function NotificationsScreen() {
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

  const notifications = useQuery((api as any).notifications?.getUserNotifications, 
    userId ? { userId: userId as any } : "skip"
  ) || [];

  const markAllAsRead = useMutation((api as any).notifications?.markAllAsRead as any) || (async () => {});
  const markAsRead = useMutation((api as any).notifications?.markAsRead as any) || (async () => {});

  const handleMarkAll = async () => {
    if (userId) await markAllAsRead({ userId: userId as any });
  };

  const handleNotificationPress = async (id: string, isRead: boolean) => {
    if (!isRead) {
      await markAsRead({ notificationId: id as any });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Kembali</Text>
        </Pressable>
        <Text style={styles.title}>Notifikasi</Text>
        <Pressable onPress={handleMarkAll} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Baca Semua</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!userId ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Belum ada notifikasi.</Text>
          </View>
        ) : (
          notifications.map((notif: any) => (
            <Pressable 
              key={notif._id} 
              style={[styles.card, !notif.isRead && styles.unreadCard]}
              onPress={() => handleNotificationPress(notif._id, notif.isRead)}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.notifTitle, !notif.isRead && styles.unreadText]}>{notif.title}</Text>
                <Text style={styles.timestamp}>
                  {new Date(notif.createdAt).toLocaleDateString("id-ID", {
                    hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>
              <Text style={styles.message}>{notif.message}</Text>
              {!notif.isRead && <View style={styles.dot} />}
            </Pressable>
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
      fontSize: 18,
      fontWeight: "700",
      color: colors.text,
    },
    backBtn: {
      padding: 8,
    },
    backText: {
      color: colors.primary,
      fontWeight: "600",
    },
    markAllBtn: {
      padding: 8,
    },
    markAllText: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600'
    },
    content: {
      padding: 16,
      gap: 12,
    },
    card: {
      backgroundColor: colors.surface,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative'
    },
    unreadCard: {
      backgroundColor: colors.primary + '10',
      borderColor: colors.primary + '40',
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 6,
      alignItems: 'center',
      paddingRight: 10
    },
    notifTitle: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text
    },
    unreadText: {
      fontWeight: "800",
      color: colors.primary
    },
    timestamp: {
      fontSize: 12,
      color: colors.textMuted
    },
    message: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 20
    },
    dot: {
      position: 'absolute',
      right: 12,
      top: 20,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.primary
    },
    emptyBox: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 40
    },
    emptyText: {
      color: colors.textMuted,
      fontSize: 15
    }
  });
