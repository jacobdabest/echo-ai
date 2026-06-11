import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MessageSquare,
  Trash2,
  Brain,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Conversation } from "../lib/types";

interface SidebarProps {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onMemoryClick: () => void;
  onSettingsClick: () => void;
  onSignOut: () => void;
  displayName: string;
}

export default function Sidebar({
  conversations,
  currentId,
  onSelect,
  onCreate,
  onDelete,
  onMemoryClick,
  onSettingsClick,
  onSignOut,
  displayName,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 280 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      style={styles.sidebar}
    >
      <div style={styles.header}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.brand}
          >
            <div style={styles.brandIcon}>
              <Brain size={20} />
            </div>
            <span style={styles.brandText}>ECHO</span>
          </motion.div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={styles.collapseBtn}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <button onClick={onCreate} style={styles.newChatBtn}>
        <Plus size={18} />
        {!collapsed && <span>New Session</span>}
      </button>

      <div style={styles.conversationList}>
        <AnimatePresence>
          {conversations.map((conv: Conversation) => (
            <motion.div
              key={conv.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => onSelect(conv.id)}
              style={{
                ...styles.convItem,
                ...(currentId === conv.id ? styles.convItemActive : {}),
              }}
            >
              <MessageSquare size={14} style={{ flexShrink: 0 }} />
              {!collapsed && (
                <span style={styles.convTitle}>
                  {conv.title || "New Session"}
                </span>
              )}
              {!collapsed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div style={styles.footer}>
        {!collapsed && (
          <div style={styles.userName}>{displayName}</div>
        )}
        <div style={styles.footerActions}>
          <button onClick={onMemoryClick} style={styles.footerBtn} title="Memory">
            <Brain size={16} />
          </button>
          <button onClick={onSettingsClick} style={styles.footerBtn} title="Settings">
            <Settings size={16} />
          </button>
          <button onClick={onSignOut} style={styles.footerBtn} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "var(--bg-secondary)",
    borderRight: "1px solid var(--border-default)",
    overflow: "hidden",
    flexShrink: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 12px",
    borderBottom: "1px solid var(--border-subtle)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 10,
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
    color: "white",
  },
  brandText: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: "0.12em",
    color: "var(--text-primary)",
  },
  collapseBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  newChatBtn: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    margin: "12px 12px 8px",
    padding: "10px 14px",
    border: "1px dashed var(--border-default)",
    borderRadius: "var(--radius-md)",
    background: "transparent",
    color: "var(--text-secondary)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  conversationList: {
    flex: 1,
    overflowY: "auto",
    padding: "4px 12px",
  },
  convItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: "var(--radius-md)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
    marginBottom: 2,
    color: "var(--text-secondary)",
    position: "relative",
  },
  convItemActive: {
    background: "var(--accent-primary-dim)",
    color: "var(--accent-primary)",
    border: "1px solid var(--border-active)",
  },
  convTitle: {
    flex: 1,
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  deleteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    opacity: 0,
    transition: "all var(--transition-fast)",
    flexShrink: 0,
  },
  footer: {
    padding: "12px",
    borderTop: "1px solid var(--border-subtle)",
  },
  userName: {
    fontSize: 12,
    color: "var(--text-muted)",
    textAlign: "center",
    marginBottom: 8,
    fontFamily: "var(--font-mono)",
  },
  footerActions: {
    display: "flex",
    justifyContent: "center",
    gap: 8,
  },
  footerBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    border: "none",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-primary)",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
};
