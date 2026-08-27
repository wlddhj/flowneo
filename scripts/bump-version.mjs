#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const config = JSON.parse(readFileSync(resolve(root, '.version-bump.json'), 'utf8'))

function readVersion(file) {
  const content = JSON.parse(readFileSync(resolve(root, file), 'utf8'))
  return file === '.claude-plugin/marketplace.json' ? content.plugins[0].version : content.version
}

function writeVersion(file, version) {
  const path = resolve(root, file)
  const content = JSON.parse(readFileSync(path, 'utf8'))
  if (file === '.claude-plugin/marketplace.json') {
    content.plugins[0].version = version
  } else {
    content.version = version
  }
  writeFileSync(path, JSON.stringify(content, null, 2) + '\n')
}

const target = process.argv[2]

if (!target) {
  console.error('用法：node scripts/bump-version.mjs <新版本号> | --check')
  process.exit(1)
}

if (target === '--check') {
  const versions = config.files.map((f) => ({ file: f, version: readVersion(f) }))
  const unique = new Set(versions.map((v) => v.version))
  if (unique.size > 1) {
    console.error('版本漂移：')
    for (const v of versions) console.error(`  ${v.file}: ${v.version}`)
    process.exit(1)
  }
  console.log('版本一致：' + versions[0].version)
  process.exit(0)
}

if (!/^\d+\.\d+\.\d+$/.test(target)) {
  console.error(`非法版本号：${target}（应为 x.y.z）`)
  process.exit(1)
}

for (const f of config.files) writeVersion(f, target)
console.log(`已同步版本到 ${config.files.length} 处 → ${target}`)
