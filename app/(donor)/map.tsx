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
import { SafeAreaView } from "react-native-safe-area-context";
// react-native-maps & react-native-maps-directions are native-only packages.
// Import them at runtime on native platforms and provide web stubs so
// Metro doesn't try to bundle native internals for web.

// Define a lightweight Region type to avoid importing it from the native module
// (which could drag native-only code into the web bundle).
type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

let MapView: any;
let Marker: any;
let PROVIDER_GOOGLE: any;
let MapViewDirections: any;

if (Platform.OS !== "web") {
  // require at runtime on native platforms only
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RNMaps = require("react-native-maps");
  MapView = RNMaps.default || RNMaps;
  Marker = RNMaps.Marker || RNMaps;
  PROVIDER_GOOGLE = RNMaps.PROVIDER_GOOGLE;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  MapViewDirections = require("react-native-maps-directions").default;
} else {
  // simple web-friendly stubs
  MapView = (props: any) => (
    <View style={[{ height: 300, backgroundColor: "#e5e7eb" }, props.style]}>
      <Text style={{ textAlign: "center", padding: 12 }}>Peta tidak tersedia di web</Text>
    </View>
  );
  Marker = (props: any) => null;
  PROVIDER_GOOGLE = null;
  MapViewDirections = (props: any) => null;
}

import { api } from "@/convex/_generated/api";
import useTheme from "@/hooks/useTheme";
import { calculateFoodNeeds, getUrgencyFactor } from "@/lib/foodNeeds";
import {
  geolocateWithGoogle,
  getDirectionsApiKey,
  hasDirectionsApiKey,
  hasGeocodingApiKey,
  hasGeolocationApiKey,
  reverseGeocodeWithGoogle,
} from "@/lib/googleMaps";

const EMPTY_REQUESTS: RequestMarker[] = [];
const USER_REGION_DELTA = {
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};
const LOCATION_UPDATE_INTERVAL_MS = 4000;
const LOCATION_DISTANCE_INTERVAL_M = 5;
const MIN_MOVEMENT_TO_UPDATE_M = 3;
const MAX_ACCEPTABLE_ACCURACY_M = 80;
const MIN_DISTANCE_FOR_REVERSE_GEOCODE_M = 60;

type RequestMarker = {
  _id: string;
  receiverName: string;
  population: number;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
  urgency?: string;
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
  const mapRef = useRef<any>(null);

  const requestsQuery = useQuery(api.requests.listForMap) as
    | RequestMarker[]
    | undefined;
  const requests = requestsQuery ?? EMPTY_REQUESTS;

  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("Semua");
  const [userRegion, setUserRegion] = useState<Region | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [userAccuracy, setUserAccuracy] = useState<number | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distanceKm: number;
    durationMin: number;
  } | null>(null);
  const [locationSource, setLocationSource] = useState<"gps" | "network" | null>(null);
  const lastUserRegionRef = useRef<Region | null>(null);
  const lastReverseGeocodedRef = useRef<Region | null>(null);

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
      setLocationSource("gps");
      return true;
    },
    [updateUserRegion],
  );

  useEffect(() => {
    let isMounted = true;
    let locationSubscription: Location.LocationSubscription | null = null;
    async function tryNetworkGeolocationFallback() {
      if (!hasGeolocationApiKey()) {
        return false;
      }

      try {
        const networkLocation = await geolocateWithGoogle();
        if (!networkLocation || !isMounted) {
          return false;
        }

        setUserAccuracy(networkLocation.accuracy);
        setLocationSource("network");
        setLocationError(
          "Menggunakan network geolocation (perkiraan). Aktifkan GPS presisi untuk hasil lebih akurat.",
        );
        updateUserRegion(networkLocation.latitude, networkLocation.longitude);
        if (lastUserRegionRef.current) {
          mapRef.current?.animateToRegion(lastUserRegionRef.current, 700);
        }
        return true;
      } catch {
        return false;
      }
    }

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
          await tryNetworkGeolocationFallback();
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (isMounted) {
            setLocationError(
              "Layanan lokasi perangkat nonaktif. Aktifkan GPS terlebih dahulu.",
            );
          }
          await tryNetworkGeolocationFallback();
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

          if (!lastUserRegionRef.current) {
            await tryNetworkGeolocationFallback();
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
        await tryNetworkGeolocationFallback();
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

  const filteredRequests = useMemo(() => {
    if (activeFilter === "Semua") return requests;
    if (activeFilter === "Normal") return requests.filter(r => !r.urgency || r.urgency === "Normal");
    return requests.filter(r => r.urgency === activeFilter);
  }, [requests, activeFilter]);

  const selectedRequest =
    filteredRequests.find((request) => request._id === selectedRequestId) ?? null;
  const urgentCount = requests.filter((request) => request.urgency === "Urgent").length;
  const localFoodNeeds = selectedRequest
    ? calculateFoodNeeds(
        selectedRequest.population,
        getUrgencyFactor(selectedRequest.urgency),
      )
    : null;
  const remoteFoodNeeds = useQuery(
    api.foodNeeds.calculateFoodNeeds,
    selectedRequest
      ? {
          population: selectedRequest.population,
          urgencyFactor: getUrgencyFactor(selectedRequest.urgency) as 1 | 1.1 | 1.2,
        }
      : "skip",
  );
  const resolvedFoodNeeds = remoteFoodNeeds ?? localFoodNeeds;
  const directionsApiKey = getDirectionsApiKey();
  const mapRequestMarkers = useMemo(
    () =>
      filteredRequests.map((request) => (
        <Marker
          key={request._id}
          coordinate={{
            latitude: request.latitude,
            longitude: request.longitude,
          }}
          pinColor={request.urgency === "Urgent" ? colors.danger : request.urgency === "Butuh Bantuan" ? colors.warning : colors.success}
          title={request.receiverName}
          description={`Population: ${request.population} orang`}
          onPress={() => handleMarkerPress(request)}
          tracksViewChanges={false}
        />
      )),
    [colors.danger, colors.warning, colors.success, filteredRequests],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadUserAddress() {
      if (!userRegion || !hasGeocodingApiKey()) {
        return;
      }

      const last = lastReverseGeocodedRef.current;
      if (last) {
        const movedMeters = calculateDistanceInMeters(
          last.latitude,
          last.longitude,
          userRegion.latitude,
          userRegion.longitude,
        );
        if (movedMeters < MIN_DISTANCE_FOR_REVERSE_GEOCODE_M) {
          return;
        }
      }

      try {
        const formattedAddress = await reverseGeocodeWithGoogle({
          latitude: userRegion.latitude,
          longitude: userRegion.longitude,
        });

        if (isMounted) {
          lastReverseGeocodedRef.current = userRegion;
          setUserAddress(formattedAddress);
        }
      } catch {
        if (isMounted) {
          setUserAddress(null);
        }
      }
    }

    loadUserAddress();

    return () => {
      isMounted = false;
    };
  }, [userRegion]);



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
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {["Semua", "Normal", "Butuh Bantuan", "Urgent"].map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.filterChip,
                  activeFilter === filter && styles.filterChipActive,
                  activeFilter === filter && filter === "Urgent" && { backgroundColor: colors.danger, borderColor: colors.danger },
                  activeFilter === filter && filter === "Butuh Bantuan" && { backgroundColor: colors.warning, borderColor: colors.warning }
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[
                  styles.filterChipText,
                  activeFilter === filter && styles.filterChipTextActive
                ]}>{filter}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {userRegion && (
            <Text style={styles.gpsText}>
              {locationSource === "network" ? "Network" : "GPS"}:{" "}
              {userRegion.latitude.toFixed(5)}, {userRegion.longitude.toFixed(5)}
              {userAccuracy !== null ? ` (±${Math.round(userAccuracy)}m)` : ""}
            </Text>
          )}
          {userAddress && <Text style={styles.addressText}>Alamat: {userAddress}</Text>}
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
              {userRegion && selectedRequest && hasDirectionsApiKey() ? (
                <MapViewDirections
                  origin={{
                    latitude: userRegion.latitude,
                    longitude: userRegion.longitude,
                  }}
                  destination={{
                    latitude: selectedRequest.latitude,
                    longitude: selectedRequest.longitude,
                  }}
                  apikey={directionsApiKey}
                  mode="DRIVING"
                  strokeWidth={4}
                  strokeColor={colors.primary}
                  precision="low"
                  onReady={(result: { distance: number; duration: number }) => {
                    setRouteInfo({
                      distanceKm: result.distance,
                      durationMin: result.duration,
                    });
                  }}
                  onError={() => {
                    setRouteInfo(null);
                  }}
                />
              ) : null}
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
              <Text style={styles.emptyTitle}>Belum ada panti asuhan terdaftar</Text>
              <Text style={styles.emptyDescription}>
                Panti asuhan akan muncul di sini setelah mereka mendaftar dan mengisi profil kebutuhan mereka.
              </Text>
            </View>
          ) : selectedRequest ? (
            <View style={styles.detailsContent}>
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
                      backgroundColor: selectedRequest.urgency === "Urgent"
                        ? colors.danger
                        : selectedRequest.urgency === "Butuh Bantuan"
                        ? colors.warning
                        : colors.success,
                    },
                  ]}
                >
                  <Text style={styles.priorityBadgeText}>
                    {selectedRequest.urgency || "Normal"}
                  </Text>
                </View>
              </View>

              <View style={styles.populationCard}>
                <Text style={styles.populationLabel}>Jumlah penghuni</Text>
                <Text style={styles.populationValue}>
                  {selectedRequest.population} orang
                </Text>
              </View>
              {routeInfo && (
                <View style={styles.populationCard}>
                  <Text style={styles.populationLabel}>Estimasi rute dari lokasi kamu</Text>
                  <Text style={styles.routeValue}>
                    {routeInfo.distanceKm.toFixed(1)} km •{" "}
                    {Math.round(routeInfo.durationMin)} menit
                  </Text>
                </View>
              )}

              <View style={styles.needGrid}>
                <View style={styles.needCard}>
                  <Text style={styles.needLabel}>Harian</Text>
                  <Text style={styles.needValue}>
                    {resolvedFoodNeeds
                      ? formatNeed(resolvedFoodNeeds.daily)
                      : "Loading..."}
                  </Text>
                  <Text style={styles.needFormula}>
                    population x 2 x {getUrgencyFactor(selectedRequest.urgency)} x 1
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
                    population x 2 x {getUrgencyFactor(selectedRequest.urgency)} x 7
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
                    population x 2 x {getUrgencyFactor(selectedRequest.urgency)} x 30
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
            </View>
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
      </ScrollView>
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
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
      gap: 12,
    },
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      padding: 18,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
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
    addressText: {
      color: colors.textMuted,
      fontSize: 12,
      lineHeight: 16,
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
    filterRow: {
      gap: 8,
      paddingVertical: 4,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 100,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterChipActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.textMuted,
    },
    filterChipTextActive: {
      color: "#ffffff",
    },
    mapCard: {
      height: 380,
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
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      minHeight: 300,
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
    routeValue: {
      color: colors.text,
      fontSize: 18,
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

  });
