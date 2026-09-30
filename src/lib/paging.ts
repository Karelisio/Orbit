/**
 * PostgREST (Supabase) plafonne silencieusement chaque lecture à 1000 lignes :
 * au-delà, les lignes suivantes manquaient sans la moindre erreur (ex. plus
 * de trois ans d'historique de cycle dans cycle_days).
 */
export const PAGE_SIZE = 1000;

interface PageResult<T, E> {
  data: T[] | null;
  error: E | null;
}

/**
 * Lit toutes les lignes d'une requête, page par page (`.range(from, to)`),
 * jusqu'à une page incomplète. `build` doit trier de façon déterministe
 * (ex. `.order("id")`), sinon une ligne peut sauter ou revenir d'une page à
 * l'autre. Même contrat que supabase-js : `{ data, error }`, jamais
 * d'exception pour une erreur réseau — la première erreur interrompt tout.
 */
export async function fetchAllRows<T, E = unknown>(
  build: (from: number, to: number) => PromiseLike<PageResult<T, E>>
): Promise<PageResult<T, E>> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return { data: rows, error: null };
  }
}
