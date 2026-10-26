import { useState, useMemo } from 'react'
import { parseDecompGroups, verifyDraw } from '../utils/decompRongCuo.js'

// ============================================================
// 遗漏策略：三组并集
// 组1: 百位6个最多遗漏 + 十位5个冷号(排除前5) + 个位5个冷号(排除前5)
// 组2: 十位6个最多遗漏 + 百位5个冷号 + 个位5个冷号
// 组3: 个位6个最多遗漏 + 百位5个冷号 + 十位5个冷号
// ============================================================
function getMissingAtPeriod(data, periodIndex) {
  const historical = data.slice(0, periodIndex);
  const missing = { d1: {}, d2: {}, d3: {} };
  for (let digit = 0; digit <= 9; digit++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      let miss = 0;
      for (let i = historical.length - 1; i >= 0; i--) {
        if (historical[i][pos] === digit) break;
        miss++;
      }
      missing[pos][digit] = miss;
    }
  }
  return missing;
}

function selectOneGroup(missing, sixPos) {
  const result = { d1: [], d2: [], d3: [] };
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
    if (pos === sixPos) {
      result[pos] = digits.slice(0, 6);
    } else {
      // 排除最多遗漏的5个数字，选剩余5个
      result[pos] = digits.slice(5, 10);
    }
  }
  return result;
}

function generateOmissionNumbers(data, periodIndex) {
  // 基于到periodIndex期的数据生成下一期的遗漏策略号码（遗漏1位）
  const missing = getMissingAtPeriod(data, periodIndex);
  const group1 = selectOneGroup(missing, 'd1');
  const group2 = selectOneGroup(missing, 'd2');
  const group3 = selectOneGroup(missing, 'd3');
  
  const combinations = new Set();
  for (const g of [group1, group2, group3]) {
    for (const d1 of g.d1) {
      for (const d2 of g.d2) {
        for (const d3 of g.d3) {
          combinations.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  return Array.from(combinations).sort();
}

// ============================================================
// 遗漏2位策略：三组并集
// 组1: 百位5个最多遗漏 + 十位5个最多遗漏 + 个位排除前5（选后5）
// 组2: 十位5个最多遗漏 + 个位5个最多遗漏 + 百位排除前5（选后5）
// 组3: 百位5个最多遗漏 + 个位5个最多遗漏 + 十位排除前5（选后5）
// ============================================================
function selectTwoGroups(missing, excludePos) {
  // excludePos: 哪个位置排除最多遗漏的5个数字（选后5），其他位置选前5
  const result = { d1: [], d2: [], d3: [] };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
    
    if (pos === excludePos) {
      // 这个位置排除最多遗漏的5个，选剩余5个
      result[pos] = digits.slice(5, 10);
    } else {
      // 其他位置选最多遗漏的5个
      result[pos] = digits.slice(0, 5);
    }
  }
  
  return result;
}

function generateOmissionNumbers2(data, periodIndex) {
  // 基于到periodIndex期的数据生成下一期的遗漏2位策略号码
  const missing = getMissingAtPeriod(data, periodIndex);
  const group1 = selectTwoGroups(missing, 'd3'); // 个位排除前5
  const group2 = selectTwoGroups(missing, 'd1'); // 百位排除前5
  const group3 = selectTwoGroups(missing, 'd2'); // 十位排除前5
  
  const combinations = new Set();
  for (const g of [group1, group2, group3]) {
    for (const d1 of g.d1) {
      for (const d2 of g.d2) {
        for (const d3 of g.d3) {
          combinations.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  return Array.from(combinations).sort();
}

// ============================================================
// 遗漏3位策略：三组并集
// 组1: 百位6个最多遗漏 + 十位5个最多遗漏 + 个位5个最多遗漏
// 组2: 十位6个最多遗漏 + 个位5个最多遗漏 + 百位5个最多遗漏
// 组3: 百位6个最多遗漏 + 个位5个最多遗漏 + 十位5个最多遗漏
// ============================================================
function selectThreeGroups(missing, sixPos) {
  // sixPos: 哪个位置选6个最多遗漏，其他位置选5个最多遗漏
  const result = { d1: [], d2: [], d3: [] };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
    
    if (pos === sixPos) {
      // 这个位置选6个最多遗漏
      result[pos] = digits.slice(0, 6);
    } else {
      // 其他位置选5个最多遗漏
      result[pos] = digits.slice(0, 5);
    }
  }
  
  return result;
}

function generateOmissionNumbers3(data, periodIndex) {
  // 基于到periodIndex期的数据生成下一期的遗漏3位策略号码
  const missing = getMissingAtPeriod(data, periodIndex);
  const group1 = selectThreeGroups(missing, 'd1'); // 百位6个，其他5个
  const group2 = selectThreeGroups(missing, 'd2'); // 十位6个，其他5个
  const group3 = selectThreeGroups(missing, 'd1'); // 百位6个，其他5个
  
  const combinations = new Set();
  for (const g of [group1, group2, group3]) {
    for (const d1 of g.d1) {
      for (const d2 of g.d2) {
        for (const d3 of g.d3) {
          combinations.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  return Array.from(combinations).sort();
}

// ============================================================
// 【算法锁定】横加减 / 竖加减 4列（对齐 Excel「黄金三格」福表 G~R 列，每 3 列合并为 1 格）
// 横相减：|百-十|、|十-个|、|百-个|              （Excel G/H/I = ABS(B-C)、ABS(C-D)、ABS(B-D)）
// 横相加：(百+十)取尾、(十+个)取尾、(百+个)取尾  （Excel J/K/L = IF(x+y>=10,x+y-10,x+y)）
// 竖相减：|本期-上期|同位差（百/十/个）           （Excel M/N/O = ABS(B上-B本)）
// 竖相加：(本期+上期)同位取尾（百/十/个）         （Excel P/Q/R = IF(B上+B本>=10,...-10,...)）
// 数值口径由 enrichDataOptimized.js 的 hSub/hAdd/vSub/vAdd 提供，禁止在此重复计算
// 显示规则：与生号/连号/必出号一致，统一下移一行（当期行显示上一期算出的值）
// 合并规则：每组 3 个一位数连写为一个单元格（如 7,1,6 → 716），与生号/连号显示风格一致
// ============================================================
const HJS_COLS = [
  { field: 'hSub', th: '横相减', title: '横相减：|百-十| |十-个| |百-个| 三位连写' },
  { field: 'hAdd', th: '横相加', title: '横相加：(百+十) (十+个) (百+个) 取尾 三位连写' },
  { field: 'vSub', th: '竖相减', title: '竖相减：|本期百-上期百| |本期十-上期十| |本期个-上期个| 三位连写' },
  { field: 'vAdd', th: '竖相加', title: '竖相加：(本期百+上期百) (本期十+上期十) (本期个+上期个) 取尾 三位连写' },
];

// 渲染横加减/竖加减4个合并单元格；src 为空或该组无上期数据（全 null）时显示 -
function renderHjsCells(src) {
  return HJS_COLS.map((c, i) => {
    const arr = src ? src[c.field] : null;
    const has = arr && arr.some(v => v !== null && v !== undefined);
    return (
      <td key={'hjs' + i} title={c.title} style={{ fontWeight: 700, color: '#000' }}>
        {has ? arr.join('') : '-'}
      </td>
    );
  });
}

// ============================================================
// ============================================================
// 智取分解 / 博众分解 两列（表格最右侧）
// 【样式锁定】文本框宽随内容自适应（见 calcDecompBoxWidth）、高固定 40px（仅显示 2 行）、
//   overflow:hidden 禁滚动条、resize:none 禁拖拽缩放；有数据白底，无数据灰底
// 【交互锁定】已锁定期号 -> readOnly + 置灰 + 点击弹密码框；未锁定 -> 可编辑，
//   onChange 即时写回 App.jsx 并触发容错重算
// ============================================================
const DECOMP_COLS = [
  { kind: 'decomp', th: '智取分解', title: '智取分解：每期 20 组 5-5 分解，格式 XXXXX,XXXXX，组间换行' },
  { kind: 'bozhong', th: '博众分解', title: '博众分解：每期 20 组 5-5 分解，格式 XXXXX,XXXXX，组间换行' },
];

// 【格宽随内容自适应】用户要求“每一个格宽度要与数据参数紧挨着”：
//   文本框宽 = 该列最长一行字符数 × 等宽字体单字宽 + 边框内边距，
//   列宽由「文本框 + 4px 间隙 + 徽章」的 max-content 自然决定，
//   数据右缘贴住框右缘、徽章贴住格右缘，格内不留死白、列内不留死灰。
//   注意：不能依赖 textarea 默认 cols=20 的固有宽（约 129px），那会把列撑出死白。
const DECOMP_CHAR_W = 6.1;    // Consolas/Menlo 11px 的单个等宽字符宽
const DECOMP_BOX_CHROME = 8;  // 文本框 padding 3×2 + border 1×2
const DECOMP_MIN_W = 76;      // 空白态下限：刚好容下一行 XXXXX,XXXXX
const DECOMP_MAX_W = 240;     // 上限：防止手输超长行把表格撑爆
const calcDecompBoxWidth = (texts, issues) => {
  let maxLen = 0;
  for (const issue of issues) {
    const t = (texts && texts[issue]) || '';
    for (const line of t.split('\n')) if (line.length > maxLen) maxLen = line.length;
  }
  return Math.min(Math.max(maxLen * DECOMP_CHAR_W + DECOMP_BOX_CHROME, DECOMP_MIN_W), DECOMP_MAX_W);
};

/** 本期高倍：交集号码 */
function SelfPickModule({ issue, value, onChange }) {
  const [copiedZuLiu, setCopiedZuLiu] = useState(false);
  const [copiedZuSan, setCopiedZuSan] = useState(false);

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'zuLiu') {
        setCopiedZuLiu(true);
      } else {
        setCopiedZuSan(true);
      }
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
      if (type === 'zuLiu') {
        setCopiedZuLiu(true);
      } else {
        setCopiedZuSan(true);
      }
    }
  };

  const parsed = useMemo(() => {
    const tokens = (value || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    const seen = new Set();
    const nums = [];
    for (const t of tokens) {
      if (seen.has(t)) continue;
      seen.add(t);
      nums.push(t);
    }
    const zuLiuNums = nums.filter(n => new Set(n.split('')).size === 3);
    const zuSanNums = nums.filter(n => new Set(n.split('')).size !== 3);
    return { nums, zuLiuNums, zuSanNums, zuLiu: zuLiuNums.length, zuSan: zuSanNums.length };
  }, [value]);

  return (
    <div style={{ width: '100%', flex: 1, border: '2px solid #00838f', borderRadius: 6, background: '#e0f7fa', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: '#00838f', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>自选号码</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
        <textarea
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder="手动输入号码，空格/逗号/换行分隔"
          spellCheck={false}
          style={{
            width: '100%', boxSizing: 'border-box', height: 56, resize: 'none',
            fontSize: 12, fontFamily: 'Consolas,monospace', lineHeight: '16px',
            padding: 4, border: '1px solid #4dd0e1', borderRadius: 3,
            background: '#fff', color: '#00695c',
            overflowY: 'auto', cursor: 'text',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#00695c', fontWeight: 700 }}>
            共 {parsed.nums.length} 注
          </span>
          <span style={{ fontSize: 11, color: '#00838f' }}>组六{parsed.zuLiu}/组三{parsed.zuSan}</span>
        </div>
        {parsed.nums.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flex: '1 1 0', minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px dashed #4dd0e1', borderRadius: 3, background: '#fff', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '2px 6px', background: '#e0f2f1', borderBottom: '1px solid #b2dfdb' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#00695c' }}>组六 {parsed.zuLiu} 注</span>
                <button
                  onClick={() => handleCopy(parsed.zuLiuNums.join(' '), 'zuLiu')}
                  style={{
                    fontSize: 11, padding: '1px 6px', cursor: 'pointer',
                    border: `1px solid ${copiedZuLiu ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
                    background: copiedZuLiu ? '#c8e6c9' : '#fff', color: copiedZuLiu ? '#1b5e20' : '#555',
                    fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
                  }}
                >
                  {copiedZuLiu ? '✓' : '复制'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#00695c', fontFamily: 'Consolas,monospace', lineHeight: '18px', wordBreak: 'break-all', padding: 4, overflowY: 'auto', flex: '1 1 0', minHeight: 0 }}>
                {parsed.zuLiuNums.join(' ') || '—'}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px dashed #ef9a9a', borderRadius: 3, background: '#fff', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '2px 6px', background: '#ffebee', borderBottom: '1px solid #ffcdd2' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#c62828' }}>组三 {parsed.zuSan} 注</span>
                <button
                  onClick={() => handleCopy(parsed.zuSanNums.join(' '), 'zuSan')}
                  style={{
                    fontSize: 11, padding: '1px 6px', cursor: 'pointer',
                    border: `1px solid ${copiedZuSan ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
                    background: copiedZuSan ? '#c8e6c9' : '#fff', color: copiedZuSan ? '#1b5e20' : '#555',
                    fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
                  }}
                >
                  {copiedZuSan ? '✓' : '复制'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#c62828', fontFamily: 'Consolas,monospace', lineHeight: '18px', wordBreak: 'break-all', padding: 4, overflowY: 'auto', flex: '1 1 0', minHeight: 0 }}>
                {parsed.zuSanNums.join(' ') || '—'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function FullDataTable({
  data, showCount, setShowCount, trialDigits, onTrialChange,
  decompTexts = {}, bozhongTexts = {},
  setDecompText, setBozhongText,
  lockedDecomp, lockedBozhong,
  onRequestUnlock,
  // App.jsx 基于 baseData 算出的下期待开奖期号；分解录入框必须用它，
  // 不能用本文件预留行内部的 nextIssue——后者基于 enrichedData，
  // 存在测试行时会多算一期，导致分解条件对错期号
  nextIssue: appNextIssue,
  // 智取、博众分解按钮（从 DecompRongCuoPanel 移入）
  onDecompSubmit,
  submitFlash,
  // 自选号码（从 DecompRongCuoPanel 移入右侧面板）
  selfPickIssue,
  selfPickValue,
  onSelfPickChange,
}) {
  const [copiedIssues, setCopiedIssues] = useState(new Set());
  
  const handleCopy = async (issue, numbers) => {
    try {
      await navigator.clipboard.writeText(numbers.join(' '));
      setCopiedIssues(prev => new Set(prev).add(issue));
    } catch (err) {
      console.error('复制失败:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = numbers.join(' ');
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedIssues(prev => new Set(prev).add(issue));
      } catch (fallbackErr) {
        console.error('Fallback复制也失败:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };
  
  const displayData = data.slice(-showCount)
  // 首行显示项在完整数据中的上一期（下移一行列在首行也要显示上期值，而非自身）
  const prevOfFirstDisplay = data.length - displayData.length > 0 ? data[data.length - displayData.length - 1] : null
  const isTrialRow = (item) => trialDigits && trialDigits.every(d => d !== null) && data.length > 0 && item.issue === data[data.length - 1].issue

  // 计算遗漏策略号码（窗口化计算，只计算显示的期数）
  const omissionNumbersMap = useMemo(() => {
    const map = new Map();
    const map2 = new Map();
    const map3 = new Map();
    const map4 = new Map(); // 三个策略的并集
    
    // 只计算displayData中的期数
    for (const item of displayData) {
      const idx = data.indexOf(item);
      if (idx < 0) continue;
      
      const issue = item.issue;
      const numbers = generateOmissionNumbers(data, idx + 1);
      const numbers2 = generateOmissionNumbers2(data, idx + 1);
      const numbers3 = generateOmissionNumbers3(data, idx + 1);
      map.set(issue, numbers);
      map2.set(issue, numbers2);
      map3.set(issue, numbers3);
      
      // 合并三个策略的号码（取并集）
      const union = new Set([...numbers, ...numbers2, ...numbers3]);
      map4.set(issue, Array.from(union).sort());
    }
    return { map, map2, map3, map4 };
  }, [data, displayData]);

  // 往期各期「最小容错等级」徽章数据源：仅对已开奖行（d1/d2/d3 有值）且该期分解非空时计算；
  //   下期预留行尚无开奖号 → 不产出徽章，等开奖数据更新、该行转为正常已开奖行后才显示
  const verifyMaps = useMemo(() => {
    const dm = new Map();
    const bz = new Map();
    for (const item of displayData) {
      if (item.d1 === undefined || item.d2 === undefined || item.d3 === undefined) continue;
      const gd = parseDecompGroups((decompTexts && decompTexts[item.issue]) || '');
      if (gd.length > 0) { const v = verifyDraw(item, gd); if (v) dm.set(item.issue, v); }
      const gb = parseDecompGroups((bozhongTexts && bozhongTexts[item.issue]) || '');
      if (gb.length > 0) { const v = verifyDraw(item, gb); if (v) bz.set(item.issue, v); }
    }
    return { dm, bz };
  }, [displayData, decompTexts, bozhongTexts]);

  // 参与列宽计算的期号：所有展示行 + 下期预留行（预留行也可能已录入分解）
  const decompIssues = useMemo(() => {
    const arr = displayData.map(i => i.issue);
    const nx = appNextIssue || (data.length ? String(Number(data[data.length - 1].issue) + 1) : null);
    if (nx && !arr.includes(nx)) arr.push(nx);
    return arr;
  }, [displayData, data, appNextIssue]);
  const decompBoxW = useMemo(() => calcDecompBoxWidth(decompTexts, decompIssues), [decompTexts, decompIssues]);
  const bozhongBoxW = useMemo(() => calcDecompBoxWidth(bozhongTexts, decompIssues), [bozhongTexts, decompIssues]);

  // 渲染一个分解文本框单元格；hasData 决定白底/灰底，locked 决定只读与点击解锁
  const renderDecompCell = (kind, issue, title) => {
    const texts = kind === 'decomp' ? decompTexts : bozhongTexts;
    const setText = kind === 'decomp' ? setDecompText : setBozhongText;
    const lockedSet = kind === 'decomp' ? lockedDecomp : lockedBozhong;
    const value = (texts && texts[issue]) || '';
    const hasData = value.trim().length > 0;
    const locked = !!(lockedSet && lockedSet.has(issue));
    const v = (kind === 'decomp' ? verifyMaps.dm : verifyMaps.bz).get(issue);
    const boxW = kind === 'decomp' ? decompBoxW : bozhongBoxW;
    return (
      <td key={'dc_' + kind} style={{ padding: 2, background: locked ? '#eceff1' : (hasData ? '#fff' : '#e0e0e0') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <textarea
          readOnly={locked}
          value={value}
          title={title}
          placeholder=""
          onChange={e => { if (setText) setText(issue, e.target.value); }}
          onClick={locked && onRequestUnlock ? () => onRequestUnlock(kind, issue) : undefined}
          style={{
            width: boxW, minWidth: boxW, flex: '1 1 auto', height: 40, resize: 'none', overflow: 'hidden', display: 'block',
            fontSize: 11, lineHeight: '19px', fontFamily: 'Consolas,Menlo,monospace',
            padding: '0 3px', boxSizing: 'border-box', borderRadius: 3,
            border: `1px solid ${locked ? '#cfd8dc' : (hasData ? '#90caf9' : '#bdbdbd')}`,
            background: locked ? '#eceff1' : (hasData ? '#fff' : '#eee'),
            color: locked ? '#78909c' : '#222',
            cursor: locked ? 'pointer' : 'text',
            whiteSpace: 'pre',
          }}
        />
        {v && (
          <span style={{
            fontSize: 15, padding: '2px 6px', borderRadius: 3, border: '1px solid #e0e0e0',
            background: '#fff', whiteSpace: 'nowrap', minWidth: 70, textAlign: 'left',
            color: v.type === '组三' ? '#c62828' : '#000',
            fontWeight: v.type === '组三' ? 700 : 600,
          }} title={`${issue} 期开奖最小容错等级（${v.type}）`}>
            {v.type}（容错{v.level}）
          </span>
        )}
        </div>
      </td>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <select value={showCount} onChange={e => setShowCount(+e.target.value)}
            style={{ background: 'var(--bg-table)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px' }}>
            <option value={10}>最近10期</option>
            <option value={20}>最近20期</option>
            <option value={30}>最近30期</option>
            <option value={50}>最近50期</option>
            <option value={100}>最近100期</option>
            <option value={500}>最近500期</option>
            <option value={1000}>最近1000期</option>
            <option value={data.length}>全部</option>
          </select>
        </div>
        <style>{`input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } input[type=number] { -moz-appearance: textfield; } textarea::-webkit-scrollbar { width: 0; height: 0; } textarea { scrollbar-width: none; -ms-overflow-style: none; }`}</style>
        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
          <div className="table-container" style={{ maxHeight: '700px', display: 'inline-block' }}>
            <table className="data-table" style={{ fontSize: 17 }}>
            <thead>
              <tr>
                <th>期数</th>
                <th style={{ borderBottom: '3px solid #a8d8ea' }}>百</th>
                <th style={{ borderBottom: '3px solid #a8d8ea' }}>十</th>
                <th style={{ borderBottom: '3px solid #a8d8ea' }}>个</th>
                <th>和值</th>
                <th>跨度</th>
                {/* 横加减/竖加减4列（Excel G~R 每3列合并为1格） */}
                {HJS_COLS.map((c, i) => (
                  <th key={'hjsTh' + i} title={c.title}>{c.th}</th>
                ))}
                <th>生号</th>
                <th>连号</th>
                <th>必出号</th>
                {/* 智取分解 / 博众分解 两列 */}
                {DECOMP_COLS.map(c => (
                  <th key={'dcTh_' + c.kind} title={c.title}
                    style={{ borderBottom: `3px solid ${c.kind === 'decomp' ? '#f9a825' : '#43a047'}` }}>
                    {c.th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((item, idx) => {
                // 组三：百十个中有任意两个相同
                const isZuSan = item.d1 === item.d2 || item.d2 === item.d3 || item.d1 === item.d3;
                const digitStyle = isZuSan ? { color: 'red', fontWeight: 700, fontSize: 20 } : { color: '#000', fontSize: 20 };
                // 生号/连号/必出号/参考一/参考二/胆码：显示下移一行，用上期数据验证当期开奖号
                const prevData = idx > 0 ? displayData[idx - 1] : (prevOfFirstDisplay || item); // 首行取完整数据中的上一期
                // 和值/跨度显示当期实际数据，与前后一期比较重复则蓝色
                const prevItem = idx > 0 ? displayData[idx - 1] : null;
                const nextItem = idx < displayData.length - 1 ? displayData[idx + 1] : null;
                const sumColor = ((prevItem && item.sum === prevItem.sum) || (nextItem && item.sum === nextItem.sum)) ? '#3498db' : '#000';
                const spanColor = ((prevItem && item.span === prevItem.span) || (nextItem && item.span === nextItem.span)) ? '#3498db' : '#000';
                // 当期开奖号（用于验证）
                const curDigits = new Set([item.d1, item.d2, item.d3]);
                // 生号/连号命中判定：与当期开奖号对比
                const getShengLianStyle = (digits) => {
                  if (!curDigits || digits.length === 0) return { color: '#fff', fontWeight: 600, background: '#1e8449' };
                  const uniqueCur = [...curDigits];
                  const hitCount = digits.filter(d => uniqueCur.includes(d)).length;
                  // 全部包含（组三去重后2个数字也算全部包含）→ 红色
                  if (hitCount === uniqueCur.length) return { color: 'red', fontWeight: 700, background: '#1e8449' };
                  // 出现1-2次 → 黄色
                  if (hitCount >= 1) return { color: 'yellow', fontWeight: 600, background: '#1e8449' };
                  // 一个都没有 → 白底蓝字
                  return { color: '#3498db', fontWeight: 600, background: '#fff' };
                };
                const shengHaoDigits = prevData.shenghao.filter(v => v !== -1);
                const lianHaoDigits = prevData.lianhao.filter(v => v !== -1);
                const shengHaoStyle = getShengLianStyle(shengHaoDigits);
                const lianHaoStyle = getShengLianStyle(lianHaoDigits);
                const getHitStyle = (digits, baseBg, textColor) => {
                  if (!curDigits) return { color: textColor || '#000', fontWeight: 600, background: baseBg };
                  const hits = digits.filter(d => curDigits.has(d)).length;
                  if (hits === 0) return { color: '#3498db', fontWeight: 600, background: '#fff' };
                  // 组三时去重后只有2个数字，全部命中即红色
                  if (hits === curDigits.size) return { color: 'red', fontWeight: 700, background: baseBg };
                  return { color: textColor || '#000', fontWeight: 600, background: baseBg };
                };
                const mustOutDigits = prevData.mustOutNums.filter(v => v !== -1);
                const mustOutStyle = getHitStyle(mustOutDigits, '#1e8449', '#fff');
                return (
                <tr key={item.issue} style={isTrialRow(item) ? { background: '#fffde7' } : {}}>
                  <td className="issue" style={{ color: '#000', fontWeight: isTrialRow(item) ? 700 : 400 }}>{'20' + item.issue}{isTrialRow(item) ? ' (测试)' : ''}</td>
                  {isTrialRow(item) ? (
                    <>
                      <td><input type="number" min="0" max="9" value={trialDigits[0] ?? ''} onChange={e => { const v = e.target.value; onTrialChange([v === '' ? null : Math.min(9, Math.max(0, Number(v))), trialDigits[1], trialDigits[2]]); }} style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 700, border: '2px solid #f39c12', borderRadius: 4, background: '#fff' }} /></td>
                      <td><input type="number" min="0" max="9" value={trialDigits[1] ?? ''} onChange={e => { const v = e.target.value; onTrialChange([trialDigits[0], v === '' ? null : Math.min(9, Math.max(0, Number(v))), trialDigits[2]]); }} style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 700, border: '2px solid #f39c12', borderRadius: 4, background: '#fff' }} /></td>
                      <td><input type="number" min="0" max="9" value={trialDigits[2] ?? ''} onChange={e => { const v = e.target.value; onTrialChange([trialDigits[0], trialDigits[1], v === '' ? null : Math.min(9, Math.max(0, Number(v)))]); }} style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 700, border: '2px solid #f39c12', borderRadius: 4, background: '#fff' }} /></td>
                    </>
                  ) : (
                    <>
                      <td className="number" style={{ ...digitStyle, background: '#e8f4fd' }}>{item.d1}</td>
                      <td className="number" style={{ ...digitStyle, background: '#e8f4fd' }}>{item.d2}</td>
                      <td className="number" style={{ ...digitStyle, background: '#e8f4fd' }}>{item.d3}</td>
                    </>
                  )}
                  <td style={{ fontWeight: 700, color: sumColor }}>{item.sum}</td>
                  <td style={{ fontWeight: 700, color: spanColor }}>{item.span}</td>
                  {/* 横加减/竖加减：下移一行，显示上期算出的值（与生号/连号/必出号同一规则） */}
                  {renderHjsCells(prevData)}
                  {/* 生号 */}
                  <td style={{ ...shengHaoStyle }}>
                    {shengHaoDigits.length > 0 ? shengHaoDigits.join('') : '-'}
                  </td>
                  {/* 连号 */}
                  <td style={{ ...lianHaoStyle }}>
                    {lianHaoDigits.length > 0 ? lianHaoDigits.join('') : '-'}
                  </td>
                  {/* 必出号 */}
                  <td style={mustOutStyle}>
                    {mustOutDigits.length > 0 ? mustOutDigits.join('') : '-'}
                  </td>
                  {/* 智取分解 / 博众分解：按期号匹配展示对应 20 组分解参数 */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, item.issue, c.title))}
                  {/* 杀百十合、杀百个合、杀十个合三列已彻底删除 - 用户要求 */}
                </tr>
                );
              })}
              {/* 下期预留行 */}
              {(() => {
                const lastItem = data[data.length - 1];
                const nextIssue = String(Number(lastItem.issue) + 1);
                const isSynced = data.some(d => d.issue === nextIssue);
                return (
                <tr style={{ background: '#f0f8ff' }}>
                  <td className="issue" style={{ color: isSynced ? '#000' : '#e74c3c', fontWeight: 700 }}>{'20' + nextIssue}</td>
                  <td style={{ background: '#e8f4fd' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  {/* 横加减/竖加减 - 预留行显示最后一期算出的值（与生号/连号/必出号一致） */}
                  {renderHjsCells(lastItem)}
                  {/* 生号 - 预留行显示最后一期数据 */}
                  <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                    {(() => { const d = lastItem.shenghao.filter(v => v !== -1); return d.length > 0 ? d.join('') : '-'; })()}
                  </td>
                  {/* 连号 - 预留行显示最后一期数据 */}
                  <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                    {(() => { const d = lastItem.lianhao.filter(v => v !== -1); return d.length > 0 ? d.join('') : '-'; })()}
                  </td>
                  {/* 必出号 - 预留行显示最后一期数据 */}
                  <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                    {(() => { const d = lastItem.mustOutNums.filter(v => v !== -1); return d.length > 0 ? d.join('') : '-'; })()}
                  </td>
                  {/* 智取分解 / 博众分解 - 预留行：下期分解条件录入框（点按钮后锁定，密码解锁再编辑） */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, appNextIssue || nextIssue, c.title))}
                  {/* 杀百十合、杀百个合、杀十个合三列预留行已彻底删除 - 用户要求 */}
                </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
        {/* 右侧面板：自选号码 + 智取博众分解按钮 */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex' }}>
            <SelfPickModule issue={selfPickIssue} value={selfPickValue} onChange={onSelfPickChange} />
          </div>
          <button
            onClick={onDecompSubmit}
            title="保存智取/博众下期分解数据，容错结果自动重算"
            style={{
              width: '100%', padding: '10px 22px', fontSize: 16, fontWeight: 800, cursor: 'pointer',
              border: '2px solid #f57f17', borderRadius: 6, background: '#f9a825', color: '#fff',
              transform: submitFlash ? 'scale(1.02)' : 'scale(1)',
              boxShadow: submitFlash ? '0 0 20px rgba(249,168,37,0.8)' : 'none',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            智取、博众分解
          </button>
          <a
            href="https://sports.sina.com.cn/lottery/video/fcopen/index.shtml"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', width: '100%', padding: '10px 22px', fontSize: 16, fontWeight: 800,
              textAlign: 'center', textDecoration: 'none', cursor: 'pointer',
              border: '2px solid #1976d2', borderRadius: 6, background: '#1976d2', color: '#fff',
              boxSizing: 'border-box',
            }}
          >
            开奖直播
          </a>
        </div>
        </div>
      </div>
    </div>
  )
}

export default FullDataTable
