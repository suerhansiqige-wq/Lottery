// 计算下期规则9-BTG过滤后的注数
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));
const lastItem = data[data.length - 1];
console.log('最新期号:', lastItem.issue, '开奖号:', `${lastItem.d1}${lastItem.d2}${lastItem.d3}`);

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
  
  // 动态过滤
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

function hAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[0]+d[2])%10]; }
function hSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[0]-d[2])]; }
function vAdd(d1, d2) { return [(d1[0]+d2[0])%10, (d1[1]+d2[1])%10, (d1[2]+d2[2])%10]; }
function vSub(d1, d2) { return [Math.abs(d1[0]-d2[0]), Math.abs(d1[1]-d2[1]), Math.abs(d1[2]-d2[2])]; }

function getBTGNumbers(item) {
  if (!item) return new Set();
  const digits = new Set([item.d1, item.d2, item.d3]);
  const max = Math.max(item.d1, item.d2, item.d3);
  const min = Math.min(item.d1, item.d2, item.d3);
  digits.add(max - min);
  const sum = item.d1 + item.d2 + item.d3;
  if (sum >= 10) { digits.add(Math.floor(sum / 10)); digits.add(sum % 10); }
  else { digits.add(sum); }
  const combinations = new Set();
  for (const a of digits) {
    for (const b of digits) {
      for (const c of digits) {
        combinations.add(`${a}${b}${c}`);
      }
    }
  }
  return combinations;
}

// 用最后3期预测下一期（26284）
const rule9 = generateRule9Numbers(data[data.length-1], data[data.length-2], data[data.length-3]);
const btg = getBTGNumbers(data[data.length-1]);
const filtered = rule9.filter(num => !btg.has(num));

console.log('\n=== 下期(26284)预测 ===');
console.log(`规则9原始: ${rule9.length}注`);
console.log(`BTG过滤后: ${filtered.length}注`);
console.log(`BTG杀号: ${rule9.length - filtered.length}注`);
