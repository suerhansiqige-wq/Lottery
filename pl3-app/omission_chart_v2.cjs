const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'data', 'lotteryData.js');
const content = fs.readFileSync(filePath, 'utf-8');

const entryRegex = /\{\s*issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)\s*\}/g;
const draws = [];
let match;

while ((match = entryRegex.exec(content)) !== null) {
  draws.push({
    issue: match[1],
    d1: parseInt(match[2]),
    d2: parseInt(match[3]),
    d3: parseInt(match[4])
  });
}

console.log(`总数据: ${draws.length} 期\n`);

// 计算遗漏值
function calcMissing(data, upTo, window) {
  const start = Math.max(0, upTo - window + 1);
  const missing = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  for (const pos of ['d1', 'd2', 'd3']) {
    for (let d = 0; d <= 9; d++) {
      let count = 0;
      for (let i = upTo; i >= start; i--) {
        if (data[i][pos] === d) break;
        count++;
      }
      missing[pos][d] = count;
    }
  }
  return missing;
}

// 遗漏折线图策略V2：扩大覆盖面
function generateStrategy(data, upTo) {
  const result = new Set();
  
  // 多窗口遗漏
  const m10 = calcMissing(data, upTo, 10);
  const m20 = calcMissing(data, upTo, 20);
  const m30 = calcMissing(data, upTo, 30);
  
  // === 策略1: 每位遗漏top6（冷号回补）===
  const top6 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
    top6[pos] = digits.slice(0, 6);
  }
  for (const d1 of top6.d1) for (const d2 of top6.d2) for (const d3 of top6.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 策略2: 每位遗漏top5 + 不同位组合 ===
  const top5 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m20[pos][b] - m20[pos][a]);
    top5[pos] = digits.slice(0, 5);
  }
  // 百位6个 × 十位5个 × 个位5个
  for (const d1 of top6.d1) for (const d2 of top5.d2) for (const d3 of top5.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  // 百位5个 × 十位6个 × 个位5个
  for (const d1 of top5.d1) for (const d2 of top6.d2) for (const d3 of top5.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  // 百位5个 × 十位5个 × 个位6个
  const top5_30 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m30[pos][b] - m30[pos][a]);
    top5_30[pos] = digits.slice(0, 5);
  }
  for (const d1 of top5.d1) for (const d2 of top5.d2) for (const d3 of top6.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 策略3: 每位遗漏bottom4（热号延续）===
  const bot4 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][a] - m10[pos][b]);
    bot4[pos] = digits.slice(0, 4);
  }
  for (const d1 of bot4.d1) for (const d2 of bot4.d2) for (const d3 of bot4.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 策略4: 遗漏极值（30期窗口遗漏>=10的必选）===
  const extreme = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    extreme[pos] = [];
    for (let d = 0; d <= 9; d++) {
      if (m30[pos][d] >= 10) extreme[pos].push(d);
    }
    if (extreme[pos].length === 0) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m30[pos][b] - m30[pos][a]);
      extreme[pos] = digits.slice(0, 3);
    }
  }
  for (const d1 of extreme.d1) for (const d2 of extreme.d2) for (const d3 of extreme.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 策略5: 跨窗口共振（10期+20期+30期都排前4）===
  const resonance = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    resonance[pos] = [];
    for (let d = 0; d <= 9; d++) {
      const r10 = getRank(m10[pos], d);
      const r20 = getRank(m20[pos], d);
      const r30 = getRank(m30[pos], d);
      if (r10 <= 4 && r20 <= 5 && r30 <= 5) {
        resonance[pos].push(d);
      }
    }
    if (resonance[pos].length === 0) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
      resonance[pos] = digits.slice(0, 4);
    }
  }
  for (const d1 of resonance.d1) for (const d2 of resonance.d2) for (const d3 of resonance.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 策略6: 冷热温交叉（冷3+热3+温4）===
  const cold = {}, hot = {}, warm = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
    cold[pos] = digits.slice(0, 3);
    hot[pos] = digits.slice(7, 10);
    warm[pos] = digits.slice(3, 7);
  }
  // 6种排列
  for (const d1 of cold.d1) for (const d2 of hot.d2) for (const d3 of warm.d3) result.add(d1*100+d2*10+d3);
  for (const d1 of cold.d1) for (const d2 of warm.d2) for (const d3 of hot.d3) result.add(d1*100+d2*10+d3);
  for (const d1 of hot.d1) for (const d2 of cold.d2) for (const d3 of warm.d3) result.add(d1*100+d2*10+d3);
  for (const d1 of hot.d1) for (const d2 of warm.d2) for (const d3 of cold.d3) result.add(d1*100+d2*10+d3);
  for (const d1 of warm.d1) for (const d2 of cold.d2) for (const d3 of hot.d3) result.add(d1*100+d2*10+d3);
  for (const d1 of warm.d1) for (const d2 of hot.d2) for (const d3 of cold.d3) result.add(d1*100+d2*10+d3);
  
  // === 策略7: 遗漏012路 ===
  for (let route = 0; route < 3; route++) {
    const routeD = {};
    for (const pos of ['d1', 'd2', 'd3']) {
      routeD[pos] = [];
      for (let d = 0; d <= 9; d++) {
        if (m10[pos][d] % 3 === route) routeD[pos].push(d);
      }
      routeD[pos].sort((a, b) => m10[pos][b] - m10[pos][a]);
      routeD[pos] = routeD[pos].slice(0, 5);
    }
    for (const d1 of routeD.d1) for (const d2 of routeD.d2) for (const d3 of routeD.d3) {
      result.add(d1 * 100 + d2 * 10 + d3);
    }
  }
  
  // === 策略8: 和值过滤（top15和值）===
  const sumCount = Array(28).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    const s = data[i].d1 + data[i].d2 + data[i].d3;
    sumCount[s]++;
  }
  const topSums = [];
  const sumIdx = Array.from({ length: 28 }, (_, i) => i);
  sumIdx.sort((a, b) => sumCount[b] - sumCount[a]);
  for (let i = 0; i < 15; i++) topSums.push(sumIdx[i]);
  
  const topSet = new Set(topSums);
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      for (let d3 = 0; d3 <= 9; d3++) {
        if (topSet.has(d1 + d2 + d3)) {
          result.add(d1 * 100 + d2 * 10 + d3);
        }
      }
    }
  }
  
  // === 策略9: 跨度过滤（top7跨度）===
  const spanCount = Array(10).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    const s = Math.max(...digits) - Math.min(...digits);
    spanCount[s]++;
  }
  const topSpans = [];
  const spanIdx = Array.from({ length: 10 }, (_, i) => i);
  spanIdx.sort((a, b) => spanCount[b] - spanCount[a]);
  for (let i = 0; i < 7; i++) topSpans.push(spanIdx[i]);
  
  const spanSet = new Set(topSpans);
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      for (let d3 = 0; d3 <= 9; d3++) {
        if (spanSet.has(Math.max(d1, d2, d3) - Math.min(d1, d2, d3))) {
          result.add(d1 * 100 + d2 * 10 + d3);
        }
      }
    }
  }
  
  return result;
}

function getRank(arr, digit) {
  const val = arr[digit];
  let rank = 1;
  for (let d = 0; d <= 9; d++) {
    if (d !== digit && arr[d] > val) rank++;
  }
  return rank;
}

// 测试
let totalTests = 0, totalHits = 0, totalPredictions = 0;
let maxCount = 0, minCount = Infinity;
let maxIssue = '', minIssue = '';
let maxMiss = 0, maxMissIssue = '';
let curMiss = 0;

for (let i = 50; i < draws.length; i++) {
  const predictions = generateStrategy(draws, i - 1);
  const actual = draws[i].d1 * 100 + draws[i].d2 * 10 + draws[i].d3;
  const hit = predictions.has(actual);
  const count = predictions.size;
  
  totalTests++;
  totalPredictions += count;
  if (hit) {
    totalHits++;
    curMiss = 0;
  } else {
    curMiss++;
    if (curMiss > maxMiss) {
      maxMiss = curMiss;
      maxMissIssue = draws[i].issue;
    }
  }
  
  if (count > maxCount) { maxCount = count; maxIssue = draws[i].issue; }
  if (count < minCount) { minCount = count; minIssue = draws[i].issue; }
}

console.log(`=== 遗漏折线图策略V2 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`最多注数: ${maxCount} 注（${maxIssue}期）`);
console.log(`最少注数: ${minCount} 注（${minIssue}期）`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);

const latest = generateStrategy(draws, draws.length - 1);
console.log(`\n=== 最新一期预测 ===`);
console.log(`预测注数: ${latest.size}`);
