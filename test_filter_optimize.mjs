// 优化过滤逻辑 - 减少误杀
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));

function generateRule9Numbers(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];
  const ha1 = hAdd(d1), hs1 = hSub(d1);
  const ha2 = hAdd(d2), hs2 = hSub(d2);
  const ha3 = hAdd(d3), hs3 = hSub(d3);
  const va1 = vAdd(d1, d2), vs1 = vSub(d1, d2);
  const va2 = vAdd(d2, d3), vs2 = vSub(d2, d3);
  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);
  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    if ([a,b,c].every(v => poolHA1.has(v))) continue;
    if ([a,b,c].every(v => poolHS1.has(v))) continue;
    if ([a,b,c].every(v => poolVA1.has(v))) continue;
    if ([a,b,c].every(v => poolVS1.has(v))) continue;
    if ([a,b,c].every(v => poolHA2.has(v))) continue;
    if ([a,b,c].every(v => poolHS2.has(v))) continue;
    if ([a,b,c].every(v => poolVA2.has(v))) continue;
    if ([a,b,c].every(v => poolVS2.has(v))) continue;
    if ([a,b,c].every(v => poolHA3.has(v))) continue;
    if ([a,b,c].every(v => poolHS3.has(v))) continue;
    result.push(s);
  }
  return result;
}
function hAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[0]+d[2])%10]; }
function hSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[0]-d[2])]; }
function vAdd(d1, d2) { return [(d1[0]+d2[0])%10, (d1[1]+d2[1])%10, (d1[2]+d2[2])%10]; }
function vSub(d1, d2) { return [Math.abs(d1[0]-d2[0]), Math.abs(d1[1]-d2[1]), Math.abs(d1[2]-d2[2])]; }

function getPositionKill(data, i) {
  if (i < 3) return { d1: [], d2: [], d3: [] };
  const recent = data.slice(i - 3, i);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  const lastItem = data[i - 1];
  const killDigits = { d1: [], d2: [], d3: [] };
  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = lastItem[pos];
    if (avgSum >= 14) killDigits[pos] = [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) killDigits[pos] = [lastDigit === 0 ? 1 : 0];
    else killDigits[pos] = [lastDigit];
  }
  return killDigits;
}

function getBTGNumbers(item) {
  if (!item) return new Set();
  const { d1, d2, d3 } = item;
  const span = Math.max(d1,d2,d3) - Math.min(d1,d2,d3);
  const sum = d1 + d2 + d3;
  const result = new Set();
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    if (Math.max(a,b,c) - Math.min(a,b,c) === span && a+b+c === sum) result.add(s);
  }
  return result;
}

function getTongsha(d2) {
  const M = { 0:0, 1:8, 2:6, 3:4, 4:7, 5:9, 6:1, 7:2, 8:4, 9:6 };
  return M[d2];
}

// 方案A: 原始（并集过滤）- 任一条件命中就杀
function filterA(rule9, posKill, btg, tongsha) {
  return rule9.filter(num => {
    const a = +num[0], b = +num[1], c = +num[2];
    if (posKill.d1.includes(a) || posKill.d2.includes(b) || posKill.d3.includes(c)) return false;
    if (btg.has(num)) return false;
    if (a === tongsha || b === tongsha || c === tongsha) return false;
    return true;
  });
}

// 方案B: 交集过滤 - 三个条件都命中才杀
function filterB(rule9, posKill, btg, tongsha) {
  return rule9.filter(num => {
    const a = +num[0], b = +num[1], c = +num[2];
    const posKilled = posKill.d1.includes(a) || posKill.d2.includes(b) || posKill.d3.includes(c);
    const btgKilled = btg.has(num);
    const tongshaKilled = a === tongsha || b === tongsha || c === tongsha;
    // 至少2个条件同时命中才杀
    const killCount = [posKilled, btgKilled, tongshaKilled].filter(Boolean).length;
    return killCount < 2;
  });
}

// 方案C: 只杀位杀+通杀码（去掉BTG）
function filterC(rule9, posKill, btg, tongsha) {
  return rule9.filter(num => {
    const a = +num[0], b = +num[1], c = +num[2];
    if (posKill.d1.includes(a) || posKill.d2.includes(b) || posKill.d3.includes(c)) return false;
    if (a === tongsha || b === tongsha || c === tongsha) return false;
    return true;
  });
}

// 方案D: 只杀BTG+通杀码（去掉位杀）
function filterD(rule9, posKill, btg, tongsha) {
  return rule9.filter(num => {
    const a = +num[0], b = +num[1], c = +num[2];
    if (btg.has(num)) return false;
    if (a === tongsha || b === tongsha || c === tongsha) return false;
    return true;
  });
}

// 方案E: 只杀位杀+BTG（去掉通杀码）
function filterE(rule9, posKill, btg, tongsha) {
  return rule9.filter(num => {
    const a = +num[0], b = +num[1], c = +num[2];
    if (posKill.d1.includes(a) || posKill.d2.includes(b) || posKill.d3.includes(c)) return false;
    if (btg.has(num)) return false;
    return true;
  });
}

// 方案F: 只杀通杀码
function filterF(rule9, posKill, btg, tongsha) {
  return rule9.filter(num => {
    const a = +num[0], b = +num[1], c = +num[2];
    if (a === tongsha || b === tongsha || c === tongsha) return false;
    return true;
  });
}

function testFilter(name, filterFunc) {
  let total = 0, hit = 0, falseKill = 0;
  let sumRemaining = 0, maxR = 0, minR = 999;

  for (let i = 3; i < data.length; i++) {
    const curr = data[i];
    const actualNum = `${curr.d1}${curr.d2}${curr.d3}`;
    const rule9 = generateRule9Numbers(data[i-1], data[i-2], data[i-3]);
    if (rule9.length === 0) continue;
    total++;

    const posKill = getPositionKill(data, i);
    const btg = getBTGNumbers(data[i-1]);
    const tongsha = getTongsha(data[i-1].d2);

    const filtered = filterFunc(rule9, posKill, btg, tongsha);
    const remaining = filtered.length;
    sumRemaining += remaining;
    maxR = Math.max(maxR, remaining);
    minR = Math.min(minR, remaining);

    if (filtered.includes(actualNum)) hit++;
    else if (rule9.includes(actualNum)) falseKill++;
  }

  const accuracy = total > 0 ? (hit/total*100).toFixed(2) : 0;
  const avgR = total > 0 ? (sumRemaining/total).toFixed(0) : 0;
  console.log(`${name}: 命中率${accuracy}%, 平均剩余${avgR}注(${minR}-${maxR}), 误杀${falseKill}期`);
}

console.log('=== 过滤方案对比（福彩3D）===');
console.log('规则9原始: 85.27%, 平均~750注\n');
testFilter('A: 并集(位杀+BTG+通杀)', filterA);
testFilter('B: 至少2条件命中才杀', filterB);
testFilter('C: 位杀+通杀码(去BTG)', filterC);
testFilter('D: BTG+通杀码(去位杀)', filterD);
testFilter('E: 位杀+BTG(去通杀)', filterE);
testFilter('F: 只杀通杀码', filterF);
