// src/hooks/session-start.ts
import { readFileSync as readFileSync3 } from "node:fs";

// src/lib/inject.ts
function hookContext(event, context2) {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context2 }
  });
}

// src/lib/router.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
import { join as join2 } from "node:path";

// src/lib/tasks.ts
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
function assertSessionId(s) {
  if (typeof s !== "string" || /[\0\\/]/.test(s)) throw new Error("invalid sessionId");
}
function readBinding(cwd2, sessionId2) {
  assertSessionId(sessionId2);
  const file = join(cwd2, ".flow-neo/sessions", `${sessionId2}.md`);
  if (!existsSync(file)) return null;
  return readFileSync(file, "utf8").match(/^task:\s*(\S+)\s*$/m)?.[1] ?? null;
}
var RE_TASK = /^task:\s*(.*)$/m;
var RE_STAGE = /^stage:\s*(.*)$/m;
function listTasks(cwd2) {
  const dir = join(cwd2, ".flow-neo/tasks");
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = join(dir, entry.name, "status.md");
    if (!existsSync(file)) continue;
    const raw = readFileSync(file, "utf8");
    out.push({
      slug: entry.name,
      task: raw.match(RE_TASK)?.[1]?.trim() ?? "",
      stage: raw.match(RE_STAGE)?.[1]?.trim() ?? ""
    });
  }
  return out.sort((a, b) => a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0);
}
function cleanSessions(cwd2, maxAgeMs) {
  const dir = join(cwd2, ".flow-neo/sessions");
  if (!existsSync(dir)) return 0;
  let removed = 0;
  const cutoff = Date.now() - maxAgeMs;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".md")) continue;
    const file = join(dir, f);
    if (statSync(file).mtimeMs < cutoff) {
      rmSync(file);
      removed++;
    }
  }
  return removed;
}
function parseSessionId(input) {
  try {
    const v = JSON.parse(input)?.session_id;
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

// src/lib/router.ts
function routerPath(cwd2, pluginRoot) {
  const candidates = pluginRoot ? [join2(pluginRoot, "skills/_router/router.md"), join2(cwd2, ".claude/skills/_router/router.md")] : [join2(cwd2, ".claude/skills/_router/router.md")];
  return candidates.find((p) => existsSync2(p)) ?? null;
}
function readStatus(cwd2, slug) {
  const file = join2(cwd2, ".flow-neo/tasks", slug, "status.md");
  if (!existsSync2(file)) return null;
  const raw = readFileSync2(file, "utf8");
  const pick = (key) => raw.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1]?.trim() ?? "";
  return { task: pick("task"), slug, stage: pick("stage"), raw };
}
function formatTaskList(cwd2) {
  const tasks = listTasks(cwd2);
  if (tasks.length === 0) return "\u65E0\u8FDB\u884C\u4E2D\u4EFB\u52A1";
  return tasks.map((t) => `${t.slug}\uFF08\u9636\u6BB5 ${t.stage || "?"}\uFF09`).join("\u3001");
}
function buildSessionContext(cwd2, pluginRoot, sessionId2) {
  const rp = routerPath(cwd2, pluginRoot);
  const router = rp ? readFileSync2(rp, "utf8") : "";
  const head = `<FLOWNEO_ROUTER>
${router}
</FLOWNEO_ROUTER>`;
  const slug = sessionId2 ? readBinding(cwd2, sessionId2) : null;
  if (slug) {
    const status = readStatus(cwd2, slug);
    if (status) return `${head}

<FLOWNEO_STATUS>
${status.raw}
</FLOWNEO_STATUS>`;
  }
  return `${head}

<FLOWNEO_TASKS>
${formatTaskList(cwd2)}
</FLOWNEO_TASKS>`;
}
function safeSessionContext(cwd2, pluginRoot, sessionId2) {
  try {
    return buildSessionContext(cwd2, pluginRoot, sessionId2);
  } catch {
    return "";
  }
}

// src/hooks/session-start.ts
var cwd = process.cwd();
var sessionId = null;
try {
  sessionId = parseSessionId(readFileSync3(0, "utf8"));
} catch {
  sessionId = null;
}
try {
  cleanSessions(cwd, 7 * 24 * 3600 * 1e3);
} catch {
}
var context = safeSessionContext(cwd, process.env.CLAUDE_PLUGIN_ROOT, sessionId);
process.stdout.write(hookContext("SessionStart", context));
