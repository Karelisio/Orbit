import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.karelisio.orbit",
  appName: "Orbit",
  webDir: "dist",
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_orbit",
      iconColor: "#6750A4",
    },
  },
};

export default config;
