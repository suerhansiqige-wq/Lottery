// 排列三深度优化 - 条件搜索 + 权重调优 + 策略组合
const fs = require('fs');
const path = require('path');

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

// === 工具函数 ===
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

// === 策略函数 ===
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

// 新策略5: 遗漏值分析
function algoMissing(draws, currentIdx) {
  const lastAppear = {};
  allNums.forEach(n => lastAppear[n] = -1);
  for (let i = currentIdx; i >= Math.max(0, currentIdx - 199); i--) {
    const num = `${draws[i].d1}${draws[i].d2}${draws[i].d3}`;
    if (lastAppear[num] === -1) lastAppear[num] = currentIdx - i;
  }
  const scoring = {};
  allNums.forEach(num => {
    const missing = lastAppear[num] === -1 ? 200 : lastAppear[num];
    // 遗漏值适中的号码得分高（太冷不追，太热不追）
    let score = 0;
    if (missing >= 5 && missing <= 30) score = 50; // 温号
    else if (missing >= 31 && missing <= 60) score = 30; // 偏冷
    else if (missing >= 1 && missing <= 4) score = 40; // 近期热号
    else if (missing === 0) score = 20; // 刚出
    else score = 10; // 极冷
    scoring[num] = score;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// 新策略6: 和值+跨度联合
function algoSumSpan(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const sumFreq = new Array(28).fill(0);
  const spanFreq = new Array(10).fill(0);
  recent100.forEach(d => {
    sumFreq[d.d1+d.d2+d.d3]++;
    spanFreq[Math.max(d.d1,d.d2,d.d3) - Math.min(d.d1,d.d2,d.d3)]++;
  });
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    const sum = d[0]+d[1]+d[2];
    const span = Math.max(...d) - Math.min(...d);
    scoring[num] = sumFreq[sum] * 3 + spanFreq[span] * 5;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// === 通用投票引擎（支持权重和策略组合） ===
function generateWithConfig(draws, conditions, config) {
  const { strategies, weights, threshold, targetCount } = config;
  if (!draws || draws.length < 10) return null;
  const currentIdx = draws.length - 1;
  
  const strategyFns = {
    baseline: (c) => algoBaseline(draws, currentIdx, c),
    posFreq: (c) => algoPosFreq(draws, currentIdx, c),
    markov: () => algoMarkov(draws, currentIdx),
    knn: () => algoKNN(draws, currentIdx),
    missing: () => algoMissing(draws, currentIdx),
    sumSpan: () => algoSumSpan(draws, currentIdx),
  };
  
  const scores = [];
  for (let i = 0; i < strategies.length; i++) {
    const fn = strategyFns[strategies[i]];
    scores.push(fn(conditions));
  }
  
  const voteCount = {};
  allNums.forEach(num => voteCount[num] = 0);
  for (let i = 0; i < scores.length; i++) {
    const topN = scores[i].slice(0, threshold);
    topN.forEach(num => voteCount[num] += weights[i]);
  }
  
  const baseRank = {};
  scores[0].forEach((num, idx) => baseRank[num] = idx);
  const sorted = allNums.slice().sort((a, b) => {
    if (voteCount[b] !== voteCount[a]) return voteCount[b] - voteCount[a];
    return baseRank[a] - baseRank[b];
  });
  
  const topNums = sorted.slice(0, targetCount);
  const zulu = topNums.filter(n => getType(n) === '组六');
  const zusan = topNums.filter(n => getType(n) === '组三');
  return {
    numbers: topNums.sort(),
    zulu, zusan,
    nextIssue: String(Number(draws[draws.length - 1].issue) + 1),
    totalCount: topNums.length,
    zuluCount: zulu.length,
    zusanCount: zusan.length,
  };
}

// === 快速验证 ===
function quickVerify(draws, conditions, config, startIdx = 100) {
  let hits = 0, total = 0;
  let maxConsec = 0, curConsec = 0;
  let recentHits = { 100: 0, 50: 0, 20: 0, 10: 0 };
  let recentTotals = { 100: 0, 50: 0, 20: 0, 10: 0 };
  const endIdx = draws.length - 1;
  
  for (let idx = startIdx; idx < endIdx; idx++) {
    const history = draws.slice(0, idx + 1);
    const result = generateWithConfig(history, conditions, config);
    if (!result) continue;
    const nextNum = `${draws[idx + 1].d1}${draws[idx + 1].d2}${draws[idx + 1].d3}`;
    const hit = result.numbers.includes(nextNum);
    total++;
    if (hit) { hits++; curConsec = 0; }
    else { curConsec++; if (curConsec > maxConsec) maxConsec = curConsec; }
    const pfe = endIdx - idx;
    for (const w of [100, 50, 20, 10]) {
      if (pfe <= w) { recentTotals[w]++; if (hit) recentHits[w]++; }
    }
  }
  return {
    total, hits, rate: (hits / total * 100).toFixed(1), maxConsec,
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

// ========================================
// 优化1: 搜索最佳策略组合和权重
// ========================================
console.log('\n\n========================================');
console.log('优化1: 搜索最佳策略组合+权重 (用原条件)');
console.log('========================================\n');

const strategyOptions = [
  ['baseline', 'posFreq', 'markov', 'knn'],
  ['baseline', 'posFreq', 'markov', 'knn', 'missing'],
  ['baseline', 'posFreq', 'markov', 'knn', 'sumSpan'],
  ['baseline', 'posFreq', 'markov', 'missing'],
  ['baseline', 'posFreq', 'markov', 'sumSpan'],
  ['baseline', 'posFreq', 'knn', 'missing'],
  ['baseline', 'posFreq', 'knn', 'sumSpan'],
  ['baseline', 'posFreq', 'markov', 'knn', 'missing', 'sumSpan'],
  ['posFreq', 'markov', 'knn', 'missing'],
  ['posFreq', 'markov', 'knn', 'sumSpan'],
  ['baseline', 'markov', 'knn', 'missing', 'sumSpan'],
  ['baseline', 'posFreq', 'missing', 'sumSpan'],
];

const weightOptions = [
  [1,1,1,1], [1,2,1,1], [1,1,2,1], [1,1,1,2],
  [2,1,1,1], [1,2,2,1], [1,1,2,2], [2,2,1,1],
  [1,3,1,1], [1,1,3,1], [3,1,1,1], [1,1,1,3],
  [2,3,1,1], [1,2,3,1], [1,1,2,3], [3,2,1,1],
  [1,2,1,1,1], [1,1,2,1,1], [1,1,1,2,1], [1,1,1,1,2],
  [2,2,1,1,1], [1,2,2,1,1], [1,1,2,2,1], [1,1,1,2,2],
  [1,2,1,1,1,1], [1,1,2,1,1,1], [1,1,1,2,1,1],
];

let bestConfig = null;
let bestRate = 0;
let bestResult = null;

const testedConfigs = [];

for (const strats of strategyOptions) {
  const n = strats.length;
  const relevantWeights = weightOptions.filter(w => w.length === n);
  for (const w of relevantWeights) {
    for (const th of [200, 250, 300, 350, 400]) {
      const config = { strategies: strats, weights: w, threshold: th, targetCount: 700 };
      const result = quickVerify(draws, originalConditions, config);
      const rate = parseFloat(result.rate);
      testedConfigs.push({ strats: strats.join('+'), weights: w.join(','), threshold: th, ...result });
      if (rate > bestRate) {
        bestRate = rate;
        bestConfig = config;
        bestResult = result;
      }
    }
  }
}

console.log(`测试了 ${testedConfigs.length} 种配置`);
console.log(`\n最佳配置:`);
console.log(`  策略: ${bestConfig.strategies.join(', ')}`);
console.log(`  权重: ${bestConfig.weights.join(', ')}`);
console.log(`  阈值: ${bestConfig.threshold}`);
console.log(`  总命中率: ${bestResult.rate}% (${bestResult.hits}/${bestResult.total})`);
console.log(`  最大连续未中: ${bestResult.maxConsec}期`);
console.log(`  近100/50/20/10期: ${bestResult.recent[100]}% / ${bestResult.recent[50]}% / ${bestResult.recent[20]}% / ${bestResult.recent[10]}%`);

// TOP10配置
console.log('\n--- TOP10 配置 ---');
const sorted = testedConfigs.sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
// 去重显示
const seen = new Set();
let shown = 0;
for (const c of sorted) {
  const key = `${c.strats}|${c.weights}|${c.threshold}`;
  if (seen.has(key)) continue;
  seen.add(key);
  console.log(`  #${shown+1} ${c.rate}% 连未中${c.maxConsec} 近100:${c.recent[100]}% 近50:${c.recent[50]}% 近20:${c.recent[20]}% 近10:${c.recent[10]}% | ${c.strats} w=${c.weights} th=${c.threshold}`);
  shown++;
  if (shown >= 10) break;
}

// ========================================
// 优化2: 用最佳配置搜索最佳条件
// ========================================
console.log('\n\n========================================');
console.log('优化2: 用最佳策略配置搜索最佳条件');
console.log('========================================\n');

// 条件生成器: 基于排列三数据特征
function generateConditionSets(draws, count = 50) {
  const totalDraws = draws.length;
  const digitFreq = [0,0,0,0,0,0,0,0,0,0];
  draws.forEach(d => { digitFreq[d.d1]++; digitFreq[d.d2]++; digitFreq[d.d3]++; });
  const sorted = [...Array(10).keys()].sort((a,b) => digitFreq[b] - digitFreq[a]);
  
  const pairFreq = [0,0,0,0,0,0,0,0,0,0];
  draws.forEach(d => {
    const num = `${d.d1}${d.d2}${d.d3}`;
    if (getType(num) === '组三') { const { p } = getPS(num); pairFreq[p]++; }
  });
  const sortedPairs = [...Array(10).keys()].sort((a,b) => pairFreq[b] - pairFreq[a]);
  
  const sets = [];
  
  // 随机种子
  let seed = 42;
  function rand() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  
  for (let s = 0; s < count; s++) {
    const conditions = [];
    
    // 每种方案生成18组条件
    for (let i = 0; i < 18; i++) {
      // 随机选择胆码
      const danmaSize = 2 + Math.floor(rand() * 4); // 2-5
      const danmaDigits = [];
      while (danmaDigits.length < danmaSize) {
        const d = Math.floor(rand() * 10);
        if (!danmaDigits.includes(d)) danmaDigits.push(d);
      }
      const danma = danmaDigits.join('');
      
      // 剩余数字分成dg1和dg2
      const remaining = [...Array(10).keys()].filter(d => !danmaDigits.includes(d));
      // 随机打乱
      for (let j = remaining.length - 1; j > 0; j--) {
        const k = Math.floor(rand() * (j + 1));
        [remaining[j], remaining[k]] = [remaining[k], remaining[j]];
      }
      const split = 1 + Math.floor(rand() * (remaining.length - 2));
      const dg1 = remaining.slice(0, split).join('');
      const dg2 = remaining.slice(split).join('');
      
      // 组三条件
      const zs1Size = 3 + Math.floor(rand() * 4); // 3-6
      const zs1Digits = [];
      while (zs1Digits.length < zs1Size) {
        const d = Math.floor(rand() * 10);
        if (!zs1Digits.includes(d)) zs1Digits.push(d);
      }
      const zs1 = zs1Digits.join('');
      
      const zs2Size = 2 + Math.floor(rand() * 3); // 2-4
      const zs2Digits = [];
      while (zs2Digits.length < zs2Size) {
        const d = Math.floor(rand() * 10);
        if (!zs2Digits.includes(d)) zs2Digits.push(d);
      }
      const zs2 = zs2Digits.join('');
      
      conditions.push({ danma, dg1, dg2, zs1, zs2 });
    }
    sets.push(conditions);
  }
  
  // 也加入一些基于频率的智能条件
  for (let s = 0; s < 20; s++) {
    const conditions = [];
    const hotN = 3 + Math.floor(rand() * 3); // 3-5 hot digits
    const hotDigits = sorted.slice(0, hotN);
    const coldDigits = sorted.slice(hotN);
    
    for (let i = 0; i < 18; i++) {
      // 从hot中选2-3个做胆码
      const dmSize = 2 + Math.floor(rand() * 2);
      const dmCopy = [...hotDigits];
      for (let j = dmCopy.length - 1; j > 0; j--) {
        const k = Math.floor(rand() * (j + 1));
        [dmCopy[j], dmCopy[k]] = [dmCopy[k], dmCopy[j]];
      }
      const dm = dmCopy.slice(0, dmSize).join('');
      const dmSet = new Set(dmCopy.slice(0, dmSize));
      
      const rest = [...Array(10).keys()].filter(d => !dmSet.has(d));
      for (let j = rest.length - 1; j > 0; j--) {
        const k = Math.floor(rand() * (j + 1));
        [rest[j], rest[k]] = [rest[k], rest[j]];
      }
      const sp = 1 + Math.floor(rand() * (rest.length - 2));
      const dg1 = rest.slice(0, sp).join('');
      const dg2 = rest.slice(sp).join('');
      
      const pairHot = sortedPairs.slice(0, 4 + Math.floor(rand() * 3));
      const zs1 = pairHot.join('');
      const zs2 = coldDigits.slice(0, 2 + Math.floor(rand() * 2)).join('');
      
      conditions.push({ danma: dm, dg1, dg2, zs1, zs2 });
    }
    sets.push(conditions);
  }
  
  return sets;
}

console.log('生成条件集...');
const conditionSets = generateConditionSets(draws, 50);
console.log(`共 ${conditionSets.length} 组条件集`);

let bestCondResult = null;
let bestCondRate = 0;
let bestCondIdx = -1;

for (let i = 0; i < conditionSets.length; i++) {
  const result = quickVerify(draws, conditionSets[i], bestConfig);
  const rate = parseFloat(result.rate);
  if (rate > bestCondRate) {
    bestCondRate = rate;
    bestCondResult = result;
    bestCondIdx = i;
  }
  if (i % 10 === 0) process.stdout.write(`\r  测试条件集 ${i+1}/${conditionSets.length}...`);
}
console.log(`\r  完成!`);

console.log(`\n最佳条件集 #${bestCondIdx}:`);
console.log(`  总命中率: ${bestCondResult.rate}% (${bestCondResult.hits}/${bestCondResult.total})`);
console.log(`  最大连续未中: ${bestCondResult.maxConsec}期`);
console.log(`  近100/50/20/10期: ${bestCondResult.recent[100]}% / ${bestCondResult.recent[50]}% / ${bestCondResult.recent[20]}% / ${bestCondResult.recent[10]}%`);

// 输出最佳条件
console.log('\n最佳条件:');
console.log('const pl3OptimizedConditions = [');
conditionSets[bestCondIdx].forEach((c, i) => {
  console.log(`  { danma: '${c.danma}', dg1: '${c.dg1}', dg2: '${c.dg2}', zs1: '${c.zs1}', zs2: '${c.zs2}' },`);
});
console.log('];');

// ========================================
// 优化3: 不同注数对比 (500/600/700/800/900)
// ========================================
console.log('\n\n========================================');
console.log('优化3: 不同注数对比');
console.log('========================================\n');

for (const tc of [500, 600, 700, 800, 900]) {
  const config = { ...bestConfig, targetCount: tc };
  const r1 = quickVerify(draws, originalConditions, config);
  const r2 = quickVerify(draws, conditionSets[bestCondIdx], config);
  console.log(`${tc}注:`);
  console.log(`  原条件: ${r1.rate}% 连未中${r1.maxConsec} 近100:${r1.recent[100]}% 近20:${r1.recent[20]}% 近10:${r1.recent[10]}%`);
  console.log(`  优化条件: ${r2.rate}% 连未中${r2.maxConsec} 近100:${r2.recent[100]}% 近20:${r2.recent[20]}% 近10:${r2.recent[10]}%`);
}

// ========================================
// 最终汇总
// ========================================
console.log('\n\n========================================');
console.log('最终汇总');
console.log('========================================');
console.log(`\n原始基线(原条件+4策略+th300): 70.7%`);
console.log(`最佳配置(原条件+调优): ${bestResult.rate}%`);
console.log(`最佳条件(优化条件+最佳配置): ${bestCondResult.rate}%`);
console.log(`\n最佳策略配置:`);
console.log(`  strategies: [${bestConfig.strategies.map(s => `'${s}'`).join(', ')}]`);
console.log(`  weights: [${bestConfig.weights.join(', ')}]`);
console.log(`  threshold: ${bestConfig.threshold}`);
