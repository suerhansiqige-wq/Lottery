// 规则9 去除 BTG跨和 + 位杀 后的剩余注数统计
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

function goldenGridHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function goldenGridHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function goldenGridVAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function goldenGridVSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

function generateRule9Numbers(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];
  const ha1 = goldenGridHAdd(d1), hs1 = goldenGridHSub(d1);
  const ha2 = goldenGridHAdd(d2), hs2 = goldenGridHSub(d2);
  const ha3 = goldenGridHAdd(d3), hs3 = goldenGridHSub(d3);
  const va1 = goldenGridVAdd(d1, d2), vs1 = goldenGridVSub(d1, d2);
  const va2 = goldenGridVAdd(d2, d3), vs2 = goldenGridVSub(d2, d3);
  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);
  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    const ha = goldenGridHAdd([a,b,c]);
    const hs = goldenGridHSub([a,b,c]);
    if ([a,b,c].every(v => poolHA1.has(v))) continue;
    if ([a,b,c].every(v => poolHS1.has(v))) continue;
    if ([a,b,c].every(v => poolVA1.has(v))) continue;
    if ([a,b,c].every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolHA1.has(v))) continue;
    if (ha.every(v => poolHA2.has(v))) continue;
    if (ha.every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolVA2.has(v))) continue;
    if (hs.every(v => poolVS1.has(v))) continue;
    result.push(s);
  }
  if (result.length > 850) {
    let filtered = result.filter(s => { const sum = (+s[0])+(+s[1])+(+s[2]); return sum >= 5 && sum <= 22; });
    if (filtered.length > 850) filtered = filtered.filter(s => { const sum = (+s[0])+(+s[1])+(+s[2]); return sum >= 6 && sum <= 21; });
    if (filtered.length > 850) filtered = filtered.filter(s => { const digits = [+s[0],+s[1],+s[2]]; return Math.max(...digits)-Math.min(...digits) >= 1; });
    if (filtered.length > 850) filtered = filtered.filter(s => { const sum = (+s[0])+(+s[1])+(+s[2]); return sum >= 7 && sum <= 20; });
    if (filtered.length > 850) filtered = filtered.filter(s => { const digits = [+s[0],+s[1],+s[2]]; return Math.max(...digits)-Math.min(...digits) >= 2; });
    return filtered;
  }
  return result;
}

function generateBTGKuaHeNumbers(prevItem) {
  if (!prevItem) return [];
  const digits = new Set();
  digits.add(prevItem.d1); digits.add(prevItem.d2); digits.add(prevItem.d3);
  const max = Math.max(prevItem.d1, prevItem.d2, prevItem.d3);
  const min = Math.min(prevItem.d1, prevItem.d2, prevItem.d3);
  digits.add(max - min);
  const sum = prevItem.d1 + prevItem.d2 + prevItem.d3;
  if (sum >= 10) { digits.add(Math.floor(sum / 10)); digits.add(sum % 10); }
  else { digits.add(sum); }
  const killDigits = Array.from(digits);
  const combinations = new Set();
  for (const a of killDigits) for (const b of killDigits) for (const c of killDigits)
    combinations.add(`${a}${b}${c}`);
  return Array.from(combinations).sort();
}

function generatePositionKillNumbers(data, currentIndex) {
  if (currentIndex < 3) return { d1: [], d2: [], d3: [] };
  const recent = data.slice(currentIndex - 3, currentIndex);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  const lastItem = data[currentIndex - 1];
  const killDigits = { d1: [], d2: [], d3: [] };
  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = lastItem[pos];
    let killDigit;
    if (avgSum >= 14) killDigit = lastDigit === 9 ? 8 : 9;
    else if (avgSum <= 11) killDigit = lastDigit === 0 ? 1 : 0;
    else killDigit = lastDigit;
    killDigits[pos] = [killDigit];
  }
  return killDigits;
}

let minRemain = Infinity, maxRemain = 0;
let totalRemain = 0, total = 0;
let minRule9 = Infinity, maxRule9 = 0;

for (let i = 3; i < data.length - 1; i++) {
  const rule9Nums = generateRule9Numbers(data[i], data[i-1], data[i-2]);
  if (rule9Nums.length === 0) continue;
  
  const btgNums = new Set(generateBTGKuaHeNumbers(data[i]));
  const posKill = generatePositionKillNumbers(data, i + 1);
  
  // 从规则9中去除BTG跨和 + 位杀
  const remaining = rule9Nums.filter(n => {
    // 不在BTG跨和杀号集合中
    if (btgNums.has(n)) return false;
    // 不命中位杀（百位≠killD1 且 十位≠killD2 且 个位≠killD3）
    const d1 = +n[0], d2 = +n[1], d3 = +n[2];
    if (posKill.d1.length && d1 === posKill.d1[0]) return false;
    if (posKill.d2.length && d2 === posKill.d2[0]) return false;
    if (posKill.d3.length && d3 === posKill.d3[0]) return false;
    return true;
  });
  
  const count = remaining.length;
  if (count < minRemain) minRemain = count;
  if (count > maxRemain) maxRemain = count;
  totalRemain += count;
  total++;
  
  if (rule9Nums.length < minRule9) minRule9 = rule9Nums.length;
  if (rule9Nums.length > maxRule9) maxRule9 = rule9Nums.length;
}

console.log(`=== 规则9 去除 BTG跨和 + 位杀 后剩余注数 ===`);
console.log(`\n规则9原始注数：最少 ${minRule9}，最多 ${maxRule9}`);
console.log(`\n去除后剩余注数：`);
console.log(`  最少：${minRemain} 注`);
console.log(`  最多：${maxRemain} 注`);
console.log(`  平均：${Math.round(totalRemain / total)} 注`);
console.log(`  统计期数：${total}`);
