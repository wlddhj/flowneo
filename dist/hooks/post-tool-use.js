// src/hooks/post-tool-use.ts
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";

// src/lib/schema.ts
var ARTIFACT_SCHEMAS = {
  "01-need-explore.md": [
    "## \u7528\u6237\u539F\u59CB\u9700\u6C42",
    "## \u6838\u5FC3\u5F00\u53D1\u76EE\u6807",
    "## \u9700\u6C42\u8FB9\u754C\u4E0E\u4E0D\u505A\u4E8B\u9879",
    "## \u8FD0\u884C\u73AF\u5883\u4E0E\u517C\u5BB9\u8981\u6C42",
    "## \u9A8C\u6536\u6807\u51C6",
    "## \u5F85\u786E\u8BA4\u95EE\u9898\u4E0E\u7ED3\u8BBA"
  ],
  "02-design-plan.md": [
    "## \u4E00\u3001\u9700\u6C42\u89C4\u683C",
    "## \u4E8C\u3001\u529F\u80FD\u8BBE\u8BA1",
    "## \u4E09\u3001\u67B6\u6784/\u6570\u636E\u8BBE\u8BA1",
    "## \u56DB\u3001\u4EFB\u52A1\u62C6\u89E3"
  ],
  "03-task-record.md": ["## \u81EA\u6D4B\u7ED3\u679C"],
  "04-code-review.md": ["## \u5BA1\u67E5\u8303\u56F4", "## \u5BA1\u67E5\u7ED3\u679C", "## \u8BBE\u8BA1\u4E00\u81F4\u6027\u6BD4\u5BF9"],
  "05-archive-summary.md": [
    "## \u529F\u80FD\u603B\u7ED3",
    "## \u53D8\u66F4\u6587\u4EF6\u6E05\u5355",
    "## \u6838\u5FC3\u5B9E\u73B0\u590D\u76D8",
    "## \u9057\u7559\u95EE\u9898\u4E0E\u8FED\u4EE3\u5EFA\u8BAE",
    "## \u5DE5\u4EF6\u7D22\u5F15"
  ]
};
function validateArtifact(fileName2, content) {
  const required = ARTIFACT_SCHEMAS[fileName2];
  if (!required) return [];
  return required.filter((h) => !content.includes(h)).map((h) => `\u7F3A\u5931\u7AE0\u8282\uFF1A${h}`);
}

// src/hooks/post-tool-use.ts
var input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}
var filePath = input.tool_input?.file_path ?? input.tool_input?.filePath ?? "";
var fileName = basename(filePath);
if (!filePath.includes(".flow-neo") || !(fileName in ARTIFACT_SCHEMAS)) process.exit(0);
if (!existsSync(filePath)) process.exit(0);
var warnings = validateArtifact(fileName, readFileSync(filePath, "utf8"));
if (warnings.length > 0) {
  console.error(
    `\u3010FlowNeo Schema\u3011${fileName} \u6821\u9A8C\u8B66\u544A\uFF08\u4EC5\u63D0\u793A\u4E0D\u963B\u65AD\uFF09\uFF1A
  - ${warnings.join("\n  - ")}
  \u53EF\u8FD0\u884C flowneo lint \u67E5\u770B\u8BE6\u60C5`
  );
}
process.exit(0);
