// 福彩3D新算法V8 - 历史相似场景+自适应集成
// 核心思路：找到历史上与当前最相似的多个场景，用它们的后续结果预测
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'lottery-app', 'src', 'data', 'lotteryData.js');
let dataStr = fs.readFileSync(dataFile, 'utf-8');
const m = dataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = m[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws = lines.map(line => {
  const mm = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (mm) return { issue: mm[1], d1: Number(mm[2]), d2: Number(mm[3]), d3: Number(mm[4]) };
  return null;
}).filter(Boolean);

console.log(`总数据: ${draws.length}期 (${draws[0].issue} - ${draws[draws.length-1].issue})`);

function getType(num) {
  const d = num.split('').map(Number);
  if (d[0] === d[1] && d[1] === d[2]) return 'baozi';
  if (d[0] === d[1] || d[0] === d[2] || d[1] === d[2]) return 'zusan';
  return 'zulu';
}

// ========== 特征提取：将最近N期转化为一组特征 ==========
function extractFeatures(draws, upToIdx, windowSize = 10) {
  const recent = draws.slice(upToIdx - windowSize + 1, upToIdx + 1);
  const features = [];
  
  // 每期的3个数字
  for (const d of recent) {
    features.push(d.d1, d.d2, d.d3);
  }
  
  // 和值序列
  for (const d of recent) {
    features.push(d.d1 + d.d2 + d.d3);
  }
  
  // 跨度序列
  for (const d of recent) {
    features.push(Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3));
  }
  
  // 每位频率（10个数字在最近窗口出现次数）
  for (let pos = 0; pos < 3; pos++) {
    const key = ['d1', 'd2', 'd3'][pos];
    const freq = new Array(10).fill(0);
    recent.forEach(d => { freq[d[key]]++; });
    features.push(...freq);
  }
  
  return features;
}

// ========== 算法V8: 多窗口场景匹配 ==========
function algoV8(draws, upToIdx, targetCount = 700) {
  // 用多个窗口大小找相似场景
  const windowSizes = [5, 8, 10, 15, 20];
  const allNums = [];
  for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));
  
  const numScore = {};
  allNums.forEach(n => numScore[n] = 0);

  for (const ws of windowSizes) {
    if (upToIdx < ws + 5) continue;
    
    const curFeatures = extractFeatures(draws, upToIdx, ws);
    
    // 在历史中找最相似的场景
    const similarities = [];
    for (let i = ws; i < upToIdx - 2; i++) {
      const histFeatures = extractFeatures(draws, i, ws);
      
      // 计算欧氏距离
      let dist = 0;
      for (let f = 0; f < curFeatures.length; f++) {
        const diff = curFeatures[f] - histFeatures[f];
        dist += diff * diff;
      }
      similarities.push({ idx: i, dist: Math.sqrt(dist) });
    }
    
    // 取最相似的top15
    similarities.sort((a, b) => a.dist - b.dist);
    const topSimilar = similarities.slice(0, 15);
    
    // 统计这些相似场景后面1-3期的号码频率
    const nextFreq = {};
    allNums.forEach(n => nextFreq[n] = 0);
    
    for (const sim of topSimilar) {
      for (let offset = 1; offset <= 3; offset++) {
        const nextIdx = sim.idx + offset;
        if (nextIdx < draws.length) {
          const nextNum = `${draws[nextIdx].d1}${draws[nextIdx].d2}${draws[nextIdx].d3}`;
          nextFreq[nextNum] += (4 - offset); // 越近的权重越大
        }
      }
    }
    
    // 加入总分
    const maxFreq = Math.max(...Object.values(nextFreq), 1);
    for (const num of allNums) {
      numScore[num] += (nextFreq[num] / maxFreq) * 100;
    }
  }

  // 加入位置频率分
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const freq = new Array(10).fill(0);
    recent50.forEach(d => { freq[d[key]]++; });
    const recentF = new Array(10).fill(0);
    recent10.forEach(d => { recentF[d[key]]++; });
    
    for (let i = 0; i <= 999; i++) {
      const num = String(i).padStart(3, '0');
      const d = Number(num[pos]);
      numScore[num] += (freq[d] * 2 + recentF[d] * 5);
    }
  }

  const sorted = allNums.slice().sort((a, b) => numScore[b] - numScore[a]);
  return sorted.slice(0, targetCount);
}

// ========== 算法V9: 自适应集成（根据近期表现动态调整） ==========
function algoV9(draws, upToIdx, targetCount = 700) {
  const allNums = [];
  for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));
  
  // 策略A: 热号追踪（近期高频数字组合）
  const recent30 = draws.slice(Math.max(0, upToIdx - 29), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  const hotScores = {};
  allNums.forEach(n => hotScores[n] = 0);
  
  for (let pos = 0; pos < 3; pos++) {
    const key = ['d1', 'd2', 'd3'][pos];
    const freq10 = new Array(10).fill(0);
    const freq30 = new Array(10).fill(0);
    recent10.forEach(d => { freq10[d[key]]++; });
    recent30.forEach(d => { freq30[d[key]]++; });
    
    for (let i = 0; i <= 999; i++) {
      const num = String(i).padStart(3, '0');
      const d = Number(num[pos]);
      hotScores[num] += freq10[d] * 8 + freq30[d] * 3;
    }
  }

  // 策略B: 冷号回归（遗漏大的数字）
  const coldScores = {};
  allNums.forEach(n => coldScores[n] = 0);
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  
  for (let pos = 0; pos < 3; pos++) {
    const key = ['d1', 'd2', 'd3'][pos];
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      // 遗漏值适中给高分
      const missScore = miss >= 5 && miss <= 15 ? miss * 5 : (miss > 15 ? 40 : miss * 2);
      for (let i = 0; i <= 999; i++) {
        const num = String(i).padStart(3, '0');
        if (Number(num[pos]) === d) coldScores[num] += missScore;
      }
    }
  }

  // 策略C: 马尔可夫链
  const markovScores = {};
  allNums.forEach(n => markovScores[n] = 0);
  const keys = ['d1', 'd2', 'd3'];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = draws[upToIdx][key];
    const trans = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastD) trans[recent100[i + 1][key]]++;
    }
    const maxT = Math.max(...trans, 1);
    for (let i = 0; i <= 999; i++) {
      const num = String(i).padStart(3, '0');
      const d = Number(num[pos]);
      markovScores[num] += (trans[d] / maxT) * 100;
    }
  }

  // 策略D: 和值趋势
  const sumScores = {};
  allNums.forEach(n => sumScores[n] = 0);
  const sumFreq = new Array(28).fill(0);
  recent30.forEach(d => { sumFreq[d.d1 + d.d2 + d.d3]++; });
  // 找出热和值区间
  const avgSum = sumFreq.reduce((a, b) => a + b, 0) / 28;
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const digits = num.split('').map(Number);
    const sum = digits[0] + digits[1] + digits[2];
    const ratio = sumFreq[sum] / avgSum;
    sumScores[num] = ratio * 50;
  }

  // 自适应权重：根据最近20期各策略的准确率动态调整
  const recent20Start = Math.max(0, upToIdx - 20);
  const strategyScores = [hotScores, coldScores, markovScores, sumScores];
  const strategyWeights = [1, 1, 1, 1];
  
  // 计算每个策略在最近20期的命中率
  for (let period = recent20Start; period < upToIdx; period++) {
    const actual = `${draws[period].d1}${draws[period].d2}${draws[period].d3}`;
    for (let s = 0; s < 4; s++) {
      // 用该策略在period-1时刻的排名
      const scores = strategyScores[s];
      const sorted = allNums.slice().sort((a, b) => scores[b] - scores[a]);
      const rank = sorted.indexOf(actual);
      if (rank < 700) strategyWeights[s] += 0.5; // 命中则增加权重
    }
  }
  
  // 归一化权重
  const totalW = strategyWeights.reduce((a, b) => a + b, 0);
  const normWeights = strategyWeights.map(w => w / totalW * 4);

  // 融合
  const finalScore = {};
  allNums.forEach(n => {
    finalScore[n] = hotScores[n] * normWeights[0] + coldScores[n] * normWeights[1] + 
                    markovScores[n] * normWeights[2] + sumScores[n] * normWeights[3];
  });

  // 类型过滤
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const type = getType(num);
    if (type === 'baozi') finalScore[num] *= 0.05;
    else if (type === 'zusan') finalScore *= 0.65;
  }

  const sorted = allNums.slice().sort((a, b) => finalScore[b] - finalScore[a]);
  return sorted.slice(0, targetCount);
}

// ========== 算法V10: 位置独立选号增强版（每位选9个） ==========
function algoV10(draws, upToIdx, targetCount = 700) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent30 = draws.slice(Math.max(0, upToIdx - 29), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  const recent5 = draws.slice(Math.max(0, upToIdx - 4), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  
  const posScores = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    
    // 1) 多窗口频率
    const windows = [
      { data: recent5, w: 20 },
      { data: recent10, w: 12 },
      { data: recent30, w: 5 },
      { data: recent50, w: 2 },
      { data: recent100, w: 1 },
    ];
    const freq = new Array(10).fill(0);
    for (const w of windows) {
      for (const d of w.data) { freq[d[key]] += w.w; }
    }
    const maxF = Math.max(...freq, 1);
    for (let d = 0; d <= 9; d++) posScores[pos][d] += (freq[d] / maxF) * 80;

    // 2) 遗漏回归
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      if (miss >= 3 && miss <= 8) posScores[pos][d] += miss * 6;
      else if (miss >= 9 && miss <= 15) posScores[pos][d] += 50 + miss;
      else if (miss > 15) posScores[pos][d] += 30;
      else posScores[pos][d] += miss * 2;
    }

    // 3) 高阶马尔可夫（1-3阶融合）
    for (let order = 1; order <= 3; order++) {
      if (upToIdx < order) continue;
      const trans = new Array(10).fill(0);
      for (let i = 0; i < recent100.length - order; i++) {
        let match = true;
        for (let o = 0; o < order; o++) {
          if (recent100[i + o][key] !== draws[upToIdx - order + 1 + o][key]) { match = false; break; }
        }
        if (match) trans[recent100[i + order][key]]++;
      }
      const maxT = Math.max(...trans, 1);
      for (let d = 0; d <= 9; d++) posScores[pos][d] += (trans[d] / maxT) * (50 / order);
    }

    // 4) 跨位置关联
    for (let otherPos = 0; otherPos < 3; otherPos++) {
      if (otherPos === pos) continue;
      const otherKey = keys[otherPos];
      const otherLast = draws[upToIdx][otherKey];
      const crossFreq = new Array(10).fill(0);
      for (let i = 0; i < recent50.length - 1; i++) {
        if (recent50[i][otherKey] === otherLast) {
          crossFreq[recent50[i + 1][key]]++;
        }
      }
      const maxCF = Math.max(...crossFreq, 1);
      for (let d = 0; d <= 9; d++) posScores[pos][d] += (crossFreq[d] / maxCF) * 25;
    }

    // 5) 和值关联（上期和值→本期该位）
    const lastSum = draws[upToIdx].d1 + draws[upToIdx].d2 + draws[upToIdx].d3;
    const sumToPos = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      const s = recent100[i].d1 + recent100[i].d2 + recent100[i].d3;
      if (s === lastSum) {
        sumToPos[recent100[i + 1][key]]++;
      }
    }
    const maxSP = Math.max(...sumToPos, 1);
    for (let d = 0; d <= 9; d++) posScores[pos][d] += (sumToPos[d] / maxSP) * 35;
  }

  // 每位选top9 → 9×9×9 = 729，取前700
  const topPerPos = posScores.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 9)
      .map(x => x.digit);
  });

  // 生成729注并按综合分排序取700
  const candidates = [];
  for (const d1 of topPerPos[0]) {
    for (const d2 of topPerPos[1]) {
      for (const d3 of topPerPos[2]) {
        const num = `${d1}${d2}${d3}`;
        const score = posScores[0][d1] + posScores[1][d2] + posScores[2][d3];
        const type = getType(num);
        const typeMultiplier = type === 'baozi' ? 0.05 : (type === 'zusan' ? 0.6 : 1.0);
        candidates.push({ num, score: score * typeMultiplier });
      }
    }
  }
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, targetCount).map(c => c.num);
}

// ========== 验证函数 ==========
function verifyAlgorithm(algoFn, draws, startIdx, label) {
  let hits = 0, total = 0;
  let maxConsecHit = 0, maxConsecMiss = 0;
  let curConsecHit = 0, curConsecMiss = 0;
  const periodResults = [];

  for (let idx = startIdx; idx < draws.length; idx++) {
    const predicted = new Set(algoFn(draws, idx - 1, 700));
    const actual = `${draws[idx].d1}${draws[idx].d2}${draws[idx].d3}`;
    const hit = predicted.has(actual);
    total++;
    if (hit) {
      hits++;
      curConsecHit++;
      curConsecMiss = 0;
      maxConsecHit = Math.max(maxConsecHit, curConsecHit);
    } else {
      curConsecMiss++;
      curConsecHit = 0;
      maxConsecMiss = Math.max(maxConsecMiss, curConsecMiss);
    }
    periodResults.push({ issue: draws[idx].issue, hit });
  }

  const rate = (hits / total * 100).toFixed(2);
  console.log(`\n=== ${label} ===`);
  console.log(`验证期数: ${total}, 命中: ${hits}, 命中率: ${rate}%`);
  console.log(`最大连续命中: ${maxConsecHit}, 最大连续未中: ${maxConsecMiss}`);

  const segSize = 50;
  for (let i = 0; i < periodResults.length; i += segSize) {
    const seg = periodResults.slice(i, i + segSize);
    const segHits = seg.filter(r => r.hit).length;
    const segRate = (segHits / seg.length * 100).toFixed(1);
    console.log(`  ${seg[0].issue}-${seg[seg.length-1].issue}: ${segRate}% (${segHits}/${seg.length})`);
  }

  return { hits, total, rate: parseFloat(rate), maxConsecMiss, maxConsecHit };
}

// ========== 主验证 ==========
const START_ISSUE = '25001';
const startIdx = draws.findIndex(d => d.issue >= START_ISSUE);
const warmup = 100;
const actualStart = Math.max(startIdx, warmup);

console.log(`\n从 ${draws[actualStart].issue} 期开始验证`);

const r8 = verifyAlgorithm(algoV8, draws, actualStart, 'V8: 多窗口场景匹配');
const r10 = verifyAlgorithm(algoV10, draws, actualStart, 'V10: 位置选号增强版(9×9×9)');

console.log('\n\n=== 总结 ===');
console.log(`V8: ${r8.rate}% (最大连续未中: ${r8.maxConsecMiss})`);
console.log(`V10: ${r10.rate}% (最大连续未中: ${r10.maxConsecMiss})`);
console.log(`\n理论随机基准: 70.00%`);
