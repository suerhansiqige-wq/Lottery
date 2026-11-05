// 规则9算法优化 - 智能过滤版本
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

function goldenGridHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function goldenGridHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function goldenGridVAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function goldenGridVSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

// V4: 智能过滤 - 增加更多杀号规则，保持高命中率
function generateRule9V4(prev1, prev2, prev3) {
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

  // BTG跨和杀号集合（与BTG算法一致）
  const btgDigits = new Set();
  btgDigits.add(prev1.d1); btgDigits.add(prev1.d2); btgDigits.add(prev1.d3);
  const maxD = Math.max(prev1.d1, prev1.d2, prev1.d3);
  const minD = Math.min(prev1.d1, prev1.d2, prev1.d3);
  btgDigits.add(maxD - minD);
  const sum1 = prev1.d1 + prev1.d2 + prev1.d3;
  if (sum1 >= 10) { btgDigits.add(Math.floor(sum1/10)); btgDigits.add(sum1%10); }
  else { btgDigits.add(sum1); }
  const btgNumbers = new Set();
  for (const a of btgDigits) for (const b of btgDigits) for (const c of btgDigits) btgNumbers.add(`${a}${b}${c}`);

  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    const ha = goldenGridHAdd([a,b,c]);
    const hs = goldenGridHSub([a,b,c]);

    // 原始9规则
    if ([a,b,c].every(v => poolHA1.has(v))) continue;
    if ([a,b,c].every(v => poolHS1.has(v))) continue;
    if ([a,b,c].every(v => poolVA1.has(v))) continue;
    if ([a,b,c].every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolHA1.has(v))) continue;
    if (ha.every(v => poolHA2.has(v))) continue;
    if (ha.every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolVA2.has(v))) continue;
    if (hs.every(v => poolVS1.has(v))) continue;

    // 新增：BTG跨和杀号
    if (btgNumbers.has(s)) continue;

    result.push(s);
  }
  
  // 动态过滤阈值750
  if (result.length > 750) {
    let filtered = result.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= 6 && sum <= 21;
    });
    if (filtered.length > 750) filtered = filtered.filter(s => {
      const digits = [+s[0], +s[1], +s[2]];
      return Math.max(...digits) - Math.min(...digits) >= 2;
    });
    if (filtered.length > 750) filtered = filtered.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= 7 && sum <= 20;
    });
    return filtered;
  }
  return result;
}

// V5: 更激进的BTG融合
function generateRule9V5(prev1, prev2, prev3) {
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

  // BTG跨和杀号
  const btgDigits = new Set();
  btgDigits.add(prev1.d1); btgDigits.add(prev1.d2); btgDigits.add(prev1.d3);
  const maxD = Math.max(prev1.d1, prev1.d2, prev1.d3);
  const minD = Math.min(prev1.d1, prev1.d2, prev1.d3);
  btgDigits.add(maxD - minD);
  const sum1 = prev1.d1 + prev1.d2 + prev1.d3;
  if (sum1 >= 10) { btgDigits.add(Math.floor(sum1/10)); btgDigits.add(sum1%10); }
  else { btgDigits.add(sum1); }
  const btgNumbers = new Set();
  for (const a of btgDigits) for (const b of btgDigits) for (const c of btgDigits) btgNumbers.add(`${a}${b}${c}`);

  // 近3期开奖号
  const recentNumbers = new Set([`${d1[0]}${d1[1]}${d1[2]}`, `${d2[0]}${d2[1]}${d2[2]}`, `${d3[0]}${d3[1]}${d3[2]}`]);

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
    
    // BTG杀号
    if (btgNumbers.has(s)) continue;
    // 近3期排除
    if (recentNumbers.has(s)) continue;

    result.push(s);
  }
  
  // 阈值650
  if (result.length > 650) {
    let filtered = result.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= 7 && sum <= 20;
    });
    if (filtered.length > 650) filtered = filtered.filter(s => {
      const digits = [+s[0], +s[1], +s[2]];
      return Math.max(...digits) - Math.min(...digits) >= 3;
    });
    return filtered;
  }
  return result;
}

// 测试
function testVersion(name, func) {
  let total = 0, hit = 0, totalNotes = 0;
  for (let i = 2; i < data.length; i++) {
    const numbers = func(data[i-1], data[i-2], data[i-3]);
    const currNum = `${data[i].d1}${data[i].d2}${data[i].d3}`;
    total++;
    totalNotes += numbers.length;
    if (numbers.includes(currNum)) hit++;
  }
  console.log(`\n=== ${name} ===`);
  console.log(`总期数: ${total}`);
  console.log(`命中: ${hit}`);
  console.log(`命中率: ${(hit/total*100).toFixed(2)}%`);
  console.log(`平均注数: ${Math.round(totalNotes/total)}注`);
  console.log(`注数减少: ${100 - Math.round(totalNotes/total)/8.1}% (相对V1的810注)`);
}

console.log('=== 规则9算法优化对比 ===');
testVersion('V1 原始算法', generateRule9V1);
testVersion('V4 BTG融合 (750阈值)', generateRule9V4);
testVersion('V5 BTG+近期排除 (650阈值)', generateRule9V5);

// V1定义
function generateRule9V1(prev1, prev2, prev3) {
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
