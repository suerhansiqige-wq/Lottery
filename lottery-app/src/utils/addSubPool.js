// 加减号码：用回溯 L 期（默认200）的横相加∪横相减候选并集，验证当期开奖号是否命中
// 与验证脚本 verify_add_sub_combined_sweep.js / review_26285_backtest200.js 同一套口径

export const ADD_SUB_LOOKBACK = 200;

const hAddKey = (d) => ((d.d1 + d.d2) % 10) * 100 + ((d.d2 + d.d3) % 10) * 10 + ((d.d1 + d.d3) % 10);
const hSubKey = (d) => Math.abs(d.d1 - d.d2) * 100 + Math.abs(d.d2 - d.d3) * 10 + Math.abs(d.d1 - d.d3);
const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;

// 模式 -> 号码集合（横相加500种、每种2注；横相减136种、每种2~18注）
const ADD_PAT = new Map();
const SUB_PAT = new Map();
for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) {
  const d = { d1: a, d2: b, d3: c };
  const ak = hAddKey(d);
  if (!ADD_PAT.has(ak)) ADD_PAT.set(ak, []);
  ADD_PAT.get(ak).push(numKey(d));
  const sk = hSubKey(d);
  if (!SUB_PAT.has(sk)) SUB_PAT.set(sk, []);
  SUB_PAT.get(sk).push(numKey(d));
}
ADD_PAT.forEach(v => v.sort((x, y) => x - y));
SUB_PAT.forEach(v => v.sort((x, y) => x - y));

const toStr = (n) => String(n).padStart(3, '0');

// 滑动窗口统计每个索引 i（i>=L）对应的候选池注数与命中情况
export function buildAddSubIndex(data, L = ADD_SUB_LOOKBACK) {
  const cAdd = new Int32Array(1000);
  const cSub = new Int32Array(1000);
  const pAdd = new Int32Array(1000);
  const pSub = new Int32Array(1000);
  let covered = 0;

  const bumpAdd = (n, delta) => {
    const before = cAdd[n] + cSub[n] > 0;
    cAdd[n] += delta;
    const after = cAdd[n] + cSub[n] > 0;
    if (before !== after) covered += after ? 1 : -1;
  };
  const bumpSub = (n, delta) => {
    const before = cAdd[n] + cSub[n] > 0;
    cSub[n] += delta;
    const after = cAdd[n] + cSub[n] > 0;
    if (before !== after) covered += after ? 1 : -1;
  };
  const pushPeriod = (d) => {
    const ak = hAddKey(d);
    if (pAdd[ak]++ === 0) for (const n of ADD_PAT.get(ak)) bumpAdd(n, 1);
    const sk = hSubKey(d);
    if (pSub[sk]++ === 0) for (const n of SUB_PAT.get(sk)) bumpSub(n, 1);
  };
  const popPeriod = (d) => {
    const ak = hAddKey(d);
    if (--pAdd[ak] === 0) for (const n of ADD_PAT.get(ak)) bumpAdd(n, -1);
    const sk = hSubKey(d);
    if (--pSub[sk] === 0) for (const n of SUB_PAT.get(sk)) bumpSub(n, -1);
  };

  const map = new Map();
  for (let i = 0; i < data.length; i++) {
    if (i >= 1) pushPeriod(data[i - 1]);
    if (i - L - 1 >= 0) popPeriod(data[i - L - 1]);
    if (i < L) continue;
    const t = numKey(data[i]);
    map.set(data[i].issue, { size: covered, hit: cAdd[t] + cSub[t] > 0 });
  }
  return map;
}

// 单期候选池号码（点复制时才现算，避免全量存字符串）
export function getAddSubNumbers(data, targetIndex, L = ADD_SUB_LOOKBACK) {
  if (targetIndex < L) return [];
  const start = targetIndex - L;
  const aPats = new Set();
  const sPats = new Set();
  for (let j = start; j < targetIndex; j++) {
    aPats.add(hAddKey(data[j]));
    sPats.add(hSubKey(data[j]));
  }
  const nums = new Set();
  for (const k of aPats) for (const n of ADD_PAT.get(k)) nums.add(n);
  for (const k of sPats) for (const n of SUB_PAT.get(k)) nums.add(n);
  return [...nums].sort((a, b) => a - b).map(toStr);
}
