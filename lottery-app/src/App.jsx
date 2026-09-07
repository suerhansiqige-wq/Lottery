import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { lotteryData as staticLotteryData } from './data/lotteryData.js'
import { enrichData } from './data/enrichDataOptimized.js'
import FullDataTable from './components/FullDataTable.jsx'

function App() {
  const [extraData, setExtraData] = useState([])
  const [syncStatus, setSyncStatus] = useState('')
    const [lastAutoCheck, setLastAutoCheck] = useState('') // 自动轮询最近检查时间
  const [trialDigits, setTrialDigits] = useState([null, null, null])
  const [showCount, setShowCount] = useState(10) // 表格显示期数

  // 遗漏杀号：编辑框内容 + 锁定状态 + 密码弹窗
  const [missKillText, setMissKillTextState] = useState(() => {
    try { const s = localStorage.getItem('3d_missKillText'); return s ? s.replace(/\n/g, ', ') : ''; } catch { return ''; }
  });
  const [lockedMissKill, setLockedMissKillState] = useState(() => {
    try { const s = localStorage.getItem('3d_lockedMissKill'); return s === 'true'; } catch { return false; }
  });
  const [missKillPwdDialog, setMissKillPwdDialog] = useState(false);
  const [missKillPwdInput, setMissKillPwdInput] = useState('');
  const setMissKillText = (val) => {
    let next = typeof val === 'function' ? val(missKillText) : val;
    next = next.replace(/\n/g, ', ');
    // 去重：按逗号/空格分割后去重再合并
    const parts = next.split(/[,，\s]+/).filter(n => n.length > 0);
    next = [...new Set(parts)].join(', ');
    setMissKillTextState(next);
    localStorage.setItem('3d_missKillText', next);
  };
  const setLockedMissKill = (val) => {
    const next = typeof val === 'function' ? val(lockedMissKill) : val;
    setLockedMissKillState(next);
    localStorage.setItem('3d_lockedMissKill', String(next));
  };

  // 遗漏杀组选：编辑框内容 + 锁定状态 + 密码弹窗
  const [missKillZxText, setMissKillZxTextState] = useState(() => {
    try { const s = localStorage.getItem('3d_missKillZxText'); return s ? s.replace(/\n/g, ', ') : ''; } catch { return ''; }
  });
  const [lockedMissKillZx, setLockedMissKillZxState] = useState(() => {
    try { const s = localStorage.getItem('3d_lockedMissKillZx'); return s === 'true'; } catch { return false; }
  });
  const [missKillZxPwdDialog, setMissKillZxPwdDialog] = useState(false);
  const [missKillZxPwdInput, setMissKillZxPwdInput] = useState('');
  const setMissKillZxText = (val) => {
    let next = typeof val === 'function' ? val(missKillZxText) : val;
    next = next.replace(/\n/g, ', ');
    // 去重：按逗号/空格分割后去重再合并
    const parts = next.split(/[,，\s]+/).filter(n => n.length > 0);
    next = [...new Set(parts)].join(', ');
    setMissKillZxTextState(next);
    localStorage.setItem('3d_missKillZxText', next);
  };
  const setLockedMissKillZx = (val) => {
    const next = typeof val === 'function' ? val(lockedMissKillZx) : val;
    setLockedMissKillZxState(next);
    localStorage.setItem('3d_lockedMissKillZx', String(next));
  };

  // 组选转直选排列：生成所有不重复的排列
  const zuXuanToZhiXuan = (num) => {
    const digits = num.padStart(3, '0').split('');
    const perms = new Set();
    const permute = (arr, start) => {
      if (start === arr.length) {
        perms.add(arr.join(''));
        return;
      }
      for (let i = start; i < arr.length; i++) {
        [arr[start], arr[i]] = [arr[i], arr[start]];
        permute(arr, start + 1);
        [arr[start], arr[i]] = [arr[i], arr[start]];
      }
    };
    permute(digits, 0);
    return [...perms].sort();
  };

  // 获取静态数据中最大期号
  const lastStaticIssue = staticLotteryData[staticLotteryData.length - 1].issue // 如 '26192'

  // 合并静态数据和新数据（新数据期号转换为5位格式后去重，按期号升序排序）
  // ============================================================
  // 【算法锁定】baseData 数据合并与去重
  // 规则：staticLotteryData + extraData 按期号去重（Map保留首条），升序排序
  // 禁止：直接拼接不去重，否则会导致同周期重复行，位杀组号计算错误
  // ============================================================
  const baseData = useMemo(() => {
    const allItems = [...staticLotteryData, ...extraData];
    console.log('[App] staticLotteryData.length:', staticLotteryData.length, 'extraData.length:', extraData.length);
    const issueMap = new Map();
    for (const item of allItems) {
      if (!issueMap.has(item.issue)) {
        issueMap.set(item.issue, item);
      }
    }
    const result = [...issueMap.values()].sort((a, b) => Number(a.issue) - Number(b.issue));
    console.log('[App] baseData.length:', result.length, 'firstIssue:', result[0]?.issue, 'lastIssue:', result[result.length-1]?.issue);
    return result;
  }, [extraData]);

  // 试验数据行：输入三位数字后追加到数据末尾，重新计算所有衍生列
  const enrichedData = useMemo(() => {
    const [d1, d2, d3] = trialDigits
    const dataToEnrich = (d1 === null || d2 === null || d3 === null) ? baseData : (() => {
      if (baseData.length === 0) return baseData;
      const lastIssue = baseData[baseData.length - 1].issue
      const nextIssue = String(Number(lastIssue) + 1)
      return [...baseData, { issue: nextIssue, d1: Number(d1), d2: Number(d2), d3: Number(d3) }]
    })()
    const result = enrichData(dataToEnrich, showCount)
    console.log('[App] enrichedData.length:', result?.length, 'firstIssue:', result?.[0]?.issue, 'lastIssue:', result?.[result.length-1]?.issue);
    return result
  }, [baseData, trialDigits, showCount])

  // 遗漏杀直选自动剔除：最新开奖号的直选号码自动从编辑框中移除
  const lastIssueNum = baseData.length > 0 ? baseData[baseData.length - 1].issue : '';
  useEffect(() => {
    if (!missKillText.trim()) return;
    const lastDraw = baseData[baseData.length - 1];
    if (!lastDraw || lastDraw.d1 === undefined) return;
    const drawNum = `${lastDraw.d1}${lastDraw.d2}${lastDraw.d3}`;
    // 解析当前编辑框中的号码
    const nums = missKillText.trim().split(/[,，\s]+/).filter(n => n.length > 0);
    // 只剔除与开奖号完全相同的直选号码
    const filtered = nums.filter(n => n !== drawNum);
    if (filtered.length !== nums.length) {
      const newText = filtered.join(', ');
      setMissKillTextState(newText);
      localStorage.setItem('3d_missKillText', newText);
    }
  }, [lastIssueNum]);

  // 遗漏杀组选自动剔除：开奖号匹配组选排列时，剔除该组选号及其所有直选排列
  useEffect(() => {
    if (!missKillZxText.trim()) return;
    const lastDraw = baseData[baseData.length - 1];
    if (!lastDraw || lastDraw.d1 === undefined) return;
    const drawNum = `${lastDraw.d1}${lastDraw.d2}${lastDraw.d3}`;
    const drawPerms = new Set(zuXuanToZhiXuan(drawNum));
    // 解析当前编辑框中的号码
    const nums = missKillZxText.trim().split(/[,，\s]+/).filter(n => n.length > 0);
    // 剔除：该组选号的任一排列与开奖号相同，则删除该组选号
    const filtered = nums.filter(n => {
      const perms = zuXuanToZhiXuan(n);
      return !perms.some(p => drawPerms.has(p));
    });
    if (filtered.length !== nums.length) {
      const newText = filtered.join(', ');
      setMissKillZxTextState(newText);
      localStorage.setItem('3d_missKillZxText', newText);
    }
  }, [lastIssueNum]);

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

  // 拉取最新开奖数据（与排列三同步逻辑一致，仅API源不同）
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
        latest = await window.lotteryAPI.fetchLatest(30)
      } else {
        // 乐彩网数据源：TXT格式，每行空格分隔，字段：期号 日期 百位 十位 个位 ...
        const res = await fetch('/api/lottery?name=3d&issueCount=30&_t=' + Date.now(), { cache: 'no-store' })
        const text = await res.text()
        const lines = text.trim().split('\n').filter(l => l.trim())
        latest = lines.slice(0, 30).map(line => {
          const parts = line.trim().split(/\s+/)
          // 期号格式：2026214 -> 26214
          const issue = parts[0].length === 7 && parts[0].startsWith('20') ? parts[0].substring(2) : parts[0]
          return { issue, d1: Number(parts[2]), d2: Number(parts[3]), d3: Number(parts[4]) }
        })
      }
      if (latest.length > 0) {
        const newItems = latest.filter(d => Number(d.issue) > Number(lastStaticIssue))
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
  // 福彩3D每天21:15开奖，同步窗口 20:50~23:59
  // 窗口内：每60秒静默检查；成功同步新开奖数据后当日停止轮询
  // 窗口外：重置标记，等下期开奖前（次日窗口）再继续，以此类推
  // 禁止：删除窗口判断；窗口外轮询请求API；同步成功后继续轮询
  // ============================================================
  const SYNC_WINDOW = { startH: 20, startM: 50, endH: 23, endM: 59 };
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

  // ============================================================
  // 【算法锁定】杀号组号：平方取尾杀 + 两杀一全选
  // makePair(n): sq=(n*n)%10, 返回[n,sq]；若sq===n则返回[n,(n+5)%10]
  // 两杀一全选：3种组合（百杀+十杀+个全选 / 百杀+十全选+个杀 / 百全选+十杀+个杀）
  // 每期用上一期开奖号计算，数组末尾额外push未开奖期（用最后一期开奖号）
  // 禁止：用当期自身开奖号计算当期位杀；未开奖期必须用最后一期开奖号
  // 【性能锁定】只计算末尾窗口（showCount+3）+未开奖期：每期组号仅依赖上一期开奖号，
  // 窗口内结果与全量计算完全一致（全量8651期约5秒，窗口约7ms）
  return (
    <div className="app">
      <header className="header">
        <h1>福彩3D分析系统</h1>
        <div style={{ position: 'absolute', right: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* 跨应用跳转：本地 dev 走端口地址，静态托管走相对路径（Pages 下 3d/ 与 pl3/ 同级） */}
          <a href={IS_STATIC_HOST ? '../pl3/' : 'http://localhost:5174'} target="_blank" style={{ color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none', padding: '4px 10px', border: '1px solid rgba(255,255,255,0.5)', borderRadius: 4 }}>排列三</a>
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
              ⚡自动同步 20:50-23:59{lastAutoCheck ? `（最近检查 ${lastAutoCheck}）` : ''}
            </span>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', marginTop: 25 }}>
        <main className="main-content" style={{ flex: 1, minWidth: 0 }}>
          <FullDataTable data={enrichedData} showCount={showCount} setShowCount={setShowCount} trialDigits={trialDigits} onTrialChange={setTrialDigits} />
        </main>
      </div>


    </div>
  )
}

export default App
