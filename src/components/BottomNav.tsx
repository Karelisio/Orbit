import { NavLink } from "react-router-dom";

const items = [
  { to: "/", icon: "🏠", label: "Accueil" },
  { to: "/calendar", icon: "📅", label: "Calendrier" },
  { to: "/tasks", icon: "✅", label: "Tâches" },
  { to: "/budget", icon: "💶", label: "Budget" },
  { to: "/journal", icon: "📓", label: "Journal" },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {items.map((item) => (
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
