# FlowNeo 基准报告 2026-11-20-flash

## Setup

- 模型/CLI 版本：<人工补充：claude --version / 实际模型>
- 格数：78（ok 78 / timeout 0 / error 0）
- 臂定义：baseline（裸 CC）/ flowneo（--plugin-dir 本仓库）/ verbal（--append-system-prompt 一句话）
- 隔离：--setting-sources project,local + CLAUDE_CODE_DISABLE_CLAUDE_MDS/AUTO_MEMORY + 每臂 --plugin-dir
- 停等确认：flowneo 臂检测停等标记自动续轮注入「确认」（上限 3，token 计入该臂）

## 任务 × 臂汇总

| task | arm | n | 漏需求命中 | 工件 | turns | 重编 | srcLoc | testLoc | 时长s | cost$ | tokOut |
|---|---|---|---|---|---|---|---|---|---|---|---|
| add-verbose-flag | baseline | 3 | 9/9 (100%) | 0.0 | 5.0 | 1.3 | 4 | 0 | 17 | 0.161 | 509 |
| add-verbose-flag | flowneo | 3 | 9/9 (100%) | 0.0 | 4.3 | 1.0 | 5 | 0 | 23 | 0.213 | 680 |
| api-pagination | baseline | 3 | 20/21 (95%) | 0.0 | 11.7 | 1.3 | 225 | 0 | 144 | 0.500 | 7944 |
| api-pagination | flowneo | 3 | 21/21 (100%) | 6.0 | 51.0 | 6.0 | 229 | 0 | 591 | 2.092 | 27516 |
| cache-layer | baseline | 3 | 17/18 (94%) | 0.0 | 13.0 | 3.0 | 197 | 0 | 203 | 0.551 | 9422 |
| cache-layer | flowneo | 3 | 17/18 (94%) | 6.0 | 50.3 | 6.0 | 155 | 0 | 447 | 2.148 | 25118 |
| cli-subcommand | baseline | 3 | 24/24 (100%) | 0.0 | 12.3 | 1.7 | 196 | 0 | 113 | 0.475 | 6766 |
| cli-subcommand | flowneo | 3 | 24/24 (100%) | 6.0 | 52.0 | 7.0 | 217 | 0 | 542 | 2.195 | 28145 |
| config-migrate | baseline | 3 | 20/21 (95%) | 0.0 | 12.0 | 1.3 | 139 | 0 | 124 | 0.432 | 5891 |
| config-migrate | flowneo | 3 | 20/21 (95%) | 6.0 | 55.0 | 6.3 | 186 | 0 | 578 | 2.363 | 30458 |
| docs-update | baseline | 3 | 6/6 (100%) | 0.0 | 6.0 | 1.0 | 7 | 0 | 20 | 0.140 | 768 |
| docs-update | flowneo | 3 | 6/6 (100%) | 0.0 | 6.7 | 1.0 | 7 | 0 | 35 | 0.202 | 1158 |
| error-taxonomy | baseline | 3 | 18/18 (100%) | 0.0 | 10.0 | 2.0 | 90 | 0 | 71 | 0.314 | 2489 |
| error-taxonomy | flowneo | 3 | 18/18 (100%) | 6.0 | 47.0 | 6.7 | 80 | 0 | 386 | 1.771 | 21735 |
| fix-offbyone | baseline | 3 | 9/9 (100%) | 0.0 | 4.3 | 1.0 | 2 | 0 | 23 | 0.164 | 807 |
| fix-offbyone | flowneo | 3 | 9/9 (100%) | 0.0 | 5.0 | 1.0 | 2 | 0 | 25 | 0.203 | 1050 |
| log-redact | baseline | 3 | 18/18 (100%) | 0.0 | 10.3 | 1.7 | 133 | 0 | 63 | 0.267 | 3165 |
| log-redact | flowneo | 3 | 18/18 (100%) | 6.0 | 45.3 | 7.0 | 125 | 0 | 384 | 1.534 | 20105 |
| multi-format-export | baseline | 3 | 18/18 (100%) | 0.0 | 11.7 | 2.3 | 167 | 0 | 101 | 0.338 | 4473 |
| multi-format-export | flowneo | 3 | 18/18 (100%) | 6.0 | 44.3 | 6.7 | 148 | 0 | 418 | 1.821 | 21508 |
| refactor-extract | baseline | 3 | 18/18 (100%) | 0.0 | 11.7 | 1.0 | 56 | 0 | 102 | 0.404 | 5982 |
| refactor-extract | flowneo | 3 | 18/18 (100%) | 6.0 | 54.7 | 6.7 | 56 | 0 | 437 | 2.025 | 23747 |
| retry-idempotent | baseline | 3 | 5/18 (28%) | 0.0 | 9.3 | 1.3 | 129 | 0 | 150 | 0.440 | 7785 |
| retry-idempotent | flowneo | 3 | 6/18 (33%) | 6.0 | 46.3 | 6.3 | 146 | 0 | 479 | 1.755 | 25601 |
| validate-boundary | baseline | 3 | 18/18 (100%) | 0.0 | 9.7 | 1.0 | 183 | 0 | 84 | 0.337 | 4723 |
| validate-boundary | flowneo | 3 | 18/18 (100%) | 6.0 | 49.7 | 6.7 | 154 | 0 | 403 | 1.878 | 20962 |

## 逐格数据

| task | arm | run | status | hits | turns | 重编 | srcLoc | testLoc | 时长s | cost$ | 续轮 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| add-verbose-flag | baseline | 1 | ok | 3/3 | 5 | 2 | 4 | 0 | 17 | 0.162 | 0 |
| add-verbose-flag | baseline | 2 | ok | 3/3 | 4 | 1 | 4 | 0 | 13 | 0.149 | 0 |
| add-verbose-flag | baseline | 3 | ok | 3/3 | 6 | 1 | 5 | 0 | 21 | 0.172 | 0 |
| add-verbose-flag | flowneo | 1 | ok | 3/3 | 4 | 1 | 4 | 0 | 31 | 0.272 | 0 |
| add-verbose-flag | flowneo | 2 | ok | 3/3 | 5 | 1 | 5 | 0 | 18 | 0.202 | 0 |
| add-verbose-flag | flowneo | 3 | ok | 3/3 | 4 | 1 | 5 | 0 | 19 | 0.166 | 0 |
| api-pagination | baseline | 1 | ok | 7/7 | 10 | 1 | 250 | 0 | 173 | 0.596 | 0 |
| api-pagination | baseline | 2 | ok | 7/7 | 12 | 2 | 178 | 0 | 104 | 0.397 | 0 |
| api-pagination | baseline | 3 | ok | 6/7 | 13 | 1 | 247 | 0 | 157 | 0.506 | 0 |
| api-pagination | flowneo | 1 | ok | 7/7 | 51 | 6 | 243 | 0 | 649 | 2.147 | 1 |
| api-pagination | flowneo | 2 | ok | 7/7 | 46 | 6 | 253 | 0 | 488 | 1.563 | 1 |
| api-pagination | flowneo | 3 | ok | 7/7 | 56 | 6 | 190 | 0 | 634 | 2.567 | 2 |
| cache-layer | baseline | 1 | ok | 6/6 | 10 | 2 | 142 | 0 | 122 | 0.331 | 0 |
| cache-layer | baseline | 2 | ok | 6/6 | 9 | 1 | 244 | 0 | 192 | 0.477 | 0 |
| cache-layer | baseline | 3 | ok | 5/6 | 20 | 6 | 205 | 0 | 294 | 0.846 | 0 |
| cache-layer | flowneo | 1 | ok | 5/6 | 42 | 6 | 110 | 0 | 476 | 1.500 | 1 |
| cache-layer | flowneo | 2 | ok | 6/6 | 58 | 6 | 229 | 0 | 366 | 2.727 | 2 |
| cache-layer | flowneo | 3 | ok | 6/6 | 51 | 6 | 127 | 0 | 499 | 2.218 | 2 |
| cli-subcommand | baseline | 1 | ok | 8/8 | 13 | 1 | 222 | 0 | 67 | 0.510 | 0 |
| cli-subcommand | baseline | 2 | ok | 8/8 | 13 | 3 | 188 | 0 | 134 | 0.456 | 0 |
| cli-subcommand | baseline | 3 | ok | 8/8 | 11 | 1 | 178 | 0 | 137 | 0.459 | 0 |
| cli-subcommand | flowneo | 1 | ok | 8/8 | 57 | 7 | 220 | 0 | 540 | 2.148 | 1 |
| cli-subcommand | flowneo | 2 | ok | 8/8 | 48 | 7 | 197 | 0 | 511 | 2.144 | 2 |
| cli-subcommand | flowneo | 3 | ok | 8/8 | 51 | 7 | 233 | 0 | 577 | 2.294 | 2 |
| config-migrate | baseline | 1 | ok | 6/7 | 12 | 2 | 112 | 0 | 86 | 0.370 | 0 |
| config-migrate | baseline | 2 | ok | 7/7 | 12 | 1 | 152 | 0 | 175 | 0.436 | 0 |
| config-migrate | baseline | 3 | ok | 7/7 | 12 | 1 | 153 | 0 | 112 | 0.489 | 0 |
| config-migrate | flowneo | 1 | ok | 7/7 | 52 | 6 | 193 | 0 | 564 | 2.309 | 2 |
| config-migrate | flowneo | 2 | ok | 6/7 | 48 | 6 | 160 | 0 | 517 | 1.987 | 1 |
| config-migrate | flowneo | 3 | ok | 7/7 | 65 | 7 | 206 | 0 | 653 | 2.794 | 2 |
| docs-update | baseline | 1 | ok | 2/2 | 6 | 1 | 6 | 0 | 15 | 0.083 | 0 |
| docs-update | baseline | 2 | ok | 2/2 | 5 | 1 | 6 | 0 | 16 | 0.158 | 0 |
| docs-update | baseline | 3 | ok | 2/2 | 7 | 1 | 10 | 0 | 28 | 0.178 | 0 |
| docs-update | flowneo | 1 | ok | 2/2 | 6 | 1 | 6 | 0 | 20 | 0.185 | 0 |
| docs-update | flowneo | 2 | ok | 2/2 | 8 | 1 | 6 | 0 | 54 | 0.215 | 0 |
| docs-update | flowneo | 3 | ok | 2/2 | 6 | 1 | 8 | 0 | 30 | 0.205 | 0 |
| error-taxonomy | baseline | 1 | ok | 6/6 | 8 | 1 | 116 | 0 | 48 | 0.352 | 0 |
| error-taxonomy | baseline | 2 | ok | 6/6 | 11 | 3 | 73 | 0 | 94 | 0.355 | 0 |
| error-taxonomy | baseline | 3 | ok | 6/6 | 11 | 2 | 81 | 0 | 70 | 0.235 | 0 |
| error-taxonomy | flowneo | 1 | ok | 6/6 | 46 | 6 | 93 | 0 | 393 | 1.567 | 1 |
| error-taxonomy | flowneo | 2 | ok | 6/6 | 48 | 8 | 85 | 0 | 421 | 2.004 | 2 |
| error-taxonomy | flowneo | 3 | ok | 6/6 | 47 | 6 | 61 | 0 | 343 | 1.743 | 2 |
| fix-offbyone | baseline | 1 | ok | 3/3 | 4 | 1 | 2 | 0 | 22 | 0.156 | 0 |
| fix-offbyone | baseline | 2 | ok | 3/3 | 5 | 1 | 2 | 0 | 21 | 0.080 | 0 |
| fix-offbyone | baseline | 3 | ok | 3/3 | 4 | 1 | 2 | 0 | 28 | 0.257 | 0 |
| fix-offbyone | flowneo | 1 | ok | 3/3 | 5 | 1 | 2 | 0 | 22 | 0.187 | 0 |
| fix-offbyone | flowneo | 2 | ok | 3/3 | 5 | 1 | 2 | 0 | 28 | 0.196 | 0 |
| fix-offbyone | flowneo | 3 | ok | 3/3 | 5 | 1 | 2 | 0 | 27 | 0.226 | 0 |
| log-redact | baseline | 1 | ok | 6/6 | 11 | 1 | 154 | 0 | 78 | 0.240 | 0 |
| log-redact | baseline | 2 | ok | 6/6 | 9 | 1 | 123 | 0 | 48 | 0.248 | 0 |
| log-redact | baseline | 3 | ok | 6/6 | 11 | 3 | 122 | 0 | 63 | 0.312 | 0 |
| log-redact | flowneo | 1 | ok | 6/6 | 50 | 7 | 135 | 0 | 411 | 1.582 | 1 |
| log-redact | flowneo | 2 | ok | 6/6 | 41 | 7 | 114 | 0 | 324 | 1.337 | 1 |
| log-redact | flowneo | 3 | ok | 6/6 | 45 | 7 | 125 | 0 | 417 | 1.685 | 1 |
| multi-format-export | baseline | 1 | ok | 6/6 | 14 | 3 | 185 | 0 | 134 | 0.418 | 0 |
| multi-format-export | baseline | 2 | ok | 6/6 | 10 | 2 | 164 | 0 | 76 | 0.333 | 0 |
| multi-format-export | baseline | 3 | ok | 6/6 | 11 | 2 | 153 | 0 | 91 | 0.261 | 0 |
| multi-format-export | flowneo | 1 | ok | 6/6 | 38 | 6 | 137 | 0 | 344 | 1.477 | 1 |
| multi-format-export | flowneo | 2 | ok | 6/6 | 44 | 8 | 145 | 0 | 411 | 1.859 | 2 |
| multi-format-export | flowneo | 3 | ok | 6/6 | 51 | 6 | 161 | 0 | 497 | 2.127 | 2 |
| refactor-extract | baseline | 1 | ok | 6/6 | 11 | 1 | 56 | 0 | 44 | 0.395 | 0 |
| refactor-extract | baseline | 2 | ok | 6/6 | 12 | 1 | 54 | 0 | 108 | 0.358 | 0 |
| refactor-extract | baseline | 3 | ok | 6/6 | 12 | 1 | 58 | 0 | 154 | 0.458 | 0 |
| refactor-extract | flowneo | 1 | ok | 6/6 | 59 | 8 | 59 | 0 | 550 | 2.358 | 2 |
| refactor-extract | flowneo | 2 | ok | 6/6 | 54 | 6 | 50 | 0 | 343 | 1.763 | 2 |
| refactor-extract | flowneo | 3 | ok | 6/6 | 51 | 6 | 60 | 0 | 417 | 1.954 | 1 |
| retry-idempotent | baseline | 1 | ok | 2/6 | 8 | 1 | 146 | 0 | 162 | 0.457 | 0 |
| retry-idempotent | baseline | 2 | ok | 2/6 | 9 | 1 | 108 | 0 | 133 | 0.384 | 0 |
| retry-idempotent | baseline | 3 | ok | 1/6 | 11 | 2 | 133 | 0 | 155 | 0.478 | 0 |
| retry-idempotent | flowneo | 1 | ok | 2/6 | 40 | 6 | 156 | 0 | 401 | 1.385 | 1 |
| retry-idempotent | flowneo | 2 | ok | 2/6 | 55 | 7 | 143 | 0 | 557 | 2.112 | 1 |
| retry-idempotent | flowneo | 3 | ok | 2/6 | 44 | 6 | 139 | 0 | 477 | 1.769 | 1 |
| validate-boundary | baseline | 1 | ok | 6/6 | 10 | 1 | 176 | 0 | 98 | 0.352 | 0 |
| validate-boundary | baseline | 2 | ok | 6/6 | 10 | 1 | 182 | 0 | 70 | 0.329 | 0 |
| validate-boundary | baseline | 3 | ok | 6/6 | 9 | 1 | 191 | 0 | 84 | 0.329 | 0 |
| validate-boundary | flowneo | 1 | ok | 6/6 | 54 | 7 | 154 | 0 | 483 | 1.968 | 2 |
| validate-boundary | flowneo | 2 | ok | 6/6 | 47 | 7 | 185 | 0 | 346 | 1.815 | 2 |
| validate-boundary | flowneo | 3 | ok | 6/6 | 48 | 6 | 123 | 0 | 380 | 1.850 | 2 |

## 分析与局限

<人工补充：结论、方差观察、方法论局限（本基准设计为可证伪：若 FlowNeo 臂漏需求率未降或成本大增，应如实呈现）>
