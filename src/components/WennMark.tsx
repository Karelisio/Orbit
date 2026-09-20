/** Marque Wenn (anneau + point) — identique au logo de l'app Wenn, dont Orbit lit les données de cycle. */
export default function WennMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#F6C9DC" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="#E0577E" strokeWidth="6.5" />
      <circle cx="67" cy="31" r="9" fill="#A13A5C" />
    </svg>
  );
}
