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

function getMissing(data, upTo, pos, digit) {
  let count = 0;
  for (let i = upTo; i >= 0; i--) {
    if (data[i][pos] === digit) break;
    count++;
  }
  return count;
}

// 全量评分策略：给1000个号码逐一评分，选top N
function generateFullScoringStrategy(data, upTo, topN = 850) {
  const m5 = {};
  const m10 = {};
  const m20 = {};
  const m30 = {};
  
  for (const pos of ['d1', 'd2', 'd3']) {
    m5[pos] = Array(10).fill(0);
    m10[pos] = Array(10).fill(0);
    m20[pos] = Array(10).fill(0);
    m30[pos] = Array(10).fill(0);
    
    for (let d = 0; d <= 9; d++) {
      m5[pos][d] = getMissing(data, upTo, pos, d, 5);
      m10[pos][d] = getMissing(data, upTo, pos, d, 10);
      m20[pos][d] = getMissing(data, upTo, pos, d, 20);
      m30[pos][d] = getMissing(data, upTo, pos, d, 30);
    }
  }
  
  // 和值频率
  const sumFreq = Array(28).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 49); i--) {
    sumFreq[data[i].d1 + data[i].d2 + data[i].d3]++;
  }
  const maxSumFreq = Math.max(...sumFreq);
  
  // 跨度频率
  const spanFreq = Array(10).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 49); i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    spanFreq[Math.max(...digits) - Math.min(...digits)]++;
  }
  const maxSpanFreq = Math.max(...spanFreq);
  
  // 上期号码
  const prev = data[upTo];
  const prev2 = data[upTo - 1];
  
  // 给每个号码评分
  const scores = [];
  for (let n = 0; n < 1000; n++) {
    const d1 = Math.floor(n / 100);
    const d2 = Math.floor((n % 100) / 10);
    const d3 = n % 10;
    
    let score = 0;
    
    // === 维度1: 多窗口遗漏加权 ===
    // 5期窗口（短期趋势）
    score += m5.d1[d1] * 2 + m5.d2[d2] * 2 + m5.d3[d3] * 2;
    // 10期窗口（中期趋势）
    score += m10.d1[d1] * 3 + m10.d2[d2] * 3 + m10.d3[d3] * 3;
    // 20期窗口（长期趋势）
    score += m20.d1[d1] * 2 + m20.d2[d2] * 2 + m20.d3[d3] * 2;
    // 30期窗口（超长期）
    score += m30.d1[d1] + m30.d2[d2] + m30.d3[d3];
    
    // === 维度2: 遗漏回补信号 ===
    // 高遗漏必选（10期遗漏>=8）
    if (m10.d1[d1] >= 8) score += 20;
    if (m10.d2[d2] >= 8) score += 20;
    if (m10.d3[d3] >= 8) score += 20;
    // 极高遗漏（30期遗漏>=15）
    if (m30.d1[d1] >= 15) score += 30;
    if (m30.d2[d2] >= 15) score += 30;
    if (m30.d3[d3] >= 15) score += 30;
    
    // === 维度3: 热号延续 ===
    if (m10.d1[d1] <= 2) score += 10;
    if (m10.d2[d2] <= 2) score += 10;
    if (m10.d3[d3] <= 2) score += 10;
    
    // === 维度4: 和值频率 ===
    const sum = d1 + d2 + d3;
    score += (sumFreq[sum] / maxSumFreq) * 30;
    
    // === 维度5: 跨度频率 ===
    const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
    score += (spanFreq[span] / maxSpanFreq) * 20;
    
    // === 维度6: 与上期关联 ===
    // 与上期相同位的数字（延续性）
    if (d1 === prev.d1) score += 8;
    if (d2 === prev.d2) score += 8;
    if (d3 === prev.d3) score += 8;
    // 与上期相邻（±1）
    if (Math.abs(d1 - prev.d1) === 1) score += 5;
    if (Math.abs(d2 - prev.d2) === 1) score += 5;
    if (Math.abs(d3 - prev.d3) === 1) score += 5;
    
    // === 维度7: 位置间平衡 ===
    // 避免三位都极端（都很大或都很小）
    const avg = (d1 + d2 + d3) / 3;
    if (avg >= 3 && avg <= 6) score += 10; // 中间值加分
    
    // === 维度8: 奇偶平衡 ===
    const oddCount = [d1, d2, d3].filter(d => d % 2 === 1).length;
    if (oddCount === 1 || oddCount === 2) score += 8; // 1奇2偶或2奇1偶
    
    // === 维度9: 大小平衡 ===
    const bigCount = [d1, d2, d3].filter(d => d >= 5).length;
    if (bigCount === 1 || bigCount === 2) score += 8;
    
    // === 维度10: 012路平衡 ===
    const routes = [d1 % 3, d2 % 3, d3 % 3];
    const uniqueRoutes = new Set(routes).size;
    if (uniqueRoutes >= 2) score += 10; // 至少2种路
    
    scores.push({ num: n, score });
  }
  
  // 按分数排序，取前topN
  scores.sort((a, b) => b.score - a.score);
  const result = new Set();
  for (let i = 0; i < topN && i < scores.length; i++) {
    result.add(scores[i].num);
  }
  
  return result;
}

function getMissing(data, upTo, pos, digit, window) {
  const start = Math.max(0, upTo - window + 1);
  let count = 0;
  for (let i = upTo; i >= start; i--) {
    if (data[i][pos] === digit) break;
    count++;
  }
  return count;
}

// 测试不同topN
console.log('正在测试全量评分策略...\n');

for (const topN of [700, 750, 800, 850, 900, 950]) {
  let totalTests = 0, totalHits = 0, totalPredictions = 0;
  let maxCount = 0, minCount = Infinity;
  let maxMiss = 0, curMiss = 0;
  let maxMissIssue = '';
  
  for (let i = 50; i < draws.length; i++) {
    const predictions = generateFullScoringStrategy(draws, i - 1, topN);
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
    
    if (count > maxCount) maxCount = count;
    if (count < minCount) minCount = count;
  }
  
  console.log(`Top${topN}: 命中率=${(totalHits / totalTests * 100).toFixed(2)}%, 平均注数=${(totalPredictions / totalTests).toFixed(0)}, 最大连续未中=${maxMiss}`);
}

// 最新一期预测（用850）
const latest = generateFullScoringStrategy(draws, draws.length - 1, 850);
console.log(`\n最新一期预测注数（Top850）: ${latest.size}`);
