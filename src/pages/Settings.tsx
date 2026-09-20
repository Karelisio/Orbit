import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import { useCouple } from "../context/CoupleContext";
import { useThemeMode } from "../context/ThemeModeContext";
import { supabase } from "../lib/supabase";
import { requestNotificationPermission } from "../lib/notifications";

export default function Settings() {
  const { user, profile, signOut } = useAuth();
  const { couple, role, leaveCouple, renameCouple, setTogetherSince } = useCouple();
  const { mode, setMode, setThemeImageUrl } = useThemeMode();

  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [nameInput, setNameInput] = useState(couple?.name ?? "");
  const [renaming, setRenaming] = useState(false);
  const [renameStatus, setRenameStatus] = useState<string | null>(null);
  const [togetherSince, setTogetherSinceInput] = useState(couple?.together_since ?? "");
  const [notifStatus, setNotifStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setNameInput(couple?.name ?? ""), [couple?.name]);
  useEffect(() => setTogetherSinceInput(couple?.together_since ?? ""), [couple?.together_since]);

  async function handleRename() {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === couple?.name) return;
    setRenaming(true);
    setRenameStatus(null);
    const { error } = await renameCouple(trimmed);
    setRenaming(false);
    setRenameStatus(error ?? "Nom mis à jour ✅");
  }

  async function handleTogetherSinceSave() {
    await setTogetherSince(togetherSince || null);
  }

  async function handleImagePick(file: File) {
    if (!user) return;
    setUploading(true);
    const path = `${user.id}/orbit-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("theme-images").upload(path, file, { upsert: true });
    if (!uploadError) {
      const { data } = supabase.storage.from("theme-images").getPublicUrl(path);
      await setThemeImageUrl(data.publicUrl);
    }
    setUploading(false);
  }

  async function copyInviteCode() {
    if (!couple) return;
    await navigator.clipboard.writeText(couple.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleEnableNotifications() {
    if (!Capacitor.isNativePlatform()) {
      setNotifStatus("Les notifications natives ne sont actives que dans l'app installée (Android/iOS).");
      return;
    }
    const granted = await requestNotificationPermission();
    setNotifStatus(granted ? "Notifications activées ✅" : "Permission refusée.");
  }

  async function handleLeaveCouple() {
    const warning =
      role === "owner"
        ? "Quitter supprimera définitivement cet espace Orbit (événements, tâches, budget, journal). Le lien avec ton/ta partenaire sera aussi rompu, y compris côté Wenn. Continuer ?"
        : "Tu vas te délier de cet espace. Les données de la titulaire ne sont pas affectées. Continuer ?";
    if (!window.confirm(warning)) return;
    setLeaving(true);
    const { error } = await leaveCouple();
    setLeaving(false);
    if (error) window.alert(error);
  }

  return (
    <div className="screen">
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: "0 0 2px" }}>Réglages</h1>
        <p style={{ margin: 0, color: "var(--md-sys-color-on-surface-variant)" }}>{user?.email}</p>
      </header>

      {Capacitor.getPlatform() !== "android" && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 className="section-title">Apparence — Material You</h3>
          <p style={{ marginTop: 0, fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>
            Choisis une image : les couleurs de l'app s'adapteront automatiquement (sur Android, l'app suit directement
            le fond d'écran du téléphone).
          </p>
          {profile?.theme_image_url && (
            <img
              src={profile.theme_image_url}
              alt="Fond choisi"
              style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: "var(--radius-m)", marginBottom: 12 }}
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImagePick(file);
            }}
          />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Chargement..." : "Choisir une image"}
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="section-title">Thème</h3>
        <div style={{ display: "flex", gap: 8 }}>
          {(["system", "light", "dark"] as const).map((m) => (
            <button key={m} className={`chip${mode === m ? " selected" : ""}`} onClick={() => setMode(m)}>
              {m === "system" ? "Système" : m === "light" ? "Clair" : "Sombre"}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="section-title">Notifications</h3>
        <p style={{ marginTop: 0, fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>
          Autorise les notifications pour recevoir les rappels d'événements programmés.
        </p>
        <button className="btn btn-primary" onClick={handleEnableNotifications}>
          Activer les notifications
        </button>
        {notifStatus && <p style={{ fontSize: 13, marginTop: 10 }}>{notifStatus}</p>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="section-title">Jours ensemble</h3>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input"
            type="date"
            value={togetherSince}
            onChange={(e) => setTogetherSinceInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary" onClick={handleTogetherSinceSave} disabled={togetherSince === (couple?.together_since ?? "")}>
            Enregistrer
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 className="section-title">Couple lié</h3>

        {role === "owner" ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
            <input
              className="input"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Nom de l'espace"
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-secondary"
              onClick={handleRename}
              disabled={renaming || !nameInput.trim() || nameInput.trim() === couple?.name}
            >
              {renaming ? "..." : "Renommer"}
            </button>
          </div>
        ) : (
          <p style={{ marginTop: 0 }}>{couple?.name}</p>
        )}
        <p style={{ marginTop: 0, fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>
          {renameStatus}
        </p>

        {couple?.partner_id ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--md-sys-color-secondary-container)",
              color: "var(--md-sys-color-on-secondary-container)",
              borderRadius: "var(--radius-m)",
              padding: "10px 14px",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
            }}
          >
            🔗 Compte lié — synchronisation active
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "var(--md-sys-color-on-surface-variant)" }}>
              Partage ce code pour lier ton/ta partenaire (même code que sur Wenn) :
            </p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <code className="chip" style={{ fontSize: 16, letterSpacing: 2 }}>
                {couple?.invite_code}
              </code>
              <button className="btn btn-text" onClick={copyInviteCode}>
                {copied ? "Copié !" : "Copier"}
              </button>
            </div>
          </>
        )}
        <button className="btn btn-text" onClick={handleLeaveCouple} disabled={leaving} style={{ marginTop: 12, color: "var(--md-sys-color-error)" }}>
          {leaving ? "..." : "Quitter cet espace"}
        </button>
      </div>

      <button className="btn btn-text" onClick={signOut}>
        Se déconnecter
      </button>
    </div>
  );
}
