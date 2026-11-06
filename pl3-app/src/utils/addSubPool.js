// 加减号码：隔一期用二期（跳期模式），回溯 3L/2 期实际取 L 期
// 投票评分制：5种模式投票，只保留得票≥3的号码

export const ADD_SUB_LOOKBACK = 200;
export const MIN_VOTES = 3; // 最少得票数（3~5可调，越大注数越少越精准）

// 横相加/横相减（同原有逻辑）
const hAddKey = (d) => ((d.d1 + d.d2) % 10) * 100 + ((d.d2 + d.d3) % 10) * 10 + ((d.d1 + d.d3) % 10);
const hSubKey = (d) => Math.abs(d.d1 - d.d2) * 100 + Math.abs(d.d2 - d.d3) * 10 + Math.abs(d.d1 - d.d3);

// 竖相加/竖相减（需要两期数据）
const vAddKey = (curr, prev) => ((curr.d1 + prev.d1) % 10) * 100 + ((curr.d2 + prev.d2) % 10) * 10 + ((curr.d3 + prev.d3) % 10);
const vSubKey = (curr, prev) => Math.abs(curr.d1 - prev.d1) * 100 + Math.abs(curr.d2 - prev.d2) * 10 + Math.abs(curr.d3 - prev.d3);

// 和值（0-27）
const sumKey = (d) => d.d1 + d.d2 + d.d3;

const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;

// 模式 -> 号码集合
const ADD_PAT = new Map();  // 横相加
const SUB_PAT = new Map();  // 横相减
const VADD_PAT = new Map(); // 竖相加
const VSUB_PAT = new Map(); // 竖相减
const SUM_PAT = new Map();  // 和值

// 构建横相加/横相减模式表（单期）
for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) {
  const d = { d1: a, d2: b, d3: c };
  const ak = hAddKey(d);
  if (!ADD_PAT.has(ak)) ADD_PAT.set(ak, []);
  ADD_PAT.get(ak).push(numKey(d));
  const sk = hSubKey(d);
  if (!SUB_PAT.has(sk)) SUB_PAT.set(sk, []);
  SUB_PAT.get(sk).push(numKey(d));
}

// 构建竖相加/竖相减模式表（两期）
for (let a1 = 0; a1 <= 9; a1++) for (let b1 = 0; b1 <= 9; b1++) for (let c1 = 0; c1 <= 9; c1++) {
  for (let a2 = 0; a2 <= 9; a2++) for (let b2 = 0; b2 <= 9; b2++) for (let c2 = 0; c2 <= 9; c2++) {
    const curr = { d1: a1, d2: b1, d3: c1 };
    const prev = { d1: a2, d2: b2, d3: c2 };
    const vak = vAddKey(curr, prev);
    if (!VADD_PAT.has(vak)) VADD_PAT.set(vak, []);
    VADD_PAT.get(vak).push(numKey(curr));
    const vsk = vSubKey(curr, prev);
    if (!VSUB_PAT.has(vsk)) VSUB_PAT.set(vsk, []);
    VSUB_PAT.get(vsk).push(numKey(curr));
  }
}

// 构建和值模式表
for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) {
  const sk = a + b + c;
  if (!SUM_PAT.has(sk)) SUM_PAT.set(sk, []);
  SUM_PAT.get(sk).push(a * 100 + b * 10 + c);
}

// 排序所有模式表
ADD_PAT.forEach(v => v.sort((x, y) => x - y));
SUB_PAT.forEach(v => v.sort((x, y) => x - y));
VADD_PAT.forEach(v => v.sort((x, y) => x - y));
VSUB_PAT.forEach(v => v.sort((x, y) => x - y));
SUM_PAT.forEach(v => v.sort((x, y) => x - y));

const toStr = (n) => String(n).padStart(3, '0');

// 滑动窗口统计：每个号码的得票数（0~5）
export function buildAddSubIndex(data, L = ADD_SUB_LOOKBACK) {
  const votes = new Int32Array(1000);
  const pAdd = new Int32Array(1000);
  const pSub = new Int32Array(1000);
  const pVAdd = new Int32Array(1000);
  const pVSub = new Int32Array(1000);
  const pSum = new Int32Array(28);
  let covered = 0;

  const bumpVote = (n, delta) => {
    const before = votes[n] >= MIN_VOTES;
    votes[n] += delta;
    const after = votes[n] >= MIN_VOTES;
    if (before !== after) covered += after ? 1 : -1;
  };

  const pushPeriod = (d, prev) => {
    const ak = hAddKey(d);
    if (pAdd[ak]++ === 0) for (const n of ADD_PAT.get(ak)) bumpVote(n, 1);
    const sk = hSubKey(d);
    if (pSub[sk]++ === 0) for (const n of SUB_PAT.get(sk)) bumpVote(n, 1);
    if (prev) {
      const vak = vAddKey(d, prev);
      if (pVAdd[vak]++ === 0) for (const n of VADD_PAT.get(vak)) bumpVote(n, 1);
      const vsk = vSubKey(d, prev);
      if (pVSub[vsk]++ === 0) for (const n of VSUB_PAT.get(vsk)) bumpVote(n, 1);
    }
    const sumk = sumKey(d);
    if (pSum[sumk]++ === 0) for (const n of SUM_PAT.get(sumk)) bumpVote(n, 1);
  };

  const popPeriod = (d, prev) => {
    const ak = hAddKey(d);
    if (--pAdd[ak] === 0) for (const n of ADD_PAT.get(ak)) bumpVote(n, -1);
    const sk = hSubKey(d);
    if (--pSub[sk] === 0) for (const n of SUB_PAT.get(sk)) bumpVote(n, -1);
    if (prev) {
      const vak = vAddKey(d, prev);
      if (--pVAdd[vak] === 0) for (const n of VADD_PAT.get(vak)) bumpVote(n, -1);
      const vsk = vSubKey(d, prev);
      if (--pVSub[vsk] === 0) for (const n of VSUB_PAT.get(vsk)) bumpVote(n, -1);
    }
    const sumk = sumKey(d);
    if (--pSum[sumk] === 0) for (const n of SUM_PAT.get(sumk)) bumpVote(n, -1);
  };

  const map = new Map();
  const lookback = Math.ceil(L * 3 / 2);
  for (let i = 0; i < data.length; i++) {
    if (i >= 1 && (i - 1) % 3 !== 0) {
      const prev = i >= 2 ? data[i - 2] : null;
      pushPeriod(data[i - 1], prev);
    }
    if (i - lookback - 1 >= 0 && (i - lookback - 1) % 3 !== 0) {
      const prevIdx = i - lookback - 2;
      const prev = prevIdx >= 0 ? data[prevIdx] : null;
      popPeriod(data[i - lookback - 1], prev);
    }
    if (i < lookback) continue;
    const t = numKey(data[i]);
    map.set(data[i].issue, { size: covered, hit: votes[t] >= MIN_VOTES });
  }
  return map;
}
    const t = numKey(data[i]);
    map.set(data[i].issue, { size: covered, hit: cAdd[t] + cSub[t] + cVAdd[t] + cVSub[t] + cSum[t] > 0 });
  }
  return map;
}

// 单期候选池号码（点复制时才现算，避免全量存字符串）
// 隔一用二：周期为3，跳过第1期（余数0），使用第2、3期（余数1和2）
export function getAddSubNumbers(data, targetIndex, L = ADD_SUB_LOOKBACK) {
  const lookback = Math.ceil(L * 3 / 2);
  if (targetIndex < lookback) return [];
  const start = targetIndex - lookback;
  const aPats = new Set();
  const sPats = new Set();
  const vaPats = new Set();
  const vsPats = new Set();
  const sumPats = new Set();

  // 隔一用二：周期为3，跳过余数0，使用余数1和2（与buildAddSubIndex的(i-1)%3基准一致）
  for (let j = start; j < targetIndex; j++) {
    if (j % 3 !== 0) {
      aPats.add(hAddKey(data[j]));
      sPats.add(hSubKey(data[j]));
      sumPats.add(sumKey(data[j]));
      // 竖相加/竖相减需要上期数据
      if (j > 0) {
        vaPats.add(vAddKey(data[j], data[j - 1]));
        vsPats.add(vSubKey(data[j], data[j - 1]));
      }
    }
  }

// 单期候选池号码（只返回得票>=MIN_VOTES的号码）
export function getAddSubNumbers(data, targetIndex, L = ADD_SUB_LOOKBACK) {
  const lookback = Math.ceil(L * 3 / 2);
  if (targetIndex < lookback) return [];
  const start = targetIndex - lookback;

  const voteCount = new Int32Array(1000);
  const aPats = new Set();
  const sPats = new Set();
  const vaPats = new Set();
  const vsPats = new Set();
  const sumPats = new Set();

  for (let j = start; j < targetIndex; j++) {
    if (j % 3 !== 0) {
      aPats.add(hAddKey(data[j]));
      sPats.add(hSubKey(data[j]));
      sumPats.add(sumKey(data[j]));
      if (j > 0) {
        vaPats.add(vAddKey(data[j], data[j - 1]));
        vsPats.add(vSubKey(data[j], data[j - 1]));
      }
    }
  }

  for (const k of aPats) for (const n of ADD_PAT.get(k)) voteCount[n]++;
  for (const k of sPats) for (const n of SUB_PAT.get(k)) voteCount[n]++;
  for (const k of vaPats) for (const n of VADD_PAT.get(k)) voteCount[n]++;
  for (const k of vsPats) for (const n of VSUB_PAT.get(k)) voteCount[n]++;
  for (const k of sumPats) for (const n of SUM_PAT.get(k)) voteCount[n]++;

  const result = [];
  for (let n = 0; n < 1000; n++) {
    if (voteCount[n] >= MIN_VOTES) result.push(n);
  }
  return result.map(toStr);
}
