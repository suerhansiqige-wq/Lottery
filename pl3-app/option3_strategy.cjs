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

// 方案3策略：目标约600注，命中率约80%
function generateOption3Strategy(data, upTo) {
  const m10 = calcMissing(data, upTo, 10);
  const m20 = calcMissing(data, upTo, 20);
  const m30 = calcMissing(data, upTo, 30);
  
  const result = new Set();
  
  // === 核心：每位遗漏top6（6×6×6=216）===
  const top6 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
    top6[pos] = digits.slice(0, 6);
  }
  for (const d1 of top6.d1) for (const d2 of top6.d2) for (const d3 of top6.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 补充1：20期窗口每位top5（5×5×5=125）===
  const top5_20 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m20[pos][b] - m20[pos][a]);
    top5_20[pos] = digits.slice(0, 5);
  }
  for (const d1 of top5_20.d1) for (const d2 of top5_20.d2) for (const d3 of top5_20.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 补充2：热号延续（每位bottom4）===
  const bot4 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][a] - m10[pos][b]);
    bot4[pos] = digits.slice(0, 4);
  }
  for (const d1 of bot4.d1) for (const d2 of bot4.d2) for (const d3 of bot4.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 补充3：冷号回补（遗漏>=5）+ 热号交叉 ===
  const cold5 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    cold5[pos] = [];
    for (let d = 0; d <= 9; d++) {
      if (m10[pos][d] >= 5) cold5[pos].push(d);
    }
    if (cold5[pos].length === 0) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
      cold5[pos] = digits.slice(0, 2);
    }
  }
  // 冷-热-热
  for (const d1 of cold5.d1) for (const d2 of bot4.d2) for (const d3 of bot4.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  // 热-冷-热
  for (const d1 of bot4.d1) for (const d2 of cold5.d2) for (const d3 of bot4.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  // 热-热-冷
  for (const d1 of bot4.d1) for (const d2 of bot4.d2) for (const d3 of cold5.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // === 补充4：和值top12 ===
  const sumFreq = Array(28).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    sumFreq[data[i].d1 + data[i].d2 + data[i].d3]++;
  }
  const topSums = [];
  const sumIdx = Array.from({ length: 28 }, (_, i) => i);
  sumIdx.sort((a, b) => sumFreq[b] - sumFreq[a]);
  for (let i = 0; i < 12; i++) topSums.push(sumIdx[i]);
  const sumSet = new Set(topSums);
  
  // 和值与top6交叉
  for (const d1 of top6.d1) {
    for (const d2 of top6.d2) {
      for (const d3 of top6.d3) {
        if (sumSet.has(d1 + d2 + d3)) {
          result.add(d1 * 100 + d2 * 10 + d3);
        }
      }
    }
  }
  
  // === 补充5：跨度top7 ===
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
  
  return result;
}

// 测试
let totalTests = 0, totalHits = 0, totalPredictions = 0;
let maxCount = 0, minCount = Infinity;
let maxIssue = '', minIssue = '';
let maxMiss = 0, curMiss = 0;
let maxMissIssue = '';

for (let i = 50; i < draws.length; i++) {
  const predictions = generateOption3Strategy(draws, i - 1);
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

console.log(`=== 方案3策略（目标600注）===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`最多注数: ${maxCount} 注（${maxIssue}期）`);
console.log(`最少注数: ${minCount} 注（${minIssue}期）`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);

const latest = generateOption3Strategy(draws, draws.length - 1);
console.log(`\n=== 最新一期预测 ===`);
console.log(`预测注数: ${latest.size}`);
