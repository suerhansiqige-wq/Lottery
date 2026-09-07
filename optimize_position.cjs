// 福彩3D 百十个位深度分析 + 多算法探索
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

// ==================== 第一部分：百十个位深度分析 ====================
console.log('══════════════════════════════════════════════');
console.log('  第一部分：百位/十位/个位 出号规律深度分析');
console.log('══════════════════════════════════════════════');
console.log('');

const posNames = ['百位', '十位', '个位'];
const posKeys = ['d1', 'd2', 'd3'];

// 1. 各位置数字频率
console.log('【1. 各位置数字出现频率（544期）】');
console.log('数字  百位次数  百位%   十位次数  十位%   个位次数  个位%');
for (let d = 0; d <= 9; d++) {
  let line = String(d).padEnd(4);
  for (let pos = 0; pos < 3; pos++) {
    const count = draws.filter(dr => dr[posKeys[pos]] === d).length;
    line += String(count).padEnd(8) + (count/draws.length*100).toFixed(1).padStart(5) + '%  ';
  }
  console.log(line);
}

// 2. 各位置近20期热号
console.log('');
console.log('【2. 各位置近20期热号排名】');
for (let pos = 0; pos < 3; pos++) {
  const freq = [0,0,0,0,0,0,0,0,0,0];
  const recent20 = draws.slice(-20);
  recent20.forEach(d => { freq[d[posKeys[pos]]]++; });
  const sorted = freq.map((c,i)=>({d:i,count:c})).sort((a,b)=>b.count-a.count);
  console.log(posNames[pos] + '热号: ' + sorted.map(x=>x.d+'('+x.count+'次)').join(', '));
}

// 3. 位置转移规律（马尔可夫）
console.log('');
console.log('【3. 位置转移规律（上期→下期，近100期）】');
const recent100 = draws.slice(-100);
for (let pos = 0; pos < 3; pos++) {
  console.log('  ' + posNames[pos] + ':');
  // 统计每个数字后面跟什么数字最多
  for (let d = 0; d <= 9; d++) {
    const nextFreq = [0,0,0,0,0,0,0,0,0,0];
    let total = 0;
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][posKeys[pos]] === d) {
        nextFreq[recent100[i+1][posKeys[pos]]]++;
        total++;
      }
    }
    if (total > 0) {
      const top3 = nextFreq.map((c,i)=>({d:i,count:c})).sort((a,b)=>b.count-a.count).slice(0,3);
      console.log('    ' + d + '→' + top3.map(x=>x.d+'('+x.count+')').join(', '));
    }
  }
}

// 4. 位置遗漏分析
console.log('');
console.log('【4. 各位置数字遗漏期数】');
for (let pos = 0; pos < 3; pos++) {
  const lastSeen = [999,999,999,999,999,999,999,999,999,999];
  for (let i = draws.length - 1; i >= 0; i--) {
    const d = draws[i][posKeys[pos]];
    if (lastSeen[d] === 999) lastSeen[d] = draws.length - 1 - i;
  }
  const sorted = lastSeen.map((v,i)=>({d:i,missing:v})).sort((a,b)=>b.missing-a.missing);
  console.log(posNames[pos] + '遗漏: ' + sorted.map(x=>x.d+'('+x.missing+'期)').join(', '));
}

// 5. 位置冷热号组合效果
console.log('');
console.log('【5. 位置热号组合测试】');
// 用近N期每个位置的前K个热号做笛卡尔积
for (const recentN of [10, 20, 30, 50]) {
  for (const topK of [4, 5, 6, 7]) {
    const recent = draws.slice(-recentN);
    const hotDigits = [[],[],[]];
    for (let pos = 0; pos < 3; pos++) {
      const freq = [0,0,0,0,0,0,0,0,0,0];
      recent.forEach(d => { freq[d[posKeys[pos]]]++; });
      const sorted = freq.map((c,i)=>({d:i,count:c})).sort((a,b)=>b.count-a.count);
      hotDigits[pos] = sorted.slice(0, topK).map(x=>x.d);
    }
    let comboCount = 0;
    const combos = new Set();
    for (const d1 of hotDigits[0]) {
      for (const d2 of hotDigits[1]) {
        for (const d3 of hotDigits[2]) {
          combos.add(`${d1}${d2}${d3}`);
          comboCount++;
        }
      }
    }
    // 验证近50期命中
    const recent50 = draws.slice(-50);
    let hits = 0;
    recent50.forEach(d => { if (combos.has(d.num)) hits++; });
    console.log('近'+recentN+'期前'+topK+'热号组合: '+comboCount+'注, 近50期命中'+hits+'/50='+(hits/50*100).toFixed(0)+'%');
  }
}

// ==================== 第二部分：新算法方案 ====================
console.log('');
console.log('══════════════════════════════════════════════');
console.log('  第二部分：新算法方案滚动验证');
console.log('══════════════════════════════════════════════');
console.log('');

// 方案1: 位置马尔可夫链
function algoMarkov(draws, currentIdx) {
  const recent50 = draws.slice(Math.max(0, currentIdx - 49), currentIdx + 1);
  const recent20 = draws.slice(Math.max(0, currentIdx - 19), currentIdx + 1);
  
  // 构建转移矩阵
  const transition = [[],[],[]];
  for (let pos = 0; pos < 3; pos++) {
    transition[pos] = [];
    for (let d = 0; d <= 9; d++) {
      const nextFreq = [0,0,0,0,0,0,0,0,0,0];
      for (let i = 0; i < recent20.length - 1; i++) {
        if (recent20[i][posKeys[pos]] === d) {
          nextFreq[recent20[i+1][posKeys[pos]]]++;
        }
      }
      // 也加入recent50的转移
      for (let i = 0; i < recent50.length - 1; i++) {
        if (recent50[i][posKeys[pos]] === d) {
          nextFreq[recent50[i+1][posKeys[pos]]] += 0.5;
        }
      }
      transition[pos][d] = nextFreq;
    }
  }
  
  // 当前各位置数字
  const curD = [draws[currentIdx].d1, draws[currentIdx].d2, draws[currentIdx].d3];
  
  // 每个号码的转移概率分
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    let transScore = 0;
    for (let pos = 0; pos < 3; pos++) {
      transScore += transition[pos][curD[pos]][d[pos]];
    }
    // 加上条件覆盖分和近期频率
    let rh = 0;
    recent50.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    scoring[num] = transScore * 50 + condScoreCache[num] * 10 + rh * 100;
  });
  
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 方案2: 位置遗漏回补
function algoMissing(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  
  // 计算各位置遗漏
  const missing = [[999,999,999,999,999,999,999,999,999,999],[999,999,999,999,999,999,999,999,999,999],[999,999,999,999,999,999,999,999,999,999]];
  for (let pos = 0; pos < 3; pos++) {
    for (let i = currentIdx; i >= Math.max(0, currentIdx - 99); i--) {
      const d = draws[i][posKeys[pos]];
      if (missing[pos][d] === 999) missing[pos][d] = currentIdx - i;
    }
  }
  
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    // 遗漏分：遗漏越大分越高（回补概率大）
    let missingScore = 0;
    for (let pos = 0; pos < 3; pos++) {
      const m = missing[pos][d[pos]];
      if (m >= 20) missingScore += 30;
      else if (m >= 10) missingScore += 20;
      else if (m >= 5) missingScore += 10;
      else missingScore += m * 2;
    }
    let rh = 0;
    recent100.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    scoring[num] = missingScore * 5 + condScoreCache[num] * 10 + rh * 100;
  });
  
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 方案3: KNN相似期法
function algoKNN(draws, currentIdx) {
  const recent30 = draws.slice(Math.max(0, currentIdx - 29), currentIdx + 1);
  
  // 计算当前期与各历史期的相似度（基于近5期的位置数字）
  const curRecent5 = [];
  for (let i = Math.max(0, currentIdx - 4); i <= currentIdx; i++) {
    curRecent5.push([draws[i].d1, draws[i].d2, draws[i].d3]);
  }
  
  const similarity = [];
  for (let i = 5; i < currentIdx; i++) {
    const histRecent5 = [];
    for (let k = 0; k < 5; k++) {
      const idx = i - 4 + k;
      if (idx >= 0 && idx < draws.length) {
        histRecent5.push([draws[idx].d1, draws[idx].d2, draws[idx].d3]);
      }
    }
    if (histRecent5.length < 5) continue;
    let diff = 0;
    for (let k = 0; k < 5; k++) {
      for (let pos = 0; pos < 3; pos++) {
        diff += Math.abs(curRecent5[k][pos] - histRecent5[k][pos]);
      }
    }
    similarity.push({ idx: i, diff });
  }
  
  // 取最相似的10期
  similarity.sort((a, b) => a.diff - b.diff);
  const topSimilar = similarity.slice(0, 10).map(s => s.idx);
  
  // 统计这些相似期之后的开奖号
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
  
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 方案4: 位置频率×条件覆盖融合
function algoPosFreq(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const recent20 = draws.slice(Math.max(0, currentIdx - 19), currentIdx + 1);
  
  // 各位置频率（近100期）
  const posFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  recent100.forEach(d => {
    posFreq[0][d.d1]++;
    posFreq[1][d.d2]++;
    posFreq[2][d.d3]++;
  });
  
  // 各位置近20期热号加分
  const recentFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  recent20.forEach(d => {
    recentFreq[0][d.d1]++;
    recentFreq[1][d.d2]++;
    recentFreq[2][d.d3]++;
  });
  
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    // 位置频率分
    let posScore = 0;
    for (let pos = 0; pos < 3; pos++) {
      posScore += posFreq[pos][d[pos]] * 2;
      posScore += recentFreq[pos][d[pos]] * 5;
    }
    let rh = 0;
    recent100.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    scoring[num] = posScore * 3 + condScoreCache[num] * 10 + rh * 100;
  });
  
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 方案5: 基线（原算法）
function algoBaseline(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const scoring = {};
  allNums.forEach(num => {
    let rh = 0;
    recent100.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 方案6: 位置马尔可夫 + 遗漏回补融合
function algoMarkovMissing(draws, currentIdx) {
  const recent50 = draws.slice(Math.max(0, currentIdx - 49), currentIdx + 1);
  const recent20 = draws.slice(Math.max(0, currentIdx - 19), currentIdx + 1);
  
  // 转移矩阵
  const transition = [[],[],[]];
  for (let pos = 0; pos < 3; pos++) {
    transition[pos] = [];
    for (let d = 0; d <= 9; d++) {
      const nextFreq = [0,0,0,0,0,0,0,0,0,0];
      for (let i = 0; i < recent20.length - 1; i++) {
        if (recent20[i][posKeys[pos]] === d) {
          nextFreq[recent20[i+1][posKeys[pos]]]++;
        }
      }
      transition[pos][d] = nextFreq;
    }
  }
  
  // 遗漏
  const missing = [[999,999,999,999,999,999,999,999,999,999],[999,999,999,999,999,999,999,999,999,999],[999,999,999,999,999,999,999,999,999,999]];
  for (let pos = 0; pos < 3; pos++) {
    for (let i = currentIdx; i >= Math.max(0, currentIdx - 99); i--) {
      const d = draws[i][posKeys[pos]];
      if (missing[pos][d] === 999) missing[pos][d] = currentIdx - i;
    }
  }
  
  const curD = [draws[currentIdx].d1, draws[currentIdx].d2, draws[currentIdx].d3];
  
  const scoring = {};
  allNums.forEach(num => {
    const d = num.split('').map(Number);
    let transScore = 0;
    let missScore = 0;
    for (let pos = 0; pos < 3; pos++) {
      transScore += transition[pos][curD[pos]][d[pos]];
      const m = missing[pos][d[pos]];
      if (m >= 15) missScore += 25;
      else if (m >= 8) missScore += 15;
      else missScore += m;
    }
    let rh = 0;
    recent50.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    scoring[num] = transScore * 40 + missScore * 8 + condScoreCache[num] * 10 + rh * 100;
  });
  
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 滚动验证
const targetCounts = [300, 400, 500, 600, 650, 700];
const algorithms = {
  '基线(原算法)': algoBaseline,
  '位置马尔可夫': algoMarkov,
  '位置遗漏回补': algoMissing,
  'KNN相似期': algoKNN,
  '位置频率融合': algoPosFreq,
  '马尔可夫+遗漏': algoMarkovMissing,
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

// 最近10期对比
console.log('【最近10期对比（700注）】');
const algoNames = Object.keys(algorithms);
console.log('期号     开奖号  ' + algoNames.map(n=>n.substring(0,6)).join('  '));
issues.slice(-10).forEach(issue => {
  const nextNum = periodResults[algoNames[0]][issue].nextNum;
  let line = issue + '  ' + nextNum;
  for (const aName of algoNames) {
    const pr = periodResults[aName][issue];
    const topSet = new Set(pr.sorted.slice(0, 700));
    line += '    ' + (topSet.has(nextNum) ? '✓' : '✗');
  }
  console.log(line);
});
