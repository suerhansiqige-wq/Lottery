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

// ========== 精选10注策略 ==========
function generateTop10(data, upTo) {
  // 多维度遗漏分析
  const m3 = {}, m5 = {}, m10 = {}, m20 = {}, m30 = {}, m50 = {};
  
  for (const pos of ['d1', 'd2', 'd3']) {
    m3[pos] = Array(10).fill(0);
    m5[pos] = Array(10).fill(0);
    m10[pos] = Array(10).fill(0);
    m20[pos] = Array(10).fill(0);
    m30[pos] = Array(10).fill(0);
    m50[pos] = Array(10).fill(0);
    
    for (let d = 0; d <= 9; d++) {
      m3[pos][d] = getMissing(data, upTo, pos, d, 3);
      m5[pos][d] = getMissing(data, upTo, pos, d, 5);
      m10[pos][d] = getMissing(data, upTo, pos, d, 10);
      m20[pos][d] = getMissing(data, upTo, pos, d, 20);
      m30[pos][d] = getMissing(data, upTo, pos, d, 30);
      m50[pos][d] = getMissing(data, upTo, pos, d, 50);
    }
  }
  
  // 和值频率（近30期）
  const sumFreq = Array(28).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    sumFreq[data[i].d1 + data[i].d2 + data[i].d3]++;
  }
  const maxSumFreq = Math.max(...sumFreq);
  
  // 跨度频率（近30期）
  const spanFreq = Array(10).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    spanFreq[Math.max(...digits) - Math.min(...digits)]++;
  }
  const maxSpanFreq = Math.max(...spanFreq);
  
  // 近期出现频率（近10期）
  const recentFreq = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  for (let i = upTo; i >= Math.max(0, upTo - 9); i--) {
    recentFreq.d1[data[i].d1]++;
    recentFreq.d2[data[i].d2]++;
    recentFreq.d3[data[i].d3]++;
  }
  
  const prev = data[upTo];
  
  // 给每个号码综合评分
  const scores = [];
  
  for (let n = 0; n < 1000; n++) {
    const d1 = Math.floor(n / 100);
    const d2 = Math.floor((n % 100) / 10);
    const d3 = n % 10;
    
    let score = 0;
    
    // === 维度1: 多窗口遗漏共振 ===
    score += m3.d1[d1] * 4 + m3.d2[d2] * 4 + m3.d3[d3] * 4;
    score += m10.d1[d1] * 6 + m10.d2[d2] * 6 + m10.d3[d3] * 6;
    score += m30.d1[d1] * 3 + m30.d2[d2] * 3 + m30.d3[d3] * 3;
    score += m50.d1[d1] * 2 + m50.d2[d2] * 2 + m50.d3[d3] * 2;
    
    // === 维度2: 遗漏回补信号 ===
    if (m10.d1[d1] >= 6) score += 30;
    if (m10.d2[d2] >= 6) score += 30;
    if (m10.d3[d3] >= 6) score += 30;
    if (m30.d1[d1] >= 12) score += 50;
    if (m30.d2[d2] >= 12) score += 50;
    if (m30.d3[d3] >= 12) score += 50;
    
    // === 维度3: 热号延续 ===
    if (m10.d1[d1] <= 2) score += 20;
    if (m10.d2[d2] <= 2) score += 20;
    if (m10.d3[d3] <= 2) score += 20;
    score += recentFreq.d1[d1] * 5;
    score += recentFreq.d2[d2] * 5;
    score += recentFreq.d3[d3] * 5;
    
    // === 维度4: 和值分析 ===
    const sum = d1 + d2 + d3;
    score += (sumFreq[sum] / maxSumFreq) * 40;
    if (sum >= 9 && sum <= 18) score += 15;
    
    // === 维度5: 跨度分析 ===
    const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
    score += (spanFreq[span] / maxSpanFreq) * 35;
    if (span >= 3 && span <= 7) score += 20;
    
    // === 维度6: 与上期关联 ===
    if (d1 === prev.d1) score += 12;
    if (d2 === prev.d2) score += 12;
    if (d3 === prev.d3) score += 12;
    if (Math.abs(d1 - prev.d1) === 1) score += 8;
    if (Math.abs(d2 - prev.d2) === 1) score += 8;
    if (Math.abs(d3 - prev.d3) === 1) score += 8;
    
    // === 维度7: 平衡性 ===
    const oddCount = [d1, d2, d3].filter(d => d % 2 === 1).length;
    if (oddCount === 1 || oddCount === 2) score += 18;
    
    const bigCount = [d1, d2, d3].filter(d => d >= 5).length;
    if (bigCount === 1 || bigCount === 2) score += 18;
    
    const routes = [d1 % 3, d2 % 3, d3 % 3];
    const uniqueRoutes = new Set(routes).size;
    if (uniqueRoutes >= 2) score += 20;
    
    // === 维度8: 位置间关联 ===
    const d1d2Diff = Math.abs(d1 - d2);
    if (d1d2Diff >= 2 && d1d2Diff <= 5) score += 8;
    const d2d3Diff = Math.abs(d2 - d3);
    if (d2d3Diff >= 2 && d2d3Diff <= 5) score += 8;
    
    // === 维度9: 排除低概率 ===
    if (d1 === d2 && d2 === d3 && m10.d1[d1] < 8) score -= 50;
    
    scores.push({ num: n, score, d1, d2, d3 });
  }
  
  // 按分数排序，取前10
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 10);
}

// ========== 验证历史数据 ==========
console.log('正在验证精选10注策略...\n');

let totalTests = 0;
let totalHits = 0;
let maxMiss = 0;
let curMiss = 0;
let maxMissIssue = '';
let hitIssues = [];

for (let i = 100; i < draws.length; i++) {
  const top10 = generateTop10(draws, i - 1);
  const top10Nums = new Set(top10.map(t => t.num));
  const actual = draws[i];
  const actualNum = actual.d1 * 100 + actual.d2 * 10 + actual.d3;
  
  totalTests++;
  
  if (top10Nums.has(actualNum)) {
    totalHits++;
    const hitEntry = top10.find(t => t.num === actualNum);
    hitIssues.push({ 
      issue: actual.issue, 
      prediction: actualNum, 
      actual: actualNum,
      rank: top10.indexOf(hitEntry) + 1
    });
    curMiss = 0;
  } else {
    curMiss++;
    if (curMiss > maxMiss) {
      maxMiss = curMiss;
      maxMissIssue = actual.issue;
    }
  }
  
  if (i % 1000 === 0) {
    console.log(`已测试 ${i} 期，当前命中 ${totalHits} 次...`);
  }
}

console.log(`\n=== 精选10注策略验证结果 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中次数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`理论随机命中率（10注）: 1%`);
console.log(`提升倍数: ${(totalHits / totalTests * 100 / 1).toFixed(2)}x`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);
console.log(`平均命中间隔: ${Math.round(totalTests / totalHits)} 期`);

if (hitIssues.length > 0) {
  console.log(`\n命中详情（最近10次）:`);
  const recent = hitIssues.slice(-10);
  for (const h of recent) {
    const numStr = String(h.prediction).padStart(3, '0');
    console.log(`  ${h.issue}期: 预测${numStr}（第${h.rank}名）= 开奖${numStr} ✓`);
  }
}

// 最新一期预测
const latest = generateTop10(draws, draws.length - 1);
console.log(`\n=== 最新一期精选10注 ===`);
for (let i = 0; i < latest.length; i++) {
  const t = latest[i];
  const numStr = String(t.num).padStart(3, '0');
  console.log(`第${i + 1}名: ${numStr} （百${t.d1} 十${t.d2} 个${t.d3}）评分: ${t.score.toFixed(1)}`);
}
