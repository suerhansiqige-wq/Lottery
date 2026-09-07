// 福彩3D 极致排除法 - 统计特征联合过滤
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

// 先分析历史数据的统计分布
console.log('【历史数据统计分布（544期）】');
const sumCount = new Array(28).fill(0);
const spanCount = new Array(10).fill(0);
const oeCount = [0,0,0,0];
const bsCount = [0,0,0,0];
draws.forEach(d => {
  sumCount[d.d1+d.d2+d.d3]++;
  spanCount[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;
  const odd=[d.d1,d.d2,d.d3].filter(x=>x%2===1).length;
  oeCount[odd]++;
  const big=[d.d1,d.d2,d.d3].filter(x=>x>=5).length;
  bsCount[big]++;
});

console.log('和值分布:');
let sumCum=0;
const sumInfo = sumCount.map((c,i)=>({sum:i,count:c,rate:(c/draws.length*100).toFixed(1)}));
sumInfo.sort((a,b)=>b.count-a.count).forEach(s=>{sumCum+=s.count; console.log('  和值'+String(s.sum).padEnd(3)+': '+s.count+'期('+s.rate+'%) 累计'+(sumCum/draws.length*100).toFixed(1)+'%');});

console.log('');
console.log('跨度分布:');
let spanCum=0;
const spanInfo = spanCount.map((c,i)=>({span:i,count:c,rate:(c/draws.length*100).toFixed(1)}));
spanInfo.sort((a,b)=>b.count-a.count).forEach(s=>{spanCum+=s.count; console.log('  跨度'+s.span+': '+s.count+'期('+s.rate+'%) 累计'+(spanCum/draws.length*100).toFixed(1)+'%');});

console.log('');
console.log('奇偶比: '+oeCount.map((c,i)=>i+'奇'+c+'期('+(c/draws.length*100).toFixed(1)+'%)').join(' '));
console.log('大小比: '+bsCount.map((c,i)=>i+'大'+c+'期('+(c/draws.length*100).toFixed(1)+'%)').join(' '));

// 计算各种过滤组合能排除多少号码
console.log('');
console.log('【不同过滤条件组合的排除效果】');

const filterConfigs = [
  { name: '和值5-22', filter: n => { const d=n.split('').map(Number); const s=d[0]+d[1]+d[2]; return s>=5&&s<=22; } },
  { name: '跨度0-7', filter: n => { const d=n.split('').map(Number); return Math.max(...d)-Math.min(...d)<=7; } },
  { name: '和值5-22+跨度0-7', filter: n => { const d=n.split('').map(Number); const s=d[0]+d[1]+d[2]; const sp=Math.max(...d)-Math.min(...d); return s>=5&&s<=22&&sp<=7; } },
  { name: '和值8-19+跨度1-6', filter: n => { const d=n.split('').map(Number); const s=d[0]+d[1]+d[2]; const sp=Math.max(...d)-Math.min(...d); return s>=8&&s<=19&&sp>=1&&sp<=6; } },
  { name: '和值7-20+跨度0-7', filter: n => { const d=n.split('').map(Number); const s=d[0]+d[1]+d[2]; const sp=Math.max(...d)-Math.min(...d); return s>=7&&s<=20&&sp<=7; } },
  { name: '和值6-21+跨度0-6', filter: n => { const d=n.split('').map(Number); const s=d[0]+d[1]+d[2]; const sp=Math.max(...d)-Math.min(...d); return s>=6&&s<=21&&sp<=6; } },
  { name: '和值9-18+跨度2-6', filter: n => { const d=n.split('').map(Number); const s=d[0]+d[1]+d[2]; const sp=Math.max(...d)-Math.min(...d); return s>=9&&s<=18&&sp>=2&&sp<=6; } },
  { name: '排除豹子+和值3-24', filter: n => { const d=n.split('').map(Number); if(d[0]===d[1]&&d[1]===d[2])return false; const s=d[0]+d[1]+d[2]; return s>=3&&s<=24; } },
  { name: '排除豹子+和值5-22+跨度≤7', filter: n => { const d=n.split('').map(Number); if(d[0]===d[1]&&d[1]===d[2])return false; const s=d[0]+d[1]+d[2]; const sp=Math.max(...d)-Math.min(...d); return s>=5&&s<=22&&sp<=7; } },
];

// 计算每种过滤的历史覆盖率
filterConfigs.forEach(fc => {
  const passNums = allNums.filter(fc.filter);
  let hits = 0;
  draws.forEach(d => { if (fc.filter(d.num)) hits++; });
  console.log(fc.name + ': 保留'+passNums.length+'注, 历史覆盖'+hits+'/'+draws.length+'='+(hits/draws.length*100).toFixed(1)+'%');
});

// 用动态窗口做滚动验证
console.log('');
console.log('【滚动窗口验证 - 不同过滤+评分方案】');
console.log('');

// 方案1: 动态统计过滤 + 条件评分
function dynamicFilter(draws, currentIdx) {
  const recent30 = draws.slice(Math.max(0, currentIdx - 29), currentIdx + 1);
  
  // 计算近30期的热门和值范围（覆盖80%）
  const sumCount = new Array(28).fill(0);
  recent30.forEach(d => sumCount[d.d1+d.d2+d.d3]++);
  const sumSorted = sumCount.map((c,i)=>({sum:i,count:c})).sort((a,b)=>b.count-a.count);
  let sumCum=0, hotSums=[];
  for (const s of sumSorted) { sumCum+=s.count; hotSums.push(s.sum); if(sumCum/recent30.length>=0.80) break; }
  
  // 热门跨度（覆盖80%）
  const spanCount = new Array(10).fill(0);
  recent30.forEach(d => spanCount[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++);
  const spanSorted = spanCount.map((c,i)=>({span:i,count:c})).sort((a,b)=>b.count-a.count);
  let spanCum=0, hotSpans=[];
  for (const s of spanSorted) { spanCum+=s.count; hotSpans.push(s.span); if(spanCum/recent30.length>=0.80) break; }
  
  // 过滤
  const filtered = allNums.filter(num => {
    const d = num.split('').map(Number);
    if(d[0]===d[1]&&d[1]===d[2]) return false; // 排除豹子
    const sum = d[0]+d[1]+d[2];
    const span = Math.max(...d)-Math.min(...d);
    return hotSums.includes(sum) && hotSpans.includes(span);
  });
  
  // 评分
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const scoring = {};
  filtered.forEach(num => {
    let rh = 0;
    recent100.forEach(d => { if(`${d.d1}${d.d2}${d.d3}`===num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 方案2: 固定范围过滤 + 条件评分
function fixedFilter(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const filtered = allNums.filter(num => {
    const d = num.split('').map(Number);
    if(d[0]===d[1]&&d[1]===d[2]) return false;
    const sum = d[0]+d[1]+d[2];
    const span = Math.max(...d)-Math.min(...d);
    return sum>=5 && sum<=22 && span<=7;
  });
  const scoring = {};
  filtered.forEach(num => {
    let rh = 0;
    recent100.forEach(d => { if(`${d.d1}${d.d2}${d.d3}`===num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

// 方案3: 原始全量评分（基线）
function baseline(draws, currentIdx) {
  const recent100 = draws.slice(Math.max(0, currentIdx - 99), currentIdx + 1);
  const scoring = {};
  allNums.forEach(num => {
    let rh = 0;
    recent100.forEach(d => { if(`${d.d1}${d.d2}${d.d3}`===num) rh++; });
    scoring[num] = condScoreCache[num] * 10 + rh * 100;
  });
  const sorted = Object.entries(scoring).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
  return sorted;
}

const schemes = {
  '基线(全量1000)': baseline,
  '固定过滤(和值5-22+跨度≤7)': fixedFilter,
  '动态过滤(近30期80%覆盖)': dynamicFilter,
};

const targetCounts = [300, 400, 500, 600, 650, 700];
const periodResults = {};

for (const [name, fn] of Object.entries(schemes)) {
  periodResults[name] = {};
  for (let i = 0; i < draws.length - 1; i++) {
    const sorted = fn(draws, i);
    periodResults[name][draws[i].issue] = { sorted, nextNum: draws[i+1].num, poolSize: sorted.length };
  }
}

const issues = Object.keys(periodResults[Object.keys(schemes)[0]]).sort();

for (const [sName, sData] of Object.entries(periodResults)) {
  console.log('── ' + sName + ' ──');
  console.log('注数   总命中   命中率   近100期   近50期   近20期   号码池大小');
  targetCounts.forEach(tc => {
    let totalHits = 0, r100 = 0, r50 = 0, r20 = 0;
    let avgPool = 0;
    issues.forEach((issue, idx) => {
      const pr = sData[issue];
      const topSet = new Set(pr.sorted.slice(0, Math.min(tc, pr.sorted.length)));
      if (topSet.has(pr.nextNum)) {
        totalHits++;
        if (idx >= issues.length - 100) r100++;
        if (idx >= issues.length - 50) r50++;
        if (idx >= issues.length - 20) r20++;
      }
      avgPool += pr.sorted.length;
    });
    const rate = (totalHits / issues.length * 100).toFixed(1);
    const rate100 = (r100 / 100 * 100).toFixed(1);
    const rate50 = (r50 / 50 * 100).toFixed(1);
    const rate20 = (r20 / 20 * 100).toFixed(1);
    console.log(String(tc).padEnd(6) + String(totalHits).padEnd(8) + rate.padStart(6) + '%  ' + rate100.padStart(7) + '%  ' + rate50.padStart(6) + '%  ' + rate20.padStart(6) + '%  ' + Math.round(avgPool/issues.length));
  });
  console.log('');
}

// 最近10期
console.log('【最近10期对比（700注）】');
console.log('期号     开奖号  基线      固定过滤   动态过滤');
issues.slice(-10).forEach(issue => {
  const nextNum = periodResults[Object.keys(schemes)[0]][issue].nextNum;
  let line = issue + '  ' + nextNum;
  for (const sName of Object.keys(schemes)) {
    const pr = periodResults[sName][issue];
    const topSet = new Set(pr.sorted.slice(0, 700));
    line += '    ' + (topSet.has(nextNum) ? '✓' : '✗');
  }
  console.log(line);
});
