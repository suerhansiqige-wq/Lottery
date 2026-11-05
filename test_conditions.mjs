// 条件触发式位杀 - 测试单一条件准确率
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));

// 条件1: 某位连续N期相同
function testCondition1Repeat(n) {
  let trigger = 0, correct = 0;
  for (let i = n; i < data.length; i++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      let allSame = true;
      for (let j = 1; j < n; j++) {
        if (data[i-j][pos] !== data[i-n+1][pos]) {
          allSame = false;
          break;
        }
      }
      if (allSame) {
        trigger++;
        const killDigit = data[i-n+1][pos];
        if (data[i][pos] !== killDigit) correct++;
      }
    }
  }
  return { name: `连续${n}期相同`, trigger, correct, accuracy: trigger > 0 ? (correct/trigger*100).toFixed(2) : 0 };
}

// 条件2: 某位数字遗漏值达到N期后杀该数字
function testCondition2Missing(n) {
  let trigger = 0, correct = 0;
  for (let i = n+1; i < data.length; i++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      // 检查0-9每个数字的遗漏
      for (let d = 0; d <= 9; d++) {
        let miss = 0;
        for (let j = i-1; j >= 0; j--) {
          if (data[j][pos] === d) break;
          miss++;
        }
        if (miss >= n) {
          trigger++;
          if (data[i][pos] !== d) correct++;
        }
      }
    }
  }
  return { name: `遗漏>=${n}期`, trigger, correct, accuracy: trigger > 0 ? (correct/trigger*100).toFixed(2) : 0 };
}

// 条件3: 和值连续N期偏大(>=15)或偏小(<=10)
function testCondition3SumTrend(n) {
  let trigger = 0, correct = 0, trend = '';
  for (let i = n; i < data.length; i++) {
    let allBig = true, allSmall = true;
    for (let j = 1; j <= n; j++) {
      const sum = data[i-j].d1 + data[i-j].d2 + data[i-j].d3;
      if (sum < 15) allBig = false;
      if (sum > 10) allSmall = false;
    }
    if (allBig || allSmall) {
      trend = allBig ? '大' : '小';
      for (const pos of ['d1', 'd2', 'd3']) {
        trigger++;
        const killDigit = allBig ? 9 : 0;
        if (data[i][pos] !== killDigit) correct++;
      }
    }
  }
  return { name: `和值连续${n}期偏${trend}`, trigger, correct, accuracy: trigger > 0 ? (correct/trigger*100).toFixed(2) : 0 };
}

// 条件4: 某位奇偶连续N期相同
function testCondition4OddEven(n) {
  let trigger = 0, correct = 0;
  for (let i = n; i < data.length; i++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      const lastParity = data[i-1][pos] % 2;
      let allSame = true;
      for (let j = 1; j < n; j++) {
        if (data[i-j][pos] % 2 !== lastParity) {
          allSame = false;
          break;
        }
      }
      if (allSame) {
        trigger++;
        const killDigit = lastParity === 1 ? 9 : 0;
        if (data[i][pos] !== killDigit) correct++;
      }
    }
  }
  return { name: `奇偶连续${n}期相同`, trigger, correct, accuracy: trigger > 0 ? (correct/trigger*100).toFixed(2) : 0 };
}

// 条件5: 某位大小连续N期相同
function testCondition5BigSmall(n) {
  let trigger = 0, correct = 0;
  for (let i = n; i < data.length; i++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      const lastType = data[i-1][pos] >= 5 ? 'big' : 'small';
      let allSame = true;
      for (let j = 1; j < n; j++) {
        const currType = data[i-j][pos] >= 5 ? 'big' : 'small';
        if (currType !== lastType) {
          allSame = false;
          break;
        }
      }
      if (allSame) {
        trigger++;
        const killDigit = lastType === 'big' ? 9 : 0;
        if (data[i][pos] !== killDigit) correct++;
      }
    }
  }
  return { name: `大小连续${n}期相同`, trigger, correct, accuracy: trigger > 0 ? (correct/trigger*100).toFixed(2) : 0 };
}

// 条件6: 某位波动极小（标准差<1）
function testCondition6LowVariance(n, threshold) {
  let trigger = 0, correct = 0;
  for (let i = n; i < data.length; i++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      const digits = [];
      for (let j = 1; j <= n; j++) {
        digits.push(data[i-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / n;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev < threshold) {
        trigger++;
        const killDigit = Math.round(mean);
        if (data[i][pos] !== killDigit) correct++;
      }
    }
  }
  return { name: `近${n}期波动<${threshold}`, trigger, correct, accuracy: trigger > 0 ? (correct/trigger*100).toFixed(2) : 0 };
}

console.log('=== 单一条件准确率测试 ===\n');

console.log('【条件1: 连续相同】');
[2, 3, 4, 5].forEach(n => {
  const result = testCondition1Repeat(n);
  console.log(`  ${result.name}: 触发${result.trigger}次, 准确${result.correct}次, 准确率${result.accuracy}%`);
});

console.log('\n【条件2: 遗漏值】');
[5, 8, 10, 12, 15].forEach(n => {
  const result = testCondition2Missing(n);
  console.log(`  ${result.name}: 触发${result.trigger}次, 准确${result.correct}次, 准确率${result.accuracy}%`);
});

console.log('\n【条件3: 和值趋势】');
[3, 4, 5].forEach(n => {
  const result = testCondition3SumTrend(n);
  console.log(`  ${result.name}: 触发${result.trigger}次, 准确${result.correct}次, 准确率${result.accuracy}%`);
});

console.log('\n【条件4: 奇偶连续】');
[3, 4, 5].forEach(n => {
  const result = testCondition4OddEven(n);
  console.log(`  ${result.name}: 触发${result.trigger}次, 准确${result.correct}次, 准确率${result.accuracy}%`);
});

console.log('\n【条件5: 大小连续】');
[3, 4, 5].forEach(n => {
  const result = testCondition5BigSmall(n);
  console.log(`  ${result.name}: 触发${result.trigger}次, 准确${result.correct}次, 准确率${result.accuracy}%`);
});

console.log('\n【条件6: 低波动】');
[[5, 1.5], [5, 1.2], [5, 1.0], [7, 1.5], [7, 1.2], [10, 1.5]].forEach(([n, t]) => {
  const result = testCondition6LowVariance(n, t);
  console.log(`  ${result.name}: 触发${result.trigger}次, 准确${result.correct}次, 准确率${result.accuracy}%`);
});
