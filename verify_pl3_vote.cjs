// 验证投票法在排列三数据上的命中率
const fs = require('fs');
const path = require('path');

// 读取排列三数据
const lotteryDataFile = path.join(__dirname, 'pl3-app', 'src', 'data', 'lotteryData.js');
let lotteryDataStr = fs.readFileSync(lotteryDataFile, 'utf-8');
// 提取数组内容
const match = lotteryDataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = match[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws = lines.map(line => {
  const m = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (m) return { issue: m[1], d1: Number(m[2]), d2: Number(m[3]), d3: Number(m[4]) };
  return null;
}).filter(Boolean);

console.log(`排列三数据: ${draws.length} 期 (${draws[0].issue} - ${draws[draws.length-1].issue})`);

// === 投票法算法（与福彩3D相同） ===
const conditions = [
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
const condScoreCache = {};
allNums.forEach(num => {
  let s = 0;
  conditions.forEach(c => { if (matchBase(num, c)) s++; });
  condScoreCache[num] = s;
});

const posKeys = ['d1', 'd2', 'd3'];

function algoBaseline(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const scoring = {};
  allNums.forEach(num => {
    let rh = 0;
    recent100.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function algoPosFreq(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const recent20 = draws.slice(Math.max(0, currentIdx - 19), currentIdx + 1);
  const posFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  recent100.forEach(d => { posFreq[0][d.d1]++; posFreq[1][d.d2]++; posFreq[2][d.d3]++; });
  const recentFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  recent20.forEach(d => { recentFreq[0][d.d1]++; recentFreq[1][d.d2]++; recentFreq[2][d.d3]++; });
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
    scoring[num] = transScore * 50 + condScoreCache[num] * 10 + rh * 100;
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
    scoring[num] = nextNumFreq[num] * 200 + condScoreCache[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function generateSmartNumbers(draws, targetCount = 700) {
  if (!draws || draws.length < 10) return null;
  const currentIdx = draws.length - 1;
  const s0 = algoBaseline(draws, currentIdx);
  const s1 = algoPosFreq(draws, currentIdx);
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
    zulu,
    zusan,
    nextIssue: String(Number(lastIssue) + 1),
    totalCount: topNums.length,
    zuluCount: zulu.length,
    zusanCount: zusan.length,
  };
}

// === 滚动窗口验证 ===
console.log('\n=== 排列三投票法滚动窗口验证 ===\n');

let totalHits = 0, totalMisses = 0;
let maxConsecMiss = 0, curConsecMiss = 0;
let recentHits = { 100: 0, 50: 0, 20: 0, 10: 0 };
let recentTotals = { 100: 0, 50: 0, 20: 0, 10: 0 };
const recentWindow = 200; // 只验证最近200期

const startIdx = 100; // 从第101期开始（需要足够历史数据）
const endIdx = draws.length - 1;
const verifyPeriods = endIdx - startIdx;

for (let idx = startIdx; idx < endIdx; idx++) {
  const historyDraws = draws.slice(0, idx + 1);
  const result = generateSmartNumbers(historyDraws, 700);
  if (!result) continue;
  
  const nextNum = `${draws[idx + 1].d1}${draws[idx + 1].d2}${draws[idx + 1].d3}`;
  const hit = result.numbers.includes(nextNum);
  
  if (hit) {
    totalHits++;
    curConsecMiss = 0;
  } else {
    totalMisses++;
    curConsecMiss++;
    if (curConsecMiss > maxConsecMiss) maxConsecMiss = curConsecMiss;
  }
  
  // 统计近期
  const periodsFromEnd = endIdx - idx;
  for (const w of [100, 50, 20, 10]) {
    if (periodsFromEnd <= w) {
      recentTotals[w]++;
      if (hit) recentHits[w]++;
    }
  }
}

const totalRate = (totalHits / (totalHits + totalMisses) * 100).toFixed(1);
console.log(`验证期数: ${totalHits + totalMisses} 期 (${draws[startIdx].issue} - ${draws[endIdx - 1].issue})`);
console.log(`命中: ${totalHits} 期 | 未中: ${totalMisses} 期`);
console.log(`总命中率: ${totalRate}%`);
console.log(`最大连续未中: ${maxConsecMiss} 期`);
console.log('');

for (const w of [100, 50, 20, 10]) {
  if (recentTotals[w] > 0) {
    const rate = (recentHits[w] / recentTotals[w] * 100).toFixed(1);
    console.log(`近${w}期: 命中${recentHits[w]}/${recentTotals[w]} = ${rate}%`);
  }
}

// 生成下一期预测
console.log('\n=== 下一期预测 ===');
const lastResult = generateSmartNumbers(draws, 700);
if (lastResult) {
  console.log(`预测期号: ${lastResult.nextIssue}`);
  console.log(`总注数: ${lastResult.totalCount} (组六${lastResult.zuluCount} + 组三${lastResult.zusanCount})`);
}
