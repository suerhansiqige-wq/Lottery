// 用最近10期横相加模式推算下期号码
const recentData = [
  { issue: '26275', d1: 2, d2: 8, d3: 7 },
  { issue: '26276', d1: 9, d2: 6, d3: 0 },
  { issue: '26277', d1: 5, d2: 6, d3: 8 },
  { issue: '26278', d1: 6, d2: 6, d3: 6 },
  { issue: '26279', d1: 7, d2: 9, d3: 1 },
  { issue: '26280', d1: 4, d2: 3, d3: 5 },
  { issue: '26281', d1: 8, d2: 1, d3: 3 },
  { issue: '26282', d1: 3, d2: 0, d3: 0 },
  { issue: '26283', d1: 2, d2: 0, d3: 2 },
  { issue: '26284', d1: 1, d2: 7, d3: 6 },
];

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

console.log('最近10期横相加模式：\n');
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
console.log(sortedMatches.join(', '));
