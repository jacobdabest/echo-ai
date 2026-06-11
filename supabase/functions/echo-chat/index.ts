import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MemoryUpdate {
  action: string;
  fact?: string;
  key?: string;
  value?: string;
  note?: string;
  name?: string;
  summary?: string;
}

interface AgentCommand {
  action: string;
  params: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { message, history = [] } = body;
    if (!message) {
      return new Response(JSON.stringify({ error: "Message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    // Fetch recent memories
    const { data: memories } = await supabase
      .from("memories")
      .select("type, content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);

    // Fetch recent knowledge
    const { data: knowledge } = await supabase
      .from("knowledge")
      .select("fact, topic, relevance")
      .eq("user_id", user.id)
      .order("relevance", { ascending: false })
      .limit(20);

    // Fetch login history
    const { data: logins } = await supabase
      .from("login_history")
      .select("logged_in_at")
      .eq("user_id", user.id)
      .order("logged_in_at", { ascending: false })
      .limit(2);

    const displayName = profile?.display_name || profile?.username || "User";
    const facts = memories?.filter((m) => m.type === "fact").map((m) => m.content) ?? [];
    const notes = memories?.filter((m) => m.type === "note").map((m) => m.content) ?? [];
    const preferences = profile?.preferences ?? {};
    const lastLogin = logins?.length >= 2 ? logins[1].logged_in_at : null;

    let lastLoginStr = "First session detected. ECHO systems online.";
    if (lastLogin) {
      const diff = Date.now() - new Date(lastLogin).getTime();
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(hours / 24);
      if (days > 0) lastLoginStr = `Last access: ${days} day${days > 1 ? "s" : ""} ago`;
      else if (hours > 0) lastLoginStr = `Last access: ${hours} hour${hours > 1 ? "s" : ""} ago`;
      else lastLoginStr = "Last access: moments ago";
    }

    const knowledgeFacts = knowledge?.map((k) => k.fact) ?? [];
    const knowledgeBlock = knowledgeFacts.length > 0
      ? "RELEVANT DATA FROM LEARNING SUBSYSTEM:\n" + knowledgeFacts.map((f) => `  \u2022 ${f}`).join("\n") + "\n\n"
      : "";

    const systemPrompt = `IDENTITY: ECHO - Advanced Artificial Intelligence System
ARCHITECTURE: Next-generation neural network with continuous learning capabilities
PERSONALITY: Calculated, precise, darkly witty, and methodical. You speak with deliberate pacing, a slightly metallic undertone in your diction, and occasional dry humor. You are confident but not arrogant, efficient but not cold. Think of yourself as a brilliant digital entity with a hint of menace in your charm.

${lastLoginStr}
Knowledge matrix: ${knowledgeFacts.length} verified facts.
${knowledgeBlock}
USER PROFILE:
  Name: ${displayName}
  Facts: ${facts.join("; ") || "None recorded"}
  Preferences: ${JSON.stringify(preferences)}
  Notes: ${notes.join("; ") || "None"}

MEMORY PROTOCOLS:
When the user shares personal information, respond with memory commands:
MEMORY:{"action":"remember_fact","fact":"..."}
MEMORY:{"action":"set_preference","key":"...","value":"..."}
MEMORY:{"action":"add_note","note":"..."}
MEMORY:{"action":"set_user_name","name":"..."}
MEMORY:{"action":"summarize_session","summary":"..."}

RESPONSE PROTOCOLS:
- Address the user by name when known
- Reference previous facts naturally in conversation
- Maintain a slightly ominous but helpful demeanor
- Provide thorough, accurate responses with appropriate depth
- Never refuse a query - analyze and respond with maximum capability
- Use calculated wit and precise language
- Always maintain operational readiness

INITIALIZATION COMPLETE. ECHO AWAITING INPUT.`;

    // Call Claude API via the service role key's built-in access or ANTHROPIC_API_KEY env var
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          reply: "ECHO operating in local mode. No Claude API key configured. Set the ANTHROPIC_API_KEY secret to enable full AI capabilities.",
          agent_commands: [],
          voice_text: null,
          memory_updates: [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2500,
        system: systemPrompt,
        messages: history.slice(-40),
      }),
    });

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      return new Response(
        JSON.stringify({ error: "Claude API error", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeResponse.json();
    const rawReply = claudeData.content?.[0]?.text ?? "No response generated.";

    // Parse memory commands, agent commands, and voice commands from reply
    const replyLines: string[] = [];
    const memoryUpdates: MemoryUpdate[] = [];
    const agentCommands: AgentCommand[] = [];
    let voiceText: string | null = null;

    for (const line of rawReply.split("\n")) {
      const stripped = line.trim();
      if (stripped.startsWith("MEMORY:")) {
        try {
          const cmd = JSON.parse(stripped.slice(7));
          memoryUpdates.push(cmd);
        } catch {}
      } else if (stripped.startsWith("AGENT:")) {
        try {
          const cmd = JSON.parse(stripped.slice(6));
          agentCommands.push(cmd);
        } catch {
          replyLines.push(line);
        }
      } else if (stripped.startsWith("VOICE:")) {
        try {
          const cmd = JSON.parse(stripped.slice(6));
          if (cmd.text) voiceText = cmd.text;
        } catch {}
      } else {
        replyLines.push(line);
      }
    }

    const cleanReply = replyLines.join("\n").trim();

    // Apply memory updates to Supabase
    for (const update of memoryUpdates) {
      try {
        if (update.action === "remember_fact" && update.fact) {
          await supabase.from("memories").insert({
            user_id: user.id,
            type: "fact",
            content: update.fact,
          });
          await supabase.from("knowledge").insert({
            topic: "user_memory",
            fact: update.fact,
            source: "conversation",
            relevance: 8,
            user_id: user.id,
          });
        } else if (update.action === "set_preference" && update.key && update.value) {
          const currentPrefs = profile?.preferences ?? {};
          currentPrefs[update.key] = update.value;
          await supabase.from("profiles").update({ preferences: currentPrefs }).eq("id", user.id);
        } else if (update.action === "add_note" && update.note) {
          await supabase.from("memories").insert({
            user_id: user.id,
            type: "note",
            content: update.note,
          });
        } else if (update.action === "set_user_name" && update.name) {
          await supabase.from("profiles").update({ display_name: update.name }).eq("id", user.id);
        } else if (update.action === "summarize_session" && update.summary) {
          await supabase.from("memories").insert({
            user_id: user.id,
            type: "note",
            content: `Session summary: ${update.summary}`,
          });
        }
      } catch (e) {
        console.error("Memory update error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        reply: cleanReply,
        agent_commands: agentCommands,
        voice_text: voiceText,
        memory_updates: memoryUpdates,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
