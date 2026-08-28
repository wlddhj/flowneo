import { fileURLToPath } from 'node:url'
import { lintAll } from '../lib/lint.ts'
import { init, remove, type InitOpts } from '../lib/installer.ts'

const command = process.argv[2]
const args = process.argv.slice(3)
// 产物 dist/cli.js 位于仓库根下一级，故回退一层即插件仓库根
const pluginRoot = fileURLToPath(new URL('../', import.meta.url))

function parseOpts(): InitOpts {
  const target = args.includes('--claude') ? 'claude' : args.includes('--codex') ? 'codex' : 'all'
  const scope = args.includes('--user') ? 'user' : 'project'
  return { target, scope } as InitOpts
}

if (command === 'lint') {
  const errors = lintAll(fileURLToPath(new URL('../skills/', import.meta.url)))
  if (errors.length > 0) {
    console.error('flowneo lint 失败：\n' + errors.map((e) => ` - ${e}`).join('\n'))
    process.exit(1)
  }
  console.log('flowneo lint 通过')
} else if (command === 'init' || command === 'remove') {
  const opts = parseOpts()
  if (opts.scope === 'user') {
    console.log('提示：user 级安装将在后续版本支持，本次按 project 级执行')
  }
  const done = command === 'init' ? init(opts, process.cwd(), pluginRoot) : remove(opts, process.cwd())
  // 输出实际生效的 scope：--user 目前按 project 执行，不能误报 scope=user
  const effectiveScope = opts.scope === 'user' ? 'project（--user 按实际生效值输出）' : opts.scope
  console.log(`flowneo ${command} 完成（target=${opts.target}，scope=${effectiveScope}）：`)
  for (const d of done) console.log(` - ${d}`)
} else {
  console.error('用法：flowneo <lint | init | remove> [--claude|--codex|--all] [--project|--user]')
  console.error('  lint               校验技能与 Router')
  console.error('  init               安装 FlowNeo 到当前项目（默认 --all --project）')
  console.error('  remove             从当前项目安全卸载（保留用户自有技能/hooks/AGENTS 内容）')
  process.exit(1)
}
