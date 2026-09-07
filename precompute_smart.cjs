// 预计算每期智能组号数据（544期，每期700注）
const fs = require('fs');

// 读取开奖数据
const dc = fs.readFileSync('c:/Users/boloor/Desktop/彩票/lottery-app/src/data/lotteryData.js', 'utf-8');
const dm2 = dc.match(/\{ issue: '(\d+)', d1: (\d), d2: (\d), d3: (\d) \}/g);
const draws = dm2.map(m => {
  const p = m.match(/issue: '(\d+)', d1: (\d), d2: (\d), d3: (\d)/);
  return { issue: p[1], d1: +p[2], d2: +p[3], d3: +p[4], num: `${p[2]}${p[3]}${p[4]}` };
});

// 18组条件
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

// 生成000-999
const allNums = [];
for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));

// 预计算条件覆盖分（每个号码的条件覆盖次数是固定的）
const condScoreCache = {};
allNums.forEach(num => {
  let score = 0;
  conditions.forEach(cond => { if (matchBase(num, cond)) score++; });
  condScoreCache[num] = score;
});

console.log(`开始预计算 ${draws.length} 期数据...`);
console.log(`条件覆盖分计算完成，共 ${Object.keys(condScoreCache).length} 个号码`);

// 逐期计算
const results = {};
let totalHits = 0;
let totalPeriods = 0;

for (let i = 0; i < draws.length - 1; i++) {
  const currentDraw = draws[i];
  const nextDraw = draws[i + 1];
  const nextNum = nextDraw.num;
  
  // 取当前期及之前最多100期作为近期数据
  const startIdx = Math.max(0, i - 99);
  const recentDraws = draws.slice(startIdx, i + 1);
  
  // 计算评分
  const scoring = {};
  allNums.forEach(num => {
    let recentHit = 0;
    recentDraws.forEach(d => { if (d.num === num) recentHit++; });
    scoring[num] = condScoreCache[num] * 10 + recentHit * 100;
  });
  
  // 排序取前700
  const sorted = Object.entries(scoring).sort((a, b) => b[1] - a[1]);
  const top700 = sorted.slice(0, 700).map(([n]) => n);
  const topSet = new Set(top700);
  
  // 验证下期
  const hit = topSet.has(nextNum);
  if (hit) totalHits++;
  totalPeriods++;
  
  // 分组六组三
  const zulu = top700.filter(n => getType(n) === '组六');
  const zusan = top700.filter(n => getType(n) === '组三');
  
  // 存储：只存号码和验证结果
  results[currentDraw.issue] = {
    numbers: top700,
    zulu,
    zusan,
    count: top700.length,
    zuluCount: zulu.length,
    zusanCount: zusan.length,
    hit,
    nextNum,
  };
  
  if ((i + 1) % 100 === 0) {
    console.log(`  已计算 ${i + 1}/${draws.length - 1} 期, 当前命中率: ${(totalHits / totalPeriods * 100).toFixed(1)}%`);
  }
}

// 最后一期（26193期）也需要生成号码，但无法验证
const lastIdx = draws.length - 1;
const lastStartIdx = Math.max(0, lastIdx - 99);
const lastRecentDraws = draws.slice(lastStartIdx, lastIdx + 1);
const lastScoring = {};
allNums.forEach(num => {
  let recentHit = 0;
  lastRecentDraws.forEach(d => { if (d.num === num) recentHit++; });
  lastScoring[num] = condScoreCache[num] * 10 + recentHit * 100;
});
const lastSorted = Object.entries(lastScoring).sort((a, b) => b[1] - a[1]);
const lastTop700 = lastSorted.slice(0, 700).map(([n]) => n);
results[draws[lastIdx].issue] = {
  numbers: lastTop700,
  zulu: lastTop700.filter(n => getType(n) === '组六'),
  zusan: lastTop700.filter(n => getType(n) === '组三'),
  count: lastTop700.length,
  zuluCount: lastTop700.filter(n => getType(n) === '组六').length,
  zusanCount: lastTop700.filter(n => getType(n) === '组三').length,
  hit: null,
  nextNum: null,
};

console.log(`\n预计算完成！`);
console.log(`总期数: ${totalPeriods}`);
console.log(`命中: ${totalHits}`);
console.log(`命中率: ${(totalHits / totalPeriods * 100).toFixed(1)}%`);

// 保存结果
const outputPath = 'c:/Users/boloor/Desktop/彩票/lottery-app/src/data/smartNumbersData.json';
fs.writeFileSync(outputPath, JSON.stringify(results));
console.log(`\n数据已保存到: ${outputPath}`);
console.log(`文件大小: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);

// 统计连续未中
let maxConsecMiss = 0, curConsecMiss = 0;
draws.forEach((d, i) => {
  if (i >= draws.length - 1) return;
  const r = results[d.issue];
  if (r && !r.hit) {
    curConsecMiss++;
    if (curConsecMiss > maxConsecMiss) maxConsecMiss = curConsecMiss;
  } else {
    curConsecMiss = 0;
  }
});
console.log(`最大连续未中: ${maxConsecMiss}期`);
