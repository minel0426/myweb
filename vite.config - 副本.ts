import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      '/api': {
        // 告诉 Vite：把 /api 开头的请求都转发给你的远程服务器
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