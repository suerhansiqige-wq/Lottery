// 验证遗漏策略：三组并集
// 组1: 百位6个最多遗漏 + 十位5个(排除十位最多遗漏) + 个位5个(排除个位最多遗漏)
// 组2: 十位6个最多遗漏 + 百位5个(排除百位最多遗漏) + 个位5个(排除个位最多遗漏)
// 组3: 个位6个最多遗漏 + 百位5个(排除百位最多遗漏) + 十位5个(排除十位最多遗漏)
// 取三组的并集进行验证
import { lotteryData } from './src/data/lotteryData.js';

function getMissingAtPeriod(data, periodIndex) {
  // 计算到 periodIndex 期为止的遗漏值（不包含当期）
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
  // sixPos: 哪个位置用6个最多遗漏，其他位置排除最多遗漏的5个数字（选剩余5个）
  const result = { d1: [], d2: [], d3: [] };

  for (const pos of ['d1', 'd2', 'd3']) {
    const digits = Array.from({ length: 10 }, (_, d) => d);
    // 按遗漏值降序排序
    digits.sort((a, b) => missing[pos][b] - missing[pos][a]);

    if (pos === sixPos) {
      // 这个位置选6个最多遗漏
      result[pos] = digits.slice(0, 6);
    } else {
      // 其他位置：排除最多遗漏的5个数字，选剩余的5个（即遗漏值最小的5个）
      result[pos] = digits.slice(5, 10);
    }
  }

  return result;
}

function generateAllCombinations(selected) {
  // 生成所有三位号码组合
  const combinations = [];
  for (const d1 of selected.d1) {
    for (const d2 of selected.d2) {
      for (const d3 of selected.d3) {
        combinations.push(`${d1}${d2}${d3}`);
      }
    }
  }
  return combinations;
}

function checkHitInSet(actual, numberSet) {
  // 检查实际开奖号是否在号码集合中
  const actualStr = `${actual.d1}${actual.d2}${actual.d3}`;
  return numberSet.has(actualStr);
}

// 主验证逻辑
console.log('开始验证遗漏策略（三组并集）...\n');

const results = [];
let totalTests = 0;
let hitCounts = { d1: 0, d2: 0, d3: 0, full: 0, any2: 0 };
let maxCombinations = 0;
let minCombinations = Infinity;
let maxIssue = '';
let minIssue = '';

// 从第100期开始测试（需要足够的历史数据计算遗漏）
for (let i = 100; i < lotteryData.length; i++) {
  const currentIssue = lotteryData[i].issue;
  const actual = { d1: lotteryData[i].d1, d2: lotteryData[i].d2, d3: lotteryData[i].d3 };

  // 计算到当前期之前的遗漏值
  const missing = getMissingAtPeriod(lotteryData, i);

  // 生成三组选择
  const group1 = selectOneGroup(missing, 'd1'); // 百位6个
  const group2 = selectOneGroup(missing, 'd2'); // 十位6个
  const group3 = selectOneGroup(missing, 'd3'); // 个位6个

  // 生成三组的所有号码组合
  const combos1 = generateAllCombinations(group1);
  const combos2 = generateAllCombinations(group2);
  const combos3 = generateAllCombinations(group3);

  // 取三组的并集（去重）
  const unionSet = new Set([...combos1, ...combos2, ...combos3]);
  const unionSize = unionSet.size;

  // 记录最大最小注数
  if (unionSize > maxCombinations) {
    maxCombinations = unionSize;
    maxIssue = currentIssue;
  }
  if (unionSize < minCombinations) {
    minCombinations = unionSize;
    minIssue = currentIssue;
  }

  // 检查命中情况
  const hit = checkHitInSet(actual, unionSet);

  totalTests++;
  if (hit) hitCounts.full++;

  results.push({
    issue: currentIssue,
    actual: `${actual.d1}${actual.d2}${actual.d3}`,
    groupSizes: {
      g1: combos1.length,
      g2: combos2.length,
      g3: combos3.length
    },
    unionSize: unionSet.size,
    hit: hit ? '✓' : '✗'
  });
}

// 输出统计结果
console.log('=== 验证结果统计 ===\n');
console.log(`总测试期数: ${totalTests}`);
console.log(`直选命中率: ${(hitCounts.full / totalTests * 100).toFixed(2)}% (${hitCounts.full}/${totalTests})`);

console.log('\n=== 组合注数统计 ===\n');
const avgUnionSize = results.reduce((s, r) => s + r.unionSize, 0) / totalTests;
console.log(`每组基础注数: ${results[0].groupSizes.g1} + ${results[0].groupSizes.g2} + ${results[0].groupSizes.g3} = ${results[0].groupSizes.g1 + results[0].groupSizes.g2 + results[0].groupSizes.g3} 注（去重前）`);
console.log(`最多注数（去重后）: ${maxCombinations} 注（期号${maxIssue}）`);
console.log(`最少注数（去重后）: ${minCombinations} 注（期号${minIssue}）`);
console.log(`平均注数（去重后）: ${avgUnionSize.toFixed(1)} 注`);

// 输出最新一期（最后一期数据）的组号详情
console.log('\n=== 最新一期组号详情 ===\n');
const lastResult = results[results.length - 1];
const lastData = lotteryData[lotteryData.length - 1];
// 计算到最后一期的遗漏值（用于预测下一期）
const lastMissing = getMissingAtPeriod(lotteryData, lotteryData.length);

const lastGroup1 = selectOneGroup(lastMissing, 'd1');
const lastGroup2 = selectOneGroup(lastMissing, 'd2');
const lastGroup3 = selectOneGroup(lastMissing, 'd3');

const lastCombos1 = generateAllCombinations(lastGroup1);
const lastCombos2 = generateAllCombinations(lastGroup2);
const lastCombos3 = generateAllCombinations(lastGroup3);
const lastUnionSet = new Set([...lastCombos1, ...lastCombos2, ...lastCombos3]);

// 计算下一期期号
const nextIssueNum = parseInt(lastData.issue) + 1;
const nextIssue = nextIssueNum.toString();

console.log(`预测期号: ${nextIssue} 期`);
console.log(`基于数据期号: ${lastData.issue} 期（开奖 ${lastData.d1}${lastData.d2}${lastData.d3}）`);

// 输出每位最多遗漏的6个数字
console.log(`\n=== 每位最多遗漏6个数字 ===`);
const digits = Array.from({ length: 10 }, (_, d) => d);
for (const pos of ['d1', 'd2', 'd3']) {
  const posDigits = [...digits];
  posDigits.sort((a, b) => lastMissing[pos][b] - lastMissing[pos][a]);
  const top6 = posDigits.slice(0, 6);
  const posName = pos === 'd1' ? '百位' : pos === 'd2' ? '十位' : '个位';
  console.log(`${posName}: [${top6.join(',')}]`);
  console.log(`  遗漏值: ${top6.map(d => lastMissing[pos][d]).join(',')}`);
}

console.log(`\n组1（百位6个最多遗漏+十位5个冷号+个位5个冷号）:`);
console.log(`  百位候选: [${lastGroup1.d1.join(',')}]`);
console.log(`  十位候选: [${lastGroup1.d2.join(',')}]`);
console.log(`  个位候选: [${lastGroup1.d3.join(',')}]`);
console.log(`  共 ${lastCombos1.length} 注`);

console.log(`\n组2（十位6个最多遗漏+百位5个冷号+个位5个冷号）:`);
console.log(`  百位候选: [${lastGroup2.d1.join(',')}]`);
console.log(`  十位候选: [${lastGroup2.d2.join(',')}]`);
console.log(`  个位候选: [${lastGroup2.d3.join(',')}]`);
console.log(`  共 ${lastCombos2.length} 注`);

console.log(`\n组3（个位6个最多遗漏+百位5个冷号+十位5个冷号）:`);
console.log(`  百位候选: [${lastGroup3.d1.join(',')}]`);
console.log(`  十位候选: [${lastGroup3.d2.join(',')}]`);
console.log(`  个位候选: [${lastGroup3.d3.join(',')}]`);
console.log(`  共 ${lastCombos3.length} 注`);

console.log(`\n三组并集: ${lastUnionSet.size} 注`);
console.log(`\n完整号码列表（已排序）:`);
const sortedNumbers = Array.from(lastUnionSet).sort();
// 每行显示10个号码
for (let i = 0; i < sortedNumbers.length; i += 10) {
  console.log(sortedNumbers.slice(i, i + 10).join('  '));
}

// 保存为文件
import { writeFileSync } from 'fs';
import { join } from 'path';

const outputFile = join(process.cwd(), `prediction-${nextIssue}.txt`);
const content = [
  `福彩3D 第${nextIssue}期 遗漏策略预测`,
  `生成时间: ${new Date().toLocaleString('zh-CN')}`,
  `基于数据: 第${lastData.issue}期（开奖 ${lastData.d1}${lastData.d2}${lastData.d3}）`,
  '',
  '=== 三组候选数字 ===',
  `组1（百位6个最多遗漏+十位5个冷号+个位5个冷号）:`,
  `  百位: [${lastGroup1.d1.join(',')}]`,
  `  十位: [${lastGroup1.d2.join(',')}]`,
  `  个位: [${lastGroup1.d3.join(',')}]`,
  '',
  `组2（十位6个最多遗漏+百位5个冷号+个位5个冷号）:`,
  `  百位: [${lastGroup2.d1.join(',')}]`,
  `  十位: [${lastGroup2.d2.join(',')}]`,
  `  个位: [${lastGroup2.d3.join(',')}]`,
  '',
  `组3（个位6个最多遗漏+百位5个冷号+十位5个冷号）:`,
  `  百位: [${lastGroup3.d1.join(',')}]`,
  `  十位: [${lastGroup3.d2.join(',')}]`,
  `  个位: [${lastGroup3.d3.join(',')}]`,
  '',
  `=== 并集统计 ===`,
  `总注数: ${sortedNumbers.length} 注`,
  '',
  '=== 完整号码列表 ===',
  // 每行10个号码
  ...Array.from({ length: Math.ceil(sortedNumbers.length / 10) }, (_, i) => 
    sortedNumbers.slice(i * 10, i * 10 + 10).join('  ')
  )
].join('\n');

writeFileSync(outputFile, content, 'utf-8');
console.log(`\n✓ 已保存到文件: ${outputFile}`);

console.log('\n=== 最近20期详情 ===\n');
results.slice(-20).forEach(r => {
  console.log(`期号${r.issue}: 开奖${r.actual} | 组1[${r.groupSizes.g1}] 组2[${r.groupSizes.g2}] 组3[${r.groupSizes.g3}] | 并集${r.unionSize}注 | 命中:${r.hit}`);
});

// 导出结果供前端使用
export const verificationResults = results;
export const statistics = {
  totalTests,
  hitCounts,
  rates: {
    d1: (hitCounts.d1 / totalTests * 100).toFixed(2),
    d2: (hitCounts.d2 / totalTests * 100).toFixed(2),
    d3: (hitCounts.d3 / totalTests * 100).toFixed(2),
    any2: (hitCounts.any2 / totalTests * 100).toFixed(2),
    full: (hitCounts.full / totalTests * 100).toFixed(2)
  }
};
