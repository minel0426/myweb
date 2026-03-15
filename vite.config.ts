import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'node:fs'

export default defineConfig({
  plugins: [
    vue(),
    // 👇 新增：本地文件写入插件，用于开发环境下自动将数据写入 guides.ts 👇
    {
      name: 'local-file-writer',
      configureServer(server) {
        // 拦截前端发往 /__save_guide 的内部请求
        server.middlewares.use('/__save_guide', (req, res) => {
          if (req.method === 'POST') {
            let body = ''
            req.on('data', chunk => { body += chunk })
            req.on('end', () => {
              try {
                const newGuide = JSON.parse(body)
                
                // 定位到你项目里的 guides.ts 绝对路径
                const filePath = fileURLToPath(new URL('./src/api/guides.ts', import.meta.url))
                let content = fs.readFileSync(filePath, 'utf-8')

                // 将新的指南格式化为标准的 TS 对象字符串 (处理了 ` 符号的转义)
                const newGuideStr = `\n  {
    id: ${newGuide.id},
    title: ${JSON.stringify(newGuide.title)},
    desc: ${JSON.stringify(newGuide.desc)},
    os: ${JSON.stringify(newGuide.os)},
    content: \`${newGuide.content.replace(/`/g, '\\`')}\`
  },`
                // 找到数组开头，将新数据插入到 troubleGuidesData 数组的最前面
                content = content.replace(
                  /(export const troubleGuidesData.*?(?:=\s*\[))/,
                  `$1${newGuideStr}`
                )

                // 物理写入文件！
                fs.writeFileSync(filePath, content, 'utf-8')

                res.statusCode = 200
                res.end('Success')
              } catch (e: any) {
                res.statusCode = 500
                res.end(e.message)
              }
            })
          }
        })
      }
    }
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        // 把 /api 开头的请求都转发给远程服务器
        target: 'https://api.wen7.space', 
        changeOrigin: true,
        // 关键魔法：把后端返回的 "Secure" Cookie 改成不加密的，这样 localhost 才能存
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const sc = proxyRes.headers['set-cookie'];
            if (Array.isArray(sc)) {
              proxyRes.headers['set-cookie'] = sc.map(c => {
                return c.replace(/; secure/gi, '').replace(/; SameSite=None/gi, '');
              });
            }
          });
        }
      }
    }
  }
})