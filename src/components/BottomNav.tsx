import { NavLink } from "react-router-dom";
import { usePreferences, type NavTab } from "../context/PreferencesContext";

const items: { to: string; icon: string; label: string; tab: NavTab | null }[] = [
  { to: "/", icon: "🏠", label: "Accueil", tab: null },
  { to: "/calendar", icon: "📅", label: "Calendrier", tab: "calendar" },
  { to: "/tasks", icon: "✅", label: "Tâches", tab: "tasks" },
  { to: "/budget", icon: "💶", label: "Budget", tab: "budget" },
  { to: "/journal", icon: "📓", label: "Journal", tab: "journal" },
];

export default function BottomNav() {
  const { navTabs } = usePreferences();
  const visibleItems = items.filter((item) => item.tab === null || navTabs[item.tab]);

  return (
    <nav className="bottom-nav">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
