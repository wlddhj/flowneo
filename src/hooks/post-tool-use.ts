import { readFileSync, existsSync } from 'node:fs'
import { basename } from 'node:path'
import { validateArtifact, ARTIFACT_SCHEMAS } from '../lib/schema.ts'
import { readConfig } from '../lib/config.ts'

interface PostToolUseInput {
  tool_name?: string
  tool_input?: { file_path?: string; filePath?: string }
}

let input: PostToolUseInput = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
} catch {
  process.exit(0)
}

const filePath = input.tool_input?.file_path ?? input.tool_input?.filePath ?? ''
const fileName = basename(filePath)

// 仅校验 .flow-neo 下的 FlowNeo 工件（01~05），其余文件不拦截
if (!filePath.includes('.flow-neo') || !(fileName in ARTIFACT_SCHEMAS)) process.exit(0)
if (!existsSync(filePath)) process.exit(0)

const warnings = validateArtifact(fileName, readFileSync(filePath, 'utf8'))
if (warnings.length > 0) {
  // schema.strictness 接线：strict 时话术升级，指明须补齐后再继续；loose 维持仅提示
  const strict = readConfig(process.cwd()).schema.strictness === 'strict'
  const tail = strict ? '（strict 模式：请立即补齐后再继续）' : ''
  const message = `【FlowNeo Schema】${fileName} 校验警告（仅提示不阻断）：\n  - ${warnings.join('\n  - ')}\n  请补齐上述缺失章节后继续${tail}`
  // 真机验证（2026-08-28，claude 2.1.133 -p）：stderr 既不进模型上下文也不进会话输出，
  // 故改用 PostToolUse additionalContext 通道注入警告，保持 exit 0 不阻断
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: message },
    }),
  )
}
process.exit(0)
