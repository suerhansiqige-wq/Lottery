// 排列三条件过滤+投票法 - 寻找低注数高命中方案
// 思路: 硬条件过滤(和值/跨度/奇偶/大小) → 缩小号码池 → 投票法排序 → 取topN
const fs = require('fs');
const path = require('path');

const lotteryDataFile = path.join(__dirname, 'pl3-app', 'src', 'data', 'lotteryData.js');
let lotteryDataStr = fs.readFileSync(lotteryDataFile, 'utf-8');
const m = lotteryDataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = m[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws = lines.map(line => {
  const mm = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (mm) return { issue: mm[1], d1: Number(mm[2]), d2: Number(mm[3]), d3: Number(mm[4]) };
  return null;
}).filter(Boolean);

console.log(`排列三数据: ${draws.length}期 (${draws[0].issue} - ${draws[draws.length-1].issue})`);

const allNums = [];
for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));

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

const conditions = [
  {danma:'368',dg1:'2',dg2:'147',zs1:'0124579',zs2:'68'},
  {danma:'478',dg1:'12',dg2:'69',zs1:'0123569',zs2:'48'},
  {danma:'23459',dg1:'01',dg2:'68',zs1:'01678',zs2:'23459'},
  {danma:'0345789',dg1:'1',dg2:'26',zs1:'126',zs2:'035789'},
  {danma:'0148',dg1:'23',dg2:'69',zs1:'235679',zs2:'048'},
  {danma:'6789',dg1:'5',dg2:'02',zs1:'012345',zs2:'689'},
  {danma:'0234579',dg1:'18',dg2:'',zs1:'168',zs2:'023459'},
  {danma:'034589',dg1:'16',dg2:'2',zs1:'1267',zs2:'03589'},
  {danma:'04678',dg1:'13',dg2:'29',zs1:'12359',zs2:'068'},
  {danma:'1346',dg1:'09',dg2:'2',zs1:'025789',zs2:'346'},
  {danma:'0268',dg1:'1',dg2:'379',zs1:'134579',zs2:'028'},
  {danma:'23678',dg1:'45',dg2:'09',zs1:'01459',zs2:'23678'},
  {danma:'479',dg1:'5',dg2:'023',zs1:'0123568',zs2:'479'},
  {danma:'0157',dg1:'6',dg2:'2349',zs1:'234689',zs2:'0157'},
  {danma:'01269',dg1:'',dg2:'358',zs1:'34578',zs2:'0269'},
  {danma:'159',dg1:'8',dg2:'026',zs1:'0234678',zs2:'159'},
  {danma:'2478',dg1:'15',dg2:'069',zs1:'013569',zs2:'2478'},
  {danma:'013689',dg1:'',dg2:'245',zs1:'2457',zs2:'0689'},
];

const condScore = {};
allNums.forEach(n => { let s=0; conditions.forEach(c=>{if(matchBase(n,c))s++;}); condScore[n]=s; });

// ========== 投票法策略 ==========
function algoBaseline(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const sc={}; allNums.forEach(n=>{let rh=0;r100.forEach(d=>{if(`${d.d1}${d.d2}${d.d3}`===n)rh++;});sc[n]=condScore[n]*10+rh*150;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function algoPosFreq(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const pf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d=>{pf[0][d.d1]++;pf[1][d.d2]++;pf[2][d.d3]++;});
  const rf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r20.forEach(d=>{rf[0][d.d1]++;rf[1][d.d2]++;rf[2][d.d3]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);let ps=0;for(let p=0;p<3;p++)ps+=pf[p][d[p]]*2+rf[p][d[p]]*5;let rh=0;r100.forEach(dr=>{if(`${dr.d1}${dr.d2}${dr.d3}`===n)rh++;});sc[n]=ps*3+condScore[n]*10+rh*100;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function algoSumSpanPrecise(draws, idx) {
  const r50=draws.slice(Math.max(0,idx-49),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const sf50=new Array(28).fill(0),sf20=new Array(28).fill(0),spf50=new Array(10).fill(0),spf20=new Array(10).fill(0);
  r50.forEach(d=>{sf50[d.d1+d.d2+d.d3]++;spf50[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  r20.forEach(d=>{sf20[d.d1+d.d2+d.d3]++;spf20[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);const sum=d[0]+d[1]+d[2],span=Math.max(...d)-Math.min(...d);sc[n]=sf20[sum]*8+sf50[sum]*3+spf20[span]*12+spf50[span]*5;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

// ========== 条件过滤器 ==========
// 根据近期数据动态确定和值范围、跨度范围、形态
function getFilter(draws, idx) {
  const r50 = draws.slice(Math.max(0,idx-49), idx+1);
  
  // 和值频率
  const sumFreq = new Array(28).fill(0);
  r50.forEach(d => sumFreq[d.d1+d.d2+d.d3]++);
  
  // 跨度频率
  const spanFreq = new Array(10).fill(0);
  r50.forEach(d => spanFreq[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++);
  
  // 形态频率 (组六/组三/豹子)
  let z6=0, z3=0, bz=0;
  r50.forEach(d => {
    const t = getType(`${d.d1}${d.d2}${d.d3}`);
    if(t==='Z6')z6++; else if(t==='Z3')z3++; else bz++;
  });
  
  // 奇偶形态频率
  const parityFreq = new Array(8).fill(0);
  r50.forEach(d => {
    parityFreq[(d.d1%2)*4+(d.d2%2)*2+(d.d3%2)]++;
  });
  
  // 大小形态频率
  const sizeFreq = new Array(8).fill(0);
  r50.forEach(d => {
    sizeFreq[(d.d1>=5?1:0)*4+(d.d2>=5?1:0)*2+(d.d3>=5?1:0)]++;
  });
  
  return { sumFreq, spanFreq, z6, z3, bz, parityFreq, sizeFreq };
}

// 应用过滤: 返回通过过滤的号码集合
function applyFilter(nums, filter, config) {
  const { sumFreq, spanFreq, z6, z3, parityFreq, sizeFreq } = filter;
  const total = sumFreq.reduce((a,b)=>a+b,0);
  
  // 和值范围: 取覆盖config.sumCover%的和值
  const sumRanked = [...Array(28).keys()].sort((a,b) => sumFreq[b]-sumFreq[a]);
  let sumSet = new Set();
  let sumCum = 0;
  const sumTarget = total * config.sumCover;
  for (const s of sumRanked) {
    sumSet.add(s);
    sumCum += sumFreq[s];
    if (sumCum >= sumTarget) break;
  }
  
  // 跨度范围
  const spanRanked = [...Array(10).keys()].sort((a,b) => spanFreq[b]-spanFreq[a]);
  let spanSet = new Set();
  let spanCum = 0;
  const spanTarget = total * config.spanCover;
  for (const s of spanRanked) {
    spanSet.add(s);
    spanCum += spanFreq[s];
    if (spanCum >= spanTarget) break;
  }
  
  // 形态过滤
  const totalType = z6 + z3 + (config.includeBaozi ? 1 : 0);
  const includeZ6 = z6 / totalType > config.typeThreshold;
  const includeZ3 = z3 / totalType > config.typeThreshold;
  
  // 奇偶形态: 取top config.parityTop个
  const parityRanked = [...Array(8).keys()].sort((a,b) => parityFreq[b]-parityFreq[a]);
  const paritySet = new Set(parityRanked.slice(0, config.parityTop));
  
  // 大小形态: 取top config.sizeTop个
  const sizeRanked = [...Array(8).keys()].sort((a,b) => sizeFreq[b]-sizeFreq[a]);
  const sizeSet = new Set(sizeRanked.slice(0, config.sizeTop));
  
  return nums.filter(n => {
    const d = n.split('').map(Number);
    const sum = d[0]+d[1]+d[2];
    const span = Math.max(...d)-Math.min(...d);
    const type = getType(n);
    const parity = (d[0]%2)*4+(d[1]%2)*2+(d[2]%2);
    const size = (d[0]>=5?1:0)*4+(d[1]>=5?1:0)*2+(d[2]>=5?1:0);
    
    if (!sumSet.has(sum)) return false;
    if (!spanSet.has(span)) return false;
    if (type === '豹子' && !config.includeBaozi) return false;
    if (type === '组三' && !includeZ3) return false;
    if (type === '组六' && !includeZ6) return false;
    if (!paritySet.has(parity)) return false;
    if (!sizeSet.has(size)) return false;
    return true;
  });
}

// ========== 预计算 ==========
console.log('\n预计算策略排名...');
const startIdx = 100;
const endIdx = draws.length - 1;
const totalPeriods = endIdx - startIdx + 1;

// 排名矩阵
const rankBaseline = [];
const rankPosFreq = [];
const rankSumSpan = [];

for (let idx = startIdx; idx <= endIdx; idx++) {
  const historyIdx = idx - 1;
  const history = draws.slice(0, idx);
  
  const r0 = algoBaseline(history, historyIdx);
  const r1 = algoPosFreq(history, historyIdx);
  const r2 = algoSumSpanPrecise(history, historyIdx);
  
  const arr0 = new Int16Array(1000), arr1 = new Int16Array(1000), arr2 = new Int16Array(1000);
  r0.forEach((n,i) => arr0[parseInt(n)]=i);
  r1.forEach((n,i) => arr1[parseInt(n)]=i);
  r2.forEach((n,i) => arr2[parseInt(n)]=i);
  
  rankBaseline.push(arr0);
  rankPosFreq.push(arr1);
  rankSumSpan.push(arr2);
  
  if ((idx-startIdx)%100===0) process.stdout.write(`\r  预计算 ${idx-startIdx+1}/${totalPeriods}...`);
}
console.log('\r  预计算完成!                    ');

const actualNums = [];
for (let idx = startIdx; idx <= endIdx; idx++) {
  actualNums.push(parseInt(`${draws[idx].d1}${draws[idx].d2}${draws[idx].d3}`));
}

// ========== 评估: 条件过滤+投票排序 ==========
function evalFilterVote(filterConfig, voteStrats, voteThreshold, topN) {
  let hits = 0;
  let totalFiltered = 0;
  
  for (let pi = 0; pi < actualNums.length; pi++) {
    const idx = startIdx + pi;
    const filter = getFilter(draws.slice(0, idx), idx - 1);
    
    // 过滤
    const filtered = applyFilter(allNums, filter, filterConfig);
    totalFiltered += filtered.length;
    
    if (filtered.length === 0) continue;
    
    // 在过滤后的号码中, 按投票排序
    const scored = filtered.map(n => {
      let score = 0;
      const numIdx = parseInt(n);
      for (const strat of voteStrats) {
        const rank = strat[pi][numIdx];
        if (rank < voteThreshold) score += 1;
      }
      return { num: numIdx, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    // 取topN
    const selected = new Set(scored.slice(0, Math.min(topN, scored.length)).map(s => s.num));
    
    if (selected.has(actualNums[pi])) hits++;
  }
  
  return { rate: hits / actualNums.length, avgFiltered: totalFiltered / actualNums.length, hits };
}

// ========== 搜索 ==========
console.log('\n开始搜索...');
const startTime = Date.now();

const filterConfigs = [
  // sumCover, spanCover, includeBaozi, typeThreshold, parityTop, sizeTop
  { sumCover: 0.80, spanCover: 0.80, includeBaozi: false, typeThreshold: 0.05, parityTop: 5, sizeTop: 5, name: '宽' },
  { sumCover: 0.75, spanCover: 0.80, includeBaozi: false, typeThreshold: 0.05, parityTop: 4, sizeTop: 5, name: '中1' },
  { sumCover: 0.80, spanCover: 0.75, includeBaozi: false, typeThreshold: 0.05, parityTop: 5, sizeTop: 4, name: '中2' },
  { sumCover: 0.75, spanCover: 0.75, includeBaozi: false, typeThreshold: 0.05, parityTop: 4, sizeTop: 4, name: '中3' },
  { sumCover: 0.70, spanCover: 0.75, includeBaozi: false, typeThreshold: 0.05, parityTop: 4, sizeTop: 4, name: '窄1' },
  { sumCover: 0.75, spanCover: 0.70, includeBaozi: false, typeThreshold: 0.05, parityTop: 4, sizeTop: 4, name: '窄2' },
  { sumCover: 0.70, spanCover: 0.70, includeBaozi: false, typeThreshold: 0.05, parityTop: 4, sizeTop: 4, name: '窄3' },
  { sumCover: 0.70, spanCover: 0.80, includeBaozi: false, typeThreshold: 0.05, parityTop: 4, sizeTop: 4, name: '窄4' },
  { sumCover: 0.80, spanCover: 0.70, includeBaozi: false, typeThreshold: 0.05, parityTop: 4, sizeTop: 4, name: '窄5' },
  { sumCover: 0.65, spanCover: 0.70, includeBaozi: false, typeThreshold: 0.05, parityTop: 4, sizeTop: 4, name: '极窄1' },
  { sumCover: 0.70, spanCover: 0.65, includeBaozi: false, typeThreshold: 0.05, parityTop: 4, sizeTop: 4, name: '极窄2' },
  { sumCover: 0.65, spanCover: 0.65, includeBaozi: false, typeThreshold: 0.05, parityTop: 3, sizeTop: 3, name: '极窄3' },
  { sumCover: 0.60, spanCover: 0.70, includeBaozi: false, typeThreshold: 0.05, parityTop: 3, sizeTop: 3, name: '极窄4' },
  { sumCover: 0.70, spanCover: 0.60, includeBaozi: false, typeThreshold: 0.05, parityTop: 3, sizeTop: 3, name: '极窄5' },
];

const stratCombos = [
  { strats: [rankBaseline], name: 'base' },
  { strats: [rankPosFreq], name: 'posF' },
  { strats: [rankSumSpan], name: 'sumS' },
  { strats: [rankBaseline, rankPosFreq], name: 'base+posF' },
  { strats: [rankBaseline, rankSumSpan], name: 'base+sumS' },
  { strats: [rankPosFreq, rankSumSpan], name: 'posF+sumS' },
  { strats: [rankBaseline, rankPosFreq, rankSumSpan], name: 'base+posF+sumS' },
];

const voteThresholds = [200, 300, 400, 500];
const topNs = [100, 150, 200, 250, 300, 350, 400, 500];

let bestConfig = null;
let bestRate = 0;
const topConfigs = [];
let totalConfigs = 0;

for (const fc of filterConfigs) {
  for (const sc of stratCombos) {
    for (const vt of voteThresholds) {
      for (const tn of topNs) {
        totalConfigs++;
        const result = evalFilterVote(fc, sc.strats, vt, tn);
        
        if (result.rate > bestRate) {
          bestRate = result.rate;
          bestConfig = { filter: fc.name, strat: sc.name, vt, topN: tn, ...result };
        }
        
        if (result.rate >= 0.50) {
          topConfigs.push({ filter: fc.name, strat: sc.name, vt, topN: tn, ...result });
        }
      }
    }
  }
  const elapsed = (Date.now() - startTime) / 1000;
  process.stdout.write(`\r  过滤[${fc.name}] 进度: ${filterConfigs.indexOf(fc)+1}/${filterConfigs.length}, 最佳: ${(bestRate*100).toFixed(1)}%, ${bestConfig?bestConfig.avgFiltered.toFixed(0)+'注':'-'}, ${elapsed.toFixed(0)}s`);
}

const elapsed = (Date.now() - startTime) / 1000;
console.log(`\n\n搜索完成! 总配置: ${totalConfigs}, 耗时: ${elapsed.toFixed(1)}s`);

// ========== 输出结果 ==========
console.log('\n========================================');
console.log('排列三条件过滤+投票法优化结果');
console.log('========================================');
console.log(`\n最佳配置: 命中率 ${(bestRate*100).toFixed(1)}%, 平均${bestConfig.avgFiltered.toFixed(0)}注(过滤后池)`);
console.log(`  过滤: ${bestConfig.filter} | 投票: ${bestConfig.strat} | 阈值: ${bestConfig.vt} | TopN: ${bestConfig.topN}`);

// 按注数区间分组 (以topN为参考)
console.log('\n=== 各TopN最佳配置 ===');
for (const tn of topNs) {
  const forTn = topConfigs.filter(c => c.topN === tn);
  if (forTn.length > 0) {
    forTn.sort((a,b) => b.rate - a.rate);
    const best = forTn[0];
    console.log(`  TopN=${tn}: ${(best.rate*100).toFixed(1)}% | 过滤:${best.filter} | 投票:${best.strat} | 阈值:${best.vt}`);
  }
}

// TOP30
topConfigs.sort((a, b) => b.rate - a.rate);
const unique = [];
const seen = new Set();
for (const c of topConfigs) {
  const key = `${c.filter}|${c.strat}|${c.vt}|${c.topN}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(c);
  if (unique.length >= 30) break;
}

console.log('\n=== TOP30配置 ===');
unique.forEach((c, i) => {
  console.log(`  ${i+1}. ${(c.rate*100).toFixed(1)}% | TopN:${c.topN} | 过滤:${c.filter} | 投票:${c.strat} | 阈值:${c.vt}`);
});

// 低注数高命中
console.log('\n=== 低注数(TopN<=300)TOP15 ===');
const lowCount = topConfigs.filter(c => c.topN <= 300);
lowCount.sort((a,b) => b.rate - a.rate);
const seen2 = new Set();
let cnt = 0;
for (const c of lowCount) {
  const key = `${c.filter}|${c.strat}|${c.vt}|${c.topN}`;
  if (seen2.has(key)) continue;
  seen2.add(key);
  console.log(`  ${cnt+1}. ${(c.rate*100).toFixed(1)}% | TopN:${c.topN} | 过滤:${c.filter} | 投票:${c.strat} | 阈值:${c.vt}`);
  cnt++;
  if (cnt >= 15) break;
}
