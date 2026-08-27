// src/lib/inject.ts
function hookContext(event, context2) {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context2 }
  });
}

// src/lib/router.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
function routerPath(cwd, pluginRoot) {
  const candidates = pluginRoot ? [join(pluginRoot, "skills/_router/router.md"), join(cwd, ".claude/skills/_router/router.md")] : [join(cwd, ".claude/skills/_router/router.md")];
  return candidates.find((p) => existsSync(p)) ?? null;
}
function readStatus(cwd) {
  const file = join(cwd, ".flow-neo/current/status.md");
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  const pick = (key) => raw.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1]?.trim() ?? "";
  return { mode: pick("mode"), stage: pick("stage"), task: pick("task"), raw };
}
function buildSessionContext(cwd, pluginRoot) {
  const rp = routerPath(cwd, pluginRoot);
  const router = rp ? readFileSync(rp, "utf8") : "";
  const head = `<FLOWNEO_ROUTER>
${router}
</FLOWNEO_ROUTER>`;
  const status = readStatus(cwd);
  if (!status) return head;
  return `${head}

<FLOWNEO_STATUS>
${status.raw}
</FLOWNEO_STATUS>`;
}
function safeSessionContext(cwd, pluginRoot) {
  try {
    return buildSessionContext(cwd, pluginRoot);
  } catch {
    return "";
  }
}

// src/hooks/session-start.ts
var context = safeSessionContext(process.cwd(), process.env.CLAUDE_PLUGIN_ROOT);
process.stdout.write(hookContext("SessionStart", context));
