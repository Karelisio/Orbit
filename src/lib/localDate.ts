import { isValid, parseISO } from "date-fns";

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Date "aaaa-mm-jj" reçue de l'extérieur (lien io.karelisio.orbit://calendar
 * ?date=..., paramètre d'URL) : renvoyée telle quelle si elle désigne un jour
 * qui existe, sinon null. Sans cette vérification, une date invalide arrivait
 * jusqu'à format() dans Calendar.tsx (RangeError : écran d'erreur).
 */
export function parseDateParam(value: string | null | undefined): string | null {
  if (!value || !DATE_PARAM.test(value)) return null;
  return isValid(parseISO(value)) ? value : null;
}
