import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 开发时 Vite 跑在 5173，把 /api 反向代理到 Express 后端 (3000)。
// 生产构建输出到 ../web/dist，覆盖此前废弃的 React 构建，由 Express 静态托管。
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: '../web/dist',
    // 关闭自动清空输出目录：避免 Vite 在构建前批量删除 web/dist/assets 触发安全删除保护。
    // 构建产物为内容哈希命名，旧 chunk 不被 index.html 引用即无效，可忽略或定期清理。
    emptyOutDir: false
  }
})
