// 验证开奖号横相减在下期重复出现的准确率
const { lotteryData } = require('./src/data/lotteryData.js');

// 横相减：|百-十| |十-个| |百-个|
function hSub(d1, d2, d3) {
  return [
    Math.abs(d1 - d2),
    Math.abs(d2 - d3),
    Math.abs(d1 - d3)
  ];
}

console.log(`总数据量：${lotteryData.length} 期\n`);

// 统计连续两期横相减完全相同的次数
let exactMatch = 0;
const matchDetails = [];

for (let i = 1; i < lotteryData.length; i++) {
  const prev = lotteryData[i - 1];
  const curr = lotteryData[i];
  
  const prevHSub = hSub(prev.d1, prev.d2, prev.d3);
  const currHSub = hSub(curr.d1, curr.d2, curr.d3);
  
  // 完全匹配
  if (prevHSub[0] === currHSub[0] && 
      prevHSub[1] === currHSub[1] && 
      prevHSub[2] === currHSub[2]) {
    exactMatch++;
    matchDetails.push({
      prevIssue: prev.issue,
      prevNum: `${prev.d1}${prev.d2}${prev.d3}`,
      currIssue: curr.issue,
      currNum: `${curr.d1}${curr.d2}${curr.d3}`,
      pattern: prevHSub.join(',')
    });
  }
}

console.log(`=== 横相减连续两期完全相同 ===`);
console.log(`总期数：${lotteryData.length - 1} 对（相邻期）`);
console.log(`完全匹配：${exactMatch} 次`);
console.log(`命中率：${(exactMatch / (lotteryData.length - 1) * 100).toFixed(2)}%\n`);

// 显示最近20次匹配
console.log('=== 最近20次匹配记录 ===');
const recent20 = matchDetails.slice(-20);
for (const m of recent20) {
  console.log(`${m.prevIssue}(${m.prevNum}) → ${m.currIssue}(${m.currNum}) | 横相减:${m.pattern}`);
}

// 统计部分匹配（3个位置中匹配N个）
let match3 = 0; // 3个位置都匹配（即完全匹配）
let match2 = 0; // 2个位置匹配
let match1 = 0; // 1个位置匹配
let match0 = 0; // 0个位置匹配

for (let i = 1; i < lotteryData.length; i++) {
  const prev = lotteryData[i - 1];
  const curr = lotteryData[i];
  
  const prevHSub = hSub(prev.d1, prev.d2, prev.d3);
  const currHSub = hSub(curr.d1, curr.d2, curr.d3);
  
  let count = 0;
  for (let j = 0; j < 3; j++) {
    if (prevHSub[j] === currHSub[j]) count++;
  }
  
  if (count === 3) match3++;
  else if (count === 2) match2++;
  else if (count === 1) match1++;
  else match0++;
}

console.log('\n=== 横相减位置匹配分布 ===');
console.log(`3位全匹配：${match3} 次 (${(match3/(lotteryData.length-1)*100).toFixed(2)}%)`);
console.log(`2位匹配：${match2} 次 (${(match2/(lotteryData.length-1)*100).toFixed(2)}%)`);
console.log(`1位匹配：${match1} 次 (${(match1/(lotteryData.length-1)*100).toFixed(2)}%)`);
console.log(`0位匹配：${match0} 次 (${(match0/(lotteryData.length-1)*100).toFixed(2)}%)`);

// 单个位置的命中率
let pos1Match = 0, pos2Match = 0, pos3Match = 0;
for (let i = 1; i < lotteryData.length; i++) {
  const prev = lotteryData[i - 1];
  const curr = lotteryData[i];
  
  const prevHSub = hSub(prev.d1, prev.d2, prev.d3);
  const currHSub = hSub(curr.d1, curr.d2, curr.d3);
  
  if (prevHSub[0] === currHSub[0]) pos1Match++;
  if (prevHSub[1] === currHSub[1]) pos2Match++;
  if (prevHSub[2] === currHSub[2]) pos3Match++;
}

console.log('\n=== 单个位置命中率 ===');
console.log(`位置1（|百-十|）：${pos1Match} 次 (${(pos1Match/(lotteryData.length-1)*100).toFixed(2)}%)`);
console.log(`位置2（|十-个|）：${pos2Match} 次 (${(pos2Match/(lotteryData.length-1)*100).toFixed(2)}%)`);
console.log(`位置3（|百-个|）：${pos3Match} 次 (${(pos3Match/(lotteryData.length-1)*100).toFixed(2)}%)`);

// 最近10期的连续对比
console.log('\n=== 最近10期横相减连续对比 ===');
const recent10 = lotteryData.slice(-11);
for (let i = 1; i < recent10.length; i++) {
  const prev = recent10[i - 1];
  const curr = recent10[i];
  
  const prevHSub = hSub(prev.d1, prev.d2, prev.d3).join('');
  const currHSub = hSub(curr.d1, curr.d2, curr.d3).join('');
  const match = prevHSub === currHSub ? '✓ 相同' : '✗ 不同';
  
  console.log(`${prev.issue}(${prev.d1}${prev.d2}${prev.d3},横相减:${prevHSub}) → ${curr.issue}(${curr.d1}${curr.d2}${curr.d3},横相减:${currHSub}) ${match}`);
}
