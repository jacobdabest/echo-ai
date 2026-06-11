import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Mail, Lock, User, ArrowRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export default function Auth() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(email, password);
      } else {
        if (!username.trim()) {
          setError("Username is required");
          setLoading(false);
          return;
        }
        await signUp(email, password, username.trim());
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.gridOverlay} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={styles.card}
      >
        <div style={styles.logoArea}>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            style={styles.logoIcon}
          >
            <Zap size={28} />
          </motion.div>
          <h1 style={styles.title}>ECHO</h1>
          <p style={styles.subtitle}>Advanced Intelligence System</p>
        </div>

        <div style={styles.tabRow}>
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setError("");
              }}
              style={{
                ...styles.tab,
                ...(mode === m ? styles.tabActive : {}),
              }}
            >
              {m === "login" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <AnimatePresence mode="wait">
            {mode === "register" && (
              <motion.div
                key="username"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 64 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div style={styles.inputWrap}>
                  <User size={16} style={styles.inputIcon} />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={styles.inputWrap}>
            <Mail size={16} style={styles.inputIcon} />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputWrap}>
            <Lock size={16} style={styles.inputIcon} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={styles.error}
            >
              {error}
            </motion.p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              ...styles.submitBtn,
              ...(loading ? styles.submitBtnLoading : {}),
            }}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              <>
                {mode === "login" ? "Initialize Session" : "Create Identity"}
                <ArrowRight size={16} />
              </>
            )}
          </motion.button>
        </form>

        <div style={styles.terminal}>
          <span style={styles.terminalDot} />
          <span style={{ color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            ECHO v2.0 // NEURAL INTERFACE READY
          </span>
        </div>
      </motion.div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(14,165,233,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.03) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 400,
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-xl)",
    padding: "40px 32px 32px",
    boxShadow: "var(--shadow-lg), 0 0 80px rgba(14,165,233,0.05)",
  },
  logoArea: {
    textAlign: "center",
    marginBottom: 32,
  },
  logoIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 56,
    height: 56,
    borderRadius: 16,
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
    color: "white",
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 600,
    letterSpacing: "0.15em",
    color: "var(--text-primary)",
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: "var(--text-muted)",
    marginTop: 4,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  tabRow: {
    display: "flex",
    gap: 4,
    background: "var(--bg-primary)",
    borderRadius: "var(--radius-md)",
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    padding: "10px 0",
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  tabActive: {
    background: "var(--bg-surface)",
    color: "var(--text-primary)",
    boxShadow: "var(--shadow-sm)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    overflow: "hidden",
  },
  inputWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "12px 14px 12px 42px",
    background: "var(--bg-primary)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    transition: "border-color var(--transition-fast)",
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "13px 0",
    marginTop: 8,
    border: "none",
    borderRadius: "var(--radius-md)",
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
    color: "white",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.02em",
  },
  submitBtnLoading: {
    opacity: 0.7,
    cursor: "not-allowed",
  },
  spinner: {
    width: 18,
    height: 18,
    border: "2px solid rgba(255,255,255,0.3)",
    borderTopColor: "white",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  error: {
    color: "var(--accent-error)",
    fontSize: 13,
    textAlign: "center",
    padding: "8px 0 0",
  },
  terminal: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    padding: "10px 14px",
    background: "var(--bg-primary)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-subtle)",
  },
  terminalDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--accent-success)",
    boxShadow: "0 0 8px var(--accent-success)",
  },
};
