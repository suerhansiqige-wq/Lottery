// 规则9减去位杀、BTG跨和、通杀码后的准确率测试
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';
import { lotteryData as pl3Data } from './pl3-app/src/data/lotteryData.js';

// 规则9生成
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
    const ha = hAdd([a,b,c]);
    const hs = hSub([a,b,c]);
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

// 位杀（V14）
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

// BTG跨和
function generateBTGKuaHeNumbers(item) {
  if (!item) return [];
  const { d1, d2, d3 } = item;
  const span = Math.max(d1,d2,d3) - Math.min(d1,d2,d3);
  const sum = d1 + d2 + d3;
  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    const s2 = Math.max(a,b,c) - Math.min(a,b,c);
    const sum2 = a + b + c;
    if (s2 === span && sum2 === sum) result.push(s);
  }
  return result;
}

// 通杀码
function getTongsha(d2) {
  const TONGSHA_MAP = { 0: 0, 1: 8, 2: 6, 3: 4, 4: 7, 5: 9, 6: 1, 7: 2, 8: 4, 9: 6 };
  return TONGSHA_MAP[d2];
}

function testCombined(name, data) {
  const sorted = [...data].sort((a, b) => Number(a.issue) - Number(b.issue));
  let total = 0, hit = 0;
  let totalAfterFilter = 0, hitAfterFilter = 0;
  let maxRemaining = 0, minRemaining = 999;
  let sumRemaining = 0;

  for (let i = 3; i < sorted.length; i++) {
    const curr = sorted[i];
    const actualNum = `${curr.d1}${curr.d2}${curr.d3}`;

    // 规则9预测（基于i-1期预测i期）
    const rule9 = generateRule9Numbers(sorted[i-1], sorted[i-2], sorted[i-3]);
    if (rule9.length === 0) continue;

    total++;
    const rule9Hit = rule9.includes(actualNum);
    if (rule9Hit) hit++;

    // 位杀过滤
    const killDigits = generatePositionKillNumbers(sorted, i);
    const posKillSet = new Set([...killDigits.d1, ...killDigits.d2, ...killDigits.d3]);

    // BTG跨和
    const btgNumbers = new Set(generateBTGKuaHeNumbers(sorted[i-1]));

    // 通杀码
    const tongsha = getTongsha(sorted[i-1].d2);

    // 过滤：从规则9中移除位杀、BTG跨和、通杀码
    const filtered = rule9.filter(num => {
      const a = +num[0], b = +num[1], c = +num[2];
      // 位杀：百位不在killDigits.d1，十位不在killDigits.d2，个位不在killDigits.d3
      if (killDigits.d1.includes(a)) return false;
      if (killDigits.d2.includes(b)) return false;
      if (killDigits.d3.includes(c)) return false;
      // BTG跨和：不在BTG集合中
      if (btgNumbers.has(num)) return false;
      // 通杀码：任意位等于通杀码
      if (a === tongsha || b === tongsha || c === tongsha) return false;
      return true;
    });

    const remaining = filtered.length;
    sumRemaining += remaining;
    maxRemaining = Math.max(maxRemaining, remaining);
    minRemaining = Math.min(minRemaining, remaining);
    totalAfterFilter++;

    if (filtered.includes(actualNum)) hitAfterFilter++;
  }

  console.log(`\n=== ${name} ===`);
  console.log(`规则9原始: ${hit}/${total} (${(hit/total*100).toFixed(2)}%)`);
  console.log(`过滤后: ${hitAfterFilter}/${totalAfterFilter} (${(hitAfterFilter/totalAfterFilter*100).toFixed(2)}%)`);
  console.log(`剩余注数: 平均${(sumRemaining/totalAfterFilter).toFixed(0)}, 最小${minRemaining}, 最大${maxRemaining}`);
  console.log(`过滤掉: ${total - hitAfterFilter > 0 ? '有' : '无'}误杀（规则9对但过滤后错的）`);

  // 计算误杀
  let falseKill = 0;
  for (let i = 3; i < sorted.length; i++) {
    const curr = sorted[i];
    const actualNum = `${curr.d1}${curr.d2}${curr.d3}`;
    const rule9 = generateRule9Numbers(sorted[i-1], sorted[i-2], sorted[i-3]);
    if (!rule9.includes(actualNum)) continue; // 规则9本身就错了，不算误杀

    const killDigits = generatePositionKillNumbers(sorted, i);
    const btgNumbers = new Set(generateBTGKuaHeNumbers(sorted[i-1]));
    const tongsha = getTongsha(sorted[i-1].d2);

    const a = curr.d1, b = curr.d2, c = curr.d3;
    let killed = false;
    if (killDigits.d1.includes(a) || killDigits.d2.includes(b) || killDigits.d3.includes(c)) killed = true;
    if (btgNumbers.has(actualNum)) killed = true;
    if (a === tongsha || b === tongsha || c === tongsha) killed = true;

    if (killed) falseKill++;
  }
  console.log(`误杀期数: ${falseKill} (规则9对但被过滤掉的)`);
}

console.log('=== 规则9 - 位杀 - BTG跨和 - 通杀码 综合测试 ===');
testCombined('福彩3D', fc3dData);
testCombined('排列三', pl3Data);
