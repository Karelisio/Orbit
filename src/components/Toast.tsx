import { useSyncExternalStore } from "react";
import { getToast, subscribeToast } from "../lib/toast";

/** Affiche le message de lib/toast.ts, au-dessus de la barre de navigation. */
export default function Toast() {
  const toast = useSyncExternalStore(subscribeToast, getToast);
  if (!toast) return null;
  return (
    <div key={toast.id} className="toast" role="status" aria-live="polite">
      {toast.message}
    </div>
  );
}
