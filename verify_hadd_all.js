// 验证横相加预测准确率 - 全量历史数据
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

console.log('横相加预测准确率验证（全量历史数据）\n');
console.log(`总期数: ${lotteryData.length}`);

let hitCount = 0;
let totalPredictions = 0;

// 遍历所有相邻期数
for (let i = 0; i < lotteryData.length - 1; i++) {
  const current = lotteryData[i];
  const next = lotteryData[i + 1];

  const hAdd = calcHAdd(current.d1, current.d2, current.d3);
  const matches = findAllMatches(hAdd);
  const nextNum = `${next.d1}${next.d2}${next.d3}`;
  const isHit = matches.includes(nextNum);

  if (isHit) {
    hitCount++;
    console.log(`✓ 命中: 期号${current.issue}(${current.d1}${current.d2}${current.d3}) -> ${next.issue}(${nextNum})`);
  }
  
  totalPredictions++;
}

console.log('\n' + '='.repeat(60));
console.log(`总预测期数: ${totalPredictions}`);
console.log(`命中期数: ${hitCount}`);
console.log(`准确率: ${(hitCount / totalPredictions * 100).toFixed(4)}%`);
console.log(`理论概率: ${(2 / 1000 * 100).toFixed(4)}% (每个模式对应2注号码)`);
