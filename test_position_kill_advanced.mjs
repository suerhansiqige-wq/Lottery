// 位杀算法 - 高级自适应策略，强制追求最大连错<3期
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V33: 自适应位杀 - 根据近期表现动态调整杀号策略
function positionKillAdaptive(prevData, pos) {
  const recent = prevData.slice(-10);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 统计近10期该位置的杀号效果
  let recentHits = 0;
  for (let i = recent.length - 1; i >= 1; i--) {
    const prevDigit = recent[i-1][pos];
    // 如果用简单规则（杀上期）能否杀对
    if (recent[i][pos] !== prevDigit) recentHits++;
  }
  
  const hitRate = recentHits / (recent.length - 1);
  
  // 如果近期杀上期效果好（>70%），继续杀上期
  if (hitRate > 0.7) {
    return [lastDigit];
  }
  // 否则杀和值约束
  else {
    const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [lastDigit];
  }
}

// V34: 模式识别位杀 - 寻找特定的数字模式
function positionKillPatternRecognition(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 模式1：连续递增
  let isIncreasing = true;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i][pos] <= recent[i-1][pos]) {
      isIncreasing = false;
      break;
    }
  }
  if (isIncreasing) return [(lastDigit + 1) % 10]; // 杀下一个
  
  // 模式2：连续递减
  let isDecreasing = true;
  for (let i = 1; i < recent.length; i++) {
    if (recent[i][pos] >= recent[i-1][pos]) {
      isDecreasing = false;
      break;
    }
  }
  if (isDecreasing) return [(lastDigit - 1 + 10) % 10]; // 杀前一个
  
  // 模式3：震荡（上下上下）
  let isOscillating = true;
  for (let i = 2; i < recent.length; i++) {
    const diff1 = recent[i-1][pos] - recent[i-2][pos];
    const diff2 = recent[i][pos] - recent[i-1][pos];
    if ((diff1 > 0 && diff2 > 0) || (diff1 < 0 && diff2 < 0)) {
      isOscillating = false;
      break;
    }
  }
  if (isOscillating) return [lastDigit]; // 杀上期
  
  // 默认：杀和值约束
  const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
  if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
  else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
  else return [lastDigit];
}

// V35: 集成学习位杀 - 多个弱分类器投票
function positionKillEnsemble(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  const votes = {};
  for (let d = 0; d <= 9; d++) votes[d] = 0;
  
  // 分类器1：杀上期
  votes[lastDigit]++;
  
  // 分类器2：杀和值约束
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  if (avgSum >= 14) votes[lastDigit === 9 ? 8 : 9]++;
  else if (avgSum <= 11) votes[lastDigit === 0 ? 1 : 0]++;
  else votes[lastDigit]++;
  
  // 分类器3：杀奇偶极端
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  if (oddCount >= 4) votes[9]++;
  else if (oddCount <= 1) votes[0]++;
  else votes[lastDigit]++;
  
  // 分类器4：杀大小极端
  const bigCount = recent.filter(d => d[pos] >= 5).length;
  if (bigCount >= 4) votes[9]++;
  else if (bigCount <= 1) votes[0]++;
  else votes[lastDigit]++;
  
  // 选票数最多的
  const maxVotes = Math.max(...Object.values(votes));
  const candidates = Object.keys(votes).filter(k => votes[k] === maxVotes).map(Number);
  
  return [candidates[0]];
}

// V36: 贝叶斯位杀 - 基于条件概率
function positionKillBayesian(prevData, pos) {
  const recent = prevData.slice(-20);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 计算每个数字在该位置出现的后验概率
  const counts = {};
  for (let d = 0; d <= 9; d++) counts[d] = 0;
  recent.forEach(d => counts[d[pos]]++);
  
  // 加上先验（均匀分布）
  const posterior = {};
  for (let d = 0; d <= 9; d++) {
    posterior[d] = (counts[d] + 1) / (recent.length + 10);
  }
  
  // 杀概率最低的数字（最不可能出现）
  const sorted = Object.entries(posterior).sort((a, b) => a[1] - b[1]);
  const killDigit = parseInt(sorted[0][0]);
  
  // 如果最低概率的数字就是上期，杀第二低
  if (killDigit === lastDigit) {
    return [parseInt(sorted[1][0])];
  }
  return [killDigit];
}

// V37: 马尔可夫位杀 - 基于状态转移
function positionKillMarkov(prevData, pos) {
  const recent = prevData.slice(-30);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 构建转移矩阵：从lastDigit转移到其他数字的概率
  const transitions = {};
  for (let d = 0; d <= 9; d++) transitions[d] = 0;
  
  for (let i = 1; i < recent.length; i++) {
    if (recent[i-1][pos] === lastDigit) {
      transitions[recent[i][pos]]++;
    }
  }
  
  // 找转移概率最低的数字（最不可能从lastDigit转移过去）
  const total = Object.values(transitions).reduce((s, v) => s + v, 0);
  if (total === 0) return [lastDigit]; // 没有历史数据，杀上期
  
  const probs = {};
  for (let d = 0; d <= 9; d++) {
    probs[d] = transitions[d] / total;
  }
  
  const sorted = Object.entries(probs).sort((a, b) => a[1] - b[1]);
  return [parseInt(sorted[0][0])];
}

// V38: 动态阈值位杀 - 根据连错情况调整
function positionKillDynamicThreshold(prevData, pos) {
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 检查近期连错情况
  let consecutiveMiss = 0;
  for (let i = prevData.length - 1; i >= Math.max(0, prevData.length - 5); i--) {
    const curr = prevData[i];
    const prev = prevData[i-1];
    if (!prev) break;
    
    // 用简单规则（杀上期）判断
    if (curr[pos] === prev[pos]) {
      consecutiveMiss++;
    } else {
      break;
    }
  }
  
  // 如果连错>=2，切换策略
  if (consecutiveMiss >= 2) {
    // 杀和值约束
    const recent = prevData.slice(-3);
    const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
    if (avgSum >= 14) return [lastDigit === 9 ? 8 : 9];
    else if (avgSum <= 11) return [lastDigit === 0 ? 1 : 0];
    else return [(lastDigit + 1) % 10];
  }
  // 否则杀上期
  else {
    return [lastDigit];
  }
}

// V39: 多信号加权位杀 - 综合多个信号并加权
function positionKillWeightedSignals(prevData, pos) {
  const recent = prevData.slice(-5);
  const lastDigit = prevData[prevData.length-1][pos];
  
  const scores = {};
  for (let d = 0; d <= 9; d++) scores[d] = 0;
  
  // 信号1：和值趋势（权重2）
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  if (avgSum >= 15) { scores[9] += 2; scores[8] += 1; }
  else if (avgSum <= 10) { scores[0] += 2; scores[1] += 1; }
  else { scores[lastDigit] += 2; }
  
  // 信号2：奇偶趋势（权重1.5）
  const oddCount = recent.filter(d => d[pos] % 2 === 1).length;
  if (oddCount >= 4) { scores[9] += 1.5; scores[7] += 1; }
  else if (oddCount <= 1) { scores[0] += 1.5; scores[2] += 1; }
  else { scores[lastDigit] += 1.5; }
  
  // 信号3：大小趋势（权重1.5）
  const bigCount = recent.filter(d => d[pos] >= 5).length;
  if (bigCount >= 4) { scores[9] += 1.5; scores[8] += 1; }
  else if (bigCount <= 1) { scores[0] += 1.5; scores[1] += 1; }
  else { scores[lastDigit] += 1.5; }
  
  // 信号4：遗漏回补（权重1）
  let miss = 0;
  for (let i = prevData.length - 1; i >= 0; i--) {
    if (prevData[i][pos] === lastDigit) break;
    miss++;
  }
  if (miss >= 8) scores[lastDigit] += 1;
  
  // 杀得分最高的（最可能被杀）
  const maxScore = Math.max(...Object.values(scores));
  const candidates = Object.keys(scores).filter(k => scores[k] === maxScore).map(Number);
  
  return [candidates[0]];
}

// V40: 终极自适应位杀 - 结合所有策略
function positionKillUltimate(prevData, pos) {
  const recent = prevData.slice(-10);
  const lastDigit = prevData[prevData.length-1][pos];
  
  // 策略池
  const strategies = [
    // 杀上期
    () => lastDigit,
    // 杀和值约束
    () => {
      const avgSum = recent.slice(-3).reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 3;
      if (avgSum >= 14) return lastDigit === 9 ? 8 : 9;
      else if (avgSum <= 11) return lastDigit === 0 ? 1 : 0;
      else return lastDigit;
    },
    // 杀镜像
    () => (10 - lastDigit) % 10,
    // 杀加1
    () => (lastDigit + 1) % 10,
    // 杀减1
    () => (lastDigit - 1 + 10) % 10,
  ];
  
  // 评估每个策略在近10期的表现
  let bestStrategy = 0;
  let bestHits = 0;
  
  for (let s = 0; s < strategies.length; s++) {
    let hits = 0;
    for (let i = recent.length - 1; i >= 1; i--) {
      const prevDigit = recent[i-1][pos];
      const killDigit = strategies[s].call(null, prevDigit, recent.slice(0, i));
      if (recent[i][pos] !== killDigit) hits++;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestStrategy = s;
    }
  }
  
  // 使用最佳策略
  return [strategies[bestStrategy]()];
}

// 测试函数
function testPositionKill(name, killFunc) {
  let total = 0;
  let baiHit = 0, shiHit = 0, geHit = 0;
  let baiTotal = 0, shiTotal = 0, geTotal = 0;
  
  let maxConsecutiveMiss = 0, currentConsecutiveMiss = 0;
  let maxConsecutiveHit = 0, currentConsecutiveHit = 0;
  
  for (let i = 20; i < data.length; i++) {
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

console.log('=== 位杀算法 - 高级自适应策略 ===\n');

const results = [];
results.push({ name: 'V33 自适应', ...testPositionKill('V33 自适应位杀', positionKillAdaptive) });
results.push({ name: 'V34 模式识别', ...testPositionKill('V34 模式识别位杀', positionKillPatternRecognition) });
results.push({ name: 'V35 集成学习', ...testPositionKill('V35 集成学习位杀', positionKillEnsemble) });
results.push({ name: 'V36 贝叶斯', ...testPositionKill('V36 贝叶斯位杀', positionKillBayesian) });
results.push({ name: 'V37 马尔可夫', ...testPositionKill('V37 马尔可夫位杀', positionKillMarkov) });
results.push({ name: 'V38 动态阈值', ...testPositionKill('V38 动态阈值位杀', positionKillDynamicThreshold) });
results.push({ name: 'V39 多信号加权', ...testPositionKill('V39 多信号加权位杀', positionKillWeightedSignals) });
results.push({ name: 'V40 终极自适应', ...testPositionKill('V40 终极自适应位杀', positionKillUltimate) });

console.log('\n\n=== 汇总排名（按最大连错升序，命中率降序）===');
results.sort((a, b) => a.maxMiss - b.maxMiss || b.hitRate - a.hitRate);
results.forEach((r, i) => {
  const flag = r.hitRate >= 90 && r.maxMiss < 3 ? ' ✓✓✓ 完美!' : (r.maxMiss < 3 ? ' ✓ 低连错' : '');
  console.log(`${i+1}. ${r.name}: 命中率${r.hitRate}%, 最大连错${r.maxMiss}期, 最大连对${r.maxHit}期${flag}`);
});
