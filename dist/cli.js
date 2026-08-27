#!/usr/bin/env node

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
function lintAll(skillsDir) {
  const errors = [];
  const routerFile = join(skillsDir, "_router/router.md");
  if (!existsSync(routerFile)) {
    errors.push(`\u7F3A\u5931 ${routerFile}`);
  } else {
    const tokens = estimateTokens(readFileSync(routerFile, "utf8"));
    if (tokens > ROUTER_TOKEN_LIMIT) {
      errors.push(`router.md \u4F30\u7B97 ${tokens} tokens\uFF0C\u8D85\u9650 ${ROUTER_TOKEN_LIMIT}`);
    }
  }
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

// src/cli/main.ts
var command = process.argv[2];
if (command === "lint") {
  const errors = lintAll(new URL("../../skills/", import.meta.url).pathname);
  if (errors.length > 0) {
    console.error("flowneo lint \u5931\u8D25\uFF1A\n" + errors.map((e) => ` - ${e}`).join("\n"));
    process.exit(1);
  }
  console.log("flowneo lint \u901A\u8FC7");
} else {
  console.error("\u7528\u6CD5\uFF1Aflowneo lint");
  process.exit(1);
}
