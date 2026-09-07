// 福彩3D 多策略对比分析
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

// 策略A: 统计过滤
function strategyA(draws, currentIdx, recentWindow) {
  const recent = draws.slice(Math.max(0, currentIdx - recentWindow + 1), currentIdx + 1);
  const sumCount = new Array(28).fill(0);
  recent.forEach(d => sumCount[d.d1+d.d2+d.d3]++);
  const sumSorted = sumCount.map((c,i)=>({sum:i,count:c})).sort((a,b)=>b.count-a.count);
  let sumCum = 0, sumThreshold = [];
  for (const s of sumSorted) { sumCum += s.count; sumThreshold.push(s.sum); if (sumCum / recent.length >= 0.85) break; }
  const spanCount = new Array(10).fill(0);
  recent.forEach(d => spanCount[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++);
  const spanSorted = spanCount.map((c,i)=>({span:i,count:c})).sort((a,b)=>b.count-a.count);
  let spanCum = 0, spanThreshold = [];
  for (const s of spanSorted) { spanCum += s.count; spanThreshold.push(s.span); if (spanCum / recent.length >= 0.85) break; }
  const oeCount = [0,0,0,0];
  recent.forEach(d => { const odd=[d.d1,d.d2,d.d3].filter(x=>x%2===1).length; oeCount[odd]++; });
  const oeThreshold = oeCount.map((c,i)=>({odd:i,count:c})).sort((a,b)=>b.count-a.count).filter(x=>x.count/recent.length>=0.15).map(x=>x.odd);
  const bsCount = [0,0,0,0];
  recent.forEach(d => { const big=[d.d1,d.d2,d.d3].filter(x=>x>=5).length; bsCount[big]++; });
  const bsThreshold = bsCount.map((c,i)=>({big:i,count:c})).sort((a,b)=>b.count-a.count).filter(x=>x.count/recent.length>=0.15).map(x=>x.big);
  const filtered = allNums.filter(num => {
    const d = num.split('').map(Number);
    const sum = d[0]+d[1]+d[2];
    const span = Math.max(...d)-Math.min(...d);
    const odd = d.filter(x=>x%2===1).length;
    const big = d.filter(x=>x>=5).length;
    return sumThreshold.includes(sum) && spanThreshold.includes(span) && oeThreshold.includes(odd) && bsThreshold.includes(big);
  });
  const scoring = {};
  filtered.forEach(num => {
    let rh = 0;
    recent.forEach(d => { if(`${d.d1}${d.d2}${d.d3}`===num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 策略B: 位置独立预测
function strategyB(draws, currentIdx) {
  const recent50 = draws.slice(Math.max(0, currentIdx - 49), currentIdx + 1);
  const recent20 = draws.slice(Math.max(0, currentIdx - 19), currentIdx + 1);
  const hotDigits = [[],[],[]];
  for (let pos = 0; pos < 3; pos++) {
    const freq = [0,0,0,0,0,0,0,0,0,0];
    recent20.forEach(d => { freq[pos===0?d.d1:pos===1?d.d2:d.d3]++; });
    const sorted = freq.map((c,i)=>({d:i,count:c})).sort((a,b)=>b.count-a.count);
    hotDigits[pos] = sorted.slice(0, 6).map(x=>x.d);
  }
  const combos = new Set();
  for (const d1 of hotDigits[0]) {
    for (const d2 of hotDigits[1]) {
      for (const d3 of hotDigits[2]) {
        combos.add(`${d1}${d2}${d3}`);
      }
    }
  }
  const scoring = {};
  [...combos].forEach(num => {
    let rh = 0;
    recent50.forEach(d => { if(`${d.d1}${d.d2}${d.d3}`===num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 策略C: 条件+统计增强
function strategyC(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const baseSet = new Set();
  conditions.forEach(c => {
    allNums.forEach(n => { if (matchBase(n, c)) baseSet.add(n); });
  });
  const scoring = {};
  [...baseSet].forEach(num => {
    let rh = 0;
    recent100.forEach(d => { if(`${d.d1}${d.d2}${d.d3}`===num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  const recent20 = draws.slice(Math.max(0, currentIdx - 19), currentIdx + 1);
  recent20.forEach(d => {
    const num = `${d.d1}${d.d2}${d.d3}`;
    if (!scoring[num]) scoring[num] = 50;
  });
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 策略D: 多策略投票
function strategyD(draws, currentIdx) {
  const sA = strategyA(draws, currentIdx, 30);
  const sB = strategyB(draws, currentIdx);
  const sC = strategyC(draws, currentIdx);
  const voteScore = {};
  allNums.forEach(num => voteScore[num] = 0);
  const maxLen = 1000;
  sA.forEach((num, idx) => { voteScore[num] += (maxLen - idx) * 3; });
  sB.forEach((num, idx) => { voteScore[num] += (maxLen - idx) * 2; });
  sC.forEach((num, idx) => { voteScore[num] += (maxLen - idx) * 2; });
  const sorted = Object.entries(voteScore).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 主计算
console.log('══════════════════════════════════════════════');
console.log('  福彩3D 多策略对比分析');
console.log('══════════════════════════════════════════════');
console.log('');

const targetCounts = [300, 400, 500, 600, 650, 700];
const strategyFns = {
  'A-统计过滤(30期)': (d, i) => strategyA(d, i, 30),
  'B-位置预测': (d, i) => strategyB(d, i),
  'C-条件+统计增强': (d, i) => strategyC(d, i),
  'D-多策略投票': (d, i) => strategyD(d, i),
};

const periodResults = {};
for (const [name, fn] of Object.entries(strategyFns)) {
  periodResults[name] = {};
  for (let i = 0; i < draws.length - 1; i++) {
    const sorted = fn(draws, i);
    periodResults[name][draws[i].issue] = { sorted, nextNum: draws[i+1].num };
  }
}

const issues = Object.keys(periodResults[Object.keys(strategyFns)[0]]).sort();

console.log('【各策略命中率对比】');
console.log('');

for (const [sName, sData] of Object.entries(periodResults)) {
  console.log('── ' + sName + ' ──');
  console.log('注数   总命中   命中率   近100期   近50期   近20期');
  targetCounts.forEach(tc => {
    let totalHits = 0, r100 = 0, r50 = 0, r20 = 0;
    issues.forEach((issue, idx) => {
      const pr = sData[issue];
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

console.log('【最近10期对比（700注）】');
console.log('期号     开奖号  统计过滤  位置预测  条件增强  多策略投票');
issues.slice(-10).forEach(issue => {
  const nextNum = periodResults[Object.keys(strategyFns)[0]][issue].nextNum;
  let line = issue + '  ' + nextNum;
  for (const sName of Object.keys(strategyFns)) {
    const pr = periodResults[sName][issue];
    const topSet = new Set(pr.sorted.slice(0, 700));
    line += '    ' + (topSet.has(nextNum) ? '✓' : '✗');
  }
  console.log(line);
});
