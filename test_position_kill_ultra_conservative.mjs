// 位杀算法 - 超严格置信度，追求最大连错<3期
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V46: 超严格置信度位杀 - 5个信号中至少4个一致才杀
function positionKillUltraStrict(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  const signals = [];
  
  // 信号1：和值
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  if (avgSum >= 15) signals.push(9);
  else if (avgSum <= 10) signals.push(0);
  else signals.push(-1);
  
  // 信号2：奇偶
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  if (oddCount >= 4) signals.push(9);
  else if (oddCount <= 1) signals.push(0);
  else signals.push(-1);
  
  // 信号3：大小
  const bigCount = recent.filter(d => d[pos] >= 5).length;
  if (bigCount >= 4) signals.push(9);
  else if (bigCount <= 1) signals.push(0);
  else signals.push(-1);
  
  // 信号4：质合
  const primes = [2, 3, 5, 7];
  const primeCount = recent.filter(d => primes.includes(d[pos])).length;
  if (primeCount >= 4) signals.push(9);
  else if (primeCount <= 1) signals.push(0);
  else signals.push(-1);
  
  // 信号5：012路
  const mod3Counts = [0, 0, 0];
  recent.forEach(d => mod3Counts[d[pos] % 3]++);
  const maxMod3Count = Math.max(...mod3Counts);
  if (maxMod3Count >= 4) {
    const maxMod3 = mod3Counts.indexOf(maxMod3Count);
    const candidates = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d % 3 === maxMod3);
    signals.push(candidates[0]);
  } else {
    signals.push(-1);
  }
  
  // 统计有效信号（非-1）
  const validSignals = signals.filter(s => s !== -1);
  if (validSignals.length < 4) return []; // 有效信号不足，不杀
  
  // 找出现最多的数字
  const counts = {};
  validSignals.forEach(s => counts[s] = (counts[s] || 0) + 1);
  const maxCount = Math.max(...Object.values(counts));
  
  // 至少4个信号一致才杀
  if (maxCount >= 4) {
    const killDigit = Object.keys(counts).find(k => counts[k] === maxCount);
    return [parseInt(killDigit)];
  }
  
  return []; // 不一致，不杀
}

// V47: 动态窗口超严格位杀 - 窗口大小根据近期表现调整
function positionKillDynamicWindowStrict(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 先检查近期连错情况
  let recentMiss = 0;
  for (let i = prevData.length - 1; i >= Math.max(0, prevData.length - 5); i--) {
    const curr = prevData[i];
    const prev = prevData[i-1];
    if (!prev) break;
    
    // 用简单规则判断
    if (curr[pos] === prev[pos]) {
      recentMiss++;
    } else {
      break;
    }
  }
  
  // 连错>=1：不杀（保守）
  if (recentMiss >= 1) {
    return [];
  }
  
  // 否则用V46规则
  return positionKillUltraStrict(prevData, pos);
}

// V48: 历史验证位杀 - 只在历史同类情况下表现好时杀
function positionKillHistoricalValidation(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  
  // 确定当前"状态"
  let state = 'normal';
  if (avgSum >= 15) state = 'high';
  else if (avgSum <= 10) state = 'low';
  
  // 在历史数据中找同类状态，计算杀上期的命中率
  let historicalHits = 0;
  let historicalTotal = 0;
  
  for (let i = 30; i < prevData.length - 5; i++) {
    const histRecent = prevData.slice(i - 5, i);
    const histAvgSum = histRecent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
    
    let histState = 'normal';
    if (histAvgSum >= 15) histState = 'high';
    else if (histAvgSum <= 10) histState = 'low';
    
    if (histState === state) {
      historicalTotal++;
      const histLastDigit = prevData[i-1][pos];
      if (prevData[i][pos] !== histLastDigit) {
        historicalHits++;
      }
    }
  }
  
  // 历史命中率>60%才杀
  if (historicalTotal > 0 && historicalHits / historicalTotal > 0.6) {
    return [lastDigit];
  }
  
  return []; // 不杀
}

// V49: 多重验证位杀 - 结合多个严格条件
function positionKillMultiValidation(prevData, pos) {
  const recent = prevData.slice(-10);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 条件1：近期该位置波动小（标准差<2）
  const digits = recent.map(d => d[pos]);
  const mean = digits.reduce((s, v) => s + v, 0) / digits.length;
  const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / digits.length;
  const stdDev = Math.sqrt(variance);
  
  if (stdDev >= 2) return []; // 波动大，不杀
  
  // 条件2：和值趋势一致
  const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  let sumKill;
  if (avgSum >= 14) sumKill = 9;
  else if (avgSum <= 11) sumKill = 0;
  else sumKill = lastDigit;
  
  // 条件3：奇偶趋势一致
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  let oeKill;
  if (oddCount >= 6) oeKill = 9;
  else if (oddCount <= 2) oeKill = 0;
  else oeKill = lastDigit;
  
  // 三个条件一致才杀
  if (sumKill === oeKill && oeKill === lastDigit) {
    return [lastDigit];
  }
  
  return []; // 不一致，不杀
}

// V50: 终极保守位杀 - 只在绝对安全时杀号
function positionKillUltimateConservative(prevData, pos) {
  const recent = prevData.slice(-10);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 检查近10期是否有连出（连续2期相同）
  let hasConsecutive = false;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i][pos] === recent[i-1][pos]) {
      hasConsecutive = true;
      break;
    }
  }
  
  // 有连出：杀该数字
  if (hasConsecutive) {
    const consecutiveDigit = recent.find((d, i) => i > 0 && d[pos] === recent[i-1][pos])[pos];
    // 验证历史：近20期杀这个数字的命中率
    let hits = 0, total = 0;
    for (let i = Math.max(20, prevData.length - 20); i < prevData.length; i++) {
      const prev = prevData[i-1];
      const curr = prevData[i];
      if (prev[pos] === consecutiveDigit) {
        total++;
        if (curr[pos] !== consecutiveDigit) hits++;
      }
    }
    // 历史命中率>70%才杀
    if (total > 0 && hits / total > 0.7) {
      return [consecutiveDigit];
    }
  }
  
  return []; // 不杀
}

// 测试函数
function testPositionKill(name, killFunc) {
  let total = 0;
  let baiHit = 0, shiHit = 0, geHit = 0;
  let baiTotal = 0, shiTotal = 0, geTotal = 0;
  let baiKill = 0, shiKill = 0, geKill = 0;
  
  let maxConsecutiveMiss = 0, currentConsecutiveMiss = 0;
  let maxConsecutiveHit = 0, currentConsecutiveHit = 0;
  
  for (let i = 20; i < data.length; i++) {
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
    
    const baiOk = baiK.length === 0 || !baiK.includes(curr.d1);
    const shiOk = shiK.length === 0 || !shiK.includes(curr.d2);
    const geOk = geK.length === 0 || !geK.includes(curr.d3);
    
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
  const killFrequency = ((baiKill + shiKill + geKill) / 3 / total * 100).toFixed(1);
  console.log(`\n=== ${name} ===`);
  console.log(`百位: ${(baiHit/baiTotal*100).toFixed(2)}% | 十位: ${(shiHit/shiTotal*100).toFixed(2)}% | 个位: ${(geHit/geTotal*100).toFixed(2)}%`);
  console.log(`综合命中率: ${hitRate}% | 平均每位杀号数: ${avgKillPerPos} | 杀号频率: ${killFrequency}%`);
  console.log(`最大连对: ${maxConsecutiveHit} 期 | 最大连错: ${maxConsecutiveMiss} 期`);
  
  return { hitRate: parseFloat(hitRate), maxMiss: maxConsecutiveMiss, maxHit: maxConsecutiveHit, avgKill: parseFloat(avgKillPerPos) };
}

console.log('=== 位杀算法 - 超严格置信度策略 ===\n');

const results = [];
results.push({ name: 'V46 超严格5信号', ...testPositionKill('V46 超严格置信度位杀', positionKillUltraStrict) });
results.push({ name: 'V47 动态窗口超严格', ...testPositionKill('V47 动态窗口超严格位杀', positionKillDynamicWindowStrict) });
results.push({ name: 'V48 历史验证', ...testPositionKill('V48 历史验证位杀', positionKillHistoricalValidation) });
results.push({ name: 'V49 多重验证', ...testPositionKill('V49 多重验证位杀', positionKillMultiValidation) });
results.push({ name: 'V50 终极保守', ...testPositionKill('V50 终极保守位杀', positionKillUltimateConservative) });

console.log('\n\n=== 汇总排名（按最大连错升序）===');
results.sort((a, b) => a.maxMiss - b.maxMiss || b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const flag = r.hitRate >= 90 && r.maxMiss < 3 ? ' ✓✓✓ 完美达成!' : (r.maxMiss < 3 ? ' ✓ 连错<3' : (r.hitRate >= 99 ? ' ★ 超高命中率' : ''));
  console.log(`${i+1}. ${r.name}: 命中率${r.hitRate}%, 最大连错${r.maxMiss}期, 平均杀${r.avgKill}个${flag}`);
});
