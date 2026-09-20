import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { StatusBar } from "@capacitor/status-bar";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./context/AuthContext";
import { ThemeModeProvider } from "./context/ThemeModeContext";
import { applyThemeFromSeedColor, DEFAULT_SEED_COLOR } from "./lib/materialYou";
import { initDeepLinks } from "./lib/deepLink";
import "./styles/global.css";

// Ce code tourne avant le montage de React : une exception ici ne serait
// rattrapée par aucun ErrorBoundary et laisserait un écran vide silencieux.
try {
  applyThemeFromSeedColor(DEFAULT_SEED_COLOR);
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("applyThemeFromSeedColor a échoué :", err);
}

try {
  initDeepLinks();
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("initDeepLinks a échoué :", err);
}

if (Capacitor.isNativePlatform()) {
  StatusBar.hide().catch(() => {
    // plateforme sans barre de statut contrôlable : tant pis
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeModeProvider>
          <App />
        </ThemeModeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
