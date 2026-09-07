import { app, BrowserWindow, ipcMain, net } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: '福彩3D分析系统',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  // 开发模式加载本地服务器，生产模式加载打包文件
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // IPC: 从福彩官网获取最新开奖数据
  ipcMain.handle('fetch-lottery-data', async (_, issueCount = 10) => {
    try {
      const url = `https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=3d&issueCount=${issueCount}`
      const response = await net.fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json'
        }
      })
      const data = await response.json()
      if (data.state === 0 && data.result) {
        return data.result.map(item => {
          const [d1, d2, d3] = item.red.split(',').map(Number)
          return { issue: item.code, d1, d2, d3 }
        })
      }
      return []
    } catch (err) {
      console.error('获取开奖数据失败:', err)
      return []
    }
  })

  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
