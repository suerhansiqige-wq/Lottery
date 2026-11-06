// 加减号码：隔一期用二期（跳期模式），回溯 3L/2 期实际取 L 期
// 隔一用二：横相加/横相减模式，MIN_VOTES=1，命中率~84%，~835注
// 隔一用二增强：横向MIN_VOTES=1 + 和值出现>=12次，命中率~93%，~930注

export const ADD_SUB_LOOKBACK = 200;
export const MIN_VOTES = 1;
export const SUM_THRESHOLD = 12; // 和值在窗口内出现>=此次数才纳入增强池

// 横相加/横相减
const hAddKey = (d) => ((d.d1 + d.d2) % 10) * 100 + ((d.d2 + d.d3) % 10) * 10 + ((d.d1 + d.d3) % 10);
const hSubKey = (d) => Math.abs(d.d1 - d.d2) * 100 + Math.abs(d.d2 - d.d3) * 10 + Math.abs(d.d1 - d.d3);
const sumKey = (d) => d.d1 + d.d2 + d.d3;
const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;

// 模式 -> 号码集合
const ADD_PAT = new Map();
const SUB_PAT = new Map();
const SUM_PAT = new Map();

for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) {
  const d = { d1: a, d2: b, d3: c };
  const ak = hAddKey(d);
  if (!ADD_PAT.has(ak)) ADD_PAT.set(ak, []);
  ADD_PAT.get(ak).push(numKey(d));
  const sk = hSubKey(d);
  if (!SUB_PAT.has(sk)) SUB_PAT.set(sk, []);
  SUB_PAT.get(sk).push(numKey(d));
  const sumk = sumKey(d);
  if (!SUM_PAT.has(sumk)) SUM_PAT.set(sumk, []);
  SUM_PAT.get(sumk).push(numKey(d));
}

ADD_PAT.forEach(v => v.sort((x, y) => x - y));
SUB_PAT.forEach(v => v.sort((x, y) => x - y));
SUM_PAT.forEach(v => v.sort((x, y) => x - y));

const toStr = (n) => String(n).padStart(3, '0');

// ========== 隔一用二（横向模式，MIN_VOTES=1） ==========

export function buildAddSubIndex(data, L = ADD_SUB_LOOKBACK) {
  const votes = new Int32Array(1000);
  const pAdd = new Int32Array(1000);
  const pSub = new Int32Array(1000);
  let covered = 0;

  const bumpVote = (n, delta) => {
    const before = votes[n] >= MIN_VOTES;
    votes[n] += delta;
    const after = votes[n] >= MIN_VOTES;
    if (before !== after) covered += after ? 1 : -1;
  };

  const pushPeriod = (d) => {
    const ak = hAddKey(d);
    if (pAdd[ak]++ === 0) for (const n of ADD_PAT.get(ak)) bumpVote(n, 1);
    const sk = hSubKey(d);
    if (pSub[sk]++ === 0) for (const n of SUB_PAT.get(sk)) bumpVote(n, 1);
  };

  const popPeriod = (d) => {
    const ak = hAddKey(d);
    if (--pAdd[ak] === 0) for (const n of ADD_PAT.get(ak)) bumpVote(n, -1);
    const sk = hSubKey(d);
    if (--pSub[sk] === 0) for (const n of SUB_PAT.get(sk)) bumpVote(n, -1);
  };

  const map = new Map();
  const lookback = Math.ceil(L * 3 / 2);
  for (let i = 0; i < data.length; i++) {
    if (i >= 1 && (i - 1) % 3 !== 0) {
      pushPeriod(data[i - 1]);
    }
    if (i - lookback - 1 >= 0 && (i - lookback - 1) % 3 !== 0) {
      popPeriod(data[i - lookback - 1]);
    }
    if (i < lookback) continue;
    const t = numKey(data[i]);
    map.set(data[i].issue, { size: covered, hit: votes[t] >= MIN_VOTES });
  }
  return map;
}

export function getAddSubNumbers(data, targetIndex, L = ADD_SUB_LOOKBACK) {
  const lookback = Math.ceil(L * 3 / 2);
  if (targetIndex < lookback) return [];
  const start = targetIndex - lookback;

  const voteCount = new Int32Array(1000);
  const aPats = new Set();
  const sPats = new Set();

  for (let j = start; j < targetIndex; j++) {
    if (j % 3 !== 0) {
      aPats.add(hAddKey(data[j]));
      sPats.add(hSubKey(data[j]));
    }
  }

  for (const k of aPats) for (const n of ADD_PAT.get(k)) voteCount[n]++;
  for (const k of sPats) for (const n of SUB_PAT.get(k)) voteCount[n]++;

  const result = [];
  for (let n = 0; n < 1000; n++) {
    if (voteCount[n] >= MIN_VOTES) result.push(n);
  }
  return result.map(toStr);
}

// ========== 隔一用二增强（横向MIN_VOTES=1 + 和值>=SUM_THRESHOLD） ==========

export function buildAddSubIndexPro(data, L = ADD_SUB_LOOKBACK) {
  const map = new Map();
  const lookback = Math.ceil(L * 3 / 2);
  for (let i = lookback; i < data.length; i++) {
    const start = i - lookback;
    const voteCount = new Int32Array(1000);
    const sumCounts = new Int32Array(28);
    const aPats = new Set();
    const sPats = new Set();
    const sumPats = new Set();

    for (let j = start; j < i; j++) {
      if (j % 3 !== 0) {
        aPats.add(hAddKey(data[j]));
        sPats.add(hSubKey(data[j]));
        const sk = sumKey(data[j]);
        sumPats.add(sk);
        sumCounts[sk]++;
      }
    }

    for (const k of aPats) for (const n of ADD_PAT.get(k)) voteCount[n]++;
    for (const k of sPats) for (const n of SUB_PAT.get(k)) voteCount[n]++;

    const pool = new Set();
    for (let n = 0; n < 1000; n++) {
      if (voteCount[n] >= 1) pool.add(n);
    }
    for (const sk of sumPats) {
      if (sumCounts[sk] >= SUM_THRESHOLD) {
        for (const n of SUM_PAT.get(sk)) pool.add(n);
      }
    }

    const t = numKey(data[i]);
    map.set(data[i].issue, { size: pool.size, hit: pool.has(t) });
  }
  return map;
}

export function getAddSubNumbersPro(data, targetIndex, L = ADD_SUB_LOOKBACK) {
  const lookback = Math.ceil(L * 3 / 2);
  if (targetIndex < lookback) return [];
  const start = targetIndex - lookback;

  const voteCount = new Int32Array(1000);
  const sumCounts = new Int32Array(28);
  const aPats = new Set();
  const sPats = new Set();
  const sumPats = new Set();

  for (let j = start; j < targetIndex; j++) {
    if (j % 3 !== 0) {
      aPats.add(hAddKey(data[j]));
      sPats.add(hSubKey(data[j]));
      const sk = sumKey(data[j]);
      sumPats.add(sk);
      sumCounts[sk]++;
    }
  }

  for (const k of aPats) for (const n of ADD_PAT.get(k)) voteCount[n]++;
  for (const k of sPats) for (const n of SUB_PAT.get(k)) voteCount[n]++;

  const pool = new Set();
  for (let n = 0; n < 1000; n++) {
    if (voteCount[n] >= 1) pool.add(n);
  }
  for (const sk of sumPats) {
    if (sumCounts[sk] >= SUM_THRESHOLD) {
      for (const n of SUM_PAT.get(sk)) pool.add(n);
    }
  }

  return [...pool].sort((a, b) => a - b).map(toStr);
}
