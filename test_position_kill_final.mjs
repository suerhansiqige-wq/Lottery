// 位杀算法终极版 - 基于V11的进一步优化
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V13: 间隔位杀 - 杀上期该位+上上期该位（去重）
function positionKillSkip(prevData, pos) {
  const killSet = new Set();
  killSet.add(prevData[prevData.length-1][pos]);
  if (prevData.length >= 2) {
    killSet.add(prevData[prevData.length-2][pos]);
  }
  return Array.from(killSet);
}

// V14: 和值区间位杀 - 根据和值区间动态杀位
function positionKillBySumRange(prevData, pos) {
  const recent = prevData.slice(-3);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  
  const killSet = new Set();
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 和值偏大(>=14)，杀大数字但不杀上期
  if (avgSum >= 14) {
    if (lastDigit !== 9) killSet.add(9);
    else killSet.add(8);
  }
  // 和值偏小(<=11)，杀小数字但不杀上期
  else if (avgSum <= 11) {
    if (lastDigit !== 0) killSet.add(0);
    else killSet.add(1);
  }
  // 和值中等，杀上期
  else {
    killSet.add(lastDigit);
  }
  
  return Array.from(killSet);
}

// V15: 冷热位杀 - 杀近期该位置最冷的1个数字
function positionKillByCold(prevData, pos) {
  const missing = {};
  for (let d = 0; d <= 9; d++) {
    let miss = 0;
    for (let i = prevData.length - 1; i >= 0; i--) {
      if (prevData[i][pos] === d) break;
      miss++;
    }
    missing[d] = miss;
  }
  
  // 找遗漏最大的
  const sorted = Object.entries(missing).sort((a, b) => b[1] - a[1]);
  const coldest = parseInt(sorted[0][0]);
  
  // 如果遗漏>=15，杀这个冷号；否则杀上期
  if (sorted[0][1] >= 15) {
    return [coldest];
  } else {
    return [prevData[prevData.length-1][pos]];
  }
}

// V16: 动态位杀 - 根据近期波动选择策略
function positionKillDynamic(prevData, pos) {
  const recent = prevData.slice(-5);
  const digits = recent.map(d => d[pos]);
  
  // 计算波动：相邻期差的绝对值之和
  let volatility = 0;
  for (let i = 1; i < digits.length; i++) {
    volatility += Math.abs(digits[i] - digits[i-1]);
  }
  
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 波动大(>=15)：杀上期
  if (volatility >= 15) {
    return [lastDigit];
  }
  // 波动中(8-14)：杀上期+上上期（去重）
  else if (volatility >= 8) {
    const killSet = new Set([lastDigit]);
    if (prevData.length >= 2) {
      killSet.add(prevData[prevData.length-2][pos]);
    }
    return Array.from(killSet);
  }
  // 波动小(<8)：杀和值约束
  else {
    const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
    if (avgSum >= 15) {
      return [lastDigit === 9 ? 8 : 9];
    } else if (avgSum <= 10) {
      return [lastDigit === 0 ? 1 : 0];
    } else {
      return [lastDigit];
    }
  }
}

// V17: 双杀位杀 - 固定杀2个（上期+和值约束）
function positionKillDouble(prevData, pos) {
  const recent = prevData.slice(-5);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  
  const killSet = new Set();
  killSet.add(prevData[prevData.length-1][pos]);
  
  // 和值约束
  if (avgSum >= 15) {
    const d = prevData[prevData.length-1][pos] === 9 ? 8 : 9;
    killSet.add(d);
  } else if (avgSum <= 10) {
    const d = prevData[prevData.length-1][pos] === 0 ? 1 : 0;
    killSet.add(d);
  }
  
  return Array.from(killSet);
}

// V18: 智能位杀 - 结合V11和V6的精华
function positionKillSmart(prevData, pos) {
  const recent = prevData.slice(-5);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 默认杀上期
  let killDigit = lastDigit;
  
  // 和值极端时调整和值约束
  if (avgSum >= 16 && lastDigit >= 7) {
    killDigit = 9;
  } else if (avgSum <= 9 && lastDigit <= 2) {
    killDigit = 0;
  }
  
  return [killDigit];
}

// 测试函数（带连错统计）
function testPositionKill(name, killFunc) {
  let total = 0;
  let baiHit = 0, shiHit = 0, geHit = 0;
  let baiTotal = 0, shiTotal = 0, geTotal = 0;
  let baiKillCount = 0, shiKillCount = 0, geKillCount = 0;
  
  let baiMaxConsecutiveMiss = 0, shiMaxConsecutiveMiss = 0, geMaxConsecutiveMiss = 0;
  let baiCurrentMiss = 0, shiCurrentMiss = 0, geCurrentMiss = 0;
  
  for (let i = 10; i < data.length; i++) {
    const prevData = data.slice(0, i);
    const curr = data[i];
    
    const baiKill = killFunc(prevData, 'd1');
    const shiKill = killFunc(prevData, 'd2');
    const geKill = killFunc(prevData, 'd3');
    
    baiKillCount += baiKill.length;
    shiKillCount += shiKill.length;
    geKillCount += geKill.length;
    
    baiTotal++;
    shiTotal++;
    geTotal++;
    
    const baiOk = !baiKill.includes(curr.d1);
    const shiOk = !shiKill.includes(curr.d2);
    const geOk = !geKill.includes(curr.d3);
    
    if (baiOk) {
      baiHit++;
      baiCurrentMiss = 0;
    } else {
      baiCurrentMiss++;
      if (baiCurrentMiss > baiMaxConsecutiveMiss) baiMaxConsecutiveMiss = baiCurrentMiss;
    }
    
    if (shiOk) {
      shiHit++;
      shiCurrentMiss = 0;
    } else {
      shiCurrentMiss++;
      if (shiCurrentMiss > shiMaxConsecutiveMiss) shiMaxConsecutiveMiss = shiCurrentMiss;
    }
    
    if (geOk) {
      geHit++;
      geCurrentMiss = 0;
    } else {
      geCurrentMiss++;
      if (geCurrentMiss > geMaxConsecutiveMiss) geMaxConsecutiveMiss = geCurrentMiss;
    }
    
    total++;
  }
  
  console.log(`\n=== ${name} ===`);
  console.log(`百位命中率: ${(baiHit/baiTotal*100).toFixed(2)}% (平均杀${(baiKillCount/baiTotal).toFixed(1)}个, 最大连错${baiMaxConsecutiveMiss})`);
  console.log(`十位命中率: ${(shiHit/shiTotal*100).toFixed(2)}% (平均杀${(shiKillCount/shiTotal).toFixed(1)}个, 最大连错${shiMaxConsecutiveMiss})`);
  console.log(`个位命中率: ${(geHit/geTotal*100).toFixed(2)}% (平均杀${(geKillCount/geTotal).toFixed(1)}个, 最大连错${geMaxConsecutiveMiss})`);
  console.log(`综合命中率: ${((baiHit+shiHit+geHit)/(baiTotal+shiTotal+geTotal)*100).toFixed(2)}%`);
}

console.log('=== 位杀算法终极版测试 ===');
testPositionKill('V13 间隔位杀(杀2个)', positionKillSkip);
testPositionKill('V14 和值区间位杀', positionKillBySumRange);
testPositionKill('V15 冷热位杀', positionKillByCold);
testPositionKill('V16 动态位杀', positionKillDynamic);
testPositionKill('V17 双杀位杀', positionKillDouble);
testPositionKill('V18 智能位杀', positionKillSmart);
