import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, StickyNote, Bookmark, Search, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Memory } from "../lib/types";

interface MemoryPanelProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export default function MemoryPanel({ open, onClose, userId }: MemoryPanelProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) fetchMemories();
  }, [open, filter]);

  async function fetchMemories() {
    let query = supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter !== "all") query = query.eq("type", filter);
    const { data } = await query;
    setMemories(data ?? []);
  }

  async function deleteMemory(id: string) {
    await supabase.from("memories").delete().eq("id", id);
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  const filtered = memories.filter((m) =>
    m.content.toLowerCase().includes(search.toLowerCase())
  );

  const typeIcon: Record<string, React.ReactNode> = {
    fact: <Brain size={14} />,
    note: <StickyNote size={14} />,
    preference: <Bookmark size={14} />,
    research_topic: <Search size={14} />,
    shortcut: <Bookmark size={14} />,
  };

  const typeColor: Record<string, string> = {
    fact: "var(--accent-primary)",
    note: "var(--accent-warning)",
    preference: "var(--accent-success)",
    research_topic: "var(--accent-secondary)",
    shortcut: "var(--text-muted)",
  };

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
              <Brain size={20} style={{ color: "var(--accent-primary)" }} />
              <h2 style={styles.title}>Memory Matrix</h2>
            </div>
            <button onClick={onClose} style={styles.closeBtn}>
              <X size={18} />
            </button>
          </div>

          <div style={styles.searchWrap}>
            <Search size={14} style={styles.searchIcon} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search memories..."
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterRow}>
            {["all", "fact", "note", "preference", "research_topic"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  ...styles.filterBtn,
                  ...(filter === f ? styles.filterBtnActive : {}),
                }}
              >
                {f === "all" ? "All" : f.replace("_", " ")}
              </button>
            ))}
          </div>

          <div style={styles.list}>
            {filtered.length === 0 && (
              <p style={styles.empty}>No memories recorded yet.</p>
            )}
            {filtered.map((mem) => (
              <motion.div
                key={mem.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={styles.memItem}
              >
                <div
                  style={{
                    ...styles.memType,
                    color: typeColor[mem.type] ?? "var(--text-muted)",
                  }}
                >
                  {typeIcon[mem.type] ?? <Bookmark size={14} />}
                  <span style={{ fontSize: 11, textTransform: "capitalize" }}>
                    {mem.type.replace("_", " ")}
                  </span>
                </div>
                <p style={styles.memContent}>{mem.content}</p>
                <button
                  onClick={() => deleteMemory(mem.id)}
                  style={styles.memDelete}
                >
                  <Trash2 size={11} />
                </button>
              </motion.div>
            ))}
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
  searchWrap: {
    position: "relative",
    margin: "12px 20px 0",
  },
  searchIcon: {
    position: "absolute",
    left: 12,
    top: "50%",
    transform: "translateY(-50%)",
    color: "var(--text-muted)",
  },
  searchInput: {
    width: "100%",
    padding: "10px 12px 10px 36px",
    background: "var(--bg-primary)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-md)",
    color: "var(--text-primary)",
    fontSize: 13,
    outline: "none",
  },
  filterRow: {
    display: "flex",
    gap: 6,
    padding: "12px 20px",
    overflowX: "auto",
  },
  filterBtn: {
    padding: "5px 12px",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--text-muted)",
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all var(--transition-fast)",
  },
  filterBtnActive: {
    background: "var(--accent-primary-dim)",
    border: "1px solid var(--border-active)",
    color: "var(--accent-primary)",
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "0 20px 20px",
  },
  empty: {
    color: "var(--text-muted)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
  memItem: {
    padding: "12px 14px",
    marginBottom: 8,
    background: "var(--bg-primary)",
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-md)",
    position: "relative",
  },
  memType: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  memContent: {
    fontSize: 13,
    color: "var(--text-secondary)",
    lineHeight: 1.5,
    paddingRight: 24,
  },
  memDelete: {
    position: "absolute",
    top: 10,
    right: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 22,
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    opacity: 0.5,
  },
};
