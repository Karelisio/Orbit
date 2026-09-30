/**
 * Message court en bas de l'écran, pour dire qu'une action déjà affichée
 * n'a finalement pas abouti (écriture optimiste annulée, copie impossible...).
 * Un seul à la fois : un nouveau remplace le précédent. Module sans React,
 * appelable de n'importe où (hooks, lib) ; affiché par components/Toast.tsx.
 */
export interface ToastMessage {
  id: number;
  message: string;
}

const TOAST_DURATION_MS = 4000;

let current: ToastMessage | null = null;
let nextId = 1;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function showToast(message: string): void {
  current = { id: nextId++, message };
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    current = null;
    emit();
  }, TOAST_DURATION_MS);
  emit();
}

export function getToast(): ToastMessage | null {
  return current;
}

export function subscribeToast(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
