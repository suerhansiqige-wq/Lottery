// 福彩3D 深度数据分析 + 智能方案推荐
const fs = require('fs');
const dc = fs.readFileSync('c:/Users/boloor/Desktop/彩票/lottery-app/src/data/lotteryData.js','utf-8');
const dm2 = dc.match(/\{ issue: '(\d+)', d1: (\d), d2: (\d), d3: (\d) \}/g);
const draws = dm2.map(m => { const p=m.match(/issue: '(\d+)', d1: (\d), d2: (\d), d3: (\d)/); return {issue:p[1], d1:+p[2], d2:+p[3], d3:+p[4], num:`${p[2]}${p[3]}${p[4]}`}; });

console.log('══════════════════════════════════════════════');
console.log('  福彩3D 深度数据分析（2025001期至今）');
console.log('══════════════════════════════════════════════');
console.log(`  总期数: ${draws.length}期`);
console.log(`  期号范围: ${draws[0].issue} ~ ${draws[draws.length-1].issue}`);

// ==================== 1. 基础统计 ====================
console.log('\n【1. 组型分布】');
const typeCount = {组六:0, 组三:0, 豹子:0};
draws.forEach(d => {
  const [a,b,c] = [d.d1,d.d2,d.d3];
  if(a===b&&b===c) typeCount.豹子++;
  else if(a===b||a===c||b===c) typeCount.组三++;
  else typeCount.组六++;
});
Object.entries(typeCount).forEach(([t,c]) => console.log(`  ${t}: ${c}期 (${(c/draws.length*100).toFixed(1)}%)`));

// ==================== 2. 数字频率 ====================
console.log('\n【2. 数字出现频率（每位+总体）】');
const digitFreq = [0,0,0,0,0,0,0,0,0,0];
const posFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
draws.forEach(d => {
  [d.d1,d.d2,d.d3].forEach((v,i) => { digitFreq[v]++; posFreq[i][v]++; });
});
console.log('  数字  总次数  百位  十位  个位');
for(let i=0;i<10;i++) {
  console.log(`  ${i}    ${digitFreq[i].toString().padStart(4)}   ${posFreq[0][i].toString().padStart(3)}   ${posFreq[1][i].toString().padStart(3)}   ${posFreq[2][i].toString().padStart(3)}`);
}
const avgFreq = draws.length * 3 / 10;
const hotDigits = digitFreq.map((f,i)=>({d:i,f})).sort((a,b)=>b.f-a.f).filter(x=>x.f>avgFreq*1.1).map(x=>x.d);
const coldDigits = digitFreq.map((f,i)=>({d:i,f})).sort((a,b)=>a.f-b.f).filter(x=>x.f<avgFreq*0.9).map(x=>x.d);
console.log(`  热号(>平均110%): [${hotDigits.join(',')}]`);
console.log(`  冷号(<平均90%): [${coldDigits.join(',')}]`);

// ==================== 3. 跨度分布 ====================
console.log('\n【3. 跨度分布】');
const spanCount = [0,0,0,0,0,0,0,0,0,0];
draws.forEach(d => {
  const span = Math.max(d.d1,d.d2,d.d3) - Math.min(d.d1,d.d2,d.d3);
  spanCount[span]++;
});
spanCount.forEach((c,i) => console.log(`  跨度${i}: ${c}期 (${(c/draws.length*100).toFixed(1)}%)`));
const spanCumulative = [];
let cum = 0;
spanCount.forEach((c,i) => { cum+=c; spanCumulative.push({span:i, count:cum, rate:(cum/draws.length*100).toFixed(1)}); });
console.log('  累计:');
spanCumulative.forEach(s => console.log(`  跨度≤${s.span}: ${s.count}期 (${s.rate}%)`));

// ==================== 4. 和值分布 ====================
console.log('\n【4. 和值分布】');
const sumCount = new Array(28).fill(0);
draws.forEach(d => { sumCount[d.d1+d.d2+d.d3]++; });
console.log('  和值  次数  累计%');
let sumCum = 0;
for(let s=0;s<=27;s++) {
  if(sumCount[s]>0) {
    sumCum += sumCount[s];
    console.log(`  ${s.toString().padStart(2)}   ${sumCount[s].toString().padStart(3)}   ${(sumCum/draws.length*100).toFixed(1)}%`);
  }
}

// ==================== 5. 奇偶/大小分布 ====================
console.log('\n【5. 奇偶比分布】');
const oeCount = {'3:0':0,'2:1':0,'1:2':0,'0:3':0};
draws.forEach(d => {
  const odd = [d.d1,d.d2,d.d3].filter(x=>x%2===1).length;
  oeCount[`${odd}:${3-odd}`]++;
});
Object.entries(oeCount).forEach(([k,v]) => console.log(`  奇${k}: ${v}期 (${(v/draws.length*100).toFixed(1)}%)`));

console.log('\n【6. 大小比分布】');
const bsCount = {'3:0':0,'2:1':0,'1:2':0,'0:3':0};
draws.forEach(d => {
  const big = [d.d1,d.d2,d.d3].filter(x=>x>=5).length;
  bsCount[`${big}:${3-big}`]++;
});
Object.entries(bsCount).forEach(([k,v]) => console.log(`  大${k}: ${v}期 (${(v/draws.length*100).toFixed(1)}%)`));

// ==================== 6. 条件表匹配分析 ====================
console.log('\n══════════════════════════════════════════════');
console.log('  条件表18行匹配分析');
console.log('══════════════════════════════════════════════');

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

function getType(n){const d=n.split('').map(Number);if(d[0]===d[1]&&d[1]===d[2])return'豹子';if(d[0]===d[1]||d[0]===d[2]||d[1]===d[2])return'组三';return'组六';}
function getPS(n){const d=n.split('').map(Number);if(d[0]===d[1])return{p:d[0],s:d[2]};if(d[0]===d[2])return{p:d[0],s:d[1]};return{p:d[1],s:d[0]};}
function hasAny(d,s){return s.length>0&&s.split('').some(x=>d.includes(Number(x)));}

function matchBase(num, cond) {
  const d = num.split('').map(Number), t = getType(num);
  if (t === '豹子') return false;
  if (t === '组六') return hasAny(d, cond.dg1) && hasAny(d, cond.dg2);
  const {p, s} = getPS(num);
  return cond.zs1.includes(String(p)) && cond.zs2.includes(String(s));
}

// 每行命中分析
console.log('\n【每行历史命中率】');
const rowHits = [];
conditions.forEach((cond, idx) => {
  let hit = 0;
  draws.forEach(d => { if(matchBase(d.num, cond)) hit++; });
  rowHits.push({row: idx+1, hit, rate: (hit/draws.length*100).toFixed(1), cond});
  console.log(`  行${String(idx+1).padStart(2)}: 胆码=${cond.danma.padEnd(8)} 命中${hit}期 (${(hit/draws.length*100).toFixed(1)}%)`);
});

// 找出最高效的行（命中多但产生号码少的行）
console.log('\n【行效率分析（命中率/产生号码数）】');
const allNums = [];
for(let i=0;i<=999;i++) allNums.push(String(i).padStart(3,'0'));

const rowEfficiency = [];
conditions.forEach((cond, idx) => {
  let hit = 0, genCount = 0;
  draws.forEach(d => { if(matchBase(d.num, cond)) hit++; });
  allNums.forEach(n => { if(matchBase(n, cond)) genCount++; });
  const efficiency = genCount > 0 ? (hit / genCount * 100).toFixed(2) : 0;
  rowEfficiency.push({row:idx+1, hit, genCount, efficiency: parseFloat(efficiency), cond});
});
rowEfficiency.sort((a,b) => b.efficiency - a.efficiency);
rowEfficiency.forEach(r => {
  console.log(`  行${String(r.row).padStart(2)}: 命中${r.hit}期 产生${r.genCount}注 效率${r.efficiency}% 胆码=${r.cond.danma}`);
});

// ==================== 7. 智能方案推荐 ====================
console.log('\n══════════════════════════════════════════════');
console.log('  智能方案推荐（基于数据分析）');
console.log('══════════════════════════════════════════════');

// 方案1: 用高效率行重新生成
console.log('\n【方案1: 高效率行优先】');
// 取效率最高的若干行，合并生成号码
const topRows = rowEfficiency.slice(0, 10).map(r => r.cond);
const plan1Set = new Set();
topRows.forEach(c => { allNums.forEach(n => { if(matchBase(n,c)) plan1Set.add(n); }); });
const plan1 = [...plan1Set].sort();
const plan1Hit = draws.filter(d => plan1Set.has(d.num)).length;
console.log(`  取效率前10行: ${plan1.length}注, 命中${plan1Hit}期 (${(plan1Hit/draws.length*100).toFixed(1)}%)`);

// 方案2: 基于数据特征的定制方案
console.log('\n【方案2: 数据特征定制】');
// 分析：组三占~26%，组六占~73%，豹子~1%
// 跨度≤6覆盖~67%，跨度≤7覆盖~78%
// 大小1:2/2:1覆盖~75%
// 和值5-22覆盖~90%

// 组合策略：基础条件 + 跨度≤7 + 大小1:2/2:1
const plan2Set = new Set();
const baseSet = new Set();
conditions.forEach(c => allNums.forEach(n => { if(matchBase(n,c)) baseSet.add(n); }));

function getSpan(n){const d=n.split('').map(Number);return Math.max(...d)-Math.min(...d);}
function getBigCount(n){return n.split('').map(Number).filter(x=>x>=5).length;}

// 基础池 + 跨度≤7
const plan2a = [...baseSet].filter(n => getSpan(n)<=7).sort();
const plan2aHit = draws.filter(d => new Set(plan2a).has(d.num)).length;
console.log(`  基础+跨度≤7: ${plan2a.length}注, 命中${plan2aHit}期 (${(plan2aHit/draws.length*100).toFixed(1)}%)`);

// 基础池 + 大小1:2/2:1
const plan2b = [...baseSet].filter(n => {const b=getBigCount(n);return b===1||b===2;}).sort();
const plan2bHit = draws.filter(d => new Set(plan2b).has(d.num)).length;
console.log(`  基础+大小1:2/2:1: ${plan2b.length}注, 命中${plan2bHit}期 (${(plan2bHit/draws.length*100).toFixed(1)}%)`);

// 基础池 + 跨度≤7 + 大小1:2/2:1
const plan2c = [...baseSet].filter(n => {
  const b=getBigCount(n);
  return getSpan(n)<=7 && (b===1||b===2);
}).sort();
const plan2cHit = draws.filter(d => new Set(plan2c).has(d.num)).length;
console.log(`  基础+跨度≤7+大小1:2/2:1: ${plan2c.length}注, 命中${plan2cHit}期 (${(plan2cHit/draws.length*100).toFixed(1)}%)`);

// 方案3: 覆盖率排序 + 数据特征过滤
console.log('\n【方案3: 覆盖率+特征综合】');
const coverage = {};
[...baseSet].forEach(num => {
  let count = 0;
  conditions.forEach(cond => { if(matchBase(num,cond)) count++; });
  coverage[num] = count;
});
const sorted = Object.entries(coverage).sort((a,b)=>b[1]-a[1]);

// 先按跨度≤7过滤，再按覆盖率排序取700
const spanFiltered = sorted.filter(([n]) => getSpan(n)<=7);
const plan3a = spanFiltered.slice(0, 700).map(([n])=>n).sort();
const plan3aHit = draws.filter(d => new Set(plan3a).has(d.num)).length;
console.log(`  跨度≤7+覆盖率前700: ${plan3a.length}注, 命中${plan3aHit}期 (${(plan3aHit/draws.length*100).toFixed(1)}%)`);

// 先按大小1:2/2:1过滤，再按覆盖率排序取700
const bsFiltered = sorted.filter(([n]) => {const b=getBigCount(n);return b===1||b===2;});
const plan3b = bsFiltered.slice(0, 700).map(([n])=>n).sort();
const plan3bHit = draws.filter(d => new Set(plan3b).has(d.num)).length;
console.log(`  大小1:2/2:1+覆盖率前700: ${plan3b.length}注, 命中${plan3bHit}期 (${(plan3bHit/draws.length*100).toFixed(1)}%)`);

// 组三全保留 + 组六按跨度≤7+覆盖率
const zusanInBase = sorted.filter(([n])=>getType(n)==='组三');
const zuluSpanFiltered = sorted.filter(([n])=>getType(n)==='组六'&&getSpan(n)<=7);
const plan3c = [...zusanInBase, ...zuluSpanFiltered.slice(0, 700-zusanInBase.length)].map(([n])=>n).sort();
const plan3cHit = draws.filter(d => new Set(plan3c).has(d.num)).length;
console.log(`  组三全保留+组六跨度≤7覆盖率: ${plan3c.length}注, 命中${plan3cHit}期 (${(plan3cHit/draws.length*100).toFixed(1)}%)`);

// 方案4: 近期趋势加权
console.log('\n【方案4: 近期趋势加权（最近50期）】');
const recent50 = draws.slice(-50);
const recentCoverage = {};
[...baseSet].forEach(num => {
  let count = 0;
  conditions.forEach(cond => { if(matchBase(num,cond)) count++; });
  // 近期命中加分
  let recentHit = 0;
  recent50.forEach(d => { if(d.num===num) recentHit++; });
  recentCoverage[num] = count * 10 + recentHit * 100; // 近期命中权重10倍
});
const recentSorted = Object.entries(recentCoverage).sort((a,b)=>b[1]-a[1]);
const plan4 = recentSorted.slice(0,700).map(([n])=>n).sort();
const plan4Hit = draws.filter(d => new Set(plan4).has(d.num)).length;
const plan4RecentHit = recent50.filter(d => new Set(plan4).has(d.num)).length;
console.log(`  近期加权700注: 总命中${plan4Hit}期(${(plan4Hit/draws.length*100).toFixed(1)}%), 近50期命中${plan4RecentHit}期(${(plan4RecentHit/50*100).toFixed(1)}%)`);

// ==================== 8. 最终推荐 ====================
console.log('\n══════════════════════════════════════════════');
console.log('  最终推荐方案');
console.log('══════════════════════════════════════════════');

const allPlans = [
  ['基础全量', [...baseSet].sort()],
  ['基础+跨度≤7', plan2a],
  ['基础+大小1:2/2:1', plan2b],
  ['基础+跨度≤7+大小', plan2c],
  ['跨度≤7+覆盖率700', plan3a],
  ['大小+覆盖率700', plan3b],
  ['组三全+组六跨度≤7', plan3c],
  ['近期加权700', plan4],
];

const ranked = allPlans.map(([name, nums]) => {
  const set = new Set(nums);
  const hit = draws.filter(d => set.has(d.num)).length;
  const rate = hit/draws.length*100;
  const recentHit = recent50.filter(d => set.has(d.num)).length;
  const recentRate = recentHit/50*100;
  return {name, count:nums.length, hit, rate, recentHit, recentRate};
}).filter(p => p.count <= 700 || p.name === '基础全量')
  .sort((a,b) => b.rate - a.rate);

ranked.forEach((r, i) => {
  const mark = r.count <= 700 ? '✓' : '✗';
  console.log(`  ${i+1}. ${mark} ${r.name}: ${r.count}注 总命中${r.rate.toFixed(1)}% 近50期${r.recentRate.toFixed(1)}%`);
});

// 输出最优方案号码
const best = ranked[0];
console.log(`\n【最优方案: ${best.name} - ${best.count}注 - 命中率${best.rate.toFixed(1)}%】`);
const bestNums = allPlans.find(([n])=>n===best.name)[1];
const zl = bestNums.filter(n=>getType(n)==='组六');
const zs = bestNums.filter(n=>getType(n)==='组三');
console.log(`  组六${zl.length}注 + 组三${zs.length}注`);
console.log(`\n  组六号码:`);
for(let i=0;i<zl.length;i+=15) console.log(`  ${zl.slice(i,i+15).join(' ')}`);
console.log(`\n  组三号码:`);
for(let i=0;i<zs.length;i+=15) console.log(`  ${zs.slice(i,i+15).join(' ')}`);
