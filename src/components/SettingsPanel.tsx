import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Volume2, User } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Profile } from "../lib/types";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onProfileUpdate: () => void;
}

export default function SettingsPanel({
  open,
  onClose,
  profile,
  onProfileUpdate,
}: SettingsPanelProps) {
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [pitch, setPitch] = useState(profile?.voice_settings?.pitch ?? 0.7);
  const [rate, setRate] = useState(profile?.voice_settings?.rate ?? 0.85);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!profile) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        voice_settings: { pitch, rate, volume: 1.0 },
      })
      .eq("id", profile.id);
    onProfileUpdate();
    setSaving(false);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={styles.panel}
        >
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <Settings size={20} style={{ color: "var(--accent-primary)" }} />
              <h2 style={styles.title}>Configuration</h2>
            </div>
            <button onClick={onClose} style={styles.closeBtn}>
              <X size={18} />
            </button>
          </div>

          <div style={styles.content}>
            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <User size={14} />
                Identity
              </div>
              <label style={styles.label}>Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={styles.textInput}
                placeholder="Enter display name"
              />
            </div>

            <div style={styles.section}>
              <div style={styles.sectionTitle}>
                <Volume2 size={14} />
                Voice Parameters
              </div>

              <label style={styles.label}>
                Pitch: {pitch.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                style={styles.slider}
              />

              <label style={styles.label}>
                Rate: {rate.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                style={styles.slider}
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={save}
              disabled={saving}
              style={styles.saveBtn}
            >
              {saving ? "Saving..." : "Save Configuration"}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: "fixed",
    top: 0,
    right: 0,
    width: 380,
    height: "100vh",
    background: "var(--bg-secondary)",
    borderLeft: "1px solid var(--border-default)",
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    boxShadow: "var(--shadow-lg)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 20px 16px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    color: "var(--text-primary)",
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-primary)",
    color: "var(--text-muted)",
    cursor: "pointer",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 16,
  },
  label: {
    display: "block",
    fontSize: 12,
    color: "var(--text-muted)",
    marginBottom: 6,
    fontFamily: "var(--font-mono)",
  },
  textInput: {
    width: "100%",
    padding: "10px 14px",
    background: "var(--bg-primary)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
  },
  slider: {
    width: "100%",
    marginBottom: 12,
    accentColor: "var(--accent-primary)",
  },
  saveBtn: {
    width: "100%",
    padding: "12px 0",
    border: "none",
    borderRadius: "var(--radius-md)",
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
    color: "white",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
