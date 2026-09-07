// 福彩3D智能组号推荐算法全量验证（25001-26193期）
// 用前N-1期数据预测第N期，验证命中率
const fs = require('fs');
const path = require('path');

// 读取开奖数据
const dataFile = path.join(__dirname, 'lottery-app', 'src', 'data', 'lotteryData.js');
let dataStr = fs.readFileSync(dataFile, 'utf-8');
const m = dataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = m[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws = lines.map(line => {
  const mm = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (mm) return { issue: mm[1], d1: Number(mm[2]), d2: Number(mm[3]), d3: Number(mm[4]) };
  return null;
}).filter(Boolean);

console.log(`总数据: ${draws.length}期 (${draws[0].issue} - ${draws[draws.length-1].issue})`);

// 复制算法核心函数（从smartNumbers.js提取）
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
  if (d[0]===d[1]&&d[1]===d[2]) return 'B';
  if (d[0]===d[1]||d[0]===d[2]||d[1]===d[2]) return 'Z3';
  return 'Z6';
}
function getPS(num) {
  const d = num.split('').map(Number);
  if (d[0]===d[1]) return {p:d[0],s:d[2]};
  if (d[0]===d[2]) return {p:d[0],s:d[1]};
  return {p:d[1],s:d[0]};
}
function hasAny(digits, str) {
  return str.length>0 && str.split('').some(x => digits.includes(Number(x)));
}
function matchBase(num, cond) {
  const d = num.split('').map(Number);
  const t = getType(num);
  if (t==='B') return false;
  if (t==='Z6') return hasAny(d, cond.dg1) && hasAny(d, cond.dg2);
  const {p,s} = getPS(num);
  return cond.zs1.includes(String(p)) && cond.zs2.includes(String(s));
}

// 生成所有1000个号码
const allNums = [];
for (let i = 0; i < 1000; i++) allNums.push(String(i).padStart(3, '0'));

// 策略0: baseline条件匹配
function algoBaseline(draws, idx) {
  const scoring = {};
  allNums.forEach(num => {
    let score = 0;
    for (const cond of conditions) {
      if (matchBase(num, cond)) {
        let count = 0;
        for (let k = Math.max(0, idx-99); k <= idx; k++) {
          const drawNum = `${draws[k].d1}${draws[k].d2}${draws[k].d3}`;
          if (matchBase(drawNum, cond)) count++;
        }
        score += count;
      }
    }
    scoring[num] = score;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// 策略1: 位置频率
function algoPosFreq(draws, idx) {
  const posFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  const window100 = Math.max(0, idx-99);
  const window20 = Math.max(0, idx-19);
  for (let k = window100; k <= idx; k++) {
    posFreq[0][draws[k].d1]++;
    posFreq[1][draws[k].d2]++;
    posFreq[2][draws[k].d3]++;
  }
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    let score = posFreq[0][d[0]] + posFreq[1][d[1]] + posFreq[2][d[2]];
    // 近20期加权
    let score20 = 0;
    for (let k = window20; k <= idx; k++) {
      if (draws[k].d1===d[0]) score20++;
      if (draws[k].d2===d[1]) score20++;
      if (draws[k].d3===d[2]) score20++;
    }
    scoring[num] = score * 10 + score20 * 5;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// 策略2: 马尔可夫
function algoMarkov(draws, idx) {
  const transition = {};
  allNums.forEach(n => transition[n] = {});
  const window = Math.max(0, idx-99);
  for (let k = window; k < idx; k++) {
    const cur = `${draws[k].d1}${draws[k].d2}${draws[k].d3}`;
    const next = `${draws[k+1].d1}${draws[k+1].d2}${draws[k+1].d3}`;
    if (!transition[cur][next]) transition[cur][next] = 0;
    transition[cur][next]++;
  }
  const lastNum = `${draws[idx].d1}${draws[idx].d2}${draws[idx].d3}`;
  const scoring = {};
  allNums.forEach(num => {
    scoring[num] = transition[lastNum][num] || 0;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// 策略3: KNN相似
function algoKNN(draws, idx) {
  const recent5 = [];
  for (let k = 0; k < 5; k++) {
    const i = idx - k;
    if (i >= 0) recent5.push([draws[i].d1, draws[i].d2, draws[i].d3]);
  }
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    let minDiff = Infinity;
    for (let i = 0; i <= idx; i++) {
      const hist5 = [];
      for (let k = 0; k < 5; k++) {
        const hi = i - k;
        if (hi >= 0) hist5.push([draws[hi].d1, draws[hi].d2, draws[hi].d3]);
      }
      if (hist5.length < 5) continue;
      let diff = 0;
      for (let k = 0; k < 5; k++) {
        for (let pos = 0; pos < 3; pos++) diff += Math.abs(recent5[k][pos] - hist5[k][pos]);
      }
      if (diff < minDiff) minDiff = diff;
    }
    scoring[num] = -minDiff;
  });
  return Object.entries(scoring).sort((a, b) => b[1] - a[1]).map(([n]) => n);
}

// 核心：生成700注智能号码
function generateSmart(draws, idx, targetCount = 700) {
  const s0 = algoBaseline(draws, idx);
  const s1 = algoPosFreq(draws, idx);
  const s2 = algoMarkov(draws, idx);
  const s3 = algoKNN(draws, idx);

  const voteCount = {};
  allNums.forEach(num => voteCount[num] = 0);
  const threshold = 300;
  s0.slice(0, threshold).forEach(num => voteCount[num]++);
  s1.slice(0, threshold).forEach(num => voteCount[num]++);
  s2.slice(0, threshold).forEach(num => voteCount[num]++);
  s3.slice(0, threshold).forEach(num => voteCount[num]++);

  const baseRank = {};
  s0.forEach((num, i) => baseRank[num] = i);

  const sorted = allNums.slice().sort((a, b) => {
    if (voteCount[b] !== voteCount[a]) return voteCount[b] - voteCount[a];
    return baseRank[a] - baseRank[b];
  });

  return sorted.slice(0, targetCount);
}

// ========== 开始验证 ==========
console.log('\n开始验证（用前N-1期预测第N期）...\n');

let hits = 0, misses = 0;
let maxConsecutiveMiss = 0, curConsecutiveMiss = 0;
let maxConsecutiveHit = 0, curConsecutiveHit = 0;
const hitBy100 = {};

for (let idx = 0; idx < draws.length; idx++) {
  const issue = draws[idx].issue;
  if (Number(issue) < 25001) continue; // 从25001开始

  // 用前idx期数据（不含当期）预测当期
  if (idx < 100) continue; // 至少需要100期历史

  const historyDraws = draws.slice(0, idx);
  const smartNums = generateSmart(historyDraws, idx - 1, 700);
  const currentNum = `${draws[idx].d1}${draws[idx].d2}${draws[idx].d3}`;
  const hit = smartNums.includes(currentNum);

  if (hit) {
    hits++;
    curConsecutiveMiss = 0;
    curConsecutiveHit++;
    if (curConsecutiveHit > maxConsecutiveHit) maxConsecutiveHit = curConsecutiveHit;
  } else {
    misses++;
    curConsecutiveHit = 0;
    curConsecutiveMiss++;
    if (curConsecutiveMiss > maxConsecutiveMiss) maxConsecutiveMiss = curConsecutiveMiss;
  }

  // 每100期统计
  const period100 = Math.floor((Number(issue) - 25001) / 100);
  if (!hitBy100[period100]) hitBy100[period100] = { hits: 0, total: 0 };
  hitBy100[period100].total++;
  if (hit) hitBy100[period100].hits++;
}

const total = hits + misses;
console.log(`========== 验证结果 ==========`);
console.log(`验证范围: 25001期 - ${draws[draws.length-1].issue}期`);
console.log(`总期数: ${total}期`);
console.log(`命中: ${hits}期`);
console.log(`未中: ${misses}期`);
console.log(`命中率: ${(hits/total*100).toFixed(1)}%`);
console.log(`最大连续命中: ${maxConsecutiveHit}期`);
console.log(`最大连续未中: ${maxConsecutiveMiss}期`);
console.log(`\n每100期命中率:`);
Object.keys(hitBy100).sort().forEach(k => {
  const d = hitBy100[k];
  const startIssue = 25001 + Number(k) * 100;
  const endIssue = Math.min(startIssue + 99, 26193);
  console.log(`  ${startIssue}-${endIssue}: ${(d.hits/d.total*100).toFixed(1)}% (${d.hits}/${d.total})`);
});
