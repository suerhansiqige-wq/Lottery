// 位杀算法 - 全新思路，突破数学限制
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// 新思路1: 位置关联杀号 - 利用百十个之间的关联性
function positionKillCorrelation(prevData, pos) {
  const lastItem = prevData[prevData.length-1];
  const lastDigit = lastItem[pos];
  
  // 分析近10期该位置与其他位置的关联
  const recent = prevData.slice(-10);
  
  // 计算该位置与下一期的转移概率
  const transitions = {};
  for (let d = 0; d <= 9; d++) transitions[d] = 0;
  
  for (let i = 1; i < recent.length; i++) {
    if (recent[i-1][pos] === lastDigit) {
      transitions[recent[i][pos]]++;
    }
  }
  
  // 找转移概率最高的数字（最可能出现的）
  const maxTrans = Math.max(...Object.values(transitions));
  const likelyDigits = Object.keys(transitions).filter(k => transitions[k] === maxTrans).map(Number);
  
  // 杀最不可能出现的（转移概率为0的）
  const impossibleDigits = Object.keys(transitions).filter(k => transitions[k] === 0).map(Number);
  
  if (impossibleDigits.length > 0) {
    return [impossibleDigits[0]];
  } else {
    // 都有转移，杀转移概率最低的
    const minTrans = Math.min(...Object.values(transitions).filter(v => v > 0));
    const unlikelyDigits = Object.keys(transitions).filter(k => transitions[k] === minTrans).map(Number);
    return [unlikelyDigits[0]];
  }
}

// 新思路2: 周期规律杀号 - 寻找周期性模式
function positionKillPeriodic(prevData, pos) {
  const recent = prevData.slice(-20);
  const lastDigit = recent[recent.length-1][pos];
  
  // 检查是否有周期性（每隔N期重复）
  for (let period = 2; period <= 5; period++) {
    let isPeriodic = true;
    for (let i = period; i < Math.min(10, recent.length); i++) {
      if (recent[i][pos] !== recent[i-period][pos]) {
        isPeriodic = false;
        break;
      }
    }
    
    // 如果有周期性，杀下一个周期位置
    if (isPeriodic) {
      return [lastDigit];
    }
  }
  
  // 无周期性，用和值约束
  const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
  else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
  else return [lastDigit];
}

// 新思路3: 统计异常杀号 - 杀统计上的异常值
function positionKillStatistical(prevData, pos) {
  const recent = prevData.slice(-30);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 计算该位置近30期的均值和标准差
  const digits = recent.map(d => d[pos]);
  const mean = digits.reduce((s, v) => s + v, 0) / digits.length;
  const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / digits.length;
  const stdDev = Math.sqrt(variance);
  
  // 杀统计上的异常值（距离均值>2个标准差）
  const candidates = [];
  for (let d = 0; d <= 9; d++) {
    const zScore = Math.abs(d - mean) / stdDev;
    if (zScore > 1.5 && d !== lastDigit) {
      candidates.push({ digit: d, zScore });
    }
  }
  
  if (candidates.length > 0) {
    // 杀zScore最大的（最异常的）
    candidates.sort((a, b) => b.zScore - a.zScore);
    return [candidates[0].digit];
  }
  
  // 没有异常值，杀上期
  return [lastDigit];
}

// 新思路4: 趋势反转杀号 - 杀趋势即将反转的数字
function positionKillTrendReversal(prevData, pos) {
  const recent = prevData.slice(-7);
  const lastDigit = recent[recent.length-1][pos];
  
  // 计算趋势（上升/下降/震荡）
  let upCount = 0, downCount = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i][pos] > recent[i-1][pos]) upCount++;
    else if (recent[i][pos] < recent[i-1][pos]) downCount++;
  }
  
  // 强上升趋势：杀大数
  if (upCount >= 4) {
    return [lastDigit >= 7 ? lastDigit - 1 : 9];
  }
  // 强下降趋势：杀小数
  else if (downCount >= 4) {
    return [lastDigit <= 2 ? lastDigit + 1 : 0];
  }
  // 震荡：杀上期
  else {
    return [lastDigit];
  }
}

// 新思路5: 综合智能杀号 - 融合多种信号并动态加权
function positionKillIntelligent(prevData, pos) {
  const recent = prevData.slice(-10);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 5个策略的投票
  const votes = {};
  for (let d = 0; d <= 9; d++) votes[d] = 0;
  
  // 策略1: 和值约束 (权重2)
  const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  let v1;
  if (avgSum >= 14) v1 = lastDigit === 9 ? 8 : 9;
  else if (avgSum <= 11) v1 = lastDigit === 0 ? 1 : 0;
  else v1 = lastDigit;
  votes[v1] += 2;
  
  // 策略2: 转移概率 (权重2)
  const transitions = {};
  for (let d = 0; d <= 9; d++) transitions[d] = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i-1][pos] === lastDigit) {
      transitions[recent[i][pos]]++;
    }
  }
  const minTrans = Math.min(...Object.values(transitions));
  const unlikely = Object.keys(transitions).filter(k => transitions[k] === minTrans).map(Number);
  if (unlikely.length > 0) votes[unlikely[0]] += 2;
  
  // 策略3: 趋势反转 (权重1.5)
  let upCount = 0, downCount = 0;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i][pos] > recent[i-1][pos]) upCount++;
    else if (recent[i][pos] < recent[i-1][pos]) downCount++;
  }
  let v3;
  if (upCount >= 4) v3 = lastDigit >= 7 ? lastDigit - 1 : 9;
  else if (downCount >= 4) v3 = lastDigit <= 2 ? lastDigit + 1 : 0;
  else v3 = lastDigit;
  votes[v3] += 1.5;
  
  // 策略4: 统计异常 (权重1.5)
  const digits = recent.map(d => d[pos]);
  const mean = digits.reduce((s, v) => s + v, 0) / digits.length;
  const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / digits.length;
  const stdDev = Math.sqrt(variance);
  let v4 = lastDigit;
  for (let d = 0; d <= 9; d++) {
    const zScore = Math.abs(d - mean) / stdDev;
    if (zScore > 1.5 && d !== lastDigit) {
      v4 = d;
      break;
    }
  }
  votes[v4] += 1.5;
  
  // 策略5: 镜像 (权重1)
  votes[(10 - lastDigit) % 10] += 1;
  
  // 选票数最多的
  const maxVotes = Math.max(...Object.values(votes));
  const candidates = Object.keys(votes).filter(k => votes[k] === maxVotes).map(Number);
  
  return [candidates[0]];
}

// 新思路6: 机器学习式 - 根据历史表现动态调整策略权重
function positionKillML(prevData, pos) {
  const recent = prevData.slice(-20);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 测试5个策略在近20期的表现
  const strategies = [
    { name: 'v14', weight: 0 },
    { name: 'mirror', weight: 0 },
    { name: 'plus1', weight: 0 },
    { name: 'minus1', weight: 0 },
    { name: 'trend', weight: 0 },
  ];
  
  for (let i = recent.length - 1; i >= 1; i--) {
    const prevDigit = recent[i-1][pos];
    const currDigit = recent[i][pos];
    
    // V14策略
    const r = recent.slice(Math.max(0, i-3), i);
    const avgSum = r.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / Math.max(1, r.length);
    let v14Kill;
    if (avgSum >= 14) v14Kill = prevDigit === 9 ? 8 : 9;
    else if (avgSum <= 11) v14Kill = prevDigit === 0 ? 1 : 0;
    else v14Kill = prevDigit;
    if (currDigit !== v14Kill) strategies[0].weight++;
    
    // 镜像策略
    if (currDigit !== (10 - prevDigit) % 10) strategies[1].weight++;
    
    // 加1策略
    if (currDigit !== (prevDigit + 1) % 10) strategies[2].weight++;
    
    // 减1策略
    if (currDigit !== (prevDigit - 1 + 10) % 10) strategies[3].weight++;
    
    // 趋势策略
    let upCount = 0, downCount = 0;
    for (let j = Math.max(0, i-5); j < i; j++) {
      if (recent[j][pos] > recent[j-1]?.[pos]) upCount++;
      else if (recent[j][pos] < recent[j-1]?.[pos]) downCount++;
    }
    let trendKill;
    if (upCount >= 3) trendKill = prevDigit >= 7 ? prevDigit - 1 : 9;
    else if (downCount >= 3) trendKill = prevDigit <= 2 ? prevDigit + 1 : 0;
    else trendKill = prevDigit;
    if (currDigit !== trendKill) strategies[4].weight++;
  }
  
  // 选表现最好的策略
  strategies.sort((a, b) => b.weight - a.weight);
  const bestStrategy = strategies[0].name;
  
  if (bestStrategy === 'v14') {
    const recent3 = prevData.slice(-3);
    const avgSum = recent3.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [lastDigit];
  } else if (bestStrategy === 'mirror') {
    return [(10 - lastDigit) % 10];
  } else if (bestStrategy === 'plus1') {
    return [(lastDigit + 1) % 10];
  } else if (bestStrategy === 'minus1') {
    return [(lastDigit - 1 + 10) % 10];
  } else {
    // trend
    const recent5 = prevData.slice(-5);
    let upCount = 0, downCount = 0;
    for (let i = 1; i < recent5.length; i++) {
      if (recent5[i][pos] > recent5[i-1][pos]) upCount++;
      else if (recent5[i][pos] < recent5[i-1][pos]) downCount++;
    }
    if (upCount >= 3) return [lastDigit >= 7 ? lastDigit - 1 : 9];
    else if (downCount >= 3) return [lastDigit <= 2 ? lastDigit + 1 : 0];
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

console.log('=== 位杀算法 - 全新思路测试 ===\n');

const results = [];
results.push({ name: '新思路1(位置关联)', ...testPositionKill('新思路1: 位置关联杀号', positionKillCorrelation) });
results.push({ name: '新思路2(周期规律)', ...testPositionKill('新思路2: 周期规律杀号', positionKillPeriodic) });
results.push({ name: '新思路3(统计异常)', ...testPositionKill('新思路3: 统计异常杀号', positionKillStatistical) });
results.push({ name: '新思路4(趋势反转)', ...testPositionKill('新思路4: 趋势反转杀号', positionKillTrendReversal) });
results.push({ name: '新思路5(综合智能)', ...testPositionKill('新思路5: 综合智能杀号', positionKillIntelligent) });
results.push({ name: '新思路6(机器学习)', ...testPositionKill('新思路6: 机器学习式', positionKillML) });

console.log('\n\n=== 汇总排名（按最大连错升序，命中率降序）===');
results.sort((a, b) => a.maxMiss - b.maxMiss || b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const flag = r.maxMiss < 3 ? ' ✓✓✓ 达标!' : (r.maxMiss <= 4 ? ' ✓✓ 接近' : (r.maxMiss <= 5 ? ' ✓ 可接受' : ''));
  console.log(`${i+1}. ${r.name}: 命中率${r.hitRate}%, 最大连错${r.maxMiss}期, 最大连对${r.maxHit}期${flag}`);
});
