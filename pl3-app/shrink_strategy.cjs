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

// 真正的缩水策略：先排除，再精选
function generateShrinkStrategy(data, upTo) {
  const m5 = {}, m10 = {}, m20 = {}, m30 = {};
  
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
  
  // 和值频率（近50期）
  const sumFreq = Array(28).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 49); i--) {
    sumFreq[data[i].d1 + data[i].d2 + data[i].d3]++;
  }
  const avgSumFreq = sumFreq.reduce((a, b) => a + b, 0) / 28;
  
  // 跨度频率（近50期）
  const spanFreq = Array(10).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 49); i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    spanFreq[Math.max(...digits) - Math.min(...digits)]++;
  }
  const avgSpanFreq = spanFreq.reduce((a, b) => a + b, 0) / 10;
  
  const prev = data[upTo];
  const prev2 = data[upTo - 1];
  
  const candidates = [];
  
  for (let n = 0; n < 1000; n++) {
    const d1 = Math.floor(n / 100);
    const d2 = Math.floor((n % 100) / 10);
    const d3 = n % 10;
    
    // ========== 硬性排除规则 ==========
    
    // 排除1: 三位遗漏都>=7（不可能同时回补）
    if (m10.d1[d1] >= 7 && m10.d2[d2] >= 7 && m10.d3[d3] >= 7) continue;
    
    // 排除2: 三位遗漏都=0（不可能同时延续）
    if (m10.d1[d1] === 0 && m10.d2[d2] === 0 && m10.d3[d3] === 0) continue;
    
    // 排除3: 豹子号且该位遗漏>=5
    if (d1 === d2 && d2 === d3 && m10.d1[d1] >= 5) continue;
    
    // 排除4: 和值过于冷门（频率<平均的20%）
    const sum = d1 + d2 + d3;
    if (sumFreq[sum] < avgSumFreq * 0.2) continue;
    
    // 排除5: 跨度过于冷门（频率<平均的20%）
    const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
    if (spanFreq[span] < avgSpanFreq * 0.2) continue;
    
    // 排除6: 三位都是极冷号（30期遗漏>=15）
    if (m30.d1[d1] >= 15 && m30.d2[d2] >= 15 && m30.d3[d3] >= 15) continue;
    
    // 排除7: 与上期完全相同
    if (d1 === prev.d1 && d2 === prev.d2 && d3 === prev.d3) continue;
    
    // 排除8: 对子号且该位遗漏>=8
    const digits = [d1, d2, d3];
    const uniqueDigits = new Set(digits);
    if (uniqueDigits.size === 2) {
      // 是对子
      for (const d of uniqueDigits) {
        const count = digits.filter(x => x === d).length;
        if (count === 2) {
          const pos = digits.indexOf(d);
          const posName = ['d1', 'd2', 'd3'][pos];
          if (m10[posName][d] >= 8) continue;
        }
      }
    }
    
    // ========== 评分规则（通过排除的号码再评分）==========
    
    let score = 0;
    
    // 评分1: 多窗口遗漏加权
    score += m5.d1[d1] * 2 + m5.d2[d2] * 2 + m5.d3[d3] * 2;
    score += m10.d1[d1] * 3 + m10.d2[d2] * 3 + m10.d3[d3] * 3;
    score += m20.d1[d1] * 2 + m20.d2[d2] * 2 + m20.d3[d3] * 2;
    score += m30.d1[d1] + m30.d2[d2] + m30.d3[d3];
    
    // 评分2: 高遗漏回补
    if (m10.d1[d1] >= 6) score += 15;
    if (m10.d2[d2] >= 6) score += 15;
    if (m10.d3[d3] >= 6) score += 15;
    if (m30.d1[d1] >= 12) score += 25;
    if (m30.d2[d2] >= 12) score += 25;
    if (m30.d3[d3] >= 12) score += 25;
    
    // 评分3: 热号延续
    if (m10.d1[d1] <= 2) score += 12;
    if (m10.d2[d2] <= 2) score += 12;
    if (m10.d3[d3] <= 2) score += 12;
    
    // 评分4: 和值热度
    score += (sumFreq[sum] / avgSumFreq) * 20;
    
    // 评分5: 跨度热度
    score += (spanFreq[span] / avgSpanFreq) * 15;
    
    // 评分6: 与上期关联
    if (d1 === prev.d1) score += 6;
    if (d2 === prev.d2) score += 6;
    if (d3 === prev.d3) score += 6;
    if (Math.abs(d1 - prev.d1) === 1) score += 4;
    if (Math.abs(d2 - prev.d2) === 1) score += 4;
    if (Math.abs(d3 - prev.d3) === 1) score += 4;
    
    // 评分7: 奇偶平衡
    const oddCount = [d1, d2, d3].filter(d => d % 2 === 1).length;
    if (oddCount === 1 || oddCount === 2) score += 10;
    
    // 评分8: 大小平衡
    const bigCount = [d1, d2, d3].filter(d => d >= 5).length;
    if (bigCount === 1 || bigCount === 2) score += 10;
    
    // 评分9: 012路平衡
    const routes = [d1 % 3, d2 % 3, d3 % 3];
    const uniqueRoutes = new Set(routes).size;
    if (uniqueRoutes >= 2) score += 12;
    
    // 评分10: 位置平衡（避免全大或全小）
    const avg = (d1 + d2 + d3) / 3;
    if (avg >= 3 && avg <= 6) score += 8;
    
    candidates.push({ num: n, score, d1, d2, d3 });
  }
  
  // 按分数排序
  candidates.sort((a, b) => b.score - a.score);
  
  // 取前N个（动态调整）
  const targetCount = Math.min(700, candidates.length);
  const result = new Set();
  for (let i = 0; i < targetCount; i++) {
    result.add(candidates[i].num);
  }
  
  return { result, total: candidates.length };
}

// 测试
console.log('正在测试缩水策略...\n');

let totalTests = 0, totalHits = 0, totalPredictions = 0;
let maxCount = 0, minCount = Infinity;
let maxMiss = 0, curMiss = 0;
let maxMissIssue = '';
let totalCandidates = 0;

for (let i = 50; i < draws.length; i++) {
  const { result: predictions, total: candidates } = generateShrinkStrategy(draws, i - 1);
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

console.log(`=== 缩水策略结果 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均通过排除: ${(totalCandidates / totalTests).toFixed(0)} 注`);
console.log(`平均最终选号: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`缩水率: ${((1 - totalPredictions / totalCandidates) * 100).toFixed(1)}%`);
console.log(`注数范围: ${minCount} - ${maxCount}`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);

const latest = generateShrinkStrategy(draws, draws.length - 1);
console.log(`\n=== 最新一期预测 ===`);
console.log(`通过排除: ${latest.total} 注`);
console.log(`最终选号: ${latest.result.size} 注`);
