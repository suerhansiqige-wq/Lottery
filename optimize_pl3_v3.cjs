// 排列三极简优化 - 用排名索引代替排序
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
const allNums = [];
for (let i=0;i<=999;i++) allNums.push(String(i).padStart(3,'0'));
const numIdx = {};
allNums.forEach((n,i) => numIdx[n] = i);
const posKeys = ['d1','d2','d3'];

const origCond = [
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

const startIdx = 100, endIdx = draws.length - 1;
const nPeriods = endIdx - startIdx;

// 预计算每个策略在每期的排名位置(rank[numIdx] = position 0-999)
console.log(`数据: ${draws.length}期, 预计算中...`);

function calcBaseline(idx, conditions) {
  const r100 = draws.slice(Math.max(0,idx-99),idx+1);
  const cs = new Int16Array(1000);
  allNums.forEach((num,i) => { conditions.forEach(c => { if(matchBase(num,c)) cs[i]++; }); });
  const sc = new Float32Array(1000);
  allNums.forEach((num,i) => {
    let rh=0; r100.forEach(dr => { if(`${dr.d1}${dr.d2}${dr.d3}`===num) rh++; });
    sc[i] = cs[i]*10 + rh*100;
  });
  return rankArray(sc);
}

function calcPosFreq(idx, conditions) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const pf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d=>{pf[0][d.d1]++;pf[1][d.d2]++;pf[2][d.d3]++;});
  const rf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r20.forEach(d=>{rf[0][d.d1]++;rf[1][d.d2]++;rf[2][d.d3]++;});
  const cs=new Int16Array(1000);
  allNums.forEach((num,i)=>{conditions.forEach(c=>{if(matchBase(num,c))cs[i]++;});});
  const sc=new Float32Array(1000);
  allNums.forEach((num,i)=>{
    const d=num.split('').map(Number);
    let ps=0; for(let p=0;p<3;p++) ps+=pf[p][d[p]]*2+rf[p][d[p]]*5;
    let rh=0; r100.forEach(dr=>{if(`${dr.d1}${dr.d2}${dr.d3}`===num)rh++;});
    sc[i]=ps*3+cs[i]*10+rh*100;
  });
  return rankArray(sc);
}

function calcMarkov(idx) {
  const r50=draws.slice(Math.max(0,idx-49),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const tr=[];
  for(let p=0;p<3;p++){
    tr[p]=[];
    for(let d=0;d<=9;d++){
      const nf=new Float32Array(10);
      for(let i=0;i<r20.length-1;i++) if(r20[i][posKeys[p]]===d) nf[r20[i+1][posKeys[p]]]++;
      for(let i=0;i<r50.length-1;i++) if(r50[i][posKeys[p]]===d) nf[r50[i+1][posKeys[p]]]+=0.5;
      tr[p][d]=nf;
    }
  }
  const cur=[draws[idx].d1,draws[idx].d2,draws[idx].d3];
  const sc=new Float32Array(1000);
  allNums.forEach((num,i)=>{
    const d=num.split('').map(Number);
    let ts=0; for(let p=0;p<3;p++) ts+=tr[p][cur[p]][d[p]];
    let rh=0; r50.forEach(dr=>{if(`${dr.d1}${dr.d2}${dr.d3}`===num)rh++;});
    sc[i]=ts*50+rh*100;
  });
  return rankArray(sc);
}

function calcKNN(idx) {
  const r30=draws.slice(Math.max(0,idx-29),idx+1);
  const cur5=[];
  for(let i=Math.max(0,idx-4);i<=idx;i++) cur5.push([draws[i].d1,draws[i].d2,draws[i].d3]);
  const sim=[];
  for(let i=5;i<idx;i++){
    const h5=[];
    for(let k=0;k<5;k++){const ii=i-4+k;if(ii>=0)h5.push([draws[ii].d1,draws[ii].d2,draws[ii].d3]);}
    if(h5.length<5)continue;
    let diff=0;
    for(let k=0;k<5;k++) for(let p=0;p<3;p++) diff+=Math.abs(cur5[k][p]-h5[k][p]);
    sim.push({idx:i,diff});
  }
  sim.sort((a,b)=>a.diff-b.diff);
  const top=sim.slice(0,10).map(s=>s.idx);
  const nf=new Float32Array(1000);
  top.forEach(i=>{if(i+1<draws.length) nf[numIdx[`${draws[i+1].d1}${draws[i+1].d2}${draws[i+1].d3}`]]++;});
  const sc=new Float32Array(1000);
  allNums.forEach((num,i)=>{
    let rh=0; r30.forEach(dr=>{if(`${dr.d1}${dr.d2}${dr.d3}`===num)rh++;});
    sc[i]=nf[i]*200+rh*100;
  });
  return rankArray(sc);
}

function calcMissing(idx) {
  const lastApp=new Int16Array(1000).fill(-1);
  for(let i=idx;i>=Math.max(0,idx-199);i--){
    const ni=numIdx[`${draws[i].d1}${draws[i].d2}${draws[i].d3}`];
    if(lastApp[ni]===-1) lastApp[ni]=idx-i;
  }
  const sc=new Float32Array(1000);
  for(let i=0;i<1000;i++){
    const m=lastApp[i]===-1?200:lastApp[i];
    if(m>=5&&m<=30) sc[i]=50;
    else if(m>=31&&m<=60) sc[i]=30;
    else if(m>=1&&m<=4) sc[i]=40;
    else if(m===0) sc[i]=20;
    else sc[i]=10;
  }
  return rankArray(sc);
}

function calcSumSpan(idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const sf=new Int16Array(28),spf=new Int16Array(10);
  r100.forEach(d=>{sf[d.d1+d.d2+d.d3]++;spf[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  const sc=new Float32Array(1000);
  allNums.forEach((num,i)=>{
    const d=num.split('').map(Number);
    sc[i]=sf[d[0]+d[1]+d[2]]*3+spf[Math.max(...d)-Math.min(...d)]*5;
  });
  return rankArray(sc);
}

// 排名数组: rank[numIdx] = 该号码的排名(0=最高)
function rankArray(sc) {
  const indexed = [];
  for (let i = 0; i < 1000; i++) indexed.push({ i, s: sc[i] });
  indexed.sort((a, b) => b.s - a.s);
  const rank = new Int16Array(1000);
  for (let i = 0; i < 1000; i++) rank[indexed[i].i] = i;
  return rank;
}

// 预计算6个策略
const stratNames = ['baseline','posFreq','markov','knn','missing','sumSpan'];
const precomp = {};

console.log('  baseline...');
precomp.baseline = new Array(nPeriods);
for (let pi=0;pi<nPeriods;pi++) precomp.baseline[pi]=calcBaseline(startIdx+pi, origCond);
console.log('  posFreq...');
precomp.posFreq = new Array(nPeriods);
for (let pi=0;pi<nPeriods;pi++) precomp.posFreq[pi]=calcPosFreq(startIdx+pi, origCond);
console.log('  markov...');
precomp.markov = new Array(nPeriods);
for (let pi=0;pi<nPeriods;pi++) precomp.markov[pi]=calcMarkov(startIdx+pi);
console.log('  knn...');
precomp.knn = new Array(nPeriods);
for (let pi=0;pi<nPeriods;pi++) precomp.knn[pi]=calcKNN(startIdx+pi);
console.log('  missing...');
precomp.missing = new Array(nPeriods);
for (let pi=0;pi<nPeriods;pi++) precomp.missing[pi]=calcMissing(startIdx+pi);
console.log('  sumSpan...');
precomp.sumSpan = new Array(nPeriods);
for (let pi=0;pi<nPeriods;pi++) precomp.sumSpan[pi]=calcSumSpan(startIdx+pi);

// 实际开奖号索引
const actualIdx = [];
for (let idx=startIdx;idx<endIdx;idx++) actualIdx.push(numIdx[`${draws[idx+1].d1}${draws[idx+1].d2}${draws[idx+1].d3}`]);

console.log('预计算完成! 搜索配置...\n');

// 快速评估: 用排名直接判断是否在top N内
function evalConfig(stratIndices, weights, threshold, targetCount) {
  let hits=0, total=0, maxC=0, curC=0;
  const rh={100:0,50:0,20:0,10:0}, rt={100:0,50:0,20:0,10:0};
  
  for (let pi=0;pi<nPeriods;pi++) {
    // 计算每个号码的加权"排名分" - 排名越小越好
    // 如果某策略中该号码排名 < threshold，则获得权重分
    const voteScore = new Float32Array(1000);
    for (let si=0;si<stratIndices.length;si++) {
      const ranks = precomp[stratNames[stratIndices[si]]][pi];
      const w = weights[si];
      const th = threshold;
      for (let j=0;j<1000;j++) {
        if (ranks[j] < th) voteScore[j] += w;
      }
    }
    
    // 找voteScore最高的targetCount个号码
    // 用简单方法: 找第targetCount大的值作为阈值
    const scores = Array.from(voteScore);
    const sorted = scores.slice().sort((a,b)=>b-a);
    const cutoff = sorted[targetCount-1];
    
    const actual = actualIdx[pi];
    const hit = voteScore[actual] > cutoff || (voteScore[actual] === cutoff && true);
    // 更精确: 计算有多少个号码分数>cutoff, 以及actual是否在其中
    let above = 0, atCutoff = 0;
    for (let j=0;j<1000;j++) {
      if (scores[j] > cutoff) above++;
      else if (scores[j] === cutoff) atCutoff++;
    }
    const isHit = voteScore[actual] > cutoff || (voteScore[actual] === cutoff && (actual <= above + (targetCount - above)));
    
    total++;
    if (isHit) { hits++; curC=0; }
    else { curC++; if(curC>maxC) maxC=curC; }
    const pfe = nPeriods - pi;
    for(const w of [100,50,20,10]) { if(pfe<=w){rt[w]++;if(isHit)rh[w]++;} }
  }
  
  return {
    total, hits, rate:(hits/total*100).toFixed(1), maxConsec:maxC,
    recent:{
      100:rt[100]>0?(rh[100]/rt[100]*100).toFixed(1):'-',
      50:rt[50]>0?(rh[50]/rt[50]*100).toFixed(1):'-',
      20:rt[20]>0?(rh[20]/rt[20]*100).toFixed(1):'-',
      10:rt[10]>0?(rh[10]/rt[10]*100).toFixed(1):'-',
    }
  };
}

// 搜索
const combos = [
  [0,1,2,3],[0,1,2,4],[0,1,2,5],[0,1,3,4],[0,1,3,5],[0,1,4,5],
  [1,2,3,4],[1,2,3,5],[0,2,3,4],[0,1,2,3,4],[0,1,2,3,5],[0,1,2,4,5],
  [0,1,3,4,5],[1,2,3,4,5],[0,2,3,4,5],[0,1,2,3,4,5],
];

const weightSets4 = [[1,1,1,1],[2,1,1,1],[1,2,1,1],[1,1,2,1],[1,1,1,2],[2,2,1,1],[1,2,2,1],[3,1,1,1],[1,3,1,1],[1,1,3,1],[1,1,1,3]];
const weightSets5 = [[1,1,1,1,1],[2,1,1,1,1],[1,2,1,1,1],[1,1,2,1,1],[1,1,1,2,1],[1,1,1,1,2],[2,2,1,1,1],[1,2,2,1,1]];
const weightSets6 = [[1,1,1,1,1,1],[2,1,1,1,1,1],[1,2,1,1,1,1],[1,1,2,1,1,1],[2,2,1,1,1,1],[1,2,2,1,1,1]];

let best=null, bestRate=0;
const results=[];
let count=0;

for(const combo of combos){
  const n=combo.length;
  const ws = n===4?weightSets4 : n===5?weightSets5 : weightSets6;
  for(const w of ws){
    for(const th of [200,300,400]){
      const r = evalConfig(combo,w,th,700);
      const rate=parseFloat(r.rate);
      results.push({combo:combo.map(i=>stratNames[i]).join('+'),w:w.join(','),th,...r});
      count++;
      if(rate>bestRate){bestRate=rate;best={combo,w,th,result:r};}
    }
  }
}

console.log(`测试${count}种配置\n`);
console.log('=== 最佳配置 ===');
console.log(`策略: ${best.combo.map(i=>stratNames[i]).join(' + ')}`);
console.log(`权重: [${best.w.join(', ')}]  阈值: ${best.th}`);
console.log(`总命中率: ${best.result.rate}% (${best.result.hits}/${best.result.total})`);
console.log(`最大连续未中: ${best.result.maxConsec}期`);
console.log(`近100/50/20/10期: ${best.result.recent[100]}% / ${best.result.recent[50]}% / ${best.result.recent[20]}% / ${best.result.recent[10]}%`);

console.log('\n=== TOP10 ===');
const sorted=results.sort((a,b)=>parseFloat(b.rate)-parseFloat(a.rate));
for(let i=0;i<10;i++){
  const c=sorted[i];
  console.log(`#${i+1} ${c.rate}% 连未中${c.maxConsec} 近100:${c.recent[100]}% 近20:${c.recent[20]}% 近10:${c.recent[10]}% | ${c.combo} w=[${c.w}] th=${c.th}`);
}

// 综合评分
console.log('\n=== 综合评分TOP5 (总命中×0.4+近20期×0.3+近10期×0.3-连未中×2) ===');
const scored=results.map(c=>{
  const r20=c.recent[20]!=='-'?parseFloat(c.recent[20]):0;
  const r10=c.recent[10]!=='-'?parseFloat(c.recent[10]):0;
  return {...c,score:parseFloat(c.rate)*0.4+r20*0.3+r10*0.3-c.maxConsec*2};
}).sort((a,b)=>b.score-a.score);
for(let i=0;i<5;i++){
  const c=scored[i];
  console.log(`#${i+1} 综合${c.score.toFixed(1)}分 | ${c.rate}% 连未中${c.maxConsec} 近20:${c.recent[20]}% 近10:${c.recent[10]}% | ${c.combo} w=[${c.w}] th=${c.th}`);
}

// 不同注数
console.log('\n=== 最佳配置不同注数 ===');
for(const tc of [500,600,700,800,900]){
  const r=evalConfig(best.combo,best.w,best.th,tc);
  console.log(`${tc}注: ${r.rate}% 连未中${r.maxConsec} 近100:${r.recent[100]}% 近20:${r.recent[20]}% 近10:${r.recent[10]}%`);
}

console.log('\n\n=== 最终推荐 ===');
console.log(`策略: [${best.combo.map(i=>`'${stratNames[i]}'`).join(', ')}]`);
console.log(`权重: [${best.w.join(', ')}]`);
console.log(`阈值: ${best.th}, 注数: 700`);
console.log(`预期命中率: ${best.result.rate}%`);
