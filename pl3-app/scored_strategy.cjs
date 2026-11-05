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

// 评分策略：给每个号码打分，选高分的
function generateScoredStrategy(data, upTo, topN = 500) {
  const m10 = calcMissing(data, upTo, 10);
  const m20 = calcMissing(data, upTo, 20);
  const m30 = calcMissing(data, upTo, 30);
  
  // 计算每位的热度（近10期出现次数）
  const hotness = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  for (const pos of ['d1', 'd2', 'd3']) {
    for (let d = 0; d <= 9; d++) {
      let count = 0;
      for (let i = upTo; i >= Math.max(0, upTo - 9); i--) {
        if (data[i][pos] === d) count++;
      }
      hotness[pos][d] = count;
    }
  }
  
  // 计算趋势（近10期频率 vs 近30期频率）
  const trend = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  for (const pos of ['d1', 'd2', 'd3']) {
    for (let d = 0; d <= 9; d++) {
      let recent10 = 0, recent30 = 0;
      for (let i = upTo; i >= Math.max(0, upTo - 9); i--) {
        if (data[i][pos] === d) recent10++;
      }
      for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
        if (data[i][pos] === d) recent30++;
      }
      trend[pos][d] = recent10 * 3 - recent30; // 正值=升温
    }
  }
  
  // 和值频率（近30期）
  const sumFreq = Array(28).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    const s = data[i].d1 + data[i].d2 + data[i].d3;
    sumFreq[s]++;
  }
  
  // 跨度频率（近30期）
  const spanFreq = Array(10).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    const s = Math.max(...digits) - Math.min(...digits);
    spanFreq[s]++;
  }
  
  // 给每个号码评分
  const scores = [];
  for (let n = 0; n < 1000; n++) {
    const d1 = Math.floor(n / 100);
    const d2 = Math.floor((n % 100) / 10);
    const d3 = n % 10;
    
    let score = 0;
    
    // 维度1: 遗漏值加权（10期权重最高）
    score += m10.d1[d1] * 3 + m10.d2[d2] * 3 + m10.d3[d3] * 3;
    score += m20.d1[d1] * 2 + m20.d2[d2] * 2 + m20.d3[d3] * 2;
    score += m30.d1[d1] + m30.d2[d2] + m30.d3[d3];
    
    // 维度2: 热度（热号加分）
    score += hotness.d1[d1] * 2 + hotness.d2[d2] * 2 + hotness.d3[d3] * 2;
    
    // 维度3: 趋势（升温号加分）
    score += Math.max(0, trend.d1[d1]) + Math.max(0, trend.d2[d2]) + Math.max(0, trend.d3[d3]);
    
    // 维度4: 冷号回补（遗漏>=5的加分）
    if (m10.d1[d1] >= 5) score += 10;
    if (m10.d2[d2] >= 5) score += 10;
    if (m10.d3[d3] >= 5) score += 10;
    
    // 维度5: 极冷号必选（30期遗漏>=10）
    if (m30.d1[d1] >= 10) score += 20;
    if (m30.d2[d2] >= 10) score += 20;
    if (m30.d3[d3] >= 10) score += 20;
    
    // 维度6: 和值频率
    const sum = d1 + d2 + d3;
    score += sumFreq[sum] * 3;
    
    // 维度7: 跨度频率
    const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
    score += spanFreq[span] * 2;
    
    // 维度8: 跨窗口共振
    const r10 = getRank(m10.d1, d1) + getRank(m10.d2, d2) + getRank(m10.d3, d3);
    if (r10 <= 6) score += 15; // 三个位置都在top2
    
    scores.push({ num: n, score });
  }
  
  // 按分数排序，取前topN个
  scores.sort((a, b) => b.score - a.score);
  const result = new Set();
  for (let i = 0; i < topN && i < scores.length; i++) {
    result.add(scores[i].num);
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

// 测试不同topN
for (const topN of [300, 400, 500, 600]) {
  let totalTests = 0, totalHits = 0, totalPredictions = 0;
  let maxCount = 0, minCount = Infinity;
  let maxMiss = 0;
  let curMiss = 0;
  
  for (let i = 50; i < draws.length; i++) {
    const predictions = generateScoredStrategy(draws, i - 1, topN);
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
    
    if (count > maxCount) maxCount = count;
    if (count < minCount) minCount = count;
  }
  
  console.log(`=== Top${topN} ===`);
  console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
  console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)}`);
  console.log(`注数范围: ${minCount} - ${maxCount}`);
  console.log(`最大连续未中: ${maxMiss}\n`);
}

// 最新一期预测（用500）
const latest = generateScoredStrategy(draws, draws.length - 1, 500);
console.log(`=== 最新一期预测（Top500）===`);
console.log(`预测注数: ${latest.size}`);
