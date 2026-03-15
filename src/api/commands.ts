import type { KnowledgeItem } from './types'

export const commandGuidesData: KnowledgeItem[] = [
  {
  "id": 1773161249007,
  "title": "测试",
  "desc": "测试",
  "os": [
    "windows"
  ],
  "category": "指令",
  "content": "测试111"
},
  {
    id: 1773159049928,
    title: "Git 强制覆盖本地代码",
    desc: "丢弃所有本地修改",
    os: ["windows", "mac", "linux"],
    category: "指令",
    content: `> 警告：此操作会丢弃所有本地修改

# Windows用户
\`\`\`bash
git fetch --all
git reset --hard origin/main
\`\`\`

# Mac 用户
\`\`\`bash
git fetch --all
git reset --hard origin/main
\`\`\`
`
  }
]