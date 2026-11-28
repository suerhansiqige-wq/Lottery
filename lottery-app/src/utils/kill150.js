// 杀150注：主套=二阶差百十按近100期冷序补至150注；主套错1期插上期数字池百十补至60注，中2期回主套
// 福彩3D回测8311期87.50%（连错3，双错50，均128.1注，范围60~150）；✓=奖号不在杀集（杀对），✗=奖号被杀（误杀）

export const KILL_COUNT = 150;
const INSERT_COUNT = 60;
const START = 451; // 热身期数，与回测一致
const MISS_SWITCH = 1;
const HIT_RETURN = 2;

const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;
const toStr = (n) => String(n).padStart(3, '0');
const maskSize = (m) => { let s = 0; for (let n = 0; n < 1000; n++) s += m[n]; return s; };

export function killMaskToNumbers(mask) {
  const out = [];
  for (let n = 0; n < 1000; n++) if (mask[n]) out.push(toStr(n));
  return out;
}

// 二阶差：上期百十个两两绝对差，再两两绝对差；杀百十=百位与十位均在差集内（个位自由）
function sdBTMask(prev) {
  const a = Math.abs(prev.d1 - prev.d2), b = Math.abs(prev.d2 - prev.d3), c = Math.abs(prev.d3 - prev.d1);
  const s = new Set([Math.abs(a - b), Math.abs(b - c), Math.abs(c - a)]);
  const m = new Uint8Array(1000);
  for (let n = 0; n < 1000; n++) {
    const d1 = (n / 100) | 0, d2 = ((n / 10) | 0) % 10;
    if (s.has(d1) && s.has(d2)) m[n] = 1;
  }
  return m;
}

// 插期：上期奖号三位数字池，百位与十位均在池内（个位自由）
function poolBTMask(prev) {
  const s = new Set([prev.d1, prev.d2, prev.d3]);
  const m = new Uint8Array(1000);
  for (let n = 0; n < 1000; n++) {
    const d1 = (n / 100) | 0, d2 = ((n / 10) | 0) % 10;
    if (s.has(d1) && s.has(d2)) m[n] = 1;
  }
  return m;
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
  // 近100期各位数字频次增量维护（与回测buildColdOrderW同序：先删过期、再排序、后加当期）
  const cnt = [new Int32Array(10), new Int32Array(10), new Int32Array(10)];
  for (let i = 0; i < START; i++) {
    if (i >= 100) { const o = data[i - 100]; cnt[0][o.d1]--; cnt[1][o.d2]--; cnt[2][o.d3]--; }
    const it = data[i]; cnt[0][it.d1]++; cnt[1][it.d2]++; cnt[2][it.d3]++;
  }
  let useB = false, e = 0, c = 0;
  for (let i = START; i <= N; i++) {
    if (i >= 100) { const o = data[i - 100]; cnt[0][o.d1]--; cnt[1][o.d2]--; cnt[2][o.d3]--; }
    const score = new Int32Array(1000);
    for (let n = 0; n < 1000; n++) score[n] = cnt[0][(n / 100) | 0] + cnt[1][((n / 10) | 0) % 10] + cnt[2][n % 10];
    const ord = Array.from({ length: 1000 }, (_, n) => n);
    ord.sort((a, b) => score[a] - score[b] || a - b);
    const mask = useB ? toN(poolBTMask(data[i - 1]), ord, INSERT_COUNT) : toN(sdBTMask(data[i - 1]), ord, KILL_COUNT);
    if (i === N) return { index, tail: killMaskToNumbers(mask) };
    const missed = mask[numKey(data[i])] === 1;
    index.set(data[i].issue, { size: maskSize(mask), hit: !missed, kill: mask });
    if (missed) { e++; c = 0; } else { c++; e = 0; }
    if (!useB && e >= MISS_SWITCH) { useB = true; e = 0; c = 0; }
    else if (useB && c >= HIT_RETURN) { useB = false; e = 0; c = 0; }
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

// 下期预留行：重放插期状态到 targetIndex 之前最后一期，再推导该期杀集
export function getKill150Numbers(data, targetIndex) {
  if (targetIndex < START || targetIndex > data.length) return [];
  if (targetIndex === data.length) return getAll(data).tail;
  return buildAll(data.slice(0, targetIndex)).tail;
}