// src/hooks/user-prompt-submit.ts
import { readFileSync as readFileSync4 } from "node:fs";

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
function parseSessionId(input) {
  try {
    const v = JSON.parse(input)?.session_id;
    return typeof v === "string" && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

// src/lib/router.ts
var RE_TASK2 = /^task:\s*(.*)$/m;
var RE_STAGE2 = /^stage:\s*(.*)$/m;
function readStatus(cwd2, slug) {
  const file = join2(cwd2, ".flow-neo/tasks", slug, "status.md");
  if (!existsSync2(file)) return null;
  const raw = readFileSync2(file, "utf8");
  return {
    task: raw.match(RE_TASK2)?.[1]?.trim() ?? "",
    slug,
    stage: raw.match(RE_STAGE2)?.[1]?.trim() ?? "",
    raw
  };
}
function formatTaskList(cwd2) {
  const tasks = listTasks(cwd2);
  if (tasks.length === 0) return "\u65E0\u8FDB\u884C\u4E2D\u4EFB\u52A1";
  return tasks.map((t) => `${t.slug}\uFF08\u9636\u6BB5 ${t.stage || "?"}\uFF09`).join("\u3001");
}
function formatOtherTasks(cwd2, exceptSlug) {
  const others = listTasks(cwd2).filter((t) => t.slug !== exceptSlug);
  if (others.length === 0) return "";
  const MAX = 5;
  const shown = others.slice(0, MAX).map((t) => `${t.slug}\uFF08\u9636\u6BB5 ${t.stage || "?"}\uFF09`).join("\u3001");
  return others.length > MAX ? `${shown}\u2026\u53CA ${others.length - MAX} \u4E2A` : shown;
}
function buildTurnReminder(cwd2, sessionId2) {
  const slug = sessionId2 ? readBinding(cwd2, sessionId2) : null;
  const status = slug ? readStatus(cwd2, slug) : null;
  if (status) {
    const others = formatOtherTasks(cwd2, status.slug);
    const otherPart = others ? `\u5176\u4ED6\u4EFB\u52A1\uFF1A${others}\u3002` : "";
    return `\u3010FlowNeo\u3011\u5B8C\u6574\u4EFB\u52A1 ${status.slug}\uFF08${status.task || "\u672A\u547D\u540D"}\uFF09\uFF0C\u5F53\u524D\u9636\u6BB5 ${status.stage || "?"}\uFF1A\u9075\u5B88\u8BE5\u9636\u6BB5\u7EAA\u5F8B\uFF0C\u4EA7\u51FA/\u66F4\u65B0\u5BF9\u5E94\u5DE5\u4EF6\u540E\u5148\u66F4\u65B0 status.md \u518D\u8FDB\u5165\u4E0B\u4E00\u9636\u6BB5\u3002${otherPart}`;
  }
  const tasks = formatTaskList(cwd2);
  const taskPart = tasks === "\u65E0\u8FDB\u884C\u4E2D\u4EFB\u52A1" ? "" : `\u8FDB\u884C\u4E2D\u4EFB\u52A1\uFF1A${tasks}\u3002`;
  return `\u3010FlowNeo\u3011\u672C\u4F1A\u8BDD\u672A\u7ED1\u5B9A\u4EFB\u52A1\uFF1A\u91CD\u4EFB\u52A1\u2192\u8BF4\u300C\u65B0\u4EFB\u52A1 <\u540D\u79F0>\u300D\u521B\u5EFA\u5E76\u7ED1\u5B9A\uFF1B\u7EE7\u7EED\u65E2\u6709\u2192\u8BF4\u300C\u7EE7\u7EED <\u540D\u79F0\u6216slug>\u300D\uFF1B\u8F7B\u4EFB\u52A1\u2192\u76F4\u63A5\u505A\uFF0C\u4E0D\u7559\u4EFB\u4F55\u6587\u4EF6\u3002${taskPart}`;
}
function safeTurnReminder(cwd2, sessionId2) {
  try {
    return buildTurnReminder(cwd2, sessionId2);
  } catch {
    return "";
  }
}

// src/lib/config.ts
import { existsSync as existsSync3, readFileSync as readFileSync3 } from "node:fs";
import { join as join3 } from "node:path";
var DEFAULT_CONFIG = {
  reminders: { perTurn: true },
  archive: { strategy: "prompt" },
  lint: { routerLimit: 1500 },
  schema: { strictness: "loose" },
  stages: { skipDesign: false, skipReview: false }
};
function readConfig(cwd2) {
  const file = join3(cwd2, ".flow-neo/config/plugin.config.json");
  if (!existsSync3(file)) return structuredClone(DEFAULT_CONFIG);
  try {
    const raw = JSON.parse(readFileSync3(file, "utf8"));
    return {
      reminders: { ...DEFAULT_CONFIG.reminders, ...raw.reminders },
      archive: { ...DEFAULT_CONFIG.archive, ...raw.archive },
      lint: { ...DEFAULT_CONFIG.lint, ...raw.lint },
      schema: { ...DEFAULT_CONFIG.schema, ...raw.schema },
      stages: { ...DEFAULT_CONFIG.stages, ...raw.stages }
    };
  } catch {
    return structuredClone(DEFAULT_CONFIG);
  }
}

// src/hooks/user-prompt-submit.ts
var sessionId = null;
try {
  sessionId = parseSessionId(readFileSync4(0, "utf8"));
} catch {
  sessionId = null;
}
var cwd = process.cwd();
var config = readConfig(cwd);
var context = config.reminders.perTurn === false ? "" : safeTurnReminder(cwd, sessionId);
process.stdout.write(hookContext("UserPromptSubmit", context));
