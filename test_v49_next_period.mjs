// 检查下期V49是否杀号
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(b.issue) - Number(a.issue));

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

console.log(`=== 下期V49位杀预测 ===\n`);
console.log(`最新一期: ${data[0].issue} (开奖号: ${data[0].d1}${data[0].d2}${data[0].d3})`);
console.log(`预测期号: ${String(Number(data[0].issue) + 1)}\n`);

// 用最新数据预测下期
const prevData = data.slice(0, 30).reverse(); // 取最近30期，按时间正序

const baiK = positionKillMultiValidation(prevData, 'd1');
const shiK = positionKillMultiValidation(prevData, 'd2');
const geK = positionKillMultiValidation(prevData, 'd3');

console.log(`百位杀号: ${baiK.length > 0 ? baiK.join(',') : '不杀'}`);
console.log(`十位杀号: ${shiK.length > 0 ? shiK.join(',') : '不杀'}`);
console.log(`个位杀号: ${geK.length > 0 ? geK.join(',') : '不杀'}`);

if (baiK.length === 0 && shiK.length === 0 && geK.length === 0) {
  console.log(`\n结论: 下期V49不杀号`);
  console.log(`原因: 三重验证条件未满足（波动过大或信号不一致）`);
} else {
  const killStr = `${baiK[0] || '-'}${shiK[0] || '-'}${geK[0] || '-'}`;
  console.log(`\n结论: 下期V49杀号 → ${killStr}`);
  console.log(`排除注数: 271注`);
  console.log(`剩余可买: 729注`);
}

// 显示近期杀号情况
console.log(`\n=== 近10期杀号情况 ===`);
for (let i = 0; i < 10; i++) {
  const curr = data[i];
  const prevDataForCurr = data.slice(i + 1, i + 31).reverse();
  if (prevDataForCurr.length < 20) continue;
  
  const bK = positionKillMultiValidation(prevDataForCurr, 'd1');
  const sK = positionKillMultiValidation(prevDataForCurr, 'd2');
  const gK = positionKillMultiValidation(prevDataForCurr, 'd3');
  
  const killStr = bK.length > 0 || sK.length > 0 || gK.length > 0 
    ? `${bK[0] ?? '-'}${sK[0] ?? '-'}${gK[0] ?? '-'}`
    : '不杀';
  
  const actualStr = `${curr.d1}${curr.d2}${curr.d3}`;
  
  // 判断是否杀对
  const hit = (bK.length === 0 || !bK.includes(curr.d1)) &&
              (sK.length === 0 || !sK.includes(curr.d2)) &&
              (gK.length === 0 || !gK.includes(curr.d3));
  
  console.log(`${curr.issue}: 杀${killStr.padEnd(6)} | 开${actualStr} | ${hit ? '✓' : '✗'}`);
}
