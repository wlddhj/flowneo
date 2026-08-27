# FlowNeo 测试方法

FlowNeo 区分代码集成测试（进 CI）与 LLM 行为验证（不进 CI）两类，与 superpowers 的 `tests/` vs `evals/` 双轨模型一致。

## tests/（代码集成测试，进 CI）

Vitest 单测，覆盖纯函数逻辑：

| 文件 | 覆盖 |
|---|---|
| `tests/tokens.test.ts` | token 估算（CJK / ASCII 混合） |
| `tests/tasks.test.ts` | slug 生成 / 绑定读写 / 任务列表 / 过期清理 / stdin 解析 |
| `tests/router.test.ts` | Router 组装、绑定感知注入、多任务列表截断、safe 兜底 |
| `tests/inject.test.ts` | hook JSON 输出格式 |
| `tests/lint.test.ts` | lint 校验逻辑 |

运行：`npm test`

## 真机 eval（LLM 行为验证，不进 CI）

通过 `claude -p` 非交互会话验证技能链触发与分流判定：

- **注入验证**：`claude -p '复述你收到的 FLOWNEO_ROUTER 第一行'`
- **技能触发与 premature-action 检测**：`claude -p '<重任务需求>' --max-turns N --output-format stream-json`，grep Skill 调用事件，断言首个工具调用是 Skill
- **多会话并行**：两会话各自绑定不同任务，互不干扰

详见各实施计划的「真机验收」清单。

## 为何 eval 不进 CI

LLM 输出非确定性，CI 跑 eval 会引入 flaky。eval 作为发版前人工或本地脚本验证。
