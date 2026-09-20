import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.karelisio.orbit",
  appName: "Orbit",
  webDir: "dist",
  plugins: {
    LocalNotifications: {
      iconColor: "#6750A4",
    },
  },
};

export default config;
