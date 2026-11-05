// 中奖间隔分布统计：横相加 / 横相减 / 合并 三种候选池，逐回溯档给出间隔直方图与分位数
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
    const k = fn(a, b, c).join('');
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(`${a}${b}${c}`);
  }
  maps[mode] = m;
}

const LOOKBACKS = [10, 30, 50, 100, 200];

function gapsFor(data, L, useAdd, useSub) {
  const addSets = data.map(d => (useAdd ? maps.add.get(calcs.add(d.d1, d.d2, d.d3).join('')) || [] : []));
  const subSets = data.map(d => (useSub ? maps.sub.get(calcs.sub(d.d1, d.d2, d.d3).join('')) || [] : []));
  const hitIdx = [];
  const poolSizes = [];
  for (let i = L; i < data.length; i++) {
    const u = new Set();
    for (let j = i - L; j < i; j++) {
      for (const m of addSets[j]) u.add(m);
      for (const m of subSets[j]) u.add(m);
    }
    poolSizes.push(u.size);
    const d = data[i];
    if (u.has(`${d.d1}${d.d2}${d.d3}`)) hitIdx.push(i);
  }
  const gaps = [];
  if (hitIdx.length) gaps.push(hitIdx[0] - L + 1);           // 首个命中前含1次尝试
  for (let k = 1; k < hitIdx.length; k++) gaps.push(hitIdx[k] - hitIdx[k - 1]);
  const sorted = [...gaps].sort((a, b) => a - b);
  const pct = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const hist = new Map();
  for (const g of gaps) {
    const b = g >= 11 ? '11+' : String(g);
    hist.set(b, (hist.get(b) || 0) + 1);
  }
  const maxGap = sorted[sorted.length - 1];
  return {
    n: hitIdx.length, windows: gaps.length,
    rate: hitIdx.length / poolSizes.length * 100,
    avgPool: poolSizes.reduce((a, b) => a + b, 0) / poolSizes.length,
    avg: gaps.reduce((a, b) => a + b, 0) / gaps.length,
    p50: pct(0.5), p80: pct(0.8), p90: pct(0.9), p95: pct(0.95), p99: pct(0.99),
    maxGap, hist, total: gaps.length,
  };
}

function table(title, rows) {
  console.log(`\n===== ${title} =====`);
  console.log('回溯  池均注数 命中率  间隔=1  =2  =3  =4  =5  =6  =7  =8  =9  =10 11+   平均  P50 P80 P90 P95 P99 最长');
  for (const r of rows) {
    const c = g => String(r.hist.get(g) || 0).padStart(4);
    const pctOf = g => (100 - (g / (r.avgPool || 1)) * 100).toFixed(1);
    console.log(
      `${String(r.L).padStart(3)}期 ${r.avgPool.toFixed(0).padStart(6)} ${r.rate.toFixed(2).padStart(5)}% ` +
      c('1') + c('2') + c('3') + c('4') + c('5') + c('6') + c('7') + c('8') + c('9') + c('10') +
      String(r.hist.get('11+') || 0).padStart(5) +
      `  ${r.avg.toFixed(2).padStart(5)} ${String(r.p50).padStart(3)} ${String(r.p80).padStart(3)} ${String(r.p90).padStart(3)} ` +
      `${String(r.p95).padStart(3)} ${String(r.p99).padStart(3)} ${String(r.maxGap).padStart(4)}`
    );
  }
}

const { lotteryData: fc3d } = await import('./lottery-app/src/data/lotteryData.js');
const { lotteryData: pl3 } = await import('./pl3-app/src/data/lotteryData.js');

for (const [name, data] of [['福彩3D', fc3d], ['排列三', pl3]]) {
  console.log(`\n\n########## ${name}（${data.length} 期：${data[0].issue} ~ ${data[data.length - 1].issue}）##########`);
  table('合并（横相加∪横相减）中奖间隔分布（单位：期；间隔=1 即连中）',
    LOOKBACKS.map(L => ({ L, ...gapsFor(data, L, true, true) })));
  table('仅横相减', LOOKBACKS.map(L => ({ L, ...gapsFor(data, L, false, true) })));
  table('仅横相加', LOOKBACKS.map(L => ({ L, ...gapsFor(data, L, true, false) })));
}
console.log('\n口径：间隔 = 本次命中期号 与 上次命中期号 的期数差；首次命中按窗口起点起算。');
console.log('数字为该间隔出现的次数（每档共约 ' + (fc3d.length - 200) + '~' + (fc3d.length - 10) + ' 次命中被统计）。');
