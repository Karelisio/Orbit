import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { ThemeModeProvider } from "./context/ThemeModeContext";
import { applyThemeFromSeedColor, DEFAULT_SEED_COLOR } from "./lib/materialYou";
import "./styles/global.css";

applyThemeFromSeedColor(DEFAULT_SEED_COLOR);

if (Capacitor.isNativePlatform()) {
  StatusBar.hide().catch(() => {
    // plateforme sans barre de statut contrôlable : tant pis
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeModeProvider>
        <App />
      </ThemeModeProvider>
    </AuthProvider>
  </StrictMode>
);
