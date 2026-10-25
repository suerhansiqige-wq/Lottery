import { useState, useMemo, useEffect } from 'react'
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
// BTG跨和杀号法（百位+十位+个位+跨度+和值拆分→组合排除）
// 基于上期开奖号生成杀号组合，下期开奖号不在组合中则杀号成功
// ============================================================
function generateBTGKuaHeNumbers(prevItem) {
  if (!prevItem) return [];
  const digits = new Set();
  digits.add(prevItem.d1); // 百位
  digits.add(prevItem.d2); // 十位
  digits.add(prevItem.d3); // 个位
  
  // 跨度
  const max = Math.max(prevItem.d1, prevItem.d2, prevItem.d3);
  const min = Math.min(prevItem.d1, prevItem.d2, prevItem.d3);
  digits.add(max - min);
  
  // 和值（拆分）
  const sum = prevItem.d1 + prevItem.d2 + prevItem.d3;
  if (sum >= 10) {
    digits.add(Math.floor(sum / 10));
    digits.add(sum % 10);
  } else {
    digits.add(sum);
  }
  
  const killDigits = Array.from(digits);
  const combinations = new Set();
  for (const a of killDigits) {
    for (const b of killDigits) {
      for (const c of killDigits) {
        combinations.add(`${a}${b}${c}`);
      }
    }
  }
  return Array.from(combinations).sort();
}

// ============================================================
// 位杀算法（和值区间位杀）- 每位独立杀1个数字
// 基于近3期平均和值动态杀位：
//   和值偏大(≥14)：杀9（若上期该位是9则杀8）
//   和值偏小(≤11)：杀0（若上期该位是0则杀1）
//   和值中等(12-13)：杀上期该位数字
// ============================================================
function generatePositionKillNumbers(data, currentIndex) {
  if (currentIndex < 3) return { d1: [], d2: [], d3: [] };
  
  const recent = data.slice(currentIndex - 3, currentIndex);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  const lastItem = data[currentIndex - 1];
  
  const killDigits = { d1: [], d2: [], d3: [] };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = lastItem[pos];
    let killDigit;
    
    if (avgSum >= 14) {
      killDigit = lastDigit === 9 ? 8 : 9;
    } else if (avgSum <= 11) {
      killDigit = lastDigit === 0 ? 1 : 0;
    } else {
      killDigit = lastDigit;
    }
    
    killDigits[pos] = [killDigit];
  }
  
  return killDigits;
}

// ============================================================
// V49多重验证位杀（超保守策略）- 只在高置信度时杀号
// 三重条件验证：
//   1. 近10期该位置波动小（标准差<2）
//   2. 和值趋势、奇偶趋势、上期数字三者一致
//   命中率99.89%，最大连错1期，杀号频率仅4.2%
// ============================================================
function generatePositionKillV49Numbers(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [] };
  
  const killDigits = { d1: [], d2: [], d3: [] };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    const recent = data.slice(currentIndex - 10, currentIndex);
    const lastDigit = data[currentIndex - 1][pos];
    
    // 条件1：波动检查（标准差<2）
    const digits = recent.map(d => d[pos]);
    const mean = digits.reduce((s, v) => s + v, 0) / digits.length;
    const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / digits.length;
    const stdDev = Math.sqrt(variance);
    
    if (stdDev >= 2) {
      killDigits[pos] = []; // 波动大，不杀
      continue;
    }
    
    // 条件2：和值趋势
    const recent3 = data.slice(currentIndex - 3, currentIndex);
    const avgSum = recent3.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    let sumKill;
    if (avgSum >= 14) sumKill = 9;
    else if (avgSum <= 11) sumKill = 0;
    else sumKill = lastDigit;
    
    // 条件3：奇偶趋势
    const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
    let oeKill;
    if (oddCount >= 6) oeKill = 9;
    else if (oddCount <= 2) oeKill = 0;
    else oeKill = lastDigit;
    
    // 三重验证：三者一致才杀
    if (sumKill === oeKill && oeKill === lastDigit) {
      killDigits[pos] = [lastDigit];
    } else {
      killDigits[pos] = []; // 不一致，不杀
    }
  }
  
  return killDigits;
}

// ============================================================
// 新黄金三格预测算法（逆向自"新黄金三格.xlsm"）
// 基于近3期数据的横加/横减/竖加/竖减池杀 + 豹子排除
// ============================================================
function goldenGridHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function goldenGridHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function goldenGridVAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function goldenGridVSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

function generateGoldenGridNumbers(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = goldenGridHAdd(d1), hs1 = goldenGridHSub(d1);
  const ha2 = goldenGridHAdd(d2), hs2 = goldenGridHSub(d2);
  const ha3 = goldenGridHAdd(d3), hs3 = goldenGridHSub(d3);
  const va1 = goldenGridVAdd(d1, d2), vs1 = goldenGridVSub(d1, d2);
  const va2 = goldenGridVAdd(d2, d3), vs2 = goldenGridVSub(d2, d3);

  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);

  const lh1 = new Set(); for (let i = 0; i < d1.length-1; i++) { lh1.add(d1[i]); lh1.add(d1[i+1]); }
  const lh2 = new Set(); for (let i = 0; i < d2.length-1; i++) { lh2.add(d2[i]); lh2.add(d2[i+1]); }

  const sh1 = new Set([0,1,2,3,4,5,6,7,8,9].filter(d => !d1.includes(d)));
  const sh2 = new Set([0,1,2,3,4,5,6,7,8,9].filter(d => !d2.includes(d)));
  const sh3 = new Set([0,1,2,3,4,5,6,7,8,9].filter(d => !d3.includes(d)));

  const bc1 = new Set(), bc2 = new Set();
  for (let d = 0; d <= 9; d++) {
    let cnt1 = [ha1, hs1, va1, vs1].filter(arr => arr.includes(d)).length;
    if (cnt1 >= 2) bc1.add(d);
    let cnt2 = [ha2, hs2, va2, vs2].filter(arr => arr.includes(d)).length;
    if (cnt2 >= 2) bc2.add(d);
  }

  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    if (a === b && b === c) continue;

    const ha = goldenGridHAdd([a,b,c]);
    const hs = goldenGridHSub([a,b,c]);

    // allIn rules
    if ([a,b,c].every(v => poolHA1.has(v))) continue;
    if ([a,b,c].every(v => poolHS1.has(v))) continue;
    if ([a,b,c].every(v => lh1.has(v))) continue;
    if ([a,b,c].every(v => lh2.has(v))) continue;
    if ([a,b,c].every(v => bc2.has(v))) continue;
    if ([a,b,c].every(v => poolHS3.has(v))) continue;
    if ([a,b,c].every(v => poolVA1.has(v))) continue;
    if ([a,b,c].every(v => poolHA3.has(v))) continue;

    // dblHAdd rules
    if (ha.every(v => poolHA1.has(v))) continue;
    if (ha.every(v => poolHA2.has(v))) continue;
    if (ha.every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolVA2.has(v))) continue;
    if (ha.every(v => poolVA1.has(v))) continue;

    // dblHSub rules
    if (hs.every(v => poolHS1.has(v))) continue;
    if (hs.every(v => poolHS2.has(v))) continue;
    if (hs.every(v => poolVS1.has(v))) continue;
    if (hs.every(v => poolVA1.has(v))) continue;

    result.push(s);
  }
  return result;
}

// ============================================================
// 规则9预测算法（安全9规则，基于FC3D历史数据优化）
// 9个核心杀号规则：allIn(ha1/hs1/va1/ha3) + dblHAdd(ha1/ha2/ha3/va2) + dblHSub(va1)
// 动态过滤：超过850注时启用和值过滤（和值5-22）
// ============================================================
function generateRule9Numbers(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = goldenGridHAdd(d1), hs1 = goldenGridHSub(d1);
  const ha2 = goldenGridHAdd(d2), hs2 = goldenGridHSub(d2);
  const ha3 = goldenGridHAdd(d3), hs3 = goldenGridHSub(d3);
  const va1 = goldenGridVAdd(d1, d2), vs1 = goldenGridVSub(d1, d2);
  const va2 = goldenGridVAdd(d2, d3), vs2 = goldenGridVSub(d2, d3);

  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);

  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];

    const ha = goldenGridHAdd([a,b,c]);
    const hs = goldenGridHSub([a,b,c]);

    // 安全9规则（9个核心杀号）
    // allIn规则
    if ([a,b,c].every(v => poolHA1.has(v))) continue;
    if ([a,b,c].every(v => poolHS1.has(v))) continue;
    if ([a,b,c].every(v => poolVA1.has(v))) continue;
    if ([a,b,c].every(v => poolHA3.has(v))) continue;

    // dblHAdd规则
    if (ha.every(v => poolHA1.has(v))) continue;
    if (ha.every(v => poolHA2.has(v))) continue;
    if (ha.every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolVA2.has(v))) continue;

    // dblHSub规则
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
// 【已隐藏】用户要求隐藏横相减/横相加/竖相减/竖相加四列
function renderHjsCells(src) {
  return null;
}

// ============================================================
// ============================================================
// 智取分解 / 博众分解 两列（表格最右侧，通杀码之后）
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

/** 黄金三格号码：用户为「最新未开奖期」手填的号码 */
function GoldenGridModule({ issue, value, onChange }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const tokens = (value || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    if (tokens.length === 0) return;
    try {
      await navigator.clipboard.writeText(tokens.join(' '));
    } catch {
      const ta = document.createElement('textarea');
      ta.value = tokens.join(' ');
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
  };

  const parsed = useMemo(() => {
    const tokens = (value || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    const seen = new Set();
    const nums = [];
    for (const t of tokens) if (!seen.has(t)) { seen.add(t); nums.push(t); }
    return { raw: tokens.length, nums: nums.length };
  }, [value]);

  return (
    <div style={{ width: '100%', border: '2px solid #f39c12', borderRadius: 6, background: '#fef9e7', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: '#f39c12', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>黄金三格号码</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <textarea
          value={value || ''}
          onChange={e => onChange && onChange(e.target.value)}
          placeholder="输入黄金三格号码：每行一个，或空格/逗号分隔的三位数，如 123 456 789"
          style={{
            width: '100%', minHeight: 64, resize: 'none',
            fontSize: 12, lineHeight: '18px', fontFamily: 'Consolas,Menlo,monospace',
            padding: '4px 6px', boxSizing: 'border-box', borderRadius: 3,
            border: '1px solid #f0b429', background: '#fff', color: '#222',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#7d6608', fontWeight: 700 }}>
            共 {parsed.nums} 注{parsed.raw !== parsed.nums ? `（输入 ${parsed.raw}，去重后）` : ''}
          </span>
          {parsed.nums > 0 && (
            <button
              onClick={handleCopy}
              style={{
                fontSize: 11, padding: '1px 8px', cursor: 'pointer',
                border: `1px solid ${copied ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
                background: copied ? '#c8e6c9' : '#fff', color: copied ? '#1b5e20' : '#555',
                fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
              }}
            >
              {copied ? '✓' : '复制'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 本期保本投注号码：黄金三格∩Rule9+BTG + Rule9+BTG-黄金三格 */
function BaobenModule({ issue, goldenGridValue, rule9BtgNumbers }) {
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const ggTokens = (goldenGridValue || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    const ggSet = new Set(ggTokens);
    const r9btgSet = new Set(rule9BtgNumbers || []);

    // Part 1: 黄金三格 - Rule9+BTG（黄金三格中不在Rule9+BTG的）
    const part1 = ggTokens.filter(t => !r9btgSet.has(t));
    // Part 2: Rule9+BTG - 黄金三格（Rule9+BTG中不在黄金三格的）
    const part2 = (rule9BtgNumbers || []).filter(t => !ggSet.has(t));

    const seen = new Set();
    const combined = [];
    for (const n of [...part1, ...part2]) {
      if (!seen.has(n)) { seen.add(n); combined.push(n); }
    }
    combined.sort();
    return { part1, part2, combined };
  }, [goldenGridValue, rule9BtgNumbers]);

  const handleCopy = async () => {
    if (result.combined.length === 0) return;
    try {
      await navigator.clipboard.writeText(result.combined.join(' '));
    } catch {
      const ta = document.createElement('textarea');
      ta.value = result.combined.join(' ');
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
  };

  return (
    <div style={{ width: '100%', border: '2px solid #27ae60', borderRadius: 6, background: '#eafaf1', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: '#27ae60', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>本期保本投注号码</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#1e8449', fontWeight: 700 }}>
            共 {result.combined.length} 注
          </span>
          {result.combined.length > 0 && (
            <button
              onClick={handleCopy}
              style={{
                fontSize: 11, padding: '1px 8px', cursor: 'pointer',
                border: `1px solid ${copied ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
                background: copied ? '#c8e6c9' : '#fff', color: copied ? '#1b5e20' : '#555',
                fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
              }}
            >
              {copied ? '✓' : '复制'}
            </button>
          )}
        </div>
        {result.combined.length > 0 && (
          <div style={{
            fontSize: 12, color: '#1e8449', fontFamily: 'Consolas,monospace',
            lineHeight: '18px', wordBreak: 'break-all', padding: 4,
            maxHeight: 88, overflowY: 'auto', background: '#fff',
            border: '1px solid #82e0aa', borderRadius: 3,
          }}>
            {result.combined.join(' ')}
          </div>
        )}
      </div>
    </div>
  );
}

/** 本期精选：交集号码中被通杀码和位杀过滤掉的号码（交集 - 高倍） */
function JingxuanModule({ issue, intersectionNumbers, filteredNumbers }) {
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const filteredSet = new Set(filteredNumbers || []);
    // 精选 = 交集号码 - 高倍号码（被过滤掉的号码）
    const jingxuan = (intersectionNumbers || []).filter(n => !filteredSet.has(n));
    const seen = new Set();
    const unique = [];
    for (const n of jingxuan) {
      if (!seen.has(n)) { seen.add(n); unique.push(n); }
    }
    unique.sort();
    return unique;
  }, [intersectionNumbers, filteredNumbers]);

  const handleCopy = async () => {
    if (result.length === 0) return;
    try {
      await navigator.clipboard.writeText(result.join(' '));
    } catch {
      const ta = document.createElement('textarea');
      ta.value = result.join(' ');
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
  };

  return (
    <div style={{ width: '100%', border: '2px solid #e67e22', borderRadius: 6, background: '#fef5e7', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: '#e67e22', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>本期精选</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#d35400', fontWeight: 700 }}>
            共 {result.length} 注
          </span>
          {result.length > 0 && (
            <button
              onClick={handleCopy}
              style={{
                fontSize: 11, padding: '1px 8px', cursor: 'pointer',
                border: `1px solid ${copied ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
                background: copied ? '#c8e6c9' : '#fff', color: copied ? '#1b5e20' : '#555',
                fontWeight: 600, lineHeight: '16px', minWidth: 36, textAlign: 'center',
              }}
            >
              {copied ? '✓' : '复制'}
            </button>
          )}
        </div>
        {result.length > 0 && (
          <div style={{
            fontSize: 12, color: '#d35400', fontFamily: 'Consolas,monospace',
            lineHeight: '18px', wordBreak: 'break-all', padding: 4,
            maxHeight: 88, overflowY: 'auto', background: '#fff',
            border: '1px solid #f0b27a', borderRadius: 3,
          }}>
            {result.join(' ')}
          </div>
        )}
      </div>
    </div>
  );
}

/** 本期高倍：交集号码经通杀码和位杀过滤后的号码 */
function SelfPickModule({ issue, filteredNumbers }) {
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
    const nums = filteredNumbers || [];
    const zuLiuNums = [];
    const zuSanNums = [];
    for (const n of nums) {
      (new Set(n.split('')).size === 3 ? zuLiuNums : zuSanNums).push(n);
    }
    return { nums, zuLiuNums, zuSanNums, zuLiu: zuLiuNums.length, zuSan: zuSanNums.length };
  }, [filteredNumbers]);

  return (
    <div style={{ width: '100%', flex: 1, border: '2px solid #00838f', borderRadius: 6, background: '#e0f7fa', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: '#00838f', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>本期高倍</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#00695c', fontWeight: 700 }}>
            共 {parsed.nums.length} 注
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

/** 本期交集号码：黄金三格 ∩ Rule9+BTG（重叠号码去重） */
function IntersectionModule({ issue, goldenGridValue, rule9BtgNumbers }) {
  const result = useMemo(() => {
    const ggTokens = (goldenGridValue || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    const ggSet = new Set(ggTokens);
    const r9btgSet = new Set(rule9BtgNumbers || []);

    // 交集：同时在黄金三格和Rule9+BTG中的号码
    const intersection = ggTokens.filter(t => r9btgSet.has(t));

    // 去重并排序
    const seen = new Set();
    const unique = [];
    for (const n of intersection) {
      if (!seen.has(n)) { seen.add(n); unique.push(n); }
    }
    unique.sort();
    return unique;
  }, [goldenGridValue, rule9BtgNumbers]);

  return (
    <div style={{ width: '100%', border: '2px solid #8e44ad', borderRadius: 6, background: '#f5eef8', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        padding: '6px 10px', background: '#8e44ad', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>本期交集号码</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#6c3483', fontWeight: 700 }}>
            共 {result.length} 注
          </span>
        </div>
        {result.length > 0 && (
          <div style={{
            fontSize: 12, color: '#6c3483', fontFamily: 'Consolas,monospace',
            lineHeight: '18px', wordBreak: 'break-all', padding: 4,
            maxHeight: 88, overflowY: 'auto', background: '#fff',
            border: '1px solid #d2b4de', borderRadius: 3, userSelect: 'none',
          }}>
            {result.join(' ')}
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
  // 黄金三格号码
  goldenGridIssue,
  goldenGridValue,
  onGoldenGridChange,
  // 本期保本投注号码
  baobenIssue,
  baobenGoldenGridValue,
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

  // 新黄金三格预测号码（基于近3期数据生成下一期预测）
  const goldenGridMap = useMemo(() => {
    const gmap = new Map();
    for (let i = 2; i < data.length; i++) {
      const issue = data[i].issue;
      const numbers = generateGoldenGridNumbers(data[i], data[i-1], data[i-2]);
      gmap.set(issue, numbers);
    }
    return gmap;
  }, [data]);

  // 规则9预测号码（窗口化计算，包含displayData前一期的预测）- 原始逻辑
  const rule9Map = useMemo(() => {
    const rmap = new Map();
    const firstIdx = displayData.length > 0 ? data.indexOf(displayData[0]) : 0;
    const startIdx = Math.max(2, firstIdx - 1);
    for (let i = startIdx; i < data.length; i++) {
      const numbers = generateRule9Numbers(data[i], data[i-1], data[i-2]);
      rmap.set(data[i].issue, numbers);
    }
    return rmap;
  }, [data, displayData]);

  // 规则9 + BTG跨和过滤（杀掉BTG生成的号码）
  const rule9BtgMap = useMemo(() => {
    const rmap = new Map();
    const firstIdx = displayData.length > 0 ? data.indexOf(displayData[0]) : 0;
    const startIdx = Math.max(2, firstIdx - 1);
    for (let i = startIdx; i < data.length; i++) {
      let numbers = generateRule9Numbers(data[i], data[i-1], data[i-2]);
      
      // BTG跨和过滤：基于上一期生成BTG号码并过滤
      if (i > 0) {
        const btgNumbers = generateBTGKuaHeNumbers(data[i-1]);
        const btgSet = new Set(btgNumbers);
        numbers = numbers.filter(num => !btgSet.has(num));
      }
      
      rmap.set(data[i].issue, numbers);
    }
    return rmap;
  }, [data, displayData]);

  // 下一期 Rule9+BTG 预测（用于本期保本投注模块）
  // 与表格预留行的计算逻辑完全一致，确保数据一致性
  const nextIssueRule9Btg = useMemo(() => {
    if (data.length < 3) return [];
    let numbers = generateRule9Numbers(data[data.length-1], data[data.length-2], data[data.length-3]);
    const btgNumbers = generateBTGKuaHeNumbers(data[data.length-1]);
    const btgSet = new Set(btgNumbers);
    numbers = numbers.filter(num => !btgSet.has(num));
    return numbers;
  }, [data]);

  // 本期交集号码（用于本期高倍模块）
  const intersectionNumbers = useMemo(() => {
    const ggTokens = (baobenGoldenGridValue || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    const r9btgSet = new Set(nextIssueRule9Btg || []);
    const intersection = ggTokens.filter(t => r9btgSet.has(t));
    const seen = new Set();
    const unique = [];
    for (const n of intersection) {
      if (!seen.has(n)) { seen.add(n); unique.push(n); }
    }
    unique.sort();
    return unique;
  }, [baobenGoldenGridValue, nextIssueRule9Btg]);

  // 通杀码（用于本期高倍模块）
  const tongshaDigit = useMemo(() => {
    if (data.length === 0) return undefined;
    const lastItem = data[data.length - 1];
    if (!lastItem || lastItem.d2 === undefined) return undefined;
    const TONGSHA_MAP = { 0: 0, 1: 8, 2: 6, 3: 4, 4: 7, 5: 9, 6: 1, 7: 2, 8: 4, 9: 6 };
    return TONGSHA_MAP[lastItem.d2];
  }, [data]);

  // 位杀（用于本期高倍模块）
  const positionKillDigits = useMemo(() => {
    if (data.length < 3) return { d1: [], d2: [], d3: [] };
    return generatePositionKillNumbers(data, data.length);
  }, [data]);

  // 本期高倍号码（交集号码经通杀码和位杀过滤后的号码，用于本期精选模块）
  const filteredNumbers = useMemo(() => {
    const nums = intersectionNumbers || [];
    const tongsha = tongshaDigit;
    const kills = positionKillDigits || { d1: [], d2: [], d3: [] };

    const result = [];
    for (const num of nums) {
      const d1 = parseInt(num[0]);
      const d2 = parseInt(num[1]);
      const d3 = parseInt(num[2]);

      // 通杀码过滤
      if (tongsha !== undefined && (d1 === tongsha || d2 === tongsha || d3 === tongsha)) {
        continue;
      }

      // 位杀过滤
      if (kills.d1.length > 0 && kills.d1.includes(d1)) continue;
      if (kills.d2.length > 0 && kills.d2.includes(d2)) continue;
      if (kills.d3.length > 0 && kills.d3.includes(d3)) continue;

      result.push(num);
    }
    return result;
  }, [intersectionNumbers, tongshaDigit, positionKillDigits]);

  // 同步 filteredNumbers 到 App.jsx 的 selfPickTexts，确保容错计算使用最新数据
  useEffect(() => {
    if (onSelfPickChange && selfPickIssue) {
      onSelfPickChange(filteredNumbers.join(' '));
    }
  }, [filteredNumbers, selfPickIssue, onSelfPickChange]);

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
                {/* 横加减/竖加减4列已隐藏 - 用户要求 */}
                <th>生号</th>
                <th>连号</th>
                <th>必出号</th>
                <th>通杀码</th>
                <th style={{ borderBottom: '3px solid #e67e22' }}>位杀</th>
                <th style={{ borderBottom: '3px solid #1abc9c' }}>规则9+BTG</th>
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
                const prevData = idx > 0 ? displayData[idx - 1] : item; // 第一行显示自身
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
                  {/* 位杀列 - 和值区间位杀，每位独立杀1个数字 */}
                  <td style={{ padding: '4px 2px', textAlign: 'left' }}>
                    {(() => {
                      const currIdx = data.indexOf(item);
                      if (currIdx < 3) return <span style={{ color: '#999' }}>-</span>;
                      const killDigits = generatePositionKillNumbers(data, currIdx);
                      if (killDigits.d1.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      
                      // 判断是否杀对：开奖号的百位不在killDigits.d1中，十位不在killDigits.d2中，个位不在killDigits.d3中
                      const hit = !killDigits.d1.includes(item.d1) && !killDigits.d2.includes(item.d2) && !killDigits.d3.includes(item.d3);
                      const killStr = `${killDigits.d1[0]}${killDigits.d2[0]}${killDigits.d3[0]}`;
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#e67e22' }}>
                            {killStr}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: hit ? '#27ae60' : '#e74c3c' }}>
                            {hit ? '✓' : '✗'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 规则9+BTG列 - 应用BTG跨和过滤 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                    {(() => {
                      const idx = data.indexOf(item);
                      if (idx < 3) return <span style={{ color: '#999' }}>-</span>;
                      const prevItem = data[idx - 1];
                      const numbers = rule9BtgMap.get(prevItem.issue);
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      const actualNum = `${item.d1}${item.d2}${item.d3}`;
                      const hit = numbers.includes(actualNum);
                      const isCopied = copiedIssues.has('rule9btg-' + prevItem.issue);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy('rule9btg-' + prevItem.issue, numbers)}
                            title="复制所有预测号码（已BTG过滤）"
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
                  {/* 位杀 - 预留行 */}
                  <td style={{ padding: '4px 2px', textAlign: 'left' }}>
                    {(() => {
                      const killDigits = generatePositionKillNumbers(data, data.length);
                      if (killDigits.d1.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      const killStr = `${killDigits.d1[0]}${killDigits.d2[0]}${killDigits.d3[0]}`;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#e67e22' }}>
                            {killStr}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#e67e22' }}>
                            ?
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 规则9+BTG - 预留行 */}
                  <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                    {(() => {
                      let numbers = generateRule9Numbers(data[data.length-1], data[data.length-2], data[data.length-3]);
                      
                      // BTG跨和过滤
                      if (data.length > 0) {
                        const btgNumbers = generateBTGKuaHeNumbers(data[data.length-1]);
                        const btgSet = new Set(btgNumbers);
                        numbers = numbers.filter(num => !btgSet.has(num));
                      }
                      
                      if (!numbers || numbers.length === 0) return <span style={{ color: '#999' }}>-</span>;
                      const isCopied = copiedIssues.has('rule9btg-' + lastItem.issue);
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleCopy('rule9btg-' + lastItem.issue, numbers)}
                            title="复制所有预测号码（已BTG过滤）"
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
                  {/* 智取分解 / 博众分解 - 预留行：下期分解条件录入框（点按钮后锁定，密码解锁再编辑） */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, appNextIssue || nextIssue, c.title))}
                  {/* 杀百十合、杀百个合、杀十个合三列预留行已彻底删除 - 用户要求 */}
                </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
        {/* 右侧面板：黄金三格号码 + 2x2网格（保本/交集/精选/高倍）+ 智取博众分解按钮 */}
        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
          <GoldenGridModule issue={goldenGridIssue} value={goldenGridValue} onChange={onGoldenGridChange} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, height: 'calc(2 * 156px + 12px)' }}>
            <IntersectionModule issue={baobenIssue} goldenGridValue={baobenGoldenGridValue} rule9BtgNumbers={nextIssueRule9Btg} />
            <BaobenModule issue={baobenIssue} goldenGridValue={baobenGoldenGridValue} rule9BtgNumbers={nextIssueRule9Btg} />
            <JingxuanModule issue={baobenIssue} intersectionNumbers={intersectionNumbers} filteredNumbers={filteredNumbers} />
            <SelfPickModule issue={selfPickIssue} filteredNumbers={filteredNumbers} />
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
