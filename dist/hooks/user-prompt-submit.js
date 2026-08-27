// src/lib/inject.ts
function hookContext(event, context2) {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context2 }
  });
}

// src/lib/router.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
function readStatus(cwd) {
  const file = join(cwd, ".flow-neo/current/status.md");
  if (!existsSync(file)) return null;
  const raw = readFileSync(file, "utf8");
  const pick = (key) => raw.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))?.[1]?.trim() ?? "";
  return { mode: pick("mode"), stage: pick("stage"), task: pick("task"), raw };
}
function buildTurnReminder(cwd) {
  const s = readStatus(cwd);
  if (!s) {
    return "\u3010FlowNeo\u3011\u5C1A\u65E0\u4EFB\u52A1\u72B6\u6001\uFF1A\u5224\u5B9A\u672C\u4EFB\u52A1 light/full \u6A21\u5F0F\u5E76\u5199\u5165 .flow-neo/current/status.md\uFF1Bfull \u6A21\u5F0F\u6309\u4E94\u9636\u6BB5\u63A8\u8FDB\u5E76\u9075\u5B88 Router \u7EAA\u5F8B\u3002";
  }
  if (s.mode === "light") {
    return `\u3010FlowNeo\u3011\u8F7B\u91CF\u6A21\u5F0F\uFF08${s.task || "\u672A\u547D\u540D"}\uFF09\uFF1A\u76F4\u63A5\u7F16\u7801 \u2192 \u7B80\u6613\u81EA\u67E5 \u2192 \u4EA4\u4ED8\uFF0C\u4EC5 status.md \u4E00\u884C\u8BB0\u5F55\uFF0C\u4E0D\u4EA7\u751F\u5176\u4ED6\u5DE5\u4EF6\u3002`;
  }
  return `\u3010FlowNeo\u3011\u5B8C\u6574\u6A21\u5F0F\uFF0C\u5F53\u524D\u9636\u6BB5 ${s.stage || "?"}\uFF08${s.task || "\u672A\u547D\u540D"}\uFF09\uFF1A\u9075\u5B88\u8BE5\u9636\u6BB5\u7EAA\u5F8B\uFF0C\u4EA7\u51FA/\u66F4\u65B0\u5BF9\u5E94\u5DE5\u4EF6\u540E\u5148\u66F4\u65B0 status.md \u518D\u8FDB\u5165\u4E0B\u4E00\u9636\u6BB5\u3002`;
}

// src/hooks/user-prompt-submit.ts
var context = buildTurnReminder(process.cwd());
process.stdout.write(hookContext("UserPromptSubmit", context));
