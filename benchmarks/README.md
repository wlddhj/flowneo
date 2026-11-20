# FlowNeo 基准测试

量化验证「有无 FlowNeo 工作流」对交付质量的影响。方法论参照 ponytail benchmarks（真实 headless 会话、多臂对照含排伪臂、good/bad 参照验证评分器、工作区保留支持离线重算），指标围绕 FlowNeo 的**质量主张**设计。

## 臂

| 臂 | 注入方式 | 说明 |
|---|---|---|
| `baseline` | 无 | 裸 Claude Code，公平基线 |
| `flowneo` | `--plugin-dir` 本仓库 | 完整 FlowNeo（Router 注入 + 五阶段技能） |
| `verbal` | `--append-system-prompt` | 排伪臂：一句话「先分析需求并形成设计方案，再编码实现，编码完成后自查审查再交付」——若一句话就能达到 FlowNeo 效果，基准应如实显示 |

## 隔离（防基线污染）

每格独立工作区，先建在系统 tmp（中性前缀，agent 看不到 benchmarks 路径），跑完移入 `runs/<stamp>/`：

- `--setting-sources project,local`（不加载 user 级全局插件）
- `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` / `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`（不加载任何 CLAUDE.md/AGENTS.md 与自动记忆）
- flowneo 臂才带 `--plugin-dir`；种子自动补 CJS `package.json`（防外层 ESM 配置波及 require）
- baseline 臂以 `routerSeen=false` 断言无 FlowNeo 痕迹（ponytail 2026-06-17 基线污染教训）

## 任务卡

13 张（10 重 + 3 轻），每张含：brief（工单口吻，不显式罗列全部需求点）、seed（种子工作区）、hiddenChecks（heavy 6~8 / light 2~3，合计 72）、good/bad 参照。

重任务口径对齐 Router 的「多文件变更」判定域（brief 含抽模块/补验证脚本），保证 flowneo 臂走五阶段；轻任务如实展示流程开销。评分以隐藏检查点命中率为核心（漏需求率），工件完备数（01~05+status）、turns、单文件重复编辑（返工代理）、srcLoc/testLoc（git diff vs 种子 commit，测试另计）、duration/tokens/cost（CLI JSON）逐格记录。

## 用法

```bash
npm run bench -- --selftest                      # 评分器与隔离断言（无 API，先跑这个）
npm run bench -- --dry --task cli-subcommand --arm flowneo   # 单格干跑：打印隔离参数/命令
npm run bench -- --run --runs 3 --workers 4 --stamp <日期>   # 全矩阵真格
npm run bench -- --rescore --stamp <日期>        # 离线重算（不调 API）
npm run bench -- --report --stamp <日期>         # 重新生成报告
```

## 停等确认驱动

flowneo 臂走五阶段会停等用户确认（02 设计确认 / 05 归档迁移）。headless 下 runner 检测停等信号——`AskUserQuestion` 工具调用（最强信号）或末条消息命中强短语——以 `--resume` 注入「确认」/「迁移至 history」续轮，上限 3 次；续轮 token 与成本计入 flowneo 臂（如实呈现流程开销）。

## 结果

见 `results/`。每份报告含逐格数据、任务×臂汇总、Setup 与局限声明。

## 能与不能（照 ponytail 的诚实原则）

- 能：显示工作流约束下漏需求率/工件完备性/返工代理的臂间差异，及 token/时长/成本代价；轻任务开销如实呈现；结果可能是「FlowNeo 不划算」——基准设计为可证伪
- 不能：13 张卡不覆盖所有任务类型；隐藏检查点是需求命中下界而非质量上界；无 LLM 盲评（二期）；单模型单机运行，方差只在 3 轮内估计
