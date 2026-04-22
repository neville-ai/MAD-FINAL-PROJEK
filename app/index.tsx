import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {
  const [role, setRole] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        // [SISTEM SAYA TAMBAHKAN SEMENTARA UNTUK MERESET MEMORI HP ANDA]
        // await AsyncStorage.clear(); 
        
        const storedRole = await AsyncStorage.getItem("userRole");
        if (storedRole) {
          setRole(storedRole);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsChecking(false);
      }
    }
    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!role) {
    return <Redirect href="/onboarding"/>;
  }

  // if (role === "donor") {
  //   return <Redirect href={"/(tabs)" as any} />;
  // } else {
  //   return <Redirect href={"/(tabs)/receiver-dashboard" as any} />;
  // }
  if (role === "donor") {
    return <Redirect href={"/(donor)" as any} />;
  } else {
    return <Redirect href={"/(panti)" as any} />;
  }
}
