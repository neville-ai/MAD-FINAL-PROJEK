import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, type Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import { calculateFoodNeeds, getUrgencyFactor } from "@/lib/foodNeeds";

const EMPTY_REQUESTS: RequestMarker[] = [];
const USER_REGION_DELTA = {
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};
const LOCATION_UPDATE_INTERVAL_MS = 4000;
const LOCATION_DISTANCE_INTERVAL_M = 5;
const MIN_MOVEMENT_TO_UPDATE_M = 3;
const MAX_ACCEPTABLE_ACCURACY_M = 80;

type RequestMarker = {
  _id: string;
  receiverName: string;
  population: number;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
  isUrgent: boolean;
};

function formatNeed(value: number) {
  return `${value.toLocaleString("id-ID")} porsi`;
}

function calculateDistanceInMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
) {
  const earthRadius = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

export default function MapScreen() {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const mapRef = useRef<MapView | null>(null);

  const requestsQuery = useQuery(api.requests.listForMap) as
    | RequestMarker[]
    | undefined;
  const requests = requestsQuery ?? EMPTY_REQUESTS;
  const seedSampleRequests = useMutation(api.requests.seedSampleRequests);

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const lastUserRegionRef = useRef<Region | null>(null);

  const updateUserRegion = useCallback((latitude: number, longitude: number) => {
    const nextRegion: Region = {
      latitude,
      longitude,
      ...USER_REGION_DELTA,
    };
    const previous = lastUserRegionRef.current;

    if (previous) {
      const movedMeters = calculateDistanceInMeters(
        previous.latitude,
        previous.longitude,
        nextRegion.latitude,
        nextRegion.longitude,
      );

      if (movedMeters < MIN_MOVEMENT_TO_UPDATE_M) {
        return;
      }
    }

    lastUserRegionRef.current = nextRegion;
    setUserRegion(nextRegion);
  }, []);

  const applyGpsPosition = useCallback(
    (position: Location.LocationObject) => {
      const accuracy = position.coords.accuracy ?? null;

      if (accuracy !== null && accuracy > MAX_ACCEPTABLE_ACCURACY_M) {
        setLocationError(
          `Sinyal GPS belum akurat (±${Math.round(
            accuracy,
          )}m). Coba pindah ke area terbuka lalu tunggu beberapa detik.`,
        );
        return false;
      }

      setLocationError(null);
      setUserAccuracy(accuracy);
      updateUserRegion(position.coords.latitude, position.coords.longitude);
      return true;
    },
    [updateUserRegion],
  );

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;

    async function loadUserLocation() {
      try {
        setIsLocating(true);
        setLocationError(null);

        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          if (isMounted) {
            if (!permission.canAskAgain) {
              setLocationError(
                "Izin lokasi ditolak permanen. Aktifkan izin lokasi di pengaturan perangkat.",
              );
            } else {
              setLocationError(
                "Izin lokasi ditolak. Aktifkan lokasi untuk melihat posisi kamu.",
              );
            }
          }
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (isMounted) {
            setLocationError(
              "Layanan lokasi perangkat nonaktif. Aktifkan GPS terlebih dahulu.",
            );
          }
          return;
        }

        if (Platform.OS === "android") {
          await Location.enableNetworkProviderAsync();
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
          mayShowUserSettingsDialog: true,
        });

        if (!isMounted) {
          return;
        }

        const isFirstFixAccepted = applyGpsPosition(current);
        const currentRegion = lastUserRegionRef.current;
        if (isFirstFixAccepted && currentRegion) {
          mapRef.current?.animateToRegion(currentRegion, 700);
        } else if (!isFirstFixAccepted) {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 10_000,
            requiredAccuracy: 100,
          });

          if (lastKnown && isMounted) {
            const accepted = applyGpsPosition(lastKnown);
            if (accepted && lastUserRegionRef.current) {
              mapRef.current?.animateToRegion(lastUserRegionRef.current, 700);
            }
          }
        }

        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            distanceInterval: LOCATION_DISTANCE_INTERVAL_M,
            timeInterval: LOCATION_UPDATE_INTERVAL_MS,
          },
          (position) => {
            if (!isMounted) {
              return;
            }

            applyGpsPosition(position);
          },
        );
      } catch {
        if (isMounted) {
          setLocationError("Lokasi belum bisa diambil. Pastikan GPS perangkat aktif.");
        }
      } finally {
        if (isMounted) {
          setIsLocating(false);
        }
      }
    }

    loadUserLocation();

    return () => {
      isMounted = false;
      locationSubscription?.remove();
    };
  }, [applyGpsPosition]);

  useEffect(() => {
    if (requests.length > 0 && !selectedRequestId) {
      setSelectedRequestId(requests[0]._id);
    }
  }, [requests, selectedRequestId]);

  const selectedRequest =
    requests.find((request) => request._id === selectedRequestId) ?? null;
  const urgentCount = requests.filter((request) => request.isUrgent).length;
  const localFoodNeeds = selectedRequest
    ? calculateFoodNeeds(
        selectedRequest.population,
        getUrgencyFactor(selectedRequest.isUrgent),
      )
    : null;
  const remoteFoodNeeds = useQuery(
    api.foodNeeds.calculateFoodNeeds,
    selectedRequest
      ? {
          population: selectedRequest.population,
          urgencyFactor: getUrgencyFactor(selectedRequest.isUrgent) as 1 | 1.2,
        }
      : "skip",
  );
  const resolvedFoodNeeds = remoteFoodNeeds ?? localFoodNeeds;
  const mapRequestMarkers = useMemo(
    () =>
      requests.map((request) => (
        <Marker
          key={request._id}
          coordinate={{
            latitude: request.latitude,
            longitude: request.longitude,
          }}
          pinColor={request.isUrgent ? colors.danger : colors.success}
          title={request.receiverName}
          description={`Population: ${request.population} orang`}
          onPress={() => handleMarkerPress(request)}
          tracksViewChanges={false}
        />
      )),
    [colors.danger, colors.success, requests],
  );

  async function handleSeedSampleData() {
    try {
      setIsSeeding(true);
      await seedSampleRequests({});
    } finally {
      setIsSeeding(false);
    }
  }

  function focusRegion(region: Region) {
    mapRef.current?.animateToRegion(region, 700);
  }

  function handleMarkerPress(request: RequestMarker) {
    setSelectedRequestId(request._id);

    focusRegion({
      latitude: request.latitude,
      longitude: request.longitude,
      latitudeDelta: 0.05,
      longitudeDelta: 0.05,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.eyebrow}>ZERO DROP MAP</Text>
            <Text style={styles.title}>Peta permintaan bantuan pangan</Text>
            <Text style={styles.subtitle}>
              Lihat lokasi panti asuhan, prioritas urgent, dan estimasi kebutuhan
              makanan berbasis jumlah penghuni.
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statValue}>{requests.length}</Text>
              <Text style={styles.statLabel}>Request</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={[styles.statValue, { color: colors.danger }]}>
                {urgentCount}
              </Text>
              <Text style={styles.statLabel}>Urgent</Text>
            </View>
            <Pressable
              style={styles.locateChip}
              onPress={() => {
                if (userRegion) {
                  focusRegion(userRegion);
                }
              }}
            >
              <Ionicons name="locate-outline" size={18} color="#ffffff" />
              <Text style={styles.locateChipText}>My Location</Text>
            </Pressable>
          </View>
          {userRegion && (
            <Text style={styles.gpsText}>
              GPS: {userRegion.latitude.toFixed(5)}, {userRegion.longitude.toFixed(5)}
              {userAccuracy !== null ? ` (±${Math.round(userAccuracy)}m)` : ""}
            </Text>
          )}
        </View>

        <View style={styles.mapCard}>
          {userRegion ? (
            <MapView
              ref={mapRef}
              provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
              style={styles.map}
              initialRegion={userRegion}
              showsUserLocation
              followsUserLocation
              showsMyLocationButton={Platform.OS === "android"}
            >
              <Marker
                coordinate={{
                  latitude: userRegion.latitude,
                  longitude: userRegion.longitude,
                }}
                pinColor={colors.primary}
                title="Lokasi Saya"
                description="Posisi GPS perangkat saat ini"
              />
              {mapRequestMarkers}
            </MapView>
          ) : (
            <View style={styles.mapLoadingContainer}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.mapLoadingText}>Menunggu lokasi GPS...</Text>
            </View>
          )}

          {(isLocating || locationError) && (
            <View style={styles.locationBanner}>
              {isLocating ? (
                <>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.locationBannerText}>
                    Mengambil lokasi kamu...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color={colors.warning}
                  />
                  <Text style={styles.locationBannerText}>{locationError}</Text>
                </>
              )}
            </View>
          )}
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Detail request</Text>

          {requests.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Belum ada data request</Text>
              <Text style={styles.emptyDescription}>
                Gunakan sample data Convex untuk mencoba marker dan kalkulasi AI
                kebutuhan makanan.
              </Text>
              <Pressable
                style={styles.seedButton}
                onPress={handleSeedSampleData}
                disabled={isSeeding}
              >
                {isSeeding ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.seedButtonText}>Load Sample Data</Text>
                )}
              </Pressable>
            </View>
          ) : selectedRequest ? (
            <ScrollView contentContainerStyle={styles.detailsContent}>
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleGroup}>
                  <Text style={styles.detailTitle}>
                    {selectedRequest.receiverName}
                  </Text>
                  <Text style={styles.detailSubtitle}>
                    {selectedRequest.address ?? "Alamat belum tersedia"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor: selectedRequest.isUrgent
                        ? colors.danger
                        : colors.success,
                    },
                  ]}
                >
                  <Text style={styles.priorityBadgeText}>
                    {selectedRequest.isUrgent ? "Urgent" : "Normal"}
                  </Text>
                </View>
              </View>

              <View style={styles.populationCard}>
                <Text style={styles.populationLabel}>Jumlah penghuni</Text>
                <Text style={styles.populationValue}>
                  {selectedRequest.population} orang
                </Text>
              </View>

              <View style={styles.needGrid}>
                <View style={styles.needCard}>
                  <Text style={styles.needLabel}>Harian</Text>
                  <Text style={styles.needValue}>
                    {resolvedFoodNeeds
                      ? formatNeed(resolvedFoodNeeds.daily)
                      : "Loading..."}
                  </Text>
                  <Text style={styles.needFormula}>
                    population x 2 x {selectedRequest.isUrgent ? "1.2" : "1"} x 1
                  </Text>
                </View>

                <View style={styles.needCard}>
                  <Text style={styles.needLabel}>Mingguan</Text>
                  <Text style={styles.needValue}>
                    {resolvedFoodNeeds
                      ? formatNeed(resolvedFoodNeeds.weekly)
                      : "Loading..."}
                  </Text>
                  <Text style={styles.needFormula}>
                    population x 2 x {selectedRequest.isUrgent ? "1.2" : "1"} x 7
                  </Text>
                </View>

                <View style={styles.needCard}>
                  <Text style={styles.needLabel}>Bulanan</Text>
                  <Text style={styles.needValue}>
                    {resolvedFoodNeeds
                      ? formatNeed(resolvedFoodNeeds.monthly)
                      : "Loading..."}
                  </Text>
                  <Text style={styles.needFormula}>
                    population x 2 x {selectedRequest.isUrgent ? "1.2" : "1"} x 30
                  </Text>
                </View>
              </View>

              <View style={styles.notesCard}>
                <Text style={styles.notesLabel}>Catatan</Text>
                <Text style={styles.notesText}>
                  {selectedRequest.notes ??
                    "Belum ada catatan tambahan untuk request ini."}
                </Text>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Pilih marker pada map</Text>
              <Text style={styles.emptyDescription}>
                Detail nama tempat, penghuni, dan estimasi kebutuhan akan muncul
                di sini.
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ReturnType<typeof useTheme>["colors"]) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    container: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 12,
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 18,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTextGroup: {
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
      fontSize: 24,
      fontWeight: "700",
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    gpsText: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    statsRow: {
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      flexWrap: "wrap",
    },
    statChip: {
      minWidth: 82,
      backgroundColor: colors.bg,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 2,
    },
    statValue: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
    },
    statLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: "600",
    },
    locateChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    locateChipText: {
      color: "#ffffff",
      fontSize: 13,
      fontWeight: "700",
    },
    mapCard: {
      flex: 1.1,
      minHeight: 280,
      borderRadius: 24,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    map: {
      width: "100%",
      height: "100%",
    },
    mapLoadingContainer: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingHorizontal: 16,
    },
    mapLoadingText: {
      color: colors.textMuted,
      fontSize: 14,
      fontWeight: "500",
    },
    locationBanner: {
      position: "absolute",
      top: 12,
      left: 12,
      right: 12,
      backgroundColor: colors.surface,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    locationBannerText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: "500",
      flex: 1,
    },
    detailsCard: {
      flex: 0.95,
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      minHeight: 280,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 12,
    },
    detailsContent: {
      gap: 14,
      paddingBottom: 10,
    },
    detailHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "flex-start",
    },
    detailTitleGroup: {
      flex: 1,
      gap: 4,
    },
    detailTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: "700",
    },
    detailSubtitle: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    priorityBadge: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    priorityBadgeText: {
      color: "#ffffff",
      fontSize: 12,
      fontWeight: "700",
    },
    populationCard: {
      backgroundColor: colors.bg,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    populationLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    populationValue: {
      color: colors.text,
      fontSize: 24,
      fontWeight: "700",
    },
    needGrid: {
      gap: 10,
    },
    needCard: {
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
      fontSize: 20,
      fontWeight: "700",
    },
    needFormula: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "600",
    },
    notesCard: {
      backgroundColor: colors.bg,
      borderRadius: 18,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    notesLabel: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "600",
    },
    notesText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 20,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
    },
    emptyTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
    },
    emptyDescription: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: "center",
    },
    seedButton: {
      marginTop: 8,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: 18,
      paddingVertical: 12,
      minWidth: 170,
      alignItems: "center",
      justifyContent: "center",
    },
    seedButtonText: {
      color: "#ffffff",
      fontSize: 14,
      fontWeight: "700",
    },
  });
