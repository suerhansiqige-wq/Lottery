import { useState, useMemo } from 'react'
import { parseDecompGroups, verifyDraw } from '../utils/decompRongCuo.js'
import { ADD_SUB_LOOKBACK, buildAddSubIndex, getAddSubNumbers } from '../utils/addSubPool.js'

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
// 【已隐藏】用户要求隐藏横相减/横相加/竖相减/竖相加四列
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
// 智取分解 / 博众分解 两列（表格最右侧，必出号列之后）——与福彩3D 同一套样式与交互
// 格宽随内容自适应（见 calcDecompBoxWidth）：数据右缘贴住框右缘、徽章贴住格右缘，
//   不留死白死灰；overflow:hidden 禁滚动、resize:none 禁缩放；
//   已锁定期号 readOnly+置灰+点击弹密码框；未锁定可编辑，onChange 即时写回 App.jsx 触发容错重算
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

/** 自选号码：手动输入框，号码源（供下方直选高倍与分解容错使用） */
function SelfPickInputModule({ issue, value, onChange }) {
  const count = useMemo(() => {
    const seen = new Set();
    for (const t of (value || '').split(/[\s,，;；]+/)) if (/^\d{3}$/.test(t)) seen.add(t);
    return seen.size;
  }, [value]);

  return (
    <div style={{ width: '100%', border: '2px solid #00838f', borderRadius: 6, background: '#e0f7fa', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: '#00838f', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>自选号码</span>
        <span style={{
          fontSize: 12, fontWeight: 800, color: '#00695c',
          background: '#fff', borderRadius: 10, padding: '1px 8px', whiteSpace: 'nowrap',
        }}>
          {count} 注
        </span>
      </div>
      <div style={{ padding: 8 }}>
        <textarea
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          placeholder="手动输入号码，空格/逗号/换行分隔"
          spellCheck={false}
          style={{
            display: 'block', width: '100%', boxSizing: 'border-box', height: 72, resize: 'none',
            fontSize: 12, fontFamily: 'Consolas,monospace', lineHeight: '16px',
            padding: 4, border: '1px solid #4dd0e1', borderRadius: 3,
            background: '#fff', color: '#00695c',
            overflowY: 'auto', cursor: 'text',
          }}
        />
      </div>
    </div>
  );
}

/** 直选高倍 / 保本投注
 *  直选高倍 = 自选号码中的组六 ∩ 加减号码预留行候选池（组三一律归保本投注）
 *  保本投注 = 自选号码中的组三 + (自选号码 − 加减号码预留行候选池) + 分解容错（智取/博众）的无容错号码，合并去重
 */
function ZhiXuanGaoBeiModule({ issue, value, addSubNumbers = [], wuRongCuoNumbers = [] }) {
  const [copiedHigh, setCopiedHigh] = useState(false);
  const [copiedBaoben, setCopiedBaoben] = useState(false);

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    if (type === 'high') setCopiedHigh(true);
    else setCopiedBaoben(true);
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
    const poolSet = new Set(addSubNumbers);
    const isZuSan = (n) => new Set(n.split('')).size !== 3;
    const zuSanNums = nums.filter(isZuSan);
    const highNums = nums.filter(n => !isZuSan(n) && poolSet.has(n));
    const baobenNums = [...new Set([...zuSanNums, ...nums.filter(n => !poolSet.has(n)), ...wuRongCuoNumbers])]
      .sort((a, b) => Number(a) - Number(b));
    return { nums, highNums, baobenNums, high: highNums.length, baoben: baobenNums.length };
  }, [value, addSubNumbers, wuRongCuoNumbers]);

  return (
    <div style={{ width: '100%', flex: 1, border: '2px solid #00838f', borderRadius: 6, background: '#e0f7fa', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: '#00838f', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>直选高倍</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#00695c', fontWeight: 700 }}>
            共 {parsed.nums.length} 注
          </span>
          <span style={{ fontSize: 11, color: '#00838f' }}>直选高倍{parsed.high}/保本{parsed.baoben}</span>
        </div>
        {parsed.nums.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch', flex: '1 1 0', minHeight: 0 }}>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px dashed #4dd0e1', borderRadius: 3, background: '#fff', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '2px 6px', background: '#e0f2f1', borderBottom: '1px solid #b2dfdb' }}
                title="自选号码中的组六 ∩ 加减号码（预留行待开奖格）候选池；组三一律归保本投注">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#00695c' }}>直选高倍 {parsed.high} 注</span>
                <button
                  onClick={() => handleCopy(parsed.highNums.join(' '), 'high')}
                  style={{
                    fontSize: 11, padding: '1px 6px', cursor: 'pointer',
                    border: `1px solid ${copiedHigh ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
                    background: copiedHigh ? '#c8e6c9' : '#fff', color: copiedHigh ? '#1b5e20' : '#555',
                    fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
                  }}
                >
                  {copiedHigh ? '✓' : '复制'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#00695c', fontFamily: 'Consolas,monospace', lineHeight: '18px', wordBreak: 'break-all', padding: 4, overflowY: 'auto', flex: '1 1 0', minHeight: 0 }}>
                {parsed.highNums.join(' ') || '—'}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px dashed #ef9a9a', borderRadius: 3, background: '#fff', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '2px 6px', background: '#ffebee', borderBottom: '1px solid #ffcdd2' }}
                title="自选号码中的组三 + 自选号码中不属于加减号码候选池的号码 + 分解容错（智取/博众）的无容错号码（去重）">
                <span style={{ fontSize: 12, fontWeight: 700, color: '#c62828' }}>保本投注 {parsed.baoben} 注</span>
                <button
                  onClick={() => handleCopy(parsed.baobenNums.join(' '), 'baoben')}
                  style={{
                    fontSize: 11, padding: '1px 6px', cursor: 'pointer',
                    border: `1px solid ${copiedBaoben ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
                    background: copiedBaoben ? '#c8e6c9' : '#fff', color: copiedBaoben ? '#1b5e20' : '#555',
                    fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
                  }}
                >
                  {copiedBaoben ? '✓' : '复制'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#c62828', fontFamily: 'Consolas,monospace', lineHeight: '18px', wordBreak: 'break-all', padding: 4, overflowY: 'auto', flex: '1 1 0', minHeight: 0 }}>
                {parsed.baobenNums.join(' ') || '—'}
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
  // 加减号码回溯200期需要完整历史（与福彩3D 保持同一接口）
  fullData,
  decompTexts = {}, bozhongTexts = {},
  setDecompText, setBozhongText,
  lockedDecomp, lockedBozhong,
  onRequestUnlock,
  // App.jsx 基于 baseData 算出的下期待开奖期号；分解录入框必须用它，
  // 不能用本文件预留行内部的 nextIssue（后者基于 enrichedData，测试行时会多算一期）
  nextIssue: appNextIssue,
  // 智取、博众分解按钮（从 DecompRongCuoPanel 移入）
  onDecompSubmit,
  submitFlash,
  // 自选号码（从 DecompRongCuoPanel 移入右侧面板）
  selfPickIssue,
  selfPickValue,
  onSelfPickChange,
  // 分解容错「无容错」号码（智取∪博众），并入保本投注
  wuRongCuoNumbers = [],
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

  // 加减号码：各期用其前 ADD_SUB_LOOKBACK 期的横相加∪横相减候选池验证当期开奖号
  // poolData = 完整历史 + 试验行（与福彩3D 同一写法，福彩侧 data 被窗口化故需 fullData）
  const poolData = useMemo(() => {
    const base = fullData && fullData.length ? fullData : data;
    const known = new Set(base.map(d => d.issue));
    const extra = data.filter(d => !known.has(d.issue));
    return extra.length ? [...base, ...extra] : base;
  }, [fullData, data]);
  const addSubIndex = useMemo(() => buildAddSubIndex(poolData), [poolData]);
  const issueIndexMap = useMemo(() => {
    const m = new Map();
    poolData.forEach((d, i) => { if (!m.has(d.issue)) m.set(d.issue, i); });
    return m;
  }, [poolData]);
  // 下期预留行：用最后一期往前200期建池，尚无开奖号故只出注数与复制，不出对错
  const tailAddSubNumbers = useMemo(() => getAddSubNumbers(poolData, poolData.length), [poolData]);

  const renderAddSubCell = (issue, index) => {
    const rec = addSubIndex.get(issue);
    const copied = copiedIssues.has(issue);
    if (!rec) {
      return <td key="addSub" style={{ color: '#999', background: '#f5f5f5' }}>-</td>;
    }
    return (
      <td key="addSub" style={{ padding: '2px 4px', background: rec.hit ? '#e8f5e9' : '#ffebee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
          <span style={{ fontWeight: 800, color: rec.hit ? '#1b5e20' : '#b71c1c' }}>{rec.size}注</span>
          <span title={rec.hit ? '当期开奖号在候选池内' : '当期开奖号不在候选池内'}
            style={{ fontWeight: 900, fontSize: 15, color: rec.hit ? '#2e7d32' : '#c62828' }}>
            {rec.hit ? '✓' : '✗'}
          </span>
          <button
            style={{
              fontSize: 11, padding: '1px 6px', cursor: 'pointer',
              border: `1px solid ${copied ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
              background: copied ? '#c8e6c9' : '#fff', color: copied ? '#1b5e20' : '#555',
              fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
            }}
            onClick={() => handleCopy(issue, getAddSubNumbers(poolData, index))}
          >
            {copied ? '✓' : '复制'}
          </button>
        </div>
      </td>
    );
  };

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

  // 渲染一个分解文本框单元格；hasData 决定白底/灰底，locked 决定只读与点击解锁（与福彩3D 完全一致）
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
                <th title={`用其前${ADD_SUB_LOOKBACK}期的横相加∪横相减候选号码验证当期开奖号；✓=在池内，✗=不在池内`}>加减号码</th>
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
                  {/* 横加减/竖加减 - 下移一行（数据源 prevData，与福彩3D 同一规则） */}
                  {renderHjsCells(prevData)}
                  {/* 生号 - 下移一行，命中三态高亮（与福彩3D 一致） */}
                  <td style={{ ...shengHaoStyle }}>
                    {shengHaoDigits.length > 0 ? shengHaoDigits.join('') : '-'}
                  </td>
                  {/* 连号 - 下移一行，命中三态高亮（与福彩3D 一致） */}
                  <td style={{ ...lianHaoStyle }}>
                    {lianHaoDigits.length > 0 ? lianHaoDigits.join('') : '-'}
                  </td>
                  {/* 必出号 - 下移一行 */}
                  <td style={mustOutStyle}>
                    {mustOutDigits.length > 0 ? mustOutDigits.join('') : '-'}
                  </td>
                  {/* 加减号码：前200期横相加∪横相减候选池注数 + 对错符号 + 复制 */}
                  {renderAddSubCell(item.issue, issueIndexMap.get(item.issue))}
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
                  <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                    {predLast && predLast.shenghao.filter(v => v !== -1).length > 0 ? predLast.shenghao.filter(v => v !== -1).join('') : '-'}
                  </td>
                  {/* 连号 */}
                  <td style={{ color: '#fff', background: '#1e8449' }}>
                    {predLast && predLast.lianhao.filter(v => v !== -1).length > 0 ? predLast.lianhao.filter(v => v !== -1).join('') : '-'}
                  </td>
                  {/* 必出号 */}
                  <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                    {predMustOut.length > 0 ? predMustOut.join('') : '-'}
                  </td>
                  {/* 加减号码 - 预留行：下期候选池注数 + 复制（尚未开奖，无对错） */}
                  {(() => {
                    const cpd = copiedIssues.has('next_' + nextIssue);
                    return (
                      <td key="addSubNext" style={{ padding: '2px 4px', background: '#f0f8ff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 800, color: '#1b5e20' }}>{tailAddSubNumbers.length}注</span>
                          <span style={{ fontWeight: 700, fontSize: 12, color: '#78909c' }}>待开奖</span>
                          <button
                            style={{
                              fontSize: 11, padding: '1px 6px', cursor: 'pointer',
                              border: `1px solid ${cpd ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
                              background: cpd ? '#c8e6c9' : '#fff', color: cpd ? '#1b5e20' : '#555',
                              fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
                            }}
                            onClick={() => handleCopy('next_' + nextIssue, tailAddSubNumbers)}
                          >
                            {cpd ? '✓' : '复制'}
                          </button>
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
        {/* 右侧面板：自选号码输入 + 直选高倍 + 智取博众分解按钮 */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: '0 0 auto', display: 'flex' }}>
            <SelfPickInputModule issue={selfPickIssue} value={selfPickValue} onChange={onSelfPickChange} />
          </div>
          <div style={{ flex: '1 1 0', minHeight: 0, display: 'flex' }}>
            <ZhiXuanGaoBeiModule issue={selfPickIssue} value={selfPickValue} addSubNumbers={tailAddSubNumbers} wuRongCuoNumbers={wuRongCuoNumbers} />
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
