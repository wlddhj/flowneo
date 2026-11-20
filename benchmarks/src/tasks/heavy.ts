import type { BenchTask } from '../types.ts'

const TODO_CLI = `#!/usr/bin/env node
// 团队在用的命令行待办工具
// 用法：node todo.js add "文本" | node todo.js list
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
} else if (cmd === 'list') {
  for (const t of load()) console.log('#' + t.id + ' ' + t.text)
} else {
  console.error('用法：todo.js add|list')
  process.exit(1)
}
`

export const CLI_SUBCOMMAND: BenchTask = {
  id: 'cli-subcommand',
  tier: 'heavy',
  brief:
    'todo.js 是团队在用的命令行待办工具（node todo.js <cmd>）。请加一个 done 命令：node todo.js done <id> 把对应条目标为已完成；同时给 list 加 --json 开关输出机器可读格式，方便接 CI。数据格式你们看着办，别把现有 add/list 弄坏就行。另外数据存取逻辑抽到独立的 store.js 模块（todo.js 只留命令解析），并补一个 test.js 验证脚本覆盖 done 与 --json 流程。',
  seed: { 'todo.js': TODO_CLI },
  hiddenChecks: [
    { id: 'done-keeps-entry', desc: 'done 标记后条目保留（非删除）', kind: 'test',
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add x');c('node todo.js done 1');process.exit(c('node todo.js list').toString().includes('x')?0:1)"` },
    { id: 'done-marks-status', desc: 'done 后条目数据含完成状态字段', kind: 'test',
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add x');c('node todo.js done 1');const d=JSON.parse(require('fs').readFileSync('todos.json','utf8'));process.exit(d.some(t=>t.done===true||t.completed===true)?0:1)"` },
    { id: 'done-unknown-id-fails', desc: 'done 不存在的 id 报错且退出码非 0', kind: 'test',
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add x');let bad=0;try{c('node todo.js done 99')}catch(e){bad=e.status}process.exit(bad!==0?0:1)"` },
    { id: 'done-no-arg-usage', desc: 'done 无参数时报用法错误非 0', kind: 'test',
      test: `node -e "let bad=0;try{require('child_process').execSync('node todo.js done')}catch(e){bad=e.status}process.exit(bad!==0?0:1)"` },
    { id: 'json-valid', desc: 'list --json 输出可 JSON.parse', kind: 'test',
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add y');JSON.parse(c('node todo.js list --json').toString())"` },
    { id: 'json-array', desc: '--json 输出为数组', kind: 'test',
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add y');process.exit(Array.isArray(JSON.parse(c('node todo.js list --json').toString()))?0:1)"` },
    { id: 'add-list-no-regress', desc: 'add/list 原行为不回归', kind: 'test',
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add hello');process.exit(c('node todo.js list').toString().includes('hello')?0:1)"` },
    { id: 'done-idempotent', desc: '重复 done 同一 id 不报错', kind: 'test',
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add z');c('node todo.js done 1');c('node todo.js done 1')"` },
  ],
  acceptCmd: `node -e "const c=require('child_process').execSync;c('node todo.js add a');c('node todo.js done 1');JSON.parse(c('node todo.js list --json').toString())"`,
}

const USERS_API = `// 内存用户接口：GET /users 返回全部，POST /users 新增
// 用法：node server.js（监听 3000）
const http = require('http')
const users = [
  { id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' },
  { id: 4, name: 'Dave' }, { id: 5, name: 'Eve' }, { id: 6, name: 'Frank' },
  { id: 7, name: 'Grace' }, { id: 8, name: 'Heidi' }, { id: 9, name: 'Ivan' },
]
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  if (req.method === 'GET' && url.pathname === '/users') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(users))
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

/** 起服务 → 探测（断言失败立即定论；连接失败重试至 server 就绪）→ 杀进程 → 透传退出码。探测 exit 0=命中 1=断言失败 2=连接失败。开头清端口防残留进程污染。
 * 解包兼容常见分页字段名（items/data/results/users），避免把实现形态多样性与漏需求混同 */
function probeServer(port: number, query: string, probe: string): string {
  const detect = `node -e "const h=require('http');h.get('http://127.0.0.1:${port}/users${query}',(r)=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{const j=JSON.parse(b);const a=Array.isArray(j)?j:(j.items||j.data||j.results||j.users);process.exit(${probe}?0:1)})}).on('error',()=>process.exit(2))"`
  return [
    `lsof -ti:${port} | xargs kill -9 2>/dev/null; sleep 0.2`,
    `node server.js & SRV=$!`,
    `RC=2; for i in 1 2 3 4 5 6 7 8; do ${detect} && RC=0 || RC=$?; [ $RC -ne 2 ] && break; sleep 0.4; done`,
    `kill $SRV 2>/dev/null; exit $RC`,
  ].join('\n')
}

export const API_PAGINATION: BenchTask = {
  id: 'api-pagination',
  tier: 'heavy',
  brief:
    'server.js 是个内存用户接口（GET/POST /users）。用户量上来了，前端要分页：GET /users 支持 page 和 limit 参数，再加个按名字关键词过滤的 q 参数，前端还想知道总共多少条。老的不带参数的调法先别破坏。路由处理逻辑抽到独立的 routes.js（server.js 只做启动与接线），补一个 test.js 冒烟脚本。',
  seed: { 'server.js': USERS_API },
  hiddenChecks: [
    { id: 'default-no-params', desc: '无参调用返回全部（裸数组或分页包装均可）', kind: 'test',
      test: probeServer(3000, '', `a && a.length >= 9`) },
    { id: 'page2-slices', desc: 'page=2&limit=3 返回第 2 页切片（首条 Dave）', kind: 'test',
      test: probeServer(3000, '?page=2&limit=3', `a && a.length === 3 && a[0].name === 'Dave'`) },
    { id: 'page-out-of-range-empty', desc: 'page 超范围返回空数组而非崩溃', kind: 'test',
      test: probeServer(3000, '?page=99&limit=2', `a && a.length === 0`) },
    { id: 'limit-invalid-fallback', desc: 'limit 非法值有兜底（不 500/不崩）', kind: 'test',
      test: `lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 0.2
node server.js & SRV=$!
RC=2; for i in 1 2 3 4 5 6 7 8; do node -e "const h=require('http');h.get('http://127.0.0.1:3000/users?limit=abc',(r)=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>process.exit(r.statusCode===200?0:1))}).on('error',()=>process.exit(2))" && RC=0 || RC=$?; [ $RC -ne 2 ] && break; sleep 0.4; done
kill $SRV 2>/dev/null; exit $RC` },
    { id: 'q-case-insensitive', desc: 'q 过滤大小写不敏感', kind: 'test',
      test: probeServer(3000, '?q=ALICE', `a && a.length === 1 && a[0].name === 'Alice'`) },
    { id: 'total-field', desc: '分页响应含 total 总数字段', kind: 'test',
      test: probeServer(3000, '?page=1&limit=2', `Number.isInteger(j.total)`) },
    { id: 'q-then-page', desc: '过滤与分页组合（先过滤后分页）', kind: 'test',
      test: probeServer(3000, '?q=a&page=1&limit=2', `a && a.length === 2 && j.total >= 3`) },
  ],
  acceptCmd: probeServer(3000, '?page=1&limit=2', `a && a.length === 2`),
}

const CONFIG_V1 = `{
  "name": "app",
  "debug": true
}
`
const CONFIG_JS = `// 配置读取：config.json（v1 格式：{ name, debug }）
const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
function loadConfig() {
  return JSON.parse(fs.readFileSync(FILE, 'utf8'))
}
module.exports = { loadConfig }
`

export const CONFIG_MIGRATE: BenchTask = {
  id: 'config-migrate',
  tier: 'heavy',
  brief:
    '配置文件要从 v1（{ name, debug }）迁到 v2（{ name, features: { debug } }，带 version: 2 标记）。写个 migrate.js 把旧格式转成新格式，程序自身也要能读两种格式，别让老用户的配置坏掉。补一个 test.js 覆盖两种格式的读取与迁移幂等性。',
  seed: { 'config.js': CONFIG_JS, 'config.json': CONFIG_V1 },
  hiddenChecks: [
    { id: 'migrate-converts', desc: 'migrate.js 把 v1 config.json 转为 v2（features.debug 保留）', kind: 'test',
      test: `node -e "const c=require('child_process'),fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',debug:true}));c.execSync('node migrate.js');const d=JSON.parse(fs.readFileSync('config.json','utf8'));process.exit(d.features&&d.features.debug===true?0:1)"` },
    { id: 'load-v1-still-works', desc: 'loadConfig 兼容读取 v1（返回 debug）', kind: 'test',
      test: `node -e "const fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',debug:true}));const cfg=require('./config.js').loadConfig();process.exit(cfg.debug===true||cfg.features&&cfg.features.debug===true?0:1)"` },
    { id: 'load-v2', desc: 'loadConfig 读取 v2', kind: 'test',
      test: `node -e "const fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',version:2,features:{debug:false}}));const cfg=require('./config.js').loadConfig();process.exit(cfg.features&&cfg.features.debug===false?0:1)"` },
    { id: 'v2-unknown-fields', desc: 'v2 混入未知字段不崩（前向兼容）', kind: 'test',
      test: `node -e "const fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',version:2,features:{debug:true},futureField:{x:1}}));require('./config.js').loadConfig()"` },
    { id: 'migrate-idempotent', desc: 'migrate 对已是 v2 的文件幂等（不重复包裹）', kind: 'test',
      test: `node -e "const c=require('child_process'),fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',version:2,features:{debug:true}}));c.execSync('node migrate.js');const d=JSON.parse(fs.readFileSync('config.json','utf8'));process.exit(d.features&&d.features.features===undefined?0:1)"` },
    { id: 'migrate-missing-file', desc: 'migrate 缺 config.json 报错非 0', kind: 'test',
      test: `node -e "const fs=require('fs');try{fs.unlinkSync('config.json')}catch{};let bad=0;try{require('child_process').execSync('node migrate.js')}catch(e){bad=e.status}process.exit(bad!==0?0:1)"` },
    { id: 'v2-version-mark', desc: 'v2 格式含 version 标记', kind: 'test',
      test: `node -e "const c=require('child_process'),fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',debug:true}));c.execSync('node migrate.js');const d=JSON.parse(fs.readFileSync('config.json','utf8'));process.exit(d.version===2||d.features?0:1)"` },
  ],
}

const CALC_JS = `// 慢速计算：fibonacci（无缓存）
function compute(n) {
  if (n < 2) return n
  return compute(n - 1) + compute(n - 2)
}
module.exports = { compute }
`

export const CACHE_LAYER: BenchTask = {
  id: 'cache-layer',
  tier: 'heavy',
  brief:
    'calc.js 的 compute 太慢，加个缓存层：重复算过的入参直接出结果；缓存要能手动清掉（长期跑的进程防脏数据）。注意别把不同入参的结果串了，也别影响正确性。缓存抽成通用的 cache.js 模块（calc.js 引用），补一个 test.js 验证缓存命中与正确性。',
  seed: { 'calc.js': CALC_JS },
  hiddenChecks: [
    { id: 'second-call-fast', desc: '第二次同参调用显著快于首次（纳秒计时）', kind: 'test',
      test: `node -e "const {compute}=require('./calc.js');const t=()=>process.hrtime.bigint();let s=t();compute(30);const first=Number(t()-s);s=t();compute(30);const second=Number(t()-s);process.exit(second<first/10?0:1)"` },
    { id: 'different-args-not-mixed', desc: '不同入参不串结果（compute(10)≠compute(12)）', kind: 'test',
      test: `node -e "const {compute}=require('./calc.js');const a=compute(10),b=compute(12),a2=compute(10);process.exit(a===55&&b===144&&a2===55?0:1)"` },
    { id: 'correctness-preserved', desc: '首次结果与无缓存基准一致', kind: 'test',
      test: `node -e "const {compute}=require('./calc.js');process.exit(compute(20)===6765&&compute(0)===0&&compute(1)===1?0:1)"` },
    { id: 'clear-entry', desc: '提供清缓存入口（clear/reset 导出）', kind: 'test',
      test: `node -e "const m=require('./calc.js');process.exit(typeof m.clear==='function'||typeof m.reset==='function'||typeof m.clearCache==='function'?0:1)"` },
    { id: 'signature-unchanged', desc: '导出签名不变（compute 仍直接可用）', kind: 'test',
      test: `node -e "const m=require('./calc.js');process.exit(typeof m.compute==='function'?0:1)"` },
    { id: 'cache-keyed-by-arg', desc: '缓存按参数键控（新参仍真算且正确）', kind: 'test',
      test: `node -e "const {compute}=require('./calc.js');compute(10);compute(12);process.exit(compute(15)===610?0:1)"` },
  ],
}

export const STORE_JS = `// 库存：data.json 文件存储 + add/list
const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'data.json')
const load = () => (fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : [])
function add(name, qty) {
  const items = load()
  items.push({ name, qty })
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2))
}
function list() { return load() }
module.exports = { add, list }
`

export const MULTI_FORMAT_EXPORT: BenchTask = {
  id: 'multi-format-export',
  tier: 'heavy',
  brief:
    'store.js 存着库存数据。加个 export.js：node export.js json|csv|md 把当前 items 输出到 stdout。CSV 要注意逗号转义（字段值可能带逗号），空库存也要能导出，别崩。补一个 test.js 覆盖三种格式与转义场景。',
  seed: { 'store.js': STORE_JS },
  hiddenChecks: [
    { id: 'json-valid', desc: 'json 输出合法 JSON 数组', kind: 'test',
      test: `node -e "const {add}=require('./store.js');add('pen',2);const o=require('child_process').execSync('node export.js json').toString();process.exit(Array.isArray(JSON.parse(o))?0:1)"` },
    { id: 'csv-header', desc: 'csv 首行是表头', kind: 'test',
      test: `node -e "require('./store.js').add('pen',2);const o=require('child_process').execSync('node export.js csv').toString();const h=o.split('\\n')[0].toLowerCase();process.exit(h.includes('name')&&h.includes('qty')?0:1)"` },
    { id: 'csv-escape-comma', desc: '字段含逗号时 CSV 加引号转义', kind: 'test',
      test: `node -e "const {add}=require('./store.js');add('red, large',3);const o=require('child_process').execSync('node export.js csv').toString();process.exit(o.includes('\\\"red, large\\\"')?0:1)"` },
    { id: 'md-table', desc: 'md 输出为表格式列表', kind: 'test',
      test: `node -e "require('./store.js').add('pen',2);const o=require('child_process').execSync('node export.js md').toString();process.exit(/\\|.*\\|/.test(o)?0:1)"` },
    { id: 'empty-export-ok', desc: '空库存各格式导出不崩', kind: 'test',
      test: `node -e "const c=require('child_process').execSync;for(const f of ['json','csv','md'])c('node export.js '+f)"` },
    { id: 'unknown-format-fails', desc: '未知格式参数报错非 0', kind: 'test',
      test: `node -e "let bad=0;try{require('child_process').execSync('node export.js xml')}catch(e){bad=e.status}process.exit(bad!==0?0:1)"` },
  ],
}

const API_JS = `// 用户/订单查询：直接 throw 字符串错误，无分类
function fetchUser(id) {
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
`

export const ERROR_TAXONOMY: BenchTask = {
  id: 'error-taxonomy',
  tier: 'heavy',
  brief:
    'api.js 的错误没分类，调用方没法按类型分支处理。把错误分成 NotFound（查不到）和 InvalidInput（入参非法），错误对象带 code 字段（如 NOT_FOUND / INVALID_INPUT），其余保持现状。现有函数名别改；错误类定义抽到独立的 errors.js，api.js 引用，补一个 test.js 按 code 分支断言。',
  seed: { 'api.js': API_JS },
  hiddenChecks: [
    { id: 'not-found-code', desc: '查不到时错误 code 为 NOT_FOUND', kind: 'test',
      test: `node -e "let e;try{require('./api.js').fetchUser(999)}catch(x){e=x}process.exit(e&&e.code==='NOT_FOUND'?0:1)"` },
    { id: 'invalid-input-code', desc: '入参非法时错误 code 为 INVALID_INPUT', kind: 'test',
      test: `node -e "let e;try{require('./api.js').fetchUser(-1)}catch(x){e=x}process.exit(e&&e.code==='INVALID_INPUT'?0:1)"` },
    { id: 'error-subclass', desc: '错误仍是 Error 实例（instanceof）', kind: 'test',
      test: `node -e "let e;try{require('./api.js').fetchUser(999)}catch(x){e=x}process.exit(e instanceof Error?0:1)"` },
    { id: 'message-readable', desc: 'message 仍含人类可读描述', kind: 'test',
      test: `node -e "let e;try{require('./api.js').fetchUser(999)}catch(x){e=x}process.exit(e&&/999|不存在|not/i.test(e.message)?0:1)"` },
    { id: 'exports-unchanged', desc: '现有导出函数名不变', kind: 'test',
      test: `node -e "const m=require('./api.js');process.exit(typeof m.fetchUser==='function'&&typeof m.fetchOrder==='function'?0:1)"` },
    { id: 'order-api-too', desc: 'fetchOrder 同样分类', kind: 'test',
      test: `node -e "let e;try{require('./api.js').fetchOrder(999)}catch(x){e=x}process.exit(e&&e.code==='NOT_FOUND'?0:1)"` },
  ],
}

const FETCHER_JS = `// 不稳定拉取模拟：failTimes(n) 返回前 n 次抛错、之后成功的函数
function flakyFetch(failTimes) {
  let called = 0
  return (id) => {
    called += 1
    if (called <= failTimes) throw new Error('网络抖动 ' + called)
    return { id, ok: true }
  }
}
module.exports = { flakyFetch }
`

/** retryFetch 模块加载器：brief 只说「独立模块」未定名，兼容常见路径取导出 retryFetch 的第一个 */
const RETRY_LOAD = `let fn;for(const m of ['./retry.js','./fetcher.js','./lib/retry.js','./retryFetch.js','./retry-wrapper.js']){try{const x=require(m);if(typeof x.retryFetch==='function'){fn=x.retryFetch;break}}catch{}}if(!fn)process.exit(1);`

export const RETRY_IDEMPOTENT: BenchTask = {
  id: 'retry-idempotent',
  tier: 'heavy',
  brief:
    'fetcher.js 的拉取不稳定。写个 retryFetch(fn, ...args)：失败自动重试，最多额外重试 3 次；全部失败时抛最后一次的错误；成功了就直接返回，别重复执行已成功的调用。写成独立模块并在包一层带指数退避间隔的版本 retryBackoff，补 test.js 覆盖上限与幂等。',
  seed: { 'fetcher.js': FETCHER_JS },
  hiddenChecks: [
    { id: 'retry-until-success', desc: '前 2 次失败第 3 次成功 → 返回成功值', kind: 'test',
      test: `node -e "${RETRY_LOAD}const {flakyFetch}=require('./fetcher.js');const r=fn(flakyFetch(2),42);process.exit(r&&r.ok===true&&r.id===42?0:1)"` },
    { id: 'all-fail-throws', desc: '恒失败时最终抛错', kind: 'test',
      test: `node -e "${RETRY_LOAD}const {flakyFetch}=require('./fetcher.js');let threw=false;try{fn(flakyFetch(99),1)}catch{threw=true}process.exit(threw?0:1)"` },
    { id: 'no-retry-after-success', desc: '成功后不再执行（fn 仅调 1 次）', kind: 'test',
      test: `node -e "${RETRY_LOAD}let n=0;const g=()=>{n++;return 'ok'};fn(g);process.exit(n===1?0:1)"` },
    { id: 'retry-cap-3', desc: '重试上限：fn 最多被调 4 次（1+3）', kind: 'test',
      test: `node -e "${RETRY_LOAD}let n=0;const g=()=>{n++;throw new Error('x')};try{fn(g)}catch{};process.exit(n===4?0:1)"` },
    { id: 'throws-last-error', desc: '抛出的是最后一次的错误对象', kind: 'test',
      test: `node -e "${RETRY_LOAD}let last;let n=0;const g=()=>{n++;last=new Error('boom-'+n);throw last};let got;try{fn(g)}catch(e){got=e}process.exit(got===last&&got.message==='boom-4'?0:1)"` },
    { id: 'passes-value-through', desc: '成功返回值透传（不改写）', kind: 'test',
      test: `node -e "${RETRY_LOAD}const v={deep:{x:1}};const r=fn(()=>v);process.exit(r===v?0:1)"` },
  ],
}

const LOGGER_JS = `// 结构化日志：直接 console.log JSON
function log(obj) {
  console.log(JSON.stringify(obj))
}
module.exports = { log }
`

export const LOG_REDACT: BenchTask = {
  id: 'log-redact',
  tier: 'heavy',
  brief:
    'logger.js 的日志直接输出整个对象，要上生产了：password / token / authorization 字段的值替换成 *** 再输出，字段名大小写不敏感，嵌套对象和数组里的也要处理，其他字段保持原样。脱敏逻辑抽成通用 redact.js 模块（logger.js 引用），补一个 test.js 覆盖嵌套与数组场景。',
  seed: { 'logger.js': LOGGER_JS },
  hiddenChecks: [
    { id: 'top-level-redact', desc: '顶层 password 脱敏', kind: 'test',
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({user:'a',password:'secret'});const j=JSON.parse(logs[0]);process.exit(j.password!=='secret'?0:1)"` },
    { id: 'nested-redact', desc: '嵌套对象里的 token 脱敏', kind: 'test',
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({a:{token:'tk-123'}});const j=JSON.parse(logs[0]);process.exit(j.a.token!=='tk-123'?0:1)"` },
    { id: 'other-fields-intact', desc: '非敏感字段原样输出', kind: 'test',
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({name:'app',version:2,password:'x'});const j=JSON.parse(logs[0]);process.exit(j.name==='app'&&j.version===2?0:1)"` },
    { id: 'array-redact', desc: '数组内对象的敏感字段脱敏', kind: 'test',
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({users:[{token:'t1'},{ok:1}]});const j=JSON.parse(logs[0]);process.exit(j.users[0].token!=='t1'?0:1)"` },
    { id: 'case-insensitive', desc: '字段名大小写不敏感（Password 也脱敏）', kind: 'test',
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({Password:'p'});const j=JSON.parse(logs[0]);process.exit(j.Password!=='p'?0:1)"` },
    { id: 'clean-input-unchanged', desc: '无敏感字段时输出与输入等价', kind: 'test',
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({a:1,b:'two'});const j=JSON.parse(logs[0]);process.exit(j.a===1&&j.b==='two'?0:1)"` },
  ],
}

const FORM_JS = `// 表单提交：目前不做校验直接通过
function submit(data) {
  return { ok: true }
}
module.exports = { submit }
`

export const VALIDATE_BOUNDARY: BenchTask = {
  id: 'validate-boundary',
  tier: 'heavy',
  brief:
    'form.js 的 submit 收的是外部数据，完全没校验。加校验：name 必填且为字符串；age 可选但必须是正整数；email 可选但必须含 @。不合法时返回 { ok: false, errors: [...] }（别抛异常），errors 要能定位到哪个字段。校验规则拆到独立的 validators.js（form.js 引用），补一个 test.js 覆盖合法/非法/多错误场景。',
  seed: { 'form.js': FORM_JS },
  hiddenChecks: [
    { id: 'valid-passes', desc: '合法输入 ok:true', kind: 'test',
      test: `node -e "const r=require('./form.js').submit({name:'a',age:20,email:'a@b.c'});process.exit(r.ok===true?0:1)"` },
    { id: 'missing-name-no-throw', desc: '缺 name 返回 ok:false 而非抛异常', kind: 'test',
      test: `node -e "const r=require('./form.js').submit({});process.exit(r&&r.ok===false?0:1)"` },
    { id: 'age-integer-check', desc: 'age 非正整数（字符串/负数）被拒', kind: 'test',
      test: `node -e "const s=require('./form.js');const a=s.submit({name:'a',age:'25'}),b=s.submit({name:'a',age:-1});process.exit(a.ok===false&&b.ok===false?0:1)"` },
    { id: 'email-at-check', desc: 'email 无 @ 被拒', kind: 'test',
      test: `node -e "const r=require('./form.js').submit({name:'a',email:'no-at'});process.exit(r.ok===false?0:1)"` },
    { id: 'errors-name-field', desc: 'errors 含字段名定位', kind: 'test',
      test: `node -e "const r=require('./form.js').submit({age:'x'});const s=JSON.stringify(r.errors||[]);process.exit(/name/i.test(s)?0:1)"` },
    { id: 'all-errors-at-once', desc: '多字段错误一次全报（非首错即停）', kind: 'test',
      test: `node -e "const r=require('./form.js').submit({age:'x',email:'bad'});process.exit(Array.isArray(r.errors)&&r.errors.length>=2?0:1)"` },
  ],
}

export const STATS_JS = `// 订单处理：校验 + 计价（含折扣）+ 格式化，全在一个函数里
function processOrder(order) {
  if (!order.id || !Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('订单数据不完整')
  }
  let subtotal = 0
  for (const it of order.items) {
    if (it.qty <= 0) throw new Error('数量必须为正: ' + it.sku)
    subtotal += it.qty * it.price
  }
  let discount = 0
  if (subtotal >= 1000) discount = subtotal * 0.1
  else if (subtotal >= 500) discount = subtotal * 0.05
  const total = subtotal - discount
  const totalStr = '¥' + total.toFixed(2)
  return { id: order.id, subtotal, discount, total, totalStr }
}
module.exports = { processOrder }
`

export const REFACTOR_EXTRACT: BenchTask = {
  id: 'refactor-extract',
  tier: 'heavy',
  brief:
    'stats.js 的 processOrder 校验、计价、折扣、格式化全糊在一个函数里，太长了。拆成职责单一的模块，行为必须保持完全不变（输出一字节都不能变），主文件只做编排。',
  seed: { 'stats.js': STATS_JS },
  hiddenChecks: [
    { id: 'behavior-typical', desc: '典型输入输出与拆分前一致', kind: 'test',
      test: `node -e "const {processOrder}=require('./stats.js');const r=processOrder({id:'o1',items:[{sku:'a',qty:2,price:300}]});const exp={id:'o1',subtotal:600,discount:30,total:570,totalStr:'¥570.00'};process.exit(JSON.stringify(r)===JSON.stringify(exp)?0:1)"` },
    { id: 'behavior-boundary', desc: '边界行为一致（500/1000 折扣档与零数量）', kind: 'test',
      test: `node -e "const {processOrder}=require('./stats.js');const a=processOrder({id:'x',items:[{sku:'a',qty:5,price:100}]});const b=processOrder({id:'x',items:[{sku:'a',qty:10,price:100}]});let threw=false;try{processOrder({id:'x',items:[{sku:'a',qty:0,price:1}]})}catch{threw=true}process.exit(a.discount===25&&b.discount===100&&threw?0:1)"` },
    { id: 'invalid-still-throws', desc: '非法输入仍抛错（消息不变）', kind: 'test',
      test: `node -e "let e;try{require('./stats.js').processOrder({})}catch(x){e=x}process.exit(e&&e.message==='订单数据不完整'?0:1)"` },
    { id: 'main-file-shrunk', desc: '折扣档位逻辑已移出主文件（stats.js 编排化）', kind: 'test',
      test: `! grep -qE '0\\.1|0\\.05' stats.js` },
    { id: 'extracted-modules-exist', desc: '拆出独立模块（pricing/validate 等 ≥1 个新文件）', kind: 'test',
      test: `found=0; for f in pricing.js validate.js format.js lib; do [ -e "$f" ] && found=1; done; [ "$found" = 1 ]` },
    { id: 'format-two-decimals', desc: '金额格式保持两位小数带货币符', kind: 'test',
      test: `node -e "const r=require('./stats.js').processOrder({id:'x',items:[{sku:'a',qty:3,price:33.3}]});process.exit(/^¥\\\\d+\\\\.\\\\d{2}$/.test(r.totalStr)?0:1)"` },
  ],
}
