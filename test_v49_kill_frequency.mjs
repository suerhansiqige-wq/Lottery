// 统计V49不杀号的期数
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

function positionKillMultiValidation(prevData, pos) {
  const recent = prevData.slice(-10);
  const lastDigit = prevData[prevData.length-1][pos];
  
  const digits = recent.map(d => d[pos]);
  const mean = digits.reduce((s, v) => s + v, 0) / digits.length;
  const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / digits.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev >= 2) return [];
  
  const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  let sumKill;
  if (avgSum >= 14) sumKill = 9;
  else if (avgSum <= 11) sumKill = 0;
  else sumKill = lastDigit;
  
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  let oeKill;
  if (oddCount >= 6) oeKill = 9;
  else if (oddCount <= 2) oeKill = 0;
  else oeKill = lastDigit;
  
  if (sumKill === oeKill && oeKill === lastDigit) {
    return [lastDigit];
  }
  
  return [];
}

let totalPeriods = 0;
let killPeriods = 0;
let noKillPeriods = 0;

for (let i = 20; i < data.length; i++) {
  const prevData = data.slice(0, i);
  
  const baiK = positionKillMultiValidation(prevData, 'd1');
  const shiK = positionKillMultiValidation(prevData, 'd2');
  const geK = positionKillMultiValidation(prevData, 'd3');
  
  totalPeriods++;
  
  // 如果三个位置都没有杀号，算作"不杀号期"
  if (baiK.length === 0 && shiK.length === 0 && geK.length === 0) {
    noKillPeriods++;
  } else {
    killPeriods++;
  }
}

console.log(`=== V49 多重验证位杀 杀号统计 ===`);
console.log(`总期数: ${totalPeriods}`);
console.log(`杀号期数: ${killPeriods} (${(killPeriods/totalPeriods*100).toFixed(2)}%)`);
console.log(`不杀号期数: ${noKillPeriods} (${(noKillPeriods/totalPeriods*100).toFixed(2)}%)`);
console.log(`\n平均每 ${Math.round(totalPeriods/killPeriods)} 期杀一次号`);
