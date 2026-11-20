# FlowNeo 基准报告 2026-11-20-router-v2

## Setup

- 模型/CLI 版本：<人工补充：claude --version / 实际模型>
- 格数：39（ok 39 / timeout 0 / error 0）
- 臂定义：baseline（裸 CC）/ flowneo（--plugin-dir 本仓库）/ verbal（--append-system-prompt 一句话）
- 隔离：--setting-sources project,local + CLAUDE_CODE_DISABLE_CLAUDE_MDS/AUTO_MEMORY + 每臂 --plugin-dir
- 停等确认：flowneo 臂检测停等标记自动续轮注入「确认」（上限 3，token 计入该臂）

## 任务 × 臂汇总

| task | arm | n | 漏需求命中 | 工件 | turns | 重编 | srcLoc | testLoc | 时长s | cost$ | tokOut |
|---|---|---|---|---|---|---|---|---|---|---|---|
| add-verbose-flag | flowneo | 3 | 9/9 (100%) | 0.0 | 5.0 | 1.0 | 5 | 0 | 23 | 0.149 | 863 |
| api-pagination | flowneo | 3 | 20/21 (95%) | 6.0 | 45.3 | 6.3 | 220 | 0 | 528 | 1.825 | 29384 |
| cache-layer | flowneo | 3 | 18/18 (100%) | 6.0 | 53.0 | 5.7 | 194 | 0 | 595 | 1.910 | 30121 |
| cli-subcommand | flowneo | 3 | 24/24 (100%) | 6.0 | 49.0 | 6.7 | 220 | 0 | 614 | 2.051 | 30831 |
| config-migrate | flowneo | 3 | 21/21 (100%) | 6.0 | 51.7 | 6.7 | 146 | 0 | 423 | 1.874 | 25064 |
| docs-update | flowneo | 3 | 6/6 (100%) | 0.0 | 6.7 | 1.0 | 7 | 0 | 19 | 0.182 | 870 |
| error-taxonomy | flowneo | 3 | 18/18 (100%) | 6.0 | 47.7 | 7.0 | 92 | 0 | 339 | 1.600 | 19354 |
| fix-offbyone | flowneo | 3 | 9/9 (100%) | 0.0 | 5.3 | 1.0 | 2 | 0 | 22 | 0.191 | 1123 |
| log-redact | flowneo | 3 | 18/18 (100%) | 6.0 | 45.0 | 6.7 | 125 | 0 | 421 | 1.422 | 20897 |
| multi-format-export | flowneo | 3 | 18/18 (100%) | 6.0 | 49.0 | 6.7 | 177 | 0 | 457 | 1.887 | 27909 |
| refactor-extract | flowneo | 3 | 18/18 (100%) | 6.0 | 53.7 | 6.3 | 55 | 0 | 365 | 1.739 | 24047 |
| retry-idempotent | flowneo | 3 | 14/18 (78%) | 6.0 | 51.7 | 6.7 | 146 | 0 | 679 | 2.293 | 36597 |
| validate-boundary | flowneo | 3 | 18/18 (100%) | 6.0 | 43.0 | 6.0 | 136 | 0 | 374 | 1.418 | 20082 |

## 逐格数据

| task | arm | run | status | hits | turns | 重编 | srcLoc | testLoc | 时长s | cost$ | 续轮 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| add-verbose-flag | flowneo | 1 | ok | 3/3 | 4 | 1 | 5 | 0 | 22 | 0.081 | 0 |
| add-verbose-flag | flowneo | 2 | ok | 3/3 | 4 | 1 | 5 | 0 | 26 | 0.177 | 0 |
| add-verbose-flag | flowneo | 3 | ok | 3/3 | 7 | 1 | 5 | 0 | 22 | 0.191 | 0 |
| api-pagination | flowneo | 1 | ok | 7/7 | 48 | 7 | 228 | 0 | 530 | 1.658 | 1 |
| api-pagination | flowneo | 2 | ok | 6/7 | 41 | 6 | 240 | 0 | 393 | 1.548 | 1 |
| api-pagination | flowneo | 3 | ok | 7/7 | 47 | 6 | 192 | 0 | 661 | 2.270 | 1 |
| cache-layer | flowneo | 1 | ok | 6/6 | 48 | 5 | 198 | 0 | 505 | 1.604 | 0 |
| cache-layer | flowneo | 2 | ok | 6/6 | 51 | 6 | 196 | 0 | 413 | 1.931 | 1 |
| cache-layer | flowneo | 3 | ok | 6/6 | 60 | 6 | 189 | 0 | 868 | 2.195 | 1 |
| cli-subcommand | flowneo | 1 | ok | 8/8 | 48 | 6 | 201 | 0 | 511 | 1.974 | 1 |
| cli-subcommand | flowneo | 2 | ok | 8/8 | 48 | 7 | 237 | 0 | 595 | 2.066 | 1 |
| cli-subcommand | flowneo | 3 | ok | 8/8 | 51 | 7 | 221 | 0 | 735 | 2.114 | 2 |
| config-migrate | flowneo | 1 | ok | 7/7 | 51 | 7 | 198 | 0 | 431 | 2.085 | 2 |
| config-migrate | flowneo | 2 | ok | 7/7 | 51 | 6 | 124 | 0 | 481 | 1.730 | 1 |
| config-migrate | flowneo | 3 | ok | 7/7 | 53 | 7 | 116 | 0 | 358 | 1.808 | 1 |
| docs-update | flowneo | 1 | ok | 2/2 | 6 | 1 | 6 | 0 | 16 | 0.166 | 0 |
| docs-update | flowneo | 2 | ok | 2/2 | 6 | 1 | 8 | 0 | 17 | 0.173 | 0 |
| docs-update | flowneo | 3 | ok | 2/2 | 8 | 1 | 6 | 0 | 25 | 0.208 | 0 |
| error-taxonomy | flowneo | 1 | ok | 6/6 | 51 | 7 | 79 | 0 | 304 | 1.703 | 1 |
| error-taxonomy | flowneo | 2 | ok | 6/6 | 47 | 7 | 100 | 0 | 421 | 1.502 | 1 |
| error-taxonomy | flowneo | 3 | ok | 6/6 | 45 | 7 | 97 | 0 | 291 | 1.595 | 2 |
| fix-offbyone | flowneo | 1 | ok | 3/3 | 6 | 1 | 2 | 0 | 19 | 0.194 | 0 |
| fix-offbyone | flowneo | 2 | ok | 3/3 | 6 | 1 | 2 | 0 | 27 | 0.194 | 0 |
| fix-offbyone | flowneo | 3 | ok | 3/3 | 4 | 1 | 2 | 0 | 21 | 0.186 | 0 |
| log-redact | flowneo | 1 | ok | 6/6 | 42 | 6 | 127 | 0 | 268 | 1.357 | 1 |
| log-redact | flowneo | 2 | ok | 6/6 | 46 | 6 | 123 | 0 | 535 | 1.477 | 1 |
| log-redact | flowneo | 3 | ok | 6/6 | 47 | 8 | 124 | 0 | 460 | 1.433 | 1 |
| multi-format-export | flowneo | 1 | ok | 6/6 | 49 | 6 | 150 | 0 | 548 | 2.163 | 1 |
| multi-format-export | flowneo | 2 | ok | 6/6 | 45 | 7 | 178 | 0 | 309 | 1.553 | 1 |
| multi-format-export | flowneo | 3 | ok | 6/6 | 53 | 7 | 204 | 0 | 514 | 1.946 | 1 |
| refactor-extract | flowneo | 1 | ok | 6/6 | 52 | 6 | 54 | 0 | 307 | 1.527 | 1 |
| refactor-extract | flowneo | 2 | ok | 6/6 | 52 | 7 | 57 | 0 | 427 | 1.945 | 1 |
| refactor-extract | flowneo | 3 | ok | 6/6 | 57 | 6 | 54 | 0 | 362 | 1.744 | 1 |
| retry-idempotent | flowneo | 1 | ok | 6/6 | 49 | 7 | 135 | 0 | 617 | 2.089 | 1 |
| retry-idempotent | flowneo | 2 | ok | 6/6 | 58 | 6 | 175 | 0 | 761 | 2.851 | 1 |
| retry-idempotent | flowneo | 3 | ok | 2/6 | 48 | 7 | 127 | 0 | 661 | 1.939 | 1 |
| validate-boundary | flowneo | 1 | ok | 6/6 | 46 | 6 | 178 | 0 | 429 | 1.556 | 1 |
| validate-boundary | flowneo | 2 | ok | 6/6 | 38 | 6 | 99 | 0 | 348 | 1.218 | 1 |
| validate-boundary | flowneo | 3 | ok | 6/6 | 45 | 6 | 132 | 0 | 344 | 1.481 | 1 |

## 分析与局限

<人工补充：结论、方差观察、方法论局限（本基准设计为可证伪：若 FlowNeo 臂漏需求率未降或成本大增，应如实呈现）>
