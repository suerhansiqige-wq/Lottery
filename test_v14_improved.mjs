// V14改进版 - 降低连错率
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V14原版
function positionKillV14Original(prevData, pos) {
  const recent = prevData.slice(-3);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  const lastDigit = prevData[prevData.length-1][pos];
  
  if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
  else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
  else return [lastDigit];
}

// V14改进版1: 多信号投票
function positionKillV14Improved1(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  const votes = {};
  for (let d = 0; d <= 9; d++) votes[d] = 0;
  
  // 信号1: 3期和值
  const avgSum3 = prevData.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  if (avgSum3 >= 14) votes[9]++;
  else if (avgSum3 <= 11) votes[0]++;
  else votes[lastDigit]++;
  
  // 信号2: 5期和值
  const avgSum5 = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  if (avgSum5 >= 14) votes[9]++;
  else if (avgSum5 <= 11) votes[0]++;
  else votes[lastDigit]++;
  
  // 信号3: 奇偶趋势
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  if (oddCount >= 4) votes[9]++;
  else if (oddCount <= 1) votes[0]++;
  else votes[lastDigit]++;
  
  // 信号4: 大小趋势
  const bigCount = recent.filter(d => d[pos] >= 5).length;
  if (bigCount >= 4) votes[9]++;
  else if (bigCount <= 1) votes[0]++;
  else votes[lastDigit]++;
  
  // 选票数最多的
  const maxVotes = Math.max(...Object.values(votes));
  const candidates = Object.keys(votes).filter(k => votes[k] === maxVotes).map(Number);
  
  return [candidates[0]];
}

// V14改进版2: 连错熔断机制
function positionKillV14Improved2(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 检查近期连错情况
  let recentMiss = 0;
  for (let i = prevData.length - 1; i >= Math.max(0, prevData.length - 5); i--) {
    const curr = prevData[i];
    const prev = prevData[i-1];
    if (!prev) break;
    
    // 用V14原版规则判断
    const recent = prevData.slice(Math.max(0, i-3), i);
    const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / recent.length;
    const prevDigit = prev[pos];
    let killDigit;
    if (avgSum >= 14) killDigit = prevDigit === 9 ? 8 : 9;
    else if (avgSum <= 11) killDigit = prevDigit === 0 ? 1 : 0;
    else killDigit = prevDigit;
    
    if (curr[pos] === killDigit) {
      recentMiss++;
    } else {
      break;
    }
  }
  
  // 连错>=2: 切换策略（杀镜像）
  if (recentMiss >= 2) {
    return [(10 - lastDigit) % 10];
  }
  // 否则用V14原版
  else {
    return positionKillV14Original(prevData, pos);
  }
}

// V14改进版3: 动态阈值
function positionKillV14Improved3(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 计算近期波动
  const digits = recent.map(d => d[pos]);
  const mean = digits.reduce((s, v) => s + v, 0) / digits.length;
  const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / digits.length;
  const stdDev = Math.sqrt(variance);
  
  // 波动大: 杀上期
  if (stdDev >= 2.5) {
    return [lastDigit];
  }
  // 波动中: 用V14原版
  else if (stdDev >= 1.5) {
    return positionKillV14Original(prevData, pos);
  }
  // 波动小: 杀和值约束
  else {
    const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [lastDigit];
  }
}

// V14改进版4: 综合策略
function positionKillV14Improved4(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 策略池
  const strategies = [
    positionKillV14Original(prevData, pos)[0],
    positionKillV14Improved1(prevData, pos)[0],
    (10 - lastDigit) % 10, // 镜像
    (lastDigit + 1) % 10,  // 加1
    (lastDigit - 1 + 10) % 10, // 减1
  ];
  
  // 评估每个策略在近5期的表现
  let bestStrategy = 0;
  let bestHits = 0;
  
  for (let s = 0; s < strategies.length; s++) {
    let hits = 0;
    for (let i = recent.length - 1; i >= 1; i--) {
      const prevDigit = recent[i-1][pos];
      const prevRecent = prevData.slice(0, prevData.length - recent.length + i);
      const killDigit = strategies[s];
      
      // 简化：直接用策略杀的数字
      if (recent[i][pos] !== killDigit) hits++;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestStrategy = s;
    }
  }
  
  return [strategies[bestStrategy]];
}

// V14改进版5: 自适应切换
function positionKillV14Improved5(prevData, pos) {
  const recent = prevData.slice(-10);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 计算近10期各策略的表现
  const strategies = {
    'v14': 0,
    'mirror': 0,
    'plus1': 0,
    'minus1': 0,
  };
  
  for (let i = recent.length - 1; i >= 1; i--) {
    const prevDigit = recent[i-1][pos];
    const currDigit = recent[i][pos];
    
    // V14策略
    const avgSum = recent.slice(Math.max(0, i-3), i).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / Math.min(3, i);
    let v14Kill;
    if (avgSum >= 14) v14Kill = prevDigit === 9 ? 8 : 9;
    else if (avgSum <= 11) v14Kill = prevDigit === 0 ? 1 : 0;
    else v14Kill = prevDigit;
    if (currDigit !== v14Kill) strategies['v14']++;
    
    // 镜像策略
    if (currDigit !== (10 - prevDigit) % 10) strategies['mirror']++;
    
    // 加1策略
    if (currDigit !== (prevDigit + 1) % 10) strategies['plus1']++;
    
    // 减1策略
    if (currDigit !== (prevDigit - 1 + 10) % 10) strategies['minus1']++;
  }
  
  // 选表现最好的策略
  const bestStrategy = Object.keys(strategies).reduce((a, b) => strategies[a] > strategies[b] ? a : b);
  
  if (bestStrategy === 'v14') {
    return positionKillV14Original(prevData, pos);
  } else if (bestStrategy === 'mirror') {
    return [(10 - lastDigit) % 10];
  } else if (bestStrategy === 'plus1') {
    return [(lastDigit + 1) % 10];
  } else {
    return [(lastDigit - 1 + 10) % 10];
  }
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
  
  return { hitRate: parseFloat(hitRate), maxMiss: maxConsecutiveMiss, maxHit: maxConsecutiveHit };
}

console.log('=== V14改进版测试 - 降低连错率 ===\n');

const results = [];
results.push({ name: 'V14原版', ...testPositionKill('V14原版（和值区间）', positionKillV14Original) });
results.push({ name: 'V14改进1(多信号投票)', ...testPositionKill('V14改进版1: 多信号投票', positionKillV14Improved1) });
results.push({ name: 'V14改进2(连错熔断)', ...testPositionKill('V14改进版2: 连错熔断', positionKillV14Improved2) });
results.push({ name: 'V14改进3(动态阈值)', ...testPositionKill('V14改进版3: 动态阈值', positionKillV14Improved3) });
results.push({ name: 'V14改进4(综合策略)', ...testPositionKill('V14改进版4: 综合策略', positionKillV14Improved4) });
results.push({ name: 'V14改进5(自适应切换)', ...testPositionKill('V14改进版5: 自适应切换', positionKillV14Improved5) });

console.log('\n\n=== 汇总排名（按最大连错升序，命中率降序）===');
results.sort((a, b) => a.maxMiss - b.maxMiss || b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const improvement = r.maxMiss < 6 ? `↓${6-r.maxMiss}期` : (r.maxMiss > 6 ? `↑${r.maxMiss-6}期` : '持平');
  console.log(`${i+1}. ${r.name}: 命中率${r.hitRate}%, 最大连错${r.maxMiss}期 (${improvement})`);
});
