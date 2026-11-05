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

// ========== 擎天一注策略 ==========
function generateOneNumber(data, upTo) {
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
  
  // 近期出现频率（近10期每位每个数字出现次数）
  const recentFreq = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  for (let i = upTo; i >= Math.max(0, upTo - 9); i--) {
    recentFreq.d1[data[i].d1]++;
    recentFreq.d2[data[i].d2]++;
    recentFreq.d3[data[i].d3]++;
  }
  
  const prev = data[upTo];
  const prev2 = data[upTo - 1];
  const prev3 = data[upTo - 2];
  
  // 给每个号码综合评分
  const scores = [];
  
  for (let n = 0; n < 1000; n++) {
    const d1 = Math.floor(n / 100);
    const d2 = Math.floor((n % 100) / 10);
    const d3 = n % 10;
    
    let score = 0;
    
    // === 维度1: 多窗口遗漏共振（权重最高）===
    // 短期遗漏（3期）- 捕捉即将回补的号
    score += m3.d1[d1] * 4 + m3.d2[d2] * 4 + m3.d3[d3] * 4;
    // 中期遗漏（10期）- 主要趋势
    score += m10.d1[d1] * 6 + m10.d2[d2] * 6 + m10.d3[d3] * 6;
    // 长期遗漏（30期）- 深层趋势
    score += m30.d1[d1] * 3 + m30.d2[d2] * 3 + m30.d3[d3] * 3;
    // 超长期（50期）
    score += m50.d1[d1] * 2 + m50.d2[d2] * 2 + m50.d3[d3] * 2;
    
    // === 维度2: 遗漏回补信号 ===
    // 10期遗漏>=6的位，回补概率高
    if (m10.d1[d1] >= 6) score += 30;
    if (m10.d2[d2] >= 6) score += 30;
    if (m10.d3[d3] >= 6) score += 30;
    // 30期遗漏>=12的位，强烈回补信号
    if (m30.d1[d1] >= 12) score += 50;
    if (m30.d2[d2] >= 12) score += 50;
    if (m30.d3[d3] >= 12) score += 50;
    
    // === 维度3: 热号延续 ===
    if (m10.d1[d1] <= 2) score += 20;
    if (m10.d2[d2] <= 2) score += 20;
    if (m10.d3[d3] <= 2) score += 20;
    // 近10期出现频率高
    score += recentFreq.d1[d1] * 5;
    score += recentFreq.d2[d2] * 5;
    score += recentFreq.d3[d3] * 5;
    
    // === 维度4: 和值分析 ===
    const sum = d1 + d2 + d3;
    score += (sumFreq[sum] / maxSumFreq) * 40;
    // 和值在热门区间（9-18）加分
    if (sum >= 9 && sum <= 18) score += 15;
    
    // === 维度5: 跨度分析 ===
    const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
    score += (spanFreq[span] / maxSpanFreq) * 35;
    // 跨度在3-7之间加分
    if (span >= 3 && span <= 7) score += 20;
    
    // === 维度6: 与上期关联 ===
    // 相同位重复
    if (d1 === prev.d1) score += 12;
    if (d2 === prev.d2) score += 12;
    if (d3 === prev.d3) score += 12;
    // 相邻数字（±1）
    if (Math.abs(d1 - prev.d1) === 1) score += 8;
    if (Math.abs(d2 - prev.d2) === 1) score += 8;
    if (Math.abs(d3 - prev.d3) === 1) score += 8;
    // 与上期和值接近
    const prevSum = prev.d1 + prev.d2 + prev.d3;
    if (Math.abs(sum - prevSum) <= 3) score += 10;
    
    // === 维度7: 平衡性 ===
    // 奇偶平衡
    const oddCount = [d1, d2, d3].filter(d => d % 2 === 1).length;
    if (oddCount === 1 || oddCount === 2) score += 18;
    
    // 大小平衡
    const bigCount = [d1, d2, d3].filter(d => d >= 5).length;
    if (bigCount === 1 || bigCount === 2) score += 18;
    
    // 012路平衡
    const routes = [d1 % 3, d2 % 3, d3 % 3];
    const uniqueRoutes = new Set(routes).size;
    if (uniqueRoutes >= 2) score += 20;
    
    // 质合平衡
    const primes = [2, 3, 5, 7];
    const primeCount = [d1, d2, d3].filter(d => primes.includes(d)).length;
    if (primeCount === 1 || primeCount === 2) score += 12;
    
    // === 维度8: 位置间关联 ===
    // 百十位差值
    const d1d2Diff = Math.abs(d1 - d2);
    if (d1d2Diff >= 2 && d1d2Diff <= 5) score += 8;
    // 十个位差值
    const d2d3Diff = Math.abs(d2 - d3);
    if (d2d3Diff >= 2 && d2d3Diff <= 5) score += 8;
    
    // === 维度9: 历史模式匹配 ===
    // 查找历史上相似遗漏模式后的开奖号
    let patternScore = 0;
    let patternCount = 0;
    for (let lookback = 20; lookback <= Math.min(200, upTo); lookback += 10) {
      const histUpTo = upTo - lookback;
      if (histUpTo < 50) break;
      
      // 检查历史遗漏模式是否相似
      const histM10 = {};
      let similar = true;
      for (const pos of ['d1', 'd2', 'd3']) {
        histM10[pos] = Array(10).fill(0);
        for (let d = 0; d <= 9; d++) {
          histM10[pos][d] = getMissing(data, histUpTo, pos, d, 10);
          // 如果遗漏值差异太大，认为不相似
          if (Math.abs(histM10[pos][d] - m10[pos][d]) > 5) {
            similar = false;
            break;
          }
        }
        if (!similar) break;
      }
      
      if (similar && histUpTo + 1 < data.length) {
        const histNext = data[histUpTo + 1];
        // 历史相似模式下的下期号码加分
        if (histNext.d1 === d1) patternScore += 5;
        if (histNext.d2 === d2) patternScore += 5;
        if (histNext.d3 === d3) patternScore += 5;
        patternCount++;
      }
    }
    if (patternCount > 0) {
      score += patternScore / patternCount * 10;
    }
    
    // === 维度10: 排除低概率组合 ===
    // 豹子号（除非遗漏极高）
    if (d1 === d2 && d2 === d3) {
      if (m10.d1[d1] < 8) score -= 50;
    }
    // 对子号且遗漏高
    const digits = [d1, d2, d3];
    const uniqueDigits = new Set(digits);
    if (uniqueDigits.size === 2) {
      let hasHighMissPair = false;
      for (const d of uniqueDigits) {
        const count = digits.filter(x => x === d).length;
        if (count === 2) {
          for (let i = 0; i < 3; i++) {
            if (digits[i] === d && m10[['d1', 'd2', 'd3'][i]][d] >= 7) {
              hasHighMissPair = true;
            }
          }
        }
      }
      if (!hasHighMissPair) score -= 10;
    }
    
    scores.push({ num: n, score, d1, d2, d3 });
  }
  
  // 按分数排序
  scores.sort((a, b) => b.score - a.score);
  
  // 返回最高分的号码
  return scores[0];
}

// ========== 验证历史数据 ==========
console.log('正在验证擎天一注策略...\n');

let totalTests = 0;
let totalHits = 0;
let maxMiss = 0;
let curMiss = 0;
let maxMissIssue = '';
let hitIssues = [];

// 从第100期开始测试（需要足够的历史数据）
for (let i = 100; i < draws.length; i++) {
  const prediction = generateOneNumber(draws, i - 1);
  const actual = draws[i];
  const actualNum = actual.d1 * 100 + actual.d2 * 10 + actual.d3;
  
  totalTests++;
  
  if (prediction.num === actualNum) {
    totalHits++;
    hitIssues.push({ issue: actual.issue, prediction: prediction.num, actual: actualNum });
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

console.log(`\n=== 擎天一注策略验证结果 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中次数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(4)}%`);
console.log(`理论随机命中率: 0.1%`);
console.log(`提升倍数: ${(totalHits / totalTests * 100 / 0.1).toFixed(2)}x`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);

if (hitIssues.length > 0) {
  console.log(`\n命中详情（最近10次）:`);
  const recent = hitIssues.slice(-10);
  for (const h of recent) {
    const predStr = String(h.prediction).padStart(3, '0');
    const actStr = String(h.actual).padStart(3, '0');
    console.log(`  ${h.issue}期: 预测${predStr} = 开奖${actStr} ✓`);
  }
}

// 最新一期预测
const latest = generateOneNumber(draws, draws.length - 1);
const predStr = String(latest.num).padStart(3, '0');
console.log(`\n=== 最新一期擎天一注 ===`);
console.log(`预测号码: ${predStr}`);
console.log(`百位: ${latest.d1}, 十位: ${latest.d2}, 个位: ${latest.d3}`);
console.log(`综合评分: ${latest.score.toFixed(2)}`);
