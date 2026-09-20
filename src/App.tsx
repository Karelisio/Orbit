import { Navigate, HashRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { CoupleProvider, useCouple } from "./context/CoupleContext";
import { PreferencesProvider } from "./context/PreferencesContext";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import Calendar from "./pages/Calendar";
import Tasks from "./pages/Tasks";
import Budget from "./pages/Budget";
import Journal from "./pages/Journal";
import Settings from "./pages/Settings";
import BottomNav from "./components/BottomNav";
import WidgetSync from "./components/WidgetSync";

function AppShell() {
  return (
    <div className="app-shell">
      <WidgetSync />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}

function CoupleGate() {
  const { couple, loading } = useCouple();
  if (loading) return <div className="center-screen">Chargement...</div>;
  if (!couple) return <Onboarding />;
  return (
    <PreferencesProvider>
      <AppShell />
    </PreferencesProvider>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  return (
    <HashRouter>
      {loading ? (
        <div className="center-screen">Chargement...</div>
      ) : !session ? (
        <Login />
      ) : (
        <CoupleProvider>
          <CoupleGate />
        </CoupleProvider>
      )}
    </HashRouter>
  );
}
