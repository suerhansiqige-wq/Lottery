// 排列三条件参数优化 + 新方案探索
const fs = require('fs');
const path = require('path');

// 读取排列三数据
const lotteryDataFile = path.join(__dirname, 'pl3-app', 'src', 'data', 'lotteryData.js');
let lotteryDataStr = fs.readFileSync(lotteryDataFile, 'utf-8');
const match = lotteryDataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = match[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws = lines.map(line => {
  const m = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (m) return { issue: m[1], d1: Number(m[2]), d2: Number(m[3]), d3: Number(m[4]) };
  return null;
}).filter(Boolean);

console.log(`排列三数据: ${draws.length} 期 (${draws[0].issue} - ${draws[draws.length-1].issue})`);

// === 基础工具函数 ===
function getType(num) {
  const d = num.split('').map(Number);
  if (d[0] === d[1] && d[1] === d[2]) return '豹子';
  if (d[0] === d[1] || d[0] === d[2] || d[1] === d[2]) return '组三';
  return '组六';
}

function getPS(num) {
  const d = num.split('').map(Number);
  if (d[0] === d[1]) return { p: d[0], s: d[2] };
  if (d[0] === d[2]) return { p: d[0], s: d[1] };
  return { p: d[1], s: d[0] };
}

function hasAny(digits, str) {
  return str.length > 0 && str.split('').some(x => digits.includes(Number(x)));
}

function matchBase(num, cond) {
  const d = num.split('').map(Number);
  const t = getType(num);
  if (t === '豹子') return false;
  if (t === '组六') return hasAny(d, cond.dg1) && hasAny(d, cond.dg2);
  const { p, s } = getPS(num);
  return cond.zs1.includes(String(p)) && cond.zs2.includes(String(s));
}

function genAllNums() {
  const nums = [];
  for (let i = 0; i <= 999; i++) nums.push(String(i).padStart(3, '0'));
  return nums;
}

const allNums = genAllNums();
const posKeys = ['d1', 'd2', 'd3'];

// === 分析排列三数据特征 ===
console.log('\n=== 排列三数据特征分析 ===\n');

// 各位置频率
const posFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
draws.forEach(d => { posFreq[0][d.d1]++; posFreq[1][d.d2]++; posFreq[2][d.d3]++; });
const totalDraws = draws.length;
console.log('百位频率 TOP5:');
[...Array(10).keys()].sort((a,b) => posFreq[0][b] - posFreq[0][a]).slice(0,5).forEach(d => {
  console.log(`  数字${d}: ${(posFreq[0][d]/totalDraws*100).toFixed(1)}% (${posFreq[0][d]}次)`);
});
console.log('十位频率 TOP5:');
[...Array(10).keys()].sort((a,b) => posFreq[1][b] - posFreq[1][a]).slice(0,5).forEach(d => {
  console.log(`  数字${d}: ${(posFreq[1][d]/totalDraws*100).toFixed(1)}% (${posFreq[1][d]}次)`);
});
console.log('个位频率 TOP5:');
[...Array(10).keys()].sort((a,b) => posFreq[2][b] - posFreq[2][a]).slice(0,5).forEach(d => {
  console.log(`  数字${d}: ${(posFreq[2][d]/totalDraws*100).toFixed(1)}% (${posFreq[2][d]}次)`);
});

// 组三/组六/豹子比例
let zuluCount = 0, zusanCount = 0, baoziCount = 0;
draws.forEach(d => {
  const t = getType(`${d.d1}${d.d2}${d.d3}`);
  if (t === '组六') zuluCount++;
  else if (t === '组三') zusanCount++;
  else baoziCount++;
});
console.log(`\n组六: ${zuluCount} (${(zuluCount/totalDraws*100).toFixed(1)}%)`);
console.log(`组三: ${zusanCount} (${(zusanCount/totalDraws*100).toFixed(1)}%)`);
console.log(`豹子: ${baoziCount} (${(baoziCount/totalDraws*100).toFixed(1)}%)`);

// 和值分布
const sumFreq = new Array(28).fill(0);
draws.forEach(d => sumFreq[d.d1+d.d2+d.d3]++);
console.log('\n和值 TOP5:');
[...Array(28).keys()].sort((a,b) => sumFreq[b] - sumFreq[a]).slice(0,5).forEach(s => {
  console.log(`  和值${s}: ${sumFreq[s]}次 (${(sumFreq[s]/totalDraws*100).toFixed(1)}%)`);
});

// 跨度分布
const spanFreq = new Array(10).fill(0);
draws.forEach(d => spanFreq[Math.max(d.d1,d.d2,d.d3) - Math.min(d.d1,d.d2,d.d3)]++);
console.log('\n跨度 TOP5:');
[...Array(10).keys()].sort((a,b) => spanFreq[b] - spanFreq[a]).slice(0,5).forEach(s => {
  console.log(`  跨度${s}: ${spanFreq[s]}次 (${(spanFreq[s]/totalDraws*100).toFixed(1)}%)`);
});

// === 方案A: 基于排列三特征重新设计18组条件 ===
// 策略: 让条件覆盖更多排列三开奖号
// 分析每个数字在各位置的频率，设计条件使高频数字组合更容易匹配

function buildConditionsForPL3(draws) {
  // 统计排列三中每个数字作为"组六胆码"的频率
  // 即: 开奖号中出现的数字
  const digitFreq = [0,0,0,0,0,0,0,0,0,0];
  draws.forEach(d => { digitFreq[d.d1]++; digitFreq[d.d2]++; digitFreq[d.d3]++; });
  
  // 按频率排序
  const sortedDigits = [...Array(10).keys()].sort((a,b) => digitFreq[b] - digitFreq[a]);
  console.log('\n数字总频率排序:', sortedDigits.map(d => `${d}(${digitFreq[d]})`).join(', '));
  
  // 组三对子频率
  const pairFreq = [0,0,0,0,0,0,0,0,0,0];
  draws.forEach(d => {
    const num = `${d.d1}${d.d2}${d.d3}`;
    if (getType(num) === '组三') {
      const { p } = getPS(num);
      pairFreq[p]++;
    }
  });
  const sortedPairs = [...Array(10).keys()].sort((a,b) => pairFreq[b] - pairFreq[a]);
  console.log('组三对子频率排序:', sortedPairs.map(d => `${d}(${pairFreq[d]})`).join(', '));
  
  // 设计条件: 胆码用高频数字，出现次用中频数字
  // 目标: 让条件覆盖尽可能多的排列三开奖号
  const conditions = [];
  
  // 方案: 将10个数字分成几组，设计条件覆盖不同组合
  const hotDigits = sortedDigits.slice(0, 6); // 前6个高频数字
  const warmDigits = sortedDigits.slice(3, 8); // 中间频率
  const coldDigits = sortedDigits.slice(5, 10); // 低频
  
  // 生成18组条件，覆盖不同数字组合
  const danmaGroups = [
    hotDigits.slice(0, 3).join(''),
    hotDigits.slice(1, 4).join(''),
    hotDigits.slice(2, 5).join(''),
    hotDigits.slice(3, 6).join(''),
    warmDigits.slice(0, 4).join(''),
    warmDigits.slice(1, 5).join(''),
    [...hotDigits.slice(0,2), ...coldDigits.slice(0,2)].join(''),
    [...hotDigits.slice(2,4), ...coldDigits.slice(2,4)].join(''),
    sortedDigits.filter((_,i) => i % 2 === 0).join(''),
    sortedDigits.filter((_,i) => i % 2 === 1).join(''),
    sortedDigits.slice(0, 5).join(''),
    sortedDigits.slice(2, 7).join(''),
    sortedDigits.slice(4, 9).join(''),
    [sortedDigits[0], sortedDigits[3], sortedDigits[6], sortedDigits[9]].join(''),
    [sortedDigits[1], sortedDigits[4], sortedDigits[7]].join(''),
    [sortedDigits[2], sortedDigits[5], sortedDigits[8]].join(''),
    hotDigits.slice(0, 4).join(''),
    warmDigits.join(''),
  ];
  
  for (let i = 0; i < 18; i++) {
    const dm = danmaGroups[i];
    const dmDigits = dm.split('').map(Number);
    const otherDigits = [...Array(10).keys()].filter(d => !dmDigits.includes(d));
    
    // 出现次1和出现次2: 从剩余数字中分配
    const mid1 = otherDigits.slice(0, Math.ceil(otherDigits.length / 2));
    const mid2 = otherDigits.slice(Math.ceil(otherDigits.length / 2));
    
    // 组三: 对子用高频，单值用剩余
    const zs1 = sortedPairs.slice(0, 5).join('');
    const zs2 = otherDigits.slice(0, 3).join('');
    
    conditions.push({
      danma: dm,
      dg1: mid1.join(''),
      dg2: mid2.join(''),
      zs1: zs1,
      zs2: zs2,
    });
  }
  
  return conditions;
}

// === 方案B: 纯统计驱动（不用固定条件，用数据驱动评分） ===
function algoPureStats(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const recent50 = draws.slice(Math.max(0, currentIdx - 49), currentIdx + 1);
  const recent20 = draws.slice(Math.max(0, currentIdx - 19), currentIdx + 1);
  
  // 位置频率
  const posFreq100 = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  const posFreq50 = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  const posFreq20 = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  recent100.forEach(d => { posFreq100[0][d.d1]++; posFreq100[1][d.d2]++; posFreq100[2][d.d3]++; });
  recent50.forEach(d => { posFreq50[0][d.d1]++; posFreq50[1][d.d2]++; posFreq50[2][d.d3]++; });
  recent20.forEach(d => { posFreq20[0][d.d1]++; posFreq20[1][d.d2]++; posFreq20[2][d.d3]++; });
  
  // 和值频率
  const sumFreq = new Array(28).fill(0);
  recent100.forEach(d => sumFreq[d.d1+d.d2+d.d3]++);
  
  // 跨度频率
  const spanFreq = new Array(10).fill(0);
  recent100.forEach(d => spanFreq[Math.max(d.d1,d.d2,d.d3) - Math.min(d.d1,d.d2,d.d3)]++);
  
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    const sum = d[0]+d[1]+d[2];
    const span = Math.max(...d) - Math.min(...d);
    const type = getType(num);
    
    // 位置加权分
    let posScore = 0;
    for (let pos = 0; pos < 3; pos++) {
      posScore += posFreq20[pos][d[pos]] * 10;  // 近20期权重最高
      posScore += posFreq50[pos][d[pos]] * 3;
      posScore += posFreq100[pos][d[pos]] * 1;
    }
    
    // 和值分
    let sumScore = sumFreq[sum] * 5;
    
    // 跨度分
    let spanScore = spanFreq[span] * 3;
    
    // 近期出现频率
    let rh = 0;
    recent100.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    
    // 组三/组六偏好
    let typeBonus = 0;
    if (type === '组三') {
      const zusanRatio = draws.slice(Math.max(0, currentIdx-99), currentIdx+1).filter(dr => getType(`${dr.d1}${dr.d2}${dr.d3}`) === '组三').length / 100;
      typeBonus = zusanRatio * 20;
    }
    
    scoring[num] = posScore * 2 + sumScore + spanScore + rh * 100 + typeBonus;
  });
  
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// === 原有4策略（用新条件） ===
function algoBaseline(draws, currentIdx, conditions) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const condScoreCache = {};
  allNums.forEach(num => {
    let s = 0;
    conditions.forEach(c => { if (matchBase(num, c)) s++; });
    condScoreCache[num] = s;
  });
  const scoring = {};
  allNums.forEach(num => {
    let rh = 0;
    recent100.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function algoPosFreq(draws, currentIdx, conditions) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const recent20 = draws.slice(Math.max(0, currentIdx - 19), currentIdx + 1);
  const posFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  recent100.forEach(d => { posFreq[0][d.d1]++; posFreq[1][d.d2]++; posFreq[2][d.d3]++; });
  const recentFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  recent20.forEach(d => { recentFreq[0][d.d1]++; recentFreq[1][d.d2]++; recentFreq[2][d.d3]++; });
  const condScoreCache = {};
  allNums.forEach(num => {
    let s = 0;
    conditions.forEach(c => { if (matchBase(num, c)) s++; });
    condScoreCache[num] = s;
  });
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    let posScore = 0;
    for (let pos = 0; pos < 3; pos++) {
      posScore += posFreq[pos][d[pos]] * 2;
      posScore += recentFreq[pos][d[pos]] * 5;
    }
    let rh = 0;
    recent100.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    scoring[num] = posScore * 3 + condScoreCache[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function algoMarkov(draws, currentIdx) {
  const recent50 = draws.slice(Math.max(0, currentIdx - 49), currentIdx + 1);
  const recent20 = draws.slice(Math.max(0, currentIdx - 19), currentIdx + 1);
  const transition = [[],[],[]];
  for (let pos = 0; pos < 3; pos++) {
    transition[pos] = [];
    for (let d = 0; d <= 9; d++) {
      const nextFreq = [0,0,0,0,0,0,0,0,0,0];
      for (let i = 0; i < recent20.length - 1; i++) {
        if (recent20[i][posKeys[pos]] === d) nextFreq[recent20[i+1][posKeys[pos]]]++;
      }
      for (let i = 0; i < recent50.length - 1; i++) {
        if (recent50[i][posKeys[pos]] === d) nextFreq[recent50[i+1][posKeys[pos]]] += 0.5;
      }
      transition[pos][d] = nextFreq;
    }
  }
  const curD = [draws[currentIdx].d1, draws[currentIdx].d2, draws[currentIdx].d3];
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    let transScore = 0;
    for (let pos = 0; pos < 3; pos++) transScore += transition[pos][curD[pos]][d[pos]];
    let rh = 0;
    recent50.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    scoring[num] = transScore * 50 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function algoKNN(draws, currentIdx) {
  const recent30 = draws.slice(Math.max(0, currentIdx - 29), currentIdx + 1);
  const curRecent5 = [];
  for (let i = Math.max(0, currentIdx - 4); i <= currentIdx; i++) {
    curRecent5.push([draws[i].d1, draws[i].d2, draws[i].d3]);
  }
  const similarity = [];
  for (let i = 5; i < currentIdx; i++) {
    const histRecent5 = [];
    for (let k = 0; k < 5; k++) {
      const idx = i - 4 + k;
      if (idx >= 0 && idx < draws.length) histRecent5.push([draws[idx].d1, draws[idx].d2, draws[idx].d3]);
    }
    if (histRecent5.length < 5) continue;
    let diff = 0;
    for (let k = 0; k < 5; k++) {
      for (let pos = 0; pos < 3; pos++) diff += Math.abs(curRecent5[k][pos] - histRecent5[k][pos]);
    }
    similarity.push({ idx: i, diff });
  }
  similarity.sort((a, b) => a.diff - b.diff);
  const topSimilar = similarity.slice(0, 10).map(s => s.idx);
  const nextNumFreq = {};
  allNums.forEach(n => nextNumFreq[n] = 0);
  topSimilar.forEach(idx => {
    if (idx + 1 < draws.length) {
      const nextNum = `${draws[idx+1].d1}${draws[idx+1].d2}${draws[idx+1].d3}`;
      nextNumFreq[nextNum]++;
    }
  });
  const scoring = {};
  allNums.forEach(num => {
    let rh = 0;
    recent30.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    scoring[num] = nextNumFreq[num] * 200 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// === 投票法 ===
function generateSmartNumbers(draws, conditions, targetCount = 700) {
  if (!draws || draws.length < 10) return null;
  const currentIdx = draws.length - 1;
  const s0 = algoBaseline(draws, currentIdx, conditions);
  const s1 = algoPosFreq(draws, currentIdx, conditions);
  const s2 = algoMarkov(draws, currentIdx);
  const s3 = algoKNN(draws, currentIdx);
  const voteCount = {};
  allNums.forEach(num => voteCount[num] = 0);
  const threshold = 300;
  s0.slice(0, threshold).forEach(num => voteCount[num]++);
  s1.slice(0, threshold).forEach(num => voteCount[num]++);
  s2.slice(0, threshold).forEach(num => voteCount[num]++);
  s3.slice(0, threshold).forEach(num => voteCount[num]++);
  const baseRank = {};
  s0.forEach((num, idx) => baseRank[num] = idx);
  const sorted = allNums.slice().sort((a, b) => {
    if (voteCount[b] !== voteCount[a]) return voteCount[b] - voteCount[a];
    return baseRank[a] - baseRank[b];
  });
  const topNums = sorted.slice(0, targetCount);
  const zulu = topNums.filter(n => getType(n) === '组六');
  const zusan = topNums.filter(n => getType(n) === '组三');
  const lastIssue = draws[draws.length - 1].issue;
  return {
    numbers: topNums.sort(),
    zulu, zusan,
    nextIssue: String(Number(lastIssue) + 1),
    totalCount: topNums.length,
    zuluCount: zulu.length,
    zusanCount: zusan.length,
  };
}

// === 方案C: 5策略投票（加入纯统计策略） ===
function generateSmartNumbersV2(draws, conditions, targetCount = 700) {
  if (!draws || draws.length < 10) return null;
  const currentIdx = draws.length - 1;
  const s0 = algoBaseline(draws, currentIdx, conditions);
  const s1 = algoPosFreq(draws, currentIdx, conditions);
  const s2 = algoMarkov(draws, currentIdx);
  const s3 = algoKNN(draws, currentIdx);
  const s4 = algoPureStats(draws, currentIdx);
  
  const voteCount = {};
  allNums.forEach(num => voteCount[num] = 0);
  const threshold = 300;
  s0.slice(0, threshold).forEach(num => voteCount[num]++);
  s1.slice(0, threshold).forEach(num => voteCount[num]++);
  s2.slice(0, threshold).forEach(num => voteCount[num]++);
  s3.slice(0, threshold).forEach(num => voteCount[num]++);
  s4.slice(0, threshold).forEach(num => voteCount[num]++);
  
  const baseRank = {};
  s0.forEach((num, idx) => baseRank[num] = idx);
  const sorted = allNums.slice().sort((a, b) => {
    if (voteCount[b] !== voteCount[a]) return voteCount[b] - voteCount[a];
    return baseRank[a] - baseRank[b];
  });
  const topNums = sorted.slice(0, targetCount);
  const zulu = topNums.filter(n => getType(n) === '组六');
  const zusan = topNums.filter(n => getType(n) === '组三');
  const lastIssue = draws[draws.length - 1].issue;
  return {
    numbers: topNums.sort(),
    zulu, zusan,
    nextIssue: String(Number(lastIssue) + 1),
    totalCount: topNums.length,
    zuluCount: zulu.length,
    zusanCount: zusan.length,
  };
}

// === 滚动窗口验证函数 ===
function verify(draws, generateFn, conditions, startIdx = 100, targetCount = 700) {
  let totalHits = 0, totalMisses = 0;
  let maxConsecMiss = 0, curConsecMiss = 0;
  let recentHits = { 100: 0, 50: 0, 20: 0, 10: 0 };
  let recentTotals = { 100: 0, 50: 0, 20: 0, 10: 0 };
  const endIdx = draws.length - 1;
  
  for (let idx = startIdx; idx < endIdx; idx++) {
    const historyDraws = draws.slice(0, idx + 1);
    const result = generateFn(historyDraws, conditions, targetCount);
    if (!result) continue;
    const nextNum = `${draws[idx + 1].d1}${draws[idx + 1].d2}${draws[idx + 1].d3}`;
    const hit = result.numbers.includes(nextNum);
    if (hit) { totalHits++; curConsecMiss = 0; }
    else { totalMisses++; curConsecMiss++; if (curConsecMiss > maxConsecMiss) maxConsecMiss = curConsecMiss; }
    const periodsFromEnd = endIdx - idx;
    for (const w of [100, 50, 20, 10]) {
      if (periodsFromEnd <= w) { recentTotals[w]++; if (hit) recentHits[w]++; }
    }
  }
  
  return {
    total: totalHits + totalMisses,
    hits: totalHits,
    misses: totalMisses,
    rate: (totalHits / (totalHits + totalMisses) * 100).toFixed(1),
    maxConsecMiss,
    recent: {
      100: recentTotals[100] > 0 ? (recentHits[100] / recentTotals[100] * 100).toFixed(1) : '-',
      50: recentTotals[50] > 0 ? (recentHits[50] / recentTotals[50] * 100).toFixed(1) : '-',
      20: recentTotals[20] > 0 ? (recentHits[20] / recentTotals[20] * 100).toFixed(1) : '-',
      10: recentTotals[10] > 0 ? (recentHits[10] / recentTotals[10] * 100).toFixed(1) : '-',
    }
  };
}

// === 原福彩3D条件 ===
const originalConditions = [
  { danma: '368',    dg1: '2',    dg2: '147',   zs1: '0124579', zs2: '68' },
  { danma: '478',    dg1: '12',   dg2: '69',    zs1: '0123569', zs2: '48' },
  { danma: '23459',  dg1: '01',   dg2: '68',    zs1: '01678',   zs2: '23459' },
  { danma: '0345789',dg1: '1',    dg2: '26',    zs1: '126',     zs2: '035789' },
  { danma: '0148',   dg1: '23',   dg2: '69',    zs1: '235679',  zs2: '048' },
  { danma: '6789',   dg1: '5',    dg2: '02',    zs1: '012345',  zs2: '689' },
  { danma: '0234579',dg1: '18',   dg2: '',      zs1: '168',     zs2: '023459' },
  { danma: '034589', dg1: '16',   dg2: '2',     zs1: '1267',    zs2: '03589' },
  { danma: '04678',  dg1: '13',   dg2: '29',    zs1: '12359',   zs2: '068' },
  { danma: '1346',   dg1: '09',   dg2: '2',     zs1: '025789',  zs2: '346' },
  { danma: '0268',   dg1: '1',    dg2: '379',   zs1: '134579',  zs2: '028' },
  { danma: '23678',  dg1: '45',   dg2: '09',    zs1: '01459',   zs2: '23678' },
  { danma: '479',    dg1: '5',    dg2: '023',   zs1: '0123568', zs2: '479' },
  { danma: '0157',   dg1: '6',    dg2: '2349',  zs1: '234689',  zs2: '0157' },
  { danma: '01269',  dg1: '',     dg2: '358',   zs1: '34578',   zs2: '0269' },
  { danma: '159',    dg1: '8',    dg2: '026',   zs1: '0234678', zs2: '159' },
  { danma: '2478',   dg1: '15',   dg2: '069',   zs1: '013569',  zs2: '2478' },
  { danma: '013689', dg1: '',     dg2: '245',   zs1: '2457',    zs2: '0689' },
];

// === 运行验证 ===
console.log('\n\n========================================');
console.log('方案对比验证（排列三 443期滚动窗口）');
console.log('========================================\n');

// 方案1: 原福彩3D条件 + 4策略投票
console.log('【方案1】原福彩3D条件 + 4策略投票');
const r1 = verify(draws, generateSmartNumbers, originalConditions);
console.log(`  总命中率: ${r1.rate}% (${r1.hits}/${r1.total})`);
console.log(`  最大连续未中: ${r1.maxConsecMiss}期`);
console.log(`  近100/50/20/10期: ${r1.recent[100]}% / ${r1.recent[50]}% / ${r1.recent[20]}% / ${r1.recent[10]}%`);

// 方案2: 排列三优化条件 + 4策略投票
console.log('\n【方案2】排列三优化条件 + 4策略投票');
const pl3Conditions = buildConditionsForPL3(draws);
const r2 = verify(draws, generateSmartNumbers, pl3Conditions);
console.log(`  总命中率: ${r2.rate}% (${r2.hits}/${r2.total})`);
console.log(`  最大连续未中: ${r2.maxConsecMiss}期`);
console.log(`  近100/50/20/10期: ${r2.recent[100]}% / ${r2.recent[50]}% / ${r2.recent[20]}% / ${r2.recent[10]}%`);

// 方案3: 原条件 + 5策略投票（加入纯统计）
console.log('\n【方案3】原福彩3D条件 + 5策略投票（+纯统计）');
const r3 = verify(draws, generateSmartNumbersV2, originalConditions);
console.log(`  总命中率: ${r3.rate}% (${r3.hits}/${r3.total})`);
console.log(`  最大连续未中: ${r3.maxConsecMiss}期`);
console.log(`  近100/50/20/10期: ${r3.recent[100]}% / ${r3.recent[50]}% / ${r3.recent[20]}% / ${r3.recent[10]}%`);

// 方案4: 排列三优化条件 + 5策略投票
console.log('\n【方案4】排列三优化条件 + 5策略投票（+纯统计）');
const r4 = verify(draws, generateSmartNumbersV2, pl3Conditions);
console.log(`  总命中率: ${r4.rate}% (${r4.hits}/${r4.total})`);
console.log(`  最大连续未中: ${r4.maxConsecMiss}期`);
console.log(`  近100/50/20/10期: ${r4.recent[100]}% / ${r4.recent[50]}% / ${r4.recent[20]}% / ${r4.recent[10]}%`);

// 汇总对比
console.log('\n\n========================================');
console.log('汇总对比');
console.log('========================================');
console.log('方案 | 总命中率 | 最大连未中 | 近100期 | 近50期 | 近20期 | 近10期');
console.log('-----|---------|-----------|---------|--------|--------|-------');
console.log(`1.原条件+4策略 | ${r1.rate}% | ${r1.maxConsecMiss}期 | ${r1.recent[100]}% | ${r1.recent[50]}% | ${r1.recent[20]}% | ${r1.recent[10]}%`);
console.log(`2.PL3条件+4策略 | ${r2.rate}% | ${r2.maxConsecMiss}期 | ${r2.recent[100]}% | ${r2.recent[50]}% | ${r2.recent[20]}% | ${r2.recent[10]}%`);
console.log(`3.原条件+5策略 | ${r3.rate}% | ${r3.maxConsecMiss}期 | ${r3.recent[100]}% | ${r3.recent[50]}% | ${r3.recent[20]}% | ${r3.recent[10]}%`);
console.log(`4.PL3条件+5策略 | ${r4.rate}% | ${r4.maxConsecMiss}期 | ${r4.recent[100]}% | ${r4.recent[50]}% | ${r4.recent[20]}% | ${r4.recent[10]}%`);

// 输出生成的排列三条件
console.log('\n\n=== 排列三优化条件（方案2/4使用） ===');
console.log('const pl3Conditions = [');
pl3Conditions.forEach((c, i) => {
  console.log(`  { danma: '${c.danma}', dg1: '${c.dg1}', dg2: '${c.dg2}', zs1: '${c.zs1}', zs2: '${c.zs2}' },`);
});
console.log('];');
