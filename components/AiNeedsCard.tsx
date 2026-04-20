import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import useTheme from "@/hooks/useTheme";

type UrgencyStatus = "urgent" | "normal";

type AiNeedsCardProps = {
  receiverName: string;
  population: number;
  dailyNeed: number;
  weeklyNeed: number;
  monthlyNeed: number;
  urgency: UrgencyStatus;
};

function formatPortions(value: number) {
  return `${value.toLocaleString("id-ID")} porsi`;
}

export default function AiNeedsCard({
  receiverName,
  population,
  dailyNeed,
  weeklyNeed,
  monthlyNeed,
  urgency,
}: AiNeedsCardProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const isUrgent = urgency === "urgent";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.eyebrow}>AI FOOD NEEDS</Text>
          <Text style={styles.title}>{receiverName}</Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isUrgent ? colors.danger : colors.success,
            },
          ]}
        >
          <Ionicons
            name={isUrgent ? "warning-outline" : "checkmark-circle-outline"}
            size={14}
            color="#ffffff"
          />
          <Text style={styles.statusText}>
            {isUrgent ? "Urgent" : "Normal"}
          </Text>
        </View>
      </View>

      <View style={styles.populationCard}>
        <View style={styles.populationIcon}>
          <Ionicons name="people-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.populationInfo}>
          <Text style={styles.populationLabel}>Jumlah penghuni</Text>
          <Text style={styles.populationValue}>{population} orang</Text>
        </View>
      </View>

      <View style={styles.needsGrid}>
        <View style={styles.needItem}>
          <Text style={styles.needLabel}>Harian</Text>
          <Text style={styles.needValue}>{formatPortions(dailyNeed)}</Text>
        </View>

        <View style={styles.needItem}>
          <Text style={styles.needLabel}>Mingguan</Text>
          <Text style={styles.needValue}>{formatPortions(weeklyNeed)}</Text>
        </View>

        <View style={styles.needItem}>
          <Text style={styles.needLabel}>Bulanan</Text>
          <Text style={styles.needValue}>{formatPortions(monthlyNeed)}</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 20,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
    },
    headerContent: {
      flex: 1,
      gap: 6,
    },
    eyebrow: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 1,
    },
    title: {
      color: colors.text,
      fontSize: 22,
      fontWeight: "700",
      lineHeight: 28,
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statusText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "700",
    },
    populationCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.bg,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    populationIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    populationInfo: {
      gap: 4,
    },
    populationLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    populationValue: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    needsGrid: {
      gap: 10,
    },
    needItem: {
      backgroundColor: colors.bg,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    needLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    needValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 24,
    },
  });
