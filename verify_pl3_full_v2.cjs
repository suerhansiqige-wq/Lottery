// 排列三全量验证V2 - 从2025001期开始（包含2024年历史数据）
const fs = require('fs');
const path = require('path');

// 加载2024年数据
const data2024File = path.join(__dirname, 'pl3-app', 'src', 'data', 'lotteryData2024.js');
let data2024Str = fs.readFileSync(data2024File, 'utf-8');
const m2024 = data2024Str.match(/export const lotteryData2024 = \[([\s\S]*?)\];/);
const lines2024 = m2024[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws2024 = lines2024.map(line => {
  const mm = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (mm) return { issue: mm[1], d1: Number(mm[2]), d2: Number(mm[3]), d3: Number(mm[4]) };
  return null;
}).filter(Boolean);

// 加载2025年数据
const lotteryDataFile = path.join(__dirname, 'pl3-app', 'src', 'data', 'lotteryData.js');
let lotteryDataStr = fs.readFileSync(lotteryDataFile, 'utf-8');
const m = lotteryDataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = m[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws2025 = lines.map(line => {
  const mm = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (mm) return { issue: mm[1], d1: Number(mm[2]), d2: Number(mm[3]), d3: Number(mm[4]) };
  return null;
}).filter(Boolean);

// 合并数据
const allDraws = [...draws2024, ...draws2025];
console.log(`2024年数据: ${draws2024.length}期 (${draws2024[0].issue} - ${draws2024[draws2024.length-1].issue})`);
console.log(`2025年数据: ${draws2025.length}期 (${draws2025[0].issue} - ${draws2025[draws2025.length-1].issue})`);
console.log(`合并数据: ${allDraws.length}期 (${allDraws[0].issue} - ${allDraws[allDraws.length-1].issue})`);

// 找到25001在合并数组中的位置
const idx25001 = allDraws.findIndex(d => d.issue === '25001');
console.log(`\n25001期在合并数组中的索引: ${idx25001}`);
console.log(`25001期之前有 ${idx25001} 期历史数据`);

// 工具函数
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

// 18组条件
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

// 4策略
function algoBaseline(draws, idx) {
  const r100 = draws.slice(Math.max(0,idx-99),idx+1);
  const cs={}; allNums.forEach(n=>{let s=0;conditions.forEach(c=>{if(matchBase(n,c))s++;});cs[n]=s;});
  const sc={};
  allNums.forEach(n=>{let rh=0;r100.forEach(d=>{if(`${d.d1}${d.d2}${d.d3}`===n)rh++;});sc[n]=cs[n]*10+rh*100;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function algoPosFreq(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const pf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d=>{pf[0][d.d1]++;pf[1][d.d2]++;pf[2][d.d3]++;});
  const rf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r20.forEach(d=>{rf[0][d.d1]++;rf[1][d.d2]++;rf[2][d.d3]++;});
  const cs={}; allNums.forEach(n=>{let s=0;conditions.forEach(c=>{if(matchBase(n,c))s++;});cs[n]=s;});
  const sc={};
  allNums.forEach(n=>{
    const d=n.split('').map(Number);
    let ps=0; for(let p=0;p<3;p++) ps+=pf[p][d[p]]*2+rf[p][d[p]]*5;
    let rh=0; r100.forEach(dr=>{if(`${dr.d1}${dr.d2}${dr.d3}`===n)rh++;});
    sc[n]=ps*3+cs[n]*10+rh*100;
  });
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function algoMissing(draws, idx) {
  const lastApp={}; allNums.forEach(n=>lastApp[n]=-1);
  for(let i=idx;i>=Math.max(0,idx-199);i--){
    const n=`${draws[i].d1}${draws[i].d2}${draws[i].d3}`;
    if(lastApp[n]===-1) lastApp[n]=idx-i;
  }
  const sc={};
  allNums.forEach(n=>{
    const m=lastApp[n]===-1?200:lastApp[n];
    let s=0;
    if(m>=5&&m<=30)s=50; else if(m>=31&&m<=60)s=30; else if(m>=1&&m<=4)s=40; else if(m===0)s=20; else s=10;
    sc[n]=s;
  });
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function algoSumSpan(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const sf=new Array(28).fill(0),spf=new Array(10).fill(0);
  r100.forEach(d=>{sf[d.d1+d.d2+d.d3]++;spf[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  const sc={};
  allNums.forEach(n=>{
    const d=n.split('').map(Number);
    sc[n]=sf[d[0]+d[1]+d[2]]*3+spf[Math.max(...d)-Math.min(...d)]*5;
  });
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

// 投票法生成700注
function generateSmart(draws, idx, targetCount=700) {
  const s0=algoBaseline(draws,idx);
  const s1=algoPosFreq(draws,idx);
  const s2=algoMissing(draws,idx);
  const s3=algoSumSpan(draws,idx);
  const strategies=[s0,s1,s2,s3];
  const weights=[2,2,1,1];
  const threshold=300;
  const voteCount={}; allNums.forEach(n=>voteCount[n]=0);
  for(let i=0;i<4;i++) strategies[i].slice(0,threshold).forEach(n=>{voteCount[n]+=weights[i];});
  const baseRank={}; s0.forEach((n,i)=>baseRank[n]=i);
  const sorted=allNums.slice().sort((a,b)=>{
    if(voteCount[b]!==voteCount[a]) return voteCount[b]-voteCount[a];
    return baseRank[a]-baseRank[b];
  });
  return sorted.slice(0,targetCount);
}

// ==========================================
// 验证逻辑：从25001期开始
// 用2024年数据（24001-24352）作为历史窗口
// 预测25001期：generateSmart(合并数据[0..idx-1], idx-1)
// ==========================================
console.log('\n开始验证（包含2024年历史数据，从25001期开始）...');
console.log('逻辑：用2024年+2025年历史数据生成700注，检查是否包含当期开奖号\n');

// 验证从idx25001开始（25001期）
const startVerifyIdx = idx25001;
const endIdx = allDraws.length - 1;

console.log(`验证起始: ${allDraws[startVerifyIdx].issue} (索引${startVerifyIdx})`);
console.log(`验证结束: ${allDraws[endIdx].issue} (索引${endIdx})`);
console.log(`验证期数: ${endIdx - startVerifyIdx + 1} 期`);
console.log(`历史窗口: 前${startVerifyIdx}期 (24001-${allDraws[startVerifyIdx-1].issue})\n`);

let hits=0, total=0, maxConsec=0, curConsec=0;
const recentHits={100:0,50:0,20:0,10:0};
const recentTotals={100:0,50:0,20:0,10:0};
const periodResults = [];

for(let idx = startVerifyIdx; idx <= endIdx; idx++){
  // 用截至idx-1的数据生成推荐
  const historyDraws = allDraws.slice(0, idx);
  const historyIdx = idx - 1;
  const topNums = generateSmart(historyDraws, historyIdx, 700);
  
  // 当期实际开奖号
  const currentNum = `${allDraws[idx].d1}${allDraws[idx].d2}${allDraws[idx].d3}`;
  const hit = topNums.includes(currentNum);
  
  total++;
  if(hit){hits++;curConsec=0;} else {curConsec++;if(curConsec>maxConsec)maxConsec=curConsec;}
  
  const pfe = endIdx - idx;
  for(const w of [100,50,20,10]){if(pfe<=w){recentTotals[w]++;if(hit)recentHits[w]++;}}
  
  periodResults.push({issue: allDraws[idx].issue, hit, num: currentNum});
  if((idx - startVerifyIdx) % 50 === 0) process.stdout.write(`\r  已验证 ${idx - startVerifyIdx + 1}/${endIdx - startVerifyIdx + 1} 期...`);
}
console.log(`\r  验证完成!                    `);

console.log('\n========================================');
console.log(`排列三验证结果V2 (${allDraws[startVerifyIdx].issue} - ${allDraws[endIdx].issue})`);
console.log('========================================');
console.log(`验证期数: ${total} 期`);
console.log(`命中: ${hits} 期 | 未中: ${total-hits} 期`);
console.log(`总命中率: ${(hits/total*100).toFixed(1)}%`);
console.log(`最大连续未中: ${maxConsec} 期`);
console.log('');
for(const w of [100,50,20,10]){
  if(recentTotals[w]>0){
    console.log(`近${w}期: 命中${recentHits[w]}/${recentTotals[w]} = ${(recentHits[w]/recentTotals[w]*100).toFixed(1)}%`);
  }
}

// 分段统计
console.log('\n=== 分段命中率 ===');
const segSize = 100;
for(let s = 0; s < periodResults.length; s += segSize){
  const seg = periodResults.slice(s, s + segSize);
  const sHits = seg.filter(r => r.hit).length;
  console.log(`  ${seg[0].issue}-${seg[seg.length-1].issue}: ${sHits}/${seg.length} = ${(sHits/seg.length*100).toFixed(1)}%`);
}

// 25001期前10期详细
console.log('\n=== 25001期起前20期详细 ===');
for(let i = 0; i < Math.min(20, periodResults.length); i++){
  const r = periodResults[i];
  console.log(`  ${r.issue}: ${r.num} ${r.hit ? '✓命中' : '✗未中'}`);
}

// 连续未中记录
console.log('\n=== 连续未中记录(>=3期) ===');
curConsec=0; let consecStart=null;
const consecRecords=[];
for(let i=0;i<periodResults.length;i++){
  if(!periodResults[i].hit){
    if(curConsec===0) consecStart=periodResults[i].issue;
    curConsec++;
  } else {
    if(curConsec>=3) consecRecords.push({start:consecStart, end:periodResults[i-1].issue, count:curConsec});
    curConsec=0;
  }
}
if(curConsec>=3) consecRecords.push({start:consecStart, end:periodResults[periodResults.length-1].issue, count:curConsec});
consecRecords.sort((a,b)=>b.count-a.count);
for(const r of consecRecords.slice(0,10)){
  console.log(`  ${r.start}-${r.end}: 连续${r.count}期未中`);
}
