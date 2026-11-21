// 杀150注：反相关配对切换 = 纪录离5（百奇×十和尾离5）↔ 偶离5（百偶×十和尾离5）
// 错1期切到偶离5，中1期回退纪录离5；福彩3D回测8304期86.44%（连错3）
// ✓=奖号不在杀集（杀对），✗=奖号被杀（误杀）

export const KILL_COUNT = 150;
const START = 451; // 热身期数，与回测一致

const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;
const toStr = (n) => String(n).padStart(3, '0');

function killMask(data, i, useEven) {
  const prev = data[i - 1];
  const s = (prev.d1 + prev.d2 + prev.d3) % 10;
  const t1 = (s + 5) % 10, t2 = (s + 7) % 10;
  const mask = new Uint8Array(1000);
  for (let n = 0; n < 1000; n++) {
    const d1 = (n / 100) | 0, d2 = ((n / 10) | 0) % 10;
    const parityOk = useEven ? d1 % 2 === 0 : d1 % 2 === 1;
    if (parityOk && (d2 === s || d2 === t1 || d2 === t2)) mask[n] = 1;
  }
  return mask;
}

export function killMaskToNumbers(mask) {
  const out = [];
  for (let n = 0; n < 1000; n++) if (mask[n]) out.push(toStr(n));
  return out;
}

function advance(useAlt, e, c, missed) {
  if (missed) { e++; c = 0; } else { c++; e = 0; }
  if (!useAlt && e >= 1) { useAlt = true; e = 0; c = 0; }
  else if (useAlt && c >= 1) { useAlt = false; e = 0; c = 0; }
  return [useAlt, e, c];
}

// 预计算各期杀集与对错：issue -> { size, hit, kill }
export function buildKill150Index(data) {
  const map = new Map();
  let useAlt = false, e = 0, c = 0;
  for (let i = START; i < data.length; i++) {
    const mask = killMask(data, i, useAlt);
    const missed = mask[numKey(data[i])] === 1;
    map.set(data[i].issue, { size: KILL_COUNT, hit: !missed, kill: mask });
    [useAlt, e, c] = advance(useAlt, e, c, missed);
  }
  return map;
}

// 下期预留行：重放切换状态到 targetIndex 之前最后一期，再推导该期杀集
export function getKill150Numbers(data, targetIndex) {
  if (targetIndex < START || targetIndex > data.length) return [];
  let useAlt = false, e = 0, c = 0;
  for (let i = START; i < targetIndex; i++) {
    const mask = killMask(data, i, useAlt);
    [useAlt, e, c] = advance(useAlt, e, c, mask[numKey(data[i])] === 1);
  }
  return killMaskToNumbers(killMask(data, targetIndex, useAlt));
}