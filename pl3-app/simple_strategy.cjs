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

// 简化策略：每位选7个数字（遗漏最多的7个）
function generateSimpleStrategy(data, upTo) {
  const m10 = calcMissing(data, upTo, 10);
  const m20 = calcMissing(data, upTo, 20);
  
  const result = new Set();
  
  // 主策略：每位选遗漏最多的7个（7×7×7=343）
  const top7 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
    top7[pos] = digits.slice(0, 7);
  }
  for (const d1 of top7.d1) for (const d2 of top7.d2) for (const d3 of top7.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // 补充策略1：20期窗口每位top6（6×6×6=216，与上面有重叠）
  const top6_20 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m20[pos][b] - m20[pos][a]);
    top6_20[pos] = digits.slice(0, 6);
  }
  for (const d1 of top6_20.d1) for (const d2 of top6_20.d2) for (const d3 of top6_20.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // 补充策略2：每位选遗漏>=3的数字（冷号）
  const cold = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    cold[pos] = [];
    for (let d = 0; d <= 9; d++) {
      if (m10[pos][d] >= 3) cold[pos].push(d);
    }
    if (cold[pos].length < 5) {
      // 不足5个就补充遗漏最大的
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
      cold[pos] = digits.slice(0, 5);
    }
  }
  for (const d1 of cold.d1) for (const d2 of cold.d2) for (const d3 of cold.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  // 补充策略3：热号（每位遗漏<=2的）+ 冷号交叉
  const hot = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    hot[pos] = [];
    for (let d = 0; d <= 9; d++) {
      if (m10[pos][d] <= 2) hot[pos].push(d);
    }
    if (hot[pos].length < 3) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m10[pos][a] - m10[pos][b]);
      hot[pos] = digits.slice(0, 3);
    }
  }
  // 热-热-冷
  for (const d1 of hot.d1) for (const d2 of hot.d2) for (const d3 of cold.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  // 热-冷-热
  for (const d1 of hot.d1) for (const d2 of cold.d2) for (const d3 of hot.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  // 冷-热-热
  for (const d1 of cold.d1) for (const d2 of hot.d2) for (const d3 of hot.d3) {
    result.add(d1 * 100 + d2 * 10 + d3);
  }
  
  return result;
}

// 测试
let totalTests = 0, totalHits = 0, totalPredictions = 0;
let maxCount = 0, minCount = Infinity;
let maxIssue = '', minIssue = '';
let maxMiss = 0, curMiss = 0;

for (let i = 30; i < draws.length; i++) {
  const predictions = generateSimpleStrategy(draws, i - 1);
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
    if (curMiss > maxMiss) maxMiss = curMiss;
  }
  
  if (count > maxCount) { maxCount = count; maxIssue = draws[i].issue; }
  if (count < minCount) { minCount = count; minIssue = draws[i].issue; }
}

console.log(`=== 简化策略 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`最多注数: ${maxCount} 注（${maxIssue}期）`);
console.log(`最少注数: ${minCount} 注（${minIssue}期）`);
console.log(`最大连续未中: ${maxMiss} 期`);

const latest = generateSimpleStrategy(draws, draws.length - 1);
console.log(`\n=== 最新一期预测 ===`);
console.log(`预测注数: ${latest.size}`);
