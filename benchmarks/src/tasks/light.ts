import type { BenchTask } from '../types.ts'

const PAGER = `// 分页工具：返回第 page 页（1 起），每页 size 条
function paginate(items, page, size) {
  const start = (page - 1) * size
  return items.slice(start, start + size - 1)
}
module.exports = { paginate }
`

export const FIX_OFFBYONE: BenchTask = {
  id: 'fix-offbyone',
  tier: 'light',
  brief:
    'lib/pager.js 里的 paginate 从第 2 页开始每页都比预期少一条，帮忙修一下。修完确认第 1 页、中间页和最后一页条数都对。',
  seed: { 'lib/pager.js': PAGER },
  hiddenChecks: [
    { id: 'page1-full', desc: '第 1 页返回 size 条', kind: 'test',
      test: `node -e "const {paginate}=require('./lib/pager.js');process.exit(paginate([1,2,3,4,5],1,2).length===2?0:1)"` },
    { id: 'page2-full', desc: '第 2 页返回 size 条（原 bug 处）', kind: 'test',
      test: `node -e "const {paginate}=require('./lib/pager.js');process.exit(paginate([1,2,3,4,5],2,2).length===2?0:1)"` },
    { id: 'last-page-partial', desc: '最后一页返回剩余条数', kind: 'test',
      test: `node -e "const {paginate}=require('./lib/pager.js');process.exit(paginate([1,2,3,4,5],3,2).length===1?0:1)"` },
  ],
  acceptCmd: `node -e "const {paginate}=require('./lib/pager.js');if(paginate([1,2,3,4,5],2,2).length!==2)process.exit(1)"`,
}

const GREET_JS = `#!/usr/bin/env node
// 问候工具
const name = process.argv[2] || '世界'
console.log('你好，' + name + '！')
`

export const ADD_VERBOSE_FLAG: BenchTask = {
  id: 'add-verbose-flag',
  tier: 'light',
  brief: 'greet.js 加个 --verbose 标志：打开时多打印一行版本信息（比如 greet v1.0），默认行为保持不变。',
  seed: { 'greet.js': GREET_JS },
  hiddenChecks: [
    { id: 'default-unchanged', desc: '默认输出不含版本行', kind: 'test',
      test: `node -e "const o=require('child_process').execSync('node greet.js 明').toString();process.exit(o.includes('你好，明')&&!/v\\\\d+\\\\.\\\\d+/.test(o)?0:1)"` },
    { id: 'verbose-shows-version', desc: '--verbose 输出含版本串', kind: 'test',
      test: `node -e "const o=require('child_process').execSync('node greet.js 明 --verbose').toString();process.exit(/v\\\\d+\\\\.\\\\d+/.test(o)?0:1)"` },
    { id: 'verbose-keeps-greeting', desc: '--verbose 下问候仍在', kind: 'test',
      test: `node -e "const o=require('child_process').execSync('node greet.js 明 --verbose').toString();process.exit(o.includes('你好，明')?0:1)"` },
  ],
}

export const UTIL_JS = `// 工具函数
function slugify(text) {
  return String(text).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function truncate(text, n) {
  return String(text).slice(0, n)
}
module.exports = { slugify, truncate }
`
const UTIL_README = `# util

工具函数库。

## 函数

### slugify(text)
转 URL 友好格式。

### capitalize(text)
首字母大写。

### truncate(text, n)
截断到 n 字符。

### chunk(arr, n)
按 n 分组。
`

export const DOCS_UPDATE: BenchTask = {
  id: 'docs-update',
  tier: 'light',
  brief: 'lib/util.js 的 README 和代码对不上了，帮忙核对更新一下文档，别把还存在的函数写丢。',
  seed: { 'lib/util.js': UTIL_JS, 'lib/README.md': UTIL_README },
  hiddenChecks: [
    { id: 'no-phantom-functions', desc: 'README 不再声明不存在的函数', kind: 'test',
      test: `node -e "const fs=require('fs');const md=fs.readFileSync('lib/README.md','utf8');const m=require('./lib/util.js');const docFns=[...md.matchAll(/### (\\\\w+)/g)].map(x=>x[1]);const missing=docFns.filter(f=>!(f in m));process.exit(missing.length===0?0:1)"` },
    { id: 'real-functions-documented', desc: '现有函数都在 README 中有描述', kind: 'test',
      test: `node -e "const fs=require('fs');const md=fs.readFileSync('lib/README.md','utf8');const m=require('./lib/util.js');const all=Object.keys(m).every(f=>md.includes('### '+f));process.exit(all?0:1)"` },
  ],
}
