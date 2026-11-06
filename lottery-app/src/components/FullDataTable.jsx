import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { parseDecompGroups, verifyDraw, computeRongCuo } from '../utils/decompRongCuo.js'
import { verifyDuanZuDraw, computeDuanZuRongCuo } from '../utils/duanZuRongCuo.js'
import { buildAddSubIndexPro, getAddSubNumbersPro } from '../utils/addSubPool.js'
import { generateByBrokenGroups } from '../utils/brokenGroup.js'

// 可点击注数组件：独立管理复制状态，避免点击时整个表格重渲染
function ClickableCount({ count, hit, numbers, color }) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    setCopied(true);
    const text = numbers.join(' ');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('clipboard API not available');
      }
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (fallbackErr) {
        console.error('复制失败:', fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  }, [numbers]);

  const baseColor = hit ? '#1b5e20' : (hit === false ? '#b71c1c' : (color || '#666'));
  return (
    <span
      onClick={handleClick}
      style={{ fontWeight: 800, fontSize: 13, color: baseColor, cursor: 'pointer', position: 'relative', userSelect: 'none', display: 'inline-block' }}
      title="点击复制号码"
    >
      {count}注
      {copied && (
        <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', fontSize: 20, color: '#c62828', fontWeight: 900, background: 'rgba(255, 200, 200, 0.85)', borderRadius: 4, padding: '0 4px', lineHeight: '24px' }}>✓</span>
      )}
    </span>
  );
}

// 分解文本框组件：独立管理本地状态，避免每次按键触发整个表格重渲染
const DecompTextarea = React.memo(function DecompTextarea({ value, locked, hasData, boxW, title, kind, issue, setText, onRequestUnlock }) {
  const [localValue, setLocalValue] = useState(value);
  const textareaRef = useRef(null);
  const prevValueRef = useRef(value);

  // 仅当外部值真正变化时同步（如从 Gist 加载新数据），用户输入时不重置
  useEffect(() => {
    if (prevValueRef.current !== value) {
      prevValueRef.current = value;
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = useCallback((e) => {
    setLocalValue(e.target.value);
  }, []);

  const handleBlur = useCallback(() => {
    prevValueRef.current = localValue;
    if (setText && localValue !== value) {
      setText(issue, localValue);
    }
  }, [setText, issue, localValue, value]);

  const handleClick = useCallback(() => {
    if (locked && onRequestUnlock) {
      onRequestUnlock(kind, issue);
    } else if (!locked && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [locked, onRequestUnlock, kind, issue]);

  return (
    <textarea
      ref={textareaRef}
      readOnly={locked}
      value={localValue}
      title={title}
      placeholder=""
      onChange={handleChange}
      onBlur={handleBlur}
      onClick={handleClick}
      style={{
        width: boxW, minWidth: boxW, flex: '0 0 auto', height: 40, resize: 'none', overflow: 'hidden', display: 'block',
        fontSize: 11, lineHeight: '19px', fontFamily: 'Consolas,Menlo,monospace',
        padding: '0 3px', boxSizing: 'border-box', borderRadius: 3,
        border: `1px solid ${locked ? '#cfd8dc' : (hasData ? '#90caf9' : '#bdbdbd')}`,
        background: locked ? '#eceff1' : (hasData ? '#fff' : '#eee'),
        color: locked ? '#78909c' : '#222',
        cursor: locked ? 'pointer' : 'text',
        whiteSpace: 'pre',
      }}
    />
  );
});

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

// 横相减/横相加/竖相减/竖相加 四列开关：2026-11-01 用户要求隐藏。
// 只隐藏表格展示，数据照常计算（加减号码候选池依赖横相加与横相减）；改回 true 即恢复显示
const SHOW_HJS_COLS = false;

// 生号/连号/必出号 三列开关：2026-11-04 用户要求隐藏
const SHOW_SLBC_COLS = false;

const SHOW_ADDSUB_PRO_COL = true; // 隔一用二增强列

// 容错10 / 容错9 / 容错 / 交集号码 四列开关：2026-11-04 用户要求隐藏
const SHOW_RC10_COL = true;
const SHOW_RC9_COL = true;
const SHOW_RC_COL = true;
const SHOW_JJ_COL = true;

// 综合列开关：2026-11-04 用户要求删除
const SHOW_ZONGHE_COL = true;

// 交集列开关：2026-11-04 用户要求删除
const SHOW_JIAOJI_COL = true;

// 祝君中奖列开关：2026-11-04 用户要求新增
const SHOW_JJRONGCUO_COL = true;

// 断组容错列开关：2026-11-04 用户要求新增（智取断组+博众断组容错2合并）
const SHOW_DUANZU_RC_COL = true;

// 断组334列开关：2026-11-04 用户要求新增
const SHOW_DUANZU_COL = false; // 已迁移到 DECOMP_COLS 的 duanzuZQ/duanzuBZ

// 前1期列开关：2026-11-06 用户要求新增（采用前一期分解数据容错10验证当期）
const SHOW_QIAN1QI_COL = true;

// 渲染横加减/竖加减4个合并单元格；src 为空或该组无上期数据（全 null）时显示 -
function renderHjsCells(src) {
  if (!SHOW_HJS_COLS) return [];
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
  { kind: 'duanzuZQ', th: '智取断组', title: '智取断组：每期 20 组 334 断组，格式 307,189,6245（简化）或 012/345/6789,013/245/6789,014/235/6789（完整），组间换行' },
  { kind: 'duanzuBZ', th: '博众断组', title: '博众断组：每期 20 组 334 断组，格式 307,189,6245（简化）或 012/345/6789,013/245/6789,014/235/6789（完整），组间换行' },
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

/** 号码输入卡（左：直选大底，右：精选组选号码）：手动输入框
 *  左卡（大底）是直选号码源，供下方直选高倍与分解容错使用；
 *  右卡（精选）填组选号码，展开成直选号码后从大底剔除并进保本投注 */
function SelfPickInputModule({ issue, title, value, onChange, accent = '#00838f', bg = '#e0f7fa', badgeColor = '#00695c', border = '#4dd0e1', titleSize = 18, placeholder = '手动输入号码，空格/逗号/换行分隔' }) {
  const count = useMemo(() => parsePickNumbers(value).length, [value]);

  return (
    <div style={{ width: '100%', border: `2px solid ${accent}`, borderRadius: 6, background: bg, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: accent, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: titleSize, fontWeight: 800 }}>{title}</span>
        <span style={{
          fontSize: 12, fontWeight: 800, color: badgeColor,
          background: '#fff', borderRadius: 10, padding: '1px 8px', whiteSpace: 'nowrap',
        }}>
          {count} 注
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.9, marginLeft: 'auto' }}>
          {issue ? `${issue} 期` : '—'}
        </span>
      </div>
      <div style={{ padding: 8 }}>
        <textarea
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          style={{
            display: 'block', width: '100%', boxSizing: 'border-box', height: 72, resize: 'none',
            fontSize: 12, fontFamily: 'Consolas,monospace', lineHeight: '16px',
            padding: 4, border: `1px solid ${border}`, borderRadius: 3,
            background: '#fff', color: badgeColor,
            overflowY: 'auto', cursor: 'text',
          }}
        />
      </div>
    </div>
  );
}

/** 三位数字的全排列（去重后交给调用方的 Set）：组六 6 注、组三 3 注、豹子 1 注 */
const permute3 = (num) => {
  const d = num.split('');
  const out = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (j === i) continue;
      out.push(d[i] + d[j] + d[3 - i - j]);
    }
  }
  return out;
};

export const parsePickNumbers = (text) => {
  const seen = new Set();
  const nums = [];
  for (const t of (text || '').split(/[\s,，;；]+/)) {
    if (!/^\d{3}$/.test(t) || seen.has(t)) continue;
    seen.add(t);
    nums.push(t);
  }
  return nums;
};

/** 组选号码展开为直选号码；同一组选的不同写法（012 与 210）展开结果相同，自动只留一份 */
export const expandZuxuanToZhixuan = (tokens) => {
  const out = new Set();
  for (const t of tokens) for (const p of permute3(t)) out.add(p);
  return out;
};

const BAOZI_NUMS = ['000','111','222','333','444','555','666','777','888','999'];

/** 直选高倍模块：手动录入模式，作为分解号码池 */
function ZhiXuanGaoBeiModule({ issue, value, onChange }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
  };

  const count = useMemo(() => parsePickNumbers(value).length, [value]);

  return (
    <div style={{ width: '100%', flex: 1, border: '2px solid #00838f', borderRadius: 6, background: '#e0f7fa', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: '#00838f', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>直选高倍</span>
          <span style={{
            fontSize: 12, fontWeight: 800, color: '#00695c',
            background: '#fff', borderRadius: 10, padding: '1px 8px', whiteSpace: 'nowrap',
          }}>
            {count} 注
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期` : '—'}
        </span>
      </div>
      <div style={{ padding: 8, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <textarea
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder="手动输入直选号码，作为分解号码池。空格/逗号/换行分隔"
          spellCheck={false}
          style={{
            display: 'block', width: '100%', boxSizing: 'border-box', height: 80, resize: 'none',
            fontSize: 12, fontFamily: 'Consolas,monospace', lineHeight: '16px',
            padding: 4, border: '1px solid #4dd0e1', borderRadius: 3,
            background: '#fff', color: '#00695c',
            overflowY: 'auto', cursor: 'text', flex: 1,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={handleCopy}
            disabled={!value}
            style={{
              fontSize: 11, padding: '1px 6px', cursor: value ? 'pointer' : 'default',
              border: `1px solid ${copied ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
              background: copied ? '#c8e6c9' : '#fff', color: copied ? '#1b5e20' : '#555',
              fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
            }}
          >
            {copied ? '✓' : '复制'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FullDataTable({
  data, showCount, setShowCount, trialDigits, onTrialChange,
  // 加减号码需要回溯200期历史，而 data 已被 enrichData 窗口化，故另传完整数据
  fullData,
  decompTexts = {}, bozhongTexts = {}, duanZuZQTexts = {}, duanZuBZTexts = {},
  setDecompText, setBozhongText, setDuanZuZQText, setDuanZuBZText,
  lockedDecomp, lockedBozhong, lockedDuanZuZQ, lockedDuanZuBZ,
  onRequestUnlock,
  // App.jsx 基于 baseData 算出的下期待开奖期号；分解录入框必须用它，
  // 不能用本文件预留行内部的 nextIssue——后者基于 enrichedData，
  // 存在测试行时会多算一期，导致分解条件对错期号
  nextIssue: appNextIssue,
  // 智取、博众分解按钮（从 DecompRongCuoPanel 移入）
  onDecompSubmit,
  submitFlash,
  // 直选大底（从 DecompRongCuoPanel 移入右侧面板）
  // 左卡「直选大底」= selfPick*，是直选号码源；右卡「精选」= selfPickJx*，填组选号码，展开后从大底剔出并进保本投注
  selfPickIssue,
  selfPickValue,
  onSelfPickChange,
  selfPickJxValue,
  onSelfPickJxChange,
  // 直选高倍（手动录入模式，作为分解号码池）
  zhiXuanGaoBeiValue,
  onZhiXuanGaoBeiChange,
  // 分解容错「无容错」号码（智取∪博众），并入保本投注
  wuRongCuoNumbers = [],
}) {

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

  // 加减号码：各期用其前 ADD_SUB_LOOKBACK 期的横相加∪横相减候选池验证当期开奖号
  // poolData = 完整历史 + 试验行（试验行只存在于窗口化的 data 末尾）
  const poolData = useMemo(() => {
    const base = fullData && fullData.length ? fullData : data;
    const known = new Set(base.map(d => d.issue));
    const extra = data.filter(d => !known.has(d.issue));
    return extra.length ? [...base, ...extra] : base;
  }, [fullData, data]);
  const addSubIndexPro = useMemo(() => buildAddSubIndexPro(poolData), [poolData]);
  const issueIndexMap = useMemo(() => {
    const m = new Map();
    poolData.forEach((d, i) => { if (!m.has(d.issue)) m.set(d.issue, i); });
    return m;
  }, [poolData]);
  // 下期预留行：用最后一期往前200期建池，尚无开奖号故只出注数与复制，不出对错
  const tailAddSubNumbersPro = useMemo(() => getAddSubNumbersPro(poolData, poolData.length), [poolData]);

  // 计算任意期号的综合列候选池：交集号码 - 容错列（对称差集） - 容错10列
  const computeZongHeNumbers = (issue) => {
    if (!issue) return [];
    const decompGroups = parseDecompGroups((decompTexts && decompTexts[issue]) || '');
    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
    const decompRc9 = [];
    if (decompResult && decompResult.buckets) {
      for (let i = 1; i <= 9; i++) {
        if (decompResult.buckets[i]) decompRc9.push(...decompResult.buckets[i]);
      }
    }
    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[issue]) || '');
    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
    const bozhongRc9 = [];
    if (bozhongResult && bozhongResult.buckets) {
      for (let i = 1; i <= 9; i++) {
        if (bozhongResult.buckets[i]) bozhongRc9.push(...bozhongResult.buckets[i]);
      }
    }
    // 交集号码 = 智取容错1~9 ∩ 博众容错1~9
    const bozhongSet = new Set(bozhongRc9);
    const intersection = decompRc9.filter(n => bozhongSet.has(n));
    // 容错列 = 对称差集 = (A ∪ B) - (A ∩ B)
    const intersectionSet = new Set(intersection);
    const union = [...new Set([...decompRc9, ...bozhongRc9])];
    const symmetricDiff = union.filter(n => !intersectionSet.has(n));
    const symmetricDiffSet = new Set(symmetricDiff);
    // 容错9列 = 智取errorCount===9 ∪ 博众errorCount===9
    const decompRc9Only = decompResult && decompResult.buckets && decompResult.buckets[9] ? decompResult.buckets[9] : [];
    const bozhongRc9Only = bozhongResult && bozhongResult.buckets && bozhongResult.buckets[9] ? bozhongResult.buckets[9] : [];
    const rc9UnionSet = new Set([...decompRc9Only, ...bozhongRc9Only]);
    // 综合列 = 交集号码 - 容错列 - 容错9列
    return intersection
      .filter(n => !symmetricDiffSet.has(n))
      .filter(n => !rc9UnionSet.has(n))
      .sort();
  };

  // 下期综合列候选池
  const tailZongHeNumbers = useMemo(() => computeZongHeNumbers(appNextIssue), [appNextIssue, decompTexts, bozhongTexts]);

  // 计算任意期号的祝君中奖列候选池：交集号码 - 容错列 - 容错10列
  const computeZhuJunZhongJiangNumbers = (issue) => {
    if (!issue) return [];

    // 1. 计算交集号码（智取组六1~9，博众组六1~9，组三均2~12）
    const decompGroups = parseDecompGroups((decompTexts && decompTexts[issue]) || '');
    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
    const decompZu6 = [];
    const decompZu3 = [];
    if (decompResult && decompResult.buckets) {
      for (let i = 1; i <= 9; i++) {
        if (decompResult.buckets[i]) decompZu6.push(...decompResult.buckets[i]);
      }
      for (let i = 2; i <= 12; i++) {
        if (decompResult.buckets[i]) decompZu3.push(...decompResult.buckets[i]);
      }
    }

    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[issue]) || '');
    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
    const bozhongZu6 = [];
    const bozhongZu3 = [];
    if (bozhongResult && bozhongResult.buckets) {
      for (let i = 1; i <= 9; i++) {
        if (bozhongResult.buckets[i]) bozhongZu6.push(...bozhongResult.buckets[i]);
      }
      for (let i = 2; i <= 12; i++) {
        if (bozhongResult.buckets[i]) bozhongZu3.push(...bozhongResult.buckets[i]);
      }
    }

    // 交集号码 = 智取 ∩ 博众（按类型过滤）
    const decompZu6Set = new Set(decompZu6);
    const bozhongZu6Set = new Set(bozhongZu6);
    const decompZu3Set = new Set(decompZu3);
    const bozhongZu3Set = new Set(bozhongZu3);
    const decompAll = [...new Set([...decompZu6, ...decompZu3])];
    const bozhongAll = [...new Set([...bozhongZu6, ...bozhongZu3])];
    const bozhongAllSet = new Set(bozhongAll);
    const jiaojiNumbers = decompAll.filter(n => {
      if (!bozhongAllSet.has(n)) return false;
      const isZu3 = n[0] === n[1] || n[1] === n[2] || n[0] === n[2];
      if (isZu3) {
        return decompZu3Set.has(n) && bozhongZu3Set.has(n);
      } else {
        return decompZu6Set.has(n) && bozhongZu6Set.has(n);
      }
    });

    // 2. 计算容错列（1~12对称差集）
    const decompRc12 = [];
    const bozhongRc12 = [];
    if (decompResult && decompResult.buckets) {
      for (let i = 1; i <= 12; i++) {
        if (decompResult.buckets[i]) decompRc12.push(...decompResult.buckets[i]);
      }
    }
    if (bozhongResult && bozhongResult.buckets) {
      for (let i = 1; i <= 12; i++) {
        if (bozhongResult.buckets[i]) bozhongRc12.push(...bozhongResult.buckets[i]);
      }
    }
    const decompRc12Set = new Set(decompRc12);
    const bozhongRc12Set = new Set(bozhongRc12);
    const rcIntersection = decompRc12.filter(n => bozhongRc12Set.has(n));
    const rcIntersectionSet = new Set(rcIntersection);
    const rcUnion = [...new Set([...decompRc12, ...bozhongRc12])];
    const rongCuoNumbers = rcUnion.filter(n => !rcIntersectionSet.has(n));
    const rongCuoSet = new Set(rongCuoNumbers);

    // 3. 计算容错10列（buckets[10]）
    const decompRc10 = decompResult && decompResult.buckets && decompResult.buckets[10] ? decompResult.buckets[10] : [];
    const bozhongRc10 = bozhongResult && bozhongResult.buckets && bozhongResult.buckets[10] ? bozhongResult.buckets[10] : [];
    const rc10Set = new Set([...decompRc10, ...bozhongRc10]);

    // 交集容错 = 交集号码 - 容错列 - 容错10列
    return jiaojiNumbers
      .filter(n => !rongCuoSet.has(n))
      .filter(n => !rc10Set.has(n))
      .sort();
  };

  const renderAddSubProCell = (issue, index) => {
    if (!SHOW_ADDSUB_PRO_COL) return null;
    const rec = addSubIndexPro.get(issue);
    if (!rec) {
      return <td key="addSubPro" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }
    return (
      <td key="addSubPro" style={{ padding: '2px 4px', background: rec.hit ? '#e8f5e9' : '#ffebee' }}>
        {<ClickableCount count={rec.size} hit={rec.hit} numbers={getAddSubNumbersPro(poolData, index)} />}
      </td>
    );
  };

  // 容错9列：智取分解容错8 ∪ 博众分解容错8（包含组三）
  const renderRongCuo9Cell = (issue) => {
    // 计算智取分解容错8
    const decompGroups = parseDecompGroups((decompTexts && decompTexts[issue]) || '');
    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
    const decompRc8 = decompResult && decompResult.buckets && decompResult.buckets[8] ? decompResult.buckets[8] : [];

    // 计算博众分解容错8
    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[issue]) || '');
    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
    const bozhongRc8 = bozhongResult && bozhongResult.buckets && bozhongResult.buckets[8] ? bozhongResult.buckets[8] : [];

    // 合并去重
    const merged = [...new Set([...decompRc8, ...bozhongRc8])].sort();

    if (merged.length === 0) {
      return <td key="rc9" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在容错9中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && merged.includes(drawNum);

    return (
      <td key="rc9" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={merged.length} hit={hit} numbers={merged} />}
      </td>
    );
  };

  // 容错10列：智取分解容错10 ∪ 博众分解容错10（包含组三）
  const renderRongCuo10Cell = (issue) => {
    // 计算智取分解容错10
    const decompGroups = parseDecompGroups((decompTexts && decompTexts[issue]) || '');
    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
    const decompRc10 = decompResult && decompResult.buckets && decompResult.buckets[10] ? decompResult.buckets[10] : [];

    // 计算博众分解容错10
    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[issue]) || '');
    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
    const bozhongRc10 = bozhongResult && bozhongResult.buckets && bozhongResult.buckets[10] ? bozhongResult.buckets[10] : [];

    // 合并去重
    const merged = [...new Set([...decompRc10, ...bozhongRc10])].sort();

    if (merged.length === 0) {
      return <td key="rc10" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在容错10中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && merged.includes(drawNum);

    return (
      <td key="rc10" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={merged.length} hit={hit} numbers={merged} />}
      </td>
    );
  };

  const renderJiJiaoCell = (issue) => {
    // 计算智取分解容错（组六1~9，组三2~12）
    const decompGroups = parseDecompGroups((decompTexts && decompTexts[issue]) || '');
    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
    const decompZu6 = []; // 组六池 1~9
    const decompZu3 = []; // 组三池 2~12
    if (decompResult && decompResult.buckets) {
      for (let i = 1; i <= 9; i++) {
        if (decompResult.buckets[i]) decompZu6.push(...decompResult.buckets[i]);
      }
      for (let i = 2; i <= 12; i++) {
        if (decompResult.buckets[i]) decompZu3.push(...decompResult.buckets[i]);
      }
    }

    // 计算博众分解容错（组六1~9，组三2~12）
    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[issue]) || '');
    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
    const bozhongZu6 = []; // 组六池 1~9
    const bozhongZu3 = []; // 组三池 2~12
    if (bozhongResult && bozhongResult.buckets) {
      for (let i = 1; i <= 9; i++) {
        if (bozhongResult.buckets[i]) bozhongZu6.push(...bozhongResult.buckets[i]);
      }
      for (let i = 2; i <= 12; i++) {
        if (bozhongResult.buckets[i]) bozhongZu3.push(...bozhongResult.buckets[i]);
      }
    }

    // 交集号码列 = 智取容错 ∩ 博众容错（组六均1~9，组三均2~12）
    const decompZu6Set = new Set(decompZu6);
    const bozhongZu6Set = new Set(bozhongZu6);
    const decompZu3Set = new Set(decompZu3);
    const bozhongZu3Set = new Set(bozhongZu3);
    
    // 合并两个池子用于交集计算
    const decompAll = [...new Set([...decompZu6, ...decompZu3])];
    const bozhongAll = [...new Set([...bozhongZu6, ...bozhongZu3])];
    const bozhongAllSet = new Set(bozhongAll);
    
    // 取交集后，根据号码类型过滤
    const jiaoji = decompAll.filter(n => {
      if (!bozhongAllSet.has(n)) return false;
      // 判断是组三还是组六
      const isZu3 = n[0] === n[1] || n[1] === n[2] || n[0] === n[2];
      if (isZu3) {
        // 组三：需要在两个组三池中都存在
        return decompZu3Set.has(n) && bozhongZu3Set.has(n);
      } else {
        // 组六：需要在两个组六池中都存在
        return decompZu6Set.has(n) && bozhongZu6Set.has(n);
      }
    });

    // 智取分解无容错号码（buckets[0]）
    const decompWuRongCuo = decompResult && decompResult.buckets && decompResult.buckets[0] ? decompResult.buckets[0] : [];
    // 博众分解无容错号码（buckets[0]）
    const bozhongWuRongCuo = bozhongResult && bozhongResult.buckets && bozhongResult.buckets[0] ? bozhongResult.buckets[0] : [];
    // 所有豹子号码
    const baoZi = ['000', '111', '222', '333', '444', '555', '666', '777', '888', '999'];

    // 合并所有号码并去重
    const allNumbers = [...new Set([...jiaoji, ...decompWuRongCuo, ...bozhongWuRongCuo, ...baoZi])];
    const filtered = allNumbers.sort();

    if (filtered.length === 0) {
      return <td key="jj" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在交集中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && filtered.includes(drawNum);

    return (
      <td key="jj" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={filtered.length} hit={hit} numbers={filtered} />}
      </td>
    );
  };

  const renderZongHeCell = (issue) => {
    const filtered = computeZongHeNumbers(issue);

    if (filtered.length === 0) {
      return <td key="zh" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在综合列中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && filtered.includes(drawNum);

    return (
      <td key="zh" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={filtered.length} hit={hit} numbers={filtered} />}
      </td>
    );
  };

  // 断组容错列：智取断组容错2 ∪ 博众断组容错2
  const renderDuanZuRongCuoCell = (issue) => {
    if (!SHOW_DUANZU_RC_COL) return null;

    // 获取智取断组和博众断组的数据
    const zqText = (duanZuZQTexts && duanZuZQTexts[issue]) || '';
    const bzText = (duanZuBZTexts && duanZuBZTexts[issue]) || '';

    // 解析断组数据
    const zqGroups = parseDuanZuGroups(zqText);
    const bzGroups = parseDuanZuGroups(bzText);

    // 计算容错2的号码池
    let zqRongCuo2 = [];
    let bzRongCuo2 = [];

    if (zqGroups.length > 0 && zqGroups[0].groups.length > 0) {
      const zqResult = computeDuanZuRongCuo(zqGroups);
      if (zqResult.levels && zqResult.levels.length >= 2) {
        zqRongCuo2 = zqResult.levels[1].numbers || []; // 容错2
      }
    }

    if (bzGroups.length > 0 && bzGroups[0].groups.length > 0) {
      const bzResult = computeDuanZuRongCuo(bzGroups);
      if (bzResult.levels && bzResult.levels.length >= 2) {
        bzRongCuo2 = bzResult.levels[1].numbers || []; // 容错2
      }
    }

    // 合并两个号码池并去重
    const merged = Array.from(new Set([...zqRongCuo2, ...bzRongCuo2])).sort();

    if (merged.length === 0) {
      return <td key="duanzurc" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在断组容错列中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && merged.includes(drawNum);

    return (
      <td key="duanzurc" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={merged.length} hit={hit} numbers={merged} />}
      </td>
    );
  };

  // 祝君中奖列：交集号码 - 容错列 - 容错10列
  const renderJiJiaoRongCuoCell = (issue) => {
    if (!SHOW_JJRONGCUO_COL) return null;

    const filtered = computeZhuJunZhongJiangNumbers(issue);

    if (filtered.length === 0) {
      return <td key="jjrongcuo" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在交集容错列中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && filtered.includes(drawNum);

    return (
      <td key="jjrongcuo" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={filtered.length} hit={hit} numbers={filtered} />}
      </td>
    );
  };

  // 前1期列：采用前一期智取分解容错10 ∪ 博众分解容错10验证当期开奖号
  const renderQian1QiCell = (issue, issueIndex) => {
    if (!SHOW_QIAN1QI_COL) return null;

    // 获取前一期的期号
    if (issueIndex <= 0) {
      return <td key="qian1qi" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }
    const prevIssue = poolData[issueIndex - 1]?.issue;
    if (!prevIssue) {
      return <td key="qian1qi" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 获取前一期智取分解和博众分解数据
    const prevDecompText = (decompTexts && decompTexts[prevIssue]) || '';
    const prevBozhongText = (bozhongTexts && bozhongTexts[prevIssue]) || '';

    // 解析并计算容错10
    const prevDecompGroups = parseDecompGroups(prevDecompText);
    const prevDecompResult = prevDecompGroups.length > 0 ? computeRongCuo(prevDecompGroups, null) : null;
    const prevDecompRc10 = prevDecompResult && prevDecompResult.buckets && prevDecompResult.buckets[10] ? prevDecompResult.buckets[10] : [];

    const prevBozhongGroups = parseDecompGroups(prevBozhongText);
    const prevBozhongResult = prevBozhongGroups.length > 0 ? computeRongCuo(prevBozhongGroups, null) : null;
    const prevBozhongRc10 = prevBozhongResult && prevBozhongResult.buckets && prevBozhongResult.buckets[10] ? prevBozhongResult.buckets[10] : [];

    // 合并去重
    const merged = [...new Set([...prevDecompRc10, ...prevBozhongRc10])].sort();

    if (merged.length === 0) {
      return <td key="qian1qi" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在前1期池中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && merged.includes(drawNum);

    return (
      <td key="qian1qi" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={merged.length} hit={hit} numbers={merged} />}
      </td>
    );
  };

  // 解析用户输入的断组分组（支持多组，每行一组）
  // 支持三种格式：
  // 格式1（逗号分隔）：'307,189,6245'（3位+3位+4位数字串）
  // 格式2（横线分隔）：'345-190-2786'（3位+3位+4位数字串）
  // 格式3（斜杠分隔）：'012/345/6789,013/245/6789,014/235/6789'（逗号分隔3个分组）
  // 返回：[{groups: [{a:Set, b:Set, c:Set}], raw:string}, ...]
  const parseDuanZuGroups = (text) => {
    if (!text || !text.trim()) return [];
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
    const result = [];
    for (const line of lines) {
      // 尝试格式1：逗号分隔的3个数字串（整行只有3个纯数字部分）
      const commaParts = line.split(/[,，]/).map(s => s.trim()).filter(Boolean);
      if (commaParts.length === 3 && commaParts.every(p => /^\d+$/.test(p))) {
        const groups = [{
          a: new Set(commaParts[0].split('').map(Number)),
          b: new Set(commaParts[1].split('').map(Number)),
          c: new Set(commaParts[2].split('').map(Number))
        }];
        result.push({ groups, raw: line });
        continue;
      }
      // 尝试格式2：横线分隔的3个数字串
      const dashParts = line.split(/[-]/).map(s => s.trim()).filter(Boolean);
      if (dashParts.length === 3 && dashParts.every(p => /^\d+$/.test(p))) {
        const groups = [{
          a: new Set(dashParts[0].split('').map(Number)),
          b: new Set(dashParts[1].split('').map(Number)),
          c: new Set(dashParts[2].split('').map(Number))
        }];
        result.push({ groups, raw: line });
        continue;
      }
      // 尝试格式3：斜杠+逗号混合格式（逗号分隔3个分组，每个分组用斜杠分隔3个集合）
      if (commaParts.length === 3) {
        const groups = [];
        let valid = true;
        for (const part of commaParts) {
          const subParts = part.split('/').map(s => s.trim()).filter(Boolean);
          if (subParts.length !== 3) { valid = false; break; }
          const digits = subParts.map(sp => {
            const ds = sp.split('').map(c => parseInt(c, 10)).filter(n => !isNaN(n) && n >= 0 && n <= 9);
            return new Set(ds);
          });
          if (digits[0].size === 0 || digits[1].size === 0 || digits[2].size === 0) {
            valid = false;
            break;
          }
          groups.push({ a: digits[0], b: digits[1], c: digits[2] });
        }
        if (valid && groups.length === 3) {
          result.push({ groups, raw: line });
        }
      }
    }
    return result;
  };

  // 断组334列：用户录入分组（支持多组），系统计算每组断1组注数并合并
  const renderDuanZuCell = (issue) => {
    if (!SHOW_DUANZU_COL) return null;
    return <td key="duanzu" style={{ color: '#999', background: '#e0e0e0' }}>-</td>;
  };

  // 交集列：加减号码候选池 ∩ 综合列候选池
  const renderJiaoJiCell = (issue, index) => {
    if (!SHOW_JIAOJI_COL) return null;

    // 交集号码 = 智取容错0~9 ∩ 博众容错0~9
    const decompGroups = parseDecompGroups((decompTexts && decompTexts[issue]) || '');
    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
    const decompRc0_9 = [];
    if (decompResult && decompResult.buckets) {
      for (let i = 0; i <= 9; i++) {
        if (decompResult.buckets[i]) decompRc0_9.push(...decompResult.buckets[i]);
      }
    }
    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[issue]) || '');
    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
    const bozhongRc0_9 = [];
    if (bozhongResult && bozhongResult.buckets) {
      for (let i = 0; i <= 9; i++) {
        if (bozhongResult.buckets[i]) bozhongRc0_9.push(...bozhongResult.buckets[i]);
      }
    }
    const bozhongSet = new Set(bozhongRc0_9);
    const filtered = decompRc0_9.filter(n => bozhongSet.has(n));

    if (filtered.length === 0) {
      return <td key="jiaoji" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && filtered.includes(drawNum);

    return (
      <td key="jiaoji" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={filtered.length} hit={hit} numbers={filtered} />}
      </td>
    );
  };

  const renderRongCuoCell = (issue) => {
    // 计算智取分解容错0~12（errorCount <= 12，含无容错）
    const decompGroups = parseDecompGroups((decompTexts && decompTexts[issue]) || '');
    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
    const decompRc12 = [];
    if (decompResult && decompResult.buckets) {
      for (let i = 0; i <= 12; i++) {
        if (decompResult.buckets[i]) decompRc12.push(...decompResult.buckets[i]);
      }
    }

    // 计算博众分解容错0~12（errorCount <= 12，含无容错）
    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[issue]) || '');
    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
    const bozhongRc12 = [];
    if (bozhongResult && bozhongResult.buckets) {
      for (let i = 0; i <= 12; i++) {
        if (bozhongResult.buckets[i]) bozhongRc12.push(...bozhongResult.buckets[i]);
      }
    }

    // 容错列 = (智取容错0~12 ∪ 博众容错0~12) - (智取容错0~12 ∩ 博众容错0~12) = 对称差集
    const decompSet = new Set(decompRc12);
    const bozhongSet = new Set(bozhongRc12);
    const intersection = decompRc12.filter(n => bozhongSet.has(n));
    const intersectionSet = new Set(intersection);
    const union = [...new Set([...decompRc12, ...bozhongRc12])];
    const filtered = union.filter(n => !intersectionSet.has(n)).sort();

    if (filtered.length === 0) {
      return <td key="rc" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在容错中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && filtered.includes(drawNum);

    return (
      <td key="rc" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={filtered.length} hit={hit} numbers={filtered} />}
      </td>
    );
  };

  // 往期各期「最小容错等级」徽章数据源：仅对已开奖行（d1/d2/d3 有值）且该期分解非空时计算；
  //   下期预留行尚无开奖号 → 不产出徽章，等开奖数据更新、该行转为正常已开奖行后才显示
  const verifyMaps = useMemo(() => {
    const dm = new Map();
    const bz = new Map();
    const dzq = new Map();
    const dzbz = new Map();
    for (const item of displayData) {
      if (item.d1 === undefined || item.d2 === undefined || item.d3 === undefined) continue;
      const gd = parseDecompGroups((decompTexts && decompTexts[item.issue]) || '');
      if (gd.length > 0) { const v = verifyDraw(item, gd); if (v) dm.set(item.issue, v); }
      const gb = parseDecompGroups((bozhongTexts && bozhongTexts[item.issue]) || '');
      if (gb.length > 0) { const v = verifyDraw(item, gb); if (v) bz.set(item.issue, v); }
      const gdzq = parseDuanZuGroups((duanZuZQTexts && duanZuZQTexts[item.issue]) || '');
      if (gdzq.length > 0 && gdzq[0].groups.length > 0) { const v = verifyDuanZuDraw(item, gdzq); if (v) dzq.set(item.issue, v); }
      const gdzbz = parseDuanZuGroups((duanZuBZTexts && duanZuBZTexts[item.issue]) || '');
      if (gdzbz.length > 0 && gdzbz[0].groups.length > 0) { const v = verifyDuanZuDraw(item, gdzbz); if (v) dzbz.set(item.issue, v); }
    }
    return { dm, bz, dzq, dzbz };
  }, [displayData, decompTexts, bozhongTexts, duanZuZQTexts, duanZuBZTexts]);

  // 参与列宽计算的期号：所有数据期号（确保切换期数视图时宽度稳定）
  const decompIssues = useMemo(() => {
    const arr = data.map(i => i.issue);
    const nx = appNextIssue || (data.length ? String(Number(data[data.length - 1].issue) + 1) : null);
    if (nx && !arr.includes(nx)) arr.push(nx);
    return arr;
  }, [data, appNextIssue]);
  const decompBoxW = useMemo(() => calcDecompBoxWidth(decompTexts, decompIssues), [decompTexts, decompIssues]);
  const bozhongBoxW = useMemo(() => calcDecompBoxWidth(bozhongTexts, decompIssues), [bozhongTexts, decompIssues]);
  const duanZuZQBoxW = useMemo(() => calcDecompBoxWidth(duanZuZQTexts, decompIssues), [duanZuZQTexts, decompIssues]);
  const duanZuBZBoxW = useMemo(() => calcDecompBoxWidth(duanZuBZTexts, decompIssues), [duanZuBZTexts, decompIssues]);
  // 智取/博众分解取最大宽度保持一致，智取/博众断组取最大宽度保持一致
  const decompUnifiedBoxW = useMemo(() => Math.max(decompBoxW, bozhongBoxW), [decompBoxW, bozhongBoxW]);
  const duanZuUnifiedBoxW = useMemo(() => Math.max(duanZuZQBoxW, duanZuBZBoxW), [duanZuZQBoxW, duanZuBZBoxW]);

  // 渲染一个分解文本框单元格；hasData 决定白底/灰底
  const renderDecompCell = (kind, issue, title) => {
    const texts = kind === 'decomp' ? decompTexts : (kind === 'bozhong' ? bozhongTexts : (kind === 'duanzuZQ' ? duanZuZQTexts : duanZuBZTexts));
    const setText = kind === 'decomp' ? setDecompText : (kind === 'bozhong' ? setBozhongText : (kind === 'duanzuZQ' ? setDuanZuZQText : setDuanZuBZText));
    const value = (texts && texts[issue]) || '';
    const hasData = value.trim().length > 0;
    // 密码保护已解除：强制所有文本框可编辑
    const locked = false;
    const v = (kind === 'decomp' ? verifyMaps.dm : (kind === 'bozhong' ? verifyMaps.bz : (kind === 'duanzuZQ' ? verifyMaps.dzq : verifyMaps.dzbz))).get(issue);
    // 智取/博众分解统一宽度，智取/博众断组统一宽度
    const boxW = kind === 'decomp' || kind === 'bozhong' ? decompUnifiedBoxW : duanZuUnifiedBoxW;

    const tdWidth = boxW + 82; // boxW + badge(70) + gap(4) + padding(4) + border(4)
    return (      <td key={'dc_' + kind} style={{ padding: 2, background: hasData ? '#fff' : '#e0e0e0', width: tdWidth, minWidth: tdWidth, maxWidth: tdWidth }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
        <DecompTextarea
          value={value}
          locked={locked}
          hasData={hasData}
          boxW={boxW}
          title={title}
          kind={kind}
          issue={issue}
          setText={setText}
          onRequestUnlock={onRequestUnlock}
        />
        {v && (
          <span style={{
            fontSize: 15, padding: '2px 6px', borderRadius: 3, border: '1px solid #e0e0e0',
            background: '#fff', whiteSpace: 'nowrap', minWidth: 70, textAlign: 'left',
            color: v.type === '组三' ? '#c62828' : '#000',
            fontWeight: v.type === '组三' ? 700 : 600,
          }} title={`${issue} 期开奖最小容错等级（${v.type}）`}>
            {`容错${v.level}`}
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
        <style>{`input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } input[type=number] { -moz-appearance: textfield; } textarea::-webkit-scrollbar { width: 0; height: 0; } textarea { scrollbar-width: none; -ms-overflow-style: none; } .data-table tbody tr:hover td { background: #e3f2fd !important; }`}</style>
        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
          <div className="table-container" style={{ maxHeight: '700px', display: 'inline-block', overflowX: 'auto' }}>
            <table className="data-table" style={{ fontSize: 17 }}>
            <thead style={{ fontSize: 13 }}>
              <tr>
                <th>期数</th>
                <th style={{ borderBottom: '3px solid #a8d8ea' }}>百</th>
                <th style={{ borderBottom: '3px solid #a8d8ea' }}>十</th>
                <th style={{ borderBottom: '3px solid #a8d8ea' }}>个</th>
                <th>和值</th>
                <th>跨度</th>
                {/* 横加减/竖加减4列（Excel G~R 每3列合并为1格） */}
                {SHOW_HJS_COLS && HJS_COLS.map((c, i) => (
                  <th key={'hjsTh' + i} title={c.title}>{c.th}</th>
                ))}
                {SHOW_SLBC_COLS && <th>生号</th>}
                {SHOW_SLBC_COLS && <th>连号</th>}
                {SHOW_SLBC_COLS && <th>必出号</th>}
                {SHOW_ADDSUB_PRO_COL && <th title={`隔一用二增强：横向得票≥1 + 和值出现≥12次，命中率~93%，~930注；✓=在池内，✗=不在池内`}>增强93.1%</th>}
                {SHOW_JJ_COL && <th title="智取容错0~9 ∩ 博众容错0~9（交集号码）；✓=在池内，✗=不在池内">交集号码</th>}
                {SHOW_JIAOJI_COL && <th title="加减号码候选池 ∩ 综合列候选池；✓=在池内，✗=不在池内">交集</th>}
                {SHOW_RC9_COL && <th title="智取分解容错8 ∪ 博众分解容错8（包含组三）；✓=在池内，✗=不在池内">容错9</th>}
                {SHOW_RC10_COL && <th title="智取分解容错10 ∪ 博众分解容错10（包含组三）；✓=在池内，✗=不在池内">容错10</th>}
                {SHOW_RC_COL && <th title="(智取∪博众)−(智取∩博众)=对称差集；✓=在池内，✗=不在池内">容错</th>}
                {SHOW_ZONGHE_COL && <th title="交集号码 - 容错列 - 容错10列（综合）；✓=在池内，✗=不在池内">综合</th>}
                {SHOW_DUANZU_RC_COL && <th title="智取断组容错2 ∪ 博众断组容错2（合并号码池）；✓=在池内，✗=不在池内">断组容错</th>}
                {SHOW_JJRONGCUO_COL && <th title="交集号码 - 容错列 - 容错10列（交集容错）；✓=在池内，✗=不在池内">交集容错</th>}
                {SHOW_DUANZU_COL && <th title="断组334模式（012/345/6789）断1组预测；✓=在池内，✗=不在池内">断组</th>}
                {/* 智取分解 / 博众分解 两列 */}
                {DECOMP_COLS.map(c => (
                  <th key={'dcTh_' + c.kind} title={c.title}
                    style={{ borderBottom: `3px solid ${c.kind === 'decomp' ? '#f9a825' : '#43a047'}` }}>
                    {c.th}
                  </th>
                ))}
                {SHOW_QIAN1QI_COL && <th title="采用前一期智取分解容错10 ∪ 博众分解容错10验证当期开奖号；✓=命中，✗=未命中">前1期</th>}
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
                <tr key={item.issue} 
                  style={isTrialRow(item) ? { background: '#fffde7' } : undefined}
                >
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
                  {SHOW_SLBC_COLS && (
                    <td style={{ ...shengHaoStyle }}>
                      {shengHaoDigits.length > 0 ? shengHaoDigits.join('') : '-'}
                    </td>
                  )}
                  {/* 连号 */}
                  {SHOW_SLBC_COLS && (
                    <td style={{ ...lianHaoStyle }}>
                      {lianHaoDigits.length > 0 ? lianHaoDigits.join('') : '-'}
                    </td>
                  )}
                  {/* 必出号 */}
                  {SHOW_SLBC_COLS && (
                    <td style={mustOutStyle}>
                      {mustOutDigits.length > 0 ? mustOutDigits.join('') : '-'}
                    </td>
                  )}
                  {/* 隔一用二增强：横向得票≥1 + 和值出现≥12次 */}
                  {renderAddSubProCell(item.issue, issueIndexMap.get(item.issue))}
                  {/* 交集号码：智取容错0~9 ∩ 博众容错0~9 */}
                  {SHOW_JJ_COL && renderJiJiaoCell(item.issue)}
                  {/* 交集：加减号码候选池 ∩ 综合列候选池 */}
                  {SHOW_JIAOJI_COL && renderJiaoJiCell(item.issue, issueIndexMap.get(item.issue))}
                  {/* 容错9：智取分解容错8 ∪ 博众分解容错8 */}
                  {SHOW_RC9_COL && renderRongCuo9Cell(item.issue)}
                  {/* 容错10：智取分解容错10 ∪ 博众分解容错10 */}
                  {SHOW_RC10_COL && renderRongCuo10Cell(item.issue)}
                  {/* 容错：对称差集 */}
                  {SHOW_RC_COL && renderRongCuoCell(item.issue)}
                  {/* 综合：交集号码 - 容错列 - 容错10列 */}
                  {SHOW_ZONGHE_COL && renderZongHeCell(item.issue)}
                  {/* 断组容错：智取断组容错2 ∪ 博众断组容错2 */}
                  {SHOW_DUANZU_RC_COL && renderDuanZuRongCuoCell(item.issue)}
                  {/* 交集容错：交集号码 - 容错列 - 容错10列 */}
                  {SHOW_JJRONGCUO_COL && renderJiJiaoRongCuoCell(item.issue)}
                  {/* 断组334：默认分组012/345/6789，断1组预测 */}
                  {SHOW_DUANZU_COL && renderDuanZuCell(item.issue)}
                  {/* 智取分解 / 博众分解：按期号匹配展示对应 20 组分解参数 */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, item.issue, c.title))}
                  {/* 前1期：采用前一期智取分解容错10 ∪ 博众分解容错10验证当期 */}
                  {SHOW_QIAN1QI_COL && renderQian1QiCell(item.issue, issueIndexMap.get(item.issue))}
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
                  {SHOW_SLBC_COLS && (
                    <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                      {(() => { const d = lastItem.shenghao.filter(v => v !== -1); return d.length > 0 ? d.join('') : '-'; })()}
                    </td>
                  )}
                  {/* 连号 - 预留行显示最后一期数据 */}
                  {SHOW_SLBC_COLS && (
                    <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                      {(() => { const d = lastItem.lianhao.filter(v => v !== -1); return d.length > 0 ? d.join('') : '-'; })()}
                    </td>
                  )}
                  {/* 必出号 - 预留行显示最后一期数据 */}
                  {SHOW_SLBC_COLS && (
                    <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                      {(() => { const d = lastItem.mustOutNums.filter(v => v !== -1); return d.length > 0 ? d.join('') : '-'; })()}
                    </td>
                  )}
                  {/* 加减号码增强 - 预留行：下期候选池注数（尚未开奖，无对错） */}
                  {SHOW_ADDSUB_PRO_COL && (
                    <td key="addSubProNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                      {<ClickableCount count={tailAddSubNumbersPro.length} hit={null} numbers={tailAddSubNumbersPro} color="#1b5e20" />}
                    </td>
                  )}
                  {/* 交集号码 - 预留行：下期交集注数（尚未开奖，无对错） */}
                  {SHOW_JJ_COL && (() => {
                    const decompGroups = parseDecompGroups((decompTexts && decompTexts[nextIssue]) || '');
                    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
                    const decompZu6 = [];
                    const decompZu3 = [];
                    if (decompResult && decompResult.buckets) {
                      for (let i = 1; i <= 8; i++) {
                        if (decompResult.buckets[i]) decompZu6.push(...decompResult.buckets[i]);
                      }
                      for (let i = 1; i <= 12; i++) {
                        if (decompResult.buckets[i]) decompZu3.push(...decompResult.buckets[i]);
                      }
                    }
                    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[nextIssue]) || '');
                    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
                    const bozhongZu6 = [];
                    const bozhongZu3 = [];
                    if (bozhongResult && bozhongResult.buckets) {
                      for (let i = 1; i <= 8; i++) {
                        if (bozhongResult.buckets[i]) bozhongZu6.push(...bozhongResult.buckets[i]);
                      }
                      for (let i = 1; i <= 12; i++) {
                        if (bozhongResult.buckets[i]) bozhongZu3.push(...bozhongResult.buckets[i]);
                      }
                    }
                    // 交集号码列 = 智取容错 ∩ 博众容错（组六用1~8池，组三用1~12池）
                    const decompZu6Set = new Set(decompZu6);
                    const bozhongZu6Set = new Set(bozhongZu6);
                    const decompZu3Set = new Set(decompZu3);
                    const bozhongZu3Set = new Set(bozhongZu3);
                    const decompAll = [...new Set([...decompZu6, ...decompZu3])];
                    const bozhongAll = [...new Set([...bozhongZu6, ...bozhongZu3])];
                    const bozhongAllSet = new Set(bozhongAll);
                    const filtered = decompAll.filter(n => {
                      if (!bozhongAllSet.has(n)) return false;
                      const isZu3 = n[0] === n[1] || n[1] === n[2] || n[0] === n[2];
                      if (isZu3) {
                        return decompZu3Set.has(n) && bozhongZu3Set.has(n);
                      } else {
                        return decompZu6Set.has(n) && bozhongZu6Set.has(n);
                      }
                    }).sort();
                    return (
                      <td key="jjNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={filtered.length} hit={null} numbers={filtered} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 交集 - 预留行：下期交集注数（尚未开奖，无对错） */}
                  {SHOW_JIAOJI_COL && (() => {
                    const zongHe = computeZongHeNumbers(nextIssue);
                    const addSubSet = new Set(tailAddSubNumbersPro);
                    const filtered = zongHe.filter(n => addSubSet.has(n));
                    return (
                      <td key="jiaojiNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={filtered.length} hit={null} numbers={filtered} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 容错9 - 预留行：下期容错8注数（尚未开奖，无对错） */}
                  {SHOW_RC9_COL && (() => {
                    const decompGroups = parseDecompGroups((decompTexts && decompTexts[nextIssue]) || '');
                    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
                    const decompRc8 = decompResult && decompResult.buckets && decompResult.buckets[8] ? decompResult.buckets[8] : [];
                    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[nextIssue]) || '');
                    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
                    const bozhongRc8 = bozhongResult && bozhongResult.buckets && bozhongResult.buckets[8] ? bozhongResult.buckets[8] : [];
                    const merged = [...new Set([...decompRc8, ...bozhongRc8])].sort();
                    return (
                      <td key="rc9Next" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={merged.length} hit={null} numbers={merged} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 容错10 - 预留行：下期容错10注数（尚未开奖，无对错） */}
                  {SHOW_RC10_COL && (() => {
                    const decompGroups = parseDecompGroups((decompTexts && decompTexts[nextIssue]) || '');
                    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
                    const decompRc10 = decompResult && decompResult.buckets && decompResult.buckets[10] ? decompResult.buckets[10] : [];
                    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[nextIssue]) || '');
                    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
                    const bozhongRc10 = bozhongResult && bozhongResult.buckets && bozhongResult.buckets[10] ? bozhongResult.buckets[10] : [];
                    const merged = [...new Set([...decompRc10, ...bozhongRc10])].sort();
                    return (
                      <td key="rc10Next" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={merged.length} hit={null} numbers={merged} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 容错 - 预留行：下期对称差集注数（尚未开奖，无对错） */}
                  {SHOW_RC_COL && (() => {
                    const decompGroups = parseDecompGroups((decompTexts && decompTexts[nextIssue]) || '');
                    const decompResult = decompGroups.length > 0 ? computeRongCuo(decompGroups, null) : null;
                    const decompRc12 = [];
                    if (decompResult && decompResult.buckets) {
                      for (let i = 1; i <= 12; i++) {
                        if (decompResult.buckets[i]) decompRc12.push(...decompResult.buckets[i]);
                      }
                    }
                    const bozhongGroups = parseDecompGroups((bozhongTexts && bozhongTexts[nextIssue]) || '');
                    const bozhongResult = bozhongGroups.length > 0 ? computeRongCuo(bozhongGroups, null) : null;
                    const bozhongRc12 = [];
                    if (bozhongResult && bozhongResult.buckets) {
                      for (let i = 1; i <= 12; i++) {
                        if (bozhongResult.buckets[i]) bozhongRc12.push(...bozhongResult.buckets[i]);
                      }
                    }
                    const decompSet = new Set(decompRc12);
                    const bozhongSet = new Set(bozhongRc12);
                    const intersection = decompRc12.filter(n => bozhongSet.has(n));
                    const intersectionSet = new Set(intersection);
                    const union = [...new Set([...decompRc12, ...bozhongRc12])];
                    const filtered = union.filter(n => !intersectionSet.has(n)).sort();
                    return (
                      <td key="rcNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={filtered.length} hit={null} numbers={filtered} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 综合 - 预留行：下期综合注数（尚未开奖，无对错） */}
                  {SHOW_ZONGHE_COL && (() => {
                    const filtered = computeZongHeNumbers(nextIssue);
                    return (
                      <td key="zhNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={filtered.length} hit={null} numbers={filtered} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 断组容错 - 预留行：下期断组容错注数（尚未开奖，无对错） */}
                  {SHOW_DUANZU_RC_COL && (() => {
                    const zqText = (duanZuZQTexts && duanZuZQTexts[nextIssue]) || '';
                    const bzText = (duanZuBZTexts && duanZuBZTexts[nextIssue]) || '';
                    const zqGroups = parseDuanZuGroups(zqText);
                    const bzGroups = parseDuanZuGroups(bzText);
                    let zqRongCuo2 = [];
                    let bzRongCuo2 = [];
                    if (zqGroups.length > 0 && zqGroups[0].groups.length > 0) {
                      const zqResult = computeDuanZuRongCuo(zqGroups);
                      if (zqResult.levels && zqResult.levels.length >= 2) {
                        zqRongCuo2 = zqResult.levels[1].numbers || [];
                      }
                    }
                    if (bzGroups.length > 0 && bzGroups[0].groups.length > 0) {
                      const bzResult = computeDuanZuRongCuo(bzGroups);
                      if (bzResult.levels && bzResult.levels.length >= 2) {
                        bzRongCuo2 = bzResult.levels[1].numbers || [];
                      }
                    }
                    const merged = Array.from(new Set([...zqRongCuo2, ...bzRongCuo2])).sort();
                    return (
                      <td key="duanzurcNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={merged.length} hit={null} numbers={merged} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 交集容错 - 预留行：下期交集容错注数（尚未开奖，无对错） */}
                  {SHOW_JJRONGCUO_COL && (() => {
                    const filtered = computeZhuJunZhongJiangNumbers(nextIssue);
                    return (
                      <td key="jjrongcuoNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={filtered.length} hit={null} numbers={filtered} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 断组334 - 预留行：录入框（与数据行一致，支持多组） */}
                  {SHOW_DUANZU_COL && (() => {
                    const nextDzIssue = appNextIssue || nextIssue;
                    // 兼容旧代码：duanZuTexts 已废弃，实际使用 duanZuZQTexts / duanZuBZTexts
                    const value = '';
                    const hasData = value.trim().length > 0;
                    const allGroupsList = parseDuanZuGroups(value);
                    let filtered = [];
                    if (allGroupsList.length > 0) {
                      const allNumbers = new Set();
                      for (const groups of allGroupsList) {
                        const broken1 = generateByBrokenGroups(groups, [1]);
                        const broken2 = generateByBrokenGroups(groups, [2]);
                        const broken3 = generateByBrokenGroups(groups, [3]);
                        for (const n of broken1) allNumbers.add(n);
                        for (const n of broken2) allNumbers.add(n);
                        for (const n of broken3) allNumbers.add(n);
                      }
                      filtered = Array.from(allNumbers).sort();
                    }
                    return (
                      <td key="duanzuNext" style={{ padding: 2, background: hasData ? '#f0f8ff' : '#e8f0f5' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <textarea
                            value={value}
                            placeholder={"如 012/345/6789\n多组换行"}
                            onChange={e => { if (setDuanZuText) setDuanZuText(nextDzIssue, e.target.value); }}
                            style={{
                              width: 110, minWidth: 110, flex: '1 1 auto', height: 40, resize: 'none', overflow: 'hidden', display: 'block',
                              fontSize: 11, lineHeight: '19px', fontFamily: 'Consolas,Menlo,monospace',
                              padding: '0 3px', boxSizing: 'border-box', borderRadius: 3,
                              border: `1px solid ${hasData ? '#90caf9' : '#bdbdbd'}`,
                              background: hasData ? '#fff' : '#eee',
                              color: '#222', cursor: 'text', whiteSpace: 'pre',
                            }}
                          />
                          {hasData && filtered.length > 0 && (
                            <>
                              <span style={{
                                fontSize: 13, padding: '2px 6px', borderRadius: 3, border: '1px solid #e0e0e0',
                                background: '#fff', whiteSpace: 'nowrap', minWidth: 60, textAlign: 'left',
                                color: '#1b5e20', fontWeight: 600,
                              }} title={`${nextDzIssue} 期断组预测号码（${filtered.length}注，${allGroupsList.length}组，待开奖）`}>
                                {filtered.length}注
                                <span style={{ marginLeft: 4, color: '#78909c', fontWeight: 700, fontSize: 12 }}>待开奖</span>
                              </span>
                              <ClickableCount count={0} hit={null} numbers={filtered} />
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })()}
                  {/* 智取分解 / 博众分解 - 预留行：下期分解条件录入框（点按钮后锁定，密码解锁再编辑） */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, appNextIssue || nextIssue, c.title))}
                  {/* 前1期 - 预留行：尚未开奖，无数据 */}
                  {SHOW_QIAN1QI_COL && (
                    <td key="qian1qiNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>-</td>
                  )}
                  {/* 杀百十合、杀百个合、杀十个合三列预留行已彻底删除 - 用户要求 */}
                </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
        {/* 右侧面板：直选大底 + 精选（并排）+ 直选高倍 + 智取博众分解按钮 */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: '0 0 auto', display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <SelfPickInputModule issue={selfPickIssue} title="直选大底" value={selfPickValue} onChange={onSelfPickChange} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <SelfPickInputModule
                issue={selfPickIssue}
                title="精选"
                value={selfPickJxValue}
                onChange={onSelfPickJxChange}
                placeholder="输入组选号码，自动展开为直选号码，空格/逗号/换行分隔"
                accent="#ef6c00"
                bg="#fff3e0"
                badgeColor="#b35309"
                border="#ffb74d"
              />
            </div>
          </div>
          <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex' }}>
            <ZhiXuanGaoBeiModule
              issue={selfPickIssue}
              value={zhiXuanGaoBeiValue}
              onChange={onZhiXuanGaoBeiChange}
            />
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
