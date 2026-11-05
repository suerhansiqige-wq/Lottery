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

function getMissing(data, upTo, pos, digit, window) {
  const start = Math.max(0, upTo - window + 1);
  let count = 0;
  for (let i = upTo; i >= start; i--) {
    if (data[i][pos] === digit) break;
    count++;
  }
  return count;
}

// 最终平衡策略
function generateFinalStrategy(data, upTo) {
  const m10 = {}, m20 = {}, m30 = {};
  
  for (const pos of ['d1', 'd2', 'd3']) {
    m10[pos] = Array(10).fill(0);
    m20[pos] = Array(10).fill(0);
    m30[pos] = Array(10).fill(0);
    
    for (let d = 0; d <= 9; d++) {
      m10[pos][d] = getMissing(data, upTo, pos, d, 10);
      m20[pos][d] = getMissing(data, upTo, pos, d, 20);
      m30[pos][d] = getMissing(data, upTo, pos, d, 30);
    }
  }
  
  // 和值频率
  const sumFreq = Array(28).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    sumFreq[data[i].d1 + data[i].d2 + data[i].d3]++;
  }
  const avgSumFreq = sumFreq.reduce((a, b) => a + b, 0) / 28;
  
  // 跨度频率
  const spanFreq = Array(10).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    spanFreq[Math.max(...digits) - Math.min(...digits)]++;
  }
  const avgSpanFreq = spanFreq.reduce((a, b) => a + b, 0) / 10;
  
  const prev = data[upTo];
  
  const candidates = [];
  
  for (let n = 0; n < 1000; n++) {
    const d1 = Math.floor(n / 100);
    const d2 = Math.floor((n % 100) / 10);
    const d3 = n % 10;
    
    let score = 0;
    let exclude = false;
    
    // === 排除规则 ===
    
    // 三位遗漏都>=7
    if (m10.d1[d1] >= 7 && m10.d2[d2] >= 7 && m10.d3[d3] >= 7) exclude = true;
    
    // 三位遗漏都=0
    if (m10.d1[d1] === 0 && m10.d2[d2] === 0 && m10.d3[d3] === 0) exclude = true;
    
    // 豹子号且遗漏>=5
    if (d1 === d2 && d2 === d3 && m10.d1[d1] >= 5) exclude = true;
    
    // 和值过于冷门
    const sum = d1 + d2 + d3;
    if (sumFreq[sum] < avgSumFreq * 0.2) exclude = true;
    
    // 跨度过于冷门
    const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
    if (spanFreq[span] < avgSpanFreq * 0.2) exclude = true;
    
    // 三位都是极冷号
    if (m30.d1[d1] >= 15 && m30.d2[d2] >= 15 && m30.d3[d3] >= 15) exclude = true;
    
    // 与上期完全相同
    if (d1 === prev.d1 && d2 === prev.d2 && d3 === prev.d3) exclude = true;
    
    if (exclude) continue;
    
    // === 评分规则 ===
    
    // 多窗口遗漏
    score += m10.d1[d1] * 3 + m10.d2[d2] * 3 + m10.d3[d3] * 3;
    score += m20.d1[d1] * 2 + m20.d2[d2] * 2 + m20.d3[d3] * 2;
    score += m30.d1[d1] + m30.d2[d2] + m30.d3[d3];
    
    // 高遗漏回补
    if (m10.d1[d1] >= 5) score += 20;
    if (m10.d2[d2] >= 5) score += 20;
    if (m10.d3[d3] >= 5) score += 20;
    
    // 热号延续
    if (m10.d1[d1] <= 2) score += 15;
    if (m10.d2[d2] <= 2) score += 15;
    if (m10.d3[d3] <= 2) score += 15;
    
    // 和值热度
    score += (sumFreq[sum] / avgSumFreq) * 25;
    
    // 跨度热度
    score += (spanFreq[span] / avgSpanFreq) * 20;
    
    // 与上期关联
    if (d1 === prev.d1) score += 8;
    if (d2 === prev.d2) score += 8;
    if (d3 === prev.d3) score += 8;
    
    // 平衡性
    const oddCount = [d1, d2, d3].filter(d => d % 2 === 1).length;
    if (oddCount === 1 || oddCount === 2) score += 12;
    
    const bigCount = [d1, d2, d3].filter(d => d >= 5).length;
    if (bigCount === 1 || bigCount === 2) score += 12;
    
    candidates.push({ num: n, score });
  }
  
  // 按分数排序
  candidates.sort((a, b) => b.score - a.score);
  
  // 取前600个
  const targetCount = Math.min(600, candidates.length);
  const result = new Set();
  for (let i = 0; i < targetCount; i++) {
    result.add(candidates[i].num);
  }
  
  return { result, total: candidates.length };
}

// 测试
console.log('正在测试最终策略...\n');

let totalTests = 0, totalHits = 0, totalPredictions = 0;
let maxCount = 0, minCount = Infinity;
let maxMiss = 0, curMiss = 0;
let maxMissIssue = '';
let totalCandidates = 0;

for (let i = 50; i < draws.length; i++) {
  const { result: predictions, total: candidates } = generateFinalStrategy(draws, i - 1);
  const actual = draws[i].d1 * 100 + draws[i].d2 * 10 + draws[i].d3;
  const hit = predictions.has(actual);
  const count = predictions.size;
  
  totalTests++;
  totalPredictions += count;
  totalCandidates += candidates;
  
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
  
  if (count > maxCount) maxCount = count;
  if (count < minCount) minCount = count;
}

console.log(`=== 最终策略结果 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均通过排除: ${(totalCandidates / totalTests).toFixed(0)} 注`);
console.log(`平均最终选号: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`缩水率: ${((1 - totalPredictions / 1000) * 100).toFixed(1)}%`);
console.log(`注数范围: ${minCount} - ${maxCount}`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);

const latest = generateFinalStrategy(draws, draws.length - 1);
console.log(`\n=== 最新一期预测 ===`);
console.log(`通过排除: ${latest.total} 注`);
console.log(`最终选号: ${latest.result.size} 注`);
