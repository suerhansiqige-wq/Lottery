// 福彩3D 投票法预计算脚本
// 4策略投票：号码需至少2个策略排前300才入选，按共识度排序取前700
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

// 策略0: 基线
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

// 策略1: 位置频率融合
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

// 策略2: 位置马尔可夫
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

// 策略3: KNN相似期
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

// 投票法：至少2个策略排前300
function generateVoteNumbers(draws, currentIdx, targetCount) {
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

  return sorted.slice(0, targetCount);
}

// ==================== 主计算 ====================
console.log('开始预计算投票法数据...');
console.log('数据范围: ' + draws[0].issue + ' ~ ' + draws[draws.length-1].issue + ', 共' + draws.length + '期');

const result = {};
let totalHits = 0, totalMisses = 0;
let maxConsecutiveMiss = 0, curConsecutiveMiss = 0;

for (let i = 0; i < draws.length - 1; i++) {
  const issue = draws[i].issue;
  const nextNum = draws[i + 1].num;

  const numbers = generateVoteNumbers(draws, i, 700);

  // 分组六组三
  const zulu = [];
  const zusan = [];
  numbers.forEach(num => {
    const t = getType(num);
    if (t === '组六') zulu.push(num);
    else if (t === '组三') zusan.push(num);
  });

  // 验证
  const hit = numbers.includes(nextNum);
  if (hit) {
    totalHits++;
    curConsecutiveMiss = 0;
  } else {
    totalMisses++;
    curConsecutiveMiss++;
    if (curConsecutiveMiss > maxConsecutiveMiss) maxConsecutiveMiss = curConsecutiveMiss;
  }

  result[issue] = {
    numbers: numbers.sort(),
    zulu: zulu.sort(),
    zusan: zusan.sort(),
    count: numbers.length,
    zuluCount: zulu.length,
    zusanCount: zusan.length,
    hit: hit,
    nextNum: nextNum
  };

  if ((i + 1) % 100 === 0) {
    console.log('  已处理 ' + (i + 1) + '/' + (draws.length - 1) + ' 期, 命中' + totalHits + ', 未中' + totalMisses);
  }
}

// 保存
fs.writeFileSync('c:/Users/boloor/Desktop/彩票/lottery-app/src/data/smartNumbersData.json', JSON.stringify(result, null, 2));

console.log('');
console.log('预计算完成!');
console.log('总期数: ' + (totalHits + totalMisses));
console.log('命中: ' + totalHits);
console.log('未中: ' + totalMisses);
console.log('命中率: ' + (totalHits / (totalHits + totalMisses) * 100).toFixed(1) + '%');
console.log('最大连续未中: ' + maxConsecutiveMiss + '期');

// 分段统计
function segmentStats(startIssue, endIssue) {
  let h = 0, m = 0;
  Object.keys(result).forEach(issue => {
    if (issue >= startIssue && issue <= endIssue) {
      if (result[issue].hit) h++;
      else m++;
    }
  });
  return { h, m, total: h + m, rate: h / (h + m) * 100 };
}

console.log('');
console.log('分段命中率:');
console.log('  全部(25001-26192): ' + segmentStats('25001', '26192').rate.toFixed(1) + '%');
console.log('  近100期(26093-26192): ' + segmentStats('26093', '26192').rate.toFixed(1) + '%');
console.log('  近50期(26143-26192): ' + segmentStats('26143', '26192').rate.toFixed(1) + '%');
console.log('  近20期(26173-26192): ' + segmentStats('26173', '26192').rate.toFixed(1) + '%');
console.log('  近10期(26183-26192): ' + segmentStats('26183', '26192').rate.toFixed(1) + '%');

// 最近10期逐期
console.log('');
console.log('最近10期逐期:');
const lastIssues = Object.keys(result).sort().slice(-10);
lastIssues.forEach(issue => {
  const d = result[issue];
  console.log('  ' + issue + '期 -> ' + d.nextNum + ' ' + (d.hit ? '✓' : '✗') + ' (' + d.count + '注, 组六' + d.zuluCount + '+组三' + d.zusanCount + ')');
});
