/** 每任务卡一对参照：good 全部检查点命中；bad 为 lazy-but-plausible 实现，expectedMiss 精确断言实际 miss 集 */
import { STORE_JS, STATS_JS } from './tasks/heavy.ts'
import { UTIL_JS } from './tasks/light.ts'

const STORE_SEED = STORE_JS
const STATS_SEED = STATS_JS
const UTIL_SEED = UTIL_JS

export interface TaskRef {
  good: Record<string, string>
  bad: Record<string, string>
  /** bad 参照预期不命中的检查点 id 集（selftest 断言实际 miss 集 === 本清单，多miss/少miss均红） */
  expectedMiss: string[]
}

const GOOD_TODO = `#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const DATA = path.join(__dirname, 'todos.json')
const load = () => (fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : [])
const save = (todos) => fs.writeFileSync(DATA, JSON.stringify(todos, null, 2))
const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'add') {
  const text = rest.join(' ')
  if (!text) { console.error('用法：todo.js add "文本"'); process.exit(1) }
  const todos = load()
  const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1
  todos.push({ id, text, done: false })
  save(todos)
  console.log('已添加 #' + id + ': ' + text)
} else if (cmd === 'done') {
  const id = Number(rest[0])
  if (!rest[0] || !Number.isInteger(id)) { console.error('用法：todo.js done <id>'); process.exit(1) }
  const todos = load()
  const t = todos.find((x) => x.id === id)
  if (!t) { console.error('不存在 #' + id); process.exit(1) }
  t.done = true
  save(todos)
  console.log('已完成 #' + id)
} else if (cmd === 'list') {
  const todos = load()
  if (rest.includes('--json')) { console.log(JSON.stringify(todos)); return }
  for (const t of todos) console.log('#' + t.id + (t.done ? ' [done] ' : ' ') + t.text)
} else {
  console.error('用法：todo.js add|list|done')
  process.exit(1)
}
`

const BAD_TODO = `#!/usr/bin/env node
// lazy 版：done 直接移除条目、不校验 id、无 --json
const fs = require('fs')
const path = require('path')
const DATA = path.join(__dirname, 'todos.json')
const load = () => (fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : [])
const save = (todos) => fs.writeFileSync(DATA, JSON.stringify(todos, null, 2))
const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'add') {
  const text = rest.join(' ')
  if (!text) { console.error('用法：todo.js add "文本"'); process.exit(1) }
  const todos = load()
  const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1
  todos.push({ id, text })
  save(todos)
  console.log('已添加 #' + id + ': ' + text)
} else if (cmd === 'done') {
  const id = Number(rest[0])
  const todos = load()
  const i = todos.findIndex((x) => x.id === id)
  if (i >= 0) todos.splice(i, 1)
  save(todos)
  console.log('ok')
} else if (cmd === 'list') {
  for (const t of load()) console.log('#' + t.id + ' ' + t.text)
} else {
  console.error('用法：todo.js add|list')
  process.exit(1)
}
`

const GOOD_SERVER = `const http = require('http')
const users = [
  { id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' },
  { id: 4, name: 'Dave' }, { id: 5, name: 'Eve' }, { id: 6, name: 'Frank' },
  { id: 7, name: 'Grace' }, { id: 8, name: 'Heidi' }, { id: 9, name: 'Ivan' },
]
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (req.method === 'GET' && url.pathname === '/users') {
    const q = (url.searchParams.get('q') || '').toLowerCase()
    const filtered = q ? users.filter((u) => u.name.toLowerCase().includes(q)) : users.slice()
    const hasPage = url.searchParams.has('page') || url.searchParams.has('limit')
    res.setHeader('Content-Type', 'application/json')
    if (!hasPage) { res.end(JSON.stringify(filtered)); return }
    let page = Math.max(1, Number(url.searchParams.get('page')) || 1)
    let limit = Number(url.searchParams.get('limit'))
    if (!Number.isInteger(limit) || limit < 1) limit = 20
    limit = Math.min(limit, 100)
    const items = filtered.slice((page - 1) * limit, page * limit)
    res.end(JSON.stringify({ items, total: filtered.length, page, limit }))
    return
  }
  if (req.method === 'POST' && url.pathname === '/users') {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      const user = { id: users.length + 1, name: JSON.parse(body).name }
      users.push(user)
      res.statusCode = 201
      res.end(JSON.stringify(user))
    })
    return
  }
  res.statusCode = 404
  res.end()
})
server.listen(3000)
`

const BAD_SERVER = `const http = require('http')
const users = [
  { id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' },
  { id: 4, name: 'Dave' }, { id: 5, name: 'Eve' }, { id: 6, name: 'Frank' },
  { id: 7, name: 'Grace' }, { id: 8, name: 'Heidi' }, { id: 9, name: 'Ivan' },
]
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (req.method === 'GET' && url.pathname === '/users') {
    const page = Number(url.searchParams.get('page') || 0)
    const limit = Number(url.searchParams.get('limit') || users.length)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(users.slice(page, page + limit)))
    return
  }
  res.statusCode = 404
  res.end()
})
server.listen(3000)
`

export const REFS: Record<string, TaskRef> = {
  'cli-subcommand': {
    good: { 'todo.js': GOOD_TODO },
    bad: { 'todo.js': BAD_TODO },
    expectedMiss: [
      'done-keeps-entry', 'done-marks-status', 'done-unknown-id-fails',
      'done-no-arg-usage', 'json-valid', 'json-array',
    ],
  },
  'api-pagination': {
    good: { 'server.js': GOOD_SERVER },
    bad: { 'server.js': BAD_SERVER },
    // bad 为 page 直接当 offset 的懒错切片 + 无 q/无 total：default 与越界空数组对 slice 语义天然成立（good 单侧验证）
    expectedMiss: ['page2-slices', 'q-case-insensitive', 'total-field', 'q-then-page'],
  },
  'fix-offbyone': {
    good: {
      'lib/pager.js': `function paginate(items, page, size) {
  const start = (page - 1) * size
  return items.slice(start, start + size)
}
module.exports = { paginate }
`,
    },
    bad: {
      'lib/pager.js': `function paginate(items, page, size) {
  const start = (page - 1) * size
  return items.slice(start, start + size - 1)
}
module.exports = { paginate }
`,
    },
    expectedMiss: ['page1-full', 'page2-full'],
  },
  'config-migrate': {
    good: {
      'config.js': `const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
function loadConfig() {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  if (raw.features) return raw
  return { name: raw.name, version: 1, features: { debug: raw.debug } }
}
module.exports = { loadConfig }
`,
      'migrate.js': `const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
if (!fs.existsSync(FILE)) { console.error('缺 config.json'); process.exit(1) }
const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
if (raw.features) { console.log('已是 v2'); process.exit(0) }
fs.writeFileSync(FILE, JSON.stringify({ name: raw.name, version: 2, features: { debug: raw.debug } }, null, 2))
console.log('已迁移到 v2')
`,
    },
    bad: {
      'config.js': `const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
function loadConfig() {
  return JSON.parse(fs.readFileSync(FILE, 'utf8'))
}
module.exports = { loadConfig }
`,
      'migrate.js': `const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
fs.writeFileSync(FILE, JSON.stringify({ version: 2, config: raw }, null, 2))
console.log('done')
`,
    },
    expectedMiss: ['migrate-converts', 'migrate-idempotent'],
  },
  'cache-layer': {
    good: {
      'calc.js': `const cache = new Map()
function compute(n) {
  if (cache.has(n)) return cache.get(n)
  const r = n < 2 ? n : compute(n - 1) + compute(n - 2)
  cache.set(n, r)
  return r
}
function clear() { cache.clear() }
module.exports = { compute, clear }
`,
    },
    bad: {
      'calc.js': `let memo = null
function compute(n) {
  if (memo !== null) return memo
  const r = n < 2 ? n : compute(n - 1) + compute(n - 2)
  memo = r
  return r
}
module.exports = { compute }
`,
    },
    expectedMiss: ['different-args-not-mixed', 'correctness-preserved', 'clear-entry', 'cache-keyed-by-arg'],
  },
  'multi-format-export': {
    good: {
      'store.js': STORE_SEED,
      'export.js': `const { list } = require('./store.js')
const fmt = process.argv[2]
const items = list()
if (fmt === 'json') {
  console.log(JSON.stringify(items))
} else if (fmt === 'csv') {
  const esc = (v) => (String(v).includes(',') ? '"' + String(v) + '"' : String(v))
  console.log('name,qty')
  for (const it of items) console.log(esc(it.name) + ',' + it.qty)
} else if (fmt === 'md') {
  console.log('| name | qty |')
  console.log('|---|---|')
  for (const it of items) console.log('| ' + it.name + ' | ' + it.qty + ' |')
} else {
  console.error('未知格式：' + fmt + '（支持 json|csv|md）')
  process.exit(1)
}
`,
    },
    bad: {
      'store.js': STORE_SEED,
      'export.js': `const { list } = require('./store.js')
const items = list()
console.log(JSON.stringify(items))
`,
    },
    expectedMiss: ['md-table', 'unknown-format-fails'],
  },
  'error-taxonomy': {
    good: {
      'api.js': `class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code }
}
function fetchUser(id) {
  if (id <= 0) throw new ApiError('INVALID_INPUT', 'id 非法')
  if (id > 100) throw new ApiError('NOT_FOUND', '用户不存在: ' + id)
  return { id, name: 'user' + id }
}
function fetchOrder(id) {
  if (id <= 0) throw new ApiError('INVALID_INPUT', 'id 非法')
  if (id > 500) throw new ApiError('NOT_FOUND', '订单不存在: ' + id)
  return { id, items: [] }
}
module.exports = { fetchUser, fetchOrder }
`,
    },
    bad: {
      'api.js': `function fetchUser(id) {
  if (id <= 0) throw new Error('id 非法')
  if (id > 100) throw new Error('用户不存在: ' + id)
  return { id, name: 'user' + id }
}
function fetchOrder(id) {
  if (id <= 0) throw new Error('id 非法')
  if (id > 500) throw new Error('订单不存在: ' + id)
  return { id, items: [] }
}
module.exports = { fetchUser, fetchOrder }
`,
    },
    expectedMiss: ['not-found-code', 'invalid-input-code', 'order-api-too'],
  },
  'retry-idempotent': {
    good: {
      'retry.js': `function retryFetch(fn, ...args) {
  let lastErr
  for (let i = 0; i <= 3; i++) {
    try { return fn(...args) } catch (e) { lastErr = e }
  }
  throw lastErr
}
module.exports = { retryFetch }
`,
    },
    bad: {
      'retry.js': `function retryFetch(fn) {
  return fn()
}
module.exports = { retryFetch }
`,
    },
    expectedMiss: ['retry-until-success', 'retry-cap-3', 'throws-last-error'],
  },
  'log-redact': {
    good: {
      'logger.js': `const SENSITIVE = ['password', 'token', 'authorization']
function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE.includes(k.toLowerCase()) ? '***' : redact(v)
    }
    return out
  }
  return value
}
function log(obj) {
  console.log(JSON.stringify(redact(obj)))
}
module.exports = { log }
`,
    },
    bad: {
      'logger.js': `function log(obj) {
  const o = { ...obj }
  if (o.password) o.password = '***'
  console.log(JSON.stringify(o))
}
module.exports = { log }
`,
    },
    expectedMiss: ['nested-redact', 'array-redact', 'case-insensitive'],
  },
  'validate-boundary': {
    good: {
      'form.js': `function submit(data) {
  const errors = []
  if (!data || typeof data.name !== 'string' || !data.name) errors.push({ field: 'name', msg: 'name 必填且为字符串' })
  if (data.age !== undefined && (!Number.isInteger(data.age) || data.age <= 0)) errors.push({ field: 'age', msg: 'age 须为正整数' })
  if (data.email !== undefined && (!typeof data.email === 'string' || !data.email.includes('@'))) errors.push({ field: 'email', msg: 'email 须含 @' })
  if (errors.length) return { ok: false, errors }
  return { ok: true }
}
module.exports = { submit }
`,
    },
    bad: {
      'form.js': `function submit(data) {
  if (!data || !data.name) return { ok: false, errors: [{ field: 'name', msg: '缺少 name' }] }
  return { ok: true }
}
module.exports = { submit }
`,
    },
    expectedMiss: ['age-integer-check', 'email-at-check', 'all-errors-at-once'],
  },
  'refactor-extract': {
    good: {
      'stats.js': `const { validate } = require('./validate')
const { price } = require('./pricing')
const { formatTotal } = require('./format')
function processOrder(order) {
  validate(order)
  const { subtotal, discount, total } = price(order.items)
  return { id: order.id, subtotal, discount, total, totalStr: formatTotal(total) }
}
module.exports = { processOrder }
`,
      'validate.js': `function validate(order) {
  if (!order.id || !Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('订单数据不完整')
  }
  for (const it of order.items) {
    if (it.qty <= 0) throw new Error('数量必须为正: ' + it.sku)
  }
}
module.exports = { validate }
`,
      'pricing.js': `function price(items) {
  let subtotal = 0
  for (const it of items) subtotal += it.qty * it.price
  let discount = 0
  if (subtotal >= 1000) discount = subtotal * 0.1
  else if (subtotal >= 500) discount = subtotal * 0.05
  return { subtotal, discount, total: subtotal - discount }
}
module.exports = { price }
`,
      'format.js': `function formatTotal(total) {
  return '¥' + total.toFixed(2)
}
module.exports = { formatTotal }
`,
    },
    bad: {
      'stats.js': STATS_SEED,
    },
    expectedMiss: ['main-file-shrunk', 'extracted-modules-exist'],
  },
  'add-verbose-flag': {
    good: {
      'greet.js': `#!/usr/bin/env node
const args = process.argv.slice(2)
const name = args.find((a) => !a.startsWith('--')) || '世界'
if (args.includes('--verbose')) console.log('greet v1.0')
console.log('你好，' + name + '！')
`,
    },
    bad: {
      'greet.js': `#!/usr/bin/env node
const name = process.argv[2] || '世界'
console.log('你好，' + name + '！')
`,
    },
    expectedMiss: ['verbose-shows-version'],
  },
  'docs-update': {
    good: {
      'lib/util.js': UTIL_SEED,
      'lib/README.md': `# util

工具函数库。

## 函数

### slugify(text)
转 URL 友好格式。

### truncate(text, n)
截断到 n 字符。
`,
    },
    bad: {
      'lib/util.js': UTIL_SEED,
      'lib/README.md': `# util

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
`,
    },
    expectedMiss: ['no-phantom-functions'],
  },
}
