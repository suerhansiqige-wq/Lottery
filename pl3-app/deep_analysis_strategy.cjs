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

// ========== 深度分析：连续遗漏模式 ==========
function analyzeConsecutivePattern(data, upTo) {
  // 分析：当某位某数字遗漏达到N期时，未来M期内出现的概率
  const patterns = {};
  
  for (const pos of ['d1', 'd2', 'd3']) {
    patterns[pos] = {};
    for (let d = 0; d <= 9; d++) {
      patterns[pos][d] = {
        reach5_then10hit: { total: 0, hit: 0 }, // 遗漏达5后10期内出现
        reach8_then10hit: { total: 0, hit: 0 },
        reach10_then15hit: { total: 0, hit: 0 },
        reach12_then15hit: { total: 0, hit: 0 },
        reach15_then20hit: { total: 0, hit: 0 },
      };
    }
  }
  
  for (let i = 30; i < Math.min(upTo, data.length - 20); i++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      for (let d = 0; d <= 9; d++) {
        const miss = getMissing(data, i, pos, d);
        
        if (miss === 5) {
          patterns[pos][d].reach5_then10hit.total++;
          for (let j = 1; j <= 10; j++) {
            if (i + j < data.length && data[i + j][pos] === d) {
              patterns[pos][d].reach5_then10hit.hit++;
              break;
            }
          }
        }
        if (miss === 8) {
          patterns[pos][d].reach8_then10hit.total++;
          for (let j = 1; j <= 10; j++) {
            if (i + j < data.length && data[i + j][pos] === d) {
              patterns[pos][d].reach8_then10hit.hit++;
              break;
            }
          }
        }
        if (miss === 10) {
          patterns[pos][d].reach10_then15hit.total++;
          for (let j = 1; j <= 15; j++) {
            if (i + j < data.length && data[i + j][pos] === d) {
              patterns[pos][d].reach10_then15hit.hit++;
              break;
            }
          }
        }
        if (miss === 12) {
          patterns[pos][d].reach12_then15hit.total++;
          for (let j = 1; j <= 15; j++) {
            if (i + j < data.length && data[i + j][pos] === d) {
              patterns[pos][d].reach12_then15hit.hit++;
              break;
            }
          }
        }
        if (miss === 15) {
          patterns[pos][d].reach15_then20hit.total++;
          for (let j = 1; j <= 20; j++) {
            if (i + j < data.length && data[i + j][pos] === d) {
              patterns[pos][d].reach15_then20hit.hit++;
              break;
            }
          }
        }
      }
    }
  }
  
  return patterns;
}

// ========== 分析：位置间联动 ==========
function analyzePositionLinkage(data, upTo) {
  // 当百位开出X时，下期十位/个位的分布
  const linkage = {
    d1_to_d2: Array.from({ length: 10 }, () => Array(10).fill(0)),
    d1_to_d3: Array.from({ length: 10 }, () => Array(10).fill(0)),
    d2_to_d1: Array.from({ length: 10 }, () => Array(10).fill(0)),
    d2_to_d3: Array.from({ length: 10 }, () => Array(10).fill(0)),
    d3_to_d1: Array.from({ length: 10 }, () => Array(10).fill(0)),
    d3_to_d2: Array.from({ length: 10 }, () => Array(10).fill(0)),
  };
  
  for (let i = 1; i < Math.min(upTo + 1, data.length); i++) {
    const prev = data[i - 1];
    const curr = data[i];
    
    linkage.d1_to_d2[prev.d1][curr.d2]++;
    linkage.d1_to_d3[prev.d1][curr.d3]++;
    linkage.d2_to_d1[prev.d2][curr.d1]++;
    linkage.d2_to_d3[prev.d2][curr.d3]++;
    linkage.d3_to_d1[prev.d3][curr.d1]++;
    linkage.d3_to_d2[prev.d3][curr.d2]++;
  }
  
  return linkage;
}

// ========== 分析：和值/跨度与遗漏的关系 ==========
function analyzeSumSpanOmission(data, upTo) {
  const sumMiss = {}; // 和值 -> 当前遗漏
  const spanMiss = {}; // 跨度 -> 当前遗漏
  
  for (let s = 0; s <= 27; s++) {
    let miss = 0;
    for (let i = upTo; i >= 0; i--) {
      if (data[i].d1 + data[i].d2 + data[i].d3 === s) break;
      miss++;
    }
    sumMiss[s] = miss;
  }
  
  for (let s = 0; s <= 9; s++) {
    let miss = 0;
    for (let i = upTo; i >= 0; i--) {
      const span = Math.max(data[i].d1, data[i].d2, data[i].d3) - Math.min(data[i].d1, data[i].d2, data[i].d3);
      if (span === s) break;
      miss++;
    }
    spanMiss[s] = miss;
  }
  
  return { sumMiss, spanMiss };
}

// ========== 综合策略 ==========
function generateDeepAnalysisStrategy(data, upTo) {
  const result = new Set();
  
  // 分析1: 连续遗漏模式
  const patterns = analyzeConsecutivePattern(data, upTo);
  
  // 分析2: 位置联动
  const linkage = analyzePositionLinkage(data, upTo);
  
  // 分析3: 和值跨度遗漏
  const { sumMiss, spanMiss } = analyzeSumSpanOmission(data, upTo);
  
  // === 每位独立评分 ===
  const posScores = { d1: [], d2: [], d3: [] };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    for (let d = 0; d <= 9; d++) {
      const miss = getMissing(data, upTo, pos, d);
      let score = 0;
      
      // 因子1: 当前遗漏值
      if (miss >= 12) score += 40;
      else if (miss >= 8) score += 30;
      else if (miss >= 5) score += 20;
      else if (miss <= 2) score += 15;
      else score += 10;
      
      // 因子2: 历史模式概率
      const p = patterns[pos][d];
      if (miss >= 5 && p.reach5_then10hit.total > 0) {
        score += (p.reach5_then10hit.hit / p.reach5_then10hit.total) * 30;
      }
      if (miss >= 8 && p.reach8_then10hit.total > 0) {
        score += (p.reach8_then10hit.hit / p.reach8_then10hit.total) * 40;
      }
      if (miss >= 10 && p.reach10_then15hit.total > 0) {
        score += (p.reach10_then15hit.hit / p.reach10_then15hit.total) * 50;
      }
      
      posScores[pos].push({ digit: d, score, miss });
    }
    
    posScores[pos].sort((a, b) => b.score - a.score);
  }
  
  // === 组合策略1: 每位top8（8×8×8=512）===
  for (const s1 of posScores.d1.slice(0, 8)) {
    for (const s2 of posScores.d2.slice(0, 8)) {
      for (const s3 of posScores.d3.slice(0, 8)) {
        result.add(s1.digit * 100 + s2.digit * 10 + s3.digit);
      }
    }
  }
  
  // === 组合策略2: 基于位置联动 ===
  const prev = data[upTo];
  // 百位上期开出X -> 十位top3
  const d2FromD1 = [];
  for (let d = 0; d <= 9; d++) {
    d2FromD1.push({ digit: d, count: linkage.d1_to_d2[prev.d1][d] });
  }
  d2FromD1.sort((a, b) => b.count - a.count);
  
  // 百位上期开出X -> 个位top3
  const d3FromD1 = [];
  for (let d = 0; d <= 9; d++) {
    d3FromD1.push({ digit: d, count: linkage.d1_to_d3[prev.d1][d] });
  }
  d3FromD1.sort((a, b) => b.count - a.count);
  
  // 用联动top4组合
  for (const s1 of posScores.d1.slice(0, 6)) {
    for (const s2 of d2FromD1.slice(0, 4)) {
      for (const s3 of d3FromD1.slice(0, 4)) {
        result.add(s1.digit * 100 + s2.digit * 10 + s3.digit);
      }
    }
  }
  
  // === 组合策略3: 和值遗漏回补 ===
  const sumEntries = Object.entries(sumMiss).map(([s, m]) => ({ sum: parseInt(s), miss: m }));
  sumEntries.sort((a, b) => b.miss - a.miss);
  const topSums = sumEntries.slice(0, 12).map(e => e.sum);
  const sumSet = new Set(topSums);
  
  for (const s1 of posScores.d1.slice(0, 7)) {
    for (const s2 of posScores.d2.slice(0, 7)) {
      for (const s3 of posScores.d3.slice(0, 7)) {
        if (sumSet.has(s1.digit + s2.digit + s3.digit)) {
          result.add(s1.digit * 100 + s2.digit * 10 + s3.digit);
        }
      }
    }
  }
  
  // === 组合策略4: 跨度遗漏回补 ===
  const spanEntries = Object.entries(spanMiss).map(([s, m]) => ({ span: parseInt(s), miss: m }));
  spanEntries.sort((a, b) => b.miss - a.miss);
  const topSpans = spanEntries.slice(0, 7).map(e => e.span);
  const spanSet = new Set(topSpans);
  
  for (const s1 of posScores.d1.slice(0, 7)) {
    for (const s2 of posScores.d2.slice(0, 7)) {
      for (const s3 of posScores.d3.slice(0, 7)) {
        const span = Math.max(s1.digit, s2.digit, s3.digit) - Math.min(s1.digit, s2.digit, s3.digit);
        if (spanSet.has(span)) {
          result.add(s1.digit * 100 + s2.digit * 10 + s3.digit);
        }
      }
    }
  }
  
  return result;
}

// 测试
console.log('正在测试深度分析策略...\n');

let totalTests = 0, totalHits = 0, totalPredictions = 0;
let maxCount = 0, minCount = Infinity;
let maxMiss = 0, curMiss = 0;
let maxMissIssue = '';

for (let i = 100; i < draws.length; i++) {
  const predictions = generateDeepAnalysisStrategy(draws, i - 1);
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
  
  if (i % 1000 === 0) console.log(`已测试 ${i} 期...`);
}

console.log(`\n=== 深度分析策略 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`最多注数: ${maxCount} 注`);
console.log(`最少注数: ${minCount} 注`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);

const latest = generateDeepAnalysisStrategy(draws, draws.length - 1);
console.log(`\n最新一期预测注数: ${latest.size}`);
