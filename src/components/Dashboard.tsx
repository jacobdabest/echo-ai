import { useState, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useConversations } from "../hooks/useConversations";
import Sidebar from "./Sidebar";
import ChatArea from "./ChatArea";
import MemoryPanel from "./MemoryPanel";
import SettingsPanel from "./SettingsPanel";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const { user, profile, signOut } = useAuth();
  const {
    conversations,
    currentId,
    messages,
    selectConversation,
    createConversation,
    addMessage,
    deleteConversation,
  } = useConversations(user?.id);

  const [sending, setSending] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const sendChat = useCallback(
    async (message: string) => {
      let convId: string = currentId ?? "";
      if (!convId) {
        const conv = await createConversation();
        if (!conv) return;
        convId = conv.id;
      }

      setSending(true);

      await addMessage("user", message, { conversation_id: convId });

      const history = messagesRef.current
        .filter((m) => m.conversation_id === convId)
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: "user", content: message });

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("No auth token");

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const res = await fetch(`${supabaseUrl}/functions/v1/echo-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message, history }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(err.error || err.details || "Chat request failed");
        }

        const data = await res.json();
        await addMessage("assistant", data.reply || "No response.", {
          conversation_id: convId,
          agent_commands: data.agent_commands ?? [],
          voice_text: data.voice_text ?? null,
        });

        if (data.voice_text && voiceEnabled && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(data.voice_text);
          utterance.rate = profile?.voice_settings?.rate ?? 0.85;
          utterance.pitch = profile?.voice_settings?.pitch ?? 0.7;
          window.speechSynthesis.speak(utterance);
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : "Connection error";
        await addMessage("assistant", `System error: ${errMsg}. ECHO operating in reduced mode.`, {
          conversation_id: convId,
        });
      } finally {
        setSending(false);
      }
    },
    [currentId, createConversation, addMessage, voiceEnabled, profile]
  );

  return (
    <div style={styles.layout}>
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        onSelect={selectConversation}
        onCreate={createConversation}
        onDelete={deleteConversation}
        onMemoryClick={() => setMemoryOpen(true)}
        onSettingsClick={() => setSettingsOpen(true)}
        onSignOut={signOut}
        displayName={profile?.display_name || profile?.username || "User"}
      />
      <ChatArea
        messages={messages}
        loading={sending}
        onSend={sendChat}
        voiceEnabled={voiceEnabled}
        onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
        displayName={profile?.display_name || profile?.username || "User"}
      />
      <MemoryPanel
        open={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        userId={user!.id}
      />
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        profile={profile}
        onProfileUpdate={() => {}}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
  },
};
