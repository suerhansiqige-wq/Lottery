import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { lotteryData as staticLotteryData, enrichData } from './data/lotteryData.js'
import FullDataTable from './components/FullDataTable.jsx'

function App() {
  const [extraData, setExtraData] = useState([])
  const [syncStatus, setSyncStatus] = useState('')
  const [lastAutoCheck, setLastAutoCheck] = useState('') // 自动轮询最近检查时间
  const [trialDigits, setTrialDigits] = useState([null, null, null])

  // 获取静态数据中最大期号
  const lastStaticIssue = staticLotteryData[staticLotteryData.length - 1].issue // 如 '26192'

  // 合并静态数据和新数据（去重 + 过滤未开奖无效行 + 按期号升序排序）
  // ============================================================
  // 【算法锁定】baseData 数据合并、去重、排序
  // 数据源 pl32_desc.txt 为倒序（最新期在前），extraData 可能倒序/乱序/含重复/含未开奖NaN行
  // 规则：staticLotteryData + extraData 合并后
  //   1) 过滤未开奖无效行（期号或 d1/d2/d3 为 NaN 则丢弃）
  //   2) 按期号去重（Map 保留首条，静态数据优先）
  //   3) 按期号升序排序 Number(a.issue) - Number(b.issue)
  // 禁止：直接拼接不排序，否则倒序新数据会导致尾部期号错乱、下期预留行期号重复
  // ============================================================
  const baseData = useMemo(() => {
    const allItems = [...staticLotteryData, ...extraData]
    const issueMap = new Map()
    for (const item of allItems) {
      if (isNaN(Number(item.issue)) || isNaN(item.d1) || isNaN(item.d2) || isNaN(item.d3)) continue
      if (!issueMap.has(item.issue)) issueMap.set(item.issue, item)
    }
    return [...issueMap.values()].sort((a, b) => Number(a.issue) - Number(b.issue))
  }, [extraData])

  // 试验数据行：输入三位数字后追加到数据末尾，重新计算所有衍生列
  const enrichedData = useMemo(() => {
    const [d1, d2, d3] = trialDigits
    if (d1 === null || d2 === null || d3 === null) {
      return enrichData(baseData)
    }
    const lastIssue = baseData[baseData.length - 1].issue
    const nextIssue = String(Number(lastIssue) + 1)
    const trialRow = { issue: nextIssue, d1: Number(d1), d2: Number(d2), d3: Number(d3) }
    return enrichData([...baseData, trialRow])
  }, [baseData, trialDigits])

  // 将API返回的7位期号(2026193)转为5位格式(26193)
  const convertIssue = (code) => {
    // 2026193 -> 26193, 2025001 -> 25001
    if (code.length === 7 && code.startsWith('20')) {
      return code.substring(2)
    }
    return code
  }

  // ============================================================
  // 【托管兼容】静态托管环境判定（GitHub Pages 等纯静态空间）
  // 静态空间既没有 /api/lottery 代理，也没有 /api/save-draws 写文件能力，运行时同步必然失败；
  // 此环境下跳过运行时同步，开奖数据改由仓库定时任务（.github/workflows/sync-draws.yml）
  // 更新 lotteryData.js 后重新发布，数据延续性由仓库保证，算法与显示逻辑零改动
  // 本地 dev（vite 代理可用）与 Electron（window.lotteryAPI 存在）行为完全不变
  // ============================================================
  const IS_STATIC_HOST = import.meta.env.PROD && !window.lotteryAPI;

  // 只拉取静态数据中还没有的新期数
  // silent=true 时为自动轮询静默模式：无新数据/失败不刷新状态提示
  // 返回值：true=发现并同步了新数据，false=无新数据或失败
  const fetchLatest = useCallback(async (silent = false) => {
    if (IS_STATIC_HOST) {
      if (!silent) setSyncStatus('静态托管：开奖数据由 GitHub 定时任务同步更新');
      return false;
    }
    if (!silent) setSyncStatus('正在同步...')
    try {
      let latest = []
      if (window.lotteryAPI) {
        latest = await window.lotteryAPI.fetchLatest(5)
      } else {
        // 乐彩网数据源：TXT格式，每行空格分隔，字段：期号 日期 百位 十位 个位 ...
        const res = await fetch('/api/lottery?name=pl3&issueCount=10&_t=' + Date.now(), { cache: 'no-store' })
        const text = await res.text()
        const lines = text.trim().split('\n').filter(l => l.trim())
        latest = lines.slice(0, 10).map(line => {
          const parts = line.trim().split(/\s+/)
          // 期号格式：2026214 -> 26214
          const issue = parts[0].length === 7 && parts[0].startsWith('20') ? parts[0].substring(2) : parts[0]
          return { issue, d1: Number(parts[2]), d2: Number(parts[3]), d3: Number(parts[4]) }
        })
      }
      if (latest.length > 0) {
        // 数据源为倒序，必须过滤无效行并按期号升序排序，否则 extraData/持久化文件尾部期号错乱
        const newItems = latest
          .filter(d => !isNaN(Number(d.issue)) && !isNaN(d.d1) && !isNaN(d.d2) && !isNaN(d.d3))
          .filter(d => Number(d.issue) > Number(lastStaticIssue))
          .sort((a, b) => Number(a.issue) - Number(b.issue))
        if (newItems.length > 0) {
          setExtraData(newItems)
          if (silent) setLastAutoCheck(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
          setSyncStatus(`${silent ? '【自动】' : ''}已同步 ${newItems.length} 期新数据（${newItems.map(d => d.issue).join(',')}）`)
          // 自动保存到文件
          fetch('/api/save-draws', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ draws: newItems })
          }).then(r => r.json()).then(result => {
            if (result.success) {
              setSyncStatus(prev => prev + ` | 已自动保存${result.saved}期到文件`)
            } else {
              setSyncStatus(prev => prev + ` | 保存失败: ${result.message}`)
            }
          }).catch(() => {
            setSyncStatus(prev => prev + ' | 保存请求失败')
          })
          return true
        } else {
          if (!silent) setSyncStatus('数据已是最新')
          else setLastAutoCheck(new Date().toLocaleTimeString('zh-CN', { hour12: false }))
        }
      } else {
        if (!silent) setSyncStatus('同步失败，请检查网络')
      }
    } catch (err) {
      if (!silent) setSyncStatus('同步出错: ' + err.message)
    }
    return false
  }, [lastStaticIssue])

  const syncedTodayRef = useRef(false); // 当日窗口内是否已同步到新数据
  useEffect(() => {
    // 页面加载时先补同步一次（覆盖窗口期关闭页面的缺口）；若发现新数据则标记当期已完成
    if (IS_STATIC_HOST) return; // 静态托管无运行时同步能力
    fetchLatest().then(foundNew => { if (foundNew) syncedTodayRef.current = true; })
  }, [fetchLatest])

  // ============================================================
  // 【算法锁定】自动同步窗口机制：开奖前启动，同步到新数据后停止
  // 排列三每天21:25开奖，同步窗口 21:00~23:59
  // 窗口内：每60秒静默检查；成功同步新开奖数据后当日停止轮询
  // 窗口外：重置标记，等下期开奖前（次日窗口）再继续，以此类推
  // 禁止：删除窗口判断；窗口外轮询请求API；同步成功后继续轮询
  // ============================================================
  const SYNC_WINDOW = { startH: 21, startM: 0, endH: 23, endM: 59 };
  const fetchLatestRef = useRef(fetchLatest)
  useEffect(() => { fetchLatestRef.current = fetchLatest }, [fetchLatest])
  useEffect(() => {
    if (IS_STATIC_HOST) return; // 静态托管：不启动轮询，数据由仓库定时任务更新
    const inWindow = () => {
      const now = new Date();
      const cur = now.getHours() * 60 + now.getMinutes();
      return cur >= SYNC_WINDOW.startH * 60 + SYNC_WINDOW.startM && cur <= SYNC_WINDOW.endH * 60 + SYNC_WINDOW.endM;
    };
    const timer = setInterval(() => {
      if (!inWindow()) {
        syncedTodayRef.current = false; // 窗口外：重置标记，等待下一期窗口
        return;
      }
      if (syncedTodayRef.current) return; // 当期开奖数据已同步完成，停止运行
      fetchLatestRef.current(true).then(foundNew => {
        if (foundNew) syncedTodayRef.current = true;
      });
    }, 60000)
    return () => clearInterval(timer)
  }, [])


  return (
    <div className="app">
      <header className="header">
        <h1>排列三分析系统</h1>
        <div style={{ position: 'absolute', right: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 跨应用跳转：本地 dev 走端口地址，静态托管走相对路径（Pages 下 3d/ 与 pl3/ 同级） */}
          <a href={IS_STATIC_HOST ? '../3d/' : 'http://localhost:5173'} target="_blank" style={{ color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', padding: '4px 10px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 4 }}>福彩3D</a>
          <span style={{ fontSize: 15, color: '#fff', fontWeight: 600 }}>共 {baseData.length} 期数据</span>
          <button
            onClick={fetchLatest}
            style={{
              padding: '6px 16px',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
              border: '1px solid #fff',
              borderRadius: 4,
              background: '#fff',
              color: '#c0392b'
            }}
          >
            同步最新
          </button>
          {syncStatus && (
            <span style={{ fontSize: 15, color: '#fff', fontWeight: 600 }}>
              {syncStatus}
            </span>
          )}
          {IS_STATIC_HOST ? (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 400 }} title="纯静态托管无服务端代理与写文件能力，开奖数据由 GitHub 定时任务同步后重新发布">
              ☁静态托管：数据随仓库定时更新
            </span>
          ) : (
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 400 }} title="开奖前自动检查新开奖数据并保存，同步完成后停止，下期开奖前再启动">
              ⚡自动同步 21:00-23:59{lastAutoCheck ? `（最近检查 ${lastAutoCheck}）` : ''}
            </span>
          )}
        </div>
      </header>

      {/* 主内容区外层布局与福彩3D一致：flex 容器 + marginTop 25，main 撑满且不收缩 */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', marginTop: 25 }}>
        <main className="main-content" style={{ flex: 1, minWidth: 0 }}>
          <FullDataTable data={enrichedData} trialDigits={trialDigits} onTrialChange={setTrialDigits} />
        </main>
      </div>
    </div>
  )
}

export default App
