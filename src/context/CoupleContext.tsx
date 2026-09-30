import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { App } from "@capacitor/app";
import { supabase } from "../lib/supabase";
import { purgeLocalSpaceData } from "../lib/localData";
import { useAuth } from "./AuthContext";
import type { Couple } from "../types";

interface CoupleContextValue {
  couple: Couple | null;
  role: "owner" | "partner" | null;
  partnerId: string | null;
  loading: boolean;
  createCouple: (name: string) => Promise<{ error: string | null }>;
  joinCouple: (inviteCode: string) => Promise<{ error: string | null }>;
  leaveCouple: () => Promise<{ error: string | null }>;
  renameCouple: (name: string) => Promise<{ error: string | null }>;
  setTogetherSince: (date: string | null) => Promise<{ error: string | null }>;
  refresh: () => Promise<void>;
}

const CoupleContext = createContext<CoupleContextValue | undefined>(undefined);

function coupleCacheKey(userId: string): string {
  return `orbit-couple-cache-${userId}`;
}

function readCoupleCache(userId: string): Couple | null {
  try {
    const raw = localStorage.getItem(coupleCacheKey(userId));
    return raw ? (JSON.parse(raw) as Couple) : null;
  } catch {
    return null;
  }
}

function writeCoupleCache(userId: string, couple: Couple): void {
  try {
    localStorage.setItem(coupleCacheKey(userId), JSON.stringify(couple));
  } catch {
    // stockage indisponible : tant pis, pas de cache hors-ligne cette fois
  }
}

/**
 * Orbit réutilise directement la table `couples` de Wenn comme source de
 * vérité pour le lien de couple : même projet Supabase, mêmes comptes —
 * pas de second système d'invitation à maintenir en parallèle. Si le couple
 * est déjà lié côté Wenn, il l'est automatiquement ici.
 */
export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // L'id et pas l'objet `user` : Supabase recrée ce dernier à chaque
  // événement d'auth (TOKEN_REFRESHED environ toutes les heures), ce qui
  // relançait le chargement — et CoupleGate démontait alors toute l'app.
  const userId = user?.id ?? null;
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);
  // Compte pour lequel l'espace a déjà été chargé une première fois.
  const loadedForRef = useRef<string | null>(null);

  const loadCouple = useCallback(async () => {
    if (!userId) {
      loadedForRef.current = null;
      setCouple(null);
      setLoading(false);
      return;
    }
    // Écran « Chargement... » seulement au premier chargement (ou changement
    // de compte) : les rechargements suivants se font en silence, sans
    // démonter l'app (feuille d'édition ouverte perdue, etc.).
    if (loadedForRef.current !== userId) {
      setLoading(true);
      // Affichage immédiat depuis le dernier couple connu (lancement hors
      // ligne) pendant que le réseau répond, ou à la place s'il ne répond pas.
      setCouple(readCoupleCache(userId));
    }
    try {
      const { data, error } = await supabase
        .from("couples")
        .select("*")
        .or(`owner_id.eq.${userId},partner_id.eq.${userId}`)
        .maybeSingle();
      if (!error) {
        setCouple((data as Couple) ?? null);
        if (data) writeCoupleCache(userId, data as Couple);
        // Plus d'espace pour ce compte (quitté ou supprimé depuis l'autre
        // téléphone) alors que ce téléphone en gardait une copie : on efface
        // tout ce qui en restait ici (sinon réaffiché au lancement hors ligne).
        else if (readCoupleCache(userId)) purgeLocalSpaceData();
      }
    } catch {
      // hors ligne : on garde le cache déjà affiché s'il existe
    } finally {
      loadedForRef.current = userId;
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadCouple();
  }, [loadCouple]);

  // Retour au premier plan : rechargement silencieux, pour rattraper un
  // changement fait pendant que l'app dormait (espace supprimé ou quitté par
  // l'autre, date modifiée...).
  useEffect(() => {
    const listener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) loadCouple();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, [loadCouple]);

  useEffect(() => {
    if (!couple) return;
    // Nom de canal unique (comme useRealtimeCollection) : sur un remontage
    // rapide, Supabase réutiliserait le canal précédent encore en cours de
    // fermeture et le .on() suivant lèverait « tried to subscribe multiple
    // times ».
    const channel = supabase
      .channel(`orbit-couple-${couple.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "couples", filter: `id=eq.${couple.id}` },
        (payload) => setCouple(payload.new as Couple)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id]);

  async function createCouple(name: string) {
    if (!user) return { error: "Non connecté" };
    const { data, error } = await supabase.from("couples").insert({ owner_id: user.id, name }).select().single();
    if (error) return { error: error.message };
    setCouple(data as Couple);
    return { error: null };
  }

  async function joinCouple(inviteCode: string) {
    // Code stocké en minuscules (affiché en majuscules par CSS) : un clavier
    // qui capitalise la saisie le rendait « invalide ».
    const { data, error } = await supabase.rpc("join_couple", { p_invite_code: inviteCode.trim().toLowerCase() });
    if (error) return { error: error.message };
    setCouple(data as Couple);
    return { error: null };
  }

  async function leaveCouple() {
    const { error } = await supabase.rpc("leave_couple");
    if (error) return { error: error.message };
    setCouple(null);
    purgeLocalSpaceData();
    return { error: null };
  }

  async function renameCouple(name: string) {
    if (!couple) return { error: "Aucun couple lié" };
    const trimmed = name.trim();
    if (!trimmed) return { error: "Le nom ne peut pas être vide" };
    const { data, error } = await supabase.from("couples").update({ name: trimmed }).eq("id", couple.id).select().single();
    if (error) return { error: error.message };
    setCouple(data as Couple);
    return { error: null };
  }

  async function setTogetherSince(date: string | null) {
    if (!couple) return { error: "Aucun couple lié" };
    // RPC plutôt qu'un update direct : seule la titulaire a une policy UPDATE
    // sur `couples`, l'update du/de la partenaire ne touchait donc aucune
    // ligne. set_together_since() (SECURITY DEFINER) l'autorise aux deux.
    const { data, error } = await supabase.rpc("set_together_since", { p_date: date });
    if (error) return { error: error.message };
    const updated = data as Couple | null;
    if (updated?.id) setCouple(updated);
    return { error: null };
  }

  const role: "owner" | "partner" | null = !couple || !user ? null : couple.owner_id === user.id ? "owner" : "partner";
  const partnerId = !couple || !user ? null : couple.owner_id === user.id ? couple.partner_id : couple.owner_id;

  return (
    <CoupleContext.Provider
      value={{
        couple,
        role,
        partnerId,
        loading,
        createCouple,
        joinCouple,
        leaveCouple,
        renameCouple,
        setTogetherSince,
        refresh: loadCouple,
      }}
    >
      {children}
    </CoupleContext.Provider>
  );
}

export function useCouple() {
  const ctx = useContext(CoupleContext);
  if (!ctx) throw new Error("useCouple doit être utilisé dans CoupleProvider");
  return ctx;
}
