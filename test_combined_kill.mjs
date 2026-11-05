// 组合条件位杀 - 追求90%+准确率
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));

// 组合条件位杀V1: 任一高置信条件触发即杀
function combinedKillV1(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let anyPositionKill = false;

  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = data[currentIndex - 1][pos];
    let shouldKill = false;

    // 条件1: 连续3期相同
    if (currentIndex >= 3) {
      let allSame = true;
      for (let j = 1; j < 3; j++) {
        if (data[currentIndex-j][pos] !== lastDigit) {
          allSame = false;
          break;
        }
      }
      if (allSame) shouldKill = true;
    }

    // 条件2: 近7期波动<1.5
    if (currentIndex >= 7 && !shouldKill) {
      const digits = [];
      for (let j = 1; j <= 7; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 7;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 7;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.5) shouldKill = true;
    }

    // 条件3: 近5期波动<1
    if (currentIndex >= 5 && !shouldKill) {
      const digits = [];
      for (let j = 1; j <= 5; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 5;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 5;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.0) shouldKill = true;
    }

    if (shouldKill) {
      killDigits[pos] = [lastDigit];
      anyPositionKill = true;
    }
  }

  return { ...killDigits, kill: anyPositionKill };
}

// 组合条件位杀V2: 所有位置都满足条件才杀（更保守）
function combinedKillV2(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let allPositionsConfident = true;

  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = data[currentIndex - 1][pos];
    let confident = false;

    // 条件1: 连续3期相同
    if (currentIndex >= 3) {
      let allSame = true;
      for (let j = 1; j < 3; j++) {
        if (data[currentIndex-j][pos] !== lastDigit) {
          allSame = false;
          break;
        }
      }
      if (allSame) confident = true;
    }

    // 条件2: 近7期波动<1.5
    if (!confident && currentIndex >= 7) {
      const digits = [];
      for (let j = 1; j <= 7; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 7;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 7;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.5) confident = true;
    }

    if (confident) {
      killDigits[pos] = [lastDigit];
    } else {
      allPositionsConfident = false;
    }
  }

  return { ...killDigits, kill: allPositionsConfident };
}

// 测试函数
function testCombinedKill(name, killFunc) {
  let triggerPeriods = 0;
  let correctPeriods = 0;
  let incorrectPeriods = 0;
  let maxConsecutiveMiss = 0;
  let currentMiss = 0;

  for (let i = 10; i < data.length; i++) {
    const result = killFunc(data, i);
    const curr = data[i];

    if (!result.kill) continue;

    triggerPeriods++;
    const d1Correct = !result.d1.includes(curr.d1);
    const d2Correct = !result.d2.includes(curr.d2);
    const d3Correct = !result.d3.includes(curr.d3);

    if (d1Correct && d2Correct && d3Correct) {
      correctPeriods++;
      currentMiss = 0;
    } else {
      incorrectPeriods++;
      currentMiss++;
      maxConsecutiveMiss = Math.max(maxConsecutiveMiss, currentMiss);
    }
  }

  console.log(`\n=== ${name} ===`);
  console.log(`触发期数: ${triggerPeriods} (${(triggerPeriods/data.length*100).toFixed(2)}%)`);
  console.log(`三期全对: ${correctPeriods} (${triggerPeriods > 0 ? (correctPeriods/triggerPeriods*100).toFixed(2) : 0}%)`);
  console.log(`三期全错: ${incorrectPeriods} (${triggerPeriods > 0 ? (incorrectPeriods/triggerPeriods*100).toFixed(2) : 0}%)`);
  console.log(`最大连错: ${maxConsecutiveMiss}期`);
}

console.log('=== 组合条件位杀测试 ===');
testCombinedKill('V1: 任一条件触发即杀', combinedKillV1);
testCombinedKill('V2: 所有位置都满足才杀', combinedKillV2);
