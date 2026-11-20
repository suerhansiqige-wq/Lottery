// 杀150注：百奇×十和尾离5 = 百位奇数 × 十位∈{上期和尾, 和尾+5, 和尾+7} × 个位全部，固定150注
// 福彩3D回测8304期86.36%（连错4 连中58）；排列三回测7334期85.07%（连错4 连中40）
// ✓=奖号不在杀集（杀对），✗=奖号被杀（误杀）

export const KILL_COUNT = 150;
const START = 451; // 热身期数，与回测一致

const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;
const toStr = (n) => String(n).padStart(3, '0');

function killMask(data, i) {
  const prev = data[i - 1];
  const s = (prev.d1 + prev.d2 + prev.d3) % 10;
  const t1 = (s + 5) % 10, t2 = (s + 7) % 10;
  const mask = new Uint8Array(1000);
  for (let n = 0; n < 1000; n++) {
    const d1 = (n / 100) | 0, d2 = ((n / 10) | 0) % 10;
    if (d1 % 2 === 1 && (d2 === s || d2 === t1 || d2 === t2)) mask[n] = 1;
  }
  return mask;
}

export function killMaskToNumbers(mask) {
  const out = [];
  for (let n = 0; n < 1000; n++) if (mask[n]) out.push(toStr(n));
  return out;
}

// 预计算各期杀集与对错：issue -> { size, hit, kill }
export function buildKill150Index(data) {
  const map = new Map();
  for (let i = START; i < data.length; i++) {
    const mask = killMask(data, i);
    const t = numKey(data[i]);
    map.set(data[i].issue, { size: KILL_COUNT, hit: !mask[t], kill: mask });
  }
  return map;
}

// 下期预留行：用 targetIndex 之前最后一期推导下一期杀集
export function getKill150Numbers(data, targetIndex) {
  if (targetIndex < START || targetIndex > data.length) return [];
  return killMaskToNumbers(killMask(data, targetIndex));
}