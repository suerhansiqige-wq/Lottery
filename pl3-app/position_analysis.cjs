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

// 计算某一期某位某数字的遗漏值
function getMissing(data, upTo, pos, digit) {
  let count = 0;
  for (let i = upTo; i >= 0; i--) {
    if (data[i][pos] === digit) break;
    count++;
  }
  return count;
}

// ========== 分析1: 每位每个遗漏值对应的下期出现概率 ==========
function analyzeOmissionProbability(data) {
  // posMissing[pos][digit] = 当前遗漏值
  // 统计：当遗漏=N时，下期出现的概率
  const stats = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    stats[pos] = {};
    for (let miss = 0; miss <= 30; miss++) {
      stats[pos][miss] = { total: 0, hit: 0 };
    }
  }
  
  for (let i = 1; i < data.length; i++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      for (let d = 0; d <= 9; d++) {
        const miss = getMissing(data, i - 1, pos, d);
        const missBucket = Math.min(miss, 30);
        stats[pos][missBucket].total++;
        if (data[i][pos] === d) {
          stats[pos][missBucket].hit++;
        }
      }
    }
  }
  
  return stats;
}

// ========== 分析2: 每位遗漏值变化趋势 ==========
function analyzeOmissionDelta(data) {
  // 统计：遗漏值每次+1时，下期出现的概率 vs 遗漏值归零时下期继续出现的概率
  const stats = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    stats[pos] = {
      increasing: { total: 0, hit: 0 }, // 遗漏在增长中
      justReturned: { total: 0, hitAgain: 0 }, // 刚回来(遗漏=0)
      highReturn: { total: 0, hit: 0 } // 遗漏>=8即将回归
    };
  }
  
  for (let i = 2; i < data.length; i++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      for (let d = 0; d <= 9; d++) {
        const missNow = getMissing(data, i - 1, pos, d);
        const missPrev = getMissing(data, i - 2, pos, d);
        
        if (missNow === 0) {
          // 刚开出
          stats[pos].justReturned.total++;
          if (data[i][pos] === d) stats[pos].justReturned.hitAgain++;
        } else if (missNow > missPrev) {
          // 遗漏在增长
          stats[pos].increasing.total++;
          if (data[i][pos] === d) stats[pos].increasing.hit++;
        }
        
        if (missNow >= 8) {
          stats[pos].highReturn.total++;
          if (data[i][pos] === d) stats[pos].highReturn.hit++;
        }
      }
    }
  }
  
  return stats;
}

// ========== 分析3: 每位每个数字的遗漏周期 ==========
function analyzeOmissionCycle(data) {
  // 统计每个数字在每位的平均遗漏周期
  const cycles = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    cycles[pos] = {};
    for (let d = 0; d <= 9; d++) {
      const gaps = [];
      let lastSeen = -1;
      for (let i = 0; i < data.length; i++) {
        if (data[i][pos] === d) {
          if (lastSeen >= 0) {
            gaps.push(i - lastSeen);
          }
          lastSeen = i;
        }
      }
      const avg = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 10;
      const max = gaps.length > 0 ? Math.max(...gaps) : 20;
      const min = gaps.length > 0 ? Math.min(...gaps) : 1;
      cycles[pos][d] = { avg, max, min, count: gaps.length };
    }
  }
  return cycles;
}

// ========== 分析4: 位置间关联性 ==========
function analyzeCrossPosition(data) {
  // 当百位遗漏=X时，十位/个位的遗漏分布
  const cross = {};
  for (let d = 0; d <= 9; d++) {
    cross[d] = { d2: {}, d3: {} };
    for (let miss = 0; miss <= 15; miss++) {
      cross[d].d2[miss] = { total: 0, avgMiss: 0 };
      cross[d].d3[miss] = { total: 0, avgMiss: 0 };
    }
  }
  
  for (let i = 1; i < data.length; i++) {
    for (let d = 0; d <= 9; d++) {
      const missD1 = getMissing(data, i - 1, 'd1', d);
      const missBucket = Math.min(missD1, 15);
      
      const missD2 = getMissing(data, i, 'd2', d);
      const missD3 = getMissing(data, i, 'd3', d);
      
      cross[d].d2[missBucket].total++;
      cross[d].d2[missBucket].avgMiss += missD2;
      cross[d].d3[missBucket].total++;
      cross[d].d3[missBucket].avgMiss += missD3;
    }
  }
  
  // 计算平均值
  for (let d = 0; d <= 9; d++) {
    for (let miss = 0; miss <= 15; miss++) {
      if (cross[d].d2[miss].total > 0) {
        cross[d].d2[miss].avgMiss /= cross[d].d2[miss].total;
      }
      if (cross[d].d3[miss].total > 0) {
        cross[d].d3[miss].avgMiss /= cross[d].d3[miss].total;
      }
    }
  }
  
  return cross;
}

// 运行所有分析
console.log('正在分析遗漏数据...\n');

const probStats = analyzeOmissionProbability(draws);
const deltaStats = analyzeOmissionDelta(draws);
const cycleStats = analyzeOmissionCycle(draws);

// 输出分析结果
console.log('=== 遗漏值与下期出现概率 ===');
for (const pos of ['d1', 'd2', 'd3']) {
  console.log(`\n${pos}:`);
  for (let miss = 0; miss <= 15; miss++) {
    const s = probStats[pos][miss];
    if (s.total > 0) {
      const rate = (s.hit / s.total * 100).toFixed(1);
      console.log(`  遗漏${miss.toString().padStart(2)}: ${rate}% (${s.hit}/${s.total})`);
    }
  }
}

console.log('\n=== 遗漏趋势分析 ===');
for (const pos of ['d1', 'd2', 'd3']) {
  const s = deltaStats[pos];
  console.log(`\n${pos}:`);
  console.log(`  遗漏增长中下期出现: ${(s.increasing.hit / s.increasing.total * 100).toFixed(2)}%`);
  console.log(`  刚开出后连续出现: ${(s.justReturned.hitAgain / s.justReturned.total * 100).toFixed(2)}%`);
  console.log(`  高遗漏(>=8)回归: ${(s.highReturn.hit / s.highReturn.total * 100).toFixed(2)}%`);
}

console.log('\n=== 每位数字遗漏周期 ===');
for (const pos of ['d1', 'd2', 'd3']) {
  console.log(`\n${pos}:`);
  for (let d = 0; d <= 9; d++) {
    const c = cycleStats[pos][d];
    console.log(`  数字${d}: 平均${c.avg.toFixed(1)}期, 最大${c.max}, 最小${c.min}`);
  }
}

// ========== 基于分析结果构建策略 ==========
function generatePositionBasedStrategy(data, upTo) {
  const result = new Set();
  
  // 对每位独立分析，选出最可能出现的数字
  const candidates = { d1: [], d2: [], d3: [] };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    const scores = [];
    
    for (let d = 0; d <= 9; d++) {
      const miss = getMissing(data, upTo, pos, d);
      let score = 0;
      
      // 因子1: 基于历史概率的评分
      const missBucket = Math.min(miss, 30);
      const probData = probStats[pos][missBucket];
      if (probData.total > 0) {
        score += (probData.hit / probData.total) * 100;
      }
      
      // 因子2: 遗漏接近平均周期时加分
      const cycle = cycleStats[pos][d];
      if (miss >= cycle.avg * 0.8 && miss <= cycle.avg * 1.5) {
        score += 30; // 接近回归周期
      }
      if (miss >= cycle.avg) {
        score += 20; // 超过平均周期，更可能回归
      }
      
      // 因子3: 高遗漏回补
      if (miss >= 8) score += 25;
      if (miss >= 12) score += 35;
      if (miss >= cycle.max * 0.7) score += 40; // 接近历史最大遗漏
      
      // 因子4: 热号延续（遗漏0-2）
      if (miss <= 2) score += 15;
      
      // 因子5: 中等遗漏（3-6）稳定
      if (miss >= 3 && miss <= 6) score += 10;
      
      scores.push({ digit: d, score, miss });
    }
    
    // 按分数排序，选top7
    scores.sort((a, b) => b.score - a.score);
    candidates[pos] = scores.slice(0, 7).map(s => s.digit);
  }
  
  // 组合
  for (const d1 of candidates.d1) {
    for (const d2 of candidates.d2) {
      for (const d3 of candidates.d3) {
        result.add(d1 * 100 + d2 * 10 + d3);
      }
    }
  }
  
  // 补充：每位top5的另一种组合
  const top5 = { d1: [], d2: [], d3: [] };
  for (const pos of ['d1', 'd2', 'd3']) {
    const scores = [];
    for (let d = 0; d <= 9; d++) {
      const miss = getMissing(data, upTo, pos, d);
      const cycle = cycleStats[pos][d];
      let score = 0;
      
      // 简化评分
      if (miss >= cycle.avg) score += 50;
      if (miss >= 8) score += 30;
      if (miss <= 2) score += 20;
      if (miss >= 3 && miss <= 6) score += 15;
      
      scores.push({ digit: d, score });
    }
    scores.sort((a, b) => b.score - a.score);
    top5[pos] = scores.slice(0, 5).map(s => s.digit);
  }
  
  for (const d1 of top5.d1) {
    for (const d2 of top5.d2) {
      for (const d3 of top5.d3) {
        result.add(d1 * 100 + d2 * 10 + d3);
      }
    }
  }
  
  return result;
}

// 测试
console.log('\n\n=== 位置分析策略测试 ===\n');

let totalTests = 0, totalHits = 0, totalPredictions = 0;
let maxCount = 0, minCount = Infinity;
let maxMiss = 0, curMiss = 0;
let maxMissIssue = '';

for (let i = 100; i < draws.length; i++) {
  const predictions = generatePositionBasedStrategy(draws, i - 1);
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

console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`注数范围: ${minCount} - ${maxCount}`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);

const latest = generatePositionBasedStrategy(draws, draws.length - 1);
console.log(`\n最新一期预测注数: ${latest.size}`);
