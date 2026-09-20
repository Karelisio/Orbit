import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
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

/**
 * Orbit réutilise directement la table `couples` de Wenn comme source de
 * vérité pour le lien de couple : même projet Supabase, mêmes comptes —
 * pas de second système d'invitation à maintenir en parallèle. Si le couple
 * est déjà lié côté Wenn, il l'est automatiquement ici.
 */
export function CoupleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [couple, setCouple] = useState<Couple | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCouple = useCallback(async () => {
    if (!user) {
      setCouple(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("couples")
      .select("*")
      .or(`owner_id.eq.${user.id},partner_id.eq.${user.id}`)
      .maybeSingle();
    setCouple((data as Couple) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadCouple();
  }, [loadCouple]);

  useEffect(() => {
    if (!couple) return;
    const channel = supabase
      .channel(`orbit-couple-${couple.id}`)
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
    const { data, error } = await supabase.rpc("join_couple", { p_invite_code: inviteCode.trim() });
    if (error) return { error: error.message };
    setCouple(data as Couple);
    return { error: null };
  }

  async function leaveCouple() {
    const { error } = await supabase.rpc("leave_couple");
    if (error) return { error: error.message };
    setCouple(null);
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
    const { data, error } = await supabase
      .from("couples")
      .update({ together_since: date })
      .eq("id", couple.id)
      .select()
      .single();
    if (error) return { error: error.message };
    setCouple(data as Couple);
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
