import { readFileSync, existsSync } from 'node:fs'
import { basename } from 'node:path'
import { validateArtifact, ARTIFACT_SCHEMAS } from '../lib/schema.ts'

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
  console.error(
    `【FlowNeo Schema】${fileName} 校验警告（仅提示不阻断）：\n  - ${warnings.join('\n  - ')}\n  可运行 flowneo lint 查看详情`,
  )
}
process.exit(0)
