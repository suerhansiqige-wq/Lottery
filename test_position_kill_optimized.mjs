// 位杀算法优化版 - 基于V6和V5的成功经验
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V7: 优化和值位杀 - 基于近3期和值趋势杀位
function positionKillBySumV7(prevData, pos) {
  const recent = prevData.slice(-3);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  
  const killSet = new Set();
  
  // 和值偏大(>=15)，杀大数字
  if (avgSum >= 15) {
    killSet.add(9);
    killSet.add(8);
  }
  // 和值偏小(<=9)，杀小数字
  else if (avgSum <= 9) {
    killSet.add(0);
    killSet.add(1);
  }
  // 和值中等(10-14)，杀上期该位
  else {
    killSet.add(prevData[prevData.length-1][pos]);
  }
  
  return Array.from(killSet);
}

// V8: 奇偶趋势位杀 - 基于近期奇偶分布
function positionKillByOddEven(prevData, pos) {
  const recent = prevData.slice(-5);
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  
  const killSet = new Set();
  
  // 奇数过多(>=4)，杀奇数
  if (oddCount >= 4) {
    killSet.add(1);
    killSet.add(3);
  }
  // 偶数过多(<=1)，杀偶数
  else if (oddCount <= 1) {
    killSet.add(0);
    killSet.add(2);
  }
  // 平衡时杀上期
  else {
    killSet.add(prevData[prevData.length-1][pos]);
  }
  
  return Array.from(killSet);
}

// V9: 大小趋势位杀 - 基于近期大小分布(0-4小，5-9大)
function positionKillByBigSmall(prevData, pos) {
  const recent = prevData.slice(-5);
  const bigCount = recent.filter(d => d[pos] >= 5).length;
  
  const killSet = new Set();
  
  // 大数过多(>=4)，杀大数
  if (bigCount >= 4) {
    killSet.add(7);
    killSet.add(8);
  }
  // 小数过多(<=1)，杀小数
  else if (bigCount <= 1) {
    killSet.add(1);
    killSet.add(2);
  }
  // 平衡时杀上期
  else {
    killSet.add(prevData[prevData.length-1][pos]);
  }
  
  return Array.from(killSet);
}

// V10: 质合趋势位杀 - 基于近期质合分布(2,3,5,7质数)
function positionKillByPrime(prevData, pos) {
  const primes = [2, 3, 5, 7];
  const recent = prevData.slice(-5);
  const primeCount = recent.filter(d => primes.includes(d[pos])).length;
  
  const killSet = new Set();
  
  // 质数过多(>=4)，杀质数
  if (primeCount >= 4) {
    killSet.add(2);
    killSet.add(3);
  }
  // 合数过多(<=1)，杀合数
  else if (primeCount <= 1) {
    killSet.add(4);
    killSet.add(6);
  }
  // 平衡时杀上期
  else {
    killSet.add(prevData[prevData.length-1][pos]);
  }
  
  return Array.from(killSet);
}

// V11: 极限精简位杀 - 只杀1个（上期该位）
function positionKillUltraSimple(prevData, pos) {
  return [prevData[prevData.length-1][pos]];
}

// V12: 和值+上期综合 - V6基础上加上上期
function positionKillSumPlusLast(prevData, pos) {
  const recent = prevData.slice(-5);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  
  const killSet = new Set();
  
  // 和值约束
  if (avgSum >= 15) {
    killSet.add(9);
  } else if (avgSum <= 10) {
    killSet.add(0);
  }
  
  // 加上上期该位
  killSet.add(prevData[prevData.length-1][pos]);
  
  return Array.from(killSet);
}

// 测试函数
function testPositionKill(name, killFunc) {
  let total = 0;
  let baiHit = 0, shiHit = 0, geHit = 0;
  let baiTotal = 0, shiTotal = 0, geTotal = 0;
  let baiKillCount = 0, shiKillCount = 0, geKillCount = 0;
  let baiMaxKill = 0, shiMaxKill = 0, geMaxKill = 0;
  
  for (let i = 10; i < data.length; i++) {
    const prevData = data.slice(0, i);
    const curr = data[i];
    
    const baiKill = killFunc(prevData, 'd1');
    const shiKill = killFunc(prevData, 'd2');
    const geKill = killFunc(prevData, 'd3');
    
    baiKillCount += baiKill.length;
    shiKillCount += shiKill.length;
    geKillCount += geKill.length;
    
    if (baiKill.length > baiMaxKill) baiMaxKill = baiKill.length;
    if (shiKill.length > shiMaxKill) shiMaxKill = shiKill.length;
    if (geKill.length > geMaxKill) geMaxKill = geKill.length;
    
    baiTotal++;
    shiTotal++;
    geTotal++;
    
    if (!baiKill.includes(curr.d1)) baiHit++;
    if (!shiKill.includes(curr.d2)) shiHit++;
    if (!geKill.includes(curr.d3)) geHit++;
    
    total++;
  }
  
  console.log(`\n=== ${name} ===`);
  console.log(`百位命中率: ${(baiHit/baiTotal*100).toFixed(2)}% (平均杀${(baiKillCount/baiTotal).toFixed(1)}个, 最多${baiMaxKill}个)`);
  console.log(`十位命中率: ${(shiHit/shiTotal*100).toFixed(2)}% (平均杀${(shiKillCount/shiTotal).toFixed(1)}个, 最多${shiMaxKill}个)`);
  console.log(`个位命中率: ${(geHit/geTotal*100).toFixed(2)}% (平均杀${(geKillCount/geTotal).toFixed(1)}个, 最多${geMaxKill}个)`);
  console.log(`综合命中率: ${((baiHit+shiHit+geHit)/(baiTotal+shiTotal+geTotal)*100).toFixed(2)}%`);
}

console.log('=== 位杀算法优化版测试 ===');
testPositionKill('V7 优化和值位杀(近3期)', positionKillBySumV7);
testPositionKill('V8 奇偶趋势位杀', positionKillByOddEven);
testPositionKill('V9 大小趋势位杀', positionKillByBigSmall);
testPositionKill('V10 质合趋势位杀', positionKillByPrime);
testPositionKill('V11 极限精简位杀(只杀1个)', positionKillUltraSimple);
testPositionKill('V12 和值+上期综合', positionKillSumPlusLast);
