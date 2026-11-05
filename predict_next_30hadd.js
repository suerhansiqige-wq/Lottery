// 用最近30期横相加模式推算下期号码
import { lotteryData } from './lottery-app/src/data/lotteryData.js';

// 计算横相加
function calcHAdd(d1, d2, d3) {
  return [
    (d1 + d2) % 10,
    (d2 + d3) % 10,
    (d1 + d3) % 10
  ];
}

// 找出所有满足横相加条件的号码
function findAllMatches(target) {
  const matches = [];
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      for (let d3 = 0; d3 <= 9; d3++) {
        const hAdd = calcHAdd(d1, d2, d3);
        if (hAdd[0] === target[0] && hAdd[1] === target[1] && hAdd[2] === target[2]) {
          matches.push(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  return matches;
}

// 取最近30期数据
const recentData = lotteryData.slice(-30);

console.log('最近30期横相加模式：\n');
console.log('期号      | 开奖号 | 横相加');
console.log('----------|--------|--------');

const patterns = new Set();
for (const item of recentData) {
  const hAdd = calcHAdd(item.d1, item.d2, item.d3);
  console.log(`${item.issue} | ${item.d1}${item.d2}${item.d3}     | ${hAdd.join('')}`);
  patterns.add(hAdd.join(''));
}

console.log('\n' + '='.repeat(60));
console.log(`\n共有 ${patterns.size} 个不同的横相加模式\n`);

// 找出所有匹配的号码
const allMatches = new Set();
const patternDetails = [];

for (const pattern of patterns) {
  const target = pattern.split('').map(Number);
  const matches = findAllMatches(target);
  patternDetails.push({ pattern, matches });
  matches.forEach(m => allMatches.add(m));
}

console.log('各模式对应号码：');
for (const { pattern, matches } of patternDetails) {
  console.log(`  模式 ${pattern}: ${matches.join(', ')}`);
}

console.log('\n' + '='.repeat(60));
console.log(`\n下期推荐号码（共 ${allMatches.size} 注）：`);
const sortedMatches = Array.from(allMatches).sort();

// 每行显示10个
for (let i = 0; i < sortedMatches.length; i += 10) {
  console.log(sortedMatches.slice(i, i + 10).join(', '));
}
