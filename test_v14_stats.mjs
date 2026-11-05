// V14位杀算法 - 统计对错期数
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';
import { lotteryData as pl3Data } from './pl3-app/src/data/lotteryData.js';

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

function testV14(name, data) {
  const sorted = [...data].sort((a, b) => Number(a.issue) - Number(b.issue));
  let correct = 0;
  let incorrect = 0;
  let total = 0;

  for (let i = 3; i < sorted.length; i++) {
    const kill = generatePositionKillNumbers(sorted, i);
    const curr = sorted[i];

    const d1Correct = !kill.d1.includes(curr.d1);
    const d2Correct = !kill.d2.includes(curr.d2);
    const d3Correct = !kill.d3.includes(curr.d3);

    if (d1Correct && d2Correct && d3Correct) {
      correct++;
    } else {
      incorrect++;
    }
    total++;
  }

  console.log(`\n=== ${name} ===`);
  console.log(`总测试期数: ${total}`);
  console.log(`杀对期数: ${correct} (${(correct/total*100).toFixed(2)}%)`);
  console.log(`杀错期数: ${incorrect} (${(incorrect/total*100).toFixed(2)}%)`);
}

console.log('=== V14位杀算法 - 对错期数统计 ===');
testV14('福彩3D', fc3dData);
testV14('排列三', pl3Data);
