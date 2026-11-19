// 杀150注：增强票×3 + 对位马尔可夫，杀得分最低150注
// 福彩3D回测8302期86.03%（连错4 连中52）；排列三回测7332期84.97%（连错4 连中44）
// ✓=奖号不在杀集（杀对），✗=奖号被杀（误杀）

export const KILL_COUNT = 150;
const LOOKBACK = 300; // ceil(200*3/2)，与增强列同源
const SUM_THRESHOLD = 12;
const START = 451; // 热身期数，与回测一致

const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;
const sumKey = (d) => d.d1 + d.d2 + d.d3;
const hAddKey = (d) => ((d.d1 + d.d2) % 10) * 100 + ((d.d2 + d.d3) % 10) * 10 + ((d.d1 + d.d3) % 10);
const hSubKey = (d) => Math.abs(d.d1 - d.d2) * 100 + Math.abs(d.d2 - d.d3) * 10 + Math.abs(d.d1 - d.d3);
const toStr = (n) => String(n).padStart(3, '0');

const ADD_PAT = new Map();
const SUB_PAT = new Map();
const SUM_PAT = new Map();
for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) {
  const d = { d1: a, d2: b, d3: c };
  const n = numKey(d);
  const ak = hAddKey(d); if (!ADD_PAT.has(ak)) ADD_PAT.set(ak, []); ADD_PAT.get(ak).push(n);
  const sk = hSubKey(d); if (!SUB_PAT.has(sk)) SUB_PAT.set(sk, []); SUB_PAT.get(sk).push(n);
  const sm = sumKey(d); if (!SUM_PAT.has(sm)) SUM_PAT.set(sm, []); SUM_PAT.get(sm).push(n);
}

const PAIRS = [[0, 1], [0, 2], [1, 2]];
const DIGITS = [];
const PAIR_DIGITS = [];
for (let n = 0; n < 1000; n++) {
  const d = [(n / 100) | 0, ((n / 10) | 0) % 10, n % 10];
  DIGITS[n] = d;
  PAIR_DIGITS[n] = PAIRS.map(pr => d[pr[0]] * 10 + d[pr[1]]);
}
const digitOf = (d, p) => p === 0 ? d.d1 : (p === 1 ? d.d2 : d.d3);
const pairVal = (d, pr) => digitOf(d, pr[0]) * 10 + digitOf(d, pr[1]);

function enhVote(data, i) {
  const start = i - LOOKBACK;
  const vote = new Int32Array(1000);
  const sumC = new Int32Array(28);
  const aP = new Set(), sP = new Set(), smP = new Set();
  for (let j = start; j < i; j++) if (j % 3 !== 0) {
    aP.add(hAddKey(data[j])); sP.add(hSubKey(data[j]));
    const sk = sumKey(data[j]); smP.add(sk); sumC[sk]++;
  }
  for (const k of aP) for (const n of ADD_PAT.get(k)) vote[n]++;
  for (const k of sP) for (const n of SUB_PAT.get(k)) vote[n]++;
  for (const sk of smP) if (sumC[sk] >= SUM_THRESHOLD) for (const n of SUM_PAT.get(sk)) vote[n] += 1000;
  return vote;
}

function newMkPair() {
  return PAIRS.map(() => Array.from({ length: 100 }, () => new Int32Array(100)));
}

function killMask(data, i, mkPair) {
  const prev = data[i - 1];
  const ev = enhVote(data, i);
  const pv = PAIRS.map((pr, k) => mkPair[k][pairVal(prev, pr)]);
  const score = new Float64Array(1000);
  for (let n = 0; n < 1000; n++) {
    const pd = PAIR_DIGITS[n];
    score[n] = ev[n] * 3 + pv[0][pd[0]] + pv[1][pd[1]] + pv[2][pd[2]];
  }
  const order = [...Array(1000).keys()].sort((a, b) => score[a] - score[b]);
  const mask = new Uint8Array(1000);
  for (let j = 0; j < KILL_COUNT; j++) mask[order[j]] = 1;
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
  const mkPair = newMkPair();
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1], cur = data[i];
    if (i >= START) {
      const mask = killMask(data, i, mkPair);
      const t = numKey(cur);
      map.set(cur.issue, { size: KILL_COUNT, hit: !mask[t], kill: mask });
    }
    for (let k = 0; k < 3; k++) mkPair[k][pairVal(prev, PAIRS[k])][pairVal(cur, PAIRS[k])]++;
  }
  return map;
}

// 下期预留行：用 targetIndex 之前的历史建马尔可夫，算下一期杀集
export function getKill150Numbers(data, targetIndex) {
  if (targetIndex < START || targetIndex > data.length) return [];
  const mkPair = newMkPair();
  for (let i = 1; i < targetIndex; i++) {
    const prev = data[i - 1], cur = data[i];
    for (let k = 0; k < 3; k++) mkPair[k][pairVal(prev, PAIRS[k])][pairVal(cur, PAIRS[k])]++;
  }
  const mask = killMask(data, targetIndex, mkPair);
  return killMaskToNumbers(mask);
}