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

// 遗漏计算
function getMissing(data, count) {
  const recent = data.slice(-count);
  const missing = { d1: {}, d2: {}, d3: {} };
  for (let digit = 0; digit <= 9; digit++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      let miss = 0;
      for (let i = recent.length - 1; i >= 0; i--) {
        if (recent[i][pos] === digit) break;
        miss++;
      }
      missing[pos][digit] = miss;
    }
  }
  return missing;
}

// 全维度策略：遗漏1位+遗漏2位+遗漏3位+规则9+和值跨度
function generateFullStrategy(data, lookback = 30) {
  const missing = getMissing(data, lookback);
  const result = new Set();
  
  // 策略1: 遗漏1位 6-5-5
  for (const sixPos of ['d1', 'd2', 'd3']) {
    const groups = { d1: [], d2: [], d3: [] };
    for (const pos of ['d1', 'd2', 'd3']) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
      groups[pos] = pos === sixPos ? digits.slice(0, 6) : digits.slice(5, 10);
    }
    for (let d1 of groups.d1) {
      for (let d2 of groups.d2) {
        for (let d3 of groups.d3) {
          result.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  
  // 策略2: 遗漏2位 5-5-5排除
  for (const excludePos of ['d1', 'd2', 'd3']) {
    const groups = { d1: [], d2: [], d3: [] };
    for (const pos of ['d1', 'd2', 'd3']) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
      groups[pos] = pos === excludePos ? digits.slice(5, 10) : digits.slice(0, 5);
    }
    for (let d1 of groups.d1) {
      for (let d2 of groups.d2) {
        for (let d3 of groups.d3) {
          result.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  
  // 策略3: 规则9杀号（保留约800注）
  const prev1 = data[data.length - 1];
  const prev2 = data[data.length - 2];
  const prev3 = data[data.length - 3];
  
  if (prev1 && prev2 && prev3) {
    const d1 = [prev1.d1, prev1.d2, prev1.d3];
    const d2 = [prev2.d1, prev2.d2, prev2.d3];
    const d3 = [prev3.d1, prev3.d2, prev3.d3];
    
    const pl3HAdd = d => [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
    const pl3HSub = d => [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])];
    const pl3VAdd = (d, p) => [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10];
    const pl3VSub = (d, p) => [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])];
    
    const ha1 = pl3HAdd(d1), hs1 = pl3HSub(d1);
    const ha2 = pl3HAdd(d2), hs2 = pl3HSub(d2);
    const ha3 = pl3HAdd(d3), hs3 = pl3HSub(d3);
    const va1 = pl3VAdd(d1, d2), vs1 = pl3VSub(d1, d2);
    const va2 = pl3VAdd(d2, d3), vs2 = pl3VSub(d2, d3);
    
    const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
    const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
    const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
    const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
    const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);
    
    for (let n = 0; n < 1000; n++) {
      const s = String(n).padStart(3, '0');
      const a = +s[0], b = +s[1], c = +s[2];
      const ha = pl3HAdd([a,b,c]);
      const hs = pl3HSub([a,b,c]);
      
      if ([a,b,c].every(v => poolHA1.has(v))) continue;
      if ([a,b,c].every(v => poolHS1.has(v))) continue;
      if ([a,b,c].every(v => poolVA1.has(v))) continue;
      if ([a,b,c].every(v => poolHA3.has(v))) continue;
      if (ha.every(v => poolHA1.has(v))) continue;
      if (ha.every(v => poolHA2.has(v))) continue;
      if (ha.every(v => poolHA3.has(v))) continue;
      if (ha.every(v => poolVA2.has(v))) continue;
      if (hs.every(v => poolVS1.has(v))) continue;
      
      result.add(s);
    }
  }
  
  // 策略4: 和值前12 + 跨度前7
  const sumMissing = {};
  for (let s = 0; s <= 27; s++) sumMissing[s] = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const sum = data[i].d1 + data[i].d2 + data[i].d3;
    for (let s = 0; s <= 27; s++) {
      if (s === sum) break;
      sumMissing[s]++;
    }
  }
  const topSums = Object.entries(sumMissing)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(e => parseInt(e[0]));
  
  const spanMissing = {};
  for (let s = 0; s <= 9; s++) spanMissing[s] = 0;
  for (let i = data.length - 1; i >= 0; i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    const span = Math.max(...digits) - Math.min(...digits);
    for (let s = 0; s <= 9; s++) {
      if (s === span) break;
      spanMissing[s]++;
    }
  }
  const topSpans = Object.entries(spanMissing)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(e => parseInt(e[0]));
  
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      for (let d3 = 0; d3 <= 9; d3++) {
        const sum = d1 + d2 + d3;
        const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
        if (topSums.includes(sum) && topSpans.includes(span)) {
          result.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  
  return Array.from(result).sort();
}

// 计算命中率
let totalTests = 0;
let totalHits = 0;
let totalPredictions = 0;

for (let i = 30; i < draws.length; i++) {
  const historical = draws.slice(0, i);
  const current = draws[i];
  const actualNum = `${current.d1}${current.d2}${current.d3}`;
  
  const predictions = generateFullStrategy(historical, 30);
  const hit = predictions.includes(actualNum);
  
  totalTests++;
  totalPredictions += predictions.length;
  if (hit) totalHits++;
}

console.log(`=== 全维度策略 ===\n`);
console.log(`测试期数: ${totalTests}`);
console.log(`命中期数: ${totalHits}`);
console.log(`命中率: ${(totalHits/totalTests*100).toFixed(2)}%`);
console.log(`平均注数: ${(totalPredictions/totalTests).toFixed(0)} 注`);

// 生成最新一期预测
const latest = generateFullStrategy(draws, 30);
console.log(`\n=== 最新一期预测 ===`);
console.log(`预测注数: ${latest.length}`);

// 统计最多最少注数
let maxCount = 0, minCount = Infinity;
let maxIssue = '', minIssue = '';

for (let i = 30; i < draws.length; i++) {
  const historical = draws.slice(0, i);
  const predictions = generateFullStrategy(historical, 30);
  const count = predictions.length;
  
  if (count > maxCount) {
    maxCount = count;
    maxIssue = draws[i].issue;
  }
  if (count < minCount) {
    minCount = count;
    minIssue = draws[i].issue;
  }
}

console.log(`\n=== 注数统计 ===`);
console.log(`最多注数: ${maxCount} 注（${maxIssue}期）`);
console.log(`最少注数: ${minCount} 注（${minIssue}期）`);
