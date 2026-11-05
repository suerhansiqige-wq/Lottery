// 多维度FC3D号码生成系统
// 基于福彩3D分析系统历史数据，不依赖Excel

const fs = require('fs');
const path = require('path');

// 读取lotteryData.js
const lotteryDataPath = path.join(__dirname, 'src/data/lotteryData.js');
const content = fs.readFileSync(lotteryDataPath, 'utf-8');

// 提取lotteryData数组
const match = content.match(/export const lotteryData = (\[[\s\S]*?\]);/);
if (!match) {
  console.error('无法解析lotteryData');
  process.exit(1);
}

const allData = eval(match[1]);
console.log(`总期数: ${allData.length}`);
console.log(`数据范围: ${allData[0].issue} - ${allData[allData.length-1].issue}\n`);

// 多维度分析函数
function analyzeDimensions(data, currentIdx) {
  const recent = data.slice(Math.max(0, currentIdx - 100), currentIdx);
  const veryRecent = data.slice(Math.max(0, currentIdx - 10), currentIdx);
  
  // 1. 频率分析（热号/冷号）
  const freq = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  recent.forEach(item => {
    freq.d1[item.d1]++;
    freq.d2[item.d2]++;
    freq.d3[item.d3]++;
  });
  
  // 2. 遗漏值分析
  const missing = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  for (let pos = 0; pos < 3; pos++) {
    const key = ['d1', 'd2', 'd3'][pos];
    for (let v = 0; v <= 9; v++) {
      let miss = 0;
      for (let i = currentIdx - 1; i >= Math.max(0, currentIdx - 100); i--) {
        if (data[i][key] === v) break;
        miss++;
      }
      missing[key][v] = miss;
    }
  }
  
  // 3. 和值趋势
  const sumRecent = veryRecent.map(d => d.d1 + d.d2 + d.d3);
  const avgSum = sumRecent.reduce((a, b) => a + b, 0) / sumRecent.length;
  
  // 4. 跨度趋势
  const spanRecent = veryRecent.map(d => Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3));
  const avgSpan = spanRecent.reduce((a, b) => a + b, 0) / spanRecent.length;
  
  // 5. 奇偶平衡
  const oddEvenRecent = veryRecent.map(d => {
    const oddCount = [d.d1, d.d2, d.d3].filter(x => x % 2 === 1).length;
    return oddCount;
  });
  const avgOdd = oddEvenRecent.reduce((a, b) => a + b, 0) / oddEvenRecent.length;
  
  // 6. 大小平衡
  const bigSmallRecent = veryRecent.map(d => {
    const bigCount = [d.d1, d.d2, d.d3].filter(x => x >= 5).length;
    return bigCount;
  });
  const avgBig = bigSmallRecent.reduce((a, b) => a + b, 0) / bigSmallRecent.length;
  
  // 7. 位置相关性（前后期关系）
  const prev = data[currentIdx - 1];
  const prev2 = data[currentIdx - 2];
  
  return {
    freq,
    missing,
    avgSum,
    avgSpan,
    avgOdd,
    avgBig,
    prev,
    prev2,
    recent
  };
}

// 评分系统：为每个号码打分
function scoreNumber(num, dims) {
  const d1 = Math.floor(num / 100);
  const d2 = Math.floor((num % 100) / 10);
  const d3 = num % 10;
  const digits = [d1, d2, d3];
  
  let score = 0;
  
  // 1. 频率得分（热号加分）
  const freqScore = (dims.freq.d1[d1] + dims.freq.d2[d2] + dims.freq.d3[d3]) / 3;
  score += freqScore * 2;
  
  // 2. 遗漏值得分（高遗漏加分，即将回补）
  const missScore = (dims.missing.d1[d1] + dims.missing.d2[d2] + dims.missing.d3[d3]) / 3;
  score += missScore * 3;
  
  // 3. 和值接近度（接近平均和值加分）
  const sum = d1 + d2 + d3;
  const sumDiff = Math.abs(sum - dims.avgSum);
  score += Math.max(0, 10 - sumDiff) * 2;
  
  // 4. 跨度接近度（接近平均跨度加分）
  const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
  const spanDiff = Math.abs(span - dims.avgSpan);
  score += Math.max(0, 5 - spanDiff) * 2;
  
  // 5. 奇偶平衡（接近平均奇偶数加分）
  const oddCount = digits.filter(x => x % 2 === 1).length;
  const oddDiff = Math.abs(oddCount - dims.avgOdd);
  score += Math.max(0, 3 - oddDiff);
  
  // 6. 大小平衡（接近平均大小数加分）
  const bigCount = digits.filter(x => x >= 5).length;
  const bigDiff = Math.abs(bigCount - dims.avgBig);
  score += Math.max(0, 3 - bigDiff);
  
  // 7. 避免豹子
  if (d1 === d2 && d2 === d3) {
    score -= 20;
  }
  
  // 8. 位置延续性（与上期相同位置加分）
  if (d1 === dims.prev.d1) score += 1;
  if (d2 === dims.prev.d2) score += 1;
  if (d3 === dims.prev.d3) score += 1;
  
  // 9. 避免重复上期
  if (d1 === dims.prev.d1 && d2 === dims.prev.d2 && d3 === dims.prev.d3) {
    score -= 30;
  }
  
  return score;
}

// 生成预测号码
function generatePredictions(data, currentIdx, topN = 650) {
  const dims = analyzeDimensions(data, currentIdx);
  
  // 为所有1000个号码打分
  const scores = [];
  for (let num = 0; num < 1000; num++) {
    const score = scoreNumber(num, dims);
    scores.push({ num, score });
  }
  
  // 按分数排序，取前N个
  scores.sort((a, b) => b.score - a.score);
  const topNumbers = scores.slice(0, topN);
  
  return topNumbers.map(s => String(s.num).padStart(3, '0'));
}

// 回测验证
console.log("=== 多维度号码生成系统回测 ===\n");

const testPeriods = 100; // 测试最近100期
const startIdx = allData.length - testPeriods;
let totalHit = 0;
let totalPred = 0;
const details = [];

for (let i = startIdx; i < allData.length; i++) {
  const current = allData[i];
  const predictions = generatePredictions(allData, i, 650);
  const actual = `${current.d1}${current.d2}${current.d3}`;
  const hit = predictions.includes(actual);
  
  if (hit) totalHit++;
  totalPred++;
  
  details.push({
    issue: current.issue,
    actual,
    hit,
    predCount: predictions.length
  });
}

const hitRate = (totalHit / totalPred * 100).toFixed(1);
console.log(`测试期数: ${totalPred}`);
console.log(`命中: ${totalHit} (${hitRate}%)`);
console.log(`平均注数: 650\n`);

// 显示最近20期详情
console.log("最近20期详情:");
const last20 = details.slice(-20);
for (const d of last20) {
  console.log(`  ${d.issue}: ${d.hit ? '✓' : '✗'} 开奖=${d.actual} (${d.predCount}注)`);
}

// 分析未中期特征
const misses = details.filter(d => !d.hit);
console.log(`\n未中分析 (${misses.length}期):`);
if (misses.length > 0 && misses.length <= 10) {
  console.log(`  未中期号: ${misses.map(d => d.issue).join(', ')}`);
}

// 连续命中统计
let maxHitStreak = 0, curHitStreak = 0;
let maxMissStreak = 0, curMissStreak = 0;
for (const d of details) {
  if (d.hit) {
    curHitStreak++;
    curMissStreak = 0;
    if (curHitStreak > maxHitStreak) maxHitStreak = curHitStreak;
  } else {
    curMissStreak++;
    curHitStreak = 0;
    if (curMissStreak > maxMissStreak) maxMissStreak = curMissStreak;
  }
}

console.log(`\n连续统计:`);
console.log(`  最长连续命中: ${maxHitStreak}`);
console.log(`  最长连续未中: ${maxMissStreak}`);

// 生成下一期预测
console.log("\n=== 下一期预测 ===");
const nextPred = generatePredictions(allData, allData.length, 650);
console.log(`生成${nextPred.length}注号码`);
console.log(`前20注: ${nextPred.slice(0, 20).join(', ')}`);
console.log(`...`);
console.log(`后20注: ${nextPred.slice(-20).join(', ')}`);

// 保存预测结果
const outputPath = path.join(__dirname, 'multi_dim_prediction.json');
fs.writeFileSync(outputPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  totalPeriods: allData.length,
  testHitRate: hitRate,
  predictions: nextPred
}, null, 2));
console.log(`\n预测结果已保存到: ${outputPath}`);
