// 预计算排列三每期祝君中奖号码（25001-26193期）
// 使用2024年+2025年合并数据，为每期生成700注智能号码
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
console.log(`合并数据: ${allDraws.length}期 (${allDraws[0].issue} - ${allDraws[allDraws.length-1].issue})`);

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

// 预计算条件覆盖分
const condScoreCache = {};
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
allNums.forEach(num => {
  let s = 0;
  conditions.forEach(c => { if (matchBase(num, c)) s++; });
  condScoreCache[num] = s;
});

// 4策略
function algoBaseline(draws, idx) {
  const r100 = draws.slice(Math.max(0,idx-99),idx+1);
  const sc={};
  allNums.forEach(n=>{let rh=0;r100.forEach(d=>{if(`${d.d1}${d.d2}${d.d3}`===n)rh++;});sc[n]=condScoreCache[n]*10+rh*100;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function algoPosFreq(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const pf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d=>{pf[0][d.d1]++;pf[1][d.d2]++;pf[2][d.d3]++;});
  const rf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r20.forEach(d=>{rf[0][d.d1]++;rf[1][d.d2]++;rf[2][d.d3]++;});
  const sc={};
  allNums.forEach(n=>{
    const d=n.split('').map(Number);
    let ps=0; for(let p=0;p<3;p++) ps+=pf[p][d[p]]*2+rf[p][d[p]]*5;
    let rh=0; r100.forEach(dr=>{if(`${dr.d1}${dr.d2}${dr.d3}`===n)rh++;});
    sc[n]=ps*3+condScoreCache[n]*10+rh*100;
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
  return sorted.slice(0,targetCount).sort();
}

// ==========================================
// 预计算所有25001-26193期的祝君中奖号码
// ==========================================
const idx25001 = allDraws.findIndex(d => d.issue === '25001');
console.log(`\n开始预计算 ${allDraws[allDraws.length-1].issue} 期的祝君中奖号码...`);
console.log(`从 ${allDraws[idx25001].issue} 期开始 (索引${idx25001})\n`);

const precomputed = {};
let totalPeriods = allDraws.length - idx25001;

for (let idx = idx25001; idx < allDraws.length; idx++) {
  const issue = allDraws[idx].issue;
  
  // 用截至idx-1的数据（不包含当期）预测当期
  // 正确逻辑：generateSmart(draws[0..idx-1], idx-1)
  const historyDraws = allDraws.slice(0, idx);
  const historyIdx = idx - 1;
  
  const smartNums = generateSmart(historyDraws, historyIdx, 700);
  precomputed[issue] = smartNums;
  
  if ((idx - idx25001) % 50 === 0) {
    process.stdout.write(`\r  已计算 ${idx - idx25001 + 1}/${totalPeriods} 期...`);
  }
}
console.log(`\r  预计算完成! 共 ${totalPeriods} 期                    `);

// 验证命中率
let hits = 0, total = 0;
for (let idx = idx25001; idx < allDraws.length; idx++) {
  const issue = allDraws[idx].issue;
  const currentNum = `${allDraws[idx].d1}${allDraws[idx].d2}${allDraws[idx].d3}`;
  if (precomputed[issue].includes(currentNum)) hits++;
  total++;
}
console.log(`\n命中率验证: ${hits}/${total} = ${(hits/total*100).toFixed(1)}%`);

// 保存到JSON文件
const outputPath = path.join(__dirname, 'pl3-app', 'src', 'data', 'pl3SmartNumbersPrecomputed.json');
fs.writeFileSync(outputPath, JSON.stringify(precomputed));
const fileSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`\n已保存到: ${outputPath}`);
console.log(`文件大小: ${fileSize} MB`);
console.log(`期数: ${Object.keys(precomputed).length}`);
console.log(`首期: ${Object.keys(precomputed)[0]} (${precomputed[Object.keys(precomputed)[0]].length}注)`);
console.log(`末期: ${Object.keys(precomputed)[Object.keys(precomputed).length-1]}`);
