export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  voice_settings: VoiceSettings;
  preferences: Record<string, string>;
  last_seen: string | null;
  created_at: string;
}

export interface VoiceSettings {
  pitch: number;
  rate: number;
  volume: number;
}

export interface Memory {
  id: string;
  user_id: string;
  type: "fact" | "note" | "preference" | "research_topic" | "shortcut";
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  agent_commands: AgentCommand[];
  voice_text: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AgentCommand {
  action: string;
  params: Record<string, unknown>;
}

export interface Knowledge {
  id: string;
  topic: string;
  fact: string;
  source: string;
  relevance: number;
  user_id: string | null;
  created_at: string;
}

export interface ChatRequest {
  message: string;
  conversationId: string;
  agentResults?: unknown[];
}

export interface ChatResponse {
  reply: string;
  agentCommands: AgentCommand[];
  voiceText: string | null;
  memoryUpdates: MemoryUpdate[];
}

export interface MemoryUpdate {
  action: string;
  fact?: string;
  key?: string;
  value?: string;
  note?: string;
  name?: string;
  summary?: string;
}
