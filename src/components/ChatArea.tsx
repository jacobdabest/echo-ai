import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Volume2, VolumeX, Brain, Zap, Terminal } from "lucide-react";
import type { Message } from "../lib/types";

interface ChatAreaProps {
  messages: Message[];
  loading: boolean;
  onSend: (message: string) => void;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
  displayName: string;
}

export default function ChatArea({
  messages,
  loading,
  onSend,
  voiceEnabled,
  onToggleVoice,
  displayName,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput("");
  }

  function speak(text: string) {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 0.7;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div style={styles.container}>
      {messages.length === 0 && !loading && (
        <div style={styles.emptyState}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            style={styles.emptyIcon}
          >
            <Zap size={40} />
          </motion.div>
          <h2 style={styles.emptyTitle}>ECHO Online</h2>
          <p style={styles.emptySub}>Systems operational. Awaiting input, {displayName}.</p>
          <div style={styles.suggestions}>
            {["Analyze a complex topic", "Write code for me", "Research something", "Explain quantum computing"].map(
              (s) => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  style={styles.suggestionBtn}
                >
                  {s}
                </button>
              )
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} style={styles.messagesArea}>
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i === messages.length - 1 ? 0 : 0 }}
              style={{
                ...styles.messageRow,
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              {msg.role === "assistant" && (
                <div style={styles.avatar}>
                  <Brain size={14} />
                </div>
              )}
              <div
                style={{
                  ...styles.messageBubble,
                  ...(msg.role === "user" ? styles.userBubble : styles.assistantBubble),
                }}
              >
                <div style={styles.messageContent}>{msg.content}</div>
                {msg.role === "assistant" && msg.voice_text && voiceEnabled && (
                  <button
                    onClick={() => speak(msg.voice_text!)}
                    style={styles.voiceBtn}
                    title="Speak"
                  >
                    <Volume2 size={12} />
                  </button>
                )}
                {msg.role === "assistant" && msg.agent_commands && msg.agent_commands.length > 0 && (
                  <div style={styles.agentBadge}>
                    <Terminal size={10} />
                    <span>{msg.agent_commands.length} agent action{msg.agent_commands.length > 1 ? "s" : ""}</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ ...styles.messageRow, justifyContent: "flex-start" }}
          >
            <div style={styles.avatar}>
              <Brain size={14} />
            </div>
            <div style={styles.typingBubble}>
              <span style={styles.typingDot} />
              <span style={{ ...styles.typingDot, animationDelay: "0.2s" }} />
              <span style={{ ...styles.typingDot, animationDelay: "0.4s" }} />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={styles.inputArea}>
        <div style={styles.inputWrap}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter command..."
            style={styles.input}
            disabled={loading}
          />
          <button
            type="button"
            onClick={onToggleVoice}
            style={{
              ...styles.iconBtn,
              ...(voiceEnabled ? styles.iconBtnActive : {}),
            }}
            title={voiceEnabled ? "Disable voice" : "Enable voice"}
          >
            {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            style={styles.sendBtn}
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    height: "100%",
    overflow: "hidden",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: 32,
  },
  emptyIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 80,
    height: 80,
    borderRadius: 24,
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
    color: "white",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: 8,
    letterSpacing: "0.05em",
  },
  emptySub: {
    fontSize: 14,
    color: "var(--text-muted)",
    marginBottom: 32,
  },
  suggestions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    maxWidth: 500,
  },
  suggestionBtn: {
    padding: "8px 16px",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-lg)",
    background: "var(--bg-secondary)",
    color: "var(--text-secondary)",
    fontSize: 13,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 24px 16px",
  },
  messageRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 16,
  },
  avatar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 8,
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
    color: "white",
    flexShrink: 0,
    marginTop: 2,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: "var(--radius-lg)",
    position: "relative",
    lineHeight: 1.6,
    fontSize: 14,
  },
  userBubble: {
    background: "var(--accent-primary-dim)",
    border: "1px solid var(--border-active)",
    color: "var(--text-primary)",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    color: "var(--text-primary)",
    borderBottomLeftRadius: 4,
  },
  messageContent: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  voiceBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    padding: "4px 10px",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-primary)",
    color: "var(--text-muted)",
    fontSize: 11,
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  agentBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    padding: "3px 8px",
    borderRadius: "var(--radius-sm)",
    background: "var(--accent-primary-dim)",
    color: "var(--accent-primary)",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
  },
  typingBubble: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    padding: "14px 18px",
    background: "var(--bg-surface)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-lg)",
    borderBottomLeftRadius: 4,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background: "var(--accent-primary)",
    animation: "typing-dot 1.4s ease-in-out infinite",
  },
  inputArea: {
    padding: "16px 24px 20px",
    borderTop: "1px solid var(--border-subtle)",
  },
  inputWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--bg-secondary)",
    border: "1px solid var(--border-default)",
    borderRadius: "var(--radius-lg)",
    padding: "4px 4px 4px 16px",
    transition: "border-color var(--transition-fast)",
  },
  input: {
    flex: 1,
    padding: "10px 0",
    border: "none",
    background: "transparent",
    color: "var(--text-primary)",
    fontSize: 14,
    outline: "none",
    fontFamily: "var(--font-mono)",
  },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    border: "none",
    borderRadius: "var(--radius-md)",
    background: "transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
  iconBtnActive: {
    color: "var(--accent-primary)",
  },
  sendBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    border: "none",
    borderRadius: "var(--radius-md)",
    background: "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
    color: "white",
    cursor: "pointer",
    transition: "all var(--transition-fast)",
  },
};
