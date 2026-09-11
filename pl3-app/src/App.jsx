import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { lotteryData as staticLotteryData, enrichData } from './data/lotteryData.js'
import decompositionData from './data/decompositionData.json'
import bozhongData from './data/bozhongData.json'
import { parseDecompGroups, computeRongCuo } from './utils/decompRongCuo.js'
import FullDataTable from './components/FullDataTable.jsx'
import DecompRongCuoPanel from './components/DecompRongCuoPanel.jsx'

// ============================================================
// 分解 JSON 基线归一化（与福彩3D 同一套逻辑）
// decompositionData.json / bozhongData.json 中每期的值是「20 个字符串组成的数组」
// 必须在模块加载时归一化一次：
//   1）避免对数组调 .trim() 导致 App 崩溃白屏
//   2）makeTextSetter 用 baseline 比对区分「用户改动」与「JSON 原始值」
function normalizeTexts(obj) {
  const out = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    out[k] = Array.isArray(v) ? v.join('\n') : (typeof v === 'string' ? v : '');
  }
  return out;
}
const DECOMP_BASE = normalizeTexts(decompositionData);
const BOZHONG_BASE = normalizeTexts(bozhongData);

// ============================================================
// 【数据开关】与福彩3D 同一开关机制、同一当前取值：true = 智取/博众两列全表空白（对齐福彩3D 现状）；
//   改为 false 则显示 JSON 预载数据。JSON 文件始终保留在磁盘未删改（无损开关）
// ============================================================
const DECOMP_BLANK = true;
const DECOMP_BASELINE = DECOMP_BLANK ? {} : DECOMP_BASE;
const BOZHONG_BASELINE = DECOMP_BLANK ? {} : BOZHONG_BASE;

function App() {
  const [extraData, setExtraData] = useState([])
  const [syncStatus, setSyncStatus] = useState('')
  const [lastAutoCheck, setLastAutoCheck] = useState('') // 自动轮询最近检查时间
  const [trialDigits, setTrialDigits] = useState([null, null, null])
  const [showCount, setShowCount] = useState(10)

  // ============================================================
  // 智取分解 / 博众分解：编辑框内容 + 锁定状态 + 密码解锁（与福彩3D 同一套逻辑）
  // 键名前缀 pl3_ 以与福彩3D 的 3d_ 隔离
  // ============================================================
  const DECOMP_PWD = '000000';
  const safeSetItem = (key, value) => { try { localStorage.setItem(key, value); } catch { /* 配额超限时静默 */ } };
  const loadOverrides = (key) => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : {}; } catch { return {}; }
  };
  const loadLockSet = (key) => {
    try { const s = localStorage.getItem(key); return new Set(s ? JSON.parse(s) : []); } catch { return new Set(); }
  };

  const [decompTexts, setDecompTextsState] = useState(() => normalizeTexts({ ...DECOMP_BASELINE, ...loadOverrides('pl3_decompTexts') }));
  const [bozhongTexts, setBozhongTextsState] = useState(() => normalizeTexts({ ...BOZHONG_BASELINE, ...loadOverrides('pl3_bozhongTexts') }));
  const [lockedDecomp, setLockedDecompState] = useState(() => loadLockSet('pl3_lockedDecomp'));
  const [lockedBozhong, setLockedBozhongState] = useState(() => loadLockSet('pl3_lockedBozhong'));
  const [pwdDialog, setPwdDialog] = useState(false);
  const [pwdTarget, setPwdTarget] = useState(null); // { kind: 'decomp'|'bozhong', issue }
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState('');

  const makeTextSetter = (setState, baseline, storageKey) => (issue, val) => {
    setState(prev => {
      const next = { ...prev, [issue]: val };
      const overrides = {};
      for (const k of Object.keys(next)) if (next[k] !== baseline[k]) overrides[k] = next[k];
      safeSetItem(storageKey, JSON.stringify(overrides));
      return next;
    });
  };
  const setDecompText = makeTextSetter(setDecompTextsState, DECOMP_BASELINE, 'pl3_decompTexts');
  const setBozhongText = makeTextSetter(setBozhongTextsState, BOZHONG_BASELINE, 'pl3_bozhongTexts');

  // 自选号码：按「最新未开奖期」存储，键 pl3_selfPick（仅存非空期）
  const [selfPickTexts, setSelfPickTextsState] = useState(() => loadOverrides('pl3_selfPick'));
  const setSelfPickText = (issue, val) => {
    if (!issue) return;
    setSelfPickTextsState(prev => {
      const next = { ...prev };
      if (val && val.trim()) next[issue] = val; else delete next[issue];
      safeSetItem('pl3_selfPick', JSON.stringify(next));
      return next;
    });
  };

  const makeLockSetter = (setState, storageKey) => (val) => {
    setState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      safeSetItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };
  const setLockedDecomp = makeLockSetter(setLockedDecompState, 'pl3_lockedDecomp');
  const setLockedBozhong = makeLockSetter(setLockedBozhongState, 'pl3_lockedBozhong');

  const requestUnlock = (kind, issue) => {
    setPwdTarget({ kind, issue });
    setPwdInput('');
    setPwdError('');
    setPwdDialog(true);
  };
  const submitPwd = () => {
    if (!pwdTarget) return;
    if (pwdInput.trim() !== DECOMP_PWD) { setPwdError('密码错误'); return; }
    const { kind, issue } = pwdTarget;
    const remover = (prev) => { const n = new Set(prev); n.delete(issue); return n; };
    if (kind === 'decomp') setLockedDecomp(remover); else setLockedBozhong(remover);
    setPwdDialog(false);
    setPwdTarget(null);
    setPwdInput('');
    setPwdError('');
  };

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

  // ============================================================
  // 分解容错目标期 / 候选集 / 结果 / 往期验证（与福彩3D 同一套逻辑）
  // ============================================================
  const nextIssue = baseData.length > 0 ? String(Number(baseData[baseData.length - 1].issue) + 1) : '';

  const pickTargetIssue = (texts) => {
    if (nextIssue && (texts[nextIssue] || '').trim()) return nextIssue;
    let best = '';
    for (const k of Object.keys(texts)) {
      if (!(texts[k] || '').trim()) continue;
      if (!best || Number(k) > Number(best)) best = k;
    }
    return best || nextIssue;
  };

  const decompIssue = useMemo(() => pickTargetIssue(decompTexts), [decompTexts, nextIssue]);
  const bozhongIssue = useMemo(() => pickTargetIssue(bozhongTexts), [bozhongTexts, nextIssue]);

  // 候选集 = 《自选号码》的组六号码；组三不参与分解
  const selfPickZuLiu = useMemo(() => {
    const tokens = (selfPickTexts[nextIssue] || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    const seen = new Set();
    const out = [];
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (new Set(t.split('')).size === 3) out.push(t);
    }
    return out;
  }, [selfPickTexts, nextIssue]);

  const decompResult = useMemo(
    () => computeRongCuo(parseDecompGroups(decompTexts[decompIssue] || ''), selfPickZuLiu),
    [decompTexts, decompIssue, selfPickZuLiu]
  );
  const bozhongResult = useMemo(
    () => computeRongCuo(parseDecompGroups(bozhongTexts[bozhongIssue] || ''), selfPickZuLiu),
    [bozhongTexts, bozhongIssue, selfPickZuLiu]
  );


  // 「智取、博众分解」按钮：只锁定下期预留行
  const onDecompSubmit = () => {
    if (!nextIssue) return;
    setLockedDecomp(prev => new Set(prev).add(nextIssue));
    setLockedBozhong(prev => new Set(prev).add(nextIssue));
  };

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
          <FullDataTable
            data={enrichedData}
            showCount={showCount}
            setShowCount={setShowCount}
            trialDigits={trialDigits}
            onTrialChange={setTrialDigits}
            decompTexts={decompTexts}
            bozhongTexts={bozhongTexts}
            setDecompText={setDecompText}
            setBozhongText={setBozhongText}
            lockedDecomp={lockedDecomp}
            lockedBozhong={lockedBozhong}
            onRequestUnlock={requestUnlock}
            nextIssue={nextIssue}
          />
        </main>
      </div>

      {/* 分解容错面板（与福彩3D 同一组件与模块顺序）：
          ①自选号码 → ②橙色锁定按钮行 → ③容错1-5合并频次 → ④智取/博众并排 → ⑤本期容错交集 */}
      <div style={{ marginTop: 16 }}>
        <DecompRongCuoPanel
          decompIssue={decompIssue}
          decompResult={decompResult}
          bozhongIssue={bozhongIssue}
          bozhongResult={bozhongResult}
          selfPickIssue={nextIssue}
          selfPickValue={selfPickTexts[nextIssue] || ''}
          onSelfPickChange={(v) => setSelfPickText(nextIssue, v)}
          onDecompSubmit={onDecompSubmit}
        />
      </div>

      {/* 密码解锁弹窗：点击已锁定的分解文本框弹出，默认密码 000000（与福彩3D 一致） */}
      {pwdDialog && (
        <div
          onClick={() => { setPwdDialog(false); setPwdTarget(null); setPwdError(''); }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 8, padding: '20px 24px', width: 300,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 800, color: '#333', marginBottom: 4 }}>
              解锁{pwdTarget && pwdTarget.kind === 'decomp' ? '智取' : '博众'}分解编辑框
            </div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
              期号 {pwdTarget ? pwdTarget.issue : '—'}，请输入密码
            </div>
            <input
              type="password"
              autoFocus
              value={pwdInput}
              onChange={e => { setPwdInput(e.target.value); setPwdError(''); }}
              onKeyDown={e => { if (e.key === 'Enter') submitPwd(); }}
              placeholder="密码"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 10px', fontSize: 15,
                border: `1px solid ${pwdError ? '#e53935' : '#ccc'}`, borderRadius: 4,
              }}
            />
            {pwdError && <div style={{ fontSize: 12, color: '#e53935', marginTop: 6 }}>{pwdError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setPwdDialog(false); setPwdTarget(null); setPwdError(''); }}
                style={{ padding: '6px 16px', fontSize: 14, cursor: 'pointer', border: '1px solid #ccc', borderRadius: 4, background: '#fff', color: '#555' }}
              >
                取消
              </button>
              <button
                onClick={submitPwd}
                style={{ padding: '6px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: '1px solid #f57f17', borderRadius: 4, background: '#f9a825', color: '#fff' }}
              >
                解锁
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
