// 横相加 / 横相减 模式回溯期扫描（1/10/30/50/100期）：命中率 + 间隔 + 连对
import { lotteryData } from './lottery-app/src/data/lotteryData.js';

const calcs = {
  '横相加': (d1, d2, d3) => [(d1 + d2) % 10, (d2 + d3) % 10, (d1 + d3) % 10],
  '横相减': (d1, d2, d3) => [Math.abs(d1 - d2), Math.abs(d2 - d3), Math.abs(d1 - d3)],
};

const ALL = [];
for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) ALL.push([a, b, c]);

// 预计算：模式 -> 命中该模式的号码集合
const patternMap = {};
for (const [name, fn] of Object.entries(calcs)) {
  const map = new Map();
  for (const [a, b, c] of ALL) {
    const key = fn(a, b, c).join('');
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(`${a}${b}${c}`);
  }
  patternMap[name] = map;
}

const LOOKBACKS = [1, 10, 30, 50, 100];

function run(name, L) {
  const map = patternMap[name];
  const hitIdx = [];
  let candSum = 0, patternsSum = 0, n = 0;

  for (let i = L; i < lotteryData.length; i++) {
    const cand = new Set();
    const pats = new Set();
    for (let j = i - L; j < i; j++) {
      const p = lotteryData[j];
      const key = calcs[name](p.d1, p.d2, p.d3).join('');
      pats.add(key);
      const arr = map.get(key);
      if (arr) for (const m of arr) cand.add(m);
    }
    const cur = lotteryData[i];
    candSum += cand.size;
    patternsSum += pats.size;
    n++;
    if (cand.has(`${cur.d1}${cur.d2}${cur.d3}`)) hitIdx.push(i);
  }

  // 未中最大间隔
  let maxGap = hitIdx.length > 0 ? hitIdx[0] - L : lotteryData.length - L;
  for (let k = 1; k < hitIdx.length; k++) maxGap = Math.max(maxGap, hitIdx[k] - hitIdx[k - 1] - 1);
  if (hitIdx.length) maxGap = Math.max(maxGap, lotteryData.length - 1 - hitIdx[hitIdx.length - 1]);

  // 中奖间隔（含连续，连续记为1）
  const gaps = [];
  if (hitIdx.length) gaps.push(hitIdx[0] - L + 1);
  for (let k = 1; k < hitIdx.length; k++) gaps.push(hitIdx[k] - hitIdx[k - 1]);
  const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : NaN;

  // 连对
  let cur = 1, maxCons = 1;
  const consStats = {};
  for (let k = 1; k < hitIdx.length; k++) {
    if (hitIdx[k] === hitIdx[k - 1] + 1) cur++;
    else { if (cur >= 2) { consStats[cur] = (consStats[cur] || 0) + 1; maxCons = Math.max(maxCons, cur); } cur = 1; }
  }
  if (cur >= 2) { consStats[cur] = (consStats[cur] || 0) + 1; maxCons = Math.max(maxCons, cur); }
  const consTotal = Object.values(consStats).reduce((a, b) => a + b, 0);

  const rate = hitIdx.length / n * 100;
  const avgCand = candSum / n;
  return {
    L, hit: hitIdx.length, n, rate,
    avgCand, avgPat: patternsSum / n,
    theo: avgCand / 10,           // 理论命中率 = 候选注数/1000
    diff: rate - avgCand / 10,
    maxGap, avgGap, maxCons, consTotal,
    consTop: Object.entries(consStats).sort((a, b) => b[0] - a[0]).slice(0, 3).map(([c, t]) => `${c}连对×${t}`).join(' '),
  };
}

console.log(`数据总量: ${lotteryData.length} 期（${lotteryData[0].issue} ~ ${lotteryData[lotteryData.length - 1].issue}）`);
console.log(`模式空间: 横相加 ${patternMap['横相加'].size} 种 / 横相减 ${patternMap['横相减'].size} 种\n`);

for (const name of Object.keys(calcs)) {
  console.log(`===== ${name} =====`);
  console.log('回溯  候选注数  命中率   理论值   差值    最长未中  平均间隔  最长连对  连对次数');
  for (const L of LOOKBACKS) {
    const r = run(name, L);
    console.log(
      `${String(r.L).padStart(3)}期 ${r.avgCand.toFixed(1).padStart(7)}注 ` +
      `${r.rate.toFixed(2).padStart(6)}% ${r.theo.toFixed(2).padStart(6)}% ` +
      `${(r.diff >= 0 ? '+' : '') + r.diff.toFixed(2)}% ` +
      `${String(r.maxGap).padStart(6)}期 ${r.avgGap.toFixed(2).padStart(7)}期 ` +
      `${String(r.maxCons).padStart(5)}期 ${String(r.consTotal).padStart(6)}次  ${r.consTop}`
    );
  }
  console.log('');
}
