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

// 计算到某一期为止的遗漏值
function calcMissing(data, upTo) {
  const missing = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  for (const pos of ['d1', 'd2', 'd3']) {
    for (let d = 0; d <= 9; d++) {
      let count = 0;
      for (let i = upTo; i >= 0; i--) {
        if (data[i][pos] === d) break;
        count++;
      }
      missing[pos][d] = count;
    }
  }
  return missing;
}

// 多窗口遗漏分析（10期、20期、30期）
function multiWindowMissing(data, upTo) {
  const windows = [10, 20, 30, 50];
  const result = {};
  for (const w of windows) {
    const start = Math.max(0, upTo - w + 1);
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
    result[w] = missing;
  }
  return result;
}

// 遗漏趋势：最近出现 vs 历史频率偏差
function omissionTrend(data, upTo) {
  const trend = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  for (const pos of ['d1', 'd2', 'd3']) {
    for (let d = 0; d <= 9; d++) {
      // 近10期出现次数
      let recent10 = 0;
      for (let i = upTo; i >= Math.max(0, upTo - 9); i--) {
        if (data[i][pos] === d) recent10++;
      }
      // 近30期出现次数
      let recent30 = 0;
      for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
        if (data[i][pos] === d) recent30++;
      }
      // 趋势 = 近10期频率*3 - 近30期频率（正值=升温，负值=降温）
      trend[pos][d] = recent10 * 3 - recent30;
    }
  }
  return trend;
}

// 核心策略：基于遗漏折线图的多维度推算
function generateOmissionChartStrategy(data, upTo) {
  const result = new Set();
  const m10 = multiWindowMissing(data, upTo);
  const trend = omissionTrend(data, upTo);
  
  // === 维度1: 每位选遗漏最大的N个数字（冷号回补）===
  // 百位top4 × 十位top4 × 个位top4
  const top4 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[10][pos][b] - m10[10][pos][a]);
    top4[pos] = digits.slice(0, 4);
  }
  for (const d1 of top4.d1) {
    for (const d2 of top4.d2) {
      for (const d3 of top4.d3) {
        result.add(d1 * 100 + d2 * 10 + d3);
      }
    }
  }
  
  // === 维度2: 每位选遗漏最小的N个数字（热号延续）===
  const bot4 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[10][pos][a] - m10[10][pos][b]);
    bot4[pos] = digits.slice(0, 4);
  }
  for (const d1 of bot4.d1) {
    for (const d2 of bot4.d2) {
      for (const d3 of bot4.d3) {
        result.add(d1 * 100 + d2 * 10 + d3);
      }
    }
  }
  
  // === 维度3: 遗漏极值回补（某位遗漏>=8的必选）===
  const extremeCold = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    extremeCold[pos] = [];
    for (let d = 0; d <= 9; d++) {
      if (m10[30][pos][d] >= 8) {
        extremeCold[pos].push(d);
      }
    }
    if (extremeCold[pos].length === 0) {
      // 没有极端遗漏，取遗漏最大的2个
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m10[30][pos][b] - m10[30][pos][a]);
      extremeCold[pos] = digits.slice(0, 2);
    }
  }
  // 极端冷号与其他位top5组合
  const top5 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[10][pos][b] - m10[10][pos][a]);
    top5[pos] = digits.slice(0, 5);
  }
  for (const d1 of extremeCold.d1.length > 0 ? extremeCold.d1 : top5.d1) {
    for (const d2 of extremeCold.d2.length > 0 ? extremeCold.d2 : top5.d2) {
      for (const d3 of extremeCold.d3.length > 0 ? extremeCold.d3 : top5.d3) {
        result.add(d1 * 100 + d2 * 10 + d3);
      }
    }
  }
  
  // === 维度4: 升温号（趋势为正且遗漏中等）===
  const warming = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    // 按趋势值排序（升温优先）
    digits.sort((a, b) => trend[pos][b] - trend[pos][a]);
    warming[pos] = digits.slice(0, 5);
  }
  for (const d1 of warming.d1) {
    for (const d2 of warming.d2) {
      for (const d3 of warming.d3) {
        result.add(d1 * 100 + d2 * 10 + d3);
      }
    }
  }
  
  // === 维度5: 跨窗口共振（多窗口同时高遗漏）===
  const crossWindow = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    crossWindow[pos] = [];
    for (let d = 0; d <= 9; d++) {
      // 在10期、20期、30期窗口中遗漏排名都靠前3的
      const rank10 = getRank(m10[10][pos], d);
      const rank20 = getRank(m10[20][pos], d);
      const rank30 = getRank(m10[30][pos], d);
      if (rank10 <= 3 && rank20 <= 4 && rank30 <= 4) {
        crossWindow[pos].push(d);
      }
    }
    if (crossWindow[pos].length === 0) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m10[10][pos][b] - m10[10][pos][a]);
      crossWindow[pos] = digits.slice(0, 3);
    }
  }
  for (const d1 of crossWindow.d1) {
    for (const d2 of crossWindow.d2) {
      for (const d3 of crossWindow.d3) {
        result.add(d1 * 100 + d2 * 10 + d3);
      }
    }
  }
  
  // === 维度6: 遗漏012路（按遗漏值分路选号）===
  // 遗漏值 mod 3 = 0/1/2 路
  for (const route of [0, 1, 2]) {
    const routeDigits = {};
    for (const pos of ['d1', 'd2', 'd3']) {
      routeDigits[pos] = [];
      for (let d = 0; d <= 9; d++) {
        if (m10[10][pos][d] % 3 === route) {
          routeDigits[pos].push(d);
        }
      }
      // 按遗漏从大到小排
      routeDigits[pos].sort((a, b) => m10[10][pos][b] - m10[10][pos][a]);
      routeDigits[pos] = routeDigits[pos].slice(0, 4);
    }
    for (const d1 of routeDigits.d1) {
      for (const d2 of routeDigits.d2) {
        for (const d3 of routeDigits.d3) {
          result.add(d1 * 100 + d2 * 10 + d3);
        }
      }
    }
  }
  
  // === 维度7: 冷热交叉（一位冷号+一位热号+一位温号）===
  const cold3 = {}, hot3 = {}, warm3 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[10][pos][b] - m10[10][pos][a]);
    cold3[pos] = digits.slice(0, 3); // 最冷
    hot3[pos] = digits.slice(7, 10); // 最热
    warm3[pos] = digits.slice(3, 7); // 温号
  }
  // 冷-热-温
  for (const d1 of cold3.d1) for (const d2 of hot3.d2) for (const d3 of warm3.d3) result.add(d1*100+d2*10+d3);
  // 热-温-冷
  for (const d1 of hot3.d1) for (const d2 of warm3.d2) for (const d3 of cold3.d3) result.add(d1*100+d2*10+d3);
  // 温-冷-热
  for (const d1 of warm3.d1) for (const d2 of cold3.d2) for (const d3 of hot3.d3) result.add(d1*100+d2*10+d3);
  
  return result;
}

function getRank(missingArr, digit) {
  const val = missingArr[digit];
  let rank = 1;
  for (let d = 0; d <= 9; d++) {
    if (d !== digit && missingArr[d] > val) rank++;
  }
  return rank;
}

// 测试命中率
let totalTests = 0;
let totalHits = 0;
let totalPredictions = 0;
let maxCount = 0, minCount = Infinity;
let maxIssue = '', minIssue = '';
let maxMiss = 0, maxMissIssue = '';
let curMiss = 0;

for (let i = 50; i < draws.length; i++) {
  const predictions = generateOmissionChartStrategy(draws, i - 1);
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
  
  if (count > maxCount) { maxCount = count; maxIssue = draws[i].issue; }
  if (count < minCount) { minCount = count; minIssue = draws[i].issue; }
}

console.log(`=== 遗漏折线图多策略 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)} 注`);
console.log(`最多注数: ${maxCount} 注（${maxIssue}期）`);
console.log(`最少注数: ${minCount} 注（${minIssue}期）`);
console.log(`最大连续未中: ${maxMiss} 期（${maxMissIssue}期）`);

// 最新一期预测
const latest = generateOmissionChartStrategy(draws, draws.length - 1);
console.log(`\n=== 最新一期预测 ===`);
console.log(`预测注数: ${latest.size}`);
