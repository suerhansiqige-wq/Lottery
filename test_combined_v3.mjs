// 组合条件位杀V3 - 优化版追求90%+
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));

// V3: 增强条件组合
function combinedKillV3(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let anyPositionKill = false;

  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = data[currentIndex - 1][pos];
    let shouldKill = false;

    // 条件1: 连续4期相同（91.29%准确率）
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

    // 条件2: 近10期波动<1.5（93.90%准确率）
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

    // 条件3: 近7期波动<1.5（92.38%准确率）
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

    // 条件4: 近5期波动<1（91.30%准确率）
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

// V4: 更严格 - 需要多个条件同时满足
function combinedKillV4(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let allPositionsConfident = true;

  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = data[currentIndex - 1][pos];
    let conditionCount = 0;

    // 条件1: 连续3期相同
    if (currentIndex >= 3) {
      let allSame = true;
      for (let j = 1; j < 3; j++) {
        if (data[currentIndex-j][pos] !== lastDigit) {
          allSame = false;
          break;
        }
      }
      if (allSame) conditionCount++;
    }

    // 条件2: 近7期波动<1.5
    if (currentIndex >= 7) {
      const digits = [];
      for (let j = 1; j <= 7; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 7;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 7;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.5) conditionCount++;
    }

    // 条件3: 近5期波动<1
    if (currentIndex >= 5) {
      const digits = [];
      for (let j = 1; j <= 5; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 5;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 5;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.0) conditionCount++;
    }

    // 需要至少2个条件满足
    if (conditionCount >= 2) {
      killDigits[pos] = [lastDigit];
    } else {
      allPositionsConfident = false;
    }
  }

  return { ...killDigits, kill: allPositionsConfident };
}

// V5: 混合策略 - 至少2个位置满足高置信条件
function combinedKillV5(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let confidentPositions = 0;

  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = data[currentIndex - 1][pos];
    let conditionCount = 0;

    // 条件1: 连续3期相同
    if (currentIndex >= 3) {
      let allSame = true;
      for (let j = 1; j < 3; j++) {
        if (data[currentIndex-j][pos] !== lastDigit) {
          allSame = false;
          break;
        }
      }
      if (allSame) conditionCount++;
    }

    // 条件2: 近7期波动<1.5
    if (currentIndex >= 7) {
      const digits = [];
      for (let j = 1; j <= 7; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 7;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 7;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.5) conditionCount++;
    }

    // 条件3: 近5期波动<1
    if (currentIndex >= 5) {
      const digits = [];
      for (let j = 1; j <= 5; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 5;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 5;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.0) conditionCount++;
    }

    if (conditionCount >= 1) {
      killDigits[pos] = [lastDigit];
      confidentPositions++;
    }
  }

  // 至少2个位置满足条件
  return { ...killDigits, kill: confidentPositions >= 2 };
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

console.log('=== 组合条件位杀优化版测试 ===');
testCombinedKill('V3: 增强条件组合(任一触发)', combinedKillV3);
testCombinedKill('V4: 严格组合(每位置需2条件)', combinedKillV4);
testCombinedKill('V5: 混合策略(至少2位置满足)', combinedKillV5);
