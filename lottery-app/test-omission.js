// 测试遗漏策略函数
import { lotteryData } from './src/data/lotteryData.js';

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

// 测试最新一期
const lastIdx = lotteryData.length - 1;
console.log(`测试期号: ${lotteryData[lastIdx].issue}`);
console.log(`开奖号码: ${lotteryData[lastIdx].d1}${lotteryData[lastIdx].d2}${lotteryData[lastIdx].d3}\n`);

const numbers = generateOmissionNumbers(lotteryData, lastIdx + 1);
console.log(`生成的遗漏策略号码数: ${numbers.length}注`);
console.log(`前20注: ${numbers.slice(0, 20).join(' ')}`);

// 验证上一期的预测是否命中当期
if (lastIdx > 0) {
  const prevIssue = lotteryData[lastIdx - 1].issue;
  const prevNumbers = generateOmissionNumbers(lotteryData, lastIdx);
  const actualNum = `${lotteryData[lastIdx].d1}${lotteryData[lastIdx].d2}${lotteryData[lastIdx].d3}`;
  const hit = prevNumbers.includes(actualNum);
  
  console.log(`\n验证第${prevIssue}期预测:`);
  console.log(`预测注数: ${prevNumbers.length}`);
  console.log(`第${lotteryData[lastIdx].issue}期开奖: ${actualNum}`);
  console.log(`是否命中: ${hit ? '✓ 是' : '✗ 否'}`);
}
