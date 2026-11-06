import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { parseDecompGroups, verifyDraw, computeRongCuo } from '../utils/decompRongCuo.js'
import { parseDuanZuGroups, verifyDuanZuDraw, computeDuanZuRongCuo } from '../utils/duanZuRongCuo.js'
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
  // 基于到periodIndex期的数据生成下一期的遗漏策略号码
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
// 组1: 百位6个最多遗漏 + 十位选遗漏最多的5个数字 + 个位选遗漏最多的5个数字
// 组2: 十位6个最多遗漏 + 个位选遗漏最多的5个数字 + 百位选遗漏最多的5个数字
// 组3: 百位6个最多遗漏 + 个位选遗漏最多的5个数字 + 十位选遗漏最多的5个数字
// ============================================================
function selectThreeGroups(missing, sixPos) {
  // sixPos: 哪个位置选6个最多遗漏，其他位置选遗漏最多的5个数字
  const result = { d1: [], d2: [], d3: [] };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
    
    if (pos === sixPos) {
      // 这个位置选6个最多遗漏
      result[pos] = digits.slice(0, 6);
    } else {
      // 其他位置选遗漏最多的5个数字
      result[pos] = digits.slice(0, 5);
    }
  }
  
  return result;
}

function generateOmissionNumbers3(data, periodIndex) {
  // 基于到periodIndex期的数据生成下一期的遗漏3位策略号码
  const missing = getMissingAtPeriod(data, periodIndex);
  const group1 = selectThreeGroups(missing, 'd1'); // 百位6个
  const group2 = selectThreeGroups(missing, 'd2'); // 十位6个
  const group3 = selectThreeGroups(missing, 'd1'); // 百位6个
  
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
// V2策略（遗漏折线图V2）：优化版本，提升计算速度
// ============================================================
function generateV2Strategy(data, periodIndex) {
  const historical = data.slice(0, periodIndex);
  if (historical.length < 30) return [];
  
  // 一次性计算所有位置的遗漏值（优化：单次遍历）
  const missing = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  const missing20 = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  const missing30 = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    for (let d = 0; d <= 9; d++) {
      let count10 = 0, count20 = 0, count30 = 0;
      const len = historical.length;
      
      for (let i = len - 1; i >= Math.max(0, len - 10); i--) {
        if (historical[i][pos] === d) break;
        count10++;
      }
      missing[pos][d] = count10;
      
      for (let i = len - 1; i >= Math.max(0, len - 20); i--) {
        if (historical[i][pos] === d) break;
        count20++;
      }
      missing20[pos][d] = count20;
      
      for (let i = len - 1; i >= Math.max(0, len - 30); i--) {
        if (historical[i][pos] === d) break;
        count30++;
      }
      missing30[pos][d] = count30;
    }
  }
  
  const result = new Set();
  
  // 策略1: 10期窗口每位top6
  const top6 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = [0,1,2,3,4,5,6,7,8,9].sort((a, b) => missing[pos][b] - missing[pos][a]);
    top6[pos] = digits.slice(0, 6);
  }
  for (const d1 of top6.d1) for (const d2 of top6.d2) for (const d3 of top6.d3)
    result.add(`${d1}${d2}${d3}`);
  
  // 策略2: 20期窗口每位top6
  const top6_20 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = [0,1,2,3,4,5,6,7,8,9].sort((a, b) => missing20[pos][b] - missing20[pos][a]);
    top6_20[pos] = digits.slice(0, 6);
  }
  for (const d1 of top6_20.d1) for (const d2 of top6_20.d2) for (const d3 of top6_20.d3)
    result.add(`${d1}${d2}${d3}`);
  
  // 策略3: 30期窗口每位top5
  const top5_30 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = [0,1,2,3,4,5,6,7,8,9].sort((a, b) => missing30[pos][b] - missing30[pos][a]);
    top5_30[pos] = digits.slice(0, 5);
  }
  for (const d1 of top5_30.d1) for (const d2 of top5_30.d2) for (const d3 of top5_30.d3)
    result.add(`${d1}${d2}${d3}`);
  
  // 策略4: 热号（每位bottom4）
  const bot4 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = [0,1,2,3,4,5,6,7,8,9].sort((a, b) => missing[pos][a] - missing[pos][b]);
    bot4[pos] = digits.slice(0, 4);
  }
  for (const d1 of bot4.d1) for (const d2 of bot4.d2) for (const d3 of bot4.d3)
    result.add(`${d1}${d2}${d3}`);
  
  // 策略5: 冷号回补（遗漏>=5）
  const cold5 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    cold5[pos] = [];
    for (let d = 0; d <= 9; d++) {
      if (missing[pos][d] >= 5) cold5[pos].push(d);
    }
    if (cold5[pos].length === 0) {
      const digits = [0,1,2,3,4,5,6,7,8,9].sort((a, b) => missing[pos][b] - missing[pos][a]);
      cold5[pos] = digits.slice(0, 2);
    }
  }
  for (const d1 of cold5.d1) for (const d2 of cold5.d2) for (const d3 of cold5.d3)
    result.add(`${d1}${d2}${d3}`);
  
  // 策略6: 跨窗口共振（简化版）
  const resonance = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    resonance[pos] = [];
    for (let d = 0; d <= 9; d++) {
      const rank10 = missing[pos].filter(v => v > missing[pos][d]).length + 1;
      const rank20 = missing20[pos].filter(v => v > missing20[pos][d]).length + 1;
      if (rank10 <= 4 && rank20 <= 4) resonance[pos].push(d);
    }
    if (resonance[pos].length < 3) {
      const digits = [0,1,2,3,4,5,6,7,8,9].sort((a, b) => missing[pos][b] - missing[pos][a]);
      resonance[pos] = digits.slice(0, 3);
    }
  }
  for (const d1 of resonance.d1) for (const d2 of resonance.d2) for (const d3 of resonance.d3)
    result.add(`${d1}${d2}${d3}`);
  
  return Array.from(result).sort();
}

// 从数组中选k个元素的所有组合
function combinations(arr, k) {
  const result = [];
  function backtrack(start, path) {
    if (path.length === k) { result.push([...path]); return; }
    for (let i = start; i < arr.length; i++) {
      path.push(arr[i]);
      backtrack(i + 1, path);
      path.pop();
    }
  }
  backtrack(0, []);
  return result;
}

// 生成3位直选号码：从groupA取a个，groupB取b个（a+b=3），全排列
function generateDirect(groupA, groupB) {
  const results = new Set();
  // 从A取1个，B取2个
  for (const a of combinations(groupA, 1)) {
    for (const b of combinations(groupB, 2)) {
      const digits = [...a, ...b];
      const perms = permutations(digits);
      perms.forEach(p => results.add(p.join('')));
    }
  }
  // 从A取2个，B取1个
  for (const a of combinations(groupA, 2)) {
    for (const b of combinations(groupB, 1)) {
      const digits = [...a, ...b];
      const perms = permutations(digits);
      perms.forEach(p => results.add(p.join('')));
    }
  }
  return [...results].sort();
}

// 全排列
function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// 组三号码：从digits中生成所有含重复数字的3位号码
function generateZuSan(digits) {
  const results = new Set();
  for (const d1 of digits) {
    for (const d2 of digits) {
      for (const d3 of digits) {
        // 至少有两个数字相同
        if (d1 === d2 || d2 === d3 || d1 === d3) {
          results.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  return [...results].sort();
}

// ============================================================
// 【算法锁定】横加减 / 竖加减 4列（对齐 Excel「黄金三格」体 sheet H~S 列，每 3 列合并为 1 格）
// 体 sheet 比福 sheet 多一列「试机号」，列位整体右移一位：
//   A=期数 B=试机号 C/D/E=第一/二/三位 F=和值 G=跨度
//   H/I/J=横相减  K/L/M=横相加  N/O/P=竖相减  Q/R/S=竖相加
// 横相减：|百-十|、|十-个|、|百-个|
// 横相加：(百+十)取尾、(十+个)取尾、(百+个)取尾
// 竖相减：|本期-上期|同位差（百/十/个）
// 竖相加：(本期+上期)同位取尾（百/十/个）
// 数值口径由 lotteryData.js 的 enrichData 产出的 hSub/hAdd/vSub/vAdd 提供，禁止在此重复计算
// 显示规则：与生号/连号/必出号一致，统一下移一行（首行显示自身值）；参考一/参考二/胆码三列已彻底删除 - 用户要求
// 合并规则：每组 3 个一位数连写为一个单元格（如 7,1,6 → 716），与生号/连号显示风格一致
// ============================================================
const HJS_COLS = [
  { field: 'hSub', th: '横相减', title: '横相减：|百-十| |十-个| |百-个| 三位连写' },
  { field: 'hAdd', th: '横相加', title: '横相加：(百+十) (十+个) (百+个) 取尾 三位连写' },
  { field: 'vSub', th: '竖相减', title: '竖相减：|本期百-上期百| |本期十-上期十| |本期个-上期个| 三位连写' },
  { field: 'vAdd', th: '竖相加', title: '竖相加：(本期百+上期百) (本期十+上期十) (本期个+上期个) 取尾 三位连写' },
];

// 渲染横加减/竖加减4个合并单元格；src 为空（首行无上期）或该组全 null 时显示 -
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
const SHOW_JIAOJI_COL = false;

// 祝君中奖列开关：2026-11-04 用户要求新增
const SHOW_JJRONGCUO_COL = true;

// 断组容错列开关：2026-11-04 用户要求新增（智取断组+博众断组容错2合并）
const SHOW_DUANZU_RC_COL = true;

// 断组334列开关：2026-11-04 用户要求新增
const SHOW_DUANZU_COL = false; // 已迁移到 DECOMP_COLS 的 duanzuZQ/duanzuBZ

// 前1期列开关：2026-11-06 用户要求新增（采用前一期分解数据容错10验证当期）
const SHOW_QIAN1QI_COL = true;

// 前1期容错列开关：2026-11-06 用户要求新增（采用前一期分解数据容错0~12对称差集验证当期）
const SHOW_QIAN1QI_RC_COL = true;

// 前2期容错列开关：2026-11-06 用户要求新增（采用前2期分解数据容错0~12对称差集验证当期）
const SHOW_QIAN2QI_RC_COL = true;

// 前2期列开关：2026-11-06 用户要求新增（采用前2期分解数据容错10并集验证当期）
const SHOW_QIAN2QI_COL = true;

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
// 智取分解 / 博众分解 两列（表格最右侧，必出号列之后）——与福彩3D 同一套样式与交互
// 格宽随内容自适应（见 calcDecompBoxWidth）：数据右缘贴住框右缘、徽章贴住格右缘，
//   不留死白死灰；overflow:hidden 禁滚动、resize:none 禁缩放；
//   已锁定期号 readOnly+置灰+点击弹密码框；未锁定可编辑，onChange 即时写回 App.jsx 触发容错重算
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
  // 加减号码回溯200期需要完整历史（与福彩3D 保持同一接口）
  fullData,
  decompTexts = {}, bozhongTexts = {}, duanZuZQTexts = {}, duanZuBZTexts = {},
  setDecompText, setBozhongText, setDuanZuZQText, setDuanZuBZText,
  lockedDecomp, lockedBozhong, lockedDuanZuZQ, lockedDuanZuBZ,
  onRequestUnlock,
  // App.jsx 基于 baseData 算出的下期待开奖期号；分解录入框必须用它，
  // 不能用本文件预留行内部的 nextIssue（后者基于 enrichedData，测试行时会多算一期）
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

  // 隔一用二增强：各期用其前200期的横向模式+和值候选池验证当期开奖号
  // poolData = 完整历史 + 试验行（与福彩3D 同一写法，福彩侧 data 被窗口化故需 fullData）
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

  // 断组容错列：智取断组容错4 ∪ 博众断组容错4
  const renderDuanZuRongCuoCell = (issue) => {
    if (!SHOW_DUANZU_RC_COL) return null;

    // 获取智取断组和博众断组的数据
    const zqText = (duanZuZQTexts && duanZuZQTexts[issue]) || '';
    const bzText = (duanZuBZTexts && duanZuBZTexts[issue]) || '';

    // 解析断组数据
    const zqGroups = parseDuanZuGroups(zqText);
    const bzGroups = parseDuanZuGroups(bzText);

    // 计算容错4的号码池
    let zqRongCuo4 = [];
    let bzRongCuo4 = [];

    if (zqGroups.length > 0 && zqGroups[0].groups.length > 0) {
      const zqResult = computeDuanZuRongCuo(zqGroups);
      if (zqResult.levels && zqResult.levels.length >= 4) {
        zqRongCuo4 = zqResult.levels[3].numbers || []; // 容错4
      }
    }

    if (bzGroups.length > 0 && bzGroups[0].groups.length > 0) {
      const bzResult = computeDuanZuRongCuo(bzGroups);
      if (bzResult.levels && bzResult.levels.length >= 4) {
        bzRongCuo4 = bzResult.levels[3].numbers || []; // 容错4
      }
    }

    // 合并两个号码池并去重
    const merged = Array.from(new Set([...zqRongCuo4, ...bzRongCuo4])).sort();

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

  // 前1期容错列：采用前一期智取分解容错0~12与博众分解容错0~12的对称差集验证当期开奖号
  const renderQian1QiRongCuoCell = (issue, issueIndex) => {
    if (!SHOW_QIAN1QI_RC_COL) return null;

    // 获取前一期的期号
    if (issueIndex <= 0) {
      return <td key="qian1qirc" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }
    const prevIssue = poolData[issueIndex - 1]?.issue;
    if (!prevIssue) {
      return <td key="qian1qirc" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 获取前一期智取分解和博众分解数据
    const prevDecompText = (decompTexts && decompTexts[prevIssue]) || '';
    const prevBozhongText = (bozhongTexts && bozhongTexts[prevIssue]) || '';

    // 计算前一期智取分解容错0~12
    const prevDecompGroups = parseDecompGroups(prevDecompText);
    const prevDecompResult = prevDecompGroups.length > 0 ? computeRongCuo(prevDecompGroups, null) : null;
    const prevDecompRc12 = [];
    if (prevDecompResult && prevDecompResult.buckets) {
      for (let i = 0; i <= 12; i++) {
        if (prevDecompResult.buckets[i]) prevDecompRc12.push(...prevDecompResult.buckets[i]);
      }
    }

    // 计算前一期博众分解容错0~12
    const prevBozhongGroups = parseDecompGroups(prevBozhongText);
    const prevBozhongResult = prevBozhongGroups.length > 0 ? computeRongCuo(prevBozhongGroups, null) : null;
    const prevBozhongRc12 = [];
    if (prevBozhongResult && prevBozhongResult.buckets) {
      for (let i = 0; i <= 12; i++) {
        if (prevBozhongResult.buckets[i]) prevBozhongRc12.push(...prevBozhongResult.buckets[i]);
      }
    }

    // 对称差集 = (智取 ∪ 博众) - (智取 ∩ 博众)
    const prevDecompSet = new Set(prevDecompRc12);
    const prevBozhongSet = new Set(prevBozhongRc12);
    const prevIntersection = prevDecompRc12.filter(n => prevBozhongSet.has(n));
    const prevIntersectionSet = new Set(prevIntersection);
    const prevUnion = [...new Set([...prevDecompRc12, ...prevBozhongRc12])];
    const merged = prevUnion.filter(n => !prevIntersectionSet.has(n)).sort();

    if (merged.length === 0) {
      return <td key="qian1qirc" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在前1期容错中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && merged.includes(drawNum);

    return (
      <td key="qian1qirc" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={merged.length} hit={hit} numbers={merged} />}
      </td>
    );
  };

  // 前2期容错列：采用前2期智取分解容错0~12与博众分解容错0~12的对称差集验证当期开奖号
  const renderQian2QiRongCuoCell = (issue, issueIndex) => {
    if (!SHOW_QIAN2QI_RC_COL) return null;

    // 获取前2期的期号
    if (issueIndex <= 1) {
      return <td key="qian2qirc" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }
    const prev2Issue = poolData[issueIndex - 2]?.issue;
    if (!prev2Issue) {
      return <td key="qian2qirc" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 获取前2期智取分解和博众分解数据
    const prev2DecompText = (decompTexts && decompTexts[prev2Issue]) || '';
    const prev2BozhongText = (bozhongTexts && bozhongTexts[prev2Issue]) || '';

    // 计算前2期智取分解容错0~12
    const prev2DecompGroups = parseDecompGroups(prev2DecompText);
    const prev2DecompResult = prev2DecompGroups.length > 0 ? computeRongCuo(prev2DecompGroups, null) : null;
    const prev2DecompRc12 = [];
    if (prev2DecompResult && prev2DecompResult.buckets) {
      for (let i = 0; i <= 12; i++) {
        if (prev2DecompResult.buckets[i]) prev2DecompRc12.push(...prev2DecompResult.buckets[i]);
      }
    }

    // 计算前2期博众分解容错0~12
    const prev2BozhongGroups = parseDecompGroups(prev2BozhongText);
    const prev2BozhongResult = prev2BozhongGroups.length > 0 ? computeRongCuo(prev2BozhongGroups, null) : null;
    const prev2BozhongRc12 = [];
    if (prev2BozhongResult && prev2BozhongResult.buckets) {
      for (let i = 0; i <= 12; i++) {
        if (prev2BozhongResult.buckets[i]) prev2BozhongRc12.push(...prev2BozhongResult.buckets[i]);
      }
    }

    // 对称差集 = (智取 ∪ 博众) - (智取 ∩ 博众)
    const prev2DecompSet = new Set(prev2DecompRc12);
    const prev2BozhongSet = new Set(prev2BozhongRc12);
    const prev2Intersection = prev2DecompRc12.filter(n => prev2BozhongSet.has(n));
    const prev2IntersectionSet = new Set(prev2Intersection);
    const prev2Union = [...new Set([...prev2DecompRc12, ...prev2BozhongRc12])];
    const merged = prev2Union.filter(n => !prev2IntersectionSet.has(n)).sort();

    if (merged.length === 0) {
      return <td key="qian2qirc" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在前2期容错中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && merged.includes(drawNum);

    return (
      <td key="qian2qirc" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
        {<ClickableCount count={merged.length} hit={hit} numbers={merged} />}
      </td>
    );
  };

  // 前2期列：采用前2期智取分解容错10 ∪ 博众分解容错10验证当期开奖号
  const renderQian2QiCell = (issue, issueIndex) => {
    if (!SHOW_QIAN2QI_COL) return null;

    // 获取前2期的期号
    if (issueIndex <= 1) {
      return <td key="qian2qi" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }
    const prev2Issue = poolData[issueIndex - 2]?.issue;
    if (!prev2Issue) {
      return <td key="qian2qi" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 获取前2期智取分解和博众分解数据
    const prev2DecompText = (decompTexts && decompTexts[prev2Issue]) || '';
    const prev2BozhongText = (bozhongTexts && bozhongTexts[prev2Issue]) || '';

    // 解析并计算容错10
    const prev2DecompGroups = parseDecompGroups(prev2DecompText);
    const prev2DecompResult = prev2DecompGroups.length > 0 ? computeRongCuo(prev2DecompGroups, null) : null;
    const prev2DecompRc10 = prev2DecompResult && prev2DecompResult.buckets && prev2DecompResult.buckets[10] ? prev2DecompResult.buckets[10] : [];

    const prev2BozhongGroups = parseDecompGroups(prev2BozhongText);
    const prev2BozhongResult = prev2BozhongGroups.length > 0 ? computeRongCuo(prev2BozhongGroups, null) : null;
    const prev2BozhongRc10 = prev2BozhongResult && prev2BozhongResult.buckets && prev2BozhongResult.buckets[10] ? prev2BozhongResult.buckets[10] : [];

    // 合并去重
    const merged = [...new Set([...prev2DecompRc10, ...prev2BozhongRc10])].sort();

    if (merged.length === 0) {
      return <td key="qian2qi" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }

    // 验证当期开奖号是否在前2期池中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = drawNum && merged.includes(drawNum);

    return (
      <td key="qian2qi" style={{ padding: '2px 4px', background: hit ? '#e8f5e9' : (hit === false ? '#ffebee' : '#f5f5f5') }}>
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
    // 兼容旧代码：duanZuTexts 已废弃，实际使用 duanZuZQTexts / duanZuBZTexts
    const value = '';
    const hasData = value.trim().length > 0;
    const allGroupsList = parseDuanZuGroups(value);

    // 计算所有组的断1组注数：合并所有组的断第1/2/3组号码池
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

    // 验证当期开奖号是否在断组预测中
    const item = displayData.find(d => d.issue === issue);
    const drawNum = item ? `${item.d1}${item.d2}${item.d3}` : null;
    const hit = hasData && drawNum && filtered.length > 0 ? filtered.includes(drawNum) : null;

    return (
      <td key="duanzu" style={{ padding: 2, background: hasData ? '#fff' : '#e0e0e0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <textarea
            value={value}
            placeholder={"如 012/345/6789\n多组换行"}
            onChange={e => { if (setDuanZuText) setDuanZuText(issue, e.target.value); }}
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
            <ClickableCount count={filtered.length} hit={hit} numbers={filtered} />
          )}
        </div>
      </td>
    );
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
    return (
      <td key={'dc_' + kind} style={{ padding: 2, background: hasData ? '#fff' : '#e0e0e0', width: tdWidth, minWidth: tdWidth, maxWidth: tdWidth }}>
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

  // 计算所有行的直选号码
  const allZhiXuan = useMemo(() => {
    return displayData.map((item) => {
      const dm = item.danMa;
      const cx1 = item.chuXianCi1;
      const cx2 = item.chuXianCi2;
      const zs2 = item.zuSan2;
      const zs1 = item.zuSan1;

      let numbers = [];
      // 胆码 × 出现次1
      if (dm.length > 0 && cx1.length > 0) numbers.push(...generateDirect(dm, cx1));
      // 胆码 × 出现次2
      if (dm.length > 0 && cx2.length > 0) numbers.push(...generateDirect(dm, cx2));
      // 胆码 × 组三2
      if (dm.length > 0 && zs2.length > 0) numbers.push(...generateDirect(dm, zs2));
      // 组三1 组三号码
      if (zs1.length > 0) numbers.push(...generateZuSan(zs1));

      // 去重
      const unique = [...new Set(numbers)].sort();
      return unique;
    });
  }, [displayData]);

  // 号码组一: 胆码取1或2 × 胆码组1取1或2 × 0-9取1 = 3位直选
  const allHaoMaZu1 = useMemo(() => {
    const allDigits = [0,1,2,3,4,5,6,7,8,9];
    return displayData.map((item) => {
      const dmz1 = item.chuXianCi1.filter(d => !item.danMa.includes(d));
      const results = new Set();
      // 胆码取1 + 胆码组1取1 + 0-9取1
      for (const a of combinations(item.danMa, 1)) {
        for (const b of combinations(dmz1, 1)) {
          for (const c of combinations(allDigits, 1)) {
            const digits = [...a, ...b, ...c];
            permutations(digits).forEach(p => results.add(p.join('')));
          }
        }
      }
      // 胆码取2 + 胆码组1取1 + 0-9取0 -> 不符合(0-9必须取1个)
      // 胆码取1 + 胆码组1取2 + 0-9取0 -> 不符合
      return [...results].sort();
    });
  }, [displayData]);

  // 号码组二: 胆码取1或2 × 胆码组2取1或2 × 0-9取1 = 3位直选
  const allHaoMaZu2 = useMemo(() => {
    const allDigits = [0,1,2,3,4,5,6,7,8,9];
    return displayData.map((item) => {
      const dmz2 = item.chuXianCi2.filter(d => !item.danMa.includes(d));
      const results = new Set();
      // 胆码取1 + 胆码组2取1 + 0-9取1
      for (const a of combinations(item.danMa, 1)) {
        for (const b of combinations(dmz2, 1)) {
          for (const c of combinations(allDigits, 1)) {
            const digits = [...a, ...b, ...c];
            permutations(digits).forEach(p => results.add(p.join('')));
          }
        }
      }
      return [...results].sort();
    });
  }, [displayData]);

  // 号码组三: 胆码取1 × 组三2取1 × 0-9取1 = 3位直选（全排列去重，再筛选组三）
  const allHaoMaZu3 = useMemo(() => {
    const allDigits = [0,1,2,3,4,5,6,7,8,9];
    return displayData.map((item) => {
      const results = new Set();
      for (const a of combinations(item.danMa, 1)) {
        for (const b of combinations(item.zuSan2, 1)) {
          for (const c of combinations(allDigits, 1)) {
            const digits = [...a, ...b, ...c];
            permutations(digits).forEach(p => {
              const num = p.join('');
              // 筛选组三：至少有两个数字相同
              if (p[0] === p[1] || p[1] === p[2] || p[0] === p[2]) {
                results.add(num);
              }
            });
          }
        }
      }
      return [...results].sort();
    });
  }, [displayData]);

  // 号码组四: 胆码中选3个数字（可重复），生成所有3位直选，不区分豹子/组三/组六
  const allHaoMaZu4 = useMemo(() => {
    return displayData.map((item) => {
      const results = new Set();
      for (const d1 of item.danMa) {
        for (const d2 of item.danMa) {
          for (const d3 of item.danMa) {
            results.add(`${d1}${d2}${d3}`);
          }
        }
      }
      return [...results].sort();
    });
  }, [displayData]);

  // 号码组五: 组三1中选3个数字（可重复），生成所有3位直选，再筛选组三号码
  const allHaoMaZu5 = useMemo(() => {
    return displayData.map((item) => {
      const results = new Set();
      for (const d1 of item.zuSan1) {
        for (const d2 of item.zuSan1) {
          for (const d3 of item.zuSan1) {
            const num = `${d1}${d2}${d3}`;
            // 筛选组三：至少有两个数字相同
            if (d1 === d2 || d2 === d3 || d1 === d3) {
              results.add(num);
            }
          }
        }
      }
      return [...results].sort();
    });
  }, [displayData]);

  // 计算命中下期开奖号的号码
  const allHits = useMemo(() => {
    const hitSet = new Set();
    displayData.forEach((item, idx) => {
      const nextItem = idx < displayData.length - 1 ? displayData[idx + 1] : null;
      if (!nextItem) return;
      const target = `${nextItem.d1}${nextItem.d2}${nextItem.d3}`;
      allZhiXuan[idx].forEach(num => {
        if (num === target) hitSet.add(num);
      });
    });
    return [...hitSet].sort();
  }, [displayData, allZhiXuan]);

  return (
    <div>
      <div className="card">
        {/* 卡片标题区与福彩3D一致：无标题文字，期数下拉左对齐，补齐最近500期/1000期 */}
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
                {SHOW_QIAN1QI_RC_COL && <th title="采用前一期智取分解容错0~12与博众分解容错0~12的对称差集验证当期开奖号；✓=命中，✗=未命中">前1期容错</th>}
                {SHOW_QIAN2QI_RC_COL && <th title="采用前2期智取分解容错0~12与博众分解容错0~12的对称差集验证当期开奖号；✓=命中，✗=未命中">前2期容错</th>}
                {SHOW_QIAN2QI_COL && <th title="采用前2期智取分解容错10 ∪ 博众分解容错10验证当期开奖号；✓=命中，✗=未命中">前2期</th>}
                {SHOW_QIAN1QI_COL && <th title="采用前一期智取分解容错10 ∪ 博众分解容错10验证当期开奖号；✓=命中，✗=未命中">前1期</th>}
                {SHOW_DUANZU_RC_COL && <th title="智取断组容错4 ∪ 博众断组容错4（合并号码池）；✓=在池内，✗=不在池内">断组容错</th>}
                {SHOW_JJRONGCUO_COL && <th title="交集号码 - 容错列 - 容错10列（交集容错）；✓=在池内，✗=不在池内">交集容错</th>}
                {SHOW_ZONGHE_COL && <th title="交集号码 - 容错列 - 容错10列（综合）；✓=在池内，✗=不在池内">综合</th>}
                {SHOW_DUANZU_COL && <th title="断组334模式（012/345/6789）断1组预测；✓=在池内，✗=不在池内">断组</th>}
                {/* 参考一/参考二/胆码三列表头已彻底删除 - 用户要求 */}
                {/* 智取分解 / 博众分解 两列（表格最右侧，与福彩3D 同位置逻辑） */}
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
                // 预测列下移一行：用上一期数据作为当期预测
                // 【显示规则对齐福彩3D】prevData 第一行回退到自身（不再全显示 -）；prevItem 仅供和值/跨度重复比较
                const prevData = idx > 0 ? displayData[idx - 1] : (prevOfFirstDisplay || item); // 首行取完整数据中的上一期
                const prevItem = idx > 0 ? displayData[idx - 1] : null;
                const nextItem = idx < displayData.length - 1 ? displayData[idx + 1] : null;
                // 和值/跨度显示当期实际数据，与前后一期比较重复则蓝色
                const sumColor = ((prevItem && item.sum === prevItem.sum) || (nextItem && item.sum === nextItem.sum)) ? '#3498db' : '#000';
                const spanColor = ((prevItem && item.span === prevItem.span) || (nextItem && item.span === nextItem.span)) ? '#3498db' : '#000';
                // 预测列验证：用当期开奖号验证上一期预测
                const curDigits = new Set([item.d1, item.d2, item.d3]);
                // 生号/连号命中判定：与福彩3D 同一套三态规则
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
                // 预测数据源统一为 prevData（第一行取自身），与福彩3D 一致
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
                  {/* 横加减/竖加减 - 下移一行（数据源 prevData，与福彩3D 同一规则） */}
                  {renderHjsCells(prevData)}
                  {/* 生号 - 下移一行，命中三态高亮（与福彩3D 一致） */}
                  {SHOW_SLBC_COLS && (
                    <td style={{ ...shengHaoStyle }}>
                      {shengHaoDigits.length > 0 ? shengHaoDigits.join('') : '-'}
                    </td>
                  )}
                  {/* 连号 - 下移一行，命中三态高亮（与福彩3D 一致） */}
                  {SHOW_SLBC_COLS && (
                    <td style={{ ...lianHaoStyle }}>
                      {lianHaoDigits.length > 0 ? lianHaoDigits.join('') : '-'}
                    </td>
                  )}
                  {/* 必出号 - 下移一行 */}
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
                  {/* 前1期容错：采用前一期智取分解容错0~12与博众分解容错0~12的对称差集验证当期 */}
                  {SHOW_QIAN1QI_RC_COL && renderQian1QiRongCuoCell(item.issue, issueIndexMap.get(item.issue))}
                  {/* 前2期容错：采用前2期智取分解容错0~12与博众分解容错0~12的对称差集验证当期 */}
                  {SHOW_QIAN2QI_RC_COL && renderQian2QiRongCuoCell(item.issue, issueIndexMap.get(item.issue))}
                  {/* 前2期：采用前2期智取分解容错10 ∪ 博众分解容错10验证当期 */}
                  {SHOW_QIAN2QI_COL && renderQian2QiCell(item.issue, issueIndexMap.get(item.issue))}
                  {/* 前1期：采用前一期智取分解容错10 ∪ 博众分解容错10验证当期 */}
                  {SHOW_QIAN1QI_COL && renderQian1QiCell(item.issue, issueIndexMap.get(item.issue))}
                  {/* 断组容错：智取断组容错4 ∪ 博众断组容错4 */}
                  {SHOW_DUANZU_RC_COL && renderDuanZuRongCuoCell(item.issue)}
                  {/* 交集容错：交集号码 - 容错列 - 容错10列 */}
                  {SHOW_JJRONGCUO_COL && renderJiJiaoRongCuoCell(item.issue)}
                  {/* 综合：交集号码 - 容错列 - 容错10列 */}
                  {SHOW_ZONGHE_COL && renderZongHeCell(item.issue)}
                  {/* 断组334：012/345/6789 断1组 */}
                  {SHOW_DUANZU_COL && renderDuanZuCell(item.issue)}
                  {/* 参考一/参考二/胆码三列单元格已彻底删除 - 用户要求 */}
                  {/* 智取分解 / 博众分解：按期号匹配展示对应 20 组分解参数（与福彩3D 一致） */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, item.issue, c.title))}
                </tr>
                );
              })}
              {/* 下期预留行 */}
              {(() => {
                const lastItem = data[data.length - 1];
                const nextIssue = String(Number(lastItem.issue) + 1);
                const isSynced = data.some(d => d.issue === nextIssue);
                // 下期预留行的预测数据 = 最后一期的数据
                const predLast = lastItem;
                const predMustOut = predLast ? predLast.mustOutNums.filter(v => v !== -1) : [];
                return (
                <tr style={{ background: '#f0f8ff' }}>
                  <td className="issue" style={{ color: isSynced ? '#000' : '#e74c3c', fontWeight: 700 }}>{'20' + nextIssue}</td>
                  {/* 预留行占位单元格样式对齐福彩3D：百位保留浅蓝底，十/个/和值/跨度为加粗黑字 */}
                  <td style={{ background: '#e8f4fd' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  {/* 横加减/竖加减 - 预留行显示最后一期算出的值（与生号/连号/必出号一致） */}
                  {renderHjsCells(predLast)}
                  {/* 生号 - 最后一期预测 */}
                  {SHOW_SLBC_COLS && (
                    <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                      {predLast && predLast.shenghao.filter(v => v !== -1).length > 0 ? predLast.shenghao.filter(v => v !== -1).join('') : '-'}
                    </td>
                  )}
                  {/* 连号 */}
                  {SHOW_SLBC_COLS && (
                    <td style={{ color: '#fff', background: '#1e8449' }}>
                      {predLast && predLast.lianhao.filter(v => v !== -1).length > 0 ? predLast.lianhao.filter(v => v !== -1).join('') : '-'}
                    </td>
                  )}
                  {/* 必出号 */}
                  {SHOW_SLBC_COLS && (
                    <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                      {predMustOut.length > 0 ? predMustOut.join('') : '-'}
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
                  {/* 前1期容错 - 预留行：用最后一期分解数据容错0~12对称差集预测下期 */}
                  {SHOW_QIAN1QI_RC_COL && (() => {
                    const lastIssue = lastItem?.issue;
                    const lastDecompText = (decompTexts && decompTexts[lastIssue]) || '';
                    const lastBozhongText = (bozhongTexts && bozhongTexts[lastIssue]) || '';
                    const lastDecompGroups = parseDecompGroups(lastDecompText);
                    const lastDecompResult = lastDecompGroups.length > 0 ? computeRongCuo(lastDecompGroups, null) : null;
                    const lastDecompRc12 = [];
                    if (lastDecompResult && lastDecompResult.buckets) {
                      for (let i = 0; i <= 12; i++) {
                        if (lastDecompResult.buckets[i]) lastDecompRc12.push(...lastDecompResult.buckets[i]);
                      }
                    }
                    const lastBozhongGroups = parseDecompGroups(lastBozhongText);
                    const lastBozhongResult = lastBozhongGroups.length > 0 ? computeRongCuo(lastBozhongGroups, null) : null;
                    const lastBozhongRc12 = [];
                    if (lastBozhongResult && lastBozhongResult.buckets) {
                      for (let i = 0; i <= 12; i++) {
                        if (lastBozhongResult.buckets[i]) lastBozhongRc12.push(...lastBozhongResult.buckets[i]);
                      }
                    }
                    const lastDecompSet = new Set(lastDecompRc12);
                    const lastBozhongSet = new Set(lastBozhongRc12);
                    const lastIntersection = lastDecompRc12.filter(n => lastBozhongSet.has(n));
                    const lastIntersectionSet = new Set(lastIntersection);
                    const lastUnion = [...new Set([...lastDecompRc12, ...lastBozhongRc12])];
                    const merged = lastUnion.filter(n => !lastIntersectionSet.has(n)).sort();
                    return (
                      <td key="qian1qircNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={merged.length} hit={null} numbers={merged} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 前2期容错 - 预留行：用倒数第2期分解数据容错0~12对称差集预测下期 */}
                  {SHOW_QIAN2QI_RC_COL && (() => {
                    const prev2Issue = data.length >= 2 ? data[data.length - 2]?.issue : null;
                    if (!prev2Issue) {
                      return <td key="qian2qircNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>-</td>;
                    }
                    const prev2DecompText = (decompTexts && decompTexts[prev2Issue]) || '';
                    const prev2BozhongText = (bozhongTexts && bozhongTexts[prev2Issue]) || '';
                    const prev2DecompGroups = parseDecompGroups(prev2DecompText);
                    const prev2DecompResult = prev2DecompGroups.length > 0 ? computeRongCuo(prev2DecompGroups, null) : null;
                    const prev2DecompRc12 = [];
                    if (prev2DecompResult && prev2DecompResult.buckets) {
                      for (let i = 0; i <= 12; i++) {
                        if (prev2DecompResult.buckets[i]) prev2DecompRc12.push(...prev2DecompResult.buckets[i]);
                      }
                    }
                    const prev2BozhongGroups = parseDecompGroups(prev2BozhongText);
                    const prev2BozhongResult = prev2BozhongGroups.length > 0 ? computeRongCuo(prev2BozhongGroups, null) : null;
                    const prev2BozhongRc12 = [];
                    if (prev2BozhongResult && prev2BozhongResult.buckets) {
                      for (let i = 0; i <= 12; i++) {
                        if (prev2BozhongResult.buckets[i]) prev2BozhongRc12.push(...prev2BozhongResult.buckets[i]);
                      }
                    }
                    const prev2DecompSet = new Set(prev2DecompRc12);
                    const prev2BozhongSet = new Set(prev2BozhongRc12);
                    const prev2Intersection = prev2DecompRc12.filter(n => prev2BozhongSet.has(n));
                    const prev2IntersectionSet = new Set(prev2Intersection);
                    const prev2Union = [...new Set([...prev2DecompRc12, ...prev2BozhongRc12])];
                    const merged = prev2Union.filter(n => !prev2IntersectionSet.has(n)).sort();
                    return (
                      <td key="qian2qircNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={merged.length} hit={null} numbers={merged} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 前2期 - 预留行：用倒数第2期分解数据容错10并集预测下期 */}
                  {SHOW_QIAN2QI_COL && (() => {
                    const prev2Issue = data.length >= 2 ? data[data.length - 2]?.issue : null;
                    if (!prev2Issue) {
                      return <td key="qian2qiNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>-</td>;
                    }
                    const prev2DecompText = (decompTexts && decompTexts[prev2Issue]) || '';
                    const prev2BozhongText = (bozhongTexts && bozhongTexts[prev2Issue]) || '';
                    const prev2DecompGroups = parseDecompGroups(prev2DecompText);
                    const prev2DecompResult = prev2DecompGroups.length > 0 ? computeRongCuo(prev2DecompGroups, null) : null;
                    const prev2DecompRc10 = prev2DecompResult && prev2DecompResult.buckets && prev2DecompResult.buckets[10] ? prev2DecompResult.buckets[10] : [];
                    const prev2BozhongGroups = parseDecompGroups(prev2BozhongText);
                    const prev2BozhongResult = prev2BozhongGroups.length > 0 ? computeRongCuo(prev2BozhongGroups, null) : null;
                    const prev2BozhongRc10 = prev2BozhongResult && prev2BozhongResult.buckets && prev2BozhongResult.buckets[10] ? prev2BozhongResult.buckets[10] : [];
                    const merged = [...new Set([...prev2DecompRc10, ...prev2BozhongRc10])].sort();
                    return (
                      <td key="qian2qiNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={merged.length} hit={null} numbers={merged} color="#1b5e20" />}
                      </td>
                    );
                  })()}
                  {/* 前1期 - 预留行：用最后一期分解数据容错10并集预测下期 */}
                  {SHOW_QIAN1QI_COL && (() => {
                    const lastIssue = lastItem?.issue;
                    const lastDecompText = (decompTexts && decompTexts[lastIssue]) || '';
                    const lastBozhongText = (bozhongTexts && bozhongTexts[lastIssue]) || '';
                    const lastDecompGroups = parseDecompGroups(lastDecompText);
                    const lastDecompResult = lastDecompGroups.length > 0 ? computeRongCuo(lastDecompGroups, null) : null;
                    const lastDecompRc10 = lastDecompResult && lastDecompResult.buckets && lastDecompResult.buckets[10] ? lastDecompResult.buckets[10] : [];
                    const lastBozhongGroups = parseDecompGroups(lastBozhongText);
                    const lastBozhongResult = lastBozhongGroups.length > 0 ? computeRongCuo(lastBozhongGroups, null) : null;
                    const lastBozhongRc10 = lastBozhongResult && lastBozhongResult.buckets && lastBozhongResult.buckets[10] ? lastBozhongResult.buckets[10] : [];
                    const merged = [...new Set([...lastDecompRc10, ...lastBozhongRc10])].sort();
                    return (
                      <td key="qian1qiNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        {<ClickableCount count={merged.length} hit={null} numbers={merged} color="#1b5e20" />}
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
                  {/* 综合 - 预留行：下期综合注数（尚未开奖，无对错） */}
                  {SHOW_ZONGHE_COL && (() => {
                    const filtered = computeZongHeNumbers(nextIssue);
                    return (
                      <td key="zhNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
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
                  {/* 参考一/参考二/胆码三列预留行占位已彻底删除 - 用户要求 */}
                  {/* 智取分解 / 博众分解 - 预留行：下期分解条件录入框（点按钮后锁定，密码解锁再编辑） */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, appNextIssue || nextIssue, c.title))}
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
            href="https://lotto.sina.cn/video/tcopen/index.d.html?type=tc"
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
