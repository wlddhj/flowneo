import { describe, expect, it } from 'vitest'
import { ARTIFACT_SCHEMAS, validateArtifact } from '../src/lib/schema.ts'

const FULL_01 = [
  '# 需求探索纪要',
  '## 用户原始需求',
  '做一个小工具。',
  '## 核心开发目标',
  '实现核心功能。',
  '## 需求边界与不做事项',
  '不做 UI。',
  '## 运行环境与兼容要求',
  'Node 18+。',
  '## 验收标准',
  '- 可运行',
  '## 待确认问题与结论',
  '- Q: xxx A: yyy',
].join('\n')

const FULL_02 = [
  '# 设计方案',
  '## 一、需求规格',
  '规格。',
  '## 二、功能设计',
  '功能。',
  '## 三、架构/数据设计',
  '架构。',
  '## 四、任务拆解',
  '任务。',
].join('\n')

const LITE_02 = [
  '# 方案设计',
  '档位：精简',
  '## 一、需求规格',
  '规格。',
  '## 二、功能设计',
  '功能。',
  '## 三、技术要点',
  '- 关键技术决策：xxx',
  '## 四、任务拆解',
  '任务。',
].join('\n')

describe('ARTIFACT_SCHEMAS', () => {
  it('覆盖 01~05 五个工件', () => {
    expect(Object.keys(ARTIFACT_SCHEMAS)).toEqual([
      '01-need-explore.md',
      '02-design-plan.md',
      '03-task-record.md',
      '04-code-review.md',
      '05-archive-summary.md',
    ])
  })
})

describe('validateArtifact', () => {
  it('01 工件章节齐全 → 无警告', () => {
    expect(validateArtifact('01-need-explore.md', FULL_01)).toEqual([])
  })

  it('01 工件缺「## 验收标准」→ 报缺失', () => {
    const content = FULL_01.replace('## 验收标准', '## 其他章节')
    const warnings = validateArtifact('01-need-explore.md', content)
    expect(warnings).toEqual(['缺失章节：## 验收标准'])
  })

  it('02 工件四阶齐全 → 无警告', () => {
    expect(validateArtifact('02-design-plan.md', FULL_02)).toEqual([])
  })

  it('02 工件缺「## 三、架构/数据设计」→ 报缺失', () => {
    const content = FULL_02.replace('## 三、架构/数据设计', '## 其他')
    const warnings = validateArtifact('02-design-plan.md', content)
    expect(warnings).toEqual(['缺失章节：## 三、架构/数据设计'])
  })

  it('多个章节缺失 → 全部列出', () => {
    const warnings = validateArtifact('01-need-explore.md', '## 用户原始需求\n内容')
    expect(warnings).toHaveLength(5)
    expect(warnings[0]).toBe('缺失章节：## 核心开发目标')
  })

  it('非 FlowNeo 工件文件名 → 不校验', () => {
    expect(validateArtifact('README.md', '# 任意内容')).toEqual([])
  })

  it('status.md → 不校验（不在 schema 清单）', () => {
    expect(validateArtifact('status.md', '# 状态')).toEqual([])
  })

  it('02 精简档标注 + 技术要点齐全 → 无警告', () => {
    expect(validateArtifact('02-design-plan.md', LITE_02)).toEqual([])
  })

  it('02 精简档缺「## 三、技术要点」（误用全量第三阶）→ 报缺失', () => {
    const warnings = validateArtifact('02-design-plan.md', FULL_02 + '\n档位：精简')
    expect(warnings).toEqual(['缺失章节：## 三、技术要点'])
  })

  it('02 半角冒号「档位:精简」→ 识别为精简档', () => {
    const content = LITE_02.replace('档位：精简', '档位:精简')
    expect(validateArtifact('02-design-plan.md', content)).toEqual([])
  })

  it('02 全角冒号后带空格「档位： 精简」→ 识别为精简档', () => {
    const content = LITE_02.replace('档位：精简', '档位： 精简')
    expect(validateArtifact('02-design-plan.md', content)).toEqual([])
  })

  it('02 标注「档位：全量」→ 用全量清单', () => {
    expect(validateArtifact('02-design-plan.md', FULL_02 + '\n档位：全量')).toEqual([])
  })

  it('02 正文内联引用「档位：精简」字样（非标注行）→ 不切档，仍按全量校验', () => {
    const content = FULL_02 + '\n需求规格说明：01 判定档位：精简，用户指定全量。'
    expect(validateArtifact('02-design-plan.md', content)).toEqual([])
  })
})
