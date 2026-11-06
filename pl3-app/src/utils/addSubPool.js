// 加减号码：隔一期用二期（跳期模式），回溯 3L/2 期实际取 L 期
// 投票评分制：只用横相加/横相减模式（竖模式每个键映射1000号码，无法过滤）
// 横相加：500键×2号码，横相减：136键×2-18号码

export const ADD_SUB_LOOKBACK = 200;
export const MIN_VOTES = 2; // 最少得票数（2~3可调，越大注数越少）

// 横相加/横相减（同原有逻辑）
const hAddKey = (d) => ((d.d1 + d.d2) % 10) * 100 + ((d.d2 + d.d3) % 10) * 10 + ((d.d1 + d.d3) % 10);
const hSubKey = (d) => Math.abs(d.d1 - d.d2) * 100 + Math.abs(d.d2 - d.d3) * 10 + Math.abs(d.d1 - d.d3);

const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;

// 模式 -> 号码集合
const ADD_PAT = new Map();  // 横相加
const SUB_PAT = new Map();  // 横相减

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

// 排序所有模式表
ADD_PAT.forEach(v => v.sort((x, y) => x - y));
SUB_PAT.forEach(v => v.sort((x, y) => x - y));

const toStr = (n) => String(n).padStart(3, '0');

// 滑动窗口统计：每个号码的得票数（0~5）
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

// 单期候选池号码（只返回得票>=MIN_VOTES的号码）
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
