#!/usr/bin/env python3
"""World of Codecraft (Herdr layout): what each Claude Code agent is doing, for the village.

Claude Code hook (async, never blocks). Writes ~/.local/state/world-of-codecraft/<HC_TERMINAL_ID>.json, read by
~/.config/herdr-app/mods/world-of-codecraft/activite.js to pick the hero's scene while Herdr says "working".

  act      pense (thinking) | eclaire (reading/searching) | code (editing) | commande (bash)
           | test (running tests) | web (web search/fetch) | medite (compacting) | fini (turn over)
  outil    last tool name          t      last event (ms)       depuis  when act started (ms)
  coups    successful edits and commands this task (each one = a blow on the creature)
  err      consecutive tool failures, errT the last one (ms)
  subs     running subagents (len(subIds))
  subCoups successful subagent tool calls, ever (monotonic per file; each one = 1 damage on the daily raid boss)
  subIds   {agent id: {t0 start, t last event (ms), act what it does (pense, then its tools' kind), outil}}, kept
           across turns until SubagentStop, a new session, or 30 min with no event from that subagent
  tache    prompt counter (seeds the creature drawn for the task)
  errTache tool failures this task (3+ = the next creature is a boss)
  essai    last test run {ok, t} (act "test" while it runs)   commitT / pushT  last git commit / push (ms)

Outside Herdr (no HC_TERMINAL_ID) it does nothing. Subagents' own tool calls leave the hero's scene alone: they only
refresh their subIds entry and count in subCoups.
"""
import fcntl, json, os, re, sys, time

term = os.environ.get("HC_TERMINAL_ID")
if not term:
    sys.exit(0)
try:
    ev = json.load(sys.stdin)
except Exception:
    sys.exit(0)
# tell Claude Code not to wait for us (async hook response), then do the work
print('{"async": true}', flush=True)

DIR = os.path.expanduser("~/.local/state/world-of-codecraft")
os.makedirs(DIR, exist_ok=True)
path = os.path.join(DIR, f"{term}.json")
name = ev.get("hook_event_name", "")
tool = ev.get("tool_name") or ""
sub = bool(ev.get("agent_id"))
now = int(time.time() * 1000)
cmd = str((ev.get("tool_input") or {}).get("command") or "") if tool == "Bash" else ""
# drop heredoc bodies and quoted strings: only the commands themselves count
cmd = re.sub(r"<<-?\s*['\"]?(\w+)['\"]?[^\n]*\n.*?\n\s*\1\b", " ", cmd, flags=re.S)
cmd = re.sub(r"'[^']*'|\"(?:\\.|[^\"\\])*\"", "''", cmd)
# only real commands: at the start of the command line or after ; & | ( (not inside quoted text or heredocs)
AT = r"(?:^|[;&|(]\s*)(?:\w+=\S+\s+)*"
TEST = re.compile(AT + r"((bun|npm|pnpm|yarn|npx|bunx)\s+(run\s+)?test|vitest|jest|pytest|playwright\s+test|cargo\s+test|go\s+test|rspec|phpunit|mix\s+test|deno\s+test)\b", re.M)
COMMIT = re.compile(AT + r"git\s+(-C\s+\S+\s+)?commit\b", re.M)
PUSH = re.compile(AT + r"git\s+(-C\s+\S+\s+)?push\b", re.M)

READ = {"Read", "Grep", "Glob", "LS", "NotebookRead", "LSP", "ToolSearch"}
EDIT = {"Edit", "Write", "MultiEdit", "NotebookEdit"}
WEB = {"WebSearch", "WebFetch"}
SUB_TTL = 30 * 60_000  # a subagent silent this long is dropped (its SubagentStop was missed)


def kind(t):
    if t in EDIT:
        return "code"
    if t in READ:
        return "eclaire"
    if t == "Bash":
        return "test" if TEST.search(cmd) else "commande"
    if t in WEB or (t.startswith("mcp__") and any(k in t for k in ("search", "fetch", "scrape", "exa", "firecrawl", "context7", "docs"))):
        return "web"
    if t.startswith("mcp__"):  # other MCP tools: driving a browser reads the web, anything else acts like a command
        return "web" if any(k in t for k in ("browser", "chrome", "playwright", "navigate", "snapshot", "screenshot")) else "commande"
    return None  # Agent, TodoWrite, Skill, AskUserQuestion...: keep the current scene


if name == "SessionEnd":
    try:
        os.remove(path)
    except OSError:
        pass
    sys.exit(0)

with open(os.path.join(DIR, ".lock"), "w") as lk:
    fcntl.flock(lk, fcntl.LOCK_EX)
    try:
        with open(path) as f:
            s = json.load(f)
    except Exception:
        s = {}
    s.setdefault("tache", 0)
    s.setdefault("subCoups", 0)  # present from the first event, so the village baselines a new terminal at 0
    aid = ev.get("agent_id")
    subIds = {}
    for k, v in (s.get("subIds") or {}).items():
        v = v if isinstance(v, dict) else {"t0": v, "t": v}  # older files: {id: ms}
        if now - v["t"] < SUB_TTL:
            subIds[k] = v
    if name == "SubagentStart" and aid:
        subIds[aid] = {"t0": now, "t": now, "act": "pense"}
    elif name == "SubagentStop":
        subIds.pop(aid, None)
    elif aid in subIds:  # its own tool calls: still running, and what it does
        subIds[aid]["t"] = now
        if name == "PreToolUse" and kind(tool):
            subIds[aid].update(act=kind(tool), outil=tool)
    if sub and name == "PostToolUse":
        s["subCoups"] += 1  # a successful subagent tool call: a blow on the raid boss

    def act(a):
        if s.get("act") != a:
            s["act"], s["depuis"] = a, now

    if name in ("SubagentStart", "SubagentStop") or sub:
        pass  # a subagent's own tools: the main hero's scene stays
    elif name == "UserPromptSubmit":
        s.update(tache=s["tache"] + 1, coups=0, err=0, errTache=0)
        act("pense")
    elif name == "PreToolUse":
        k = kind(tool)
        if k:
            act(k)
        s["outil"] = tool
    elif name == "PostToolUse":
        if tool in EDIT or kind(tool) == "commande" or tool == "Bash":  # every successful edit or command is a blow on the creature
            s["coups"] = s.get("coups", 0) + 1
        s["err"] = 0
        if TEST.search(cmd):
            s["essai"] = {"ok": True, "t": now}
        if COMMIT.search(cmd):
            s["commitT"] = now
        if PUSH.search(cmd):
            s["pushT"] = now
    elif name == "PostToolUseFailure":
        s["err"] = s.get("err", 0) + 1
        s["errTache"] = s.get("errTache", 0) + 1
        s["errT"] = now
        if TEST.search(cmd):
            s["essai"] = {"ok": False, "t": now}
    elif name == "PreCompact":
        act("medite")
    elif name == "SessionStart":
        if ev.get("source") == "compact":
            act("pense")
        else:
            subIds = {}
            s.update(err=0, coups=0)
            act("fini")
    elif name == "Stop":
        act("fini")  # background subagents keep running: subIds stays
    s["subIds"], s["subs"] = subIds, len(subIds)
    s["t"] = now
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(s, f)
    os.replace(tmp, path)
