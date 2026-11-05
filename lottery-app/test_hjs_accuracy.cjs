// 验证往期开奖号的横加减准确率
const { lotteryData } = require('./src/data/lotteryData.js');

// 横相减：|百-十| |十-个| |百-个|
function hSub(d1, d2, d3) {
  return [
    Math.abs(d1 - d2),
    Math.abs(d2 - d3),
    Math.abs(d1 - d3)
  ];
}

// 横相加：(百+十)取尾 (十+个)取尾 (百+个)取尾
function hAdd(d1, d2, d3) {
  return [
    (d1 + d2) % 10,
    (d2 + d3) % 10,
    (d1 + d3) % 10
  ];
}

console.log(`总数据量：${lotteryData.length} 期\n`);

// 统计横相减和横相加的分布
const hSubCount = {};
const hAddCount = {};

for (const item of lotteryData) {
  const hs = hSub(item.d1, item.d2, item.d3).join(',');
  const ha = hAdd(item.d1, item.d2, item.d3).join(',');
  
  hSubCount[hs] = (hSubCount[hs] || 0) + 1;
  hAddCount[ha] = (hAddCount[ha] || 0) + 1;
}

// 显示横相减 TOP 10
console.log('=== 横相减出现频率 TOP 10 ===');
const hSubSorted = Object.entries(hSubCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [pattern, count] of hSubSorted) {
  console.log(`${pattern}: ${count} 次 (${(count/lotteryData.length*100).toFixed(2)}%)`);
}

// 显示横相加 TOP 10
console.log('\n=== 横相加出现频率 TOP 10 ===');
const hAddSorted = Object.entries(hAddCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [pattern, count] of hAddSorted) {
  console.log(`${pattern}: ${count} 次 (${(count/lotteryData.length*100).toFixed(2)}%)`);
}

// 验证 2,8,6 模式的历史出现
console.log('\n=== 横相减 = 2,8,6 的历史开奖 ===');
const hSub286History = [];
for (const item of lotteryData) {
  const hs = hSub(item.d1, item.d2, item.d3);
  if (hs[0] === 2 && hs[1] === 8 && hs[2] === 6) {
    hSub286History.push(`${item.issue}: ${item.d1}${item.d2}${item.d3}`);
  }
}
console.log(`共出现 ${hSub286History.length} 次`);
console.log(hSub286History.slice(0, 20).join('\n'));

console.log('\n=== 横相加 = 2,8,6 的历史开奖 ===');
const hAdd286History = [];
for (const item of lotteryData) {
  const ha = hAdd(item.d1, item.d2, item.d3);
  if (ha[0] === 2 && ha[1] === 8 && ha[2] === 6) {
    hAdd286History.push(`${item.issue}: ${item.d1}${item.d2}${item.d3}`);
  }
}
console.log(`共出现 ${hAdd286History.length} 次`);
console.log(hAdd286History.slice(0, 20).join('\n'));

// 计算任意横加减模式的覆盖率（最近100期）
console.log('\n=== 最近100期横加减模式分析 ===');
const recent100 = lotteryData.slice(-100);
const recentHSub = new Set();
const recentHAdd = new Set();

for (const item of recent100) {
  recentHSub.add(hSub(item.d1, item.d2, item.d3).join(','));
  recentHAdd.add(hAdd(item.d1, item.d2, item.d3).join(','));
}

console.log(`最近100期出现 ${recentHSub.size} 种横相减模式`);
console.log(`最近100期出现 ${recentHAdd.size} 种横相加模式`);

// 显示最近10期的横加减
console.log('\n=== 最近10期开奖号及横加减 ===');
const recent10 = lotteryData.slice(-10);
for (const item of recent10) {
  const hs = hSub(item.d1, item.d2, item.d3).join('');
  const ha = hAdd(item.d1, item.d2, item.d3).join('');
  console.log(`${item.issue}: ${item.d1}${item.d2}${item.d3} | 横相减:${hs} | 横相加:${ha}`);
}
