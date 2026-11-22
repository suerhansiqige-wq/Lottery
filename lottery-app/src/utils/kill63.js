// 二阶差杀号：二阶差杀百十 ↔ 增强补集减胆码 切换
// 默认杀「百位和十位都在上期二阶差里」的号码；错1期切到「增强930注池补集剔除三数字全在胆码里的号码」，中1期切回
// 福彩3D回测8306期93.96%（连错2，三错0，均63注）；✓=奖号不在杀集（杀对），✗=奖号被杀（误杀）

import { getAddSubNumbersPro } from './addSubPool.js';

const START = 451; // 热身期数，与回测一致
const MISS_SWITCH = 1;
const HIT_RETURN = 1;

const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;
const toStr = (n) => String(n).padStart(3, '0');
const maskSize = (m) => { let s = 0; for (let n = 0; n < 1000; n++) s += m[n]; return s; };
const maskToNumbers = (m) => { const out = []; for (let n = 0; n < 1000; n++) if (m[n]) out.push(toStr(n)); return out; };

// 二阶差杀百十：上期百十差、十个差、百个差再两两相减取绝对值得数字集，百位十位都在集内即杀（个位不限）
function sdMask(prev) {
  const a = Math.abs(prev.d1 - prev.d2), b = Math.abs(prev.d2 - prev.d3), c = Math.abs(prev.d3 - prev.d1);
  const S = new Set([Math.abs(a - b), Math.abs(b - c), Math.abs(c - a)]);
  const mask = new Uint8Array(1000);
  for (let n = 0; n < 1000; n++) {
    if (S.has((n / 100) | 0) && S.has(((n / 10) | 0) % 10)) mask[n] = 1;
  }
  return mask;
}

// 胆码列增量计算（与 enrichData 一致：A=开奖数字+和值各位+跨度，B=必出号+参考一+参考二，胆码=对称差集）
export function danMaSeries(data) {
  const N = data.length;
  const lastAny = new Int32Array(10).fill(-99);
  let prevG2 = Array(10).fill(null), prevG4 = Array(10).fill(null);
  const shengHistory = [];
  const out = [];
  for (let i = 0; i < N; i++) {
    const it = data[i];
    const dd = [it.d1, it.d2, it.d3];
    const dSet = new Set(dd);
    const sum = it.d1 + it.d2 + it.d3;
    const span = Math.max(...dd) - Math.min(...dd);
    const hAdd = [(it.d1 + it.d2) % 10, (it.d2 + it.d3) % 10, (it.d3 + it.d1) % 10];
    const hSub = [Math.abs(it.d1 - it.d2), Math.abs(it.d2 - it.d3), Math.abs(it.d3 - it.d1)];
    let vAdd = [], vSub = [];
    if (i > 0) {
      const p = data[i - 1];
      vAdd = [(it.d1 + p.d1) % 10, (it.d2 + p.d2) % 10, (it.d3 + p.d3) % 10];
      vSub = [Math.abs(it.d1 - p.d1), Math.abs(it.d2 - p.d2), Math.abs(it.d3 - p.d3)];
    }
    for (const d of dd) lastAny[d] = i;
    const g1 = Array(10).fill(0), g3 = Array(10).fill(0);
    for (let d = 0; d < 10; d++) if (i - lastAny[d] <= 2) g1[d] = 1;
    for (let d = 0; d < 10; d++) for (const cd of dd) if (cd + 1 === d || cd - 1 === d) { g3[d] = 1; break; }
    const curG2 = Array(10).fill(null), curG4 = Array(10).fill(null);
    for (let d = 0; d < 10; d++) {
      curG2[d] = g1[d] === 1 ? null : (prevG2[d] !== null ? prevG2[d] : d);
      curG4[d] = (g3[d] === 1 && !dSet.has(d)) ? d : null;
    }
    const sheng = new Set();
    for (let d = 0; d < 10; d++) if (curG2[d] !== null) sheng.add(d);
    shengHistory.push(sheng);
    if (shengHistory.length > 3) shengHistory.shift();
    const shUnion = new Set();
    for (const s of shengHistory) for (const d of s) shUnion.add(d);
    const allCalc = new Set([...hSub, ...hAdd, ...vSub, ...vAdd]);
    const A = new Set([...dd, ...String(sum).split('').map(Number), span]);
    const B = new Set();
    for (let d = 0; d < 10; d++) {
      if (curG2[d] === null && curG4[d] === null) B.add(d);
      if (!allCalc.has(d)) B.add(d);
      if (!shUnion.has(d)) B.add(d);
    }
    const dm = new Set();
    for (let d = 0; d < 10; d++) if (A.has(d) !== B.has(d)) dm.add(d);
    out.push(dm);
    prevG2 = [...curG2]; prevG4 = [...curG4];
  }
  return out;
}

// 增强补集减胆码：增强930注池之外的号码，再剔除三个数字全在上期胆码里的号码
function mdMask(data, i, dmPrev) {
  const pool = getAddSubNumbersPro(data, i);
  const inPool = new Uint8Array(1000);
  for (const s of pool) inPool[+s] = 1;
  const mask = new Uint8Array(1000);
  for (let n = 0; n < 1000; n++) {
    if (inPool[n]) continue;
    const a = (n / 100) | 0, b = ((n / 10) | 0) % 10, c = n % 10;
    if (dmPrev.has(a) && dmPrev.has(b) && dmPrev.has(c)) continue;
    mask[n] = 1;
  }
  return mask;
}

// 一次预计算：各期杀集与对错 index（issue -> { size, hit, kill }）+ 下期预留行杀集 tail
export function buildKill63All(data) {
  const index = new Map();
  if (data.length <= START) return { index, tail: [] };
  const dm = danMaSeries(data);
  const N = data.length;
  const A = new Array(N), B = new Array(N), szA = new Int32Array(N), szB = new Int32Array(N);
  for (let i = START; i < N; i++) {
    A[i] = sdMask(data[i - 1]);
    B[i] = mdMask(data, i, dm[i - 1]);
    szA[i] = maskSize(A[i]);
    szB[i] = maskSize(B[i]);
  }
  let useB = false, e = 0, c = 0;
  for (let i = START; i < N; i++) {
    const mask = useB ? B[i] : A[i];
    const sz = useB ? szB[i] : szA[i];
    const osz = useB ? szA[i] : szB[i];
    const missed = mask[numKey(data[i])] === 1;
    index.set(data[i].issue, { size: sz, hit: !missed, kill: mask });
    if (missed) { e++; c = 0; } else { c++; e = 0; }
    if (sz > 0 && osz > 0) {
      if (!useB && e >= MISS_SWITCH) { useB = true; e = 0; c = 0; }
      else if (useB && c >= HIT_RETURN) { useB = false; e = 0; c = 0; }
    }
  }
  // 预留行：状态已推进到最后一期之后，推导下期杀集（尚无开奖号，只出注数与复制）
  const tailMask = useB ? mdMask(data, N, dm[N - 1]) : sdMask(data[N - 1]);
  return { index, tail: maskToNumbers(tailMask) };
}