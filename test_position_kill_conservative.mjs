// 位杀算法 - 超保守策略，追求最大连错<3期
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V26: 超保守位杀 - 只在3个信号完全一致时杀号，否则不杀
function positionKillUltraConservative(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 信号1：和值趋势
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  let signal1;
  if (avgSum >= 15) signal1 = 9;
  else if (avgSum <= 10) signal1 = 0;
  else signal1 = -1; // 不杀
  
  // 信号2：奇偶极端
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  let signal2;
  if (oddCount >= 4) signal2 = lastDigit % 2 === 1 ? 9 : 9;
  else if (oddCount <= 1) signal2 = lastDigit % 2 === 0 ? 0 : 0;
  else signal2 = -1;
  
  // 信号3：大小极端
  const bigCount = recent.filter(d => d[pos] >= 5).length;
  let signal3;
  if (bigCount >= 4) signal3 = 9;
  else if (bigCount <= 1) signal3 = 0;
  else signal3 = -1;
  
  // 只有3个信号完全一致才杀
  if (signal1 !== -1 && signal1 === signal2 && signal2 === signal3) {
    return [signal1];
  }
  // 否则杀上期（保守选择）
  else {
    return [lastDigit];
  }
}

// V27: 动态保守位杀 - 根据近期稳定性调整
function positionKillDynamicConservative(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 计算该位置的稳定性（相邻期差值的方差）
  const diffs = [];
  for (let i = 1; i < recent.length; i++) {
    diffs.push(Math.abs(recent[i][pos] - recent[i-1][pos]));
  }
  const avgDiff = diffs.reduce((s, v) => s + v, 0) / diffs.length;
  
  // 稳定（avgDiff<2）：杀上期
  if (avgDiff < 2) {
    return [lastDigit];
  }
  // 不稳定（avgDiff>=3）：杀和值约束
  else if (avgDiff >= 3) {
    const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
    if (avgSum >= 15) return [9];
    else if (avgSum <= 10) return [0];
    else return [lastDigit];
  }
  // 中等：杀上期
  else {
    return [lastDigit];
  }
}

// V28: 位置冷热保守位杀 - 只杀极热或极冷号
function positionKillHotColdConservative(prevData, pos) {
  const recent = prevData.slice(-10);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 统计该位置各数字出现次数
  const counts = {};
  for (let d = 0; d <= 9; d++) counts[d] = 0;
  recent.forEach(d => counts[d[pos]]++);
  
  // 找出现最多的（热号）
  const maxCount = Math.max(...Object.values(counts));
  const hotDigit = Object.keys(counts).find(k => counts[k] === maxCount);
  
  // 找遗漏最大的（冷号）
  const missing = {};
  for (let d = 0; d <= 9; d++) {
    let miss = 0;
    for (let i = prevData.length - 1; i >= 0; i--) {
      if (prevData[i][pos] === d) break;
      miss++;
    }
    missing[d] = miss;
  }
  const coldDigit = Object.keys(missing).reduce((a, b) => missing[a] > missing[b] ? a : b);
  
  // 极热（出现>=4次）：杀热号
  if (maxCount >= 4 && parseInt(hotDigit) !== lastDigit) {
    return [parseInt(hotDigit)];
  }
  // 极冷（遗漏>=15）：杀冷号
  else if (missing[coldDigit] >= 15 && parseInt(coldDigit) !== lastDigit) {
    return [parseInt(coldDigit)];
  }
  // 否则杀上期
  else {
    return [lastDigit];
  }
}

// V29: 位置连号保守位杀 - 杀近期连出的数字
function positionKillConsecutiveConservative(prevData, pos) {
  const recent = prevData.slice(-3);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 检查是否有连出（连续2期相同）
  if (recent[1][pos] === recent[2][pos]) {
    // 连出后杀该数字
    return [recent[2][pos]];
  }
  // 否则杀上期
  else {
    return [lastDigit];
  }
}

// V30: 位置镜像保守位杀 - 杀上期的镜像数字（10-上期）
function positionKillMirrorConservative(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  const mirror = (10 - lastDigit) % 10;
  
  // 如果镜像数字和上期相同，杀上期
  if (mirror === lastDigit) {
    return [lastDigit];
  }
  // 否则杀镜像
  else {
    return [mirror];
  }
}

// V31: 位置加法规律保守位杀 - 杀(上期+1)%10
function positionKillPlus1Conservative(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  return [(lastDigit + 1) % 10];
}

// V32: 位置减法规律保守位杀 - 杀(上期-1+10)%10
function positionKillMinus1Conservative(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  return [(lastDigit - 1 + 10) % 10];
}

// 测试函数
function testPositionKill(name, killFunc) {
  let total = 0;
  let baiHit = 0, shiHit = 0, geHit = 0;
  let baiTotal = 0, shiTotal = 0, geTotal = 0;
  
  let maxConsecutiveMiss = 0, currentConsecutiveMiss = 0;
  let maxConsecutiveHit = 0, currentConsecutiveHit = 0;
  
  for (let i = 10; i < data.length; i++) {
    const prevData = data.slice(0, i);
    const curr = data[i];
    
    const baiKill = killFunc(prevData, 'd1');
    const shiKill = killFunc(prevData, 'd2');
    const geKill = killFunc(prevData, 'd3');
    
    baiTotal++;
    shiTotal++;
    geTotal++;
    
    const baiOk = !baiKill.includes(curr.d1);
    const shiOk = !shiKill.includes(curr.d2);
    const geOk = !geKill.includes(curr.d3);
    
    if (baiOk) baiHit++;
    if (shiOk) shiHit++;
    if (geOk) geHit++;
    
    const allOk = baiOk && shiOk && geOk;
    total++;
    
    if (allOk) {
      currentConsecutiveHit++;
      currentConsecutiveMiss = 0;
      if (currentConsecutiveHit > maxConsecutiveHit) maxConsecutiveHit = currentConsecutiveHit;
    } else {
      currentConsecutiveMiss++;
      currentConsecutiveHit = 0;
      if (currentConsecutiveMiss > maxConsecutiveMiss) maxConsecutiveMiss = currentConsecutiveMiss;
    }
  }
  
  const hitRate = ((baiHit+shiHit+geHit)/(baiTotal+shiTotal+geTotal)*100).toFixed(2);
  console.log(`\n=== ${name} ===`);
  console.log(`百位: ${(baiHit/baiTotal*100).toFixed(2)}% | 十位: ${(shiHit/shiTotal*100).toFixed(2)}% | 个位: ${(geHit/geTotal*100).toFixed(2)}%`);
  console.log(`综合命中率: ${hitRate}%`);
  console.log(`最大连对: ${maxConsecutiveHit} 期 | 最大连错: ${maxConsecutiveMiss} 期`);
  
  return { hitRate: parseFloat(hitRate), maxMiss: maxConsecutiveMiss };
}

console.log('=== 位杀算法 - 超保守策略 ===\n');

const results = [];
results.push({ name: 'V26 超保守', ...testPositionKill('V26 超保守位杀', positionKillUltraConservative) });
results.push({ name: 'V27 动态保守', ...testPositionKill('V27 动态保守位杀', positionKillDynamicConservative) });
results.push({ name: 'V28 冷热保守', ...testPositionKill('V28 位置冷热保守位杀', positionKillHotColdConservative) });
results.push({ name: 'V29 连号保守', ...testPositionKill('V29 位置连号保守位杀', positionKillConsecutiveConservative) });
results.push({ name: 'V30 镜像保守', ...testPositionKill('V30 位置镜像保守位杀', positionKillMirrorConservative) });
results.push({ name: 'V31 加1保守', ...testPositionKill('V31 位置加1保守位杀', positionKillPlus1Conservative) });
results.push({ name: 'V32 减1保守', ...testPositionKill('V32 位置减1保守位杀', positionKillMinus1Conservative) });

console.log('\n\n=== 汇总排名（按命中率降序）===');
results.sort((a, b) => b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const flag = r.hitRate >= 90 && r.maxMiss < 3 ? ' ✓✓✓ 完美!' : (r.hitRate >= 90 ? ' ✓✓' : (r.maxMiss < 3 ? ' ✓ 低连错' : ''));
  console.log(`${i+1}. ${r.name}: ${r.hitRate}% (最大连错${r.maxMiss}期)${flag}`);
});
