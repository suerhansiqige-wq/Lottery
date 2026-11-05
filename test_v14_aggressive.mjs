// V14激改进版 - 杀2个数字/位，强制连错<3期
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V14激进版1: 双杀策略 - 每位杀2个数字
function positionKillDouble1(prevData, pos) {
  const recent = prevData.slice(-3);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  const lastDigit = prevData[prevData.length-1][pos];
  
  const killDigits = new Set();
  
  // 第1个：V14原版逻辑
  if (avgSum >= 14) killDigits.add(lastDigit === 9 ? 8 : 9);
  else if (avgSum <= 11) killDigits.add(lastDigit === 0 ? 1 : 0);
  else killDigits.add(lastDigit);
  
  // 第2个：镜像
  killDigits.add((10 - lastDigit) % 10);
  
  return Array.from(killDigits);
}

// V14激进版2: 双杀+连错熔断
function positionKillDouble2(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 检查近3期连错
  let recentMiss = 0;
  for (let i = prevData.length - 1; i >= Math.max(0, prevData.length - 3); i--) {
    const curr = prevData[i];
    const prev = prevData[i-1];
    if (!prev) break;
    
    const recent = prevData.slice(Math.max(0, i-3), i);
    const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / Math.max(1, recent.length);
    const prevDigit = prev[pos];
    
    const killDigits = new Set();
    if (avgSum >= 14) killDigits.add(prevDigit === 9 ? 8 : 9);
    else if (avgSum <= 11) killDigits.add(prevDigit === 0 ? 1 : 0);
    else killDigits.add(prevDigit);
    killDigits.add((10 - prevDigit) % 10);
    
    if (killDigits.has(curr[pos])) {
      recentMiss++;
    } else {
      break;
    }
  }
  
  // 连错>=1: 杀上期+加1
  if (recentMiss >= 1) {
    return [lastDigit, (lastDigit + 1) % 10];
  }
  // 否则双杀
  else {
    return positionKillDouble1(prevData, pos);
  }
}

// V14激进版3: 三杀策略 - 每位杀3个数字
function positionKillTriple(prevData, pos) {
  const recent = prevData.slice(-3);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  const lastDigit = prevData[prevData.length-1][pos];
  
  const killDigits = new Set();
  
  // 第1个：V14原版
  if (avgSum >= 14) killDigits.add(lastDigit === 9 ? 8 : 9);
  else if (avgSum <= 11) killDigits.add(lastDigit === 0 ? 1 : 0);
  else killDigits.add(lastDigit);
  
  // 第2个：镜像
  killDigits.add((10 - lastDigit) % 10);
  
  // 第3个：加1
  killDigits.add((lastDigit + 1) % 10);
  
  return Array.from(killDigits);
}

// V14激进版4: 动态双杀 - 根据波动选择杀哪2个
function positionKillDynamicDouble(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 计算波动
  const digits = recent.map(d => d[pos]);
  const mean = digits.reduce((s, v) => s + v, 0) / 5;
  const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 5;
  const stdDev = Math.sqrt(variance);
  
  const killDigits = new Set();
  
  // 波动大: 杀上期+镜像
  if (stdDev >= 2.5) {
    killDigits.add(lastDigit);
    killDigits.add((10 - lastDigit) % 10);
  }
  // 波动中: 杀和值约束+镜像
  else if (stdDev >= 1.5) {
    const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) killDigits.add(lastDigit === 9 ? 8 : 9);
    else if (avgSum <= 11) killDigits.add(lastDigit === 0 ? 1 : 0);
    else killDigits.add(lastDigit);
    killDigits.add((10 - lastDigit) % 10);
  }
  // 波动小: 杀上期+加1
  else {
    killDigits.add(lastDigit);
    killDigits.add((lastDigit + 1) % 10);
  }
  
  return Array.from(killDigits);
}

// V14激进版5: 自适应多杀 - 根据连错动态调整杀号数量
function positionKillAdaptiveMulti(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 检查近5期连错
  let recentMiss = 0;
  for (let i = prevData.length - 1; i >= Math.max(0, prevData.length - 5); i--) {
    const curr = prevData[i];
    const prev = prevData[i-1];
    if (!prev) break;
    
    const r = prevData.slice(Math.max(0, i-3), i);
    const avgSum = r.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / Math.max(1, r.length);
    const prevDigit = prev[pos];
    
    const killDigits = new Set();
    if (avgSum >= 14) killDigits.add(prevDigit === 9 ? 8 : 9);
    else if (avgSum <= 11) killDigits.add(prevDigit === 0 ? 1 : 0);
    else killDigits.add(prevDigit);
    killDigits.add((10 - prevDigit) % 10);
    
    if (killDigits.has(curr[pos])) {
      recentMiss++;
    } else {
      break;
    }
  }
  
  const killDigits = new Set();
  
  // 连错>=2: 杀3个
  if (recentMiss >= 2) {
    killDigits.add(lastDigit);
    killDigits.add((10 - lastDigit) % 10);
    killDigits.add((lastDigit + 1) % 10);
  }
  // 连错=1: 杀2个
  else if (recentMiss === 1) {
    killDigits.add(lastDigit);
    killDigits.add((10 - lastDigit) % 10);
  }
  // 无连错: 杀2个（V14+镜像）
  else {
    const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) killDigits.add(lastDigit === 9 ? 8 : 9);
    else if (avgSum <= 11) killDigits.add(lastDigit === 0 ? 1 : 0);
    else killDigits.add(lastDigit);
    killDigits.add((10 - lastDigit) % 10);
  }
  
  return Array.from(killDigits);
}

// 测试函数（支持多杀）
function testPositionKill(name, killFunc) {
  let total = 0;
  let baiHit = 0, shiHit = 0, geHit = 0;
  let baiTotal = 0, shiTotal = 0, geTotal = 0;
  let baiKill = 0, shiKill = 0, geKill = 0;
  
  let maxConsecutiveMiss = 0, currentConsecutiveMiss = 0;
  let maxConsecutiveHit = 0, currentConsecutiveHit = 0;
  
  for (let i = 10; i < data.length; i++) {
    const prevData = data.slice(0, i);
    const curr = data[i];
    
    const baiK = killFunc(prevData, 'd1');
    const shiK = killFunc(prevData, 'd2');
    const geK = killFunc(prevData, 'd3');
    
    baiKill += baiK.length;
    shiKill += shiK.length;
    geKill += geK.length;
    
    baiTotal++;
    shiTotal++;
    geTotal++;
    
    const baiOk = !baiK.includes(curr.d1);
    const shiOk = !shiK.includes(curr.d2);
    const geOk = !geK.includes(curr.d3);
    
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
  const avgKillPerPos = ((baiKill+shiKill+geKill)/(baiTotal+shiTotal+geTotal)).toFixed(2);
  console.log(`\n=== ${name} ===`);
  console.log(`百位: ${(baiHit/baiTotal*100).toFixed(2)}% | 十位: ${(shiHit/shiTotal*100).toFixed(2)}% | 个位: ${(geHit/geTotal*100).toFixed(2)}%`);
  console.log(`综合命中率: ${hitRate}% | 平均每位杀号数: ${avgKillPerPos}`);
  console.log(`最大连对: ${maxConsecutiveHit} 期 | 最大连错: ${maxConsecutiveMiss} 期`);
  
  return { hitRate: parseFloat(hitRate), maxMiss: maxConsecutiveMiss, maxHit: maxConsecutiveHit, avgKill: parseFloat(avgKillPerPos) };
}

console.log('=== V14激进改进版测试 - 多杀策略 ===\n');

const results = [];
results.push({ name: 'V14双杀', ...testPositionKill('V14激进版1: 双杀策略', positionKillDouble1) });
results.push({ name: 'V14双杀+熔断', ...testPositionKill('V14激进版2: 双杀+连错熔断', positionKillDouble2) });
results.push({ name: 'V14三杀', ...testPositionKill('V14激进版3: 三杀策略', positionKillTriple) });
results.push({ name: 'V14动态双杀', ...testPositionKill('V14激进版4: 动态双杀', positionKillDynamicDouble) });
results.push({ name: 'V14自适应多杀', ...testPositionKill('V14激进版5: 自适应多杀', positionKillAdaptiveMulti) });

console.log('\n\n=== 汇总排名（按最大连错升序，命中率降序）===');
results.sort((a, b) => a.maxMiss - b.maxMiss || b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const flag = r.maxMiss < 3 ? ' ✓✓✓ 达标!' : (r.maxMiss < 5 ? ' ✓ 改善' : '');
  console.log(`${i+1}. ${r.name}: 命中率${r.hitRate}%, 最大连错${r.maxMiss}期, 平均杀${r.avgKill}个${flag}`);
});
