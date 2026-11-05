// V14终极改进版 - 强制降低连错到<3期
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V14终极版1: 保守熔断 - 连错1期就切换策略
function positionKillUltra1(prevData, pos) {
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
  
  // 连错>=1: 杀镜像
  if (recentMiss >= 1) {
    return [(10 - lastDigit) % 10];
  }
  // 否则用V14原版
  else {
    const recent = prevData.slice(-3);
    const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [lastDigit];
  }
}

// V14终极版2: 多策略轮询 - 根据近期表现选择策略
function positionKillUltra2(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 测试4个策略在近5期的表现
  const strategies = [
    { name: 'v14', kill: (d, prev) => {
      const avgSum = prev.slice(-3).reduce((s, x) => s + x.d1 + x.d2 + x.d3, 0) / 3;
      if (avgSum >= 14) return d === 9 ? 8 : 9;
      else if (avgSum <= 11) return d === 0 ? 1 : 0;
      else return d;
    }},
    { name: 'mirror', kill: (d) => (10 - d) % 10 },
    { name: 'plus1', kill: (d) => (d + 1) % 10 },
    { name: 'minus1', kill: (d) => (d - 1 + 10) % 10 },
  ];
  
  let bestStrategy = strategies[0];
  let bestHits = 0;
  
  for (const strategy of strategies) {
    let hits = 0;
    for (let i = 1; i < recent.length; i++) {
      const prevDigit = recent[i-1][pos];
      const currDigit = recent[i][pos];
      const killDigit = strategy.kill(prevDigit, recent.slice(0, i));
      if (currDigit !== killDigit) hits++;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestStrategy = strategy;
    }
  }
  
  return [bestStrategy.kill(lastDigit, recent)];
}

// V14终极版3: 加权投票 - 多个策略加权投票
function positionKillUltra3(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  const votes = {};
  for (let d = 0; d <= 9; d++) votes[d] = 0;
  
  // 策略1: V14原版 (权重3)
  const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  let v14Kill;
  if (avgSum >= 14) v14Kill = lastDigit === 9 ? 8 : 9;
  else if (avgSum <= 11) v14Kill = lastDigit === 0 ? 1 : 0;
  else v14Kill = lastDigit;
  votes[v14Kill] += 3;
  
  // 策略2: 镜像 (权重2)
  votes[(10 - lastDigit) % 10] += 2;
  
  // 策略3: 近期高频数字 (权重2)
  const freq = {};
  for (let d = 0; d <= 9; d++) freq[d] = 0;
  recent.forEach(d => freq[d[pos]]++);
  const maxFreq = Math.max(...Object.values(freq));
  const hotDigits = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
  hotDigits.forEach(d => {
    if (d !== lastDigit) votes[d] += 2;
  });
  
  // 策略4: 遗漏最大数字 (权重1)
  const missing = {};
  for (let d = 0; d <= 9; d++) {
    let miss = 0;
    for (let i = prevData.length - 1; i >= 0; i--) {
      if (prevData[i][pos] === d) break;
      miss++;
    }
    missing[d] = miss;
  }
  const maxMissing = Math.max(...Object.values(missing));
  const coldDigits = Object.keys(missing).filter(k => missing[k] === maxMissing).map(Number);
  coldDigits.forEach(d => {
    if (d !== lastDigit) votes[d] += 1;
  });
  
  // 选票数最多的
  const maxVotes = Math.max(...Object.values(votes));
  const candidates = Object.keys(votes).filter(k => votes[k] === maxVotes).map(Number);
  
  return [candidates[0]];
}

// V14终极版4: 动态窗口 - 根据近期稳定性调整窗口大小
function positionKillUltra4(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 计算近期稳定性
  const recent5 = prevData.slice(-5);
  const digits5 = recent5.map(d => d[pos]);
  const mean5 = digits5.reduce((s, v) => s + v, 0) / 5;
  const variance5 = digits5.reduce((s, v) => s + Math.pow(v - mean5, 2), 0) / 5;
  const stdDev5 = Math.sqrt(variance5);
  
  // 稳定(标准差<2): 用小窗口(3期)
  if (stdDev5 < 2) {
    const recent3 = prevData.slice(-3);
    const avgSum = recent3.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [lastDigit];
  }
  // 不稳定: 用大窗口(5期)的镜像
  else {
    return [(10 - lastDigit) % 10];
  }
}

// V14终极版5: 综合自适应 - 结合所有策略
function positionKillUltra5(prevData, pos) {
  const recent = prevData.slice(-10);
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
  
  // 连错>=2: 杀镜像
  if (recentMiss >= 2) {
    return [(10 - lastDigit) % 10];
  }
  // 连错=1: 杀加1
  else if (recentMiss === 1) {
    return [(lastDigit + 1) % 10];
  }
  // 无连错: 用V14原版
  else {
    const recent3 = prevData.slice(-3);
    const avgSum = recent3.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [lastDigit];
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

console.log('=== V14终极改进版测试 - 强制连错<3期 ===\n');

const results = [];
results.push({ name: 'V14终极1(保守熔断)', ...testPositionKill('V14终极版1: 保守熔断', positionKillUltra1) });
results.push({ name: 'V14终极2(多策略轮询)', ...testPositionKill('V14终极版2: 多策略轮询', positionKillUltra2) });
results.push({ name: 'V14终极3(加权投票)', ...testPositionKill('V14终极版3: 加权投票', positionKillUltra3) });
results.push({ name: 'V14终极4(动态窗口)', ...testPositionKill('V14终极版4: 动态窗口', positionKillUltra4) });
results.push({ name: 'V14终极5(综合自适应)', ...testPositionKill('V14终极版5: 综合自适应', positionKillUltra5) });

console.log('\n\n=== 汇总排名（按最大连错升序，命中率降序）===');
results.sort((a, b) => a.maxMiss - b.maxMiss || b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const flag = r.maxMiss < 3 ? ' ✓✓✓ 达标!' : (r.maxMiss < 6 ? ' ✓ 改善' : '');
  console.log(`${i+1}. ${r.name}: 命中率${r.hitRate}%, 最大连错${r.maxMiss}期, 最大连对${r.maxHit}期${flag}`);
});
