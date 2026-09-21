import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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

// Pas de StatusBar.hide() ici : c'était un reste du mode plein écran annulé.
// Android réaffichait la barre masquée en surimpression sur un fond noir, d'où
// la bande noire en haut — la barre d'état reste donc normale, et le contenu
// est décalé dessous par la zone de sécurité CSS (voir .app-shell).

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
