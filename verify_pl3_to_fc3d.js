// 验证排列三50期横相加+横相减合并到福彩3D的预测准确率
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';
import { lotteryData as pl3Data } from './pl3-app/src/data/lotteryData.js';

// 计算横相加
function calcHAdd(d1, d2, d3) {
  return [
    (d1 + d2) % 10,
    (d2 + d3) % 10,
    (d1 + d3) % 10
  ];
}

// 计算横相减
function calcHSub(d1, d2, d3) {
  return [
    Math.abs(d1 - d2),
    Math.abs(d2 - d3),
    Math.abs(d1 - d3)
  ];
}

// 找出所有满足横相加条件的号码
function findAllHAddMatches(target) {
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

// 找出所有满足横相减条件的号码
function findAllHSubMatches(target) {
  const matches = [];
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      for (let d3 = 0; d3 <= 9; d3++) {
        const hSub = calcHSub(d1, d2, d3);
        if (hSub[0] === target[0] && hSub[1] === target[1] && hSub[2] === target[2]) {
          matches.push(`${d1}${d2}${d3}`);
        }
      }
    }
  }
  return matches;
}

console.log('排列三50期横相加+横相减合并预测福彩3D - 全量历史验证\n');
console.log(`福彩3D总期数: ${fc3dData.length}`);
console.log(`排列三总期数: ${pl3Data.length}`);

// 取排列三最近50期数据
const pl3Recent = pl3Data.slice(-50);
console.log(`\n排列三最近50期: ${pl3Recent[0].issue} ~ ${pl3Recent[pl3Recent.length-1].issue}`);

// 计算排列三50期的横相加和横相减模式
const pl3HAddPatterns = new Set();
const pl3HSubPatterns = new Set();

for (const item of pl3Recent) {
  const hAdd = calcHAdd(item.d1, item.d2, item.d3);
  const hSub = calcHSub(item.d1, item.d2, item.d3);
  pl3HAddPatterns.add(hAdd.join(''));
  pl3HSubPatterns.add(hSub.join(''));
}

console.log(`排列三横相加模式数: ${pl3HAddPatterns.size}`);
console.log(`排列三横相减模式数: ${pl3HSubPatterns.size}`);

// 根据排列三模式找出所有对应号码
const pl3Matches = new Set();

for (const pattern of pl3HAddPatterns) {
  const target = pattern.split('').map(Number);
  const matches = findAllHAddMatches(target);
  matches.forEach(m => pl3Matches.add(m));
}

for (const pattern of pl3HSubPatterns) {
  const target = pattern.split('').map(Number);
  const matches = findAllHSubMatches(target);
  matches.forEach(m => pl3Matches.add(m));
}

console.log(`排列三模式对应号码总数: ${pl3Matches.size} 注`);

// 验证福彩3D历史数据
let hitCount = 0;
let totalPredictions = 0;
const hitIndices = [];
const hitRecords = [];

for (let i = 0; i < fc3dData.length; i++) {
  const current = fc3dData[i];
  const currentNum = `${current.d1}${current.d2}${current.d3}`;
  const isHit = pl3Matches.has(currentNum);
  
  if (isHit) {
    hitCount++;
    hitIndices.push(i);
    hitRecords.push({
      index: i,
      issue: current.issue,
      actual: currentNum
    });
  }
  
  totalPredictions++;
}

console.log('\n' + '='.repeat(60));
console.log('\n【基本统计】');
console.log(`总验证期数: ${totalPredictions}`);
console.log(`命中期数: ${hitCount}`);
console.log(`准确率: ${(hitCount / totalPredictions * 100).toFixed(4)}%`);
console.log(`候选号码数: ${pl3Matches.size} 注`);
console.log(`理论概率: ${(pl3Matches.size / 1000 * 100).toFixed(2)}%`);

// 计算间隔统计
if (hitIndices.length > 0) {
  // 最长未中奖间隔
  let maxGap = 0;
  let maxGapStart = 0;
  let maxGapEnd = 0;
  
  // 计算第一个命中前的间隔
  if (hitIndices[0] > 0) {
    const gap = hitIndices[0];
    if (gap > maxGap) {
      maxGap = gap;
      maxGapStart = 0;
      maxGapEnd = hitIndices[0] - 1;
    }
  }
  
  // 计算中间的间隔
  for (let i = 1; i < hitIndices.length; i++) {
    const gap = hitIndices[i] - hitIndices[i-1] - 1;
    if (gap > maxGap) {
      maxGap = gap;
      maxGapStart = hitIndices[i-1] + 1;
      maxGapEnd = hitIndices[i] - 1;
    }
  }
  
  // 计算最后一个命中后的间隔
  const lastGap = fc3dData.length - 1 - hitIndices[hitIndices.length - 1];
  if (lastGap > maxGap) {
    maxGap = lastGap;
    maxGapStart = hitIndices[hitIndices.length - 1] + 1;
    maxGapEnd = fc3dData.length - 1;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n【间隔统计】');
  console.log(`最长未中奖间隔: ${maxGap} 期`);
  if (maxGap > 0) {
    const startIssue = fc3dData[maxGapStart]?.issue || 'N/A';
    const endIssue = fc3dData[maxGapEnd]?.issue || 'N/A';
    console.log(`  区间: ${startIssue} ~ ${endIssue}`);
  }
  
  // 检查连对
  let hasConsecutive = false;
  let maxConsecutive = 1;
  let currentConsecutive = 1;
  const consecutiveRecords = [];
  
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
        hasConsecutive = true;
        if (currentConsecutive > maxConsecutive) {
          maxConsecutive = currentConsecutive;
        }
        const issues = [];
        for (let j = consecutiveStart; j < consecutiveStart + currentConsecutive; j++) {
          issues.push(fc3dData[hitIndices[j]].issue);
        }
        consecutiveRecords.push({ count: currentConsecutive, issues });
      }
      currentConsecutive = 1;
    }
  }
  
  console.log(`\n是否有连对: ${hasConsecutive ? '是' : '否'}`);
  if (hasConsecutive) {
    console.log(`最长连对期数: ${maxConsecutive} 期`);
    console.log(`连对出现次数: ${consecutiveRecords.length} 次`);
    
    // 统计各连对次数
    const consecutiveStats = {};
    for (const record of consecutiveRecords) {
      consecutiveStats[record.count] = (consecutiveStats[record.count] || 0) + 1;
    }
    console.log('\n连对分布:');
    for (const [count, times] of Object.entries(consecutiveStats).sort((a, b) => b[0] - a[0])) {
      console.log(`  ${count}连对: ${times} 次`);
    }
  }
  
  // 计算平均间隔
  const gaps = [];
  if (hitIndices[0] > 0) {
    gaps.push(hitIndices[0]);
  }
  for (let i = 1; i < hitIndices.length; i++) {
    gaps.push(hitIndices[i] - hitIndices[i-1]);
  }
  
  if (gaps.length > 0) {
    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    console.log(`\n平均中奖间隔: ${avgGap.toFixed(2)} 期`);
    console.log(`最短中奖间隔: ${Math.min(...gaps)} 期`);
    console.log(`最长中奖间隔: ${Math.max(...gaps)} 期`);
  }
  
  // 显示最近10次命中
  console.log('\n' + '='.repeat(60));
  console.log('\n【最近10次命中记录】');
  console.log('期号      | 开奖号 | 距上次命中');
  console.log('----------|--------|------------');
  
  const recentHits = hitIndices.slice(-10);
  for (let i = 0; i < recentHits.length; i++) {
    const idx = recentHits[i];
    const item = fc3dData[idx];
    let gap = '-';
    if (i > 0) {
      gap = `${idx - recentHits[i-1]} 期`;
    }
    console.log(`${item.issue} | ${item.d1}${item.d2}${item.d3}     | ${gap}`);
  }
  
  // 显示部分命中记录
  console.log('\n' + '='.repeat(60));
  console.log(`\n【部分命中记录（共${hitRecords.length}条，显示前20条）】`);
  console.log('期号      | 开奖号');
  console.log('----------|--------');
  for (const record of hitRecords.slice(0, 20)) {
    console.log(`${record.issue} | ${record.actual}`);
  }
}

// 对比汇总
console.log('\n' + '='.repeat(60));
console.log('\n【对比汇总】');
console.log('┌─────────────────────────┬──────────┬──────────┐');
console.log('│ 模式                    │ 准确率   │ 候选号码 │');
console.log('├─────────────────────────┼──────────┼──────────┤');
console.log('│ 福彩3D 50期合并         │ 40.34%   │ ~406注   │');
console.log(`│ 排列三50期→福彩3D       │ ${(hitCount / totalPredictions * 100).toFixed(2).padStart(5)}%   │ ${pl3Matches.size.toString().padStart(3)}注    │`);
console.log('└─────────────────────────┴──────────┴──────────┘');
