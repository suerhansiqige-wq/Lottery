import { useState, useMemo, useRef } from 'react'
import { parseDecompGroups, verifyDraw } from '../utils/decompRongCuo.js'

// ============================================================
// 遗漏策略：三组并集（用于通杀码右侧新增列）
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
  return null;
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

// ============================================================
// 规则9预测算法（安全9规则，基于PL3历史数据优化）
// 9个核心杀号规则：allIn(ha1/hs1/va1/ha3) + dblHAdd(ha1/ha2/ha3/va2) + dblHSub(va1)
// ============================================================
function pl3HAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function pl3HSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function pl3VAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function pl3VSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

function generateRule9Numbers(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = pl3HAdd(d1), hs1 = pl3HSub(d1);
  const ha2 = pl3HAdd(d2), hs2 = pl3HSub(d2);
  const ha3 = pl3HAdd(d3), hs3 = pl3HSub(d3);
  const va1 = pl3VAdd(d1, d2), vs1 = pl3VSub(d1, d2);
  const va2 = pl3VAdd(d2, d3), vs2 = pl3VSub(d2, d3);

  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);

  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];

    const ha = pl3HAdd([a,b,c]);
    const hs = pl3HSub([a,b,c]);

    // 安全9规则（9个核心杀号）
    if ([a,b,c].every(v => poolHA1.has(v))) continue;
    if ([a,b,c].every(v => poolHS1.has(v))) continue;
    if ([a,b,c].every(v => poolVA1.has(v))) continue;
    if ([a,b,c].every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolHA1.has(v))) continue;
    if (ha.every(v => poolHA2.has(v))) continue;
    if (ha.every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolVA2.has(v))) continue;
    if (hs.every(v => poolVS1.has(v))) continue;

    result.push(s);
  }
  
  // 动态过滤：超过850注时启用多级过滤
  if (result.length > 850) {
    let filtered = result.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= 5 && sum <= 22;
    });
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const sum = (+s[0]) + (+s[1]) + (+s[2]);
        return sum >= 6 && sum <= 21;
      });
    }
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        const span = Math.max(...digits) - Math.min(...digits);
        return span >= 1;
      });
    }
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const sum = (+s[0]) + (+s[1]) + (+s[2]);
        return sum >= 7 && sum <= 20;
      });
    }
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        const span = Math.max(...digits) - Math.min(...digits);
        return span >= 2;
      });
    }
    return filtered;
  }
  return result;
}

/** 自选号码：用户为「最新未开奖期」手填的号码，独立于分解容错 */
function SelfPickModule({ issue, value, onChange }) {
  const [copiedZuLiu, setCopiedZuLiu] = useState(false);
  const [copiedZuSan, setCopiedZuSan] = useState(false);

  const handleCopy = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'zuLiu') {
        setCopiedZuLiu(true);
        setTimeout(() => setCopiedZuLiu(false), 2000);
      } else {
        setCopiedZuSan(true);
        setTimeout(() => setCopiedZuSan(false), 2000);
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
        setTimeout(() => setCopiedZuLiu(false), 2000);
      } else {
        setCopiedZuSan(true);
        setTimeout(() => setCopiedZuSan(false), 2000);
      }
    }
  };

  const parsed = useMemo(() => {
    const tokens = (value || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    const seen = new Set();
    const nums = [];
    for (const t of tokens) if (!seen.has(t)) { seen.add(t); nums.push(t); }
    const zuLiuNums = [];
    const zuSanNums = [];
    for (const n of nums) (new Set(n.split('')).size === 3 ? zuLiuNums : zuSanNums).push(n);
    return { raw: tokens.length, nums, zuLiuNums, zuSanNums, zuLiu: zuLiuNums.length, zuSan: zuSanNums.length };
  }, [value]);

  return (
    <div style={{ width: '100%', border: '2px solid #00838f', borderRadius: 6, background: '#e0f7fa', overflow: 'hidden' }}>
      <div style={{
        padding: '6px 10px', background: '#00838f', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>自选号码</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea
          value={value || ''}
          onChange={e => onChange && onChange(e.target.value)}
          placeholder="输入自选号码：每行一个，或空格/逗号分隔的三位数，如 123 456 789"
          style={{
            width: '100%', minHeight: 64, resize: 'vertical',
            fontSize: 12, lineHeight: '18px', fontFamily: 'Consolas,Menlo,monospace',
            padding: '4px 6px', boxSizing: 'border-box', borderRadius: 3,
            border: '1px solid #4dd0e1', background: '#fff', color: '#222',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#00695c', fontWeight: 700 }}>
            共 {parsed.nums.length} 注{parsed.raw !== parsed.nums.length ? `（输入 ${parsed.raw}，去重后）` : ''}
          </span>
          <span style={{ fontSize: 11, color: '#00838f' }}>组六{parsed.zuLiu}/组三{parsed.zuSan}</span>
        </div>
        {parsed.nums.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
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
              <div style={{ fontSize: 12, color: '#00695c', fontFamily: 'Consolas,monospace', lineHeight: '18px', wordBreak: 'break-all', padding: 4, maxHeight: 88, overflowY: 'auto', flex: 1 }}>
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
              <div style={{ fontSize: 12, color: '#c62828', fontFamily: 'Consolas,monospace', lineHeight: '18px', wordBreak: 'break-all', padding: 4, maxHeight: 88, overflowY: 'auto', flex: 1 }}>
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
  // 不能用本文件预留行内部的 nextIssue（后者基于 enrichedData，测试行时会多算一期）
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
  const isTrialRow = (item) => trialDigits && trialDigits.every(d => d !== null) && data.length > 0 && item.issue === data[data.length - 1].issue

  // 计算遗漏策略号码（基于完整data，因为需要历史数据）
  const omissionNumbersMap = useMemo(() => {
    const map = new Map();
    const map2 = new Map();
    const map3 = new Map();
    const map4 = new Map(); // 三个策略的并集
    for (let i = 0; i < data.length; i++) {
      const issue = data[i].issue;
      const numbers = generateOmissionNumbers(data, i + 1); // 用i+1期数据预测下一期
      const numbers2 = generateOmissionNumbers2(data, i + 1);
      const numbers3 = generateOmissionNumbers3(data, i + 1);
      map.set(issue, numbers);
      map2.set(issue, numbers2);
      map3.set(issue, numbers3);
      
      // 合并三个策略的号码（取并集）
      const union = new Set([...numbers, ...numbers2, ...numbers3]);
      map4.set(issue, Array.from(union).sort());
    }
    return { map, map2, map3, map4 };
  }, [data]);

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

  // 规则9预测号码（基于近3期数据生成下一期预测）
  const rule9Map = useMemo(() => {
    const map = new Map();
    for (let i = 2; i < data.length; i++) {
      const prevItem = data[i];
      const numbers = generateRule9Numbers(prevItem, data[i-1], data[i-2]);
      map.set(prevItem.issue, numbers);
    }
    return map;
  }, [data]);

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
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
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
                {/* 横加减/竖加减4列已隐藏 - 用户要求 */}
                <th>生号</th>
                <th>连号</th>
                <th>必出号</th>
                <th>通杀码</th>
                <th style={{ borderBottom: '3px solid #ff6b35', display: 'none' }}>遗漏1位</th>
                <th style={{ borderBottom: '3px solid #9b59b6', display: 'none' }}>遗漏2位</th>
                <th style={{ borderBottom: '3px solid #e74c3c', display: 'none' }}>遗漏3位</th>
                <th style={{ borderBottom: '3px solid #27ae60' }}>遗漏验证</th>
                <th style={{ borderBottom: '3px solid #3498db' }}>规则9</th>
                {/* 参考一/参考二/胆码三列表头已彻底删除 - 用户要求 */}
                {/* 智取分解 / 博众分解 两列（表格最右侧，与福彩3D 同位置逻辑） */}
                {DECOMP_COLS.map(c => (
                  <th key={'dcTh_' + c.kind} title={c.title}
                    style={{ borderBottom: `3px solid ${c.kind === 'decomp' ? '#f9a825' : '#43a047'}` }}>
                    {c.th}
                  </th>
                ))}
                <th style={{ display: 'none' }}>出现次1</th>
                <th style={{ display: 'none' }}>出现次2</th>
                <th style={{ display: 'none' }}>号码组一</th>
                <th style={{ display: 'none' }}>号码组二</th>
                <th style={{ display: 'none' }}>号码组三</th>
                <th style={{ display: 'none' }}>号码组四</th>
                <th style={{ display: 'none' }}>号码组五</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((item, idx) => {
                // 组三：百十个中有任意两个相同
                const isZuSan = item.d1 === item.d2 || item.d2 === item.d3 || item.d1 === item.d3;
                const digitStyle = isZuSan ? { color: 'red', fontWeight: 700, fontSize: 20 } : { color: '#000', fontSize: 20 };
                // 预测列下移一行：用上一期数据作为当期预测
                // 【显示规则对齐福彩3D】prevData 第一行回退到自身（不再全显示 -）；prevItem 仅供和值/跨度重复比较
                const prevData = idx > 0 ? displayData[idx - 1] : item; // 第一行显示自身
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
                  {/* 通杀码 - 往期行：上期十位对应通杀码，下期开奖号不含该数字=✓，含=✗ */}
                  <td style={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
                    {(() => {
                      const TONGSHA_MAP = { 0: 0, 1: 8, 2: 6, 3: 4, 4: 7, 5: 9, 6: 1, 7: 2, 8: 4, 9: 6 };
                      const prevItem = data[data.indexOf(item) - 1];
                      if (!prevItem || prevItem.d2 === undefined) return <span style={{ color: '#999' }}>-</span>;
                      const tongsha = TONGSHA_MAP[prevItem.d2];
                      const hasTongsha = item.d1 === tongsha || item.d2 === tongsha || item.d3 === tongsha;
                      const verified = !hasTongsha;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 700, color: '#333' }}>{tongsha}</span>
                          {verified
                            ? <span style={{ color: 'green', fontWeight: 700, fontSize: 14 }} title={`通杀码${tongsha}：下期${item.d1}${item.d2}${item.d3}不含该数字`}>✓</span>
                            : <span style={{ color: 'red', fontWeight: 700, fontSize: 14 }} title={`通杀码${tongsha}：下期${item.d1}${item.d2}${item.d3}包含该数字`}>✗</span>}
                        </div>
                      );
                    })()}
                  </td>
                  {/* 遗漏1位列 - 显示基于上期数据生成的预测号码，并验证当期是否命中 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center', display: 'none' }}>
                    {(() => {
                      const prevIdx = data.indexOf(item) - 1;
                      if (prevIdx < 0) return <span style={{ color: '#999' }}>-</span>;
                      const prevIssue = data[prevIdx].issue;
                      const numbers = omissionNumbersMap.map.get(prevIssue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      
                      // 检查当期开奖号是否在预测列表中
                      const actualNum = `${item.d1}${item.d2}${item.d3}`;
                      const hit = numbers.includes(actualNum);
                      const isCopied = copiedIssues.has(`map-${prevIssue}`);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy(`map-${prevIssue}`, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ 
                            fontSize: 14,
                            fontWeight: 700,
                            color: hit ? '#27ae60' : '#e74c3c',
                          }}>
                            {hit ? '✓' : '✗'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 遗漏2位列 - 显示基于上期数据生成的预测号码（新逻辑），并验证当期是否命中 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center', display: 'none' }}>
                    {(() => {
                      const prevIdx = data.indexOf(item) - 1;
                      if (prevIdx < 0) return <span style={{ color: '#999' }}>-</span>;
                      const prevIssue = data[prevIdx].issue;
                      const numbers = omissionNumbersMap.map2.get(prevIssue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      
                      // 检查当期开奖号是否在预测列表中
                      const actualNum = `${item.d1}${item.d2}${item.d3}`;
                      const hit = numbers.includes(actualNum);
                      const isCopied = copiedIssues.has(`map2-${prevIssue}`);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy(`map2-${prevIssue}`, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ 
                            fontSize: 14,
                            fontWeight: 700,
                            color: hit ? '#27ae60' : '#e74c3c',
                          }}>
                            {hit ? '✓' : '✗'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 遗漏3位列 - 显示基于上期数据生成的预测号码（新逻辑），并验证当期是否命中 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center', display: 'none' }}>
                    {(() => {
                      const prevIdx = data.indexOf(item) - 1;
                      if (prevIdx < 0) return <span style={{ color: '#999' }}>-</span>;
                      const prevIssue = data[prevIdx].issue;
                      const numbers = omissionNumbersMap.map3.get(prevIssue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      
                      // 检查当期开奖号是否在预测列表中
                      const actualNum = `${item.d1}${item.d2}${item.d3}`;
                      const hit = numbers.includes(actualNum);
                      const isCopied = copiedIssues.has(`map3-${prevIssue}`);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy(`map3-${prevIssue}`, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ 
                            fontSize: 14,
                            fontWeight: 700,
                            color: hit ? '#27ae60' : '#e74c3c',
                          }}>
                            {hit ? '✓' : '✗'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 遗漏验证列 - 合并三个策略的号码并验证 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                    {(() => {
                      const prevIdx = data.indexOf(item) - 1;
                      if (prevIdx < 0) return <span style={{ color: '#999' }}>-</span>;
                      const prevIssue = data[prevIdx].issue;
                      const numbers = omissionNumbersMap.map4.get(prevIssue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      
                      // 检查当期开奖号是否在预测列表中
                      const actualNum = `${item.d1}${item.d2}${item.d3}`;
                      const hit = numbers.includes(actualNum);
                      const isCopied = copiedIssues.has(`map4-${prevIssue}`);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy(`map4-${prevIssue}`, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ 
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#666',
                          }}>
                            {numbers.length}注
                          </span>
                          <span style={{ 
                            fontSize: 14,
                            fontWeight: 700,
                            color: hit ? '#27ae60' : '#e74c3c',
                          }}>
                            {hit ? '✓' : '✗'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 规则9列 - 安全9规则预测验证 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                    {(() => {
                      const prevIdx = data.indexOf(item) - 1;
                      if (prevIdx < 2) return <span style={{ color: '#999' }}>-</span>;
                      const prevItem = data[prevIdx];
                      const numbers = rule9Map.get(prevItem.issue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      const actualNum = `${item.d1}${item.d2}${item.d3}`;
                      const hit = numbers.includes(actualNum);
                      const isCopied = copiedIssues.has('rule9-' + prevItem.issue);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy('rule9-' + prevItem.issue, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>
                            {numbers.length}注
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: hit ? '#27ae60' : '#e74c3c' }}>
                            {hit ? '✓' : '✗'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 参考一/参考二/胆码三列单元格已彻底删除 - 用户要求 */}
                  {/* 智取分解 / 博众分解：按期号匹配展示对应 20 组分解参数（与福彩3D 一致） */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, item.issue, c.title))}
                  {/* 出现次1 - 隐藏列 下移一行 */}
                  <td style={{ display: 'none' }}>
                    {prevData.chuXianCi1.length > 0 ? prevData.chuXianCi1.join('') : '-'}
                  </td>
                  {/* 出现次2 - 隐藏列 下移一行 */}
                  <td style={{ display: 'none' }}>
                    {prevData.chuXianCi2.length > 0 ? prevData.chuXianCi2.join('') : '-'}
                  </td>
                  {/* 号码组一 - 隐藏列 */}
                  <td style={{ display: 'none' }}>
                    {allHaoMaZu1[idx].length > 0 ? allHaoMaZu1[idx].join(' ') : '-'}
                  </td>
                  {/* 号码组二 - 隐藏列 */}
                  <td style={{ display: 'none' }}>
                    {allHaoMaZu2[idx].length > 0 ? allHaoMaZu2[idx].join(' ') : '-'}
                  </td>
                  {/* 号码组三 - 隐藏列 */}
                  <td style={{ display: 'none' }}>
                    {allHaoMaZu3[idx].length > 0 ? allHaoMaZu3[idx].join(' ') : '-'}
                  </td>
                  {/* 号码组四 - 隐藏列 */}
                  <td style={{ display: 'none' }}>
                    {allHaoMaZu4[idx].length > 0 ? allHaoMaZu4[idx].join(' ') : '-'}
                  </td>
                  {/* 号码组五 - 隐藏列 */}
                  <td style={{ display: 'none' }}>
                    {allHaoMaZu5[idx].length > 0 ? allHaoMaZu5[idx].join(' ') : '-'}
                  </td>
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
                  {/* 通杀码 - 预留行：最新已开奖期十位对应通杀码，供参考 */}
                  <td style={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
                    {(() => {
                      const TONGSHA_MAP = { 0: 0, 1: 8, 2: 6, 3: 4, 4: 7, 5: 9, 6: 1, 7: 2, 8: 4, 9: 6 };
                      if (!lastItem || lastItem.d2 === undefined) return <span style={{ color: '#999' }}>-</span>;
                      const tongsha = TONGSHA_MAP[lastItem.d2];
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 700, color: '#333' }}>{tongsha}</span>
                          <span style={{ color: '#999', fontSize: 12 }}>(待验证)</span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 遗漏1位 - 预留行：显示基于最新数据生成的预测号码 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center', display: 'none' }}>
                    {(() => {
                      const numbers = omissionNumbersMap.map.get(lastItem.issue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      const isCopied = copiedIssues.has(`map-${lastItem.issue}`);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy(`map-${lastItem.issue}`, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ 
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#ff6b35',
                          }}>
                            ?
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 遗漏2位 - 预留行：显示基于最新数据生成的预测号码（新逻辑） */}
                  <td style={{ padding: '4px 2px', textAlign: 'center', display: 'none' }}>
                    {(() => {
                      const numbers = omissionNumbersMap.map2.get(lastItem.issue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      const isCopied = copiedIssues.has(`map2-${lastItem.issue}`);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy(`map2-${lastItem.issue}`, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ 
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#9b59b6',
                          }}>
                            ?
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 遗漏3位 - 预留行：显示基于最新数据生成的预测号码（新逻辑） */}
                  <td style={{ padding: '4px 2px', textAlign: 'center', display: 'none' }}>
                    {(() => {
                      const numbers = omissionNumbersMap.map3.get(lastItem.issue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      const isCopied = copiedIssues.has(`map3-${lastItem.issue}`);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy(`map3-${lastItem.issue}`, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ 
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#e74c3c',
                          }}>
                            ?
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 遗漏验证 - 预留行：显示基于最新数据生成的三个策略合并号码 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                    {(() => {
                      const numbers = omissionNumbersMap.map4.get(lastItem.issue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      const isCopied = copiedIssues.has(`map4-${lastItem.issue}`);
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy(`map4-${lastItem.issue}`, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ 
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#666',
                          }}>
                            {numbers.length}注
                          </span>
                          <span style={{ 
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#27ae60',
                          }}>
                            ?
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 规则9 - 预留行 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                    {(() => {
                      const numbers = generateRule9Numbers(data[data.length-1], data[data.length-2], data[data.length-3]);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      const isCopied = copiedIssues.has('rule9-' + lastItem.issue);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy('rule9-' + lastItem.issue, numbers)}
                            title="复制所有预测号码"
                            style={{
                              fontSize: 10,
                              padding: '2px 8px',
                              border: '1px solid #95a5a6',
                              borderRadius: 3,
                              background: isCopied ? '#27ae60' : '#95a5a6',
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {isCopied ? '✓' : '复制'}
                          </button>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#666' }}>
                            {numbers.length}注
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#27ae60' }}>
                            ?
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 参考一/参考二/胆码三列预留行占位已彻底删除 - 用户要求 */}
                  {/* 智取分解 / 博众分解 - 预留行：下期分解条件录入框（点按钮后锁定，密码解锁再编辑） */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, appNextIssue || nextIssue, c.title))}
                  {/* 隐藏列占位：出现次1、出现次2、号码组一~五 共 7 个，与表头隐藏列数量一致（原为9个，多出2个已修正） */}
                  <td style={{ display: 'none' }}>-</td>
                  <td style={{ display: 'none' }}>-</td>
                  <td style={{ display: 'none' }}>-</td>
                  <td style={{ display: 'none' }}>-</td>
                  <td style={{ display: 'none' }}>-</td>
                  <td style={{ display: 'none' }}>-</td>
                  <td style={{ display: 'none' }}>-</td>
                </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
        {/* 右侧面板：自选号码 + 智取博众分解按钮 */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SelfPickModule issue={selfPickIssue} value={selfPickValue} onChange={onSelfPickChange} />
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
