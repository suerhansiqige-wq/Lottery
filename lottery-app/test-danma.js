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

// 基于三个位置的综合遗漏值选出5个胆码
function selectDanma(data, periodIndex) {
  const missing = getMissingAtPeriod(data, periodIndex);
  
  // 计算每个数字在三个位置的平均遗漏值
  const avgMissing = [];
  for (let d = 0; d <= 9; d++) {
    const totalMiss = (missing.d1[d] || 0) + (missing.d2[d] || 0) + (missing.d3[d] || 0);
    avgMissing.push({ digit: d, avg: totalMiss / 3 });
  }
  
  // 按平均遗漏值降序排序，选前5个
  avgMissing.sort((a, b) => b.avg - a.avg);
  return avgMissing.slice(0, 5).map(x => x.digit).sort((a, b) => a - b);
}

// 测试历史命中率
console.log('测试5胆码的历史命中率...\n');

let totalTests = 0;
let hits = 0;
let hitDetails = [];

for (let i = 100; i < lotteryData.length - 1; i++) {
  const danma = selectDanma(lotteryData, i);
  const actual = [lotteryData[i].d1, lotteryData[i].d2, lotteryData[i].d3];
  
  totalTests++;
  
  // 检查开奖号的3个数字是否都在5个胆码中
  const allInDanma = actual.every(d => danma.includes(d));
  if (allInDanma) {
    hits++;
    hitDetails.push({ issue: lotteryData[i].issue, danma, actual });
  }
}

const hitRate = ((hits / totalTests) * 100).toFixed(2);
console.log(`统计范围: 第100期 至 第${lotteryData[lotteryData.length - 2].issue}期`);
console.log(`总测试期数: ${totalTests} 期`);
console.log(`完全命中期数: ${hits} 期（3个开奖号都在5胆码中）`);
console.log(`未命中期数: ${totalTests - hits} 期`);
console.log(`命中率: ${hitRate}%\n`);

if (hitDetails.length > 0) {
  console.log('最近10期完全命中的示例：');
  hitDetails.slice(-10).forEach(h => {
    console.log(`  第${h.issue}期: 胆码[${h.danma.join(',')}] 开奖[${h.actual.join('')}]`);
  });
}

console.log('\n=== 结论 ===');
console.log(`5胆码策略无法达到100%命中率，实际命中率为 ${hitRate}%`);
console.log('这是因为彩票是随机事件，任何预测方法都无法保证绝对正确。');
