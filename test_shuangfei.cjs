const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

// 双飞验证：选2个数字，检查是否都出现在下期开奖号中
function verifyShuangFei(pickFn, name) {
  let hits = 0, total = 0;
  for (let i = 0; i < data.length - 1; i++) {
    const picks = pickFn(data, i);
    if (!picks || picks.length < 2) continue;
    // 取前2个数字
    const [a, b] = picks;
    const next = data[i + 1];
    const nextDigits = [next.d1, next.d2, next.d3];
    total++;
    if (nextDigits.includes(a) && nextDigits.includes(b)) hits++;
  }
  const rate = total > 0 ? (hits / total * 100).toFixed(1) : 0;
  return { name, hits, total, rate: parseFloat(rate) };
}

// 理论基准：随机选2个数字的命中率
// P(两个都中) = C(3,2)/C(10,2) ≈ 6.67%（组六）或更低（组三）
console.log('=== 双飞算法命中率对比（历史数据验证）===\n');

const results = [];

// 1. 上期开奖号中取出现次数最多的2个（热号）
results.push(verifyShuangFei((d, i) => {
  const cur = d[i];
  const digits = [cur.d1, cur.d2, cur.d3];
  const freq = {};
  digits.forEach(n => freq[n] = (freq[n] || 0) + 1);
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  return sorted.map(e => parseInt(e[0]));
}, '上期开奖号频次排序'));

// 2. 上期和值的十位+个位
results.push(verifyShuangFei((d, i) => {
  const sum = d[i].d1 + d[i].d2 + d[i].d3;
  return [Math.floor(sum / 10) % 10, sum % 10];
}, '上期和值十位+个位'));

// 3. 上期跨度+和值个位
results.push(verifyShuangFei((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const span = Math.max(...digits) - Math.min(...digits);
  const sum = digits.reduce((a, b) => a + b, 0);
  return [span, sum % 10];
}, '上期跨度+和值个位'));

// 4. 近5期出现最多的2个数字（热号）
results.push(verifyShuangFei((d, i) => {
  const freq = new Array(10).fill(0);
  for (let j = Math.max(0, i - 4); j <= i; j++) {
    freq[d[j].d1]++; freq[d[j].d2]++; freq[d[j].d3]++;
  }
  const sorted = freq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 2).map(e => e[0]);
}, '近5期热号TOP2'));

// 5. 近10期出现最多的2个数字
results.push(verifyShuangFei((d, i) => {
  const freq = new Array(10).fill(0);
  for (let j = Math.max(0, i - 9); j <= i; j++) {
    freq[d[j].d1]++; freq[d[j].d2]++; freq[d[j].d3]++;
  }
  const sorted = freq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 2).map(e => e[0]);
}, '近10期热号TOP2'));

// 6. 遗漏最大的2个数字（冷号）
results.push(verifyShuangFei((d, i) => {
  const lastSeen = new Array(10).fill(-1);
  for (let j = i; j >= Math.max(0, i - 29); j--) {
    [d[j].d1, d[j].d2, d[j].d3].forEach(n => { if (lastSeen[n] === -1) lastSeen[n] = i - j; });
  }
  const sorted = lastSeen.map((v, n) => [n, v]).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 2).map(e => e[0]);
}, '遗漏最大TOP2（冷号回补）'));

// 7. 上期百位+十位
results.push(verifyShuangFei((d, i) => [d[i].d1, d[i].d2], '上期百位+十位'));

// 8. 上期十位+个位
results.push(verifyShuangFei((d, i) => [d[i].d2, d[i].d3], '上期十位+个位'));

// 9. 上期百位+个位
results.push(verifyShuangFei((d, i) => [d[i].d1, d[i].d3], '上期百位+个位'));

// 10. 上期和值+跨度
results.push(verifyShuangFei((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a, b) => a + b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  return [sum % 10, span];
}, '上期和值个位+跨度'));

// 11. 上期开奖号的邻码（+1/-1）中出现最多的2个
results.push(verifyShuangFei((d, i) => {
  const freq = new Array(10).fill(0);
  [d[i].d1, d[i].d2, d[i].d3].forEach(n => {
    if (n > 0) freq[n - 1]++;
    if (n < 9) freq[n + 1]++;
  });
  const sorted = freq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 2).map(e => e[0]);
}, '上期邻码频次TOP2'));

// 12. 上两期开奖号并集中出现2次以上的数字
results.push(verifyShuangFei((d, i) => {
  if (i < 1) return [0, 0];
  const freq = new Array(10).fill(0);
  [d[i].d1, d[i].d2, d[i].d3, d[i-1].d1, d[i-1].d2, d[i-1].d3].forEach(n => freq[n]++);
  const sorted = freq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 2).map(e => e[0]);
}, '近2期并集频次TOP2'));

// 13. 上期和值路数（012路）对应的双飞
results.push(verifyShuangFei((d, i) => {
  const sum = d[i].d1 + d[i].d2 + d[i].d3;
  const route = sum % 3;
  // 0路: 0,3,6,9  1路: 1,4,7  2路: 2,5,8
  const groups = [[0,3,6,9],[1,4,7],[2,5,8]];
  const group = groups[route];
  // 从该组中选前2个
  return [group[0], group[1]];
}, '和值012路对应组'));

// 14. 上期开奖号每个数字的012路，取出现最多的路的2个代表数字
results.push(verifyShuangFei((d, i) => {
  const routes = [d[i].d1 % 3, d[i].d2 % 3, d[i].d3 % 3];
  const freq = [0, 0, 0];
  routes.forEach(r => freq[r]++);
  const maxRoute = freq.indexOf(Math.max(...freq));
  const groups = [[0,3,6,9],[1,4,7],[2,5,8]];
  return [groups[maxRoute][0], groups[maxRoute][1]];
}, '开奖号012路最多路代表'));

// 15. 上期组选和值的对码（0↔5,1↔6,2↔7,3↔8,4↔9）
results.push(verifyShuangFei((d, i) => {
  const sum = d[i].d1 + d[i].d2 + d[i].d3;
  const pair = n => (n + 5) % 10;
  return [pair(sum % 10), sum % 10];
}, '和值个位+对码'));

// 16. 上期跨度+上期跨度对码
results.push(verifyShuangFei((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const span = Math.max(...digits) - Math.min(...digits);
  return [span, (span + 5) % 10];
}, '跨度+跨度对码'));

// 17. 近3期出现最多的数字TOP2
results.push(verifyShuangFei((d, i) => {
  const freq = new Array(10).fill(0);
  for (let j = Math.max(0, i - 2); j <= i; j++) {
    freq[d[j].d1]++; freq[d[j].d2]++; freq[d[j].d3]++;
  }
  const sorted = freq.map((f, n) => [n, f]).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 2).map(e => e[0]);
}, '近3期热号TOP2'));

// 18. 上期开奖号去重后取前2个（组三时只有2个数字，直接取）
results.push(verifyShuangFei((d, i) => {
  const unique = [...new Set([d[i].d1, d[i].d2, d[i].d3])];
  return [unique[0], unique[1] ?? unique[0]];
}, '上期开奖号去重取前2'));

// 排序输出
results.sort((a, b) => b.rate - a.rate);
results.forEach((r, i) => {
  const bar = '█'.repeat(Math.round(r.rate / 2));
  console.log(`${String(i+1).padStart(2)}. ${r.name.padEnd(28)} 命中 ${String(r.hits).padStart(3)}/${String(r.total).padStart(3)}  ${r.rate}% ${bar}`);
});

console.log(`\n理论随机基准: ~6.67%（组六）/ ~3.33%（组三含重复）`);
console.log(`总期数: ${data.length}期`);
