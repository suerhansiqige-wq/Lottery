// 规则9算法优化 - 智能过滤策略
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

function goldenGridHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function goldenGridHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function goldenGridVAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function goldenGridVSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

// V8: 智能过滤 - 基于近10期和值/跨度分布
function generateRule9V8(prev1, prev2, prev3, recentData) {
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
  
  // 智能过滤：基于近10期数据
  if (recentData && recentData.length >= 10) {
    const recentSums = recentData.slice(-10).map(d => d.d1 + d.d2 + d.d3);
    const recentSpans = recentData.slice(-10).map(d => {
      const digits = [d.d1, d.d2, d.d3];
      return Math.max(...digits) - Math.min(...digits);
    });
    
    const avgSum = recentSums.reduce((a, b) => a + b, 0) / 10;
    const avgSpan = recentSpans.reduce((a, b) => a + b, 0) / 10;
    
    // 动态和值范围：平均值±6
    const sumMin = Math.max(0, Math.floor(avgSum - 6));
    const sumMax = Math.min(27, Math.ceil(avgSum + 6));
    
    // 动态跨度下限：平均值-1（最小1）
    const spanMin = Math.max(1, Math.floor(avgSpan - 1));
    
    let filtered = result.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= sumMin && sum <= sumMax;
    });
    
    if (filtered.length > 700) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        return Math.max(...digits) - Math.min(...digits) >= spanMin;
      });
    }
    
    return filtered;
  }
  
  return result;
}

// V1原始
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

function testVersion(name, func, useRecent = false) {
  let total = 0, hit = 0, totalNotes = 0;
  for (let i = 12; i < data.length; i++) {
    const recentData = useRecent ? data.slice(i-12, i) : null;
    const numbers = func(data[i-1], data[i-2], data[i-3], recentData);
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

console.log('=== 规则9智能过滤优化对比 ===');
testVersion('V1 原始算法', generateRule9V1);
testVersion('V8 智能过滤 (近10期动态)', generateRule9V8, true);
