const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

// 模拟FullDataTable中的双飞算法
let hits = 0, total = 0, misses = 0;
const missDetails = [];

for (let i = 0; i < data.length - 1; i++) {
  const item = data[i];
  const freq = new Array(10).fill(0);
  for (let j = Math.max(0, i - 4); j <= i; j++) {
    freq[data[j].d1]++; freq[data[j].d2]++; freq[data[j].d3]++;
  }
  const hot = freq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
  const digits = [item.d1, item.d2, item.d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pool = [...hot, sum % 10, span, item.d1];
  const unique8 = [...new Set(pool)];
  let fill = 0;
  while (unique8.length < 8) { if (!unique8.includes(fill)) unique8.push(fill); fill++; }
  const codes = unique8.slice(0, 8);
  const pairs = [[codes[0],codes[1]],[codes[2],codes[3]],[codes[4],codes[5]]];

  const next = data[i + 1];
  if (next.d1 === undefined) continue;
  const nextDigits = [next.d1, next.d2, next.d3];
  total++;

  const hit = pairs.some(([a, b]) => nextDigits.includes(a) && nextDigits.includes(b));
  if (hit) hits++; else { misses++; missDetails.push({ issue: item.issue, codes, pairs, next: `${next.d1}${next.d2}${next.d3}` }); }
}

console.log(`=== 双飞真实命中率（${data.length-1}期回测）===\n`);
console.log(`总期数: ${total}`);
console.log(`命中(✓): ${hits}  未中(✗): ${misses}`);
console.log(`真实命中率: ${(hits/total*100).toFixed(1)}%`);

// 分析未命中的情况：8码中有几个数字出现在下期？
let digitHitDist = [0,0,0,0]; // 0个,1个,2个,3个命中
for (const m of missDetails) {
  const hitCount = [...new Set(m.next.split('').map(Number))].filter(d => m.codes.includes(d)).length;
  digitHitDist[hitCount]++;
}
console.log(`\n未命中${misses}期中，8码实际命中数字分布：`);
console.log(`  8码中0个出现: ${digitHitDist[0]}期`);
console.log(`  8码中1个出现: ${digitHitDist[1]}期`);
console.log(`  8码中2个出现: ${digitHitDist[2]}期  ← 2个命中但不在同一组！`);
console.log(`  8码中3个出现: ${digitHitDist[3]}期  ← 3个命中但没有完整一对！`);

// 理论分析
console.log(`\n=== 为什么不是94.6%？===`);
console.log(`94.6% = "8码中至少2个数字出现"的概率`);
console.log(`但"双飞"要求 = "同一组的2个数字都出现"`);
console.log(`8码分3组+2余码，2个命中数字可能分散在不同组 → 不算双飞命中`);
console.log(`\n实际双飞命中率 ≈ ${(hits/total*100).toFixed(1)}%，远低于94.6%`);
