// 验证上30期横相加模式推算下期准确率 - 全量历史数据
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

console.log('上30期横相加模式推算下期准确率验证（全量历史数据）\n');
console.log(`总期数: ${lotteryData.length}`);

let hitCount = 0;
let totalPredictions = 0;
const hitRecords = [];

// 从第31期开始验证（需要前30期数据）
for (let i = 30; i < lotteryData.length; i++) {
  const current = lotteryData[i];
  
  // 收集前30期的横相加模式
  const patterns = new Set();
  for (let j = i - 30; j < i; j++) {
    const prev = lotteryData[j];
    const hAdd = calcHAdd(prev.d1, prev.d2, prev.d3);
    patterns.add(hAdd.join(''));
  }
  
  // 找出所有匹配这些模式的号码
  const allMatches = new Set();
  for (const pattern of patterns) {
    const target = pattern.split('').map(Number);
    const matches = findAllMatches(target);
    matches.forEach(m => allMatches.add(m));
  }
  
  const currentNum = `${current.d1}${current.d2}${current.d3}`;
  const isHit = allMatches.has(currentNum);
  
  if (isHit) {
    hitCount++;
    hitRecords.push({
      issue: current.issue,
      actual: currentNum,
      candidateCount: allMatches.size
    });
  }
  
  totalPredictions++;
}

console.log('\n' + '='.repeat(60));
console.log(`总预测期数: ${totalPredictions}`);
console.log(`命中期数: ${hitCount}`);
console.log(`准确率: ${(hitCount / totalPredictions * 100).toFixed(4)}%`);
console.log(`平均候选号码数: 约${(30 * 2).toFixed(0)}注（30个模式×2注/模式，去重后）`);

if (hitRecords.length > 0) {
  console.log('\n部分命中记录：');
  console.log('期号      | 实际开奖号 | 候选号码数');
  console.log('----------|-----------|-----------');
  for (const record of hitRecords.slice(0, 20)) {
    console.log(`${record.issue} | ${record.actual}        | ${record.candidateCount}`);
  }
  if (hitRecords.length > 20) {
    console.log(`... 共 ${hitRecords.length} 条记录`);
  }
}
