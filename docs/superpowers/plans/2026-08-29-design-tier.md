# 设计档位制（全量/精简）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 02 设计阶段引入每任务级「设计档位」——01 判定记录、02 按档执行、Schema 校验按档放行，补上「复杂但不涉及数据库/架构」任务的灵活性缺口。

**Architecture:** 四处小改联动：`src/lib/schema.ts` 按工件头部档位标注切换第三段必需章节（TDD）；`skills/01-need-explore/SKILL.md` 加档位判定步骤与模板节；`skills/02-design-plan/SKILL.md` 按档执行 + 精简档「技术要点」模板；`skills/_router/router.md` 与 `AGENTS-flowneo.md` 同步加一句用户覆盖规则（lint 防漂移要求两处同步）。

**Tech Stack:** TypeScript（纯 TS 校验，零依赖）、vitest、既有 `flowneo lint` 卡点。

**Spec:** `docs/superpowers/specs/2026-08-29-design-tier-design.md`

## Global Constraints

- 档位判定信号（逐字）：涉及数据表/对外接口/跨模块依赖 → `全量`；纯逻辑/算法/UI 交互/重构/脚本 → `精简`；用户显式指定时以用户为准并注明「用户指定」
- 精简档保留四段编号，第三阶标题为「## 三、技术要点（定关键）」，Schema 必需章节匹配子串「## 三、技术要点」
- 档位标注识别须兼容全/半角冒号与冒号后零或多个空白（正则 `/档位[：:]\s*精简/`）
- 无档位标注（旧工件）回落全量清单；01 的 Schema 必填章节**不加**「## 设计档位」（旧任务不制造警告）
- Schema 只查缺失不查多余（fail-open 纪律不变）
- `skipDesign=true` 优先级不变：整段跳过 02；skipDesign 提示行不动
- Router 改后 `npm run lint` 必须通过（≤1500 tokens）；router.md 与 AGENTS-flowneo.md 两处同步（lint 防漂移卡点）
- 涉及 src 的变更后必须 `npm run build` 并把 dist 变更一并提交（verify 零漂移纪律）
- 提交信息：中文、`feat:`/`docs:`/`chore:` 前缀

---

### Task 1: Schema 校验档位分支（TDD）

**Files:**
- Modify: `src/lib/schema.ts:28-33`
- Test: `tests/schema.test.ts`

**Interfaces:**
- Consumes: 既有 `ARTIFACT_SCHEMAS: Record<string, string[]>`、`validateArtifact(fileName: string, content: string): string[]`
- Produces: `validateArtifact` 行为扩展——02 内容匹配 `/档位[：:]\s*精简/` 时第三段必需章节由「## 三、架构/数据设计」替换为「## 三、技术要点」；`ARTIFACT_SCHEMAS` 导出形状不变（Task 5 依赖此稳定性）

- [ ] **Step 1: 写失败测试**

在 `tests/schema.test.ts` 的 `FULL_02` 常量定义之后追加：

```ts
const LITE_02 = [
  '# 方案设计',
  '档位：精简',
  '## 一、需求规格',
  '规格。',
  '## 二、功能设计',
  '功能。',
  '## 三、技术要点',
  '- 关键技术决策：xxx',
  '## 四、任务拆解',
  '任务。',
].join('\n')
```

在 `describe('validateArtifact', ...)` 内追加 5 个用例：

```ts
  it('02 精简档标注 + 技术要点齐全 → 无警告', () => {
    expect(validateArtifact('02-design-plan.md', LITE_02)).toEqual([])
  })

  it('02 精简档缺「## 三、技术要点」（误用全量第三阶）→ 报缺失', () => {
    const warnings = validateArtifact('02-design-plan.md', FULL_02 + '\n档位：精简')
    expect(warnings).toEqual(['缺失章节：## 三、技术要点'])
  })

  it('02 半角冒号「档位:精简」→ 识别为精简档', () => {
    const content = LITE_02.replace('档位：精简', '档位:精简')
    expect(validateArtifact('02-design-plan.md', content)).toEqual([])
  })

  it('02 全角冒号后带空格「档位： 精简」→ 识别为精简档', () => {
    const content = LITE_02.replace('档位：精简', '档位： 精简')
    expect(validateArtifact('02-design-plan.md', content)).toEqual([])
  })

  it('02 标注「档位：全量」→ 用全量清单', () => {
    expect(validateArtifact('02-design-plan.md', FULL_02 + '\n档位：全量')).toEqual([])
  })
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run tests/schema.test.ts`
Expected: FAIL——「02 精简档标注 + 技术要点齐全 → 无警告」报 `缺失章节：## 三、架构/数据设计`（现实现不识别档位）

- [ ] **Step 3: 最小实现**

`src/lib/schema.ts` 将 `validateArtifact` 整函数替换为：

```ts
/** 精简档标注识别：全/半角冒号、冒号后零或多个空白 */
const TIER_LITE = /档位[：:]\s*精简/

/** 校验工件章节完整性，返回缺失章节警告；非清单内文件返回空（不校验） */
export function validateArtifact(fileName: string, content: string): string[] {
  const required = ARTIFACT_SCHEMAS[fileName]
  if (!required) return []
  const list =
    fileName === '02-design-plan.md' && TIER_LITE.test(content)
      ? required.map((h) => (h === '## 三、架构/数据设计' ? '## 三、技术要点' : h))
      : required
  return list.filter((h) => !content.includes(h)).map((h) => `缺失章节：${h}`)
}
```

（`ARTIFACT_SCHEMAS` 定义不动。）

- [ ] **Step 4: 跑测试确认通过 + 全量回归**

Run: `npx vitest run tests/schema.test.ts && npm test`
Expected: schema 12 用例全过；全量 82 测试（77 + 新 5）全过

- [ ] **Step 5: 构建并同步 dist**

Run: `npm run build && git add src/lib/schema.ts tests/schema.test.ts dist/`
Expected: build 无错误

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: Schema 校验档位分支——02 精简档标注识别 + 第三段必需章节切换"
```

---

### Task 2: 01 技能加档位判定

**Files:**
- Modify: `skills/01-need-explore/SKILL.md:14-25`（执行步骤）与模板区（`## 验收标准` 后）

**Interfaces:**
- Consumes: 无
- Produces: 01 工件新增「## 设计档位」节（档位+理由）；Task 3 的 02 技能读该节执行

- [ ] **Step 1: 插入档位判定步骤**

`skills/01-need-explore/SKILL.md` 中，将：

```
4. 存在模糊点时一次性列出全部疑问向用户确认（禁止拆成多轮）；无法确认的给出假设并显式标注
5. 按下方模板写入 `.flow-neo/tasks/<slug>/01-need-explore.md`
6. 更新本任务 status.md：stage: 2，artifacts 追加 01-need-explore.md
7. 用 Skill 工具调用 flowneo-design-plan 进入阶段二
```

替换为：

```
4. 存在模糊点时一次性列出全部疑问向用户确认（禁止拆成多轮）；无法确认的给出假设并显式标注
5. **设计档位判定**：按判定信号选档——涉及数据表/对外接口/跨模块依赖 → `全量`；纯逻辑/算法/UI 交互/重构/脚本 → `精简`；判定理由一句话。用户显式指定档位时以用户为准并注明「用户指定」
6. 按下方模板写入 `.flow-neo/tasks/<slug>/01-need-explore.md`
7. 更新本任务 status.md：stage: 2，artifacts 追加 01-need-explore.md
8. 用 Skill 工具调用 flowneo-design-plan 进入阶段二
```

- [ ] **Step 2: 模板加节**

模板中，将：

```
## 验收标准
- <可验证条目>

## 待确认问题与结论
```

替换为：

```
## 验收标准
- <可验证条目>

## 设计档位
- 档位：<全量 | 精简>
- 理由：<判定信号一句话；用户指定时注明>

## 待确认问题与结论
```

- [ ] **Step 3: lint 校验**

Run: `npm run lint`
Expected: `flowneo lint 通过`（01 无档位 Schema 必填要求，旧工件不受影响由测试保证）

- [ ] **Step 4: Commit**

```bash
git add skills/01-need-explore/SKILL.md
git commit -m "feat: 01 技能加设计档位判定——判定信号 + 用户指定优先 + 工件模板新节"
```

---

### Task 3: 02 技能按档执行

**Files:**
- Modify: `skills/02-design-plan/SKILL.md`（步骤 1/2/5、自我评审第 3 项、HARD-GATE、模板、完成条件）

**Interfaces:**
- Consumes: 01 工件「## 设计档位」节（Task 2 产出）；Schema 精简档识别（Task 1 产出）
- Produces: 02 工件头部「档位：<全量 | 精简>」标注行——Task 1 的 Schema 分支依赖的输入形态

- [ ] **Step 1: 六处精确编辑**

1. HARD-GATE，将：

```
本任务 02-design-plan.md 四段未齐全、且未经用户确认（或标注假设）前，禁止创建/修改任何业务代码文件。
```

替换为：

```
本任务 02-design-plan.md 适用档位的段落未齐全、且未经用户确认（或标注假设）前，禁止创建/修改任何业务代码文件。
```

2. 步骤 1，将：

```
1. 读取本任务 01-need-explore.md（若为轻量简化启动则直接读用户需求）
```

替换为：

```
1. 读取本任务 01-need-explore.md（若为轻量简化启动则直接读用户需求）；同步读取「## 设计档位」节，无该节（旧任务）默认全量档
```

3. 步骤 2，将：

```
2. 依次完成四阶设计（模板四段固定，不可缺省；不适用的字段标注「不适用」）
```

替换为：

```
2. 按档位完成设计（模板四段固定，不可缺省；不适用的字段标注「不适用」）：全量档四阶完整；精简档第三阶写技术要点（关键决策、风险与应对、复杂度/性能要点）
```

4. 自我评审第 3 项，将：

```
   - 架构/数据设计支撑功能设计（模块/表/接口与业务流程对得上）
```

替换为：

```
   - 全量档：架构/数据设计支撑功能设计（模块/表/接口与业务流程对得上）；精简档：技术要点覆盖本任务主要技术决策与风险，无遗漏关键项
```

5. 步骤 5，将：

```
5. 写入 .flow-neo/tasks/<本任务slug>/02-design-plan.md
```

替换为：

```
5. 写入 .flow-neo/tasks/<本任务slug>/02-design-plan.md，标题下方第一行标注「档位：<全量 | 精简>」
```

6. 模板区，将：

```
# 方案设计：<任务名>

## 一、需求规格（定标准）
```

替换为：

```
# 方案设计：<任务名>

档位：<全量 | 精简>

## 一、需求规格（定标准）
```

并在「## 三、架构/数据设计（定底层）」小节整体（含其后端/前端两行与「按任务类型取其一」行）之后、「## 四、任务拆解（定落地）」之前插入：

```
## 三、技术要点（定关键）——精简档专用

- 关键技术决策：<选型/算法/取舍及理由>
- 风险与应对：<实现风险、边界条件>
- 复杂度/性能要点：<适用时写，无则标「无」>

```

7. 完成条件第 1 条，将：

```
- [ ] 四段齐全且自我评审四项全部通过
```

替换为：

```
- [ ] 段落齐全（全量档四段 / 精简档含技术要点）且自我评审四项全部通过
```

- [ ] **Step 2: lint 校验**

Run: `npm run lint`
Expected: `flowneo lint 通过`

- [ ] **Step 3: Commit**

```bash
git add skills/02-design-plan/SKILL.md
git commit -m "feat: 02 技能按档执行——精简档技术要点模板 + HARD-GATE 适用段落化 + 头部档位标注"
```

---

### Task 4: Router 与 AGENTS 同步加档位规则

**Files:**
- Modify: `skills/_router/router.md`（skipDesign 提示行后）
- Modify: `AGENTS-flowneo.md:26` 附近（与 router.md 同步——lint 防漂移要求两处一致）

**Interfaces:**
- Consumes: Task 2/3 的档位机制（话术引用其行为）
- Produces: 无代码接口；Router token 预算约束（≤1500）

- [ ] **Step 1: 两处同步插入**

`skills/_router/router.md` 与 `AGENTS-flowneo.md` 中，均将：

```
- `stages.skipDesign=true`：重任务可从阶段 1 直接进入阶段 3（03 记录须补「设计简化」标注）
```

替换为：

```
- `stages.skipDesign=true`：重任务可从阶段 1 直接进入阶段 3（03 记录须补「设计简化」标注）
- 设计档位：01 末尾按信号判定（数据表/接口/跨模块→全量；纯逻辑/算法/UI/重构→精简），用户显式指定时以用户为准并注明「用户指定」
```

（先改 `skills/_router/router.md`，再在 `AGENTS-flowneo.md` 的标记段内做完全相同的替换；两处文本必须逐字一致。）

- [ ] **Step 2: lint 校验（含 token 预算与 AGENTS 防漂移）**

Run: `npm run lint`
Expected: `flowneo lint 通过`（Router 约 +40 tokens，当前 1156/1500，预算充足）

- [ ] **Step 3: Commit**

```bash
git add skills/_router/router.md AGENTS-flowneo.md
git commit -m "feat: Router/AGENTS 同步设计档位规则——用户指定优先，lint 防漂移两处一致"
```

---

### Task 5: 终验

**Files:**
- 无新变更（验证任务）

**Interfaces:**
- Consumes: Task 1–4 全部产物
- Produces: 验收标准全绿证据

- [ ] **Step 1: 全量验证**

```bash
npm run build && npm run lint && npm test && npm run verify
```

Expected（按序）：构建无错误 → `flowneo lint 通过` → 82 测试全过 → verify 零 diff 退出 0

- [ ] **Step 2: 验收清单核对**

对照 spec 第三节验收标准：

| # | 标准 | 证据来源 |
|---|------|---------|
| 1 | 精简档 02 四段（含技术要点）校验通过无警告 | Task 1 用例 1 |
| 2 | 全量档与现状一致（旧任务不受影响） | Task 1 用例 5 + 既有回归 |
| 3 | 用户显式指定档位以用户为准并注明 | Task 2 步骤文本 |
| 4 | Router ≤1500、lint 通过、全部测试通过 | Task 4 Step 2 + 本任务 Step 1 |

- [ ] **Step 3: 工作树核对**

Run: `git status --short`
Expected: 干净

---

## Self-Review 记录

- **Spec 覆盖**：spec 二节 4 项变更 → Task 1（Schema）/2（01）/3（02）/4（Router+AGENTS）；spec 三节测试 5 条 → Task 1 用例 1–5；验收 4 条 → Task 5 Step 2 映射；「明确不做」未引入。无缺口。
- **占位符扫描**：所有编辑给完整 old/new 文本与测试代码；无 TBD/「类似 Task N」。
- **类型/文本一致性**：`validateArtifact(fileName, content): string[]` 签名不变；档位标注「档位：<全量 | 精简>」在 Task 3 模板与 Task 1 测试常量一致；正则 `/档位[：:]\s*精简/` 覆盖 spec 要求的全/半角冒号与空白变体；「## 三、技术要点（定关键）」含 Schema 匹配子串「## 三、技术要点」。
