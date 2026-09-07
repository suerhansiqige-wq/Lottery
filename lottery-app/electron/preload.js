import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('lotteryAPI', {
  fetchLatest: (issueCount = 10) => ipcRenderer.invoke('fetch-lottery-data', issueCount)
})
