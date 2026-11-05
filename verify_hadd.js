// 验证横相加预测准确率
const recentData = [
  { issue: '26274', d1: 8, d2: 2, d3: 3 },
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

console.log('横相加预测准确率验证（近10期）\n');
console.log('期号      | 上期开奖号 | 横相加 | 候选号码数 | 实际开奖号 | 是否命中');
console.log('----------|-----------|--------|-----------|-----------|--------');

let hitCount = 0;

for (let i = 0; i < recentData.length - 1; i++) {
  const current = recentData[i];
  const next = recentData[i + 1];

  const hAdd = calcHAdd(current.d1, current.d2, current.d3);
  const matches = findAllMatches(hAdd);
  const nextNum = `${next.d1}${next.d2}${next.d3}`;
  const isHit = matches.includes(nextNum);

  if (isHit) hitCount++;

  console.log(
    `${current.issue} | ${current.d1}${current.d2}${current.d3}        | ${hAdd.join('')}   | ${matches.length.toString().padStart(2)}        | ${nextNum}        | ${isHit ? '✓ 命中' : '✗ 未中'}`
  );
}

console.log('\n' + '='.repeat(60));
console.log(`总预测期数: ${recentData.length - 1}`);
console.log(`命中期数: ${hitCount}`);
console.log(`准确率: ${(hitCount / (recentData.length - 1) * 100).toFixed(2)}%`);
