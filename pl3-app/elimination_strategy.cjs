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

// 淘汰策略：从1000个号码中淘汰差的，保留好的
function generateEliminationStrategy(data, upTo) {
  const m10 = calcMissing(data, upTo, 10);
  const m20 = calcMissing(data, upTo, 20);
  const m30 = calcMissing(data, upTo, 30);
  
  // 计算每位的热度
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
  
  const result = new Set();
  
  for (let n = 0; n < 1000; n++) {
    const d1 = Math.floor(n / 100);
    const d2 = Math.floor((n % 100) / 10);
    const d3 = n % 10;
    
    let eliminate = false;
    let score = 0;
    
    // 淘汰条件1: 三位都是刚开出的热号（遗漏=0）
    if (m10.d1[d1] === 0 && m10.d2[d2] === 0 && m10.d3[d3] === 0) {
      eliminate = true;
    }
    
    // 淘汰条件2: 三位遗漏都很大（>=7），不可能同时回补
    if (m10.d1[d1] >= 7 && m10.d2[d2] >= 7 && m10.d3[d3] >= 7) {
      eliminate = true;
    }
    
    // 淘汰条件3: 和值过于冷门（频率<平均的30%）
    const sum = d1 + d2 + d3;
    if (sumFreq[sum] < avgSumFreq * 0.3) {
      eliminate = true;
    }
    
    // 淘汰条件4: 跨度过于冷门（频率<平均的30%）
    const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
    if (spanFreq[span] < avgSpanFreq * 0.3) {
      eliminate = true;
    }
    
    // 淘汰条件5: 三位都是冷号（30期遗漏>=15）
    if (m30.d1[d1] >= 15 && m30.d2[d2] >= 15 && m30.d3[d3] >= 15) {
      eliminate = true;
    }
    
    // 淘汰条件6: 豹子号且各位遗漏都>=5
    if (d1 === d2 && d2 === d3 && m10.d1[d1] >= 5) {
      eliminate = true;
    }
    
    // 淘汰条件7: 两位相同且该位遗漏>=6
    if ((d1 === d2 || d2 === d3 || d1 === d3) && 
        (m10.d1[d1] >= 6 || m10.d2[d2] >= 6 || m10.d3[d3] >= 6)) {
      // 检查是否是对子
      const digits = [d1, d2, d3];
      const unique = new Set(digits);
      if (unique.size === 2) {
        // 是对子，检查重复位的遗漏
        for (const d of unique) {
          const count = digits.filter(x => x === d).length;
          if (count === 2 && m10['d' + (digits.indexOf(d) + 1)][d] >= 6) {
            eliminate = true;
            break;
          }
        }
      }
    }
    
    // 加分项（不淘汰但降低优先级）
    if (!eliminate) {
      // 至少一位遗漏在2-5之间（中等遗漏）
      if (m10.d1[d1] >= 2 && m10.d1[d1] <= 5) score += 1;
      if (m10.d2[d2] >= 2 && m10.d2[d2] <= 5) score += 1;
      if (m10.d3[d3] >= 2 && m10.d3[d3] <= 5) score += 1;
      
      // 至少一位是热号（遗漏<=2）
      if (m10.d1[d1] <= 2) score += 1;
      if (m10.d2[d2] <= 2) score += 1;
      if (m10.d3[d3] <= 2) score += 1;
      
      // 和值在热门区间
      if (sumFreq[sum] >= avgSumFreq) score += 2;
      
      // 跨度在热门区间
      if (spanFreq[span] >= avgSpanFreq) score += 2;
      
      // 跨窗口共振（多窗口都排前5）
      const r10 = getRank(m10.d1, d1) + getRank(m10.d2, d2) + getRank(m10.d3, d3);
      if (r10 <= 9) score += 3;
      
      result.add(n);
    }
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

// 测试
let totalTests = 0, totalHits = 0, totalPredictions = 0;
let maxCount = 0, minCount = Infinity;
let maxIssue = '', minIssue = '';
let maxMiss = 0, curMiss = 0;

for (let i = 50; i < draws.length; i++) {
  const predictions = generateEliminationStrategy(draws, i - 1);
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

console.log(`=== 淘汰策略 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`最多注数: ${maxCount} 注（${maxIssue}期）`);
console.log(`最少注数: ${minCount} 注（${minIssue}期）`);
console.log(`最大连续未中: ${maxMiss} 期`);

const latest = generateEliminationStrategy(draws, draws.length - 1);
console.log(`\n=== 最新一期预测 ===`);
console.log(`预测注数: ${latest.size}`);
