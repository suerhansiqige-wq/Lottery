// 横相加 + 横相减 合并候选池：回溯期扫描（1/10/30/50/100期），福彩3D 与 排列三 双验证
const calcs = {
  add: (d1, d2, d3) => [(d1 + d2) % 10, (d2 + d3) % 10, (d1 + d3) % 10],
  sub: (d1, d2, d3) => [Math.abs(d1 - d2), Math.abs(d2 - d3), Math.abs(d1 - d3)],
};

const ALL = [];
for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) ALL.push([a, b, c]);

const maps = {};
for (const [mode, fn] of Object.entries(calcs)) {
  const m = new Map();
  for (const [a, b, c] of ALL) {
    const key = fn(a, b, c).join('');
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(`${a}${b}${c}`);
  }
  maps[mode] = m;
}

const LOOKBACKS = [1, 10, 30, 50, 100, 200];const PRIZE = 1040, COST = 2;

function sweep(data) {
  const addSets = data.map(d => maps.add.get(calcs.add(d.d1, d.d2, d.d3).join('')) || []);
  const subSets = data.map(d => maps.sub.get(calcs.sub(d.d1, d.d2, d.d3).join('')) || []);

  const rows = [];
  for (const L of LOOKBACKS) {
    const hitIdx = [];
    let n = 0, unionSum = 0, addSum = 0, subSum = 0, overlapSum = 0;
    const sizes = [];

    for (let i = L; i < data.length; i++) {
      const aSet = new Set(), sSet = new Set();
      for (let j = i - L; j < i; j++) {
        for (const m of addSets[j]) aSet.add(m);
        for (const m of subSets[j]) sSet.add(m);
      }
      const union = new Set(aSet);
      for (const m of sSet) union.add(m);

      let overlap = 0;
      for (const m of aSet) if (sSet.has(m)) overlap++;

      n++;
      unionSum += union.size;
      addSum += aSet.size;
      subSum += sSet.size;
      overlapSum += overlap;
      sizes.push(union.size);

      const d = data[i];
      if (union.has(`${d.d1}${d.d2}${d.d3}`)) hitIdx.push(i);
    }

    let maxGap = hitIdx.length ? hitIdx[0] - L : data.length - L;
    for (let k = 1; k < hitIdx.length; k++) maxGap = Math.max(maxGap, hitIdx[k] - hitIdx[k - 1] - 1);
    if (hitIdx.length) maxGap = Math.max(maxGap, data.length - 1 - hitIdx[hitIdx.length - 1]);

    const gaps = [];
    if (hitIdx.length) gaps.push(hitIdx[0] - L + 1);
    for (let k = 1; k < hitIdx.length; k++) gaps.push(hitIdx[k] - hitIdx[k - 1]);
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : NaN;

    let cur = 1, maxCons = 1, consTotal = 0;
    for (let k = 1; k < hitIdx.length; k++) {
      if (hitIdx[k] === hitIdx[k - 1] + 1) cur++;
      else { if (cur >= 2) { consTotal++; if (cur > maxCons) maxCons = cur; } cur = 1; }
    }
    if (cur >= 2) { consTotal++; if (cur > maxCons) maxCons = cur; }

    const avgUnion = unionSum / n;
    const rate = hitIdx.length / n * 100;

    const minVal = Math.min(...sizes), maxVal = Math.max(...sizes);
    const minIssue = data[L + sizes.indexOf(minVal)].issue;
    const maxIssue = data[L + sizes.indexOf(maxVal)].issue;
    const sorted = [...sizes].sort((a, b) => a - b);
    const pct = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];

    rows.push({
      L, hit: hitIdx.length, n, rate, avgUnion,
      minVal, maxVal, minIssue, maxIssue, p05: pct(0.05), p50: pct(0.5), p95: pct(0.95),
      add: addSum / n, sub: subSum / n, overlap: overlapSum / n,
      maxGap, avgGap, maxCons, consTotal,
      cost: avgUnion * COST, ev: rate / 100 * PRIZE,
    });
  }
  return rows;
}

async function main() {
  const { lotteryData: fc3d } = await import('./lottery-app/src/data/lotteryData.js');
  const { lotteryData: pl3 } = await import('./pl3-app/src/data/lotteryData.js');

  console.log(`模式空间：横相加 ${maps.add.size} 种、横相减 ${maps.sub.size} 种`);
  const sz = m => { const v = [...m.values()].map(a => a.length); return `${Math.min(...v)}~${Math.max(...v)}`; };
  console.log(`单个模式的候选注数范围：横相加 ${sz(maps.add)} 注、横相减 ${sz(maps.sub)} 注`);
  console.log('理论上下限：并集最大 1000 注（全模式覆盖），L=1 时最小 10 注（相加2注全落在相减10注内）');

  for (const [name, data] of [['福彩3D', fc3d], ['排列三', pl3]]) {
    console.log(`\n===== ${name}｜横相加+横相减 合并去重候选池（${data.length} 期：${data[0].issue} ~ ${data[data.length - 1].issue}）=====`);
    console.log('回溯  相加去重  相减去重  重叠注数  合并注数  覆盖率  命中率  差值    最长未中 平均间隔 最长连对 连对次数 每期成本 期望回收 净亏/期');
    const rows = sweep(data);
    for (const r of rows) {
      const diff = r.rate - r.avgUnion / 10;
      console.log(
        `${String(r.L).padStart(3)}期 ${r.add.toFixed(1).padStart(7)} ${r.sub.toFixed(1).padStart(8)} ${r.overlap.toFixed(1).padStart(9)} ` +
        `${r.avgUnion.toFixed(1).padStart(9)}注 ${(r.avgUnion / 10).toFixed(1).padStart(6)}% ${r.rate.toFixed(2).padStart(6)}% ` +
        `${((diff >= 0 ? '+' : '') + diff.toFixed(2))}%`.padStart(9) +
        `${String(r.maxGap).padStart(8)}期 ${r.avgGap.toFixed(2).padStart(8)}期 ${String(r.maxCons).padStart(7)}期 ${String(r.consTotal).padStart(7)}次 ` +
        `${r.cost.toFixed(0).padStart(8)}元 ${r.ev.toFixed(0).padStart(7)}元 ${(-(r.cost - r.ev)).toFixed(0).padStart(7)}元`
      );
    }

    console.log('\n【合并候选池逐期注数区间】');
    console.log('回溯    最少注数(期号)     最多注数(期号)      P5    P50    P95     平均    极差');
    for (const r of rows) {
      console.log(
        `${String(r.L).padStart(3)}期 ${String(r.minVal).padStart(6)}注 ${String(r.minIssue).padStart(9)} ` +
        `${String(r.maxVal).padStart(8)}注 ${String(r.maxIssue).padStart(9)} ` +
        `${String(r.p05).padStart(6)} ${String(r.p50).padStart(5)} ${String(r.p95).padStart(6)} ` +
        `${r.avgUnion.toFixed(1).padStart(7)} ${(r.maxVal - r.minVal).toFixed(0).padStart(7)}注`
      );
    }
  }
  console.log('\n口径：相加/相减去重=各自候选并集注数；重叠=同时被两种模式覆盖的注数；合并注数=两者去重并集。');
  console.log(`盈亏：直选奖金 ${PRIZE} 元/注，成本 ${COST} 元/注；期望回收=命中率×${PRIZE}。`);
}

main();
