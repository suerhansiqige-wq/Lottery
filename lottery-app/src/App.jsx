import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { lotteryData as staticLotteryData } from './data/lotteryData.js'
import { enrichData } from './data/enrichDataOptimized.js'
import decompositionData from './data/decompositionData.json'
import bozhongData from './data/bozhongData.json'
import { parseDecompGroups, computeRongCuo } from './utils/decompRongCuo.js'
import FullDataTable from './components/FullDataTable.jsx'
import DecompRongCuoPanel from './components/DecompRongCuoPanel.jsx'

// ============================================================
// 分解 JSON 基线归一化
// decompositionData.json / bozhongData.json 中每期的值是「20 个字符串组成的数组」
// （形如 ["72390,18546", "52167,98430", ...]），而 textarea 需要的是换行拼接的单一字符串。
// 必须在模块加载时归一化一次：
//   1）避免对数组调 .trim() 导致 App 崩溃白屏
//   2）下方 makeTextSetter 用 baseline 比对区分「用户改动」与「JSON 原始值」，
//      两边必须同为字符串，否则每期都会被当成改动全量写进 localStorage
// ============================================================
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
// 【数据开关】DECOMP_BLANK = true 时，智取/博众两列不加载 JSON 基线数据，
//   表格中所有往期行的分解文本框均为空白（灰底），容错模块显示「暂无分解条件」。
//   用户要求表格保持空白状态（2026-09-10）。
// 【无损】src/data/decompositionData.json 与 bozhongData.json 在磁盘上未做任何删改，
//   544 期数据完整保留；需要恢复预载时把本开关改为 false 即可。
// 注意：开关为 true 时，即使重跑 export_decomp.cjs / export_bozhong.cjs 刷新了 JSON，
//   页面也不会加载（因为基线被本开关屏蔽），需同时改回 false。
// ============================================================
const DECOMP_BLANK = true;

// 实际生效的基线：开关为 true 时为空对象（两列空白），为 false 时为归一化后的 JSON 数据
const DECOMP_BASELINE = DECOMP_BLANK ? {} : DECOMP_BASE;
const BOZHONG_BASELINE = DECOMP_BLANK ? {} : BOZHONG_BASE;

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

  // ============================================================
  // 智取分解 / 博众分解：编辑框内容 + 锁定状态 + 密码解锁
  // 【持久化锁定】localStorage 只存用户手工改动（与 JSON 基线不同的期号），启动时
  //   覆盖在 JSON 基线之上。这样重跑 export_decomp.cjs / export_bozhong.cjs 导出新数据后
  //   新期号仍能生效，用户已录入的编辑内容也不丢，且不会把 21 万字节基线写进 localStorage
  // 键名沿用历史：3d_decompTexts / 3d_bozhongTexts / 3d_lockedDecomp / 3d_lockedBozhong
  // 交互循环：编辑 -> 点「智取、博众分解」自动锁定（置灰只读）-> 点击弹密码框 -> 解锁再编辑
  // ============================================================
  const DECOMP_PWD = '000000';
  const safeSetItem = (key, value) => { try { localStorage.setItem(key, value); } catch { /* 配额超限时静默 */ } };
  const loadOverrides = (key) => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : {}; } catch { return {}; }
  };
  const loadLockSet = (key) => {
    try { const s = localStorage.getItem(key); return new Set(s ? JSON.parse(s) : []); } catch { return new Set(); }
  };

  const [decompTexts, setDecompTextsState] = useState(() => normalizeTexts({ ...DECOMP_BASELINE, ...loadOverrides('3d_decompTexts') }));
  const [bozhongTexts, setBozhongTextsState] = useState(() => normalizeTexts({ ...BOZHONG_BASELINE, ...loadOverrides('3d_bozhongTexts') }));
  const [lockedDecomp, setLockedDecompState] = useState(() => loadLockSet('3d_lockedDecomp'));
  const [lockedBozhong, setLockedBozhongState] = useState(() => loadLockSet('3d_lockedBozhong'));
  // 密码弹窗：decomp / bozhong 共用一个，由 pwdTarget.kind 区分
  const [pwdDialog, setPwdDialog] = useState(false);
  const [pwdTarget, setPwdTarget] = useState(null); // { kind: 'decomp'|'bozhong', issue }
  const [pwdInput, setPwdInput] = useState('');
  const [pwdError, setPwdError] = useState('');

  // 写入某期分解文本：只持久化与 JSON 基线不同的期号
  const makeTextSetter = (setState, baseline, storageKey) => (issue, val) => {
    setState(prev => {
      const next = { ...prev, [issue]: val };
      const overrides = {};
      for (const k of Object.keys(next)) if (next[k] !== baseline[k]) overrides[k] = next[k];
      safeSetItem(storageKey, JSON.stringify(overrides));
      return next;
    });
  };
  const setDecompText = makeTextSetter(setDecompTextsState, DECOMP_BASELINE, '3d_decompTexts');
  const setBozhongText = makeTextSetter(setBozhongTextsState, BOZHONG_BASELINE, '3d_bozhongTexts');

  // 自选号码：按「最新未开奖期」存储用户手填号码，localStorage 键 3d_selfPick（仅存非空期）
  const [selfPickTexts, setSelfPickTextsState] = useState(() => loadOverrides('3d_selfPick'));
  const setSelfPickText = (issue, val) => {
    if (!issue) return;
    setSelfPickTextsState(prev => {
      const next = { ...prev };
      if (val && val.trim()) next[issue] = val; else delete next[issue];
      safeSetItem('3d_selfPick', JSON.stringify(next));
      return next;
    });
  };

  // 锁定集合写入：接收新 Set，同步落盘
  const makeLockSetter = (setState, storageKey) => (val) => {
    setState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      safeSetItem(storageKey, JSON.stringify([...next]));
      return next;
    });
  };
  const setLockedDecomp = makeLockSetter(setLockedDecompState, '3d_lockedDecomp');
  const setLockedBozhong = makeLockSetter(setLockedBozhongState, '3d_lockedBozhong');

  // 点击已锁定的文本框 -> 弹密码框
  const requestUnlock = (kind, issue) => {
    setPwdTarget({ kind, issue });
    setPwdInput('');
    setPwdError('');
    setPwdDialog(true);
  };
  // 密码校验通过 -> 从对应 Lock Set 移除该期号，恢复可编辑（支持无限次循环）
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

  // ============================================================
  // 【算法锁定】分解容错计算目标期
  // 优先取「下期预留行」（用户手工录入的最新分解条件）；该行为空时回退到 JSON 中
  // 有数据的最新一期。原因：分解数据由桌面 xls 手工导出，常滞后于开奖数据。
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

  // ============================================================
  // 【算法锁定】分解容错计算（候选集 = 《自选号码》的组六号码，见下）
  // ============================================================
  // 【候选集】《自选号码》模块提供的号码中，仅取组六（三位互不相同）作为
  // 智取/博众分解容错的候选集；组三不参与分解。自选为空时候选集为空数组，
  // 容错模块会显示空候选提示而非回退到全部 1000 注
  // ============================================================
  const selfPickZuLiu = useMemo(() => {
    const tokens = (selfPickTexts[nextIssue] || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    const seen = new Set();
    const out = [];
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      if (new Set(t.split('')).size === 3) out.push(t);   // 仅组六
    }
    return out;
  }, [selfPickTexts, nextIssue]);

  // 依赖数组必须包含 decompTexts / bozhongTexts —— 历史踩坑：漏依赖会导致
  // textarea 编辑后容错结果不重算（编辑框看起来“失效”）
  // 同时必须包含 selfPickZuLiu —— 自选号码变化时容错结果需重算
  // ============================================================
  const decompResult = useMemo(
    () => computeRongCuo(parseDecompGroups(decompTexts[decompIssue] || ''), selfPickZuLiu),
    [decompTexts, decompIssue, selfPickZuLiu]
  );
  const bozhongResult = useMemo(
    () => computeRongCuo(parseDecompGroups(bozhongTexts[bozhongIssue] || ''), selfPickZuLiu),
    [bozhongTexts, bozhongIssue, selfPickZuLiu]
  );


  // 「智取、博众分解」按钮：只锁定「下期预留行」（最新期号）的两个编辑框
  // 【锁定范围锁定】禁止把 decompIssue / bozhongIssue 也加进来——分解数据滞后时它们会
  // 回退到某个历史期（如 26193），连带锁定会让用户没编辑过的往期行变只读，必须密码才能改
  // 容错结果由 useMemo 自动重算，按钮职责仅为锁定，防止误改已提交的下期分解条件
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

      <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', marginTop: 20 }}>
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

      {/* 分解容错结果：智取（黄）/ 博众（绿）并排等高 + 本期容错（交集） */}
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

      {/* 密码解锁弹窗：点击已锁定的分解文本框弹出，默认密码 000000 */}
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
