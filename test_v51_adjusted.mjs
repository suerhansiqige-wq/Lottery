// 高置信度位杀算法V2 - 调整条件
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));

// V51: 调整版高置信度位杀
function generatePositionKillV51(data, currentIndex) {
  if (currentIndex < 5) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let allPositionsConfident = true;

  for (const pos of ['d1', 'd2', 'd3']) {
    const recent = data.slice(currentIndex - 5, currentIndex);
    const lastDigit = data[currentIndex - 1][pos];
    const digits = recent.map(d => d[pos]);

    // 条件1: 波动检查（标准差<2）
    const mean = digits.reduce((s, v) => s + v, 0) / digits.length;
    const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / digits.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev >= 2) {
      allPositionsConfident = false;
      break;
    }

    // 条件2: 遗漏值检查（当前数字遗漏>=5期）
    let miss = 0;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (data[i][pos] === lastDigit) break;
      miss++;
    }

    // 条件3: 频率检查（近5期该数字出现<=1次）
    const freq = digits.filter(d => d === lastDigit).length;

    // 条件4: 和值趋势
    const recent3 = data.slice(currentIndex - 3, currentIndex);
    const avgSum = recent3.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;

    // 只有当多个条件同时满足时才杀
    if (miss >= 5 && freq <= 1) {
      // 根据和值趋势决定杀什么
      if (avgSum >= 15 && lastDigit >= 7) {
        killDigits[pos] = [lastDigit];
      } else if (avgSum <= 10 && lastDigit <= 2) {
        killDigits[pos] = [lastDigit];
      } else if (avgSum > 10 && avgSum < 15 && freq === 0) {
        killDigits[pos] = [lastDigit];
      } else {
        allPositionsConfident = false;
        break;
      }
    } else {
      allPositionsConfident = false;
      break;
    }
  }

  return { ...killDigits, kill: allPositionsConfident };
}

// 测试V51
let correct = 0;
let incorrect = 0;
let skipped = 0;
let total = 0;
let maxConsecutiveMiss = 0;
let currentMiss = 0;

for (let i = 5; i < data.length; i++) {
  const result = generatePositionKillV51(data, i);
  const curr = data[i];

  if (!result.kill) {
    skipped++;
    continue;
  }

  total++;
  const d1Correct = !result.d1.includes(curr.d1);
  const d2Correct = !result.d2.includes(curr.d2);
  const d3Correct = !result.d3.includes(curr.d3);

  if (d1Correct && d2Correct && d3Correct) {
    correct++;
    currentMiss = 0;
  } else {
    incorrect++;
    currentMiss++;
    maxConsecutiveMiss = Math.max(maxConsecutiveMiss, currentMiss);
  }
}

console.log('=== V51 高置信度位杀（调整版） ===');
console.log(`总期数: ${data.length}`);
console.log(`跳过不杀: ${skipped} (${(skipped/data.length*100).toFixed(2)}%)`);
console.log(`实际杀号: ${total} (${(total/data.length*100).toFixed(2)}%)`);
console.log(`三期全对: ${correct} (${total > 0 ? (correct/total*100).toFixed(2) : 0}%)`);
console.log(`三期全错: ${incorrect} (${total > 0 ? (incorrect/total*100).toFixed(2) : 0}%)`);
console.log(`最大连错: ${maxConsecutiveMiss}期`);
