import { lotteryData } from './src/data/lotteryData.js';

// 计算遗漏值
function getMissingAtPeriod(data, periodIndex) {
  const historical = data.slice(0, periodIndex);
  const missing = { d1: {}, d2: {}, d3: {} };
  for (let digit = 0; digit <= 9; digit++) {
    for (const pos of ['d1', 'd2', 'd3']) {
      let miss = 0;
      for (let i = historical.length - 1; i >= 0; i--) {
        if (historical[i][pos] === digit) break;
        miss++;
      }
      missing[pos][digit] = miss;
    }
  }
  return missing;
}

// 遗漏1位策略
function selectOneGroup(missing, sixPos) {
  const result = { d1: [], d2: [], d3: [] };
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
    if (pos === sixPos) {
      result[pos] = digits.slice(0, 6);
    } else {
      result[pos] = digits.slice(5, 10);
    }
  }
  return result;
}

function generateOmissionNumbers(data, periodIndex) {
  const missing = getMissingAtPeriod(data, periodIndex);
  const group1 = selectOneGroup(missing, 'd1');
  const group2 = selectOneGroup(missing, 'd2');
  const group3 = selectOneGroup(missing, 'd3');
  
  const combinations = new Set();
  for (const g of [group1, group2, group3]) {
    for (const d1 of g.d1) {
      for (const d2 of g.d2) {
        for (const d3 of g.d3) {
          combinations.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  return Array.from(combinations).sort();
}

// 遗漏2位策略
function selectTwoGroups(missing, excludePos) {
  const result = { d1: [], d2: [], d3: [] };
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
    if (pos === excludePos) {
      result[pos] = digits.slice(5, 10);
    } else {
      result[pos] = digits.slice(0, 5);
    }
  }
  return result;
}

function generateOmissionNumbers2(data, periodIndex) {
  const missing = getMissingAtPeriod(data, periodIndex);
  const group1 = selectTwoGroups(missing, 'd3');
  const group2 = selectTwoGroups(missing, 'd1');
  const group3 = selectTwoGroups(missing, 'd2');
  
  const combinations = new Set();
  for (const g of [group1, group2, group3]) {
    for (const d1 of g.d1) {
      for (const d2 of g.d2) {
        for (const d3 of g.d3) {
          combinations.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  return Array.from(combinations).sort();
}

// 遗漏3位策略
function selectThreeGroups(missing, sixPos) {
  const result = { d1: [], d2: [], d3: [] };
  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    digits.sort((a, b) => missing[pos][b] - missing[pos][a]);
    if (pos === sixPos) {
      result[pos] = digits.slice(0, 6);
    } else {
      result[pos] = digits.slice(0, 5);
    }
  }
  return result;
}

function generateOmissionNumbers3(data, periodIndex) {
  const missing = getMissingAtPeriod(data, periodIndex);
  const group1 = selectThreeGroups(missing, 'd1');
  const group2 = selectThreeGroups(missing, 'd2');
  const group3 = selectThreeGroups(missing, 'd1');
  
  const combinations = new Set();
  for (const g of [group1, group2, group3]) {
    for (const d1 of g.d1) {
      for (const d2 of g.d2) {
        for (const d3 of g.d3) {
          combinations.add(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  return Array.from(combinations).sort();
}

// 主逻辑：统计历史命中率
console.log('开始统计遗漏验证列（三策略并集）的历史命中率...\n');

let totalTests = 0;
let hits = 0;
let totalNumbers = 0;

// 从第100期开始测试（需要足够的历史数据计算遗漏）
for (let i = 100; i < lotteryData.length - 1; i++) {
  const currentIssue = lotteryData[i].issue;
  const actual = `${lotteryData[i].d1}${lotteryData[i].d2}${lotteryData[i].d3}`;
  
  // 基于上一期数据生成预测
  const numbers1 = generateOmissionNumbers(lotteryData, i);
  const numbers2 = generateOmissionNumbers2(lotteryData, i);
  const numbers3 = generateOmissionNumbers3(lotteryData, i);
  
  // 合并三个策略
  const union = new Set([...numbers1, ...numbers2, ...numbers3]);
  const merged = Array.from(union).sort();
  
  totalTests++;
  totalNumbers += merged.length;
  
  if (merged.includes(actual)) {
    hits++;
  }
}

const hitRate = ((hits / totalTests) * 100).toFixed(2);
const avgNumbers = Math.round(totalNumbers / totalTests);

console.log(`统计范围: 第100期 至 第${lotteryData[lotteryData.length - 2].issue}期`);
console.log(`总测试期数: ${totalTests} 期`);
console.log(`命中期数: ${hits} 期`);
console.log(`未命中期数: ${totalTests - hits} 期`);
console.log(`命中率: ${hitRate}%`);
console.log(`平均每期的号码注数: ${avgNumbers} 注`);
console.log(`\n=== 总结 ===`);
console.log(`遗漏验证列（三策略并集）在${totalTests}期历史数据中的命中率为 ${hitRate}%`);
console.log(`即每${(100 / hitRate).toFixed(1)}期大约能命中1期`);
