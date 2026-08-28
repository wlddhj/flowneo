/** 工件必需章节清单（01~05）；纯 TS 校验，工件为 markdown 非结构化数据，不引入 zod */
export const ARTIFACT_SCHEMAS: Record<string, string[]> = {
  '01-need-explore.md': [
    '## 用户原始需求',
    '## 核心开发目标',
    '## 需求边界与不做事项',
    '## 运行环境与兼容要求',
    '## 验收标准',
    '## 待确认问题与结论',
  ],
  '02-design-plan.md': [
    '## 一、需求规格',
    '## 二、功能设计',
    '## 三、架构/数据设计',
    '## 四、任务拆解',
  ],
  '03-task-record.md': ['## 自测结果'],
  '04-code-review.md': ['## 审查范围', '## 审查结果', '## 设计一致性比对'],
  '05-archive-summary.md': [
    '## 功能总结',
    '## 变更文件清单',
    '## 核心实现复盘',
    '## 遗留问题与迭代建议',
    '## 工件索引',
  ],
}

/** 校验工件章节完整性，返回缺失章节警告；非清单内文件返回空（不校验） */
export function validateArtifact(fileName: string, content: string): string[] {
  const required = ARTIFACT_SCHEMAS[fileName]
  if (!required) return []
  return required.filter((h) => !content.includes(h)).map((h) => `缺失章节：${h}`)
}
