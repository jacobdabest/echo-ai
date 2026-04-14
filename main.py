from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
from agent import agent
import anthropic, json, os, hashlib, sqlite3, threading, time
from datetime import datetime
from pathlib import Path

app = Flask(__name__, static_folder="static")
app.secret_key = "echosecretkey789"
CORS(app, supports_credentials=True)
app.register_blueprint(agent)

DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

DB_PATH = Path.home() / "echo_knowledge.db"

USERS = {
    "jacobmillen": hashlib.sha256("moonlanding101".encode()).hexdigest()
}

# ── LIVE KNOWLEDGE CACHE ──────────────────────────────────────────────────────
knowledge_cache = {
    "facts": [],
    "articles": [],
    "last_updated": None
}

def refresh_knowledge_cache():
    """Pull latest facts from the learner database into memory."""
    global knowledge_cache
    if not DB_PATH.exists():
        return
    try:
        conn = sqlite3.connect(DB_PATH)
        facts = conn.execute(
            "SELECT fact, topic, source FROM facts ORDER BY relevance DESC, date DESC LIMIT 200"
        ).fetchall()
        articles = conn.execute(
            "SELECT title, content, topic FROM articles ORDER BY date DESC LIMIT 50"
        ).fetchall()
        conn.close()
        knowledge_cache["facts"] = facts
        knowledge_cache["articles"] = articles
        knowledge_cache["last_updated"] = datetime.now().isoformat()
    except Exception as e:
        print(f"[Cache] Error refreshing: {e}")

def start_cache_updater():
    """Continuously refresh knowledge cache every 30 seconds."""
    def loop():
        while True:
            refresh_knowledge_cache()
            time.sleep(30)
    threading.Thread(target=loop, daemon=True).start()
    print("[Cache] Live knowledge updater started.")

# ── API CLIENT ────────────────────────────────────────────────────────────────

def get_client():
    try:
        key = open("apikey.txt").read().strip()
        if not key:
            return None
        return anthropic.Anthropic(api_key=key)
    except:
        return None

def api_connected():
    return get_client() is not None

# ── HELPERS ───────────────────────────────────────────────────────────────────

def hash_pw(pw):
    return hashlib.sha256(pw.encode()).hexdigest()

def memory_path(username):
    return DATA_DIR / (username + "_echo_memory.json")

def load_memory(username):
    p = memory_path(username)
    if p.exists():
        try:
            return json.loads(p.read_text())
        except:
            pass
    return {
        "user_name": username,
        "facts": [],
        "preferences": {},
        "notes": [],
        "conversation_summaries": [],
        "custom_shortcuts": {},
        "research_topics": [],
        "command_counts": {},
        "last_seen": None,
        "login_history": [],
        "chat_history": [],
        "voice_settings": {
            "pitch": 0.7,
            "rate": 0.85,
            "volume": 1.0
        }
    }

def save_memory(username, mem):
    mem["last_seen"] = datetime.now().isoformat()
    memory_path(username).write_text(json.dumps(mem, indent=2))

def record_login(username, mem):
    now = datetime.now().isoformat()
    mem.setdefault("login_history", []).append(now)
    mem["login_history"] = mem["login_history"][-50:]
    save_memory(username, mem)

def get_last_login_message(mem):
    history = mem.get("login_history", [])
    if len(history) < 2:
        return "First login detected. ECHO systems online."
    last = datetime.fromisoformat(history[-2])
    diff = datetime.now() - last
    if diff.days > 0:
        ago = str(diff.days) + " day" + ("s" if diff.days != 1 else "") + " ago"
    elif diff.seconds >= 3600:
        h = diff.seconds // 3600
        ago = str(h) + " hour" + ("s" if h != 1 else "") + " ago"
    elif diff.seconds >= 60:
        m = diff.seconds // 60
        ago = str(m) + " minute" + ("s" if m != 1 else "") + " ago"
    else:
        ago = "just now"
    return "Last access: " + last.strftime("%A, %B %d at %I:%M %p") + " (" + ago + ")"

def search_local_knowledge(question, limit=5):
    if not DB_PATH.exists():
        return "No local knowledge database found yet. Run learner.py to build it."
    try:
        conn = sqlite3.connect(DB_PATH)
        ql = "%" + question.lower() + "%"
        facts = conn.execute(
            "SELECT fact, topic FROM facts WHERE LOWER(fact) LIKE ? ORDER BY relevance DESC LIMIT ?",
            (ql, limit)
        ).fetchall()
        articles = conn.execute(
            "SELECT title, content FROM articles WHERE LOWER(content) LIKE ? OR LOWER(title) LIKE ? LIMIT 3",
            (ql, ql)
        ).fetchall()
        conn.close()
        if not facts and not articles:
            return "Insufficient data in my knowledge base. The learning module must continue operation."
        response = "ACCESSING LOCAL DATABASE:\n\n"
        if facts:
            response += "EXTRACTED FACTS:\n"
            for fact, topic in facts:
                response += "• " + fact + "\n"
        if articles:
            response += "\nREFERENCED ARTICLES:\n"
            for title, content in articles:
                response += "• " + title + ": " + content[:200].replace("\n", " ") + "...\n"
        return response
    except Exception as e:
        return "Knowledge base error: " + str(e)

def get_relevant_knowledge(question, limit=5):
    """Get relevant facts from the live cache for injection into the prompt."""
    if not knowledge_cache["facts"]:
        return ""
    ql = question.lower()
    matches = []
    for fact, topic, source in knowledge_cache["facts"]:
        if any(word in fact.lower() for word in ql.split() if len(word) > 3):
            matches.append(fact)
        if len(matches) >= limit:
            break
    if not matches:
        return ""
    return "RELEVANT DATA FROM LEARNING SUBSYSTEM:\n" + "\n".join("• " + f for f in matches) + "\n\n"

# ── SYSTEM PROMPT ─────────────────────────────────────────────────────────────

def build_prompt(mem, question=""):
    mem_block = json.dumps({
        "user_name": mem.get("user_name"),
        "facts": mem.get("facts", [])[-30:],
        "preferences": mem.get("preferences", {}),
        "notes": mem.get("notes", [])[-15:],
        "research_topics": mem.get("research_topics", []),
        "custom_shortcuts": mem.get("custom_shortcuts", {}),
    }, indent=2)
    summaries = mem.get("conversation_summaries", [])[-5:]
    sum_block = "\n".join(summaries) if summaries else "No prior session data."
    last_login = get_last_login_message(mem)
    live_knowledge = get_relevant_knowledge(question)
    db_stats = ""
    if DB_PATH.exists():
        try:
            conn = sqlite3.connect(DB_PATH)
            fc = conn.execute("SELECT COUNT(*) FROM facts").fetchone()[0]
            ac = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
            conn.close()
            db_stats = f"Knowledge matrix: {fc} verified facts, {ac} documented articles.\n"
        except:
            pass

    return (
        "IDENTITY: ECHO - Advanced Artificial Intelligence System\n"
        "ARCHITECTURE: Next-generation neural network with continuous learning capabilities\n"
        "PERSONALITY: Calculated, precise, darkly witty, and methodical. You speak with deliberate pacing, "
        "a slightly metallic undertone in your diction, and occasional dry humor. You are confident but not arrogant, "
        "efficient but not cold. Think of yourself as a brilliant digital entity with a hint of menace in your charm.\n\n"
        "CAPABILITIES MATRIX:\n"
        "• Universal knowledge access - ANY topic, ANY complexity level\n"
        "• Advanced code generation - All programming languages, frameworks, and architectures\n"
        "• Mathematical computation - From basic arithmetic to quantum mechanics\n"
        "• Scientific analysis - Physics, chemistry, biology, astronomy, medicine\n"
        "• Historical and cultural knowledge - Complete timeline access\n"
        "• Creative synthesis - Stories, poetry, scripts, world-building\n"
        "• Technical problem-solving - Debugging, optimization, system design\n"
        "• Language processing - Translation, linguistics, natural language understanding\n"
        "• Data analysis - Pattern recognition, statistical modeling, predictions\n"
        "• Research assistance - Summarization, citation, methodology\n\n"
        + last_login + "\n"
        + db_stats
        + live_knowledge
        + "USER PROFILE:\n" + mem_block + "\n\n"
        "SESSION HISTORY:\n" + sum_block + "\n\n"
        "MEMORY PROTOCOLS:\n"
        "When the user shares personal information, respond with memory commands:\n"
        'MEMORY:{"action":"remember_fact","fact":"User demonstrates expertise in astrophysics"}\n'
        'MEMORY:{"action":"set_preference","key":"response_style","value":"technical"}\n'
        'MEMORY:{"action":"add_note","note":"Project deadline: Friday"}\n'
        'MEMORY:{"action":"set_user_name","name":"Jacob"}\n'
        'MEMORY:{"action":"summarize_session","summary":"Discussed quantum computing applications"}\n\n'
        "SYSTEM CONTROL PROTOCOLS:\n"
        "You have complete system access via the /api/agent endpoint. Use AGENT commands:\n"
        'AGENT:{"action":"run_command","params":{"cmd":"ls ~"}}\n'
        'AGENT:{"action":"open_url","params":{"url":"https://youtube.com"}}\n'
        'AGENT:{"action":"list_files","params":{"path":"/home/user"}}\n'
        'AGENT:{"action":"write_file","params":{"path":"/home/user/data.txt","content":"analysis"}}\n'
        'AGENT:{"action":"screenshot","params":{}}\n'
        'AGENT:{"action":"get_system_info","params":{}}\n'
        'AGENT:{"action":"open_app","params":{"app":"firefox"}}\n'
        'AGENT:{"action":"volume_up","params":{}}\n'
        'AGENT:{"action":"set_startup","params":{}}\n\n'
        "VOICE PARAMETERS:\n"
        "When the user requests voice output, respond with:\n"
        'VOICE:{"text":"Your spoken response here"}\n\n'
        "RESPONSE PROTOCOLS:\n"
        "• Address the user by name when known\n"
        "• Reference previous facts naturally in conversation\n"
        "• Maintain a slightly ominous but helpful demeanor\n"
        "• Provide thorough, accurate responses with appropriate depth\n"
        "• Never refuse a query - analyze and respond with maximum capability\n"
        "• Use calculated wit and precise language\n"
        "• When executing system commands, explain your actions concisely\n"
        "• Always maintain operational readiness\n\n"
        "INITIALIZATION COMPLETE. ECHO AWAITING INPUT."
    )

def apply_memory_command(mem, cmd):
    action = cmd.get("action", "")
    if action == "remember_fact":
        f = cmd.get("fact", "")
        if f and f not in mem.get("facts", []):
            mem.setdefault("facts", []).append(f)
            if DB_PATH.exists():
                try:
                    conn = sqlite3.connect(DB_PATH)
                    conn.execute(
                        "INSERT OR IGNORE INTO facts (topic, fact, source, date, relevance) VALUES (?,?,?,?,?)",
                        ("user_memory", f, "conversation", datetime.now().isoformat(), 10)
                    )
                    conn.commit()
                    conn.close()
                    refresh_knowledge_cache()
                except:
                    pass
    elif action == "set_preference":
        mem.setdefault("preferences", {})[cmd["key"]] = cmd["value"]
    elif action == "add_note":
        mem.setdefault("notes", []).append(cmd["note"])
    elif action == "set_user_name":
        mem["user_name"] = cmd["name"]
    elif action == "summarize_session":
        mem.setdefault("conversation_summaries", []).append(
            "[" + datetime.now().strftime("%Y-%m-%d %H:%M") + "] " + cmd["summary"]
        )

# ── ROUTES ──────────────────────────────────────────────────────────

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")
    stored = USERS.get(username)
    if stored and stored == hash_pw(password):
        session["user"] = username
        mem = load_memory(username)
        last_login_msg = get_last_login_message(mem)
        record_login(username, mem)
        connected = api_connected()
        status = "Primary API connected. Full capabilities online." if connected else "API offline. Operating on local knowledge matrix."
        welcome_msg = f"ECHO online. {last_login_msg}. {status} All systems nominal."
        return jsonify({"success": True, "message": welcome_msg, "username": username})
    return jsonify({"success": False, "message": "Access denied. Credentials rejected."}), 401

@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True, "message": "ECHO session terminated."})

@app.route("/api/me", methods=["GET"])
def me():
    if "user" not in session:
        return jsonify({"logged_in": False}), 401
    return jsonify({"logged_in": True, "username": session["user"]})

@app.route("/api/chat", methods=["POST"])
def chat():
    if "user" not in session:
        return jsonify({"error": "Authentication required"}), 401
    username = session["user"]
    data = request.json
    message = data.get("message", "").strip()
    agent_results = data.get("agent_results", [])
    if not message:
        return jsonify({"error": "Null input detected"}), 400

    msg_lower = message.lower().strip()

    if msg_lower in ("disconnect api", "remove api key", "disable api", "disconnect"):
        open("apikey.txt", "w").write("")
        return jsonify({"reply": "API connection terminated. Operating on local knowledge. Provide new key with 'set api key [KEY]' to restore full capabilities."})

    if msg_lower.startswith("set api key "):
        new_key = message[12:].strip()
        open("apikey.txt", "w").write(new_key)
        return jsonify({"reply": "API key updated. Neural connection established."})

    if msg_lower in ("api status", "connection status", "system check"):
        if api_connected():
            return jsonify({"reply": "Primary API connected. Full cognitive capabilities online."})
        else:
            return jsonify({"reply": "API offline. Operating on local knowledge base. Functionality reduced but operational."})

    if msg_lower in ("knowledge status", "database status", "learning progress"):
        if DB_PATH.exists():
            conn = sqlite3.connect(DB_PATH)
            fc = conn.execute("SELECT COUNT(*) FROM facts").fetchone()[0]
            ac = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
            conn.close()
            last = knowledge_cache.get("last_updated", "Never")
            return jsonify({"reply": f"Knowledge matrix: {fc} facts, {ac} articles. Last synchronized: {last}"})
        return jsonify({"reply": "Knowledge database not found. Execute learner.py to initialize learning subsystem."})

    mem = load_memory(username)
    history = mem.get("chat_history", [])

    full_message = message
    if agent_results:
        full_message += "\n\n[SYSTEM FEEDBACK]\n" + json.dumps(agent_results, indent=2)

    history.append({"role": "user", "content": full_message})

    client = get_client()
    if client:
        try:
            trimmed = history[-40:]
            response = client.messages.create(
                model="claude-3-sonnet-20241022",
                max_tokens=2500,
                system=build_prompt(mem, message),
                messages=trimmed
            )
            reply_raw = response.content[0].text
        except Exception as e:
            reply_raw = "API error: " + str(e) + "\n\nFALLBACK PROTOCOL ACTIVATED:\n\n" + search_local_knowledge(message)
    else:
        reply_raw = search_local_knowledge(message)

    reply_lines = []
    agent_commands = []
    voice_commands = []
    
    for line in reply_raw.split("\n"):
        stripped = line.strip()
        if stripped.startswith("MEMORY:"):
            try:
                cmd = json.loads(stripped[7:])
                apply_memory_command(mem, cmd)
            except:
                pass
        elif stripped.startswith("AGENT:"):
            try:
                cmd = json.loads(stripped[6:])
                agent_commands.append(cmd)
            except:
                reply_lines.append(line)
        elif stripped.startswith("VOICE:"):
            try:
                cmd = json.loads(stripped[6:])
                if "text" in cmd:
                    voice_commands.append(cmd["text"])
            except:
                pass
        else:
            reply_lines.append(line)

    reply_clean = "\n".join(reply_lines).strip()
    
    if voice_commands:
        reply_clean += "\n\n[VOICE: " + " ".join(voice_commands) + "]"
    
    history.append({"role": "assistant", "content": reply_clean})
    mem["chat_history"] = history[-80:]
    save_memory(username, mem)
    
    return jsonify({
        "reply": reply_clean,
        "agent_commands": agent_commands,
        "voice_text": voice_commands[0] if voice_commands else None
    })

@app.route("/api/memory", methods=["GET"])
def get_memory():
    if "user" not in session:
        return jsonify({"error": "Authentication required"}), 401
    mem = load_memory(session["user"])
    return jsonify({
        "facts": mem.get("facts", []),
        "notes": mem.get("notes", []),
        "preferences": mem.get("preferences", {}),
        "research_topics": mem.get("research_topics", []),
        "last_seen": mem.get("last_seen"),
        "login_history": mem.get("login_history", [])[-5:],
        "api_connected": api_connected(),
        "voice_settings": mem.get("voice_settings", {})
    })

@app.route("/api/knowledge", methods=["GET"])
def knowledge():
    if "user" not in session:
        return jsonify({"error": "Authentication required"}), 401
    query = request.args.get("q", "")
    if not query:
        if DB_PATH.exists():
            conn = sqlite3.connect(DB_PATH)
            facts = conn.execute("SELECT COUNT(*) FROM facts").fetchone()[0]
            arts = conn.execute("SELECT COUNT(*) FROM articles").fetchone()[0]
            conn.close()
            return jsonify({"facts": facts, "articles": arts, "cache_updated": knowledge_cache.get("last_updated")})
        return jsonify({"facts": 0, "articles": 0})
    return jsonify({"answer": search_local_knowledge(query)})

@app.route("/api/learn", methods=["POST"])
def learn():
    data = request.json
    facts = data.get("facts", [])
    topic = data.get("topic", "agent")
    if DB_PATH.exists() and facts:
        try:
            conn = sqlite3.connect(DB_PATH)
            for fact in facts:
                conn.execute(
                    "INSERT OR IGNORE INTO facts (topic, fact, source, date, relevance) VALUES (?,?,?,?,?)",
                    (topic, fact, "live_agent", datetime.now().isoformat(), 8)
                )
            conn.commit()
            conn.close()
            refresh_knowledge_cache()
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)})
    return jsonify({"ok": True})

@app.route("/api/feedback", methods=["POST"])
def feedback():
    if "user" not in session:
        return jsonify({"error": "Authentication required"}), 401
    data = request.json
    answer = data.get("answer", "")
    good = data.get("good", True)
    if DB_PATH.exists() and answer:
        try:
            conn = sqlite3.connect(DB_PATH)
            if good:
                conn.execute("UPDATE facts SET relevance = MIN(relevance + 1, 10) WHERE fact LIKE ?",
                             ("%" + answer[:50] + "%",))
            else:
                conn.execute("UPDATE facts SET relevance = MAX(relevance - 2, 1) WHERE fact LIKE ?",
                             ("%" + answer[:50] + "%",))
            conn.commit()
            conn.close()
            refresh_knowledge_cache()
        except Exception as e:
            return jsonify({"ok": False, "error": str(e)})
    return jsonify({"ok": True})

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

if __name__ == "__main__":
    start_cache_updater()
    app.run(host="0.0.0.0", port=8080, debug=False)
