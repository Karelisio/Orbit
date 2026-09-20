import { format } from "date-fns";
import DateField from "./DateField";

interface DateTimeFieldProps {
  value: string; // "yyyy-MM-ddTHH:mm"
  onChange: (value: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

/**
 * Remplace `<input type="datetime-local">` : même bug que le date-picker
 * natif Android (dialogue cassé/vide dans la WebView Capacitor). La partie
 * date réutilise DateField ; l'heure passe par deux <select> natifs, qui eux
 * s'affichent correctement.
 */
export default function DateTimeField({ value, onChange }: DateTimeFieldProps) {
  const [datePart, timePart] = value ? value.split("T") : ["", ""];
  const [hourStr, minuteStr] = (timePart || "09:00").split(":");

  function setDate(date: string) {
    onChange(date ? `${date}T${timePart || "09:00"}` : "");
  }

  function setHour(h: string) {
    const d = datePart || format(new Date(), "yyyy-MM-dd");
    onChange(`${d}T${h}:${minuteStr || "00"}`);
  }

  function setMinute(m: string) {
    const d = datePart || format(new Date(), "yyyy-MM-dd");
    onChange(`${d}T${hourStr || "09"}:${m}`);
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ flex: 1 }}>
        <DateField value={datePart} onChange={setDate} placeholder="Date" clearLabel="Effacer" />
      </div>
      <select className="input" value={hourStr} onChange={(e) => setHour(e.target.value)} style={{ width: 78 }}>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h} h
          </option>
        ))}
      </select>
      <select className="input" value={minuteStr} onChange={(e) => setMinute(e.target.value)} style={{ width: 70 }}>
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
