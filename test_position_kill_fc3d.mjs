// 位杀算法准确率测试 - 福彩3D
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

function generatePositionKillNumbers(data, currentIndex) {
  if (currentIndex < 3) return { d1: [], d2: [], d3: [] };
  const recent = data.slice(currentIndex - 3, currentIndex);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  const lastItem = data[currentIndex - 1];
  const killDigits = { d1: [], d2: [], d3: [] };
  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = lastItem[pos];
    let killDigit;
    if (avgSum >= 14) killDigit = lastDigit === 9 ? 8 : 9;
    else if (avgSum <= 11) killDigit = lastDigit === 0 ? 1 : 0;
    else killDigit = lastDigit;
    killDigits[pos] = [killDigit];
  }
  return killDigits;
}

let total = 0;
let baiHit = 0, shiHit = 0, geHit = 0;
let baiTotal = 0, shiTotal = 0, geTotal = 0;
let maxConsecutiveHit = 0, currentConsecutiveHit = 0;
let maxConsecutiveMiss = 0, currentConsecutiveMiss = 0;

for (let i = 3; i < data.length; i++) {
  const curr = data[i];
  const killDigits = generatePositionKillNumbers(data, i);
  
  if (killDigits.d1.length === 0) continue;
  
  baiTotal++;
  shiTotal++;
  geTotal++;
  total++;
  
  const baiOk = !killDigits.d1.includes(curr.d1);
  const shiOk = !killDigits.d2.includes(curr.d2);
  const geOk = !killDigits.d3.includes(curr.d3);
  
  if (baiOk) baiHit++;
  if (shiOk) shiHit++;
  if (geOk) geHit++;
  
  const allOk = baiOk && shiOk && geOk;
  if (allOk) {
    currentConsecutiveHit++;
    currentConsecutiveMiss = 0;
    if (currentConsecutiveHit > maxConsecutiveHit) maxConsecutiveHit = currentConsecutiveHit;
  } else {
    currentConsecutiveMiss++;
    currentConsecutiveHit = 0;
    if (currentConsecutiveMiss > maxConsecutiveMiss) maxConsecutiveMiss = currentConsecutiveMiss;
  }
}

console.log(`=== 福彩3D 位杀算法准确率 ===`);
console.log(`总期数: ${total}`);
console.log(`\n各位命中率:`);
console.log(`  百位: ${(baiHit/baiTotal*100).toFixed(2)}%`);
console.log(`  十位: ${(shiHit/shiTotal*100).toFixed(2)}%`);
console.log(`  个位: ${(geHit/geTotal*100).toFixed(2)}%`);
console.log(`\n综合命中率(三位全杀对): ${((baiHit+shiHit+geHit)/(baiTotal+shiTotal+geTotal)*100).toFixed(2)}%`);
console.log(`\n最大连对: ${maxConsecutiveHit} 期`);
console.log(`最大连错: ${maxConsecutiveMiss} 期`);
