const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

function verify3Pairs(pickFn, name) {
  let atLeast1 = 0, total = 0;
  let pairHits = [0, 0, 0];
  let uniqueDigits = 0; // 平均覆盖的不同数字数

  for (let i = 0; i < data.length - 1; i++) {
    const pairs = pickFn(data, i);
    if (!pairs || pairs.length < 3) continue;
    const next = data[i + 1];
    const nextDigits = [next.d1, next.d2, next.d3];
    total++;

    const allDigits = new Set();
    let hitCount = 0;
    for (let p = 0; p < 3; p++) {
      const [a, b] = pairs[p];
      if (a !== b) { allDigits.add(a); allDigits.add(b); }
      if (a === b) continue;
      if (nextDigits.includes(a) && nextDigits.includes(b)) {
        hitCount++;
        pairHits[p]++;
      }
    }
    uniqueDigits += allDigits.size;
    if (hitCount >= 1) atLeast1++;
  }

  const rate1 = total > 0 ? (atLeast1 / total * 100).toFixed(1) : 0;
  const avgUnique = total > 0 ? (uniqueDigits / total).toFixed(1) : 0;
  return { name, atLeast1, total, rate1: parseFloat(rate1), pairHits, avgUnique: parseFloat(avgUnique) };
}

console.log('=== 三组双飞：数字不重叠策略对比 ===\n');
console.log('关键：6个数字不重复 → 覆盖C(6,2)中更多组合 → 提高至少1组全中概率\n');

const results = [];

// 1. 十位+个位 / 和值个位+跨度 / 百位+对码(百位) — 尽量不重叠
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  return [
    [d[i].d2, d[i].d3],
    [sum % 10, span],
    [d[i].d1, pair(d[i].d1)]
  ];
}, '十+个 / 和值个位+跨度 / 百+百对码'));

// 2. 十位+个位 / 邻码TOP2 / 冷号TOP2（已测16.8%，基准）
results.push(verify3Pairs((d, i) => {
  const nFreq = new Array(10).fill(0);
  [d[i].d1, d[i].d2, d[i].d3].forEach(n => {
    if (n > 0) nFreq[n - 1]++; if (n < 9) nFreq[n + 1]++;
  });
  const neighborTop = nFreq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
  const lastSeen = new Array(10).fill(-1);
  for (let j = i; j >= Math.max(0, i - 29); j--) {
    [d[j].d1, d[j].d2, d[j].d3].forEach(n => { if (lastSeen[n] === -1) lastSeen[n] = i - j; });
  }
  const coldTop = lastSeen.map((v, n) => [n, v]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
  return [[d[i].d2, d[i].d3], [neighborTop[0], neighborTop[1]], [coldTop[0], coldTop[1]]];
}, '十+个 / 邻码TOP2 / 冷号TOP2 [基准]'));

// 3. 十位+个位 / 和值个位+对码(和值) / 跨度+对码(跨度)
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  return [
    [d[i].d2, d[i].d3],
    [sum % 10, pair(sum % 10)],
    [span, pair(span)]
  ];
}, '十+个 / 和值个位+对码 / 跨度+对码'));

// 4. 十位+对码(十位) / 个位+对码(个位) / 和值个位+跨度
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  return [
    [d[i].d2, pair(d[i].d2)],
    [d[i].d3, pair(d[i].d3)],
    [sum % 10, span]
  ];
}, '十+十对码 / 个+个对码 / 和值个位+跨度'));

// 5. 012路各取1个代表，组成3组
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const groups = [[0, 3, 6, 9], [1, 4, 7], [2, 5, 8]];
  // 从每组中选一个最接近和值个位的
  const target = sum % 10;
  const picks = groups.map(g => g.reduce((best, n) => Math.abs(n - target) < Math.abs(best - target) ? n : best, g[0]));
  return [
    [picks[0], picks[1]],
    [picks[1], picks[2]],
    [picks[0], picks[2]]
  ];
}, '012路代表3组'));

// 6. 十位+个位 / 百位+和值个位 / 跨度+邻码TOP1
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const nFreq = new Array(10).fill(0);
  digits.forEach(n => { if (n > 0) nFreq[n - 1]++; if (n < 9) nFreq[n + 1]++; });
  const neighborTop = nFreq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1])[0][0];
  return [
    [d[i].d2, d[i].d3],
    [d[i].d1, sum % 10],
    [span, neighborTop]
  ];
}, '十+个 / 百+和值个位 / 跨度+邻码'));

// 7. 十位+个位 / 和值十位+跨度 / 百位+对码(和值个位)
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  return [
    [d[i].d2, d[i].d3],
    [Math.floor(sum / 10) % 10, span],
    [d[i].d1, pair(sum % 10)]
  ];
}, '十+个 / 和值十位+跨度 / 百+和值对码'));

// 8. 3组完全不重叠：从6个不同来源各取1个，两两配对
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  // 6个来源：十位、个位、和值个位、跨度、百位对码、和值对码
  const pool = [d[i].d2, d[i].d3, sum % 10, span, pair(d[i].d1), pair(sum % 10)];
  // 去重
  const unique = [...new Set(pool)];
  if (unique.length >= 6) return [
    [unique[0], unique[1]],
    [unique[2], unique[3]],
    [unique[4], unique[5]]
  ];
  // 不够6个则补充
  while (unique.length < 6) {
    const candidate = (unique[unique.length - 1] + 3) % 10;
    if (!unique.includes(candidate)) unique.push(candidate);
    else unique.push((candidate + 1) % 10);
  }
  return [
    [unique[0], unique[1]],
    [unique[2], unique[3]],
    [unique[4], unique[5]]
  ];
}, '6源去重均分3组'));

// 9. 十位+个位 / 和值个位+对码(和值) / 邻码TOP1+冷号TOP1
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const pair = n => (n + 5) % 10;
  const nFreq = new Array(10).fill(0);
  digits.forEach(n => { if (n > 0) nFreq[n - 1]++; if (n < 9) nFreq[n + 1]++; });
  const neighborTop = nFreq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1])[0][0];
  const lastSeen = new Array(10).fill(-1);
  for (let j = i; j >= Math.max(0, i - 29); j--) {
    [d[j].d1, d[j].d2, d[j].d3].forEach(n => { if (lastSeen[n] === -1) lastSeen[n] = i - j; });
  }
  const coldTop = lastSeen.map((v, n) => [n, v]).sort((a, b) => b[1] - a[1])[0][0];
  return [
    [d[i].d2, d[i].d3],
    [sum % 10, pair(sum % 10)],
    [neighborTop, coldTop]
  ];
}, '十+个 / 和值+对码 / 邻码+冷号'));

// 10. 十位+个位 / 跨度+对码(跨度) / 和值十位+对码(和值十位)
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  const sumTen = Math.floor(sum / 10) % 10;
  return [
    [d[i].d2, d[i].d3],
    [span, pair(span)],
    [sumTen, pair(sumTen)]
  ];
}, '十+个 / 跨度+对码 / 和值十位+对码'));

// 11. 上期开奖号3个数字各+对码，组成3组
results.push(verify3Pairs((d, i) => {
  const pair = n => (n + 5) % 10;
  return [
    [d[i].d1, pair(d[i].d1)],
    [d[i].d2, pair(d[i].d2)],
    [d[i].d3, pair(d[i].d3)]
  ];
}, '百+百对码 / 十+十对码 / 个+个对码'));

// 12. 十位+个位 / 和值个位+跨度 / 对码(十位)+对码(个位)
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  return [
    [d[i].d2, d[i].d3],
    [sum % 10, span],
    [pair(d[i].d2), pair(d[i].d3)]
  ];
}, '十+个 / 和值个位+跨度 / 十对码+个对码'));

results.sort((a, b) => b.rate1 - a.rate1);
results.forEach((r, i) => {
  const bar1 = '█'.repeat(Math.round(r.rate1 / 2));
  console.log(`${String(i + 1).padStart(2)}. ${r.name.padEnd(36)} 至少1组:${String(r.rate1).padStart(5)}% ${bar1}  平均覆盖${r.avgUnique}个不同数字  各组:${r.pairHits[0]}/${r.pairHits[1]}/${r.pairHits[2]}`);
});

console.log(`\n理论基准(随机3组至少1组全中): ~18.6%`);
console.log(`理论基准(6个不同数字至少2个命中): ~1 - C(4,3)/C(10,3) = 1 - 4/120 ≈ 96.7% 但要求同组2个都中`);
console.log(`总期数: ${data.length}期`);
