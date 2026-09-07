// 排列三共识度分析 - 寻找低注数高命中方案
// 思路: 多策略投票 → 按共识度排序 → 不同共识度阈值对应不同注数
// 高共识度 = 多策略一致认为可能 → 少量号码但高信心
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

// ========== 8个策略 ==========
function s0_baseline(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const sc={}; allNums.forEach(n=>{let rh=0;r100.forEach(d=>{if(`${d.d1}${d.d2}${d.d3}`===n)rh++;});sc[n]=condScore[n]*10+rh*150;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s1_posFreq(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const pf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d=>{pf[0][d.d1]++;pf[1][d.d2]++;pf[2][d.d3]++;});
  const rf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r20.forEach(d=>{rf[0][d.d1]++;rf[1][d.d2]++;rf[2][d.d3]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);let ps=0;for(let p=0;p<3;p++)ps+=pf[p][d[p]]*2+rf[p][d[p]]*5;let rh=0;r100.forEach(dr=>{if(`${dr.d1}${dr.d2}${dr.d3}`===n)rh++;});sc[n]=ps*3+condScore[n]*10+rh*100;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s2_missing(draws, idx) {
  const lastApp={}; allNums.forEach(n=>lastApp[n]=-1);
  for(let i=idx;i>=Math.max(0,idx-199);i--){const n=`${draws[i].d1}${draws[i].d2}${draws[i].d3}`;if(lastApp[n]===-1)lastApp[n]=idx-i;}
  const sc={}; allNums.forEach(n=>{const m=lastApp[n]===-1?200:lastApp[n];let s=0;if(m>=5&&m<=30)s=50;else if(m>=31&&m<=60)s=30;else if(m>=1&&m<=4)s=40;else if(m===0)s=20;else s=10;sc[n]=s;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s3_sumSpan(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const sf=new Array(28).fill(0),spf=new Array(10).fill(0);
  r100.forEach(d=>{sf[d.d1+d.d2+d.d3]++;spf[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);sc[n]=sf[d[0]+d[1]+d[2]]*3+spf[Math.max(...d)-Math.min(...d)]*5;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s4_sumSpanP(draws, idx) {
  const r50=draws.slice(Math.max(0,idx-49),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const sf50=new Array(28).fill(0),sf20=new Array(28).fill(0),spf50=new Array(10).fill(0),spf20=new Array(10).fill(0);
  r50.forEach(d=>{sf50[d.d1+d.d2+d.d3]++;spf50[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  r20.forEach(d=>{sf20[d.d1+d.d2+d.d3]++;spf20[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);const sum=d[0]+d[1]+d[2],span=Math.max(...d)-Math.min(...d);sc[n]=sf20[sum]*8+sf50[sum]*3+spf20[span]*12+spf50[span]*5;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s5_momentum(draws, idx) {
  const r10=draws.slice(Math.max(0,idx-9),idx+1);
  const freq={}; allNums.forEach(n=>freq[n]=0);
  r10.forEach(d=>{freq[`${d.d1}${d.d2}${d.d3}`]++;});
  const pf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r10.forEach(d=>{pf[0][d.d1]++;pf[1][d.d2]++;pf[2][d.d3]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);let ps=0;for(let p=0;p<3;p++)ps+=pf[p][d[p]];sc[n]=freq[n]*200+ps*8+condScore[n]*5;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s6_pairCorr(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const p01=new Array(100).fill(0),p02=new Array(100).fill(0),p12=new Array(100).fill(0);
  r100.forEach(d=>{p01[d.d1*10+d.d2]++;p02[d.d1*10+d.d3]++;p12[d.d2*10+d.d3]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);sc[n]=p01[d[0]*10+d[1]]*3+p02[d[0]*10+d[2]]*3+p12[d[1]*10+d[2]]*3;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s7_warmNum(draws, idx) {
  const lastApp={}; allNums.forEach(n=>lastApp[n]=999);
  const appCount={}; allNums.forEach(n=>appCount[n]=0);
  for(let i=idx;i>=Math.max(0,idx-299);i--){const n=`${draws[i].d1}${draws[i].d2}${draws[i].d3}`;appCount[n]++;if(lastApp[n]===999)lastApp[n]=idx-i;}
  const sc={}; allNums.forEach(n=>{const m=lastApp[n]===999?300:lastApp[n];const freq=appCount[n];let s=0;if(m>=3&&m<=20){s=60;if(freq>=2&&freq<=5)s+=20;}else if(m>=21&&m<=50)s=35;else if(m>=1&&m<=2)s=45;else if(m===0)s=25;else s=10;sc[n]=s+freq*3;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

const allStrategies = [s0_baseline, s1_posFreq, s2_missing, s3_sumSpan, s4_sumSpanP, s5_momentum, s6_pairCorr, s7_warmNum];
const stratNames = ['baseline','posFreq','missing','sumSpan','sumSpanP','momentum','pairCorr','warmNum'];

// ========== 预计算排名 ==========
console.log('\n预计算8个策略排名...');
const startIdx = 100;
const endIdx = draws.length - 1;
const totalPeriods = endIdx - startIdx + 1;

const rankData = [];
for (let s = 0; s < 8; s++) rankData.push([]);

for (let idx = startIdx; idx <= endIdx; idx++) {
  const historyIdx = idx - 1;
  const history = draws.slice(0, idx);
  for (let s = 0; s < 8; s++) {
    const ranked = allStrategies[s](history, historyIdx);
    const rankArr = new Int16Array(1000);
    ranked.forEach((num, rank) => { rankArr[parseInt(num)] = rank; });
    rankData[s].push(rankArr);
  }
  if ((idx - startIdx) % 100 === 0) process.stdout.write(`\r  预计算 ${idx-startIdx+1}/${totalPeriods}...`);
}
console.log('\r  预计算完成!                    ');

const actualNums = [];
for (let idx = startIdx; idx <= endIdx; idx++) {
  actualNums.push(parseInt(`${draws[idx].d1}${draws[idx].d2}${draws[idx].d3}`));
}

// ========== 共识度分析 ==========
// 对每个period, 计算每个号码的"共识分" = 多少个策略把它排在前threshold名
// 然后按共识分排序, 取不同topN看命中率

console.log('\n开始共识度分析...');
const startTime = Date.now();

// 测试不同的策略组合和阈值
const stratCombos = [
  [0,1], [0,1,3], [0,1,4], [0,1,7], [0,1,3,4], [0,1,4,7], [0,1,3,7],
  [0,1,3,4,7], [0,1,4,5], [0,1,4,6], [0,1,4,5,6],
  [0,1,2,3], [0,1,2,4], [0,1,3,4,5], [0,1,3,4,5,7],
];

const thresholds = [100, 150, 200, 250, 300];
const topNs = [50, 100, 150, 200, 250, 300, 350, 400, 500];

let bestConfig = null;
let bestRate = 0;
const topConfigs = [];
let totalConfigs = 0;

for (const combo of stratCombos) {
  for (const threshold of thresholds) {
    for (const topN of topNs) {
      totalConfigs++;
      let hits = 0;
      
      for (let pi = 0; pi < actualNums.length; pi++) {
        // 计算共识分
        const consensus = new Int16Array(1000);
        for (const si of combo) {
          const ranks = rankData[si][pi];
          for (let n = 0; n < 1000; n++) {
            if (ranks[n] < threshold) consensus[n]++;
          }
        }
        
        // 按共识分排序, 取topN (同分按baseline排名)
        const baseRanks = rankData[0][pi];
        const scored = [];
        for (let n = 0; n < 1000; n++) {
          if (consensus[n] > 0) scored.push({ num: n, cons: consensus[n], base: baseRanks[n] });
        }
        scored.sort((a, b) => {
          if (b.cons !== a.cons) return b.cons - a.cons;
          return a.base - b.base;
        });
        
        const selected = new Set(scored.slice(0, Math.min(topN, scored.length)).map(s => s.num));
        if (selected.has(actualNums[pi])) hits++;
      }
      
      const rate = hits / actualNums.length;
      if (rate > bestRate) {
        bestRate = rate;
        bestConfig = { 
          combo: combo.map(i => stratNames[i]), 
          comboIdx: combo.join(','),
          threshold, topN, rate, hits 
        };
      }
      
      if (rate >= 0.40) {
        topConfigs.push({ 
          combo: combo.map(i => stratNames[i]), 
          comboIdx: combo.join(','),
          threshold, topN, rate, hits 
        });
      }
    }
  }
  
  const elapsed = (Date.now() - startTime) / 1000;
  process.stdout.write(`\r  组合${stratCombos.indexOf(combo)+1}/${stratCombos.length}, 最佳: ${(bestRate*100).toFixed(1)}% / ${bestConfig?bestConfig.topN:'-'}注, ${elapsed.toFixed(0)}s`);
}

const elapsed = (Date.now() - startTime) / 1000;
console.log(`\n\n搜索完成! 总配置: ${totalConfigs}, 耗时: ${elapsed.toFixed(1)}s`);

// ========== 输出结果 ==========
console.log('\n========================================');
console.log('排列三共识度分析结果');
console.log('========================================');
console.log(`\n最佳配置: 命中率 ${(bestRate*100).toFixed(1)}%, ${bestConfig.topN}注`);
console.log(`  策略: ${bestConfig.combo.join(' + ')}`);
console.log(`  阈值: ${bestConfig.threshold}`);

// 按注数分组最佳
console.log('\n=== 各注数最佳命中率 ===');
for (const tn of topNs) {
  const forTn = topConfigs.filter(c => c.topN === tn);
  if (forTn.length > 0) {
    forTn.sort((a,b) => b.rate - a.rate);
    const best = forTn[0];
    console.log(`  ${tn}注: ${(best.rate*100).toFixed(1)}% | ${best.combo.join('+')} | 阈值:${best.threshold}`);
  }
}

// 对比随机基线
console.log('\n=== 对比随机基线 ===');
for (const tn of [50, 100, 150, 200, 250, 300, 400, 500]) {
  const forTn = topConfigs.filter(c => c.topN === tn);
  if (forTn.length > 0) {
    forTn.sort((a,b) => b.rate - a.rate);
    const best = forTn[0];
    const randomRate = tn / 1000;
    const improvement = ((best.rate - randomRate) / randomRate * 100).toFixed(1);
    console.log(`  ${tn}注: 算法${(best.rate*100).toFixed(1)}% vs 随机${(randomRate*100).toFixed(1)}% (超额+${improvement}%)`);
  }
}

// TOP30
topConfigs.sort((a, b) => b.rate - a.rate);
const unique = [];
const seen = new Set();
for (const c of topConfigs) {
  const key = `${c.comboIdx}|${c.threshold}|${c.topN}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(c);
  if (unique.length >= 30) break;
}

console.log('\n=== TOP30配置 ===');
unique.forEach((c, i) => {
  const randomRate = c.topN / 1000;
  const excess = ((c.rate - randomRate) / randomRate * 100).toFixed(1);
  console.log(`  ${i+1}. ${(c.rate*100).toFixed(1)}% / ${c.topN}注 | ${c.combo.join('+')} | 阈值:${c.threshold} | 超额+${excess}%`);
});

// 盈亏分析
console.log('\n=== 盈亏分析 (每注2元, 中奖19.4元) ===');
for (const tn of [100, 150, 200, 250, 300, 400, 500]) {
  const forTn = topConfigs.filter(c => c.topN === tn);
  if (forTn.length > 0) {
    forTn.sort((a,b) => b.rate - a.rate);
    const best = forTn[0];
    const cost = tn * 2;
    const revenue = best.rate * 19.4;
    const profit = revenue - cost;
    const roi = (profit / cost * 100).toFixed(1);
    console.log(`  ${tn}注: 命中${(best.rate*100).toFixed(1)}% | 成本${cost}元 | 期望收入${revenue.toFixed(1)}元 | 利润${profit.toFixed(1)}元 | ROI:${roi}%`);
  }
}
