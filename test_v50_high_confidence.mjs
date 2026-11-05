// 高置信度位杀算法 - 追求三期全对90%+
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));

// V50: 多重验证高置信度位杀
function generatePositionKillV50(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let allPositionsConfident = true;

  for (const pos of ['d1', 'd2', 'd3']) {
    const recent = data.slice(currentIndex - 10, currentIndex);
    const lastDigit = data[currentIndex - 1][pos];
    const digits = recent.map(d => d[pos]);

    // 条件1: 波动检查（标准差<1.5）
    const mean = digits.reduce((s, v) => s + v, 0) / digits.length;
    const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / digits.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev >= 1.5) {
      allPositionsConfident = false;
      break;
    }

    // 条件2: 遗漏值检查（当前数字遗漏>=8期）
    let miss = 0;
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (data[i][pos] === lastDigit) break;
      miss++;
    }

    // 条件3: 频率检查（近10期该数字出现<=1次）
    const freq = digits.filter(d => d === lastDigit).length;

    // 条件4: 趋势一致性（近5期奇偶或大小趋势明确）
    const recent5 = data.slice(currentIndex - 5, currentIndex);
    const oddCount = recent5.filter(d => d[pos] % 2 === 1).length;
    const bigCount = recent5.filter(d => d[pos] >= 5).length;

    // 只有当多个条件同时满足时才杀
    if (miss >= 8 && freq <= 1 && (oddCount >= 4 || oddCount <= 1) && (bigCount >= 4 || bigCount <= 1)) {
      killDigits[pos] = [lastDigit];
    } else {
      allPositionsConfident = false;
      break;
    }
  }

  return { ...killDigits, kill: allPositionsConfident };
}

// 测试V50
let correct = 0;
let incorrect = 0;
let skipped = 0;
let total = 0;

for (let i = 10; i < data.length; i++) {
  const result = generatePositionKillV50(data, i);
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
  } else {
    incorrect++;
  }
}

console.log('=== V50 高置信度位杀 ===');
console.log(`总期数: ${data.length}`);
console.log(`跳过不杀: ${skipped} (${(skipped/data.length*100).toFixed(2)}%)`);
console.log(`实际杀号: ${total} (${(total/data.length*100).toFixed(2)}%)`);
console.log(`三期全对: ${correct} (${total > 0 ? (correct/total*100).toFixed(2) : 0}%)`);
console.log(`三期全错: ${incorrect} (${total > 0 ? (incorrect/total*100).toFixed(2) : 0}%)`);
