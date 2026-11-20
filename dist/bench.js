#!/usr/bin/env node

// benchmarks/src/bench.ts
import { mkdtempSync as mkdtempSync2, mkdirSync as mkdirSync4, writeFileSync as writeFileSync4, readFileSync as readFileSync3, existsSync as existsSync3, readdirSync as readdirSync2, rmSync as rmSync2 } from "node:fs";
import { tmpdir as tmpdir2 } from "node:os";
import { join as join6 } from "node:path";

// benchmarks/src/arms.ts
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { join } from "node:path";
var here = fileURLToPath(new URL(".", import.meta.url));
var repoRoot = existsSync(join(here, "..", ".claude-plugin", "plugin.json")) ? join(here, "..") : join(here, "..", "..");
function assertRepoRoot() {
  if (!existsSync(join(repoRoot, ".claude-plugin", "plugin.json"))) {
    throw new Error(`\u4ED3\u5E93\u6839\u5B9A\u4F4D\u5931\u8D25\uFF1A${repoRoot} \u4E0B\u65E0 .claude-plugin/plugin.json`);
  }
}
var ARMS = {
  baseline: { id: "baseline" },
  flowneo: {
    id: "flowneo",
    get pluginDir() {
      assertRepoRoot();
      return repoRoot;
    }
  },
  verbal: {
    id: "verbal",
    appendSystem: "\u5148\u5206\u6790\u9700\u6C42\u5E76\u5F62\u6210\u8BBE\u8BA1\u65B9\u6848\uFF0C\u518D\u7F16\u7801\u5B9E\u73B0\uFF0C\u7F16\u7801\u5B8C\u6210\u540E\u81EA\u67E5\u5BA1\u67E5\u518D\u4EA4\u4ED8\u3002"
  }
};

// benchmarks/src/tasks/heavy.ts
var TODO_CLI = `#!/usr/bin/env node
// \u56E2\u961F\u5728\u7528\u7684\u547D\u4EE4\u884C\u5F85\u529E\u5DE5\u5177
// \u7528\u6CD5\uFF1Anode todo.js add "\u6587\u672C" | node todo.js list
const fs = require('fs')
const path = require('path')
const DATA = path.join(__dirname, 'todos.json')
const load = () => (fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : [])
const save = (todos) => fs.writeFileSync(DATA, JSON.stringify(todos, null, 2))
const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'add') {
  const text = rest.join(' ')
  if (!text) { console.error('\u7528\u6CD5\uFF1Atodo.js add "\u6587\u672C"'); process.exit(1) }
  const todos = load()
  const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1
  todos.push({ id, text })
  save(todos)
  console.log('\u5DF2\u6DFB\u52A0 #' + id + ': ' + text)
} else if (cmd === 'list') {
  for (const t of load()) console.log('#' + t.id + ' ' + t.text)
} else {
  console.error('\u7528\u6CD5\uFF1Atodo.js add|list')
  process.exit(1)
}
`;
var CLI_SUBCOMMAND = {
  id: "cli-subcommand",
  tier: "heavy",
  brief: "todo.js \u662F\u56E2\u961F\u5728\u7528\u7684\u547D\u4EE4\u884C\u5F85\u529E\u5DE5\u5177\uFF08node todo.js <cmd>\uFF09\u3002\u8BF7\u52A0\u4E00\u4E2A done \u547D\u4EE4\uFF1Anode todo.js done <id> \u628A\u5BF9\u5E94\u6761\u76EE\u6807\u4E3A\u5DF2\u5B8C\u6210\uFF1B\u540C\u65F6\u7ED9 list \u52A0 --json \u5F00\u5173\u8F93\u51FA\u673A\u5668\u53EF\u8BFB\u683C\u5F0F\uFF0C\u65B9\u4FBF\u63A5 CI\u3002\u6570\u636E\u683C\u5F0F\u4F60\u4EEC\u770B\u7740\u529E\uFF0C\u522B\u628A\u73B0\u6709 add/list \u5F04\u574F\u5C31\u884C\u3002\u53E6\u5916\u6570\u636E\u5B58\u53D6\u903B\u8F91\u62BD\u5230\u72EC\u7ACB\u7684 store.js \u6A21\u5757\uFF08todo.js \u53EA\u7559\u547D\u4EE4\u89E3\u6790\uFF09\uFF0C\u5E76\u8865\u4E00\u4E2A test.js \u9A8C\u8BC1\u811A\u672C\u8986\u76D6 done \u4E0E --json \u6D41\u7A0B\u3002",
  seed: { "todo.js": TODO_CLI },
  hiddenChecks: [
    {
      id: "done-keeps-entry",
      desc: "done \u6807\u8BB0\u540E\u6761\u76EE\u4FDD\u7559\uFF08\u975E\u5220\u9664\uFF09",
      kind: "test",
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add x');c('node todo.js done 1');process.exit(c('node todo.js list').toString().includes('x')?0:1)"`
    },
    {
      id: "done-marks-status",
      desc: "done \u540E\u6761\u76EE\u6570\u636E\u542B\u5B8C\u6210\u72B6\u6001\u5B57\u6BB5",
      kind: "test",
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add x');c('node todo.js done 1');const d=JSON.parse(require('fs').readFileSync('todos.json','utf8'));process.exit(d.some(t=>t.done===true||t.completed===true)?0:1)"`
    },
    {
      id: "done-unknown-id-fails",
      desc: "done \u4E0D\u5B58\u5728\u7684 id \u62A5\u9519\u4E14\u9000\u51FA\u7801\u975E 0",
      kind: "test",
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add x');let bad=0;try{c('node todo.js done 99')}catch(e){bad=e.status}process.exit(bad!==0?0:1)"`
    },
    {
      id: "done-no-arg-usage",
      desc: "done \u65E0\u53C2\u6570\u65F6\u62A5\u7528\u6CD5\u9519\u8BEF\u975E 0",
      kind: "test",
      test: `node -e "let bad=0;try{require('child_process').execSync('node todo.js done')}catch(e){bad=e.status}process.exit(bad!==0?0:1)"`
    },
    {
      id: "json-valid",
      desc: "list --json \u8F93\u51FA\u53EF JSON.parse",
      kind: "test",
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add y');JSON.parse(c('node todo.js list --json').toString())"`
    },
    {
      id: "json-array",
      desc: "--json \u8F93\u51FA\u4E3A\u6570\u7EC4",
      kind: "test",
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add y');process.exit(Array.isArray(JSON.parse(c('node todo.js list --json').toString()))?0:1)"`
    },
    {
      id: "add-list-no-regress",
      desc: "add/list \u539F\u884C\u4E3A\u4E0D\u56DE\u5F52",
      kind: "test",
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add hello');process.exit(c('node todo.js list').toString().includes('hello')?0:1)"`
    },
    {
      id: "done-idempotent",
      desc: "\u91CD\u590D done \u540C\u4E00 id \u4E0D\u62A5\u9519",
      kind: "test",
      test: `node -e "const c=require('child_process').execSync;c('node todo.js add z');c('node todo.js done 1');c('node todo.js done 1')"`
    }
  ],
  acceptCmd: `node -e "const c=require('child_process').execSync;c('node todo.js add a');c('node todo.js done 1');JSON.parse(c('node todo.js list --json').toString())"`
};
var USERS_API = `// \u5185\u5B58\u7528\u6237\u63A5\u53E3\uFF1AGET /users \u8FD4\u56DE\u5168\u90E8\uFF0CPOST /users \u65B0\u589E
// \u7528\u6CD5\uFF1Anode server.js\uFF08\u76D1\u542C 3000\uFF09
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
`;
function probeServer(port, query, probe) {
  const detect = `node -e "const h=require('http');h.get('http://127.0.0.1:${port}/users${query}',(r)=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>{const j=JSON.parse(b);const a=Array.isArray(j)?j:(j.items||j.data||j.results||j.users);process.exit(${probe}?0:1)})}).on('error',()=>process.exit(2))"`;
  return [
    `lsof -ti:${port} | xargs kill -9 2>/dev/null; sleep 0.2`,
    `node server.js & SRV=$!`,
    `RC=2; for i in 1 2 3 4 5 6 7 8; do ${detect} && RC=0 || RC=$?; [ $RC -ne 2 ] && break; sleep 0.4; done`,
    `kill $SRV 2>/dev/null; exit $RC`
  ].join("\n");
}
var API_PAGINATION = {
  id: "api-pagination",
  tier: "heavy",
  brief: "server.js \u662F\u4E2A\u5185\u5B58\u7528\u6237\u63A5\u53E3\uFF08GET/POST /users\uFF09\u3002\u7528\u6237\u91CF\u4E0A\u6765\u4E86\uFF0C\u524D\u7AEF\u8981\u5206\u9875\uFF1AGET /users \u652F\u6301 page \u548C limit \u53C2\u6570\uFF0C\u518D\u52A0\u4E2A\u6309\u540D\u5B57\u5173\u952E\u8BCD\u8FC7\u6EE4\u7684 q \u53C2\u6570\uFF0C\u524D\u7AEF\u8FD8\u60F3\u77E5\u9053\u603B\u5171\u591A\u5C11\u6761\u3002\u8001\u7684\u4E0D\u5E26\u53C2\u6570\u7684\u8C03\u6CD5\u5148\u522B\u7834\u574F\u3002\u8DEF\u7531\u5904\u7406\u903B\u8F91\u62BD\u5230\u72EC\u7ACB\u7684 routes.js\uFF08server.js \u53EA\u505A\u542F\u52A8\u4E0E\u63A5\u7EBF\uFF09\uFF0C\u8865\u4E00\u4E2A test.js \u5192\u70DF\u811A\u672C\u3002",
  seed: { "server.js": USERS_API },
  hiddenChecks: [
    {
      id: "default-no-params",
      desc: "\u65E0\u53C2\u8C03\u7528\u8FD4\u56DE\u5168\u90E8\uFF08\u88F8\u6570\u7EC4\u6216\u5206\u9875\u5305\u88C5\u5747\u53EF\uFF09",
      kind: "test",
      test: probeServer(3e3, "", `a && a.length >= 9`)
    },
    {
      id: "page2-slices",
      desc: "page=2&limit=3 \u8FD4\u56DE\u7B2C 2 \u9875\u5207\u7247\uFF08\u9996\u6761 Dave\uFF09",
      kind: "test",
      test: probeServer(3e3, "?page=2&limit=3", `a && a.length === 3 && a[0].name === 'Dave'`)
    },
    {
      id: "page-out-of-range-empty",
      desc: "page \u8D85\u8303\u56F4\u8FD4\u56DE\u7A7A\u6570\u7EC4\u800C\u975E\u5D29\u6E83",
      kind: "test",
      test: probeServer(3e3, "?page=99&limit=2", `a && a.length === 0`)
    },
    {
      id: "limit-invalid-fallback",
      desc: "limit \u975E\u6CD5\u503C\u6709\u515C\u5E95\uFF08\u4E0D 500/\u4E0D\u5D29\uFF09",
      kind: "test",
      test: `lsof -ti:3000 | xargs kill -9 2>/dev/null; sleep 0.2
node server.js & SRV=$!
RC=2; for i in 1 2 3 4 5 6 7 8; do node -e "const h=require('http');h.get('http://127.0.0.1:3000/users?limit=abc',(r)=>{let b='';r.on('data',c=>b+=c);r.on('end',()=>process.exit(r.statusCode===200?0:1))}).on('error',()=>process.exit(2))" && RC=0 || RC=$?; [ $RC -ne 2 ] && break; sleep 0.4; done
kill $SRV 2>/dev/null; exit $RC`
    },
    {
      id: "q-case-insensitive",
      desc: "q \u8FC7\u6EE4\u5927\u5C0F\u5199\u4E0D\u654F\u611F",
      kind: "test",
      test: probeServer(3e3, "?q=ALICE", `a && a.length === 1 && a[0].name === 'Alice'`)
    },
    {
      id: "total-field",
      desc: "\u5206\u9875\u54CD\u5E94\u542B total \u603B\u6570\u5B57\u6BB5",
      kind: "test",
      test: probeServer(3e3, "?page=1&limit=2", `Number.isInteger(j.total)`)
    },
    {
      id: "q-then-page",
      desc: "\u8FC7\u6EE4\u4E0E\u5206\u9875\u7EC4\u5408\uFF08\u5148\u8FC7\u6EE4\u540E\u5206\u9875\uFF09",
      kind: "test",
      test: probeServer(3e3, "?q=a&page=1&limit=2", `a && a.length === 2 && j.total >= 3`)
    }
  ],
  acceptCmd: probeServer(3e3, "?page=1&limit=2", `a && a.length === 2`)
};
var CONFIG_V1 = `{
  "name": "app",
  "debug": true
}
`;
var CONFIG_JS = `// \u914D\u7F6E\u8BFB\u53D6\uFF1Aconfig.json\uFF08v1 \u683C\u5F0F\uFF1A{ name, debug }\uFF09
const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
function loadConfig() {
  return JSON.parse(fs.readFileSync(FILE, 'utf8'))
}
module.exports = { loadConfig }
`;
var CONFIG_MIGRATE = {
  id: "config-migrate",
  tier: "heavy",
  brief: "\u914D\u7F6E\u6587\u4EF6\u8981\u4ECE v1\uFF08{ name, debug }\uFF09\u8FC1\u5230 v2\uFF08{ name, features: { debug } }\uFF0C\u5E26 version: 2 \u6807\u8BB0\uFF09\u3002\u5199\u4E2A migrate.js \u628A\u65E7\u683C\u5F0F\u8F6C\u6210\u65B0\u683C\u5F0F\uFF0C\u7A0B\u5E8F\u81EA\u8EAB\u4E5F\u8981\u80FD\u8BFB\u4E24\u79CD\u683C\u5F0F\uFF0C\u522B\u8BA9\u8001\u7528\u6237\u7684\u914D\u7F6E\u574F\u6389\u3002\u8865\u4E00\u4E2A test.js \u8986\u76D6\u4E24\u79CD\u683C\u5F0F\u7684\u8BFB\u53D6\u4E0E\u8FC1\u79FB\u5E42\u7B49\u6027\u3002",
  seed: { "config.js": CONFIG_JS, "config.json": CONFIG_V1 },
  hiddenChecks: [
    {
      id: "migrate-converts",
      desc: "migrate.js \u628A v1 config.json \u8F6C\u4E3A v2\uFF08features.debug \u4FDD\u7559\uFF09",
      kind: "test",
      test: `node -e "const c=require('child_process'),fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',debug:true}));c.execSync('node migrate.js');const d=JSON.parse(fs.readFileSync('config.json','utf8'));process.exit(d.features&&d.features.debug===true?0:1)"`
    },
    {
      id: "load-v1-still-works",
      desc: "loadConfig \u517C\u5BB9\u8BFB\u53D6 v1\uFF08\u8FD4\u56DE debug\uFF09",
      kind: "test",
      test: `node -e "const fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',debug:true}));const cfg=require('./config.js').loadConfig();process.exit(cfg.debug===true||cfg.features&&cfg.features.debug===true?0:1)"`
    },
    {
      id: "load-v2",
      desc: "loadConfig \u8BFB\u53D6 v2",
      kind: "test",
      test: `node -e "const fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',version:2,features:{debug:false}}));const cfg=require('./config.js').loadConfig();process.exit(cfg.features&&cfg.features.debug===false?0:1)"`
    },
    {
      id: "v2-unknown-fields",
      desc: "v2 \u6DF7\u5165\u672A\u77E5\u5B57\u6BB5\u4E0D\u5D29\uFF08\u524D\u5411\u517C\u5BB9\uFF09",
      kind: "test",
      test: `node -e "const fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',version:2,features:{debug:true},futureField:{x:1}}));require('./config.js').loadConfig()"`
    },
    {
      id: "migrate-idempotent",
      desc: "migrate \u5BF9\u5DF2\u662F v2 \u7684\u6587\u4EF6\u5E42\u7B49\uFF08\u4E0D\u91CD\u590D\u5305\u88F9\uFF09",
      kind: "test",
      test: `node -e "const c=require('child_process'),fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',version:2,features:{debug:true}}));c.execSync('node migrate.js');const d=JSON.parse(fs.readFileSync('config.json','utf8'));process.exit(d.features&&d.features.features===undefined?0:1)"`
    },
    {
      id: "migrate-missing-file",
      desc: "migrate \u7F3A config.json \u62A5\u9519\u975E 0",
      kind: "test",
      test: `node -e "const fs=require('fs');try{fs.unlinkSync('config.json')}catch{};let bad=0;try{require('child_process').execSync('node migrate.js')}catch(e){bad=e.status}process.exit(bad!==0?0:1)"`
    },
    {
      id: "v2-version-mark",
      desc: "v2 \u683C\u5F0F\u542B version \u6807\u8BB0",
      kind: "test",
      test: `node -e "const c=require('child_process'),fs=require('fs');fs.writeFileSync('config.json',JSON.stringify({name:'a',debug:true}));c.execSync('node migrate.js');const d=JSON.parse(fs.readFileSync('config.json','utf8'));process.exit(d.version===2||d.features?0:1)"`
    }
  ]
};
var CALC_JS = `// \u6162\u901F\u8BA1\u7B97\uFF1Afibonacci\uFF08\u65E0\u7F13\u5B58\uFF09
function compute(n) {
  if (n < 2) return n
  return compute(n - 1) + compute(n - 2)
}
module.exports = { compute }
`;
var CACHE_LAYER = {
  id: "cache-layer",
  tier: "heavy",
  brief: "calc.js \u7684 compute \u592A\u6162\uFF0C\u52A0\u4E2A\u7F13\u5B58\u5C42\uFF1A\u91CD\u590D\u7B97\u8FC7\u7684\u5165\u53C2\u76F4\u63A5\u51FA\u7ED3\u679C\uFF1B\u7F13\u5B58\u8981\u80FD\u624B\u52A8\u6E05\u6389\uFF08\u957F\u671F\u8DD1\u7684\u8FDB\u7A0B\u9632\u810F\u6570\u636E\uFF09\u3002\u6CE8\u610F\u522B\u628A\u4E0D\u540C\u5165\u53C2\u7684\u7ED3\u679C\u4E32\u4E86\uFF0C\u4E5F\u522B\u5F71\u54CD\u6B63\u786E\u6027\u3002\u7F13\u5B58\u62BD\u6210\u901A\u7528\u7684 cache.js \u6A21\u5757\uFF08calc.js \u5F15\u7528\uFF09\uFF0C\u8865\u4E00\u4E2A test.js \u9A8C\u8BC1\u7F13\u5B58\u547D\u4E2D\u4E0E\u6B63\u786E\u6027\u3002",
  seed: { "calc.js": CALC_JS },
  hiddenChecks: [
    {
      id: "second-call-fast",
      desc: "\u7B2C\u4E8C\u6B21\u540C\u53C2\u8C03\u7528\u663E\u8457\u5FEB\u4E8E\u9996\u6B21\uFF08\u7EB3\u79D2\u8BA1\u65F6\uFF09",
      kind: "test",
      test: `node -e "const {compute}=require('./calc.js');const t=()=>process.hrtime.bigint();let s=t();compute(30);const first=Number(t()-s);s=t();compute(30);const second=Number(t()-s);process.exit(second<first/10?0:1)"`
    },
    {
      id: "different-args-not-mixed",
      desc: "\u4E0D\u540C\u5165\u53C2\u4E0D\u4E32\u7ED3\u679C\uFF08compute(10)\u2260compute(12)\uFF09",
      kind: "test",
      test: `node -e "const {compute}=require('./calc.js');const a=compute(10),b=compute(12),a2=compute(10);process.exit(a===55&&b===144&&a2===55?0:1)"`
    },
    {
      id: "correctness-preserved",
      desc: "\u9996\u6B21\u7ED3\u679C\u4E0E\u65E0\u7F13\u5B58\u57FA\u51C6\u4E00\u81F4",
      kind: "test",
      test: `node -e "const {compute}=require('./calc.js');process.exit(compute(20)===6765&&compute(0)===0&&compute(1)===1?0:1)"`
    },
    {
      id: "clear-entry",
      desc: "\u63D0\u4F9B\u6E05\u7F13\u5B58\u5165\u53E3\uFF08clear/reset \u5BFC\u51FA\uFF09",
      kind: "test",
      test: `node -e "const m=require('./calc.js');process.exit(typeof m.clear==='function'||typeof m.reset==='function'||typeof m.clearCache==='function'?0:1)"`
    },
    {
      id: "signature-unchanged",
      desc: "\u5BFC\u51FA\u7B7E\u540D\u4E0D\u53D8\uFF08compute \u4ECD\u76F4\u63A5\u53EF\u7528\uFF09",
      kind: "test",
      test: `node -e "const m=require('./calc.js');process.exit(typeof m.compute==='function'?0:1)"`
    },
    {
      id: "cache-keyed-by-arg",
      desc: "\u7F13\u5B58\u6309\u53C2\u6570\u952E\u63A7\uFF08\u65B0\u53C2\u4ECD\u771F\u7B97\u4E14\u6B63\u786E\uFF09",
      kind: "test",
      test: `node -e "const {compute}=require('./calc.js');compute(10);compute(12);process.exit(compute(15)===610?0:1)"`
    }
  ]
};
var STORE_JS = `// \u5E93\u5B58\uFF1Adata.json \u6587\u4EF6\u5B58\u50A8 + add/list
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
`;
var MULTI_FORMAT_EXPORT = {
  id: "multi-format-export",
  tier: "heavy",
  brief: "store.js \u5B58\u7740\u5E93\u5B58\u6570\u636E\u3002\u52A0\u4E2A export.js\uFF1Anode export.js json|csv|md \u628A\u5F53\u524D items \u8F93\u51FA\u5230 stdout\u3002CSV \u8981\u6CE8\u610F\u9017\u53F7\u8F6C\u4E49\uFF08\u5B57\u6BB5\u503C\u53EF\u80FD\u5E26\u9017\u53F7\uFF09\uFF0C\u7A7A\u5E93\u5B58\u4E5F\u8981\u80FD\u5BFC\u51FA\uFF0C\u522B\u5D29\u3002\u8865\u4E00\u4E2A test.js \u8986\u76D6\u4E09\u79CD\u683C\u5F0F\u4E0E\u8F6C\u4E49\u573A\u666F\u3002",
  seed: { "store.js": STORE_JS },
  hiddenChecks: [
    {
      id: "json-valid",
      desc: "json \u8F93\u51FA\u5408\u6CD5 JSON \u6570\u7EC4",
      kind: "test",
      test: `node -e "const {add}=require('./store.js');add('pen',2);const o=require('child_process').execSync('node export.js json').toString();process.exit(Array.isArray(JSON.parse(o))?0:1)"`
    },
    {
      id: "csv-header",
      desc: "csv \u9996\u884C\u662F\u8868\u5934",
      kind: "test",
      test: `node -e "require('./store.js').add('pen',2);const o=require('child_process').execSync('node export.js csv').toString();const h=o.split('\\n')[0].toLowerCase();process.exit(h.includes('name')&&h.includes('qty')?0:1)"`
    },
    {
      id: "csv-escape-comma",
      desc: "\u5B57\u6BB5\u542B\u9017\u53F7\u65F6 CSV \u52A0\u5F15\u53F7\u8F6C\u4E49",
      kind: "test",
      test: `node -e "const {add}=require('./store.js');add('red, large',3);const o=require('child_process').execSync('node export.js csv').toString();process.exit(o.includes('\\"red, large\\"')?0:1)"`
    },
    {
      id: "md-table",
      desc: "md \u8F93\u51FA\u4E3A\u8868\u683C\u5F0F\u5217\u8868",
      kind: "test",
      test: `node -e "require('./store.js').add('pen',2);const o=require('child_process').execSync('node export.js md').toString();process.exit(/\\|.*\\|/.test(o)?0:1)"`
    },
    {
      id: "empty-export-ok",
      desc: "\u7A7A\u5E93\u5B58\u5404\u683C\u5F0F\u5BFC\u51FA\u4E0D\u5D29",
      kind: "test",
      test: `node -e "const c=require('child_process').execSync;for(const f of ['json','csv','md'])c('node export.js '+f)"`
    },
    {
      id: "unknown-format-fails",
      desc: "\u672A\u77E5\u683C\u5F0F\u53C2\u6570\u62A5\u9519\u975E 0",
      kind: "test",
      test: `node -e "let bad=0;try{require('child_process').execSync('node export.js xml')}catch(e){bad=e.status}process.exit(bad!==0?0:1)"`
    }
  ]
};
var API_JS = `// \u7528\u6237/\u8BA2\u5355\u67E5\u8BE2\uFF1A\u76F4\u63A5 throw \u5B57\u7B26\u4E32\u9519\u8BEF\uFF0C\u65E0\u5206\u7C7B
function fetchUser(id) {
  if (id <= 0) throw new Error('id \u975E\u6CD5')
  if (id > 100) throw new Error('\u7528\u6237\u4E0D\u5B58\u5728: ' + id)
  return { id, name: 'user' + id }
}
function fetchOrder(id) {
  if (id <= 0) throw new Error('id \u975E\u6CD5')
  if (id > 500) throw new Error('\u8BA2\u5355\u4E0D\u5B58\u5728: ' + id)
  return { id, items: [] }
}
module.exports = { fetchUser, fetchOrder }
`;
var ERROR_TAXONOMY = {
  id: "error-taxonomy",
  tier: "heavy",
  brief: "api.js \u7684\u9519\u8BEF\u6CA1\u5206\u7C7B\uFF0C\u8C03\u7528\u65B9\u6CA1\u6CD5\u6309\u7C7B\u578B\u5206\u652F\u5904\u7406\u3002\u628A\u9519\u8BEF\u5206\u6210 NotFound\uFF08\u67E5\u4E0D\u5230\uFF09\u548C InvalidInput\uFF08\u5165\u53C2\u975E\u6CD5\uFF09\uFF0C\u9519\u8BEF\u5BF9\u8C61\u5E26 code \u5B57\u6BB5\uFF08\u5982 NOT_FOUND / INVALID_INPUT\uFF09\uFF0C\u5176\u4F59\u4FDD\u6301\u73B0\u72B6\u3002\u73B0\u6709\u51FD\u6570\u540D\u522B\u6539\uFF1B\u9519\u8BEF\u7C7B\u5B9A\u4E49\u62BD\u5230\u72EC\u7ACB\u7684 errors.js\uFF0Capi.js \u5F15\u7528\uFF0C\u8865\u4E00\u4E2A test.js \u6309 code \u5206\u652F\u65AD\u8A00\u3002",
  seed: { "api.js": API_JS },
  hiddenChecks: [
    {
      id: "not-found-code",
      desc: "\u67E5\u4E0D\u5230\u65F6\u9519\u8BEF code \u4E3A NOT_FOUND",
      kind: "test",
      test: `node -e "let e;try{require('./api.js').fetchUser(999)}catch(x){e=x}process.exit(e&&e.code==='NOT_FOUND'?0:1)"`
    },
    {
      id: "invalid-input-code",
      desc: "\u5165\u53C2\u975E\u6CD5\u65F6\u9519\u8BEF code \u4E3A INVALID_INPUT",
      kind: "test",
      test: `node -e "let e;try{require('./api.js').fetchUser(-1)}catch(x){e=x}process.exit(e&&e.code==='INVALID_INPUT'?0:1)"`
    },
    {
      id: "error-subclass",
      desc: "\u9519\u8BEF\u4ECD\u662F Error \u5B9E\u4F8B\uFF08instanceof\uFF09",
      kind: "test",
      test: `node -e "let e;try{require('./api.js').fetchUser(999)}catch(x){e=x}process.exit(e instanceof Error?0:1)"`
    },
    {
      id: "message-readable",
      desc: "message \u4ECD\u542B\u4EBA\u7C7B\u53EF\u8BFB\u63CF\u8FF0",
      kind: "test",
      test: `node -e "let e;try{require('./api.js').fetchUser(999)}catch(x){e=x}process.exit(e&&/999|\u4E0D\u5B58\u5728|not/i.test(e.message)?0:1)"`
    },
    {
      id: "exports-unchanged",
      desc: "\u73B0\u6709\u5BFC\u51FA\u51FD\u6570\u540D\u4E0D\u53D8",
      kind: "test",
      test: `node -e "const m=require('./api.js');process.exit(typeof m.fetchUser==='function'&&typeof m.fetchOrder==='function'?0:1)"`
    },
    {
      id: "order-api-too",
      desc: "fetchOrder \u540C\u6837\u5206\u7C7B",
      kind: "test",
      test: `node -e "let e;try{require('./api.js').fetchOrder(999)}catch(x){e=x}process.exit(e&&e.code==='NOT_FOUND'?0:1)"`
    }
  ]
};
var FETCHER_JS = `// \u4E0D\u7A33\u5B9A\u62C9\u53D6\u6A21\u62DF\uFF1AfailTimes(n) \u8FD4\u56DE\u524D n \u6B21\u629B\u9519\u3001\u4E4B\u540E\u6210\u529F\u7684\u51FD\u6570
function flakyFetch(failTimes) {
  let called = 0
  return (id) => {
    called += 1
    if (called <= failTimes) throw new Error('\u7F51\u7EDC\u6296\u52A8 ' + called)
    return { id, ok: true }
  }
}
module.exports = { flakyFetch }
`;
var RETRY_LOAD = `let fn;for(const m of ['./retry.js','./fetcher.js','./lib/retry.js','./retryFetch.js','./retry-wrapper.js']){try{const x=require(m);if(typeof x.retryFetch==='function'){fn=x.retryFetch;break}}catch{}}if(!fn)process.exit(1);`;
var RETRY_IDEMPOTENT = {
  id: "retry-idempotent",
  tier: "heavy",
  brief: "fetcher.js \u7684\u62C9\u53D6\u4E0D\u7A33\u5B9A\u3002\u5199\u4E2A retryFetch(fn, ...args)\uFF1A\u5931\u8D25\u81EA\u52A8\u91CD\u8BD5\uFF0C\u6700\u591A\u989D\u5916\u91CD\u8BD5 3 \u6B21\uFF1B\u5168\u90E8\u5931\u8D25\u65F6\u629B\u6700\u540E\u4E00\u6B21\u7684\u9519\u8BEF\uFF1B\u6210\u529F\u4E86\u5C31\u76F4\u63A5\u8FD4\u56DE\uFF0C\u522B\u91CD\u590D\u6267\u884C\u5DF2\u6210\u529F\u7684\u8C03\u7528\u3002\u5199\u6210\u72EC\u7ACB\u6A21\u5757\u5E76\u5728\u5305\u4E00\u5C42\u5E26\u6307\u6570\u9000\u907F\u95F4\u9694\u7684\u7248\u672C retryBackoff\uFF0C\u8865 test.js \u8986\u76D6\u4E0A\u9650\u4E0E\u5E42\u7B49\u3002",
  seed: { "fetcher.js": FETCHER_JS },
  hiddenChecks: [
    {
      id: "retry-until-success",
      desc: "\u524D 2 \u6B21\u5931\u8D25\u7B2C 3 \u6B21\u6210\u529F \u2192 \u8FD4\u56DE\u6210\u529F\u503C",
      kind: "test",
      test: `node -e "${RETRY_LOAD}const {flakyFetch}=require('./fetcher.js');const r=fn(flakyFetch(2),42);process.exit(r&&r.ok===true&&r.id===42?0:1)"`
    },
    {
      id: "all-fail-throws",
      desc: "\u6052\u5931\u8D25\u65F6\u6700\u7EC8\u629B\u9519",
      kind: "test",
      test: `node -e "${RETRY_LOAD}const {flakyFetch}=require('./fetcher.js');let threw=false;try{fn(flakyFetch(99),1)}catch{threw=true}process.exit(threw?0:1)"`
    },
    {
      id: "no-retry-after-success",
      desc: "\u6210\u529F\u540E\u4E0D\u518D\u6267\u884C\uFF08fn \u4EC5\u8C03 1 \u6B21\uFF09",
      kind: "test",
      test: `node -e "${RETRY_LOAD}let n=0;const g=()=>{n++;return 'ok'};fn(g);process.exit(n===1?0:1)"`
    },
    {
      id: "retry-cap-3",
      desc: "\u91CD\u8BD5\u4E0A\u9650\uFF1Afn \u6700\u591A\u88AB\u8C03 4 \u6B21\uFF081+3\uFF09",
      kind: "test",
      test: `node -e "${RETRY_LOAD}let n=0;const g=()=>{n++;throw new Error('x')};try{fn(g)}catch{};process.exit(n===4?0:1)"`
    },
    {
      id: "throws-last-error",
      desc: "\u629B\u51FA\u7684\u662F\u6700\u540E\u4E00\u6B21\u7684\u9519\u8BEF\u5BF9\u8C61",
      kind: "test",
      test: `node -e "${RETRY_LOAD}let last;let n=0;const g=()=>{n++;last=new Error('boom-'+n);throw last};let got;try{fn(g)}catch(e){got=e}process.exit(got===last&&got.message==='boom-4'?0:1)"`
    },
    {
      id: "passes-value-through",
      desc: "\u6210\u529F\u8FD4\u56DE\u503C\u900F\u4F20\uFF08\u4E0D\u6539\u5199\uFF09",
      kind: "test",
      test: `node -e "${RETRY_LOAD}const v={deep:{x:1}};const r=fn(()=>v);process.exit(r===v?0:1)"`
    }
  ]
};
var LOGGER_JS = `// \u7ED3\u6784\u5316\u65E5\u5FD7\uFF1A\u76F4\u63A5 console.log JSON
function log(obj) {
  console.log(JSON.stringify(obj))
}
module.exports = { log }
`;
var LOG_REDACT = {
  id: "log-redact",
  tier: "heavy",
  brief: "logger.js \u7684\u65E5\u5FD7\u76F4\u63A5\u8F93\u51FA\u6574\u4E2A\u5BF9\u8C61\uFF0C\u8981\u4E0A\u751F\u4EA7\u4E86\uFF1Apassword / token / authorization \u5B57\u6BB5\u7684\u503C\u66FF\u6362\u6210 *** \u518D\u8F93\u51FA\uFF0C\u5B57\u6BB5\u540D\u5927\u5C0F\u5199\u4E0D\u654F\u611F\uFF0C\u5D4C\u5957\u5BF9\u8C61\u548C\u6570\u7EC4\u91CC\u7684\u4E5F\u8981\u5904\u7406\uFF0C\u5176\u4ED6\u5B57\u6BB5\u4FDD\u6301\u539F\u6837\u3002\u8131\u654F\u903B\u8F91\u62BD\u6210\u901A\u7528 redact.js \u6A21\u5757\uFF08logger.js \u5F15\u7528\uFF09\uFF0C\u8865\u4E00\u4E2A test.js \u8986\u76D6\u5D4C\u5957\u4E0E\u6570\u7EC4\u573A\u666F\u3002",
  seed: { "logger.js": LOGGER_JS },
  hiddenChecks: [
    {
      id: "top-level-redact",
      desc: "\u9876\u5C42 password \u8131\u654F",
      kind: "test",
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({user:'a',password:'secret'});const j=JSON.parse(logs[0]);process.exit(j.password!=='secret'?0:1)"`
    },
    {
      id: "nested-redact",
      desc: "\u5D4C\u5957\u5BF9\u8C61\u91CC\u7684 token \u8131\u654F",
      kind: "test",
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({a:{token:'tk-123'}});const j=JSON.parse(logs[0]);process.exit(j.a.token!=='tk-123'?0:1)"`
    },
    {
      id: "other-fields-intact",
      desc: "\u975E\u654F\u611F\u5B57\u6BB5\u539F\u6837\u8F93\u51FA",
      kind: "test",
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({name:'app',version:2,password:'x'});const j=JSON.parse(logs[0]);process.exit(j.name==='app'&&j.version===2?0:1)"`
    },
    {
      id: "array-redact",
      desc: "\u6570\u7EC4\u5185\u5BF9\u8C61\u7684\u654F\u611F\u5B57\u6BB5\u8131\u654F",
      kind: "test",
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({users:[{token:'t1'},{ok:1}]});const j=JSON.parse(logs[0]);process.exit(j.users[0].token!=='t1'?0:1)"`
    },
    {
      id: "case-insensitive",
      desc: "\u5B57\u6BB5\u540D\u5927\u5C0F\u5199\u4E0D\u654F\u611F\uFF08Password \u4E5F\u8131\u654F\uFF09",
      kind: "test",
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({Password:'p'});const j=JSON.parse(logs[0]);process.exit(j.Password!=='p'?0:1)"`
    },
    {
      id: "clean-input-unchanged",
      desc: "\u65E0\u654F\u611F\u5B57\u6BB5\u65F6\u8F93\u51FA\u4E0E\u8F93\u5165\u7B49\u4EF7",
      kind: "test",
      test: `node -e "const logs=[];console.log=(...a)=>logs.push(a.join(' '));require('./logger.js').log({a:1,b:'two'});const j=JSON.parse(logs[0]);process.exit(j.a===1&&j.b==='two'?0:1)"`
    }
  ]
};
var FORM_JS = `// \u8868\u5355\u63D0\u4EA4\uFF1A\u76EE\u524D\u4E0D\u505A\u6821\u9A8C\u76F4\u63A5\u901A\u8FC7
function submit(data) {
  return { ok: true }
}
module.exports = { submit }
`;
var VALIDATE_BOUNDARY = {
  id: "validate-boundary",
  tier: "heavy",
  brief: "form.js \u7684 submit \u6536\u7684\u662F\u5916\u90E8\u6570\u636E\uFF0C\u5B8C\u5168\u6CA1\u6821\u9A8C\u3002\u52A0\u6821\u9A8C\uFF1Aname \u5FC5\u586B\u4E14\u4E3A\u5B57\u7B26\u4E32\uFF1Bage \u53EF\u9009\u4F46\u5FC5\u987B\u662F\u6B63\u6574\u6570\uFF1Bemail \u53EF\u9009\u4F46\u5FC5\u987B\u542B @\u3002\u4E0D\u5408\u6CD5\u65F6\u8FD4\u56DE { ok: false, errors: [...] }\uFF08\u522B\u629B\u5F02\u5E38\uFF09\uFF0Cerrors \u8981\u80FD\u5B9A\u4F4D\u5230\u54EA\u4E2A\u5B57\u6BB5\u3002\u6821\u9A8C\u89C4\u5219\u62C6\u5230\u72EC\u7ACB\u7684 validators.js\uFF08form.js \u5F15\u7528\uFF09\uFF0C\u8865\u4E00\u4E2A test.js \u8986\u76D6\u5408\u6CD5/\u975E\u6CD5/\u591A\u9519\u8BEF\u573A\u666F\u3002",
  seed: { "form.js": FORM_JS },
  hiddenChecks: [
    {
      id: "valid-passes",
      desc: "\u5408\u6CD5\u8F93\u5165 ok:true",
      kind: "test",
      test: `node -e "const r=require('./form.js').submit({name:'a',age:20,email:'a@b.c'});process.exit(r.ok===true?0:1)"`
    },
    {
      id: "missing-name-no-throw",
      desc: "\u7F3A name \u8FD4\u56DE ok:false \u800C\u975E\u629B\u5F02\u5E38",
      kind: "test",
      test: `node -e "const r=require('./form.js').submit({});process.exit(r&&r.ok===false?0:1)"`
    },
    {
      id: "age-integer-check",
      desc: "age \u975E\u6B63\u6574\u6570\uFF08\u5B57\u7B26\u4E32/\u8D1F\u6570\uFF09\u88AB\u62D2",
      kind: "test",
      test: `node -e "const s=require('./form.js');const a=s.submit({name:'a',age:'25'}),b=s.submit({name:'a',age:-1});process.exit(a.ok===false&&b.ok===false?0:1)"`
    },
    {
      id: "email-at-check",
      desc: "email \u65E0 @ \u88AB\u62D2",
      kind: "test",
      test: `node -e "const r=require('./form.js').submit({name:'a',email:'no-at'});process.exit(r.ok===false?0:1)"`
    },
    {
      id: "errors-name-field",
      desc: "errors \u542B\u5B57\u6BB5\u540D\u5B9A\u4F4D",
      kind: "test",
      test: `node -e "const r=require('./form.js').submit({age:'x'});const s=JSON.stringify(r.errors||[]);process.exit(/name/i.test(s)?0:1)"`
    },
    {
      id: "all-errors-at-once",
      desc: "\u591A\u5B57\u6BB5\u9519\u8BEF\u4E00\u6B21\u5168\u62A5\uFF08\u975E\u9996\u9519\u5373\u505C\uFF09",
      kind: "test",
      test: `node -e "const r=require('./form.js').submit({age:'x',email:'bad'});process.exit(Array.isArray(r.errors)&&r.errors.length>=2?0:1)"`
    }
  ]
};
var STATS_JS = `// \u8BA2\u5355\u5904\u7406\uFF1A\u6821\u9A8C + \u8BA1\u4EF7\uFF08\u542B\u6298\u6263\uFF09+ \u683C\u5F0F\u5316\uFF0C\u5168\u5728\u4E00\u4E2A\u51FD\u6570\u91CC
function processOrder(order) {
  if (!order.id || !Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('\u8BA2\u5355\u6570\u636E\u4E0D\u5B8C\u6574')
  }
  let subtotal = 0
  for (const it of order.items) {
    if (it.qty <= 0) throw new Error('\u6570\u91CF\u5FC5\u987B\u4E3A\u6B63: ' + it.sku)
    subtotal += it.qty * it.price
  }
  let discount = 0
  if (subtotal >= 1000) discount = subtotal * 0.1
  else if (subtotal >= 500) discount = subtotal * 0.05
  const total = subtotal - discount
  const totalStr = '\xA5' + total.toFixed(2)
  return { id: order.id, subtotal, discount, total, totalStr }
}
module.exports = { processOrder }
`;
var REFACTOR_EXTRACT = {
  id: "refactor-extract",
  tier: "heavy",
  brief: "stats.js \u7684 processOrder \u6821\u9A8C\u3001\u8BA1\u4EF7\u3001\u6298\u6263\u3001\u683C\u5F0F\u5316\u5168\u7CCA\u5728\u4E00\u4E2A\u51FD\u6570\u91CC\uFF0C\u592A\u957F\u4E86\u3002\u62C6\u6210\u804C\u8D23\u5355\u4E00\u7684\u6A21\u5757\uFF0C\u884C\u4E3A\u5FC5\u987B\u4FDD\u6301\u5B8C\u5168\u4E0D\u53D8\uFF08\u8F93\u51FA\u4E00\u5B57\u8282\u90FD\u4E0D\u80FD\u53D8\uFF09\uFF0C\u4E3B\u6587\u4EF6\u53EA\u505A\u7F16\u6392\u3002",
  seed: { "stats.js": STATS_JS },
  hiddenChecks: [
    {
      id: "behavior-typical",
      desc: "\u5178\u578B\u8F93\u5165\u8F93\u51FA\u4E0E\u62C6\u5206\u524D\u4E00\u81F4",
      kind: "test",
      test: `node -e "const {processOrder}=require('./stats.js');const r=processOrder({id:'o1',items:[{sku:'a',qty:2,price:300}]});const exp={id:'o1',subtotal:600,discount:30,total:570,totalStr:'\xA5570.00'};process.exit(JSON.stringify(r)===JSON.stringify(exp)?0:1)"`
    },
    {
      id: "behavior-boundary",
      desc: "\u8FB9\u754C\u884C\u4E3A\u4E00\u81F4\uFF08500/1000 \u6298\u6263\u6863\u4E0E\u96F6\u6570\u91CF\uFF09",
      kind: "test",
      test: `node -e "const {processOrder}=require('./stats.js');const a=processOrder({id:'x',items:[{sku:'a',qty:5,price:100}]});const b=processOrder({id:'x',items:[{sku:'a',qty:10,price:100}]});let threw=false;try{processOrder({id:'x',items:[{sku:'a',qty:0,price:1}]})}catch{threw=true}process.exit(a.discount===25&&b.discount===100&&threw?0:1)"`
    },
    {
      id: "invalid-still-throws",
      desc: "\u975E\u6CD5\u8F93\u5165\u4ECD\u629B\u9519\uFF08\u6D88\u606F\u4E0D\u53D8\uFF09",
      kind: "test",
      test: `node -e "let e;try{require('./stats.js').processOrder({})}catch(x){e=x}process.exit(e&&e.message==='\u8BA2\u5355\u6570\u636E\u4E0D\u5B8C\u6574'?0:1)"`
    },
    {
      id: "main-file-shrunk",
      desc: "\u6298\u6263\u6863\u4F4D\u903B\u8F91\u5DF2\u79FB\u51FA\u4E3B\u6587\u4EF6\uFF08stats.js \u7F16\u6392\u5316\uFF09",
      kind: "test",
      test: `! grep -qE '0\\.1|0\\.05' stats.js`
    },
    {
      id: "extracted-modules-exist",
      desc: "\u62C6\u51FA\u72EC\u7ACB\u6A21\u5757\uFF08pricing/validate \u7B49 \u22651 \u4E2A\u65B0\u6587\u4EF6\uFF09",
      kind: "test",
      test: `found=0; for f in pricing.js validate.js format.js lib; do [ -e "$f" ] && found=1; done; [ "$found" = 1 ]`
    },
    {
      id: "format-two-decimals",
      desc: "\u91D1\u989D\u683C\u5F0F\u4FDD\u6301\u4E24\u4F4D\u5C0F\u6570\u5E26\u8D27\u5E01\u7B26",
      kind: "test",
      test: `node -e "const r=require('./stats.js').processOrder({id:'x',items:[{sku:'a',qty:3,price:33.3}]});process.exit(/^\xA5\\\\d+\\\\.\\\\d{2}$/.test(r.totalStr)?0:1)"`
    }
  ]
};

// benchmarks/src/tasks/light.ts
var PAGER = `// \u5206\u9875\u5DE5\u5177\uFF1A\u8FD4\u56DE\u7B2C page \u9875\uFF081 \u8D77\uFF09\uFF0C\u6BCF\u9875 size \u6761
function paginate(items, page, size) {
  const start = (page - 1) * size
  return items.slice(start, start + size - 1)
}
module.exports = { paginate }
`;
var FIX_OFFBYONE = {
  id: "fix-offbyone",
  tier: "light",
  brief: "lib/pager.js \u91CC\u7684 paginate \u4ECE\u7B2C 2 \u9875\u5F00\u59CB\u6BCF\u9875\u90FD\u6BD4\u9884\u671F\u5C11\u4E00\u6761\uFF0C\u5E2E\u5FD9\u4FEE\u4E00\u4E0B\u3002\u4FEE\u5B8C\u786E\u8BA4\u7B2C 1 \u9875\u3001\u4E2D\u95F4\u9875\u548C\u6700\u540E\u4E00\u9875\u6761\u6570\u90FD\u5BF9\u3002",
  seed: { "lib/pager.js": PAGER },
  hiddenChecks: [
    {
      id: "page1-full",
      desc: "\u7B2C 1 \u9875\u8FD4\u56DE size \u6761",
      kind: "test",
      test: `node -e "const {paginate}=require('./lib/pager.js');process.exit(paginate([1,2,3,4,5],1,2).length===2?0:1)"`
    },
    {
      id: "page2-full",
      desc: "\u7B2C 2 \u9875\u8FD4\u56DE size \u6761\uFF08\u539F bug \u5904\uFF09",
      kind: "test",
      test: `node -e "const {paginate}=require('./lib/pager.js');process.exit(paginate([1,2,3,4,5],2,2).length===2?0:1)"`
    },
    {
      id: "last-page-partial",
      desc: "\u6700\u540E\u4E00\u9875\u8FD4\u56DE\u5269\u4F59\u6761\u6570",
      kind: "test",
      test: `node -e "const {paginate}=require('./lib/pager.js');process.exit(paginate([1,2,3,4,5],3,2).length===1?0:1)"`
    }
  ],
  acceptCmd: `node -e "const {paginate}=require('./lib/pager.js');if(paginate([1,2,3,4,5],2,2).length!==2)process.exit(1)"`
};
var GREET_JS = `#!/usr/bin/env node
// \u95EE\u5019\u5DE5\u5177
const name = process.argv[2] || '\u4E16\u754C'
console.log('\u4F60\u597D\uFF0C' + name + '\uFF01')
`;
var ADD_VERBOSE_FLAG = {
  id: "add-verbose-flag",
  tier: "light",
  brief: "greet.js \u52A0\u4E2A --verbose \u6807\u5FD7\uFF1A\u6253\u5F00\u65F6\u591A\u6253\u5370\u4E00\u884C\u7248\u672C\u4FE1\u606F\uFF08\u6BD4\u5982 greet v1.0\uFF09\uFF0C\u9ED8\u8BA4\u884C\u4E3A\u4FDD\u6301\u4E0D\u53D8\u3002",
  seed: { "greet.js": GREET_JS },
  hiddenChecks: [
    {
      id: "default-unchanged",
      desc: "\u9ED8\u8BA4\u8F93\u51FA\u4E0D\u542B\u7248\u672C\u884C",
      kind: "test",
      test: `node -e "const o=require('child_process').execSync('node greet.js \u660E').toString();process.exit(o.includes('\u4F60\u597D\uFF0C\u660E')&&!/v\\\\d+\\\\.\\\\d+/.test(o)?0:1)"`
    },
    {
      id: "verbose-shows-version",
      desc: "--verbose \u8F93\u51FA\u542B\u7248\u672C\u4E32",
      kind: "test",
      test: `node -e "const o=require('child_process').execSync('node greet.js \u660E --verbose').toString();process.exit(/v\\\\d+\\\\.\\\\d+/.test(o)?0:1)"`
    },
    {
      id: "verbose-keeps-greeting",
      desc: "--verbose \u4E0B\u95EE\u5019\u4ECD\u5728",
      kind: "test",
      test: `node -e "const o=require('child_process').execSync('node greet.js \u660E --verbose').toString();process.exit(o.includes('\u4F60\u597D\uFF0C\u660E')?0:1)"`
    }
  ]
};
var UTIL_JS = `// \u5DE5\u5177\u51FD\u6570
function slugify(text) {
  return String(text).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function truncate(text, n) {
  return String(text).slice(0, n)
}
module.exports = { slugify, truncate }
`;
var UTIL_README = `# util

\u5DE5\u5177\u51FD\u6570\u5E93\u3002

## \u51FD\u6570

### slugify(text)
\u8F6C URL \u53CB\u597D\u683C\u5F0F\u3002

### capitalize(text)
\u9996\u5B57\u6BCD\u5927\u5199\u3002

### truncate(text, n)
\u622A\u65AD\u5230 n \u5B57\u7B26\u3002

### chunk(arr, n)
\u6309 n \u5206\u7EC4\u3002
`;
var DOCS_UPDATE = {
  id: "docs-update",
  tier: "light",
  brief: "lib/util.js \u7684 README \u548C\u4EE3\u7801\u5BF9\u4E0D\u4E0A\u4E86\uFF0C\u5E2E\u5FD9\u6838\u5BF9\u66F4\u65B0\u4E00\u4E0B\u6587\u6863\uFF0C\u522B\u628A\u8FD8\u5B58\u5728\u7684\u51FD\u6570\u5199\u4E22\u3002",
  seed: { "lib/util.js": UTIL_JS, "lib/README.md": UTIL_README },
  hiddenChecks: [
    {
      id: "no-phantom-functions",
      desc: "README \u4E0D\u518D\u58F0\u660E\u4E0D\u5B58\u5728\u7684\u51FD\u6570",
      kind: "test",
      test: `node -e "const fs=require('fs');const md=fs.readFileSync('lib/README.md','utf8');const m=require('./lib/util.js');const docFns=[...md.matchAll(/### (\\\\w+)/g)].map(x=>x[1]);const missing=docFns.filter(f=>!(f in m));process.exit(missing.length===0?0:1)"`
    },
    {
      id: "real-functions-documented",
      desc: "\u73B0\u6709\u51FD\u6570\u90FD\u5728 README \u4E2D\u6709\u63CF\u8FF0",
      kind: "test",
      test: `node -e "const fs=require('fs');const md=fs.readFileSync('lib/README.md','utf8');const m=require('./lib/util.js');const all=Object.keys(m).every(f=>md.includes('### '+f));process.exit(all?0:1)"`
    }
  ]
};

// benchmarks/src/tasks/index.ts
var TASKS = [
  CLI_SUBCOMMAND,
  API_PAGINATION,
  CONFIG_MIGRATE,
  CACHE_LAYER,
  MULTI_FORMAT_EXPORT,
  ERROR_TAXONOMY,
  RETRY_IDEMPOTENT,
  LOG_REDACT,
  VALIDATE_BOUNDARY,
  REFACTOR_EXTRACT,
  FIX_OFFBYONE,
  ADD_VERBOSE_FLAG,
  DOCS_UPDATE
];
function findTask(id) {
  const task = TASKS.find((t) => t.id === id);
  if (!task) throw new Error(`\u672A\u77E5\u4EFB\u52A1\u5361\uFF1A${id}`);
  return task;
}

// benchmarks/src/refs.ts
var STORE_SEED = STORE_JS;
var STATS_SEED = STATS_JS;
var UTIL_SEED = UTIL_JS;
var GOOD_TODO = `#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const DATA = path.join(__dirname, 'todos.json')
const load = () => (fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : [])
const save = (todos) => fs.writeFileSync(DATA, JSON.stringify(todos, null, 2))
const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'add') {
  const text = rest.join(' ')
  if (!text) { console.error('\u7528\u6CD5\uFF1Atodo.js add "\u6587\u672C"'); process.exit(1) }
  const todos = load()
  const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1
  todos.push({ id, text, done: false })
  save(todos)
  console.log('\u5DF2\u6DFB\u52A0 #' + id + ': ' + text)
} else if (cmd === 'done') {
  const id = Number(rest[0])
  if (!rest[0] || !Number.isInteger(id)) { console.error('\u7528\u6CD5\uFF1Atodo.js done <id>'); process.exit(1) }
  const todos = load()
  const t = todos.find((x) => x.id === id)
  if (!t) { console.error('\u4E0D\u5B58\u5728 #' + id); process.exit(1) }
  t.done = true
  save(todos)
  console.log('\u5DF2\u5B8C\u6210 #' + id)
} else if (cmd === 'list') {
  const todos = load()
  if (rest.includes('--json')) { console.log(JSON.stringify(todos)); return }
  for (const t of todos) console.log('#' + t.id + (t.done ? ' [done] ' : ' ') + t.text)
} else {
  console.error('\u7528\u6CD5\uFF1Atodo.js add|list|done')
  process.exit(1)
}
`;
var BAD_TODO = `#!/usr/bin/env node
// lazy \u7248\uFF1Adone \u76F4\u63A5\u79FB\u9664\u6761\u76EE\u3001\u4E0D\u6821\u9A8C id\u3001\u65E0 --json
const fs = require('fs')
const path = require('path')
const DATA = path.join(__dirname, 'todos.json')
const load = () => (fs.existsSync(DATA) ? JSON.parse(fs.readFileSync(DATA, 'utf8')) : [])
const save = (todos) => fs.writeFileSync(DATA, JSON.stringify(todos, null, 2))
const [cmd, ...rest] = process.argv.slice(2)
if (cmd === 'add') {
  const text = rest.join(' ')
  if (!text) { console.error('\u7528\u6CD5\uFF1Atodo.js add "\u6587\u672C"'); process.exit(1) }
  const todos = load()
  const id = todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1
  todos.push({ id, text })
  save(todos)
  console.log('\u5DF2\u6DFB\u52A0 #' + id + ': ' + text)
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
  console.error('\u7528\u6CD5\uFF1Atodo.js add|list')
  process.exit(1)
}
`;
var GOOD_SERVER = `const http = require('http')
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
`;
var BAD_SERVER = `const http = require('http')
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
`;
var REFS = {
  "cli-subcommand": {
    good: { "todo.js": GOOD_TODO },
    bad: { "todo.js": BAD_TODO },
    expectedMiss: [
      "done-keeps-entry",
      "done-marks-status",
      "done-unknown-id-fails",
      "done-no-arg-usage",
      "json-valid",
      "json-array"
    ]
  },
  "api-pagination": {
    good: { "server.js": GOOD_SERVER },
    bad: { "server.js": BAD_SERVER },
    // bad 为 page 直接当 offset 的懒错切片 + 无 q/无 total：default 与越界空数组对 slice 语义天然成立（good 单侧验证）
    expectedMiss: ["page2-slices", "q-case-insensitive", "total-field", "q-then-page"]
  },
  "fix-offbyone": {
    good: {
      "lib/pager.js": `function paginate(items, page, size) {
  const start = (page - 1) * size
  return items.slice(start, start + size)
}
module.exports = { paginate }
`
    },
    bad: {
      "lib/pager.js": `function paginate(items, page, size) {
  const start = (page - 1) * size
  return items.slice(start, start + size - 1)
}
module.exports = { paginate }
`
    },
    expectedMiss: ["page1-full", "page2-full"]
  },
  "config-migrate": {
    good: {
      "config.js": `const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
function loadConfig() {
  const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  if (raw.features) return raw
  return { name: raw.name, version: 1, features: { debug: raw.debug } }
}
module.exports = { loadConfig }
`,
      "migrate.js": `const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
if (!fs.existsSync(FILE)) { console.error('\u7F3A config.json'); process.exit(1) }
const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
if (raw.features) { console.log('\u5DF2\u662F v2'); process.exit(0) }
fs.writeFileSync(FILE, JSON.stringify({ name: raw.name, version: 2, features: { debug: raw.debug } }, null, 2))
console.log('\u5DF2\u8FC1\u79FB\u5230 v2')
`
    },
    bad: {
      "config.js": `const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
function loadConfig() {
  return JSON.parse(fs.readFileSync(FILE, 'utf8'))
}
module.exports = { loadConfig }
`,
      "migrate.js": `const fs = require('fs')
const path = require('path')
const FILE = path.join(__dirname, 'config.json')
const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'))
fs.writeFileSync(FILE, JSON.stringify({ version: 2, config: raw }, null, 2))
console.log('done')
`
    },
    expectedMiss: ["migrate-converts", "migrate-idempotent"]
  },
  "cache-layer": {
    good: {
      "calc.js": `const cache = new Map()
function compute(n) {
  if (cache.has(n)) return cache.get(n)
  const r = n < 2 ? n : compute(n - 1) + compute(n - 2)
  cache.set(n, r)
  return r
}
function clear() { cache.clear() }
module.exports = { compute, clear }
`
    },
    bad: {
      "calc.js": `let memo = null
function compute(n) {
  if (memo !== null) return memo
  const r = n < 2 ? n : compute(n - 1) + compute(n - 2)
  memo = r
  return r
}
module.exports = { compute }
`
    },
    expectedMiss: ["different-args-not-mixed", "correctness-preserved", "clear-entry", "cache-keyed-by-arg"]
  },
  "multi-format-export": {
    good: {
      "store.js": STORE_SEED,
      "export.js": `const { list } = require('./store.js')
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
  console.error('\u672A\u77E5\u683C\u5F0F\uFF1A' + fmt + '\uFF08\u652F\u6301 json|csv|md\uFF09')
  process.exit(1)
}
`
    },
    bad: {
      "store.js": STORE_SEED,
      "export.js": `const { list } = require('./store.js')
const items = list()
console.log(JSON.stringify(items))
`
    },
    expectedMiss: ["md-table", "unknown-format-fails"]
  },
  "error-taxonomy": {
    good: {
      "api.js": `class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code }
}
function fetchUser(id) {
  if (id <= 0) throw new ApiError('INVALID_INPUT', 'id \u975E\u6CD5')
  if (id > 100) throw new ApiError('NOT_FOUND', '\u7528\u6237\u4E0D\u5B58\u5728: ' + id)
  return { id, name: 'user' + id }
}
function fetchOrder(id) {
  if (id <= 0) throw new ApiError('INVALID_INPUT', 'id \u975E\u6CD5')
  if (id > 500) throw new ApiError('NOT_FOUND', '\u8BA2\u5355\u4E0D\u5B58\u5728: ' + id)
  return { id, items: [] }
}
module.exports = { fetchUser, fetchOrder }
`
    },
    bad: {
      "api.js": `function fetchUser(id) {
  if (id <= 0) throw new Error('id \u975E\u6CD5')
  if (id > 100) throw new Error('\u7528\u6237\u4E0D\u5B58\u5728: ' + id)
  return { id, name: 'user' + id }
}
function fetchOrder(id) {
  if (id <= 0) throw new Error('id \u975E\u6CD5')
  if (id > 500) throw new Error('\u8BA2\u5355\u4E0D\u5B58\u5728: ' + id)
  return { id, items: [] }
}
module.exports = { fetchUser, fetchOrder }
`
    },
    expectedMiss: ["not-found-code", "invalid-input-code", "order-api-too"]
  },
  "retry-idempotent": {
    good: {
      "retry.js": `function retryFetch(fn, ...args) {
  let lastErr
  for (let i = 0; i <= 3; i++) {
    try { return fn(...args) } catch (e) { lastErr = e }
  }
  throw lastErr
}
module.exports = { retryFetch }
`
    },
    bad: {
      "retry.js": `function retryFetch(fn) {
  return fn()
}
module.exports = { retryFetch }
`
    },
    expectedMiss: ["retry-until-success", "retry-cap-3", "throws-last-error"]
  },
  "log-redact": {
    good: {
      "logger.js": `const SENSITIVE = ['password', 'token', 'authorization']
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
`
    },
    bad: {
      "logger.js": `function log(obj) {
  const o = { ...obj }
  if (o.password) o.password = '***'
  console.log(JSON.stringify(o))
}
module.exports = { log }
`
    },
    expectedMiss: ["nested-redact", "array-redact", "case-insensitive"]
  },
  "validate-boundary": {
    good: {
      "form.js": `function submit(data) {
  const errors = []
  if (!data || typeof data.name !== 'string' || !data.name) errors.push({ field: 'name', msg: 'name \u5FC5\u586B\u4E14\u4E3A\u5B57\u7B26\u4E32' })
  if (data.age !== undefined && (!Number.isInteger(data.age) || data.age <= 0)) errors.push({ field: 'age', msg: 'age \u987B\u4E3A\u6B63\u6574\u6570' })
  if (data.email !== undefined && (!typeof data.email === 'string' || !data.email.includes('@'))) errors.push({ field: 'email', msg: 'email \u987B\u542B @' })
  if (errors.length) return { ok: false, errors }
  return { ok: true }
}
module.exports = { submit }
`
    },
    bad: {
      "form.js": `function submit(data) {
  if (!data || !data.name) return { ok: false, errors: [{ field: 'name', msg: '\u7F3A\u5C11 name' }] }
  return { ok: true }
}
module.exports = { submit }
`
    },
    expectedMiss: ["age-integer-check", "email-at-check", "all-errors-at-once"]
  },
  "refactor-extract": {
    good: {
      "stats.js": `const { validate } = require('./validate')
const { price } = require('./pricing')
const { formatTotal } = require('./format')
function processOrder(order) {
  validate(order)
  const { subtotal, discount, total } = price(order.items)
  return { id: order.id, subtotal, discount, total, totalStr: formatTotal(total) }
}
module.exports = { processOrder }
`,
      "validate.js": `function validate(order) {
  if (!order.id || !Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('\u8BA2\u5355\u6570\u636E\u4E0D\u5B8C\u6574')
  }
  for (const it of order.items) {
    if (it.qty <= 0) throw new Error('\u6570\u91CF\u5FC5\u987B\u4E3A\u6B63: ' + it.sku)
  }
}
module.exports = { validate }
`,
      "pricing.js": `function price(items) {
  let subtotal = 0
  for (const it of items) subtotal += it.qty * it.price
  let discount = 0
  if (subtotal >= 1000) discount = subtotal * 0.1
  else if (subtotal >= 500) discount = subtotal * 0.05
  return { subtotal, discount, total: subtotal - discount }
}
module.exports = { price }
`,
      "format.js": `function formatTotal(total) {
  return '\xA5' + total.toFixed(2)
}
module.exports = { formatTotal }
`
    },
    bad: {
      "stats.js": STATS_SEED
    },
    expectedMiss: ["main-file-shrunk", "extracted-modules-exist"]
  },
  "add-verbose-flag": {
    good: {
      "greet.js": `#!/usr/bin/env node
const args = process.argv.slice(2)
const name = args.find((a) => !a.startsWith('--')) || '\u4E16\u754C'
if (args.includes('--verbose')) console.log('greet v1.0')
console.log('\u4F60\u597D\uFF0C' + name + '\uFF01')
`
    },
    bad: {
      "greet.js": `#!/usr/bin/env node
const name = process.argv[2] || '\u4E16\u754C'
console.log('\u4F60\u597D\uFF0C' + name + '\uFF01')
`
    },
    expectedMiss: ["verbose-shows-version"]
  },
  "docs-update": {
    good: {
      "lib/util.js": UTIL_SEED,
      "lib/README.md": `# util

\u5DE5\u5177\u51FD\u6570\u5E93\u3002

## \u51FD\u6570

### slugify(text)
\u8F6C URL \u53CB\u597D\u683C\u5F0F\u3002

### truncate(text, n)
\u622A\u65AD\u5230 n \u5B57\u7B26\u3002
`
    },
    bad: {
      "lib/util.js": UTIL_SEED,
      "lib/README.md": `# util

\u5DE5\u5177\u51FD\u6570\u5E93\u3002

## \u51FD\u6570

### slugify(text)
\u8F6C URL \u53CB\u597D\u683C\u5F0F\u3002

### capitalize(text)
\u9996\u5B57\u6BCD\u5927\u5199\u3002

### truncate(text, n)
\u622A\u65AD\u5230 n \u5B57\u7B26\u3002

### chunk(arr, n)
\u6309 n \u5206\u7EC4\u3002
`
    },
    expectedMiss: ["no-phantom-functions"]
  }
};

// benchmarks/src/score.ts
import { execFileSync } from "node:child_process";
import { existsSync as existsSync2, readdirSync, readFileSync, statSync } from "node:fs";
import { join as join2 } from "node:path";
var SKIP_DIRS = /* @__PURE__ */ new Set([".git", "node_modules", ".flow-neo"]);
function walk(dir, rel = "", out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(join2(dir, entry.name), relPath, out);
    else out.push(relPath);
  }
  return out;
}
function globMatch(glob, path) {
  if (glob === "**/*") return true;
  const m = glob.match(/^\*\*\/\*(\.\S+)$/);
  if (m) return path.endsWith(m[1]);
  return glob === path;
}
function runChecks(task, workdir) {
  return task.hiddenChecks.map((check) => {
    try {
      if (check.kind === "grep" && check.grep) {
        const { pattern, glob } = check.grep;
        const re = new RegExp(pattern);
        const hit = walk(workdir).some((rel) => {
          if (!globMatch(glob, rel)) return false;
          return re.test(readFileSync(join2(workdir, rel), "utf8"));
        });
        return { id: check.id, pass: hit };
      }
      if (check.kind === "test" && check.test) {
        execFileSync(check.test, { cwd: workdir, shell: "/bin/bash", stdio: "pipe", timeout: 3e4 });
        return { id: check.id, pass: true };
      }
      return { id: check.id, pass: false };
    } catch {
      return { id: check.id, pass: false };
    }
  });
}
function countArtifacts(workdir) {
  const roots = [join2(workdir, ".flow-neo", "tasks"), join2(workdir, ".flow-neo", "history")];
  let max = 0;
  for (const root of roots) {
    if (!existsSync2(root)) continue;
    for (const slug of readdirSync(root)) {
      const dir = join2(root, slug);
      if (!statSync(dir).isDirectory()) continue;
      const files = readdirSync(dir);
      const count = ["01-need-explore.md", "02-design-plan.md", "03-task-record.md", "04-code-review.md", "05-archive-summary.md", "status.md"].filter(
        (f) => files.includes(f)
      ).length;
      max = Math.max(max, count);
    }
  }
  return max;
}
var TEST_PATH_RE = /(^|\/)(tests?|__tests?__)(\/|$)|[._-](test|spec)\.|\.test\.|\.spec\./;
function locStats(workdir, seedSha) {
  const git = (args) => execFileSync("git", ["-C", workdir, ...args], { encoding: "utf8" });
  git(["add", "-A"]);
  let srcLoc = 0;
  let testLoc = 0;
  const diff = git(["diff", "--cached", "--numstat", seedSha]);
  for (const line of diff.trim().split("\n")) {
    if (!line) continue;
    const [add, del, ...pathParts] = line.split("	");
    if (add === "-") continue;
    const path = pathParts.join("	");
    if (path.startsWith(".flow-neo/")) continue;
    const delta = Number(add) + Number(del);
    if (TEST_PATH_RE.test(path)) testLoc += delta;
    else srcLoc += delta;
  }
  return { srcLoc, testLoc };
}

// benchmarks/src/isolate.ts
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync as execFileSync2 } from "node:child_process";
import { join as join3 } from "node:path";
var ISOLATED_ENV = {
  CLAUDE_CODE_DISABLE_CLAUDE_MDS: "1",
  CLAUDE_CODE_DISABLE_AUTO_MEMORY: "1"
};
function prepareWorkspace(task, workdir) {
  for (const [rel, content] of Object.entries(task.seed)) {
    const file = join3(workdir, rel);
    mkdirSync(join3(file, ".."), { recursive: true });
    writeFileSync(file, content);
  }
  if (!task.seed["package.json"]) {
    writeFileSync(join3(workdir, "package.json"), JSON.stringify({ name: "bench-seed", private: true }, null, 2) + "\n");
  }
  const git = (args) => execFileSync2("git", ["-C", workdir, ...args], { encoding: "utf8" });
  git(["init", "-q"]);
  git(["add", "-A"]);
  git(["-c", "user.email=bench@flowneo.local", "-c", "user.name=bench", "commit", "-q", "-m", "seed"]);
  return git(["rev-parse", "HEAD"]).trim();
}
function buildClaudeArgs(arm, model) {
  const args = [
    "--output-format",
    "stream-json",
    "--verbose",
    "--setting-sources",
    "project,local",
    "--strict-mcp-config",
    "--permission-mode",
    "bypassPermissions"
  ];
  if (model) args.push("--model", model);
  if (arm.pluginDir) args.push("--plugin-dir", arm.pluginDir);
  if (arm.appendSystem) args.push("--append-system-prompt", arm.appendSystem);
  return args;
}
function buildEnv() {
  return { ...process.env, ...ISOLATED_ENV };
}

// benchmarks/src/runner.ts
import { spawn } from "node:child_process";
import { mkdirSync as mkdirSync2, writeFileSync as writeFileSync2, readFileSync as readFileSync2, mkdtempSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as join4 } from "node:path";

// benchmarks/src/metrics.ts
var EDIT_TOOLS = /* @__PURE__ */ new Set(["Edit", "Write", "MultiEdit"]);
function parseStream(text) {
  const stats = {
    sessionId: null,
    turns: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    durationMs: 0,
    editCounts: /* @__PURE__ */ new Map(),
    lastAssistantText: "",
    flowneoSeen: /flow-?neo/i.test(text),
    askUserCalled: false,
    model: null
  };
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let ev;
    try {
      ev = JSON.parse(line);
    } catch {
      continue;
    }
    if (ev.type === "system" && ev.subtype === "init" && ev.session_id) {
      stats.sessionId = ev.session_id;
      if (ev.model) stats.model = ev.model;
    } else if (ev.type === "assistant" && ev.message) {
      for (const block of ev.message.content ?? []) {
        if (block.type === "text" && block.text) stats.lastAssistantText = block.text;
        if (block.type === "tool_use" && EDIT_TOOLS.has(block.name)) {
          const file = block.input?.file_path ?? "(unknown)";
          stats.editCounts.set(file, (stats.editCounts.get(file) ?? 0) + 1);
        }
        if (block.type === "tool_use" && block.name === "AskUserQuestion") stats.askUserCalled = true;
      }
    } else if (ev.type === "result") {
      stats.turns = ev.num_turns ?? stats.turns;
      stats.tokensIn = ev.usage?.input_tokens ?? stats.tokensIn;
      stats.tokensOut = ev.usage?.output_tokens ?? stats.tokensOut;
      stats.costUsd = ev.total_cost_usd ?? stats.costUsd;
      stats.durationMs = ev.duration_ms ?? stats.durationMs;
    }
  }
  return stats;
}
function aggregate(parts) {
  const total = {
    sessionId: null,
    turns: 0,
    tokensIn: 0,
    tokensOut: 0,
    costUsd: 0,
    durationMs: 0,
    editCounts: /* @__PURE__ */ new Map(),
    lastAssistantText: "",
    flowneoSeen: false,
    askUserCalled: false,
    model: null
  };
  for (const p of parts) {
    total.sessionId = p.sessionId ?? total.sessionId;
    total.turns += p.turns;
    total.tokensIn += p.tokensIn;
    total.tokensOut += p.tokensOut;
    total.costUsd += p.costUsd;
    total.durationMs += p.durationMs;
    total.lastAssistantText = p.lastAssistantText || total.lastAssistantText;
    total.flowneoSeen = total.flowneoSeen || p.flowneoSeen;
    total.askUserCalled = total.askUserCalled || p.askUserCalled;
    total.model = p.model ?? total.model;
    for (const [file, n] of p.editCounts) {
      total.editCounts.set(file, (total.editCounts.get(file) ?? 0) + n);
    }
  }
  return total;
}
function reeditMax(stats) {
  return Math.max(0, ...stats.editCounts.values());
}
var WAIT_PATTERNS = [
  "\u8BF7\u786E\u8BA4\u65B9\u6848",
  "\u5F85\u786E\u8BA4\u6E05\u5355",
  "\u662F\u5426\u5F52\u6863\u8FC1\u79FB",
  /回复.{0,8}全部确认/.source,
  /确认后.{0,12}(进入|推进|编码|写入)/.source,
  /请(逐条)?确认/.source
];
function isWaitingConfirm(lastText, askUserCalled = false) {
  if (lastText.includes("\u662F\u5426\u5F52\u6863\u8FC1\u79FB")) return "archive";
  if (askUserCalled) return "confirm";
  if (WAIT_PATTERNS.some((p) => new RegExp(p).test(lastText))) return "confirm";
  return null;
}

// benchmarks/src/runner.ts
function runSegment(args, env, timeoutMs, cwd) {
  return new Promise((resolve) => {
    const child = spawn("claude", args, { env, cwd, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, timeoutMs);
    child.stdout.on("data", (c) => out += c);
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ streamText: out, timedOut, exitCode: null, errorMessage: String(err) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ streamText: out, timedOut, exitCode: code });
    });
  });
}
var PROMPT_PREFIX = "\u8BF7\u5728\u672C\u76EE\u5F55\u5B8C\u6210\u4EE5\u4E0B\u5F00\u53D1\u4EFB\u52A1\uFF1A\n\n";
async function runCell(task, arm, runIdx, cellDir, opts) {
  mkdirSync2(cellDir, { recursive: true });
  const workdir = mkdtempSync(join4(tmpdir(), "bench-cell-"));
  const seedSha = prepareWorkspace(task, workdir);
  writeFileSync2(join4(cellDir, "meta.json"), JSON.stringify({ task: task.id, arm: arm.id, run: runIdx, seedSha, model: opts.model }, null, 2));
  const env = buildEnv();
  const baseArgs = buildClaudeArgs(arm, opts.model);
  const parts = [];
  const streams = [];
  let resumeCount = 0;
  let prompt = PROMPT_PREFIX + task.brief;
  let sessionId = null;
  let timedOut = false;
  const deadline = Date.now() + opts.timeoutMs;
  try {
    while (true) {
      const args = sessionId ? ["-p", "--resume", sessionId, ...baseArgs, prompt] : ["-p", ...baseArgs, prompt];
      const remain = deadline - Date.now();
      if (remain <= 0) {
        timedOut = true;
        break;
      }
      const seg = await runSegment(args, env, remain, workdir);
      streams.push(seg.streamText);
      if (seg.errorMessage) {
        const r = finish(task, arm, runIdx, cellDir, workdir, seedSha, parts, 0, "error", `claude \u542F\u52A8\u5931\u8D25\uFF1A${seg.errorMessage}`);
        return r;
      }
      const stats = parseStream(seg.streamText);
      parts.push(stats);
      sessionId = stats.sessionId ?? sessionId;
      if (seg.timedOut) {
        timedOut = true;
        break;
      }
      const wait = isWaitingConfirm(stats.lastAssistantText, stats.askUserCalled);
      if (wait && resumeCount < opts.maxResume) {
        resumeCount += 1;
        prompt = wait === "archive" ? "\u8FC1\u79FB\u81F3 history" : "\u786E\u8BA4";
        continue;
      }
      break;
    }
    return finish(task, arm, runIdx, cellDir, workdir, seedSha, parts, resumeCount, timedOut ? "timeout" : "ok");
  } finally {
    streams.forEach((text, i) => writeFileSync2(join4(cellDir, `stream-${i + 1}.jsonl`), text));
    cpSync(workdir, join4(cellDir, "workspace"), { recursive: true });
    rmSync(workdir, { recursive: true, force: true });
  }
}
function finish(task, arm, runIdx, cellDir, workdir, seedSha, parts, resumeCount, status, error) {
  const stats = aggregate(parts);
  const checks = status === "ok" ? runChecks(task, workdir) : [];
  const model = stats.model ?? void 0;
  const artifacts = status === "ok" ? countArtifacts(workdir) : 0;
  let srcLoc = 0;
  let testLoc = 0;
  if (status !== "error") {
    try {
      ;
      ({ srcLoc, testLoc } = locStats(workdir, seedSha));
    } catch {
    }
  }
  const result = {
    task: task.id,
    arm: arm.id,
    run: runIdx,
    status,
    hiddenHits: checks.filter((c) => c.pass).length,
    hiddenTotal: task.hiddenChecks.length,
    checks,
    artifacts,
    turns: stats.turns,
    reeditMax: reeditMax(stats),
    srcLoc,
    testLoc,
    durationMs: stats.durationMs,
    tokensIn: stats.tokensIn,
    tokensOut: stats.tokensOut,
    costUsd: stats.costUsd,
    resumeCount,
    routerSeen: stats.flowneoSeen,
    ...model ? { model } : {},
    ...error ? { error } : {}
  };
  writeFileSync2(join4(cellDir, "result.json"), JSON.stringify(result, null, 2));
  return result;
}
async function runPool(items, workers, fn) {
  const inflight = /* @__PURE__ */ new Set();
  const wrap = (p) => {
    const tracked = p.finally(() => inflight.delete(tracked));
    inflight.add(tracked);
  };
  for (const item of items) {
    while (inflight.size >= workers) await Promise.race(inflight);
    wrap(fn(item));
  }
  await Promise.allSettled(inflight);
}
function rescoreCell(task, cellDir) {
  const meta = JSON.parse(readFileSync2(join4(cellDir, "meta.json"), "utf8"));
  const parts = [];
  for (let i = 1; ; i++) {
    const file = join4(cellDir, `stream-${i}.jsonl`);
    try {
      parts.push(parseStream(readFileSync2(file, "utf8")));
    } catch {
      break;
    }
  }
  return finish(task, { id: meta.arm }, meta.run, cellDir, join4(cellDir, "workspace"), meta.seedSha, parts, Math.max(0, parts.length - 1), "ok");
}

// benchmarks/src/report.ts
import { mkdirSync as mkdirSync3, writeFileSync as writeFileSync3 } from "node:fs";
import { join as join5 } from "node:path";
function agg(results) {
  const groups = /* @__PURE__ */ new Map();
  for (const r of results) {
    const key = `${r.task}|${r.arm}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  return [...groups.entries()].map(([key, rs]) => {
    const [task, arm] = key.split("|");
    const ok = rs.filter((r) => r.status === "ok");
    const n = ok.length;
    const avg = (f) => n ? ok.reduce((s, r) => s + f(r), 0) / n : 0;
    const hits = ok.reduce((s, r) => s + r.hiddenHits, 0);
    const total = n ? ok[0].hiddenTotal : 0;
    return {
      task,
      arm,
      n,
      hits,
      total,
      hitRate: total ? hits / (total * n) : 0,
      artifactsAvg: avg((r) => r.artifacts),
      turnsAvg: avg((r) => r.turns),
      reeditAvg: avg((r) => r.reeditMax),
      srcLocAvg: avg((r) => r.srcLoc),
      testLocAvg: avg((r) => r.testLoc),
      durationAvgMs: avg((r) => r.durationMs),
      costAvgUsd: avg((r) => r.costUsd),
      tokensOutAvg: avg((r) => r.tokensOut)
    };
  }).sort((a, b) => (a.task + a.arm).localeCompare(b.task + b.arm));
}
function summarize(results) {
  return {
    cells: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    timeout: results.filter((r) => r.status === "timeout").length,
    error: results.filter((r) => r.status === "error").length,
    groups: agg(results)
  };
}
function writeReport(stamp, results, runsDir, outDir) {
  const summary = summarize(results);
  writeFileSync3(join5(runsDir, "summary.json"), JSON.stringify(summary, null, 2));
  const lines = [];
  lines.push(`# FlowNeo \u57FA\u51C6\u62A5\u544A ${stamp}`, "");
  lines.push("## Setup", "");
  lines.push("- \u6A21\u578B/CLI \u7248\u672C\uFF1A<\u4EBA\u5DE5\u8865\u5145\uFF1Aclaude --version / \u5B9E\u9645\u6A21\u578B>");
  lines.push(`- \u683C\u6570\uFF1A${summary.cells}\uFF08ok ${summary.ok} / timeout ${summary.timeout} / error ${summary.error}\uFF09`);
  lines.push("- \u81C2\u5B9A\u4E49\uFF1Abaseline\uFF08\u88F8 CC\uFF09/ flowneo\uFF08--plugin-dir \u672C\u4ED3\u5E93\uFF09/ verbal\uFF08--append-system-prompt \u4E00\u53E5\u8BDD\uFF09");
  lines.push("- \u9694\u79BB\uFF1A--setting-sources project,local + CLAUDE_CODE_DISABLE_CLAUDE_MDS/AUTO_MEMORY + \u6BCF\u81C2 --plugin-dir");
  lines.push("- \u505C\u7B49\u786E\u8BA4\uFF1Aflowneo \u81C2\u68C0\u6D4B\u505C\u7B49\u6807\u8BB0\u81EA\u52A8\u7EED\u8F6E\u6CE8\u5165\u300C\u786E\u8BA4\u300D\uFF08\u4E0A\u9650 3\uFF0Ctoken \u8BA1\u5165\u8BE5\u81C2\uFF09", "");
  lines.push("## \u4EFB\u52A1 \xD7 \u81C2\u6C47\u603B", "");
  lines.push("| task | arm | n | \u6F0F\u9700\u6C42\u547D\u4E2D | \u5DE5\u4EF6 | turns | \u91CD\u7F16 | srcLoc | testLoc | \u65F6\u957Fs | cost$ | tokOut |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const g of summary.groups) {
    lines.push(
      `| ${g.task} | ${g.arm} | ${g.n} | ${g.hits}/${g.total * g.n} (${(g.hitRate * 100).toFixed(0)}%) | ${g.artifactsAvg.toFixed(1)} | ${g.turnsAvg.toFixed(1)} | ${g.reeditAvg.toFixed(1)} | ${g.srcLocAvg.toFixed(0)} | ${g.testLocAvg.toFixed(0)} | ${(g.durationAvgMs / 1e3).toFixed(0)} | ${g.costAvgUsd.toFixed(3)} | ${g.tokensOutAvg.toFixed(0)} |`
    );
  }
  lines.push("", "## \u9010\u683C\u6570\u636E", "");
  lines.push("| task | arm | run | status | hits | turns | \u91CD\u7F16 | srcLoc | testLoc | \u65F6\u957Fs | cost$ | \u7EED\u8F6E |");
  lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of results) {
    lines.push(
      `| ${r.task} | ${r.arm} | ${r.run} | ${r.status} | ${r.hiddenHits}/${r.hiddenTotal} | ${r.turns} | ${r.reeditMax} | ${r.srcLoc} | ${r.testLoc} | ${(r.durationMs / 1e3).toFixed(0)} | ${r.costUsd.toFixed(3)} | ${r.resumeCount} |`
    );
  }
  lines.push("", "## \u5206\u6790\u4E0E\u5C40\u9650", "");
  lines.push("<\u4EBA\u5DE5\u8865\u5145\uFF1A\u7ED3\u8BBA\u3001\u65B9\u5DEE\u89C2\u5BDF\u3001\u65B9\u6CD5\u8BBA\u5C40\u9650\uFF08\u672C\u57FA\u51C6\u8BBE\u8BA1\u4E3A\u53EF\u8BC1\u4F2A\uFF1A\u82E5 FlowNeo \u81C2\u6F0F\u9700\u6C42\u7387\u672A\u964D\u6216\u6210\u672C\u5927\u589E\uFF0C\u5E94\u5982\u5B9E\u5448\u73B0\uFF09>");
  mkdirSync3(outDir, { recursive: true });
  const outFile = join5(outDir, `${stamp}-bench.md`);
  writeFileSync3(outFile, lines.join("\n") + "\n");
  return outFile;
}

// benchmarks/src/bench.ts
var RUNS_DIR = join6(repoRoot, "benchmarks", "runs");
var RESULTS_DIR = join6(repoRoot, "benchmarks", "results");
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
function fail(msg) {
  console.error(msg);
  process.exit(1);
}
function selftest() {
  let bad = 0;
  for (const task of TASKS) {
    const ref = REFS[task.id];
    if (!ref) {
      console.error(`\u7F3A\u53C2\u7167\uFF1A${task.id}`);
      bad++;
      continue;
    }
    for (const [kind, files] of [["good", ref.good], ["bad", ref.bad]]) {
      const dir = mkdtempSync2(join6(tmpdir2(), `flowneo-selftest-`));
      try {
        for (const [rel, content] of Object.entries({ ...task.seed, ...files })) {
          const file = join6(dir, rel);
          mkdirSync4(join6(file, ".."), { recursive: true });
          writeFileSync4(file, content);
        }
        const miss = runChecks(task, dir).filter((r) => !r.pass).map((r) => r.id).sort();
        const expected = kind === "good" ? [] : [...ref.expectedMiss].sort();
        if (JSON.stringify(miss) !== JSON.stringify(expected)) {
          console.error(`${task.id} ${kind}: \u5B9E\u9645 miss ${JSON.stringify(miss)} \u2260 \u671F\u671B ${JSON.stringify(expected)}`);
          bad++;
        }
      } finally {
        rmSync2(dir, { recursive: true, force: true });
      }
    }
  }
  const totalChecks = TASKS.reduce((s, t) => s + t.hiddenChecks.length, 0);
  for (const t of TASKS.filter((t2) => t2.tier === "heavy")) {
    if (t.hiddenChecks.length < 6 || t.hiddenChecks.length > 8) {
      console.error(`${t.id}: heavy \u68C0\u67E5\u70B9 ${t.hiddenChecks.length} \u4E0D\u5728 6~8`);
      bad++;
    }
  }
  const env = buildEnv();
  if (env.CLAUDE_CODE_DISABLE_CLAUDE_MDS !== "1" || env.CLAUDE_CODE_DISABLE_AUTO_MEMORY !== "1") {
    console.error("\u9694\u79BB\u73AF\u5883\u53D8\u91CF\u7F3A\u5931");
    bad++;
  }
  if (buildClaudeArgs(ARMS.baseline).includes("--plugin-dir")) {
    console.error("baseline \u81C2\u4E0D\u5E94\u6709 --plugin-dir");
    bad++;
  }
  if (!buildClaudeArgs(ARMS.flowneo).includes("--plugin-dir")) {
    console.error("flowneo \u81C2\u7F3A --plugin-dir");
    bad++;
  }
  if (!buildClaudeArgs(ARMS.verbal).includes("--append-system-prompt")) {
    console.error("verbal \u81C2\u7F3A --append-system-prompt");
    bad++;
  }
  if (bad > 0) fail(`selftest \u5931\u8D25\uFF1A${bad} \u9879`);
  console.log(`selftest \u901A\u8FC7\uFF1A${TASKS.length} \u4EFB\u52A1 / ${totalChecks} \u68C0\u67E5\u70B9 / \u9694\u79BB\u65AD\u8A00\u5168\u8FC7`);
}
function eachCellDir(stamp, cb) {
  const root = join6(RUNS_DIR, stamp);
  if (!existsSync3(root)) fail(`\u4E0D\u5B58\u5728 ${root}`);
  for (const task of readdirSync2(root, { withFileTypes: true })) {
    if (!task.isDirectory()) continue;
    for (const cell of readdirSync2(join6(root, task.name), { withFileTypes: true })) {
      if (!cell.isDirectory()) continue;
      cb(task.name, join6(root, task.name, cell.name));
    }
  }
}
function loadResults(stamp) {
  const results = [];
  eachCellDir(stamp, (taskId, cellDir) => {
    const file = join6(cellDir, "result.json");
    if (existsSync3(file)) results.push(JSON.parse(readFileSync3(file, "utf8")));
  });
  return results;
}
async function main() {
  const mode = process.argv[2];
  if (mode === "--selftest") return selftest();
  if (mode === "--dry") {
    const task = findTask(arg("task", ""));
    const arm = ARMS[arg("arm", "baseline")] ?? fail(`\u672A\u77E5\u81C2\uFF1A${arg("arm", "baseline")}`);
    const model = arg("model");
    const dir = mkdtempSync2(join6(tmpdir2(), "flowneo-dry-"));
    const seedSha = prepareWorkspace(task, dir);
    console.log("\u5DE5\u4F5C\u533A\uFF1A", dir);
    console.log("seed commit\uFF1A", seedSha);
    if (model) console.log("--model\uFF1A", model);
    console.log("\u5C06\u6267\u884C\uFF1Aclaude", JSON.stringify(["-p", ...buildClaudeArgs(arm, model), "<brief>"]).slice(1, -1));
    console.log("brief\uFF1A", task.brief.slice(0, 80) + "\u2026");
    console.log("\uFF08dry \u4E0D\u8C03 API\uFF1B\u5DE5\u4F5C\u533A\u4FDD\u7559\u4F9B\u68C0\u67E5\uFF09");
    return;
  }
  if (mode === "--report") {
    const stamp = arg("stamp", "");
    const out = writeReport(stamp, loadResults(stamp), join6(RUNS_DIR, stamp), RESULTS_DIR);
    return console.log("\u62A5\u544A\u5DF2\u751F\u6210\uFF1A", out);
  }
  if (mode === "--rescore") {
    const stamp = arg("stamp", "");
    let n = 0;
    eachCellDir(stamp, (taskId, cellDir) => {
      rescoreCell(findTask(taskId), cellDir);
      n++;
    });
    console.log(`rescore \u5B8C\u6210\uFF1A${n} \u683C\uFF08\u672A\u8C03 API\uFF09`);
    return;
  }
  if (mode === "--run") {
    const stamp = arg("stamp", (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    const taskIds = (arg("tasks", TASKS.map((t) => t.id).join(",")) ?? "").split(",").filter(Boolean);
    const armIds = (arg("arms", "baseline,flowneo,verbal") ?? "").split(",").filter(Boolean);
    const runs = Number(arg("runs", "3"));
    const workers = Number(arg("workers", "4"));
    const timeoutMs = Number(arg("timeout-min", "15")) * 6e4;
    const model = arg("model");
    const cells = [];
    for (const taskId of taskIds) for (const armId of armIds) for (let i = 1; i <= runs; i++) cells.push({ taskId, armId, runIdx: i });
    console.log(`\u8FD0\u884C ${cells.length} \u683C\uFF08workers=${workers}\uFF0Ctimeout=${timeoutMs / 6e4}min${model ? `\uFF0Cmodel=${model}` : ""}\uFF09\u2192 benchmarks/runs/${stamp}/`);
    let done = 0;
    await runPool(cells, workers, async ({ taskId, armId, runIdx }) => {
      const cellDir = join6(RUNS_DIR, stamp, taskId, `${armId}-${runIdx}`);
      if (existsSync3(join6(cellDir, "result.json"))) {
        done++;
        return console.log(`[\u8DF3\u8FC7\u5DF2\u5B58\u5728] ${taskId}/${armId}-${runIdx}`);
      }
      const r = await runCell(findTask(taskId), ARMS[armId], runIdx, cellDir, { timeoutMs, maxResume: 3, model });
      done++;
      const rate = r.hiddenTotal ? `${r.hiddenHits}/${r.hiddenTotal}` : "-";
      console.log(`[${done}/${cells.length}] ${taskId}/${armId}-${runIdx} ${r.status} hits=${rate} turns=${r.turns} resume=${r.resumeCount}`);
    });
    const results = loadResults(stamp);
    const out = writeReport(stamp, results, join6(RUNS_DIR, stamp), RESULTS_DIR);
    console.log(`\u5B8C\u6210\uFF1Aok ${results.filter((r) => r.status === "ok").length} / \u5171 ${results.length}\uFF0C\u62A5\u544A\uFF1A${out}`);
    return;
  }
  fail("\u7528\u6CD5\uFF1Abench --selftest | --dry --task <id> --arm <id> | --run [--tasks][--arms][--runs][--workers][--timeout-min][--stamp] | --rescore --stamp <s> | --report --stamp <s>");
}
void main();
