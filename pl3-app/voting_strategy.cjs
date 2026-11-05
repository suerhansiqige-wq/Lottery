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

// 投票策略：每个维度给号码投票，只选得票多的
function generateVotingStrategy(data, upTo, minVotes = 3) {
  const m10 = calcMissing(data, upTo, 10);
  const m20 = calcMissing(data, upTo, 20);
  const m30 = calcMissing(data, upTo, 30);
  
  const votes = new Map(); // num -> vote count
  
  // 初始化所有号码票数为0
  for (let n = 0; n < 1000; n++) {
    votes.set(n, 0);
  }
  
  // 维度1: 遗漏1位（6-5-5组合）
  for (const sixPos of ['d1', 'd2', 'd3']) {
    const groups = { d1: [], d2: [], d3: [] };
    for (const pos of ['d1', 'd2', 'd3']) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
      groups[pos] = pos === sixPos ? digits.slice(0, 6) : digits.slice(0, 5);
    }
    for (const d1 of groups.d1) for (const d2 of groups.d2) for (const d3 of groups.d3) {
      votes.set(d1 * 100 + d2 * 10 + d3, votes.get(d1 * 100 + d2 * 10 + d3) + 1);
    }
  }
  
  // 维度2: 遗漏2位（5-5-5排除）
  for (const excludePos of ['d1', 'd2', 'd3']) {
    const groups = { d1: [], d2: [], d3: [] };
    for (const pos of ['d1', 'd2', 'd3']) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m20[pos][b] - m20[pos][a]);
      groups[pos] = pos === excludePos ? digits.slice(5, 10) : digits.slice(0, 5);
    }
    for (const d1 of groups.d1) for (const d2 of groups.d2) for (const d3 of groups.d3) {
      votes.set(d1 * 100 + d2 * 10 + d3, votes.get(d1 * 100 + d2 * 10 + d3) + 1);
    }
  }
  
  // 维度3: 热号延续（每位top4低遗漏）
  const hot4 = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => m10[pos][a] - m10[pos][b]);
    hot4[pos] = digits.slice(0, 4);
  }
  for (const d1 of hot4.d1) for (const d2 of hot4.d2) for (const d3 of hot4.d3) {
    votes.set(d1 * 100 + d2 * 10 + d3, votes.get(d1 * 100 + d2 * 10 + d3) + 1);
  }
  
  // 维度4: 极端冷号回补（30期遗漏>=8）
  const extreme = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    extreme[pos] = [];
    for (let d = 0; d <= 9; d++) {
      if (m30[pos][d] >= 8) extreme[pos].push(d);
    }
    if (extreme[pos].length === 0) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m30[pos][b] - m30[pos][a]);
      extreme[pos] = digits.slice(0, 2);
    }
  }
  for (const d1 of extreme.d1) for (const d2 of extreme.d2) for (const d3 of extreme.d3) {
    votes.set(d1 * 100 + d2 * 10 + d3, votes.get(d1 * 100 + d2 * 10 + d3) + 1);
  }
  
  // 维度5: 跨窗口共振（10期+20期+30期都排前3）
  const resonance = {};
  for (const pos of ['d1', 'd2', 'd3']) {
    resonance[pos] = [];
    for (let d = 0; d <= 9; d++) {
      const r10 = getRank(m10[pos], d);
      const r20 = getRank(m20[pos], d);
      const r30 = getRank(m30[pos], d);
      if (r10 <= 3 && r20 <= 3 && r30 <= 4) {
        resonance[pos].push(d);
      }
    }
    if (resonance[pos].length === 0) {
      const digits = Array.from({ length: 10 }, (_, d) => d);
      digits.sort((a, b) => m10[pos][b] - m10[pos][a]);
      resonance[pos] = digits.slice(0, 3);
    }
  }
  for (const d1 of resonance.d1) for (const d2 of resonance.d2) for (const d3 of resonance.d3) {
    votes.set(d1 * 100 + d2 * 10 + d3, votes.get(d1 * 100 + d2 * 10 + d3) + 1);
  }
  
  // 维度6: 和值top10
  const sumFreq = Array(28).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    sumFreq[data[i].d1 + data[i].d2 + data[i].d3]++;
  }
  const topSums = [];
  const sumIdx = Array.from({ length: 28 }, (_, i) => i);
  sumIdx.sort((a, b) => sumFreq[b] - sumFreq[a]);
  for (let i = 0; i < 10; i++) topSums.push(sumIdx[i]);
  const sumSet = new Set(topSums);
  
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      for (let d3 = 0; d3 <= 9; d3++) {
        if (sumSet.has(d1 + d2 + d3)) {
          votes.set(d1 * 100 + d2 * 10 + d3, votes.get(d1 * 100 + d2 * 10 + d3) + 1);
        }
      }
    }
  }
  
  // 维度7: 跨度top6
  const spanFreq = Array(10).fill(0);
  for (let i = upTo; i >= Math.max(0, upTo - 29); i--) {
    const digits = [data[i].d1, data[i].d2, data[i].d3];
    spanFreq[Math.max(...digits) - Math.min(...digits)]++;
  }
  const topSpans = [];
  const spanIdx = Array.from({ length: 10 }, (_, i) => i);
  spanIdx.sort((a, b) => spanFreq[b] - spanFreq[a]);
  for (let i = 0; i < 6; i++) topSpans.push(spanIdx[i]);
  const spanSet = new Set(topSpans);
  
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      for (let d3 = 0; d3 <= 9; d3++) {
        if (spanSet.has(Math.max(d1, d2, d3) - Math.min(d1, d2, d3))) {
          votes.set(d1 * 100 + d2 * 10 + d3, votes.get(d1 * 100 + d2 * 10 + d3) + 1);
        }
      }
    }
  }
  
  // 选取得票数>=minVotes的号码
  const result = new Set();
  for (const [num, voteCount] of votes) {
    if (voteCount >= minVotes) {
      result.add(num);
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

// 测试不同minVotes
for (const minVotes of [2, 3, 4, 5]) {
  let totalTests = 0, totalHits = 0, totalPredictions = 0;
  let maxCount = 0, minCount = Infinity;
  let maxMiss = 0, curMiss = 0;
  
  for (let i = 50; i < draws.length; i++) {
    const predictions = generateVotingStrategy(draws, i - 1, minVotes);
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
  
  console.log(`=== 最低${minVotes}票 ===`);
  console.log(`命中率: ${(totalHits / totalTests * 100).toFixed(2)}%`);
  console.log(`平均注数: ${(totalPredictions / totalTests).toFixed(0)}`);
  console.log(`注数范围: ${minCount} - ${maxCount}`);
  console.log(`最大连续未中: ${maxMiss}\n`);
}

// 最新一期预测（用minVotes=3）
const latest = generateVotingStrategy(draws, draws.length - 1, 3);
console.log(`=== 最新一期预测（最低3票）===`);
console.log(`预测注数: ${latest.size}`);
