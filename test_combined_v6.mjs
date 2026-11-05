// 组合条件位杀V6 - 微调阈值突破90%
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));

// V6: 微调波动阈值
function combinedKillV6(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let anyPositionKill = false;

  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = data[currentIndex - 1][pos];
    let shouldKill = false;

    // 条件1: 连续4期相同（91.29%）
    if (currentIndex >= 4 && !shouldKill) {
      let allSame = true;
      for (let j = 1; j < 4; j++) {
        if (data[currentIndex-j][pos] !== lastDigit) {
          allSame = false;
          break;
        }
      }
      if (allSame) shouldKill = true;
    }

    // 条件2: 近10期波动<1.4（更严格）
    if (currentIndex >= 10 && !shouldKill) {
      const digits = [];
      for (let j = 1; j <= 10; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 10;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 10;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.4) shouldKill = true;
    }

    // 条件3: 近7期波动<1.4
    if (currentIndex >= 7 && !shouldKill) {
      const digits = [];
      for (let j = 1; j <= 7; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 7;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 7;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.4) shouldKill = true;
    }

    // 条件4: 近5期波动<0.9
    if (currentIndex >= 5 && !shouldKill) {
      const digits = [];
      for (let j = 1; j <= 5; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 5;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 5;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 0.9) shouldKill = true;
    }

    if (shouldKill) {
      killDigits[pos] = [lastDigit];
      anyPositionKill = true;
    }
  }

  return { ...killDigits, kill: anyPositionKill };
}

// V7: 加入和值条件
function combinedKillV7(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let anyPositionKill = false;

  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = data[currentIndex - 1][pos];
    let shouldKill = false;

    // 条件1: 连续4期相同
    if (currentIndex >= 4 && !shouldKill) {
      let allSame = true;
      for (let j = 1; j < 4; j++) {
        if (data[currentIndex-j][pos] !== lastDigit) {
          allSame = false;
          break;
        }
      }
      if (allSame) shouldKill = true;
    }

    // 条件2: 近10期波动<1.5
    if (currentIndex >= 10 && !shouldKill) {
      const digits = [];
      for (let j = 1; j <= 10; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 10;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 10;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.5) shouldKill = true;
    }

    // 条件3: 近7期波动<1.5
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

    // 条件4: 和值连续3期偏大或偏小
    if (currentIndex >= 3 && !shouldKill) {
      let allBig = true, allSmall = true;
      for (let j = 1; j <= 3; j++) {
        const sum = data[currentIndex-j].d1 + data[currentIndex-j].d2 + data[currentIndex-j].d3;
        if (sum < 15) allBig = false;
        if (sum > 10) allSmall = false;
      }
      if ((allBig && lastDigit >= 7) || (allSmall && lastDigit <= 2)) {
        shouldKill = true;
      }
    }

    if (shouldKill) {
      killDigits[pos] = [lastDigit];
      anyPositionKill = true;
    }
  }

  return { ...killDigits, kill: anyPositionKill };
}

// V8: 只用最高准确率条件
function combinedKillV8(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let anyPositionKill = false;

  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = data[currentIndex - 1][pos];
    let shouldKill = false;

    // 只用最高准确率的条件:
    // 1. 近10期波动<1.5 (93.90%)
    if (currentIndex >= 10) {
      const digits = [];
      for (let j = 1; j <= 10; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 10;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 10;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.5) shouldKill = true;
    }

    // 2. 近7期波动<1.5 (92.38%)
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

    if (shouldKill) {
      killDigits[pos] = [lastDigit];
      anyPositionKill = true;
    }
  }

  return { ...killDigits, kill: anyPositionKill };
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

console.log('=== 组合条件位杀微调版测试 ===');
testCombinedKill('V6: 微调波动阈值', combinedKillV6);
testCombinedKill('V7: 加入和值条件', combinedKillV7);
testCombinedKill('V8: 只用高准确率条件', combinedKillV8);
