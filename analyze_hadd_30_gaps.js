// 分析上30期横相加模式推算下期的中奖间隔统计
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

console.log('上30期横相加模式推算下期 - 中奖间隔统计分析（全量历史数据）\n');

let hitCount = 0;
let totalPredictions = 0;
const hitIndices = []; // 记录命中的期数索引

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
    hitIndices.push(i);
  }
  
  totalPredictions++;
}

console.log(`总预测期数: ${totalPredictions}`);
console.log(`命中期数: ${hitCount}`);
console.log(`准确率: ${(hitCount / totalPredictions * 100).toFixed(2)}%\n`);

// 计算间隔统计
if (hitIndices.length > 0) {
  // 最长中奖间隔（连续未中奖的最大期数）
  let maxGap = 0;
  let currentGap = 0;
  let maxGapStart = 0;
  let maxGapEnd = 0;
  let currentGapStart = 0;
  
  // 计算第一个命中前的间隔
  if (hitIndices[0] > 30) {
    currentGap = hitIndices[0] - 30;
    currentGapStart = 30;
    if (currentGap > maxGap) {
      maxGap = currentGap;
      maxGapStart = currentGapStart;
      maxGapEnd = hitIndices[0] - 1;
    }
  }
  
  // 计算中间的间隔
  for (let i = 1; i < hitIndices.length; i++) {
    currentGap = hitIndices[i] - hitIndices[i-1] - 1;
    currentGapStart = hitIndices[i-1] + 1;
    
    if (currentGap > maxGap) {
      maxGap = currentGap;
      maxGapStart = currentGapStart;
      maxGapEnd = hitIndices[i] - 1;
    }
  }
  
  // 计算最后一个命中后的间隔
  currentGap = lotteryData.length - 1 - hitIndices[hitIndices.length - 1];
  currentGapStart = hitIndices[hitIndices.length - 1] + 1;
  if (currentGap > maxGap) {
    maxGap = currentGap;
    maxGapStart = currentGapStart;
    maxGapEnd = lotteryData.length - 1;
  }
  
  console.log('='.repeat(60));
  console.log('\n【间隔统计】');
  console.log(`最长未中奖间隔: ${maxGap} 期`);
  if (maxGap > 0) {
    const startIssue = lotteryData[maxGapStart]?.issue || 'N/A';
    const endIssue = lotteryData[maxGapEnd]?.issue || 'N/A';
    console.log(`  区间: ${startIssue} ~ ${endIssue}`);
  }
  
  // 检查是否有连对（连续命中）
  let hasConsecutive = false;
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  
  for (let i = 1; i < hitIndices.length; i++) {
    if (hitIndices[i] === hitIndices[i-1] + 1) {
      hasConsecutive = true;
      currentConsecutive++;
      if (currentConsecutive > maxConsecutive) {
        maxConsecutive = currentConsecutive;
      }
    } else {
      currentConsecutive = 1;
    }
  }
  
  console.log(`\n是否有连对（连续命中）: ${hasConsecutive ? '是' : '否'}`);
  if (hasConsecutive) {
    console.log(`最长连对期数: ${maxConsecutive} 期`);
    
    // 找出所有连对的位置
    console.log('\n连对详情:');
    currentConsecutive = 1;
    let consecutiveStart = 0;
    
    for (let i = 1; i <= hitIndices.length; i++) {
      if (i < hitIndices.length && hitIndices[i] === hitIndices[i-1] + 1) {
        if (currentConsecutive === 1) {
          consecutiveStart = i - 1;
        }
        currentConsecutive++;
      } else {
        if (currentConsecutive >= 2) {
          const startIdx = hitIndices[consecutiveStart];
          const endIdx = hitIndices[consecutiveStart + currentConsecutive - 1];
          const issues = [];
          for (let j = consecutiveStart; j < consecutiveStart + currentConsecutive; j++) {
            issues.push(lotteryData[hitIndices[j]].issue);
          }
          console.log(`  ${currentConsecutive}连对: ${issues.join(', ')}`);
        }
        currentConsecutive = 1;
      }
    }
  }
  
  // 计算平均间隔
  const gaps = [];
  if (hitIndices[0] > 30) {
    gaps.push(hitIndices[0] - 30);
  }
  for (let i = 1; i < hitIndices.length; i++) {
    gaps.push(hitIndices[i] - hitIndices[i-1]);
  }
  
  if (gaps.length > 0) {
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    console.log(`\n平均中奖间隔: ${avgGap.toFixed(2)} 期`);
    console.log(`最短中奖间隔: ${Math.min(...gaps)} 期`);
  }
  
  // 显示最近10次命中的详情
  console.log('\n' + '='.repeat(60));
  console.log('\n【最近10次命中记录】');
  console.log('期号      | 开奖号 | 距上次命中');
  console.log('----------|--------|------------');
  
  const recentHits = hitIndices.slice(-10);
  for (let i = 0; i < recentHits.length; i++) {
    const idx = recentHits[i];
    const item = lotteryData[idx];
    let gap = '-';
    if (i > 0) {
      gap = `${idx - recentHits[i-1]} 期`;
    }
    console.log(`${item.issue} | ${item.d1}${item.d2}${item.d3}     | ${gap}`);
  }
}
