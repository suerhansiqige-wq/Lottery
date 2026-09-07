const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

// 验证三组双飞：每组2个数字，检查至少1组全中 / 全部全中
function verify3Pairs(pickFn, name) {
  let atLeast1 = 0, all3 = 0, total = 0;
  let pairHits = [0, 0, 0]; // 每组各自命中次数

  for (let i = 0; i < data.length - 1; i++) {
    const pairs = pickFn(data, i);
    if (!pairs || pairs.length < 3) continue;
    const next = data[i + 1];
    const nextDigits = [next.d1, next.d2, next.d3];
    total++;

    let hitCount = 0;
    for (let p = 0; p < 3; p++) {
      const [a, b] = pairs[p];
      if (a === b) continue;
      if (nextDigits.includes(a) && nextDigits.includes(b)) {
        hitCount++;
        pairHits[p]++;
      }
    }
    if (hitCount >= 1) atLeast1++;
    if (hitCount >= 3) all3++;
  }

  const rate1 = total > 0 ? (atLeast1 / total * 100).toFixed(1) : 0;
  const rate3 = total > 0 ? (all3 / total * 100).toFixed(1) : 0;
  return { name, atLeast1, all3, total, rate1: parseFloat(rate1), rate3: parseFloat(rate3), pairHits };
}

console.log('=== 三组双飞策略命中率对比（550期历史数据）===\n');
console.log('指标说明: 至少1组全中 = 3组中至少有1组的2个数字都出现在下期开奖号中');
console.log('         3组全中 = 3组的2个数字全部出现在下期开奖号中（极难）\n');

const results = [];

// ========== 基础单因子策略 ==========

// 1. 十位+个位 / 百位+十位 / 百位+个位（上期开奖号3个位置两两组合）
results.push(verify3Pairs((d, i) => [
  [d[i].d2, d[i].d3],
  [d[i].d1, d[i].d2],
  [d[i].d1, d[i].d3]
], '上期3位两两组合(十+个,百+十,百+个)'));

// 2. 和值十位+个位 / 跨度+和值个位 / 跨度+跨度对码
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  return [
    [Math.floor(sum / 10) % 10, sum % 10],
    [span, sum % 10],
    [span, (span + 5) % 10]
  ];
}, '和值两位+跨度和值+跨度对码'));

// 3. 十位+个位 / 和值十位+个位 / 跨度+和值个位
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  return [
    [d[i].d2, d[i].d3],
    [Math.floor(sum / 10) % 10, sum % 10],
    [span, sum % 10]
  ];
}, '十+个 / 和值两位 / 跨度+和值个位'));

// 4. 十位+个位 / 十位+对码(十位) / 个位+对码(个位)
results.push(verify3Pairs((d, i) => {
  const pair = n => (n + 5) % 10;
  return [
    [d[i].d2, d[i].d3],
    [d[i].d2, pair(d[i].d2)],
    [d[i].d3, pair(d[i].d3)]
  ];
}, '十+个 / 十+十对码 / 个+个对码'));

// 5. 十位+个位 / 邻码TOP2 / 遗漏TOP2
results.push(verify3Pairs((d, i) => {
  const nFreq = new Array(10).fill(0);
  [d[i].d1, d[i].d2, d[i].d3].forEach(n => {
    if (n > 0) nFreq[n - 1]++;
    if (n < 9) nFreq[n + 1]++;
  });
  const neighborTop = nFreq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);

  const lastSeen = new Array(10).fill(-1);
  for (let j = i; j >= Math.max(0, i - 29); j--) {
    [d[j].d1, d[j].d2, d[j].d3].forEach(n => { if (lastSeen[n] === -1) lastSeen[n] = i - j; });
  }
  const coldTop = lastSeen.map((v, n) => [n, v]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);

  return [
    [d[i].d2, d[i].d3],
    [neighborTop[0], neighborTop[1]],
    [coldTop[0], coldTop[1]]
  ];
}, '十+个 / 邻码TOP2 / 冷号TOP2'));

// 6. 十位+个位 / 和值个位+跨度 / 012路最多路前2
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const routes = digits.map(n => n % 3);
  const rFreq = [0, 0, 0];
  routes.forEach(r => rFreq[r]++);
  const maxRoute = rFreq.indexOf(Math.max(...rFreq));
  const groups = [[0, 3, 6, 9], [1, 4, 7], [2, 5, 8]];
  return [
    [d[i].d2, d[i].d3],
    [sum % 10, span],
    [groups[maxRoute][0], groups[maxRoute][1]]
  ];
}, '十+个 / 和值个位+跨度 / 012路代表'));

// ========== 综合多因子策略 ==========

// 7. 十位+个位 / 和值个位+对码(和值个位) / 跨度+对码(跨度)
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  const sumUnit = sum % 10;
  return [
    [d[i].d2, d[i].d3],
    [sumUnit, pair(sumUnit)],
    [span, pair(span)]
  ];
}, '十+个 / 和值个位+对码 / 跨度+对码'));

// 8. 十位+个位 / 百位+和值个位 / 跨度+邻码TOP1
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

// 9. 十位+个位 / 十位+和值个位 / 个位+跨度
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  return [
    [d[i].d2, d[i].d3],
    [d[i].d2, sum % 10],
    [d[i].d3, span]
  ];
}, '十+个 / 十+和值个位 / 个+跨度'));

// 10. 十位+个位 / 和值十位+和值个位 / 跨度+跨度对码（含去重处理）
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  let p1 = [d[i].d2, d[i].d3];
  let p2 = [Math.floor(sum / 10) % 10, sum % 10];
  let p3 = [span, pair(span)];
  // 如果p2两个数字相同，用跨度替代
  if (p2[0] === p2[1]) p2 = [sum % 10, span];
  return [p1, p2, p3];
}, '十+个 / 和值两位 / 跨度+对码(去重)'));

// 11. 十位+个位 / 近3期热号TOP2 / 遗漏TOP2
results.push(verify3Pairs((d, i) => {
  const freq3 = new Array(10).fill(0);
  for (let j = Math.max(0, i - 2); j <= i; j++) {
    freq3[d[j].d1]++; freq3[d[j].d2]++; freq3[d[j].d3]++;
  }
  const hotTop = freq3.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);

  const lastSeen = new Array(10).fill(-1);
  for (let j = i; j >= Math.max(0, i - 29); j--) {
    [d[j].d1, d[j].d2, d[j].d3].forEach(n => { if (lastSeen[n] === -1) lastSeen[n] = i - j; });
  }
  const coldTop = lastSeen.map((v, n) => [n, v]).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);

  return [
    [d[i].d2, d[i].d3],
    [hotTop[0], hotTop[1]],
    [coldTop[0], coldTop[1]]
  ];
}, '十+个 / 近3期热号 / 冷号回补'));

// 12. 十位+个位 / 百位+十位 / 和值个位+跨度
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  return [
    [d[i].d2, d[i].d3],
    [d[i].d1, d[i].d2],
    [sum % 10, span]
  ];
}, '十+个 / 百+十 / 和值个位+跨度'));

// 13. 十位+个位(同则和值替代) / 和值两位(同则跨度替代) / 跨度+对码
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n + 5) % 10;
  let a = d[i].d2, b = d[i].d3;
  if (a === b) b = sum % 10;
  if (a === b) b = (b + 1) % 10;
  let c = Math.floor(sum / 10) % 10, e = sum % 10;
  if (c === e) { c = sum % 10; e = span; }
  return [
    [a, b],
    [c, e],
    [span, pair(span)]
  ];
}, '十+个(去重) / 和值两位(去重) / 跨度+对码'));

// 14. 十位+个位 / 十位+百位 / 个位+百位（3位两两组合，固定顺序）
results.push(verify3Pairs((d, i) => [
  [d[i].d2, d[i].d3],
  [d[i].d1, d[i].d2],
  [d[i].d3, d[i].d1]
], '十+个 / 百+十 / 个+百'));

// 15. 十位+个位 / 和值个位+和值十位 / 跨度+和值十位
results.push(verify3Pairs((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const sumTen = Math.floor(sum / 10) % 10;
  const sumUnit = sum % 10;
  return [
    [d[i].d2, d[i].d3],
    [sumUnit, sumTen],
    [span, sumTen]
  ];
}, '十+个 / 和值个+十 / 跨度+和值十'));

// 排序：按"至少1组全中"命中率排序
results.sort((a, b) => b.rate1 - a.rate1);
results.forEach((r, i) => {
  const bar1 = '█'.repeat(Math.round(r.rate1 / 3));
  const bar3 = '░'.repeat(Math.round(r.rate3 * 5));
  console.log(`${String(i + 1).padStart(2)}. ${r.name.padEnd(36)} 至少1组:${String(r.rate1).padStart(5)}% ${bar1}  3组全中:${String(r.rate3).padStart(4)}% ${bar3}`);
  if (i < 3) {
    console.log(`     各组分别命中: 第1组=${r.pairHits[0]}次  第2组=${r.pairHits[1]}次  第3组=${r.pairHits[2]}次`);
  }
});

console.log(`\n理论基准(随机3组至少1组全中): ~1 - (1-0.0667)^3 ≈ 18.6%`);
console.log(`总期数: ${data.length}期`);
