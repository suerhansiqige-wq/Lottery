// 位置杀号法优化 - 减少每位杀号数量
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V12: 每位只杀2-3个数字
function generatePositionKillV4(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];
  
  // 百位：只杀近2期百位 + 上期百十和尾
  const killBai = new Set([d1[0], d2[0], (d1[0]+d1[1])%10]);
  
  // 十位：只杀近2期十位 + 上期十个和尾
  const killShi = new Set([d1[1], d2[1], (d1[1]+d1[2])%10]);
  
  // 个位：只杀近2期个位 + 上期百个和尾
  const killGe = new Set([d1[2], d2[2], (d1[0]+d1[2])%10]);
  
  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    
    if (killBai.has(a)) continue;
    if (killShi.has(b)) continue;
    if (killGe.has(c)) continue;
    
    result.push(s);
  }
  
  return result;
}

// V13: 每位杀1-2个（最精简）
function generatePositionKillV5(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  
  // 百位：只杀上期百位
  const killBai = new Set([d1[0]]);
  
  // 十位：只杀上期十位
  const killShi = new Set([d1[1]]);
  
  // 个位：只杀上期个位
  const killGe = new Set([d1[2]]);
  
  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    
    if (killBai.has(a)) continue;
    if (killShi.has(b)) continue;
    if (killGe.has(c)) continue;
    
    result.push(s);
  }
  
  return result;
}

// V14: 位置杀号 + 规则9融合
function goldenGridHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function goldenGridHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function goldenGridVAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function goldenGridVSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

function generatePositionKillV6(prev1, prev2, prev3) {
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

  // 位置杀号
  const killBai = new Set([d1[0], d2[0]]);
  const killShi = new Set([d1[1], d2[1]]);
  const killGe = new Set([d1[2], d2[2]]);

  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    const ha = goldenGridHAdd([a,b,c]);
    const hs = goldenGridHSub([a,b,c]);

    // 位置杀号
    if (killBai.has(a)) continue;
    if (killShi.has(b)) continue;
    if (killGe.has(c)) continue;

    // 规则9杀号
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
  
  return result;
}

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
}

console.log('=== 位置杀号法优化测试 ===');
testVersion('V12 每位杀3个', generatePositionKillV4);
testVersion('V13 每位杀1个', generatePositionKillV5);
testVersion('V14 位置+规则9融合', generatePositionKillV6);
