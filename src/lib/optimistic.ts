interface WithId {
  id: string;
}

/**
 * Annule une écriture optimiste ligne par ligne, sur l'état `current` du
 * moment : chaque ligne qu'elle a modifiée ou retirée (`before` -> `after`)
 * reprend sa version d'avant, chaque ligne qu'elle a ajoutée disparaît —
 * sauf si, entre-temps, un rechargement ou un écho temps réel l'a déjà
 * remplacée (on garde alors cette version plus récente, et les autres lignes
 * ne bougent pas). Renvoie null s'il n'y a rien à changer.
 */
export function revertOptimistic<T extends WithId>(current: T[], before: T[], after: T[]): T[] | null {
  const beforeById = new Map(before.map((row) => [row.id, row]));
  const afterById = new Map(after.map((row) => [row.id, row]));
  let rows = current;
  let changed = false;
  for (const [id, previous] of beforeById) {
    const optimistic = afterById.get(id);
    if (optimistic === previous) continue;
    const now = rows.find((row) => row.id === id);
    if (optimistic === undefined && !now) {
      rows = [...rows, previous];
      changed = true;
    } else if (optimistic !== undefined && now === optimistic) {
      rows = rows.map((row) => (row.id === id ? previous : row));
      changed = true;
    }
  }
  for (const [id, added] of afterById) {
    if (beforeById.has(id) || !rows.includes(added)) continue;
    rows = rows.filter((row) => row !== added);
    changed = true;
  }
  return changed ? rows : null;
}
