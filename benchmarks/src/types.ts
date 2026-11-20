/** 隐藏需求检查点：brief 不显式罗列、事后确定性验证的需求点 */
export interface HiddenCheck {
  id: string
  desc: string
  kind: 'grep' | 'test'
  /** kind=grep：在工作区 glob 文件内检索 pattern（命中 = 需求已实现） */
  grep?: { pattern: string; glob: string }
  /** kind=test：在 workdir 执行命令，exit 0 = 命中 */
  test?: string
}

export interface BenchTask {
  id: string
  tier: 'heavy' | 'light'
  /** 工单原文（模拟真实口吻，不显式罗列全部需求点） */
  brief: string
  /** 相对路径 -> 文件内容（种子工作区） */
  seed: Record<string, string>
  /** heavy 每卡 6~8 个、light 每卡 2~3 个 */
  hiddenChecks: HiddenCheck[]
  /** 可选验收命令（workdir 内执行，exit 0 = 过） */
  acceptCmd?: string
}

export interface Arm {
  id: string
  /** 插件臂：--plugin-dir 指向插件根 */
  pluginDir?: string
  /** prompt 臂：--append-system-prompt 注入的一句话 */
  appendSystem?: string
}

export interface CellCheckResult {
  id: string
  pass: boolean
}

export interface CellResult {
  task: string
  arm: string
  run: number
  status: 'ok' | 'timeout' | 'error'
  hiddenHits: number
  hiddenTotal: number
  checks: CellCheckResult[]
  /** .flow-neo 工件完备数（01~05 + status.md，0-6，仅 flowneo 臂有意义） */
  artifacts: number
  turns: number
  /** 返工代理：单文件被 Edit/Write 的最大次数 */
  reeditMax: number
  srcLoc: number
  testLoc: number
  durationMs: number
  tokensIn: number
  tokensOut: number
  costUsd: number
  /** 停等确认自动续轮次数 */
  resumeCount: number
  /** 隔离验证：会话流中检测到的注入痕迹 */
  routerSeen: boolean
  /** 实际生效模型（stream init 事件，仅显式传 --model 时记录） */
  model?: string
  error?: string
}
