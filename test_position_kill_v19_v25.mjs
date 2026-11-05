// 位杀算法 - 追求命中率>90%且最大连错<3期
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V19: 位置奇偶趋势位杀 - 杀近期该位置奇偶倾向的反面
function positionKillOddEvenTrend(prevData, pos) {
  const recent = prevData.slice(-5);
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 奇数过多(>=4)，杀奇数（选与上期不同的奇数）
  if (oddCount >= 4) {
    return [lastDigit % 2 === 1 ? (lastDigit === 9 ? 7 : 9) : (lastDigit === 9 ? 7 : 9)];
  }
  // 偶数过多(<=1)，杀偶数
  else if (oddCount <= 1) {
    return [lastDigit % 2 === 0 ? (lastDigit === 8 ? 6 : 8) : (lastDigit === 8 ? 6 : 8)];
  }
  // 平衡时杀上期
  else {
    return [lastDigit];
  }
}

// V20: 位置大小趋势位杀 - 杀近期该位置大小倾向的反面
function positionKillBigSmallTrend(prevData, pos) {
  const recent = prevData.slice(-5);
  const bigCount = recent.filter(d => d[pos] >= 5).length;
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 大数过多(>=4)，杀大数
  if (bigCount >= 4) {
    return [lastDigit >= 5 ? (lastDigit === 9 ? 8 : 9) : (lastDigit === 9 ? 8 : 9)];
  }
  // 小数过多(<=1)，杀小数
  else if (bigCount <= 1) {
    return [lastDigit < 5 ? (lastDigit === 0 ? 1 : 0) : (lastDigit === 0 ? 1 : 0)];
  }
  // 平衡时杀上期
  else {
    return [lastDigit];
  }
}

// V21: 位置遗漏回补位杀 - 杀刚回补的数字（遗漏值从大变小）
function positionKillMissingBounce(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 计算当前遗漏
  let lastMiss = 0;
  for (let i = prevData.length - 1; i >= 0; i--) {
    if (prevData[i][pos] === lastDigit) break;
    lastMiss++;
  }
  
  // 如果上期数字遗漏>=8（刚回补），杀它
  if (lastMiss >= 8) {
    return [lastDigit];
  }
  // 否则杀和值约束
  else {
    const recent = prevData.slice(-3);
    const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [lastDigit];
  }
}

// V22: 位置跨度关联位杀 - 基于该位置近期跨度杀号
function positionKillSpanCorrelation(prevData, pos) {
  const recent = prevData.slice(-3);
  const spans = [];
  for (let i = 1; i < recent.length; i++) {
    spans.push(Math.abs(recent[i][pos] - recent[i-1][pos]));
  }
  const avgSpan = spans.reduce((s, v) => s + v, 0) / spans.length;
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 跨度大(>=4)，杀与上期差距大的数字
  if (avgSpan >= 4) {
    const kill = (lastDigit + 5) % 10;
    return [kill];
  }
  // 跨度小(<2)，杀上期附近
  else if (avgSpan < 2) {
    return [lastDigit];
  }
  // 中等跨度，杀和值约束
  else {
    const recentAll = prevData.slice(-3);
    const avgSum = recentAll.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [lastDigit];
  }
}

// V23: 位置质合趋势位杀 - 杀近期质合倾向的反面
function positionKillPrimeTrend(prevData, pos) {
  const primes = [2, 3, 5, 7];
  const recent = prevData.slice(-5);
  const primeCount = recent.filter(d => primes.includes(d[pos])).length;
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 质数过多(>=4)，杀质数
  if (primeCount >= 4) {
    if (primes.includes(lastDigit)) {
      const idx = primes.indexOf(lastDigit);
      return [primes[(idx + 1) % 4]];
    } else {
      return [2];
    }
  }
  // 合数过多(<=1)，杀合数
  else if (primeCount <= 1) {
    if (!primes.includes(lastDigit)) {
      return [lastDigit === 0 ? 1 : 0];
    } else {
      return [lastDigit];
    }
  }
  // 平衡时杀上期
  else {
    return [lastDigit];
  }
}

// V24: 位置012路趋势位杀 - 杀近期012路倾向的反面
function positionKillMod3Trend(prevData, pos) {
  const recent = prevData.slice(-5);
  const mod3Counts = [0, 0, 0];
  recent.forEach(d => mod3Counts[d[pos] % 3]++);
  const lastDigit = prevData[prevData.length-1][pos];
  const lastMod3 = lastDigit % 3;
  
  // 找出现最多的路
  const maxCount = Math.max(...mod3Counts);
  const maxMod3 = mod3Counts.indexOf(maxCount);
  
  // 如果某一路过多(>=4)，杀这一路
  if (maxCount >= 4) {
    if (lastMod3 === maxMod3) {
      // 杀同路的另一个数字
      const candidates = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d % 3 === maxMod3 && d !== lastDigit);
      return [candidates[0]];
    } else {
      return [lastDigit];
    }
  }
  // 否则杀上期
  else {
    return [lastDigit];
  }
}

// V25: 综合智能位杀 - 融合多个信号
function positionKillSmartHybrid(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 信号1：和值趋势
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  let sumSignal;
  if (avgSum >= 15) sumSignal = lastDigit >= 7 ? 9 : 8;
  else if (avgSum <= 10) sumSignal = lastDigit <= 2 ? 0 : 1;
  else sumSignal = lastDigit;
  
  // 信号2：奇偶趋势
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  let oeSignal;
  if (oddCount >= 4) oeSignal = lastDigit % 2 === 1 ? (lastDigit === 9 ? 7 : 9) : 9;
  else if (oddCount <= 1) oeSignal = lastDigit % 2 === 0 ? (lastDigit === 8 ? 6 : 8) : 8;
  else oeSignal = lastDigit;
  
  // 信号3：大小趋势
  const bigCount = recent.filter(d => d[pos] >= 5).length;
  let bsSignal;
  if (bigCount >= 4) bsSignal = lastDigit >= 5 ? (lastDigit === 9 ? 8 : 9) : 9;
  else if (bigCount <= 1) bsSignal = lastDigit < 5 ? (lastDigit === 0 ? 1 : 0) : 0;
  else bsSignal = lastDigit;
  
  // 投票：多数信号一致时采用
  const signals = [sumSignal, oeSignal, bsSignal];
  const counts = {};
  signals.forEach(s => counts[s] = (counts[s] || 0) + 1);
  const maxCount = Math.max(...Object.values(counts));
  const candidates = Object.keys(counts).filter(k => counts[k] === maxCount).map(Number);
  
  return [candidates[0]];
}

// 测试函数（带连错统计）
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

console.log('=== 位杀算法优化版 - 追求高命中率+低连错 ===\n');

const results = [];
results.push({ name: 'V19 奇偶趋势', ...testPositionKill('V19 位置奇偶趋势位杀', positionKillOddEvenTrend) });
results.push({ name: 'V20 大小趋势', ...testPositionKill('V20 位置大小趋势位杀', positionKillBigSmallTrend) });
results.push({ name: 'V21 遗漏回补', ...testPositionKill('V21 位置遗漏回补位杀', positionKillMissingBounce) });
results.push({ name: 'V22 跨度关联', ...testPositionKill('V22 位置跨度关联位杀', positionKillSpanCorrelation) });
results.push({ name: 'V23 质合趋势', ...testPositionKill('V23 位置质合趋势位杀', positionKillPrimeTrend) });
results.push({ name: 'V24 012路趋势', ...testPositionKill('V24 位置012路趋势位杀', positionKillMod3Trend) });
results.push({ name: 'V25 综合智能', ...testPositionKill('V25 综合智能位杀', positionKillSmartHybrid) });

console.log('\n\n=== 汇总排名（按命中率降序）===');
results.sort((a, b) => b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const flag = r.hitRate >= 90 && r.maxMiss < 3 ? ' ✓✓✓' : (r.hitRate >= 90 ? ' ✓✓' : '');
  console.log(`${i+1}. ${r.name}: ${r.hitRate}% (最大连错${r.maxMiss}期)${flag}`);
});
