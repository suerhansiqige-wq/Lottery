// 规则9 + BTG跨和 配合测试
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

function goldenGridHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function goldenGridHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function goldenGridVAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function goldenGridVSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

function generateRule9(prev1, prev2, prev3) {
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
    let filtered = result.filter(s => { const sum = (+s[0]) + (+s[1]) + (+s[2]); return sum >= 5 && sum <= 22; });
    if (filtered.length > 850) filtered = filtered.filter(s => { const sum = (+s[0]) + (+s[1]) + (+s[2]); return sum >= 6 && sum <= 21; });
    if (filtered.length > 850) filtered = filtered.filter(s => { const digits = [+s[0], +s[1], +s[2]]; return Math.max(...digits) - Math.min(...digits) >= 1; });
    if (filtered.length > 850) filtered = filtered.filter(s => { const sum = (+s[0]) + (+s[1]) + (+s[2]); return sum >= 7 && sum <= 20; });
    if (filtered.length > 850) filtered = filtered.filter(s => { const digits = [+s[0], +s[1], +s[2]]; return Math.max(...digits) - Math.min(...digits) >= 2; });
    return filtered;
  }
  return result;
}

function generateBTG(prev) {
  if (!prev) return [];
  const digits = new Set();
  digits.add(prev.d1); digits.add(prev.d2); digits.add(prev.d3);
  const max = Math.max(prev.d1, prev.d2, prev.d3);
  const min = Math.min(prev.d1, prev.d2, prev.d3);
  digits.add(max - min);
  const sum = prev.d1 + prev.d2 + prev.d3;
  if (sum >= 10) { digits.add(Math.floor(sum/10)); digits.add(sum%10); }
  else { digits.add(sum); }
  const killDigits = Array.from(digits);
  const combinations = new Set();
  for (const a of killDigits) for (const b of killDigits) for (const c of killDigits) combinations.add(`${a}${b}${c}`);
  return Array.from(combinations);
}

// 测试两列配合
let total = 0;
let bothHit = 0;  // 两列都命中
let eitherHit = 0;  // 至少一列命中
let rule9Hit = 0;
let btgHit = 0;

let maxConsecutiveBothHit = 0, currentBothHit = 0;
let maxConsecutiveEitherHit = 0, currentEitherHit = 0;
let maxConsecutiveBothMiss = 0, currentBothMiss = 0;
let maxConsecutiveEitherMiss = 0, currentEitherMiss = 0;

for (let i = 2; i < data.length; i++) {
  const prev1 = data[i-1];
  const prev2 = data[i-2];
  const prev3 = data[i-3];
  const curr = data[i];
  const currNum = `${curr.d1}${curr.d2}${curr.d3}`;
  
  const rule9Numbers = generateRule9(prev1, prev2, prev3);
  const btgNumbers = generateBTG(prev1);
  
  const rule9HitThis = rule9Numbers.includes(currNum);
  const btgHitThis = !btgNumbers.includes(currNum);  // BTG是杀号，不在其中=命中
  
  total++;
  
  if (rule9HitThis) rule9Hit++;
  if (btgHitThis) btgHit++;
  if (rule9HitThis && btgHitThis) bothHit++;
  if (rule9HitThis || btgHitThis) eitherHit++;
  
  // 两列都命中
  if (rule9HitThis && btgHitThis) {
    currentBothHit++;
    currentBothMiss = 0;
    if (currentBothHit > maxConsecutiveBothHit) maxConsecutiveBothHit = currentBothHit;
  } else {
    currentBothMiss++;
    currentBothHit = 0;
    if (currentBothMiss > maxConsecutiveBothMiss) maxConsecutiveBothMiss = currentBothMiss;
  }
  
  // 至少一列命中
  if (rule9HitThis || btgHitThis) {
    currentEitherHit++;
    currentEitherMiss = 0;
    if (currentEitherHit > maxConsecutiveEitherHit) maxConsecutiveEitherHit = currentEitherHit;
  } else {
    currentEitherMiss++;
    currentEitherHit = 0;
    if (currentEitherMiss > maxConsecutiveEitherMiss) maxConsecutiveEitherMiss = currentEitherMiss;
  }
}

console.log(`=== 规则9 + BTG跨和 配合测试 ===`);
console.log(`总期数: ${total}`);
console.log(`\n--- 单列表现 ---`);
console.log(`规则9命中: ${rule9Hit} (${(rule9Hit/total*100).toFixed(2)}%)`);
console.log(`BTG命中: ${btgHit} (${(btgHit/total*100).toFixed(2)}%)`);
console.log(`\n--- 配合表现 ---`);
console.log(`两列都命中: ${bothHit} (${(bothHit/total*100).toFixed(2)}%)`);
console.log(`至少一列命中: ${eitherHit} (${(eitherHit/total*100).toFixed(2)}%)`);
console.log(`\n--- 连对连错 ---`);
console.log(`两列都命中 - 最大连对: ${maxConsecutiveBothHit}期, 最大连错: ${maxConsecutiveBothMiss}期`);
console.log(`至少一列命中 - 最大连对: ${maxConsecutiveEitherHit}期, 最大连错: ${maxConsecutiveEitherMiss}期`);
