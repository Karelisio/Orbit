import { format } from "date-fns";
import DateField from "./DateField";

interface DateTimeFieldProps {
  value: string; // "yyyy-MM-ddTHH:mm"
  onChange: (value: string) => void;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}

/**
 * Remplace `<input type="datetime-local">` : même bug que le date-picker
 * natif Android (dialogue cassé/vide dans la WebView Capacitor). La partie
 * date réutilise DateField ; l'heure passe par deux champs numériques (un
 * `<select>` ouvre lui aussi une liste native qui s'affiche mal ici).
 */
export default function DateTimeField({ value, onChange }: DateTimeFieldProps) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const [hourStr, minuteStr] = (timePart || "09:00").split(":");

  function setDate(date: string) {
    onChange(date ? `${date}T${timePart || "09:00"}` : "");
  }

  function setHour(raw: string) {
    const d = datePart || format(new Date(), "yyyy-MM-dd");
    const h = clamp(Number(raw), 0, 23);
    onChange(`${d}T${String(h).padStart(2, "0")}:${minuteStr || "00"}`);
  }

  function setMinute(raw: string) {
    const d = datePart || format(new Date(), "yyyy-MM-dd");
    const m = clamp(Number(raw), 0, 59);
    onChange(`${d}T${hourStr || "09"}:${String(m).padStart(2, "0")}`);
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <div style={{ flex: 1 }}>
        <DateField value={datePart} onChange={setDate} placeholder="Date" clearLabel="Effacer" />
      </div>
      <input
        className="input"
        type="number"
        min={0}
        max={23}
        value={hourStr}
        onChange={(e) => setHour(e.target.value)}
        style={{ width: 62, padding: "8px 6px", textAlign: "center" }}
        aria-label="Heure"
      />
      <span>h</span>
      <input
        className="input"
        type="number"
        min={0}
        max={59}
        value={minuteStr}
        onChange={(e) => setMinute(e.target.value)}
        style={{ width: 62, padding: "8px 6px", textAlign: "center" }}
        aria-label="Minute"
      />
    </div>
  );
}
