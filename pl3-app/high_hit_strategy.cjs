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

// 遗漏计算
function getMissing(data, count) {
  const recent = data.slice(-count);
  const missing = { d1: {}, d2: {}, d3: {} };
  for (let digit = 0; digit <= 9; digit++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      let miss = 0;
      for (let i = recent.length - 1; i >= 0; i--) {
        if (recent[i][pos] === digit) break;
        miss++;
      }
      missing[pos][digit] = miss;
    }
  }
  return missing;
}

// 高频策略：每位选遗漏最大的4个 + 和值前10 + 跨度前6
function generateHighHitStrategy(data, lookback = 30) {
  const missing = getMissing(data, lookback);
  const result = new Set();
  
  // 维度1: 每位选遗漏最大的4个
  const topDigits = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
    topDigits[pos] = digits.slice(0, 4);
  }
  
  for (let d1 of topDigits.d1) {
    for (let d2 of topDigits.d2) {
      for (let d3 of topDigits.d3) {
        result.add(`${d1}${d2}${d3}`);
      }
    }
  }
  
  // 维度2: 和值遗漏前10
  const sumMissing = {};
  for (let s = 0; s <= 27; s++) sumMissing[s] = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const sum = data[i].d1 + data[i].d2 + data[i].d3;
    for (let s = 0; s <= 27; s++) {
      if (s === sum) break;
      sumMissing[s]++;
    }
  }
  const topSums = Object.entries(sumMissing)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(e => parseInt(e[0]));
  
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      for (let d3 = 0; d3 <= 9; d3++) {
        if (topSums.includes(d1 + d2 + d3)) {
          result.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  
  // 维度3: 跨度遗漏前6
  const spanMissing = {};
  for (let s = 0; s <= 9; s++) spanMissing[s] = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    const span = Math.max(...digits) - Math.min(...digits);
    for (let s = 0; s <= 9; s++) {
      if (s === span) break;
      spanMissing[s]++;
    }
  }
  const topSpans = Object.entries(spanMissing)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(e => parseInt(e[0]));
  
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      for (let d3 = 0; d3 <= 9; d3++) {
        const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
        if (topSpans.includes(span)) {
          result.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  
  // 维度4: 近期热号组合（近10期出现过的数字）
  const hotDigits = { d1: new Set(), d2: new Set(), d3: new Set() };
  const recent10 = data.slice(-10);
  for (const item of recent10) {
    hotDigits.d1.add(item.d1);
    hotDigits.d2.add(item.d2);
    hotDigits.d3.add(item.d3);
  }
  
  const hotD1 = Array.from(hotDigits.d1);
  const hotD2 = Array.from(hotDigits.d2);
  const hotD3 = Array.from(hotDigits.d3);
  
  for (let d1 of hotD1) {
    for (let d2 of hotD2) {
      for (let d3 of hotD3) {
        result.add(`${d1}${d2}${d3}`);
      }
    }
  }
  
  return Array.from(result).sort();
}

// 计算命中率
let totalTests = 0;
let totalHits = 0;
let totalPredictions = 0;
let maxStreak = 0;
let currentStreak = 0;

for (let i = 30; i < draws.length; i++) {
  const historical = draws.slice(0, i);
  const current = draws[i];
  const actualNum = `${current.d1}${current.d2}${current.d3}`;
  
  const predictions = generateHighHitStrategy(historical, 30);
  const hit = predictions.includes(actualNum);
  
  totalTests++;
  totalPredictions += predictions.length;
  if (hit) {
    totalHits++;
    currentStreak++;
    if (currentStreak > maxStreak) maxStreak = currentStreak;
  } else {
    currentStreak = 0;
  }
}

console.log(`=== 高命中率策略 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits/totalTests*100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions/totalTests).toFixed(0)} 注`);
console.log(`最长连中: ${maxStreak} 期`);

// 生成最新一期预测
const latest = generateHighHitStrategy(draws, 30);
console.log(`\n=== 最新一期预测 ===`);
console.log(`预测注数: ${latest.length}`);
