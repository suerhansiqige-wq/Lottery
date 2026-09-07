// 分析当前算法miss的规律，找出改进方向
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'lottery-app', 'src', 'data', 'lotteryData.js');
let dataStr = fs.readFileSync(dataFile, 'utf-8');
const m = dataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = m[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws = lines.map(line => {
  const mm = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (mm) return { issue: mm[1], d1: Number(mm[2]), d2: Number(mm[3]), d3: Number(mm[4]) };
  return null;
}).filter(Boolean);

// 分析miss期的号码特征
let missZulu = 0, missZusan = 0, missBaozi = 0;
let missSumDist = new Array(28).fill(0);
let missSpanDist = new Array(10).fill(0);
let totalMiss = 0;

for (let idx = 100; idx < draws.length; idx++) {
  const d = draws[idx];
  const num = `${d.d1}${d.d2}${d.d3}`;
  const digits = [d.d1, d.d2, d.d3];
  const sum = d.d1 + d.d2 + d.d3;
  const span = Math.max(...digits) - Math.min(...digits);
  const isZusan = (d.d1===d.d2 || d.d1===d.d3 || d.d2===d.d3);
  const isBaozi = (d.d1===d.d2 && d.d2===d.d3);
  
  // 这里简化：假设miss是随机的，实际应该用算法判断
  // 我们分析所有开奖号的分布特征
  missSumDist[sum]++;
  missSpanDist[span]++;
  if (isBaozi) missBaozi++;
  else if (isZusan) missZusan++;
  else missZulu++;
}

console.log('=== 开奖号码分布特征（全部544期）===');
console.log(`组六: ${missZulu}, 组三: ${missZusan}, 豹子: ${missBaozi}`);
console.log(`\n和值分布:`);
for (let s = 0; s <= 27; s++) {
  if (missSumDist[s] > 0) console.log(`  和值${s}: ${missSumDist[s]}期`);
}
console.log(`\n跨度分布:`);
for (let s = 0; s <= 9; s++) {
  if (missSpanDist[s] > 0) console.log(`  跨度${s}: ${missSpanDist[s]}期`);
}

// 分析百十个位频率
const posFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
draws.forEach(d => {
  posFreq[0][d.d1]++;
  posFreq[1][d.d2]++;
  posFreq[2][d.d3]++;
});
console.log('\n百位频率:', posFreq[0].map((v,i)=>`${i}:${v}`).join(' '));
console.log('十位频率:', posFreq[1].map((v,i)=>`${i}:${v}`).join(' '));
console.log('个位频率:', posFreq[2].map((v,i)=>`${i}:${v}`).join(' '));

// 分析和值跨度联合分布
console.log('\n=== 高概率和值区间 ===');
const sumCounts = {};
draws.forEach(d => {
  const s = d.d1+d.d2+d.d3;
  sumCounts[s] = (sumCounts[s]||0)+1;
});
const sortedSums = Object.entries(sumCounts).sort((a,b)=>b[1]-a[1]);
console.log('前10个最高频和值:', sortedSums.slice(0,10).map(([s,c])=>`${s}(${c}期)`).join(', '));

// 计算覆盖85%需要的和值范围
let cumCount = 0;
const coveredSums = [];
for (const [s, c] of sortedSums) {
  cumCount += c;
  coveredSums.push(Number(s));
  if (cumCount / draws.length >= 0.90) break;
}
console.log(`覆盖90%开奖的和值: ${coveredSums.sort((a,b)=>a-b).join(',')}`);
console.log(`这些和值对应的号码数: 需要计算...`);

// 计算每个和值对应多少注
function countNumsBySum(sum) {
  let count = 0;
  for (let i = 0; i <= 9; i++)
    for (let j = 0; j <= 9; j++)
      for (let k = 0; k <= 9; k++)
        if (i+j+k === sum) count++;
  return count;
}
let totalNums = 0;
for (const s of coveredSums) totalNums += countNumsBySum(s);
console.log(`覆盖90%开奖的和值共对应 ${totalNums} 注号码`);
