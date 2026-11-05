// 位杀算法 - 选择性杀号策略，只在高置信度时杀号
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V41: 高置信度位杀 - 只在3个信号完全一致时杀号，否则返回空
function positionKillHighConfidence(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  const signals = [];
  
  // 信号1：和值
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  if (avgSum >= 15) signals.push(9);
  else if (avgSum <= 10) signals.push(0);
  
  // 信号2：奇偶
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  if (oddCount >= 4) signals.push(9);
  else if (oddCount <= 1) signals.push(0);
  
  // 信号3：大小
  const bigCount = recent.filter(d => d[pos] >= 5).length;
  if (bigCount >= 4) signals.push(9);
  else if (bigCount <= 1) signals.push(0);
  
  // 只有3个信号完全一致才杀
  if (signals.length === 3 && signals[0] === signals[1] && signals[1] === signals[2]) {
    return [signals[0]];
  }
  // 否则不杀（返回空数组）
  return [];
}

// V42: 动态置信度位杀 - 根据近期表现调整置信度阈值
function positionKillDynamicConfidence(prevData, pos) {
  const recent = prevData.slice(-10);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 计算近期该位置的"可预测性"
  let predictable = 0;
  for (let i = 1; i < recent.length; i++) {
    // 如果杀上期能杀对
    if (recent[i][pos] !== recent[i-1][pos]) predictable++;
  }
  const predictability = predictable / (recent.length - 1);
  
  // 可预测性高(>60%)：杀上期
  if (predictability > 0.6) {
    return [lastDigit];
  }
  // 可预测性中(40-60%)：杀和值约束
  else if (predictability > 0.4) {
    const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) return [9];
    else if (avgSum <= 11) return [0];
    else return []; // 不杀
  }
  // 可预测性低(<40%)：不杀
  else {
    return [];
  }
}

// V43: 连错熔断位杀 - 连错2期后暂停杀号
function positionKillCircuitBreaker(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 检查近期连错情况
  let recentMiss = 0;
  for (let i = prevData.length - 1; i >= Math.max(0, prevData.length - 3); i--) {
    const curr = prevData[i];
    const prev = prevData[i-1];
    if (!prev) break;
    
    // 用杀上期规则判断
    if (curr[pos] === prev[pos]) {
      recentMiss++;
    } else {
      break;
    }
  }
  
  // 连错>=2：暂停杀号
  if (recentMiss >= 2) {
    return [];
  }
  // 否则杀上期
  else {
    return [lastDigit];
  }
}

// V44: 滑动窗口位杀 - 只在窗口内表现好的策略才使用
function positionKillSlidingWindow(prevData, pos) {
  const windowSize = 10;
  const recent = prevData.slice(-windowSize);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 测试3个策略在窗口内的表现
  const strategies = [
    { name: '杀上期', kill: () => lastDigit },
    { name: '杀和值', kill: () => {
      const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
      if (avgSum >= 14) return 9;
      else if (avgSum <= 11) return 0;
      else return lastDigit;
    }},
    { name: '杀镜像', kill: () => (10 - lastDigit) % 10 },
  ];
  
  let bestStrategy = null;
  let bestHits = 0;
  
  for (const strategy of strategies) {
    let hits = 0;
    for (let i = 1; i < recent.length; i++) {
      const prevDigit = recent[i-1][pos];
      const killDigit = strategy.kill.call(null, prevDigit, recent.slice(0, i));
      if (recent[i][pos] !== killDigit) hits++;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestStrategy = strategy;
    }
  }
  
  // 只有最佳策略命中率>70%才杀
  if (bestHits / (windowSize - 1) > 0.7) {
    return [bestStrategy.kill()];
  }
  // 否则不杀
  return [];
}

// V45: 混合策略位杀 - 结合选择性杀号和自适应
function positionKillHybridSelective(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 先检查是否处于"连错状态"
  let consecutiveMiss = 0;
  for (let i = prevData.length - 1; i >= Math.max(0, prevData.length - 5); i--) {
    const curr = prevData[i];
    const prev = prevData[i-1];
    if (!prev) break;
    
    // 用V14规则判断
    const avgSum = prevData.slice(Math.max(0, i-3), i).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / Math.min(3, i);
    let killDigit;
    if (avgSum >= 14) killDigit = prev[pos] === 9 ? 8 : 9;
    else if (avgSum <= 11) killDigit = prev[pos] === 0 ? 1 : 0;
    else killDigit = prev[pos];
    
    if (curr[pos] === killDigit) {
      consecutiveMiss++;
    } else {
      break;
    }
  }
  
  // 连错>=2：切换策略或不杀
  if (consecutiveMiss >= 2) {
    // 尝试杀镜像
    const mirror = (10 - lastDigit) % 10;
    if (mirror !== lastDigit) return [mirror];
    else return []; // 不杀
  }
  // 否则用V14规则
  else {
    const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [lastDigit];
  }
}

// 测试函数（支持空杀号）
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
  console.log(`\n=== ${name} ===`);
  console.log(`百位: ${(baiHit/baiTotal*100).toFixed(2)}% | 十位: ${(shiHit/shiTotal*100).toFixed(2)}% | 个位: ${(geHit/geTotal*100).toFixed(2)}%`);
  console.log(`综合命中率: ${hitRate}% | 平均每位杀号数: ${avgKillPerPos}`);
  console.log(`最大连对: ${maxConsecutiveHit} 期 | 最大连错: ${maxConsecutiveMiss} 期`);
  
  return { hitRate: parseFloat(hitRate), maxMiss: maxConsecutiveMiss, maxHit: maxConsecutiveHit, avgKill: parseFloat(avgKillPerPos) };
}

console.log('=== 位杀算法 - 选择性杀号策略 ===\n');

const results = [];
results.push({ name: 'V41 高置信度', ...testPositionKill('V41 高置信度位杀', positionKillHighConfidence) });
results.push({ name: 'V42 动态置信度', ...testPositionKill('V42 动态置信度位杀', positionKillDynamicConfidence) });
results.push({ name: 'V43 连错熔断', ...testPositionKill('V43 连错熔断位杀', positionKillCircuitBreaker) });
results.push({ name: 'V44 滑动窗口', ...testPositionKill('V44 滑动窗口位杀', positionKillSlidingWindow) });
results.push({ name: 'V45 混合选择', ...testPositionKill('V45 混合策略位杀', positionKillHybridSelective) });

console.log('\n\n=== 汇总排名（按最大连错升序）===');
results.sort((a, b) => a.maxMiss - b.maxMiss || b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const flag = r.hitRate >= 90 && r.maxMiss < 3 ? ' ✓✓✓ 完美!' : (r.maxMiss < 3 ? ' ✓ 低连错' : '');
  console.log(`${i+1}. ${r.name}: 命中率${r.hitRate}%, 最大连错${r.maxMiss}期, 平均杀${r.avgKill}个${flag}`);
});
