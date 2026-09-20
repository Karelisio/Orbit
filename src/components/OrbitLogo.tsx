/** Marque Orbit (deux anneaux entrelacés) — même dessin que l'icône de l'app. */
export default function OrbitLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 108 108" aria-hidden="true">
      <circle cx="54" cy="54" r="54" fill="#6750A4" />
      <circle cx="42" cy="54" r="20" fill="none" stroke="#FFFFFF" strokeWidth="8" />
      <circle cx="66" cy="54" r="20" fill="none" stroke="#F3B6D6" strokeWidth="8" />
    </svg>
  );
}
