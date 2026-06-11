import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { Conversation, Message } from "../lib/types";

export function useConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    setConversations(data ?? []);
  }, [userId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const selectConversation = useCallback(async (id: string) => {
    setCurrentId(id);
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages(data ?? []);
    setLoading(false);
  }, []);

  const createConversation = useCallback(async () => {
    if (!userId) return null;
    const { data } = await supabase
      .from("conversations")
      .insert({ user_id: userId, title: "New Session" })
      .select()
      .single();
    if (data) {
      setConversations((prev) => [data, ...prev]);
      setCurrentId(data.id);
      setMessages([]);
      return data;
    }
    return null;
  }, [userId]);

  const addMessage = useCallback(
    async (role: "user" | "assistant", content: string, extra?: Partial<Message> & { conversation_id?: string | null }) => {
      const convId = extra?.conversation_id ?? currentId;
      if (!convId) return null;
      const { data } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          role,
          content,
          agent_commands: extra?.agent_commands ?? [],
          voice_text: extra?.voice_text ?? null,
        })
        .select()
        .single();
      if (data) {
        if (convId !== currentId) setCurrentId(convId);
        setMessages((prev) => [...prev, data]);
        if (role === "user" && messages.length === 0) {
          const title = content.length > 40 ? content.slice(0, 40) + "..." : content;
          await supabase
            .from("conversations")
            .update({ title, updated_at: new Date().toISOString() })
            .eq("id", convId);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === convId ? { ...c, title, updated_at: new Date().toISOString() } : c
            )
          );
        }
      }
      return data;
    },
    [currentId, messages.length]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await supabase.from("conversations").delete().eq("id", id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentId === id) {
        setCurrentId(null);
        setMessages([]);
      }
    },
    [currentId]
  );

  return {
    conversations,
    currentId,
    messages,
    loading,
    selectConversation,
    createConversation,
    addMessage,
    deleteConversation,
  };
}
