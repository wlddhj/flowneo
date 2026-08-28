#!/usr/bin/env node

// src/cli/main.ts
import { fileURLToPath } from "node:url";

// src/lib/lint.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// src/lib/tokens.ts
var CJK_RE = /[一-鿿　-〿＀-￯]/g;
function estimateTokens(text) {
  const cjk = (text.match(CJK_RE) ?? []).length;
  return Math.ceil(cjk + (text.length - cjk) / 4);
}

// src/lib/lint.ts
var ROUTER_TOKEN_LIMIT = 1500;
var NAME_RE = /^flowneo-[a-z0-9-]+$/;
var DESC_MIN = 20;
function lintAgentsSync(agentsFile, routerFile) {
  if (!existsSync(agentsFile)) return [`\u7F3A\u5931 ${agentsFile}`];
  if (!existsSync(routerFile)) return [];
  const stripped = readFileSync(agentsFile, "utf8").trim().replace(/^<!-- FLOWNEO:BEGIN -->/, "").replace(/<!-- FLOWNEO:END -->$/, "").trim();
  if (stripped !== readFileSync(routerFile, "utf8").trim()) {
    return ["AGENTS-flowneo.md \u4E0E router.md \u4E0D\u540C\u6B65\uFF08Codex \u7AEF\u8BDD\u672F\u6F02\u79FB\uFF09"];
  }
  return [];
}
function lintAll(skillsDir, agentsFile, routerLimit = ROUTER_TOKEN_LIMIT) {
  const errors = [];
  const routerFile = join(skillsDir, "_router/router.md");
  if (!existsSync(routerFile)) {
    errors.push(`\u7F3A\u5931 ${routerFile}`);
  } else {
    const tokens = estimateTokens(readFileSync(routerFile, "utf8"));
    if (tokens > routerLimit) {
      errors.push(`router.md \u4F30\u7B97 ${tokens} tokens\uFF0C\u8D85\u9650 ${routerLimit}`);
    }
  }
  if (agentsFile) errors.push(...lintAgentsSync(agentsFile, routerFile));
  if (!existsSync(skillsDir)) return errors;
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    const file = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(file)) {
      errors.push(`${entry.name}/ \u7F3A\u5C11 SKILL.md`);
      continue;
    }
    const text = readFileSync(file, "utf8");
    const name = text.match(/^name:\s*(\S+)\s*$/m)?.[1];
    const desc = text.match(/^description:\s*(.+)$/m)?.[1]?.trim();
    if (!name || !NAME_RE.test(name)) {
      errors.push(`${entry.name}: name \u65E0\u6548\uFF08\u9700 flowneo- \u524D\u7F00\uFF0C\u5C0F\u5199\u8FDE\u5B57\u7B26\uFF09`);
    }
    if (!desc || desc.length < DESC_MIN) {
      errors.push(`${entry.name}: description \u7F3A\u5931\u6216\u5C11\u4E8E ${DESC_MIN} \u5B57\u7B26`);
    }
  }
  return errors;
}

// src/lib/installer.ts
import { cpSync, existsSync as existsSync2, mkdirSync, readFileSync as readFileSync2, rmSync, writeFileSync } from "node:fs";
import { join as join2 } from "node:path";
var MARK_BEGIN = "<!-- FLOWNEO:BEGIN -->";
var MARK_END = "<!-- FLOWNEO:END -->";
var FLOWNEO_SKILL_DIRS = [
  "_router",
  "01-need-explore",
  "02-design-plan",
  "03-task-execute",
  "04-code-review",
  "05-git-archive"
];
var FLOWNEO_HOOK_EVENTS = ["SessionStart", "UserPromptSubmit", "PostToolUse"];
var FLOWNEO_HOOK_CMDS = {
  SessionStart: "node .claude/flowneo/hooks/session-start.js",
  UserPromptSubmit: "node .claude/flowneo/hooks/user-prompt-submit.js",
  PostToolUse: "node .claude/flowneo/hooks/post-tool-use.js"
};
function copySkills(cwd, pluginRoot2, target) {
  const dest = target === "claude" ? join2(cwd, ".claude/skills") : join2(cwd, ".codex/skills");
  cpSync(join2(pluginRoot2, "skills"), dest, { recursive: true });
}
function copyHooks(cwd, pluginRoot2) {
  cpSync(join2(pluginRoot2, "dist/hooks"), join2(cwd, ".claude/flowneo/hooks"), { recursive: true });
}
function mergeHooksSettings(cwd) {
  const file = join2(cwd, ".claude/settings.json");
  let settings = {};
  if (existsSync2(file)) {
    try {
      settings = JSON.parse(readFileSync2(file, "utf8"));
    } catch {
      settings = {};
    }
  }
  const hooks = settings.hooks ?? {};
  for (const ev of FLOWNEO_HOOK_EVENTS) {
    const entries = Array.isArray(hooks[ev]) ? hooks[ev] : [];
    const kept = entries.filter((e) => !JSON.stringify(e).includes(".claude/flowneo/hooks/"));
    hooks[ev] = [...kept, { hooks: [{ type: "command", command: FLOWNEO_HOOK_CMDS[ev], async: false }] }];
  }
  settings.hooks = hooks;
  mkdirSync(join2(file, ".."), { recursive: true });
  writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
}
function updateAgentsMd(cwd, pluginRoot2) {
  const file = join2(cwd, "AGENTS.md");
  const section = readFileSync2(join2(pluginRoot2, "AGENTS-flowneo.md"), "utf8").trimEnd();
  let current = "";
  if (existsSync2(file)) current = readFileSync2(file, "utf8");
  if (current.includes(MARK_BEGIN) && current.includes(MARK_END)) {
    const re = new RegExp(`${MARK_BEGIN}[\\s\\S]*?${MARK_END}`, "g");
    current = current.replace(re, section);
    writeFileSync(file, current.endsWith("\n") ? current : `${current}
`);
    return;
  }
  current = current.trimEnd().length === 0 ? section : `${current.trimEnd()}

${section}`;
  writeFileSync(file, `${current}
`);
}
function removeAgentsSection(cwd) {
  const file = join2(cwd, "AGENTS.md");
  if (!existsSync2(file)) return false;
  const current = readFileSync2(file, "utf8");
  if (!current.includes(MARK_BEGIN)) return false;
  const re = new RegExp(`\\n*${MARK_BEGIN}[\\s\\S]*?${MARK_END}\\n*`, "g");
  writeFileSync(file, current.replace(re, "\n").trim() + "\n");
  return true;
}
function removeHooksSettings(cwd) {
  const file = join2(cwd, ".claude/settings.json");
  if (!existsSync2(file)) return;
  let settings;
  try {
    settings = JSON.parse(readFileSync2(file, "utf8"));
  } catch {
    return;
  }
  const hooks = settings.hooks ?? {};
  for (const ev of FLOWNEO_HOOK_EVENTS) {
    const entries = hooks[ev];
    if (!Array.isArray(entries)) continue;
    const kept = entries.filter((e) => {
      const cmd = JSON.stringify(e);
      return !cmd.includes(".claude/flowneo/hooks/");
    });
    if (kept.length === 0) delete hooks[ev];
    else hooks[ev] = kept;
  }
  settings.hooks = hooks;
  writeFileSync(file, JSON.stringify(settings, null, 2) + "\n");
}
function ensureFlowNeoConfig(cwd, pluginRoot2) {
  const dest = join2(cwd, ".flow-neo/config/plugin.config.json");
  if (existsSync2(dest)) return;
  mkdirSync(join2(dest, ".."), { recursive: true });
  cpSync(join2(pluginRoot2, "config/plugin.config.json"), dest);
}
function init(opts, cwd, pluginRoot2) {
  const done = [];
  const targets = opts.target === "all" ? ["claude", "codex"] : [opts.target];
  for (const t of targets) {
    copySkills(cwd, pluginRoot2, t);
    done.push(`${t} skills`);
    if (t === "claude") {
      copyHooks(cwd, pluginRoot2);
      mergeHooksSettings(cwd);
      done.push("claude hooks + settings");
    } else {
      updateAgentsMd(cwd, pluginRoot2);
      done.push("codex AGENTS.md \u6807\u8BB0\u6BB5");
    }
  }
  ensureFlowNeoConfig(cwd, pluginRoot2);
  done.push(".flow-neo/config");
  return done;
}
function remove(opts, cwd) {
  const done = [];
  const targets = opts.target === "all" ? ["claude", "codex"] : [opts.target];
  for (const t of targets) {
    const skillsDir = t === "claude" ? join2(cwd, ".claude/skills") : join2(cwd, ".codex/skills");
    for (const d of FLOWNEO_SKILL_DIRS) {
      rmSync(join2(skillsDir, d), { recursive: true, force: true });
    }
    done.push(`${t} skills`);
    if (t === "claude") {
      rmSync(join2(cwd, ".claude/flowneo"), { recursive: true, force: true });
      removeHooksSettings(cwd);
      done.push("claude hooks \u6CE8\u9500");
    } else if (removeAgentsSection(cwd)) {
      done.push("codex AGENTS.md \u6807\u8BB0\u6BB5\u79FB\u9664");
    }
  }
  return done;
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
function readConfig(cwd) {
  const file = join3(cwd, ".flow-neo/config/plugin.config.json");
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

// src/cli/main.ts
var command = process.argv[2];
var args = process.argv.slice(3);
var pluginRoot = fileURLToPath(new URL("../", import.meta.url));
function parseOpts() {
  const target = args.includes("--claude") ? "claude" : args.includes("--codex") ? "codex" : "all";
  const scope = args.includes("--user") ? "user" : "project";
  return { target, scope };
}
if (command === "lint") {
  const errors = lintAll(
    fileURLToPath(new URL("../skills/", import.meta.url)),
    fileURLToPath(new URL("../AGENTS-flowneo.md", import.meta.url)),
    readConfig(process.cwd()).lint.routerLimit
  );
  if (errors.length > 0) {
    console.error("flowneo lint \u5931\u8D25\uFF1A\n" + errors.map((e) => ` - ${e}`).join("\n"));
    process.exit(1);
  }
  console.log("flowneo lint \u901A\u8FC7");
} else if (command === "init" || command === "remove") {
  const opts = parseOpts();
  if (opts.scope === "user") {
    console.log("\u63D0\u793A\uFF1Auser \u7EA7\u5B89\u88C5\u5C06\u5728\u540E\u7EED\u7248\u672C\u652F\u6301\uFF0C\u672C\u6B21\u6309 project \u7EA7\u6267\u884C");
  }
  const done = command === "init" ? init(opts, process.cwd(), pluginRoot) : remove(opts, process.cwd());
  const effectiveScope = opts.scope === "user" ? "project\uFF08--user \u6309\u5B9E\u9645\u751F\u6548\u503C\u8F93\u51FA\uFF09" : opts.scope;
  console.log(`flowneo ${command} \u5B8C\u6210\uFF08target=${opts.target}\uFF0Cscope=${effectiveScope}\uFF09\uFF1A`);
  for (const d of done) console.log(` - ${d}`);
} else {
  console.error("\u7528\u6CD5\uFF1Aflowneo <lint | init | remove> [--claude|--codex|--all] [--project|--user]");
  console.error("  lint               \u6821\u9A8C\u6280\u80FD\u3001Router \u4E0E AGENTS \u540C\u6B65");
  console.error("  init               \u5B89\u88C5 FlowNeo \u5230\u5F53\u524D\u9879\u76EE\uFF08\u9ED8\u8BA4 --all --project\uFF09");
  console.error("  remove             \u4ECE\u5F53\u524D\u9879\u76EE\u5B89\u5168\u5378\u8F7D\uFF08\u4FDD\u7559\u7528\u6237\u81EA\u6709\u6280\u80FD/hooks/AGENTS \u5185\u5BB9\uFF09");
  process.exit(1);
}
