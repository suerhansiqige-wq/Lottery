// 杀150注：三套150轮转 = 现冠军(聚类K3热百5十3) / 增强补集并开奖号杀号 / 遗漏并集补集
// 三套均按近100期冷热序删补至固定150注；连错2期转下一套，中1期回第一套
// 排列三回测7336期86.61%（连错4，三错15）；✓=奖号不在杀集（杀对），✗=奖号被杀（误杀）

import { getAddSubNumbersPro } from './addSubPool.js';

export const KILL_COUNT = 150;
const START = 451; // 热身期数，与回测一致
const CYCLE_MISS = 2;
const CYCLE_HIT = 1;

const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;
const toStr = (n) => String(n).padStart(3, '0');
const maskSize = (m) => { let s = 0; for (let n = 0; n < 1000; n++) s += m[n]; return s; };
const comp = (m) => { const c = new Uint8Array(1000); for (let n = 0; n < 1000; n++) c[n] = m[n] ? 0 : 1; return c; };
const maskFromNums = (nums) => { const m = new Uint8Array(1000); for (const t of nums) m[+t] = 1; return m; };

export function killMaskToNumbers(mask) {
  const out = [];
  for (let n = 0; n < 1000; n++) if (mask[n]) out.push(toStr(n));
  return out;
}

// ===== 第一套：现冠军（聚类K3热百5十3 = 在线k-means，K=3，上期百十个/和尾/跨度五维特征）=====
// 取当前簇内频次（衰减0.999）最热的百位5码×十位3码×个位全部，固定150注；质心每500期重拟合（窗口1000期、10轮）
const K = 3;

function feat(data, i) {
  const a = data[i - 1];
  const s = [a.d1, a.d2, a.d3].sort((x, y) => x - y);
  return [a.d1 / 9, a.d2 / 9, a.d3 / 9, ((a.d1 + a.d2 + a.d3) % 10) / 9, (s[2] - s[0]) / 9];
}

// 在线聚类重放：逐期产杀集（i>=START），回调 onMask(i, mask)
function runClusters(data, upto, onMask) {
  const cent = [feat(data, 3), feat(data, 40), feat(data, 77)];
  const assign = (f) => {
    let bi = 0, bd = Infinity;
    for (let k = 0; k < K; k++) {
      let d = 0;
      for (let a = 0; a < 5; a++) d += (f[a] - cent[k][a]) ** 2;
      if (d < bd) { bd = d; bi = k; }
    }
    return bi;
  };
  const cnt = Array.from({ length: 3 }, () => Array.from({ length: K }, () => new Float64Array(10)));
  for (let i = 0; i <= upto; i++) {
    const f = feat(data, Math.max(i, 3));
    const cl = i >= START ? assign(f) : 0;
    if (i >= START && onMask) {
      const hot = (pos, w) => [...Array(10).keys()]
        .sort((a, b) => cnt[pos][cl][a] - cnt[pos][cl][b] || a - b)
        .slice(10 - w);
      const hh = hot(0, 5), ht = hot(1, 3);
      const mask = new Uint8Array(1000);
      for (const a of hh) for (const b of ht) for (let c = 0; c < 10; c++) mask[a * 100 + b * 10 + c] = 1;
      onMask(i, mask);
    }
    if (i >= 3 && i < data.length) {
      const dg = [data[i].d1, data[i].d2, data[i].d3];
      for (let pos = 0; pos < 3; pos++) {
        const cp = cnt[pos];
        for (let k = 0; k < K; k++) for (let d = 0; d < 10; d++) cp[k][d] *= 0.999;
        cp[cl][dg[pos]] += 1;
      }
      if (i >= START && (i - START) % 500 === 0) {
        const samples = [];
        for (let j = Math.max(3, i - 1000); j < i; j++) samples.push(feat(data, j));
        for (let it = 0; it < 10; it++) {
          const sums = Array.from({ length: K }, () => new Float64Array(5));
          const ns = new Int32Array(K);
          for (const f2 of samples) {
            const k = assign(f2);
            ns[k]++;
            for (let a = 0; a < 5; a++) sums[k][a] += f2[a];
          }
          for (let k = 0; k < K; k++) if (ns[k] > 0) for (let a = 0; a < 5; a++) cent[k][a] = sums[k][a] / ns[k];
        }
      }
    }
  }
}

function championSeries(data) {
  const champ = new Array(data.length + 1);
  runClusters(data, data.length, (i, mask) => { champ[i] = mask; });
  return champ;
}

// ===== 第二套组件：开奖号杀号（上期奖号三位+和值各位+跨度数字池，组选转直选不含豹子）=====
function kjMask(prev) {
  const sum = prev.d1 + prev.d2 + prev.d3;
  const ds = [prev.d1, prev.d2, prev.d3];
  if (sum >= 10) ds.push((sum / 10) | 0);
  ds.push(sum % 10);
  const s = [prev.d1, prev.d2, prev.d3].sort((a, b) => a - b);
  ds.push(s[2] - s[0]);
  const pool = [...new Set(ds)];
  const m = new Uint8Array(1000);
  for (const a of pool) for (const b of pool) for (const c of pool) { if (a === b && b === c) continue; m[a * 100 + b * 10 + c] = 1; }
  return m;
}

// ===== 第三套组件：遗漏三池并集（1位/2位/3位组，pivot轮换，与遗漏杀号列同源）=====
function omissionUnion(data) {
  const N = data.length;
  const last = { d1: new Int32Array(10).fill(-1), d2: new Int32Array(10).fill(-1), d3: new Int32Array(10).fill(-1) };
  const out = [];
  const mk = (miss, mode, pivot) => {
    const g = {};
    for (const pos of ['d1', 'd2', 'd3']) {
      const ds = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      ds.sort((a, b) => miss[pos][b] - miss[pos][a]);
      if (mode === 1) g[pos] = pos === pivot ? ds.slice(0, 6) : ds.slice(5, 10);
      else if (mode === 2) g[pos] = pos === pivot ? ds.slice(5, 10) : ds.slice(0, 5);
      else g[pos] = pos === pivot ? ds.slice(0, 6) : ds.slice(0, 5);
    }
    return g;
  };
  for (let i = 0; i <= N; i++) {
    const miss = {};
    for (const pos of ['d1', 'd2', 'd3']) { miss[pos] = []; for (let d = 0; d < 10; d++) miss[pos][d] = i - 1 - last[pos][d]; }
    const mu = new Uint8Array(1000);
    const fill = (g) => { for (const a of g.d1) for (const b of g.d2) for (const c of g.d3) mu[a * 100 + b * 10 + c] = 1; };
    for (const pv of ['d1', 'd2', 'd3']) fill(mk(miss, 1, pv));
    for (const pv of ['d3', 'd1', 'd2']) fill(mk(miss, 2, pv));
    for (const pv of ['d1', 'd2', 'd1']) fill(mk(miss, 3, pv));
    out.push(mu);
    if (i < N) { const it = data[i]; last.d1[it.d1] = i; last.d2[it.d2] = i; last.d3[it.d3] = i; }
  }
  return out;
}

// 冷序删补至定长：不足从最冷号补起，超出从最热号删起
function toN(m, ord, target) {
  const sz = maskSize(m);
  const out = new Uint8Array(m);
  if (sz < target) { let need = target - sz; for (const n of ord) { if (!out[n]) { out[n] = 1; if (--need === 0) break; } } }
  else if (sz > target) { let drop = sz - target; for (let k = ord.length - 1; k >= 0 && drop > 0; k--) { const n = ord[k]; if (out[n]) { out[n] = 0; drop--; } } }
  return out;
}

function buildAll(data) {
  const N = data.length;
  const index = new Map();
  if (N <= START) return { index, tail: [] };
  const champ = championSeries(data);
  const omComp = omissionUnion(data).map(comp);
  // 近100期各位数字频次增量维护（与回测buildOrders同序：先删过期、再排序、后加当期）
  const cnt = [new Int32Array(10), new Int32Array(10), new Int32Array(10)];
  for (let i = 0; i < START; i++) {
    if (i >= 100) { const o = data[i - 100]; cnt[0][o.d1]--; cnt[1][o.d2]--; cnt[2][o.d3]--; }
    const it = data[i]; cnt[0][it.d1]++; cnt[1][it.d2]++; cnt[2][it.d3]++;
  }
  const threeMasks = (i, ord) => {
    const s1 = toN(champ[i], ord, KILL_COUNT);
    const addC = i < 300 ? new Uint8Array(1000) : comp(maskFromNums(getAddSubNumbersPro(data, i)));
    const kj = kjMask(data[i - 1]);
    const u = new Uint8Array(1000);
    for (let n = 0; n < 1000; n++) u[n] = addC[n] | kj[n];
    const s2 = toN(u, ord, KILL_COUNT);
    const s3 = toN(omComp[i], ord, KILL_COUNT);
    return [s1, s2, s3];
  };
  let idx = 0, e = 0, c = 0;
  for (let i = START; i <= N; i++) {
    if (i >= 100) { const o = data[i - 100]; cnt[0][o.d1]--; cnt[1][o.d2]--; cnt[2][o.d3]--; }
    const score = new Int32Array(1000);
    for (let n = 0; n < 1000; n++) score[n] = cnt[0][(n / 100) | 0] + cnt[1][((n / 10) | 0) % 10] + cnt[2][n % 10];
    const ord = Array.from({ length: 1000 }, (_, n) => n);
    ord.sort((a, b) => score[a] - score[b] || a - b);
    const ms = threeMasks(i, ord);
    if (i === N) return { index, tail: killMaskToNumbers(ms[idx]) };
    const mask = ms[idx];
    const missed = mask[numKey(data[i])] === 1;
    index.set(data[i].issue, { size: KILL_COUNT, hit: !missed, kill: mask });
    if (missed) { e++; c = 0; } else { c++; e = 0; }
    if (e >= CYCLE_MISS) { idx = (idx + 1) % 3; e = 0; c = 0; }
    else if (idx !== 0 && c >= CYCLE_HIT) { idx = 0; e = 0; c = 0; }
    const it = data[i]; cnt[0][it.d1]++; cnt[1][it.d2]++; cnt[2][it.d3]++;
  }
  return { index, tail: [] };
}

// 同一数据只算一次（表头各期与预留行共用）
const cache = new WeakMap();
function getAll(data) {
  let r = cache.get(data);
  if (!r) { r = buildAll(data); cache.set(data, r); }
  return r;
}

// 预计算各期杀集与对错：issue -> { size, hit, kill }
export function buildKill150Index(data) {
  return getAll(data).index;
}

// 下期预留行：重放轮转状态到 targetIndex 之前最后一期，再推导该期杀集
export function getKill150Numbers(data, targetIndex) {
  if (targetIndex < START || targetIndex > data.length) return [];
  if (targetIndex === data.length) return getAll(data).tail;
  return buildAll(data.slice(0, targetIndex)).tail;
}