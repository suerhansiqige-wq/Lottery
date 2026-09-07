// 排列三高效优化 - 预计算策略排名 + 快速搜索
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
const allNums = [];
for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));
const posKeys = ['d1', 'd2', 'd3'];

// 预计算: 每期每个策略的排名
console.log(`排列三: ${draws.length}期, 预计算策略排名中...`);
const startIdx = 100;
const endIdx = draws.length - 1;
const periods = endIdx - startIdx;

// 预计算所有策略排名
const strategyRankings = {}; // { strategyName: { periodIdx: [ranked nums] } }

function precomputeBaseline(draws, idx, conditions) {
  const recent100 = draws.slice(Math.max(0, idx - 99), idx + 1);
  const condScore = {};
  allNums.forEach(num => {
    let s = 0; conditions.forEach(c => { if (matchBase(num, c)) s++; }); condScore[num] = s;
  });
  const scoring = {};
  allNums.forEach(num => {
    let rh = 0;
    recent100.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    scoring[num] = condScore[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function precomputePosFreq(draws, idx, conditions) {
  const r100 = draws.slice(Math.max(0, idx - 99), idx + 1);
  const r20 = draws.slice(Math.max(0, idx - 19), idx + 1);
  const pf = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d => { pf[0][d.d1]++; pf[1][d.d2]++; pf[2][d.d3]++; });
  const rf = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r20.forEach(d => { rf[0][d.d1]++; rf[1][d.d2]++; rf[2][d.d3]++; });
  const condScore = {};
  allNums.forEach(num => { let s=0; conditions.forEach(c => { if(matchBase(num,c)) s++; }); condScore[num]=s; });
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    let ps = 0;
    for (let p = 0; p < 3; p++) ps += pf[p][d[p]] * 2 + rf[p][d[p]] * 5;
    let rh = 0; r100.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    scoring[num] = ps * 3 + condScore[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function precomputeMarkov(draws, idx) {
  const r50 = draws.slice(Math.max(0, idx - 49), idx + 1);
  const r20 = draws.slice(Math.max(0, idx - 19), idx + 1);
  const tr = [[],[],[]];
  for (let p = 0; p < 3; p++) {
    tr[p] = [];
    for (let d = 0; d <= 9; d++) {
      const nf = [0,0,0,0,0,0,0,0,0,0];
      for (let i = 0; i < r20.length - 1; i++) if (r20[i][posKeys[p]] === d) nf[r20[i+1][posKeys[p]]]++;
      for (let i = 0; i < r50.length - 1; i++) if (r50[i][posKeys[p]] === d) nf[r50[i+1][posKeys[p]]] += 0.5;
      tr[p][d] = nf;
    }
  }
  const cur = [draws[idx].d1, draws[idx].d2, draws[idx].d3];
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    let ts = 0; for (let p = 0; p < 3; p++) ts += tr[p][cur[p]][d[p]];
    let rh = 0; r50.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    scoring[num] = ts * 50 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function precomputeKNN(draws, idx) {
  const r30 = draws.slice(Math.max(0, idx - 29), idx + 1);
  const cur5 = [];
  for (let i = Math.max(0, idx - 4); i <= idx; i++) cur5.push([draws[i].d1, draws[i].d2, draws[i].d3]);
  const sim = [];
  for (let i = 5; i < idx; i++) {
    const h5 = [];
    for (let k = 0; k < 5; k++) { const ii = i-4+k; if(ii>=0) h5.push([draws[ii].d1,draws[ii].d2,draws[ii].d3]); }
    if (h5.length < 5) continue;
    let diff = 0;
    for (let k = 0; k < 5; k++) for (let p = 0; p < 3; p++) diff += Math.abs(cur5[k][p] - h5[k][p]);
    sim.push({ idx: i, diff });
  }
  sim.sort((a, b) => a.diff - b.diff);
  const top = sim.slice(0, 10).map(s => s.idx);
  const nf = {}; allNums.forEach(n => nf[n] = 0);
  top.forEach(i => { if (i+1 < draws.length) nf[`${draws[i+1].d1}${draws[i+1].d2}${draws[i+1].d3}`]++; });
  const scoring = {};
  allNums.forEach(num => {
    let rh = 0; r30.forEach(dr => { if (`${dr.d1}${dr.d2}${dr.d3}` === num) rh++; });
    scoring[num] = nf[num] * 200 + rh * 100;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function precomputeMissing(draws, idx) {
  const lastApp = {}; allNums.forEach(n => lastApp[n] = -1);
  for (let i = idx; i >= Math.max(0, idx - 199); i--) {
    const num = `${draws[i].d1}${draws[i].d2}${draws[i].d3}`;
    if (lastApp[num] === -1) lastApp[num] = idx - i;
  }
  const scoring = {};
  allNums.forEach(num => {
    const m = lastApp[num] === -1 ? 200 : lastApp[num];
    let s = 0;
    if (m >= 5 && m <= 30) s = 50;
    else if (m >= 31 && m <= 60) s = 30;
    else if (m >= 1 && m <= 4) s = 40;
    else if (m === 0) s = 20;
    else s = 10;
    scoring[num] = s;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

function precomputeSumSpan(draws, idx) {
  const r100 = draws.slice(Math.max(0, idx - 99), idx + 1);
  const sf = new Array(28).fill(0), spf = new Array(10).fill(0);
  r100.forEach(d => { sf[d.d1+d.d2+d.d3]++; spf[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++; });
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    scoring[num] = sf[d[0]+d[1]+d[2]] * 3 + spf[Math.max(...d)-Math.min(...d)] * 5;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// 原条件
const origCond = [
  { danma: '368', dg1: '2', dg2: '147', zs1: '0124579', zs2: '68' },
  { danma: '478', dg1: '12', dg2: '69', zs1: '0123569', zs2: '48' },
  { danma: '23459', dg1: '01', dg2: '68', zs1: '01678', zs2: '23459' },
  { danma: '0345789', dg1: '1', dg2: '26', zs1: '126', zs2: '035789' },
  { danma: '0148', dg1: '23', dg2: '69', zs1: '235679', zs2: '048' },
  { danma: '6789', dg1: '5', dg2: '02', zs1: '012345', zs2: '689' },
  { danma: '0234579', dg1: '18', dg2: '', zs1: '168', zs2: '023459' },
  { danma: '034589', dg1: '16', dg2: '2', zs1: '1267', zs2: '03589' },
  { danma: '04678', dg1: '13', dg2: '29', zs1: '12359', zs2: '068' },
  { danma: '1346', dg1: '09', dg2: '2', zs1: '025789', zs2: '346' },
  { danma: '0268', dg1: '1', dg2: '379', zs1: '134579', zs2: '028' },
  { danma: '23678', dg1: '45', dg2: '09', zs1: '01459', zs2: '23678' },
  { danma: '479', dg1: '5', dg2: '023', zs1: '0123568', zs2: '479' },
  { danma: '0157', dg1: '6', dg2: '2349', zs1: '234689', zs2: '0157' },
  { danma: '01269', dg1: '', dg2: '358', zs1: '34578', zs2: '0269' },
  { danma: '159', dg1: '8', dg2: '026', zs1: '0234678', zs2: '159' },
  { danma: '2478', dg1: '15', dg2: '069', zs1: '013569', zs2: '2478' },
  { danma: '013689', dg1: '', dg2: '245', zs1: '2457', zs2: '0689' },
];

// 预计算6个策略在每期的排名
const stratNames = ['baseline', 'posFreq', 'markov', 'knn', 'missing', 'sumSpan'];
const precomputed = {};

console.log('预计算baseline...');
precomputed.baseline = [];
for (let idx = startIdx; idx < endIdx; idx++) {
  precomputed.baseline.push(precomputeBaseline(draws, idx, origCond));
}
console.log('预计算posFreq...');
precomputed.posFreq = [];
for (let idx = startIdx; idx < endIdx; idx++) {
  precomputed.posFreq.push(precomputePosFreq(draws, idx, origCond));
}
console.log('预计算markov...');
precomputed.markov = [];
for (let idx = startIdx; idx < endIdx; idx++) {
  precomputed.markov.push(precomputeMarkov(draws, idx));
}
console.log('预计算knn...');
precomputed.knn = [];
for (let idx = startIdx; idx < endIdx; idx++) {
  precomputed.knn.push(precomputeKNN(draws, idx));
}
console.log('预计算missing...');
precomputed.missing = [];
for (let idx = startIdx; idx < endIdx; idx++) {
  precomputed.missing.push(precomputeMissing(draws, idx));
}
console.log('预计算sumSpan...');
precomputed.sumSpan = [];
for (let idx = startIdx; idx < endIdx; idx++) {
  precomputed.sumSpan.push(precomputeSumSpan(draws, idx));
}

// 实际开奖号
const actualNums = [];
for (let idx = startIdx; idx < endIdx; idx++) {
  actualNums.push(`${draws[idx+1].d1}${draws[idx+1].d2}${draws[idx+1].d3}`);
}

console.log(`预计算完成! 开始快速搜索配置...\n`);

// 快速评估配置
function evalConfig(stratIndices, weights, threshold, targetCount = 700) {
  let hits = 0, total = 0, maxConsec = 0, curConsec = 0;
  const rh = { 100: 0, 50: 0, 20: 0, 10: 0 };
  const rt = { 100: 0, 50: 0, 20: 0, 10: 0 };
  const nPeriods = actualNums.length;
  
  for (let pi = 0; pi < nPeriods; pi++) {
    const voteCount = new Float32Array(1000);
    for (let si = 0; si < stratIndices.length; si++) {
      const rankings = precomputed[stratNames[stratIndices[si]]][pi];
      const w = weights[si];
      const topN = Math.min(threshold, rankings.length);
      for (let j = 0; j < topN; j++) {
        const numIdx = parseInt(rankings[j]);
        voteCount[numIdx] += w;
      }
    }
    
    // 排序找top targetCount
    const indexed = [];
    for (let j = 0; j < 1000; j++) indexed.push({ num: allNums[j], score: voteCount[j], idx: j });
    indexed.sort((a, b) => b.score - a.score);
    
    const topSet = new Set();
    for (let j = 0; j < targetCount; j++) topSet.add(indexed[j].num);
    
    const hit = topSet.has(actualNums[pi]);
    total++;
    if (hit) { hits++; curConsec = 0; }
    else { curConsec++; if (curConsec > maxConsec) maxConsec = curConsec; }
    const pfe = nPeriods - pi;
    for (const w of [100, 50, 20, 10]) { if (pfe <= w) { rt[w]++; if (hit) rh[w]++; } }
  }
  
  return {
    total, hits, rate: (hits/total*100).toFixed(1), maxConsec,
    recent: {
      100: rt[100]>0?(rh[100]/rt[100]*100).toFixed(1):'-',
      50: rt[50]>0?(rh[50]/rt[50]*100).toFixed(1):'-',
      20: rt[20]>0?(rh[20]/rt[20]*100).toFixed(1):'-',
      10: rt[10]>0?(rh[10]/rt[10]*100).toFixed(1):'-',
    }
  };
}

// 搜索策略组合
const stratCombos = [
  [0,1,2,3],       // baseline+posFreq+markov+knn
  [0,1,2,4],       // +missing
  [0,1,2,5],       // +sumSpan
  [0,1,2,3,4],     // +missing+sumSpan -> no, 5 strat
  [0,1,2,3,5],
  [0,1,3,4],
  [0,1,3,5],
  [0,1,4,5],
  [1,2,3,4],
  [1,2,3,5],
  [0,1,2,3,4,5],   // all 6
  [0,1,2,4,5],
  [0,2,3,4,5],
  [1,2,3,4,5],
];

const weightSets = {
  4: [[1,1,1,1],[2,1,1,1],[1,2,1,1],[1,1,2,1],[1,1,1,2],[2,2,1,1],[1,2,2,1],[1,1,2,2],[2,1,2,1],[3,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,3],[2,3,1,1],[1,2,3,1],[3,2,1,1]],
  5: [[1,1,1,1,1],[2,1,1,1,1],[1,2,1,1,1],[1,1,2,1,1],[1,1,1,2,1],[1,1,1,1,2],[2,2,1,1,1],[1,2,2,1,1],[1,1,2,2,1],[3,1,1,1,1],[1,3,1,1,1],[1,1,3,1,1]],
  6: [[1,1,1,1,1,1],[2,1,1,1,1,1],[1,2,1,1,1,1],[1,1,2,1,1,1],[1,1,1,2,1,1],[1,1,1,1,2,1],[2,2,1,1,1,1],[1,2,2,1,1,1]],
};

let bestOverall = null;
let bestOverallRate = 0;
const allResults = [];

for (const combo of stratCombos) {
  const n = combo.length;
  const ws = weightSets[n] || [[...Array(n).fill(1)]];
  for (const w of ws) {
    for (const th of [150, 200, 250, 300, 350, 400]) {
      const r = evalConfig(combo, w, th);
      const rate = parseFloat(r.rate);
      allResults.push({ combo: combo.map(i=>stratNames[i]).join('+'), weights: w.join(','), threshold: th, ...r });
      if (rate > bestOverallRate) {
        bestOverallRate = rate;
        bestOverall = { combo, weights: w, threshold: th, result: r };
      }
    }
  }
}

console.log(`测试了 ${allResults.length} 种配置\n`);
console.log('=== 最佳配置 ===');
console.log(`策略: ${bestOverall.combo.map(i=>stratNames[i]).join(' + ')}`);
console.log(`权重: [${bestOverall.weights.join(', ')}]`);
console.log(`阈值: ${bestOverall.threshold}`);
console.log(`总命中率: ${bestOverall.result.rate}% (${bestOverall.result.hits}/${bestOverall.result.total})`);
console.log(`最大连续未中: ${bestOverall.result.maxConsec}期`);
console.log(`近100/50/20/10期: ${bestOverall.result.recent[100]}% / ${bestOverall.result.recent[50]}% / ${bestOverall.result.recent[20]}% / ${bestOverall.result.recent[10]}%`);

// TOP15
console.log('\n=== TOP15 配置 ===');
const sorted = allResults.sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
let shown = 0;
for (const c of sorted) {
  console.log(`#${shown+1} ${c.rate}% 连未中${c.maxConsec} 近100:${c.recent[100]}% 近50:${c.recent[50]}% 近20:${c.recent[20]}% 近10:${c.recent[10]}% | ${c.combo} w=[${c.weights}] th=${c.threshold}`);
  shown++;
  if (shown >= 15) break;
}

// 综合评分: 总命中率*0.4 + 近20期*0.3 + 近10期*0.3 - 连未中*2
console.log('\n=== 综合评分TOP10 (总命中+近期表现+稳定性) ===');
const scored = allResults.map(c => {
  const r20 = c.recent[20] !== '-' ? parseFloat(c.recent[20]) : 0;
  const r10 = c.recent[10] !== '-' ? parseFloat(c.recent[10]) : 0;
  const score = parseFloat(c.rate) * 0.4 + r20 * 0.3 + r10 * 0.3 - c.maxConsec * 2;
  return { ...c, score };
}).sort((a, b) => b.score - a.score);
shown = 0;
for (const c of scored) {
  console.log(`#${shown+1} 综合${c.score.toFixed(1)}分 | ${c.rate}% 连未中${c.maxConsec} 近100:${c.recent[100]}% 近20:${c.recent[20]}% 近10:${c.recent[10]}% | ${c.combo} w=[${c.weights}] th=${c.threshold}`);
  shown++;
  if (shown >= 10) break;
}

// 不同注数对比
console.log('\n=== 最佳配置不同注数对比 ===');
const bestCombo = bestOverall.combo;
const bestW = bestOverall.weights;
const bestTh = bestOverall.threshold;
for (const tc of [500, 600, 700, 800, 900]) {
  const r = evalConfig(bestCombo, bestW, bestTh, tc);
  console.log(`${tc}注: ${r.rate}% 连未中${r.maxConsec} 近100:${r.recent[100]}% 近50:${r.recent[50]}% 近20:${r.recent[20]}% 近10:${r.recent[10]}%`);
}

// 输出最终推荐
console.log('\n\n========================================');
console.log('最终推荐');
console.log('========================================');
console.log(`\n推荐方案: 策略=[${bestOverall.combo.map(i=>stratNames[i]).join(', ')}]`);
console.log(`权重=[${bestOverall.weights.join(', ')}], 阈值=${bestOverall.threshold}, 注数=700`);
console.log(`预期命中率: ${bestOverall.result.rate}%`);
