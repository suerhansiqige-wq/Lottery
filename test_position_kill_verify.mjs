// 位杀算法功能验证
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(b.issue) - Number(a.issue));

// 位杀算法（和值区间位杀）
function generatePositionKillNumbers(data, currentIndex) {
  if (currentIndex < 3) return { d1: [], d2: [], d3: [] };
  
  const recent = data.slice(currentIndex - 3, currentIndex);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  const lastItem = data[currentIndex - 1];
  
  const killDigits = { d1: [], d2: [], d3: [] };
  
  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = lastItem[pos];
    let killDigit;
    
    if (avgSum >= 14) {
      killDigit = lastDigit === 9 ? 8 : 9;
    } else if (avgSum <= 11) {
      killDigit = lastDigit === 0 ? 1 : 0;
    } else {
      killDigit = lastDigit;
    }
    
    killDigits[pos] = [killDigit];
  }
  
  return killDigits;
}

// 测试最近5期
console.log('=== 位杀算法功能验证 ===\n');
for (let i = 0; i < 5; i++) {
  const curr = data[i];
  const killDigits = generatePositionKillNumbers(data, i);
  
  if (killDigits.d1.length === 0) continue;
  
  const killStr = `${killDigits.d1[0]}${killDigits.d2[0]}${killDigits.d3[0]}`;
  const actualStr = `${curr.d1}${curr.d2}${curr.d3}`;
  
  // 判断是否杀对
  const hit = !killDigits.d1.includes(curr.d1) && !killDigits.d2.includes(curr.d2) && !killDigits.d3.includes(curr.d3);
  
  console.log(`期号: ${curr.issue}`);
  console.log(`  开奖号: ${actualStr}`);
  console.log(`  位杀号: ${killStr} (百位杀${killDigits.d1[0]}, 十位杀${killDigits.d2[0]}, 个位杀${killDigits.d3[0]})`);
  console.log(`  结果: ${hit ? '✓ 杀对' : '✗ 杀错'}`);
  console.log();
}
