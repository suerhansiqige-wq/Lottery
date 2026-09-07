import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// 自定义插件：提供保存开奖数据的API
function saveDrawsPlugin() {
  return {
    name: 'save-draws',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === 'POST' && req.url === '/api/save-draws') {
          let body = ''
          req.on('data', chunk => { body += chunk })
          req.on('end', () => {
            try {
              const { draws } = JSON.parse(body)
              if (!draws || draws.length === 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true, message: '无新数据' }))
                return
              }
              // 读取当前lotteryData.js
              const filePath = path.join(process.cwd(), 'src', 'data', 'lotteryData.js')
              let content = fs.readFileSync(filePath, 'utf-8')
              // 找到数组结束位置：export const lotteryData = [...]; 的 "];"
              const arrayMatch = content.match(/(export const lotteryData = \[[\s\S]*?\n)(\];)/)
              if (!arrayMatch) {
                res.writeHead(500, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: false, message: '文件格式错误' }))
                return
              }
              const arrayContent = arrayMatch[1]
              const arrayEnd = arrayMatch[2]
              const arrayEndPos = arrayMatch.index + arrayContent.length
              // 提取已有期号，去重
              const existingIssues = new Set()
              arrayContent.split('\n').forEach(line => {
                const m = line.match(/issue:\s*'(\d+)'/)
                if (m) existingIssues.add(m[1])
              })
              // 过滤新数据（去重 + 过滤未开奖无效行 + 按期号升序排序，防止倒序数据源污染文件）
              const newDraws = draws
                .filter(d => !existingIssues.has(d.issue))
                .filter(d => !isNaN(Number(d.issue)) && !isNaN(Number(d.d1)) && !isNaN(Number(d.d2)) && !isNaN(Number(d.d3)))
                .sort((a, b) => Number(a.issue) - Number(b.issue))
              if (newDraws.length === 0) {
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ success: true, message: '数据已是最新' }))
                return
              }
              // 生成新条目文本
              const newEntries = newDraws.map(d => `  { issue: '${d.issue}', d1: ${d.d1}, d2: ${d.d2}, d3: ${d.d3} },`).join('\n')
              // 在数组结束前插入新数据
              const before = content.substring(0, arrayEndPos)
              const after = content.substring(arrayEndPos)
              const updated = before.trimEnd() + '\n' + newEntries + '\n' + after
              fs.writeFileSync(filePath, updated, 'utf-8')
              res.writeHead(200, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: true, saved: newDraws.length, issues: newDraws.map(d => d.issue) }))
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ success: false, message: err.message }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), saveDrawsPlugin()],
  base: './',
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/api/lottery': {
        target: 'https://data.17500.cn',
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, 'http://localhost');
          const count = url.searchParams.get('issueCount') || '10';
          const name = url.searchParams.get('name') || 'pl3';
          // 乐彩网数据文件：pl32_desc.txt(排列三倒序), 3d_desc.txt(福彩3D倒序)
          if (name === '3d') return `/3d_desc.txt`;
          return `/pl32_desc.txt`;
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/plain, */*',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})
