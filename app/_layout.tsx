import { ConvexProvider } from "convex/react";
import { Stack } from "expo-router";

import { ThemeProvider } from "@/hooks/useTheme";
import { convex } from "@/lib/convex";

export default function RootLayout() {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {/* Root stack uses individual screen files in app/ — remove reference to non-existent (tabs) group */}
        </Stack>
      </ThemeProvider>
    </ConvexProvider>
  );
}
