const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

function verifyShuangFei(pickFn, name) {
  let hits = 0, total = 0;
  for (let i = 0; i < data.length - 1; i++) {
    const picks = pickFn(data, i);
    if (!picks || picks.length < 2) continue;
    const [a, b] = picks;
    if (a === b) continue; // 跳过相同数字
    const next = data[i + 1];
    const nextDigits = [next.d1, next.d2, next.d3];
    total++;
    if (nextDigits.includes(a) && nextDigits.includes(b)) hits++;
  }
  const rate = total > 0 ? (hits / total * 100).toFixed(1) : 0;
  return { name, hits, total, rate: parseFloat(rate) };
}

console.log('=== 进阶双飞算法命中率对比 ===\n');
const results = [];

// A. 上期十位+个位（最佳单因子）
results.push(verifyShuangFei((d, i) => [d[i].d2, d[i].d3], '上期十位+个位'));

// B. 上期和值十位+个位
results.push(verifyShuangFei((d, i) => {
  const sum = d[i].d1 + d[i].d2 + d[i].d3;
  return [Math.floor(sum / 10) % 10, sum % 10];
}, '上期和值十位+个位'));

// C. 上期十位+个位 与 和值个位 投票（3选2多数）
results.push(verifyShuangFei((d, i) => {
  const sum = d[i].d1 + d[i].d2 + d[i].d3;
  const candidates = [d[i].d2, d[i].d3, sum % 10];
  const freq = {};
  candidates.forEach(n => freq[n] = (freq[n]||0) + 1);
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '十位+个位+和值个位 投票TOP2'));

// D. 上期开奖号3个数字 + 和值个位，4选2最高频
results.push(verifyShuangFei((d, i) => {
  const sum = d[i].d1 + d[i].d2 + d[i].d3;
  const candidates = [d[i].d1, d[i].d2, d[i].d3, sum % 10];
  const freq = {};
  candidates.forEach(n => freq[n] = (freq[n]||0) + 1);
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '开奖号+和值个位 4选2'));

// E. 上期十位+个位+跨度，3选2
results.push(verifyShuangFei((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const span = Math.max(...digits) - Math.min(...digits);
  const candidates = [d[i].d2, d[i].d3, span];
  const freq = {};
  candidates.forEach(n => freq[n] = (freq[n]||0) + 1);
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '十位+个位+跨度 投票TOP2'));

// F. 上期十位+个位+对码（十位对码+个位对码），4选2
results.push(verifyShuangFei((d, i) => {
  const pair = n => (n + 5) % 10;
  const candidates = [d[i].d2, d[i].d3, pair(d[i].d2), pair(d[i].d3)];
  const freq = {};
  candidates.forEach(n => freq[n] = (freq[n]||0) + 1);
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '十位+个位+对码 4选2'));

// G. 上期十位+个位+邻码TOP1，3选2
results.push(verifyShuangFei((d, i) => {
  const freq = new Array(10).fill(0);
  [d[i].d1, d[i].d2, d[i].d3].forEach(n => {
    if (n > 0) freq[n-1]++;
    if (n < 9) freq[n+1]++;
  });
  const neighborTop = freq.map((f,n) => [n,f]).sort((a,b) => b[1]-a[1])[0][0];
  const candidates = [d[i].d2, d[i].d3, neighborTop];
  const freq2 = {};
  candidates.forEach(n => freq2[n] = (freq2[n]||0) + 1);
  const sorted = Object.entries(freq2).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '十位+个位+邻码TOP1 投票'));

// H. 上期和值个位+跨度+十位+个位 4选2
results.push(verifyShuangFei((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a,b) => a+b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const candidates = [sum % 10, span, d[i].d2, d[i].d3];
  const freq = {};
  candidates.forEach(n => freq[n] = (freq[n]||0) + 1);
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '和值个位+跨度+十位+个位 4选2'));

// I. 上期十位+个位，但如果相同则用和值个位替代
results.push(verifyShuangFei((d, i) => {
  const sum = d[i].d1 + d[i].d2 + d[i].d3;
  let a = d[i].d2, b = d[i].d3;
  if (a === b) b = sum % 10;
  if (a === b) b = (b + 1) % 10;
  return [a, b];
}, '十位+个位(同则和值替代)'));

// J. 上期开奖号3数字频次 + 近3期频次 综合
results.push(verifyShuangFei((d, i) => {
  const freq = new Array(10).fill(0);
  // 当期权重3，近1期权重2，近2期权重1
  freq[d[i].d1] += 3; freq[d[i].d2] += 3; freq[d[i].d3] += 3;
  if (i >= 1) { freq[d[i-1].d1] += 2; freq[d[i-1].d2] += 2; freq[d[i-1].d3] += 2; }
  if (i >= 2) { freq[d[i-2].d1] += 1; freq[d[i-2].d2] += 1; freq[d[i-2].d3] += 1; }
  const sorted = freq.map((f,n) => [n,f]).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => e[0]);
}, '加权热号(3-2-1)TOP2'));

// K. 上期十位+个位+百位 3选2（全开奖号投票）
results.push(verifyShuangFei((d, i) => {
  const candidates = [d[i].d1, d[i].d2, d[i].d3];
  const freq = {};
  candidates.forEach(n => freq[n] = (freq[n]||0) + 1);
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '开奖号3位频次TOP2'));

// L. 上期十位+个位+和值十位+和值个位 4选2
results.push(verifyShuangFei((d, i) => {
  const sum = d[i].d1 + d[i].d2 + d[i].d3;
  const candidates = [d[i].d2, d[i].d3, Math.floor(sum/10)%10, sum%10];
  const freq = {};
  candidates.forEach(n => freq[n] = (freq[n]||0) + 1);
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '十位+个位+和值两位 4选2'));

// M. 上期十位+个位+跨度+和值个位 4选2
results.push(verifyShuangFei((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const sum = digits.reduce((a,b) => a+b, 0);
  const span = Math.max(...digits) - Math.min(...digits);
  const candidates = [d[i].d2, d[i].d3, span, sum%10];
  const freq = {};
  candidates.forEach(n => freq[n] = (freq[n]||0) + 1);
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '十位+个位+跨度+和值个位 4选2'));

// N. 上期十位+个位+对码(个位)+跨度 4选2
results.push(verifyShuangFei((d, i) => {
  const digits = [d[i].d1, d[i].d2, d[i].d3];
  const span = Math.max(...digits) - Math.min(...digits);
  const pair = n => (n+5)%10;
  const candidates = [d[i].d2, d[i].d3, pair(d[i].d3), span];
  const freq = {};
  candidates.forEach(n => freq[n] = (freq[n]||0) + 1);
  const sorted = Object.entries(freq).sort((a,b) => b[1]-a[1]);
  return sorted.slice(0,2).map(e => parseInt(e[0]));
}, '十位+个位+个位对码+跨度 4选2'));

results.sort((a, b) => b.rate - a.rate);
results.forEach((r, i) => {
  const bar = '█'.repeat(Math.round(r.rate / 2));
  console.log(`${String(i+1).padStart(2)}. ${r.name.padEnd(32)} 命中 ${String(r.hits).padStart(3)}/${String(r.total).padStart(3)}  ${r.rate}% ${bar}`);
});

console.log(`\n理论随机基准: ~6.67%`);
console.log(`总期数: ${data.length}期`);
