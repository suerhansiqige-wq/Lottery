// 位杀算法 - 共识杀号法，强制降低连错
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// 共识法1: 3算法一致才杀 - 只有3个独立算法都同意杀同一个数字才杀
function positionKillConsensus3(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  const recent = prevData.slice(-5);
  
  // 算法A: V14原版
  const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  let killA;
  if (avgSum >= 14) killA = lastDigit === 9 ? 8 : 9;
  else if (avgSum <= 11) killA = lastDigit === 0 ? 1 : 0;
  else killA = lastDigit;
  
  // 算法B: 镜像
  const killB = (10 - lastDigit) % 10;
  
  // 算法C: 趋势
  let upCount = 0, downCount = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i][pos] > recent[i-1][pos]) upCount++;
    else if (recent[i][pos] < recent[i-1][pos]) downCount++;
  }
  let killC;
  if (upCount >= 3) killC = lastDigit >= 7 ? lastDigit - 1 : 9;
  else if (downCount >= 3) killC = lastDigit <= 2 ? lastDigit + 1 : 0;
  else killC = lastDigit;
  
  // 3个算法一致才杀
  if (killA === killB && killB === killC) {
    return [killA];
  }
  // 否则杀上期（最保守）
  return [lastDigit];
}

// 共识法2: 5算法投票，>=4票一致才杀
function positionKillConsensus5(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  const recent = prevData.slice(-5);
  
  const votes = {};
  for (let d = 0; d <= 9; d++) votes[d] = 0;
  
  // 5个算法投票
  // 算法1: V14
  const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  if (avgSum >= 14) votes[lastDigit === 9 ? 8 : 9]++;
  else if (avgSum <= 11) votes[lastDigit === 0 ? 1 : 0]++;
  else votes[lastDigit]++;
  
  // 算法2: 镜像
  votes[(10 - lastDigit) % 10]++;
  
  // 算法3: 加1
  votes[(lastDigit + 1) % 10]++;
  
  // 算法4: 减1
  votes[(lastDigit - 1 + 10) % 10]++;
  
  // 算法5: 和值约束(5期)
  const avgSum5 = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  if (avgSum5 >= 14) votes[9]++;
  else if (avgSum5 <= 11) votes[0]++;
  else votes[lastDigit]++;
  
  // 找票数最多的
  const maxVotes = Math.max(...Object.values(votes));
  const candidates = Object.keys(votes).filter(k => votes[k] === maxVotes).map(Number);
  
  // >=4票一致才杀
  if (maxVotes >= 4) {
    return [candidates[0]];
  }
  // 否则杀上期
  return [lastDigit];
}

// 共识法3: 动态共识 - 根据近期表现调整共识阈值
function positionKillDynamicConsensus(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  const recent = prevData.slice(-10);
  
  // 检查近5期连错
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
  
  // 连错>=2: 提高共识阈值（需要5个算法一致）
  // 连错=1: 中等共识（需要4个算法一致）
  // 无连错: 降低共识（需要3个算法一致）
  const threshold = recentMiss >= 2 ? 5 : (recentMiss === 1 ? 4 : 3);
  
  const votes = {};
  for (let d = 0; d <= 9; d++) votes[d] = 0;
  
  // 5个算法投票
  const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  if (avgSum >= 14) votes[lastDigit === 9 ? 8 : 9]++;
  else if (avgSum <= 11) votes[lastDigit === 0 ? 1 : 0]++;
  else votes[lastDigit]++;
  
  votes[(10 - lastDigit) % 10]++;
  votes[(lastDigit + 1) % 10]++;
  votes[(lastDigit - 1 + 10) % 10]++;
  
  const avgSum5 = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  if (avgSum5 >= 14) votes[9]++;
  else if (avgSum5 <= 11) votes[0]++;
  else votes[lastDigit]++;
  
  const maxVotes = Math.max(...Object.values(votes));
  const candidates = Object.keys(votes).filter(k => votes[k] === maxVotes).map(Number);
  
  if (maxVotes >= threshold) {
    return [candidates[0]];
  }
  return [lastDigit];
}

// 共识法4: 历史验证共识 - 只在历史同类情况下表现好时杀
function positionKillHistoricalConsensus(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  const recent = prevData.slice(-5);
  
  // 确定当前"状态"
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  let state = 'normal';
  if (avgSum >= 14) state = 'high';
  else if (avgSum <= 11) state = 'low';
  
  // 在历史数据中找同类状态，计算杀上期的命中率
  let historicalHits = 0;
  let historicalTotal = 0;
  
  for (let i = 30; i < prevData.length - 5; i++) {
    const histRecent = prevData.slice(i - 5, i);
    const histAvgSum = histRecent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
    
    let histState = 'normal';
    if (histAvgSum >= 14) histState = 'high';
    else if (histAvgSum <= 11) histState = 'low';
    
    if (histState === state) {
      historicalTotal++;
      const histLastDigit = prevData[i-1][pos];
      if (prevData[i][pos] !== histLastDigit) {
        historicalHits++;
      }
    }
  }
  
  // 历史命中率>80%才杀上期
  if (historicalTotal > 0 && historicalHits / historicalTotal > 0.8) {
    return [lastDigit];
  }
  
  // 否则用共识法
  const votes = {};
  for (let d = 0; d <= 9; d++) votes[d] = 0;
  
  if (avgSum >= 14) votes[9]++;
  else if (avgSum <= 11) votes[0]++;
  else votes[lastDigit]++;
  
  votes[(10 - lastDigit) % 10]++;
  votes[(lastDigit + 1) % 10]++;
  
  const maxVotes = Math.max(...Object.values(votes));
  const candidates = Object.keys(votes).filter(k => votes[k] === maxVotes).map(Number);
  
  if (maxVotes >= 2) {
    return [candidates[0]];
  }
  return [lastDigit];
}

// 共识法5: 终极共识 - 结合所有共识方法
function positionKillUltimateConsensus(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 用3个共识法分别计算
  const consensus1 = positionKillConsensus3(prevData, pos);
  const consensus2 = positionKillConsensus5(prevData, pos);
  const consensus3 = positionKillDynamicConsensus(prevData, pos);
  
  // 如果3个共识法都同意杀同一个数字
  if (consensus1[0] === consensus2[0] && consensus2[0] === consensus3[0]) {
    return consensus1;
  }
  
  // 否则用多数投票
  const votes = {};
  votes[consensus1[0]] = (votes[consensus1[0]] || 0) + 1;
  votes[consensus2[0]] = (votes[consensus2[0]] || 0) + 1;
  votes[consensus3[0]] = (votes[consensus3[0]] || 0) + 1;
  
  const maxVotes = Math.max(...Object.values(votes));
  const candidates = Object.keys(votes).filter(k => votes[k] === maxVotes).map(Number);
  
  return [candidates[0]];
}

// 测试函数
function testPositionKill(name, killFunc) {
  let total = 0;
  let baiHit = 0, shiHit = 0, geHit = 0;
  let baiTotal = 0, shiTotal = 0, geTotal = 0;
  
  let maxConsecutiveMiss = 0, currentConsecutiveMiss = 0;
  let maxConsecutiveHit = 0, currentConsecutiveHit = 0;
  
  for (let i = 30; i < data.length; i++) {
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

console.log('=== 位杀算法 - 共识杀号法测试 ===\n');

const results = [];
results.push({ name: '共识法1(3算法一致)', ...testPositionKill('共识法1: 3算法一致才杀', positionKillConsensus3) });
results.push({ name: '共识法2(5算法投票)', ...testPositionKill('共识法2: 5算法投票>=4票', positionKillConsensus5) });
results.push({ name: '共识法3(动态共识)', ...testPositionKill('共识法3: 动态共识阈值', positionKillDynamicConsensus) });
results.push({ name: '共识法4(历史验证)', ...testPositionKill('共识法4: 历史验证共识', positionKillHistoricalConsensus) });
results.push({ name: '共识法5(终极共识)', ...testPositionKill('共识法5: 终极共识', positionKillUltimateConsensus) });

console.log('\n\n=== 汇总排名（按最大连错升序，命中率降序）===');
results.sort((a, b) => a.maxMiss - b.maxMiss || b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const flag = r.maxMiss < 3 ? ' ✓✓✓ 达标!' : (r.maxMiss <= 4 ? ' ✓✓ 接近' : (r.maxMiss <= 5 ? ' ✓ 可接受' : ''));
  console.log(`${i+1}. ${r.name}: 命中率${r.hitRate}%, 最大连错${r.maxMiss}期, 最大连对${r.maxHit}期${flag}`);
});
