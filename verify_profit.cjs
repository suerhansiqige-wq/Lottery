const d = require('./pl3-app/src/data/pl3SmartNumbersPrecomputed.json');
const fs = require('fs');
const m = fs.readFileSync('./pl3-app/src/data/lotteryData.js','utf-8').match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = m[1].split('\n').filter(l=>l.trim().startsWith('{'));
const draws = lines.map(l=>{
  const mm=l.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  return mm?{issue:mm[1],d1:+mm[2],d2:+mm[3],d3:+mm[4]}:null;
}).filter(Boolean);

const startIdx = draws.findIndex(d=>d.issue>='25001');
const totalPeriods = draws.length - startIdx;
let hits=0,misses=0;
draws.slice(startIdx).forEach(dr=>{
  const nums=d[dr.issue];
  if(!nums)return;
  const num=''+dr.d1+dr.d2+dr.d3;
  if(nums.includes(num))hits++; else misses++;
});
const totalCost = totalPeriods*700*2;
const totalRevenue = hits*1800;
const profit = totalRevenue - totalCost;
console.log('总期数:', totalPeriods);
console.log('命中:', hits, '未中:', misses, '命中率:', (hits/(hits+misses)*100).toFixed(1)+'%');
console.log('投入:', totalCost.toLocaleString(), '元 ('+totalPeriods+'期×700注×2元)');
console.log('收益:', totalRevenue.toLocaleString(), '元 ('+hits+'期×1800元)');
console.log('盈亏:', profit.toLocaleString(), '元');
