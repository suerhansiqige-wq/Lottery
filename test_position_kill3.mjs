// 位置杀号法最终优化
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V15: 每位杀1个 + 和值跨度过滤
function generatePositionKillV7(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  
  const killBai = new Set([d1[0]]);
  const killShi = new Set([d1[1]]);
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
  
  // 和值跨度过滤
  if (result.length > 650) {
    let filtered = result.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= 6 && sum <= 21;
    });
    if (filtered.length > 650) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        return Math.max(...digits) - Math.min(...digits) >= 2;
      });
    }
    return filtered;
  }
  
  return result;
}

// V16: 每位杀2个（上期+上上期）
function generatePositionKillV8(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  
  const killBai = new Set([d1[0], d2[0]]);
  const killShi = new Set([d1[1], d2[1]]);
  const killGe = new Set([d1[2], d2[2]]);
  
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

// V17: 混合策略 - 百位杀1个，十位个位杀2个
function generatePositionKillV9(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  
  const killBai = new Set([d1[0]]);  // 百位只杀1个
  const killShi = new Set([d1[1], d2[1]]);  // 十位杀2个
  const killGe = new Set([d1[2], d2[2]]);  // 个位杀2个
  
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

// V18: 混合策略 - 百位杀2个，十位个位杀1个
function generatePositionKillV10(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  
  const killBai = new Set([d1[0], d2[0]]);  // 百位杀2个
  const killShi = new Set([d1[1]]);  // 十位只杀1个
  const killGe = new Set([d1[2]]);  // 个位只杀1个
  
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
  console.log(`注数减少: ${100 - Math.round(totalNotes/total)/8.1}% (相对规则9的810注)`);
}

console.log('=== 位置杀号法最终优化 ===');
testVersion('V15 每位杀1个+过滤', generatePositionKillV7);
testVersion('V16 每位杀2个', generatePositionKillV8);
testVersion('V17 百1十2个2', generatePositionKillV9);
testVersion('V18 百2十1个1', generatePositionKillV10);
