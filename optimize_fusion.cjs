// 福彩3D 终极融合算法 - 组合最优策略
const fs = require('fs');
const dc = fs.readFileSync('c:/Users/boloor/Desktop/彩票/lottery-app/src/data/lotteryData.js', 'utf-8');
const dm2 = dc.match(/\{ issue: '(\d+)', d1: (\d), d2: (\d), d3: (\d) \}/g);
const draws = dm2.map(m => {
  const p = m.match(/issue: '(\d+)', d1: (\d), d2: (\d), d3: (\d)/);
  return { issue: p[1], d1: +p[2], d2: +p[3], d3: +p[4], num: `${p[2]}${p[3]}${p[4]}` };
});

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

function getType(n) { const d=n.split('').map(Number); if(d[0]===d[1]&&d[1]===d[2])return'豹子'; if(d[0]===d[1]||d[0]===d[2]||d[1]===d[2])return'组三'; return'组六'; }
function getPS(n) { const d=n.split('').map(Number); if(d[0]===d[1])return{p:d[0],s:d[2]}; if(d[0]===d[2])return{p:d[0],s:d[1]}; return{p:d[1],s:d[0]}; }
function hasAny(d,s) { return s.length>0 && s.split('').some(x=>d.includes(Number(x))); }
function matchBase(num,cond) { const d=num.split('').map(Number),t=getType(num); if(t==='豹子')return false; if(t==='组六')return hasAny(d,cond.dg1)&&hasAny(d,cond.dg2); const{p,s}=getPS(num); return cond.zs1.includes(String(p))&&cond.zs2.includes(String(s)); }

const allNums = [];
for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));

const condScoreCache = {};
allNums.forEach(num => { let s=0; conditions.forEach(c=>{if(matchBase(num,c))s++;}); condScoreCache[num]=s; });

const posKeys = ['d1', 'd2', 'd3'];

// 基线算法
function algoBaseline(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const scoring = {};
  allNums.forEach(num => {
    let rh = 0;
    recent100.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

// 位置频率融合
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
    recent100.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    scoring[num] = posScore * 3 + condScoreCache[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

// 位置马尔可夫
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
    recent50.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    scoring[num] = transScore * 50 + condScoreCache[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

// KNN相似期
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
    recent30.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    scoring[num] = nextNumFreq[num] * 200 + condScoreCache[num] * 10 + rh * 100;
  });
  return Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

// ==================== 融合方案 ====================

// 融合1: 三策略排名加权（位置频率 + 马尔可夫 + KNN）
function fusionRank(draws, currentIdx) {
  const s1 = algoPosFreq(draws, currentIdx);
  const s2 = algoMarkov(draws, currentIdx);
  const s3 = algoKNN(draws, currentIdx);
  
  const rankScore = {};
  allNums.forEach(num => rankScore[num] = 0);
  const maxLen = 1000;
  
  // 位置频率权重最高（之前表现最好）
  s1.forEach((num, idx) => { rankScore[num] += (maxLen - idx) * 4; });
  s2.forEach((num, idx) => { rankScore[num] += (maxLen - idx) * 3; });
  s3.forEach((num, idx) => { rankScore[num] += (maxLen - idx) * 3; });
  
  return Object.entries(rankScore).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

// 融合2: 四策略排名加权（含基线）
function fusionAll(draws, currentIdx) {
  const s0 = algoBaseline(draws, currentIdx);
  const s1 = algoPosFreq(draws, currentIdx);
  const s2 = algoMarkov(draws, currentIdx);
  const s3 = algoKNN(draws, currentIdx);
  
  const rankScore = {};
  allNums.forEach(num => rankScore[num] = 0);
  const maxLen = 1000;
  
  s0.forEach((num, idx) => { rankScore[num] += (maxLen - idx) * 2; });
  s1.forEach((num, idx) => { rankScore[num] += (maxLen - idx) * 4; });
  s2.forEach((num, idx) => { rankScore[num] += (maxLen - idx) * 3; });
  s3.forEach((num, idx) => { rankScore[num] += (maxLen - idx) * 3; });
  
  return Object.entries(rankScore).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

// 融合3: 投票法（至少2个策略前300才入选）
function fusionVote(draws, currentIdx) {
  const s1 = algoPosFreq(draws, currentIdx);
  const s2 = algoMarkov(draws, currentIdx);
  const s3 = algoKNN(draws, currentIdx);
  const s0 = algoBaseline(draws, currentIdx);
  
  const voteCount = {};
  allNums.forEach(num => voteCount[num] = 0);
  
  const threshold = 300;
  s0.slice(0, threshold).forEach(num => voteCount[num]++);
  s1.slice(0, threshold).forEach(num => voteCount[num]++);
  s2.slice(0, threshold).forEach(num => voteCount[num]++);
  s3.slice(0, threshold).forEach(num => voteCount[num]++);
  
  // 按投票数排序，同票按基线排名
  const baseRank = {};
  s0.forEach((num, idx) => baseRank[num] = idx);
  
  const sorted = allNums.sort((a, b) => {
    if (voteCount[b] !== voteCount[a]) return voteCount[b] - voteCount[a];
    return baseRank[a] - baseRank[b];
  });
  
  return sorted;
}

// 融合4: 位置频率 + 基线 双策略
function fusionPosBaseline(draws, currentIdx) {
  const s0 = algoBaseline(draws, currentIdx);
  const s1 = algoPosFreq(draws, currentIdx);
  
  const rankScore = {};
  allNums.forEach(num => rankScore[num] = 0);
  const maxLen = 1000;
  
  s0.forEach((num, idx) => { rankScore[num] += (maxLen - idx) * 3; });
  s1.forEach((num, idx) => { rankScore[num] += (maxLen - idx) * 5; });
  
  return Object.entries(rankScore).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

// 滚动验证
console.log('══════════════════════════════════════════════');
console.log('  福彩3D 终极融合算法验证');
console.log('══════════════════════════════════════════════');
console.log('');

const targetCounts = [300, 400, 500, 600, 650, 700];
const algorithms = {
  '基线(原算法)': algoBaseline,
  '位置频率融合': algoPosFreq,
  '三策略排名加权': fusionRank,
  '四策略排名加权': fusionAll,
  '投票法(≥2/4)': fusionVote,
  '位置频率+基线': fusionPosBaseline,
};

const periodResults = {};
for (const [name, fn] of Object.entries(algorithms)) {
  periodResults[name] = {};
  for (let i = 0; i < draws.length - 1; i++) {
    const sorted = fn(draws, i);
    periodResults[name][draws[i].issue] = { sorted, nextNum: draws[i+1].num };
  }
}

const issues = Object.keys(periodResults[Object.keys(algorithms)[0]]).sort();

for (const [aName, aData] of Object.entries(periodResults)) {
  console.log('── ' + aName + ' ──');
  console.log('注数   总命中   命中率   近100期   近50期   近20期');
  targetCounts.forEach(tc => {
    let totalHits = 0, r100 = 0, r50 = 0, r20 = 0;
    issues.forEach((issue, idx) => {
      const pr = aData[issue];
      const topSet = new Set(pr.sorted.slice(0, tc));
      if (topSet.has(pr.nextNum)) {
        totalHits++;
        if (idx >= issues.length - 100) r100++;
        if (idx >= issues.length - 50) r50++;
        if (idx >= issues.length - 20) r20++;
      }
    });
    const rate = (totalHits / issues.length * 100).toFixed(1);
    const rate100 = (r100 / 100 * 100).toFixed(1);
    const rate50 = (r50 / 50 * 100).toFixed(1);
    const rate20 = (r20 / 20 * 100).toFixed(1);
    console.log(String(tc).padEnd(6) + String(totalHits).padEnd(8) + rate.padStart(6) + '%  ' + rate100.padStart(7) + '%  ' + rate50.padStart(6) + '%  ' + rate20.padStart(6) + '%');
  });
  console.log('');
}

// 最近10期
console.log('【最近10期对比（700注）】');
const algoNames = Object.keys(algorithms);
console.log('期号     开奖号  ' + algoNames.map(n=>n.substring(0,8)).join(' '));
issues.slice(-10).forEach(issue => {
  const nextNum = periodResults[algoNames[0]][issue].nextNum;
  let line = issue + '  ' + nextNum;
  for (const aName of algoNames) {
    const pr = periodResults[aName][issue];
    const topSet = new Set(pr.sorted.slice(0, 700));
    line += '  ' + (topSet.has(nextNum) ? '✓' : '✗');
  }
  console.log(line);
});

// 最大连续未中
console.log('');
console.log('【最大连续未中（700注）】');
for (const [aName, aData] of Object.entries(periodResults)) {
  let maxMiss = 0, curMiss = 0;
  issues.forEach(issue => {
    const pr = aData[issue];
    const topSet = new Set(pr.sorted.slice(0, 700));
    if (!topSet.has(pr.nextNum)) { curMiss++; if (curMiss > maxMiss) maxMiss = curMiss; }
    else curMiss = 0;
  });
  console.log('  ' + aName + ': 最大连续未中' + maxMiss + '期');
}
