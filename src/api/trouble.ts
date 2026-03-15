import type { KnowledgeItem } from './types'

export const troubleGuidesData: KnowledgeItem[] = [
  {
    id: 1773159049927,
    title: "127.0.0.1 拒绝了我们的连接请求",
    desc: "openclaw 网页打不开",
    os: ["windows", "mac"],
    category: "故障",
    content: `> 原因：未启动 openclaw

> 解决办法

# Windows用户
按下 WIN + R
回车
左下角输入cmd
回车
在命令窗口中输入
\`\`\`language
openclaw gateway
\`\`\`
刷新页面即可

# Mac 用户
访达 => 应用程序 => 实用工具 => 终端
打开终端
在终端中输入
\`\`\`language
openclaw gateway
\`\`\`
`
  },
]