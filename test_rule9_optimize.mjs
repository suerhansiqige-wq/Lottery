// 规则9算法优化测试脚本
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// 原始规则9算法
function goldenGridHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function goldenGridHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function goldenGridVAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function goldenGridVSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

function generateRule9Original(prev1, prev2, prev3) {
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
    let filtered = result.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= 5 && sum <= 22;
    });
    
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const sum = (+s[0]) + (+s[1]) + (+s[2]);
        return sum >= 6 && sum <= 21;
      });
    }
    
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        const span = Math.max(...digits) - Math.min(...digits);
        return span >= 1;
      });
    }
    
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const sum = (+s[0]) + (+s[1]) + (+s[2]);
        return sum >= 7 && sum <= 20;
      });
    }
    
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        const span = Math.max(...digits) - Math.min(...digits);
        return span >= 2;
      });
    }
    
    return filtered;
  }
  
  return result;
}

// 测试原始算法
let total = 0;
let hit = 0;
let totalNotes = 0;

for (let i = 2; i < data.length; i++) {
  const prev1 = data[i-1];
  const prev2 = data[i-2];
  const prev3 = data[i-3];
  const curr = data[i];
  
  const numbers = generateRule9Original(prev1, prev2, prev3);
  const currNum = `${curr.d1}${curr.d2}${curr.d3}`;
  const isHit = numbers.includes(currNum);
  
  total++;
  totalNotes += numbers.length;
  if (isHit) hit++;
}

console.log(`=== 原始规则9算法 ===`);
console.log(`总期数: ${total}`);
console.log(`命中: ${hit}`);
console.log(`命中率: ${(hit/total*100).toFixed(2)}%`);
console.log(`平均注数: ${Math.round(totalNotes/total)}注`);
