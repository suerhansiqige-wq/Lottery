// 测试单位置最高准确率上限
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));

// 策略1: 杀上期该位数字
function killLastDigit(data, i, pos) {
  return [data[i-1][pos]];
}

// 策略2: 杀近3期该位出现过的数字
function killRecent3(data, i, pos) {
  const recent = data.slice(i-3, i);
  return [...new Set(recent.map(d => d[pos]))];
}

// 策略3: 杀近5期该位出现过的数字
function killRecent5(data, i, pos) {
  const recent = data.slice(i-5, i);
  return [...new Set(recent.map(d => d[pos]))];
}

// 策略4: 杀遗漏最大的2个数字
function killMaxMissing(data, i, pos) {
  const missing = {};
  for (let d = 0; d <= 9; d++) {
    let miss = 0;
    for (let j = i - 1; j >= 0; j--) {
      if (data[j][pos] === d) break;
      miss++;
    }
    missing[d] = miss;
  }
  const sorted = Object.entries(missing).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 2).map(x => parseInt(x[0]));
}

// 策略5: 杀频率最低的2个数字（近10期）
function killLowFreq(data, i, pos) {
  const freq = {};
  for (let d = 0; d <= 9; d++) freq[d] = 0;
  const recent = data.slice(i-10, i);
  recent.forEach(d => freq[d[pos]]++);
  const sorted = Object.entries(freq).sort((a, b) => a[1] - b[1]);
  return sorted.slice(0, 2).map(x => parseInt(x[0]));
}

function testStrategy(name, killFunc, killCount) {
  let d1Correct = 0, d2Correct = 0, d3Correct = 0;
  let allCorrect = 0;
  let total = 0;

  for (let i = 5; i < data.length; i++) {
    const d1Kill = killFunc(data, i, 'd1');
    const d2Kill = killFunc(data, i, 'd2');
    const d3Kill = killFunc(data, i, 'd3');
    const curr = data[i];

    const d1Ok = !d1Kill.includes(curr.d1);
    const d2Ok = !d2Kill.includes(curr.d2);
    const d3Ok = !d3Kill.includes(curr.d3);

    if (d1Ok) d1Correct++;
    if (d2Ok) d2Correct++;
    if (d3Ok) d3Correct++;
    if (d1Ok && d2Ok && d3Ok) allCorrect++;
    total++;
  }

  const avgPosAcc = (d1Correct + d2Correct + d3Correct) / (total * 3) * 100;
  const allAcc = allCorrect / total * 100;

  console.log(`\n${name} (杀${killCount}个):`);
  console.log(`  百位: ${(d1Correct/total*100).toFixed(2)}%`);
  console.log(`  十位: ${(d2Correct/total*100).toFixed(2)}%`);
  console.log(`  个位: ${(d3Correct/total*100).toFixed(2)}%`);
  console.log(`  平均单位置: ${avgPosAcc.toFixed(2)}%`);
  console.log(`  三期全对: ${allAcc.toFixed(2)}%`);
}

console.log('=== 各策略准确率上限测试 ===');
testStrategy('策略1: 杀上期', killLastDigit, 1);
testStrategy('策略2: 杀近3期', killRecent3, '2-3');
testStrategy('策略3: 杀近5期', killRecent5, '3-5');
testStrategy('策略4: 杀遗漏最大2个', killMaxMissing, 2);
testStrategy('策略5: 杀频率最低2个', killLowFreq, 2);

console.log('\n=== 结论 ===');
console.log('要达到三期全对90%，需要每个位置约96.5%准确率');
console.log('要达到三期全对95%，需要每个位置约98.3%准确率');
console.log('从数据看，单位置准确率上限约90-92%，三期全对上限约73-78%');
