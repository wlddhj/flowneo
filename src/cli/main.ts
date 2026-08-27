import { fileURLToPath } from 'node:url'
import { lintAll } from '../lib/lint.ts'

const command = process.argv[2]

if (command === 'lint') {
  const errors = lintAll(fileURLToPath(new URL('../skills/', import.meta.url)))
  if (errors.length > 0) {
    console.error('flowneo lint 失败：\n' + errors.map((e) => ` - ${e}`).join('\n'))
    process.exit(1)
  }
  console.log('flowneo lint 通过')
} else {
  console.error('用法：flowneo lint')
  process.exit(1)
}
