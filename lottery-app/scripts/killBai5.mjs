// 多公式交替杀百位5码测试脚本
import { lotteryData as lotteryData1 } from '../src/data/lotteryData.js';
import { lotteryData as lotteryData2 } from '../src/data/excelData.js';

// 合并数据
const allData = [...lotteryData2, ...lotteryData1];
// 按期号排序去重
const dataMap = new Map();
allData.forEach(d => dataMap.set(d.issue, d));
const data = [...dataMap.values()].sort((a, b) => a.issue.localeCompare(b.issue));

console.log(`总数据量: ${data.length} 期 (${data[0].issue} ~ ${data[data.length-1].issue})`);

// ========== 公式定义 ==========
// 每个公式返回要杀的5个数字（百位）

const formulas = {
  // 公式1: 上期百位±1,±2,±3 (模10)
  f1_prevBaiShift: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1].d1;
    return [0,1,2,3,4].map(i => (prev + i + 1) % 10);
  },

  // 公式2: 上期和值尾数衍生
  f2_sumTail: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const sum = prev.d1 + prev.d2 + prev.d3;
    const tail = sum % 10;
    return [0,1,2,3,4].map(i => (tail + i) % 10);
  },

  // 公式3: 上期跨度衍生
  f3_span: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const digits = [prev.d1, prev.d2, prev.d3];
    const span = Math.max(...digits) - Math.min(...digits);
    return [0,1,2,3,4].map(i => (span + i) % 10);
  },

  // 公式4: 上期百位+十位 和值尾衍生
  f4_baiShiSum: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const s = (prev.d1 + prev.d2) % 10;
    return [0,1,2,3,4].map(i => (s + i * 2) % 10);
  },

  // 公式5: 上期百位+个位 和值尾衍生
  f5_baiGeSum: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const s = (prev.d1 + prev.d3) % 10;
    return [0,1,2,3,4].map(i => (s + i * 2 + 1) % 10);
  },

  // 公式6: 上期十位+个位 和值尾衍生
  f6_shiGeSum: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const s = (prev.d2 + prev.d3) % 10;
    return [0,1,2,3,4].map(i => (s + i * 2 + 3) % 10);
  },

  // 公式7: 上期百位×2 模10 衍生
  f7_baiDouble: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1].d1;
    const base = (prev * 2) % 10;
    return [0,1,2,3,4].map(i => (base + i) % 10);
  },

  // 公式8: 上期和值×百位 模10 衍生
  f8_sumXBai: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const sum = prev.d1 + prev.d2 + prev.d3;
    const base = (sum * prev.d1) % 10;
    return [0,1,2,3,4].map(i => (base + i) % 10);
  },

  // 公式9: 上期百位与十位差值衍生
  f9_baiShiDiff: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const diff = Math.abs(prev.d1 - prev.d2);
    return [0,1,2,3,4].map(i => (diff + i * 2 + 1) % 10);
  },

  // 公式10: 上期百位与个位差值衍生
  f10_baiGeDiff: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const diff = Math.abs(prev.d1 - prev.d3);
    return [0,1,2,3,4].map(i => (diff + i * 2 + 2) % 10);
  },

  // 公式11: 近3期百位出现号+邻号
  f11_recent3Bai: (idx) => {
    if (idx < 3) return null;
    const recent = [data[idx-1].d1, data[idx-2].d1, data[idx-3].d1];
    const killSet = new Set();
    for (const d of recent) {
      killSet.add((d + 1) % 10);
      killSet.add((d + 2) % 10);
      killSet.add((d + 3) % 10);
      killSet.add((d + 4) % 10);
      killSet.add((d + 5) % 10);
    }
    const arr = [...killSet];
    return arr.length >= 5 ? arr.slice(0, 5) : null;
  },

  // 公式12: 上期跨度×2+百位 模10
  f12_span2XBai: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const digits = [prev.d1, prev.d2, prev.d3];
    const span = Math.max(...digits) - Math.min(...digits);
    const base = (span * 2 + prev.d1) % 10;
    return [0,1,2,3,4].map(i => (base + i) % 10);
  },

  // 公式13: 上期和值尾+跨度 模10
  f13_sumTailPlusSpan: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const sum = prev.d1 + prev.d2 + prev.d3;
    const digits = [prev.d1, prev.d2, prev.d3];
    const span = Math.max(...digits) - Math.min(...digits);
    const base = (sum % 10 + span) % 10;
    return [0,1,2,3,4].map(i => (base + i) % 10);
  },

  // 公式14: 上期百位补数(9-百位)衍生
  f14_baiComplement: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1].d1;
    const comp = 9 - prev;
    return [0,1,2,3,4].map(i => (comp + i) % 10);
  },

  // 公式15: 近5期百位热号排除法（杀最近5期出现过的百位）
  f15_recent5BaiKill: (idx) => {
    if (idx < 5) return null;
    const recent = new Set();
    for (let i = 1; i <= 5; i++) {
      recent.add(data[idx - i].d1);
    }
    const arr = [...recent];
    // 如果出现过的>=5个，直接杀这些
    if (arr.length >= 5) return arr.slice(0, 5);
    // 不够5个，补充邻号
    const killSet = new Set(arr);
    for (const d of arr) {
      killSet.add((d + 1) % 10);
      killSet.add((d + 9) % 10);
      if (killSet.size >= 5) break;
    }
    return [...killSet].slice(0, 5);
  },

  // 公式16: 上期十位×3+个位 模10
  f16_shi3XGe: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const base = (prev.d2 * 3 + prev.d3) % 10;
    return [0,1,2,3,4].map(i => (base + i) % 10);
  },

  // 公式17: 上期和值个位×2+百位 模10
  f17_sumTail2XBai: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const sum = prev.d1 + prev.d2 + prev.d3;
    const base = ((sum % 10) * 2 + prev.d1) % 10;
    return [0,1,2,3,4].map(i => (base + i) % 10);
  },

  // 公式18: 上期百位+和值 模10
  f18_baiPlusSum: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const sum = prev.d1 + prev.d2 + prev.d3;
    const base = (prev.d1 + sum) % 10;
    return [0,1,2,3,4].map(i => (base + i) % 10);
  },

  // 公式19: 上期跨度+和值尾 模10 交替步长
  f19_spanSumTail: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1];
    const sum = prev.d1 + prev.d2 + prev.d3;
    const digits = [prev.d1, prev.d2, prev.d3];
    const span = Math.max(...digits) - Math.min(...digits);
    const base = (span + sum % 10) % 10;
    return [0,1,2,3,4].map(i => (base + i * 3 + 1) % 10);
  },

  // 公式20: 上期百位² 模10 衍生
  f20_baiSquare: (idx) => {
    if (idx < 1) return null;
    const prev = data[idx-1].d1;
    const base = (prev * prev) % 10;
    return [0,1,2,3,4].map(i => (base + i) % 10);
  },
};

// ========== 测试单个公式 ==========
function testFormula(name, fn, startIdx, endIdx) {
  let total = 0, hits = 0;
  const missPeriods = [];
  for (let i = startIdx; i < endIdx; i++) {
    const killDigits = fn(i);
    if (!killDigits) continue;
    const actual = data[i].d1;
    total++;
    if (!killDigits.includes(actual)) {
      hits++;
    } else {
      missPeriods.push({ issue: data[i].issue, actual, kill: killDigits });
    }
  }
  const rate = total > 0 ? (hits / total * 100) : 0;
  return { name, total, hits, misses: total - hits, rate, missPeriods };
}

// ========== 交替策略 ==========
// 策略：根据最近N期的表现，选择胜率最高的公式
function testAlternating(windowSize, startIdx, endIdx) {
  const formulaNames = Object.keys(formulas);
  let total = 0, hits = 0;
  const missPeriods = [];
  const usedFormulas = {};

  for (let i = startIdx; i < endIdx; i++) {
    // 统计每个公式在最近windowSize期的表现
    const scores = {};
    for (const fname of formulaNames) {
      let wTotal = 0, wHits = 0;
      for (let j = Math.max(startIdx, i - windowSize); j < i; j++) {
        const killDigits = formulas[fname](j);
        if (!killDigits) continue;
        const actual = data[j].d1;
        wTotal++;
        if (!killDigits.includes(actual)) wHits++;
      }
      scores[fname] = wTotal > 0 ? wHits / wTotal : 0.5;
    }

    // 选得分最高的公式
    let bestFormula = formulaNames[0];
    let bestScore = -1;
    for (const [fname, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestFormula = fname;
      }
    }

    const killDigits = formulas[bestFormula](i);
    if (!killDigits) continue;
    const actual = data[i].d1;
    total++;
    usedFormulas[bestFormula] = (usedFormulas[bestFormula] || 0) + 1;
    if (!killDigits.includes(actual)) {
      hits++;
    } else {
      missPeriods.push({ issue: data[i].issue, actual, kill: killDigits, formula: bestFormula });
    }
  }

  const rate = total > 0 ? (hits / total * 100) : 0;
  return { total, hits, misses: total - hits, rate, missPeriods, usedFormulas };
}

// ========== 运行测试 ==========
const START = 100; // 前100期作为预热
const END = data.length;

console.log(`\n测试范围: ${data[START].issue} ~ ${data[END-1].issue} (共${END-START}期)`);
console.log('\n===== 单公式测试结果 =====\n');

const results = [];
for (const [name, fn] of Object.entries(formulas)) {
  const r = testFormula(name, fn, START, END);
  results.push(r);
  console.log(`${name}: 测试${r.total}期, 命中${r.hits}期, 错误${r.misses}期, 准确率${r.rate.toFixed(1)}%`);
}

// 按准确率排序
results.sort((a, b) => b.rate - a.rate);
console.log('\n===== 单公式准确率排名 =====\n');
results.forEach((r, i) => {
  console.log(`${i+1}. ${r.name}: ${r.rate.toFixed(1)}% (${r.hits}/${r.total})`);
});

// ========== 交替策略测试 ==========
console.log('\n===== 交替策略测试结果 =====\n');

for (const windowSize of [3, 5, 10, 15, 20, 30]) {
  const r = testAlternating(windowSize, START, END);
  console.log(`窗口${windowSize}期: 测试${r.total}期, 命中${r.hits}期, 错误${r.misses}期, 准确率${r.rate.toFixed(1)}%`);
  console.log(`  公式使用分布: ${Object.entries(r.usedFormulas).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`${k}(${v})`).join(', ')}`);
}

// ========== 最优交替：每期选所有公式中最好的 ==========
console.log('\n===== 理论最优交替（事后选择最佳公式）=====');
let optTotal = 0, optHits = 0;
for (let i = START; i < END; i++) {
  const actual = data[i].d1;
  let anyHit = false;
  for (const fn of Object.values(formulas)) {
    const killDigits = fn(i);
    if (!killDigits) continue;
    if (!killDigits.includes(actual)) { anyHit = true; break; }
  }
  optTotal++;
  if (anyHit) optHits++;
}
console.log(`理论最优: 测试${optTotal}期, 命中${optHits}期, 准确率${(optHits/optTotal*100).toFixed(1)}%`);
console.log(`(这是每期从事后角度选最佳公式的理论上限)`);
