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

// 计算到某一期每位每个数字的遗漏值
function calcMissingAt(data, upTo, window) {
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

// 计算遗漏趋势（近N期的变化率）
function calcOmissionTrend(data, upTo) {
  const trend = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    for (let d = 0; d <= 9; d++) {
      // 计算近5期的遗漏变化
      let recentChanges = 0;
      let prevMissing = -1;
      for (let i = 0; i < 5; i++) {
        const checkIdx = upTo - i;
        if (checkIdx < 0) break;
        
        let miss = 0;
        for (let j = checkIdx; j >= Math.max(0, checkIdx - 19); j--) {
          if (data[j][pos] === d) break;
          miss++;
        }
        
        if (prevMissing >= 0) {
          recentChanges += (miss - prevMissing);
        }
        prevMissing = miss;
      }
      trend[pos][d] = recentChanges;
    }
  }
  return trend;
}

// 计算历史遗漏模式（过去100期中，当前遗漏模式出现后的下期结果）
function calcHistoricalPattern(data, upTo) {
  const patternHits = new Map(); // pattern -> {total, hits}
  
  // 回溯100期，找出相似的遗漏模式
  for (let lookback = 10; lookback <= Math.min(200, upTo); lookback += 5) {
    const histUpTo = upTo - lookback;
    if (histUpTo < 30) break;
    
    const histMissing = calcMissingAt(data, histUpTo, 10);
    const nextIdx = histUpTo + 1;
    if (nextIdx >= data.length) continue;
    
    // 提取关键特征：每位遗漏top3
    const features = [];
    for (const pos of ['d1', 'd2', 'd3']) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => histMissing[pos][b] - histMissing[pos][a]);
      features.push(digits.slice(0, 3).join(''));
    }
    const key = features.join('-');
    
    if (!patternHits.has(key)) {
      patternHits.set(key, { total: 0, hits: new Set() });
    }
    const entry = patternHits.get(key);
    entry.total++;
    entry.hits.add(data[nextIdx].d1 * 100 + data[nextIdx].d2 * 10 + data[nextIdx].d3);
  }
  
  return patternHits;
}

// 终极策略：遗漏趋势+历史模式+多维度融合
function generateUltimateStrategy(data, upTo) {
  const m10 = calcMissingAt(data, upTo, 10);
  const m20 = calcMissingAt(data, upTo, 20);
  const m30 = calcMissingAt(data, upTo, 30);
  const trend = calcOmissionTrend(data, upTo);
  
  const result = new Set();
  
  // === 维度1: 遗漏加速回补（遗漏值高且趋势为正）===
  const accelCold = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    accelCold[pos] = [];
    for (let d = 0; d <= 9; d++) {
      const score = m10[pos][d] * 2 + Math.max(0, trend[pos][d]);
      if (score >= 10) accelCold[pos].push(d);
    }
    if (accelCold[pos].length < 3) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => (m10[pos][b] * 2 + Math.max(0, trend[pos][b])) - 
                              (m10[pos][a] * 2 + Math.max(0, trend[pos][a])));
      accelCold[pos] = digits.slice(0, 3);
    }
    accelCold[pos] = accelCold[pos].slice(0, 5);
  }
  for (const d1 of accelCold.d1) for (const d2 of accelCold.d2) for (const d3 of accelCold.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 维度2: 多窗口共振（10期+20期+30期都排前4）===
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
    if (resonance[pos].length < 3) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
      resonance[pos] = digits.slice(0, 3);
    }
  }
  for (const d1 of resonance.d1) for (const d2 of resonance.d2) for (const d3 of resonance.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 维度3: 每位遗漏top6组合（核心集）===
  const top6 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
    top6[pos] = digits.slice(0, 6);
  }
  for (const d1 of top6.d1) for (const d2 of top6.d2) for (const d3 of top6.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 维度4: 热号延续（每位bottom4）===
  const bot4 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][a] - m10[pos][b]);
    bot4[pos] = digits.slice(0, 4);
  }
  for (const d1 of bot4.d1) for (const d2 of bot4.d2) for (const d3 of bot4.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 维度5: 冷热交叉（冷top3 × 热top3 × 全top5）===
  const cold3 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
    cold3[pos] = digits.slice(0, 3);
  }
  // 冷-热-全
  for (const d1 of cold3.d1) for (const d2 of bot4.d2) for (const d3 of top6.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  // 热-冷-全
  for (const d1 of bot4.d1) for (const d2 of cold3.d2) for (const d3 of top6.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  // 全-冷-热
  for (const d1 of top6.d1) for (const d2 of cold3.d2) for (const d3 of bot4.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 维度6: 和值top12 ===
  const sumFreq = Array(28).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    sumFreq[data[i].d1 + data[i].d2 + data[i].d3]++;
  }
  const topSums = [];
  const sumIdx = Array.from({ length: 28 }, (_, i) => i);
  sumIdx.sort((a, b) => sumFreq[b] - sumFreq[a]);
  for (let i = 0; i < 12; i++) topSums.push(sumIdx[i]);
  const sumSet = new Set(topSums);
  
  for (const d1 of top6.d1) {
    for (const d2 of top6.d2) {
      for (const d3 of top6.d3) {
        if (sumSet.has(d1 + d2 + d3)) {
          result.add(d1 * 100 + d2 * 10 + d3);
        }
      }
    }
  }
  
  // === 维度7: 跨度top7 ===
  const spanFreq = Array(10).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    spanFreq[Math.max(...digits) - Math.min(...digits)]++;
  }
  const topSpans = [];
  const spanIdx = Array.from({ length: 10 }, (_, i) => i);
  spanIdx.sort((a, b) => spanFreq[b] - spanFreq[a]);
  for (let i = 0; i < 7; i++) topSpans.push(spanIdx[i]);
  const spanSet = new Set(topSpans);
  
  for (const d1 of top6.d1) {
    for (const d2 of top6.d2) {
      for (const d3 of top6.d3) {
        const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
        if (spanSet.has(span)) {
          result.add(d1 * 100 + d2 * 10 + d3);
        }
      }
    }
  }
  
  // === 维度8: 遗漏012路（每路top4）===
  for (let route = 0; route < 3; route++) {
    const routeD = {};
    for (const pos of ['d1', 'd2', 'd3']) {
      routeD[pos] = [];
      for (let d = 0; d <= 9; d++) {
        if (m10[pos][d] % 3 === route) routeD[pos].push(d);
      }
      routeD[pos].sort((a, b) => m10[pos][b] - m10[pos][a]);
      routeD[pos] = routeD[pos].slice(0, 4);
    }
    for (const d1 of routeD.d1) for (const d2 of routeD.d2) for (const d3 of routeD.d3) {
      result.add(d1 * 100 + d2 * 10 + d3);
    }
  }
  
  // === 维度9: 极端冷号必选（30期遗漏>=10）===
  const extreme = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    extreme[pos] = [];
    for (let d = 0; d <= 9; d++) {
      if (m30[pos][d] >= 10) extreme[pos].push(d);
    }
    if (extreme[pos].length === 0) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m30[pos][b] - m30[pos][a]);
      extreme[pos] = digits.slice(0, 2);
    }
  }
  for (const d1 of extreme.d1) for (const d2 of extreme.d2) for (const d3 of extreme.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
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
let maxMiss = 0, curMiss = 0;
let maxMissIssue = '';
let missList = [];

for (let i = 50; i < draws.length; i++) {
  const predictions = generateUltimateStrategy(draws, i - 1);
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
    missList.push({ issue: draws[i].issue, miss: curMiss });
    if (curMiss > maxMiss) {
      maxMiss = curMiss;
      maxMissIssue = draws[i].issue;
    }
  }
  
  if (count > maxCount) { maxCount = count; maxIssue = draws[i].issue; }
  if (count < minCount) { minCount = count; minIssue = draws[i].issue; }
}

console.log(`=== 终极遗漏策略 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`最多注数: ${maxCount} 注（${maxIssue}期）`);
console.log(`最少注数: ${minCount} 注（${minIssue}期）`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);

// 统计连续未中分布
const missDist = {};
for (const m of missList) {
  missDist[m.miss] = (missDist[m.miss] || 0) + 1;
}
console.log(`\n连续未中分布:`);
for (let i = 1; i <= Math.min(10, maxMiss); i++) {
  if (missDist[i]) {
    console.log(`  ${i}期未中: ${missDist[i]}次`);
  }
}

const latest = generateUltimateStrategy(draws, draws.length - 1);
console.log(`\n=== 最新一期预测 ===`);
console.log(`预测注数: ${latest.size}`);
