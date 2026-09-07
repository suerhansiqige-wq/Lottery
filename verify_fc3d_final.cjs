// 福彩3D终极算法 - 杀号策略+位置概率+集成
// 思路反转：不选最好的700个，而是杀掉最差的300个
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

// ========== 位置概率模型 ==========
function getPosProbabilities(draws, upToIdx) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent20 = draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  
  // 每位的概率分布（多窗口加权）
  const posProb = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  const windows = [
    { data: recent10, w: 0.4 },
    { data: recent20, w: 0.25 },
    { data: recent50, w: 0.2 },
    { data: recent100, w: 0.15 },
  ];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    for (const w of windows) {
      for (const d of w.data) {
        posProb[pos][d[key]] += w.w / w.data.length;
      }
    }
    // 归一化
    const sum = posProb[pos].reduce((a, b) => a + b, 0);
    for (let d = 0; d <= 9; d++) posProb[pos][d] /= sum;
  }
  
  return posProb;
}

// ========== 条件概率模型 ==========
function getConditionalProb(draws, upToIdx) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  
  // P(本期pos=d | 上期pos=lastD)
  const condProb = [];
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const cond = Array.from({length: 10}, () => new Array(10).fill(0.01)); // 拉普拉斯平滑
    for (let i = 0; i < recent100.length - 1; i++) {
      cond[recent100[i][key]][recent100[i + 1][key]]++;
    }
    // 归一化
    for (let from = 0; from <= 9; from++) {
      const sum = cond[from].reduce((a, b) => a + b, 0);
      for (let to = 0; to <= 9; to++) cond[from][to] /= sum;
    }
    condProb.push(cond);
  }
  
  return condProb;
}

// ========== 算法A: 纯概率乘积 ==========
function algoProb(draws, upToIdx, targetCount = 700) {
  const posProb = getPosProbabilities(draws, upToIdx);
  const condProb = getConditionalProb(draws, upToIdx);
  const lastDraw = draws[upToIdx];
  
  const allNums = [];
  for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));
  
  const scores = {};
  for (const num of allNums) {
    const d = num.split('').map(Number);
    // 独立概率乘积
    let prob = posProb[0][d[0]] * posProb[1][d[1]] * posProb[2][d[2]];
    // 条件概率加成
    prob *= condProb[0][lastDraw.d1][d[0]];
    prob *= condProb[1][lastDraw.d2][d[1]];
    prob *= condProb[2][lastDraw.d3][d[2]];
    // 类型调整
    const type = getType(num);
    if (type === 'baozi') prob *= 0.02;
    else if (type === 'zusan') prob *= 0.5;
    scores[num] = prob;
  }
  
  const sorted = allNums.sort((a, b) => scores[b] - scores[a]);
  return sorted.slice(0, targetCount);
}

// ========== 算法B: 杀号策略 ==========
function algoKill(draws, upToIdx, targetCount = 700) {
  const posProb = getPosProbabilities(draws, upToIdx);
  const condProb = getConditionalProb(draws, upToIdx);
  const lastDraw = draws[upToIdx];
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  
  // 每位综合评分（概率×条件概率）
  const posFinalScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];
    for (let d = 0; d <= 9; d++) {
      // 综合：先验概率 + 条件概率 + 遗漏修正
      let score = posProb[pos][d] * 0.4 + condProb[pos][lastD][d] * 0.4;
      
      // 遗漏修正
      let miss = 0;
      for (let i = recent50.length - 1; i >= 0; i--) {
        if (recent50[i][key] === d) break;
        miss++;
      }
      if (miss >= 5 && miss <= 12) score += 0.15;
      else if (miss > 12) score += 0.1;
      
      posFinalScore[pos][d] = score;
    }
  }

  // 每位排序，找出最不可能的数字
  const killPerPos = posFinalScore.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => a.score - b.score)
      .map(x => x.digit);
  });

  // 杀号策略：每位杀1个最冷的 → 杀100注，剩900
  // 然后从900中选最好的700
  const killDigit = [killPerPos[0][0], killPerPos[1][0], killPerPos[2][0]];
  
  // 从剩下的900注中，用综合分排序取700
  const candidates = [];
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const d = num.split('').map(Number);
    
    // 是否被杀
    if (d[0] === killDigit[0] || d[1] === killDigit[1] || d[2] === killDigit[2]) continue;
    
    const score = posFinalScore[0][d[0]] + posFinalScore[1][d[1]] + posFinalScore[2][d[2]];
    const type = getType(num);
    const typeMul = type === 'baozi' ? 0.01 : (type === 'zusan' ? 0.5 : 1.0);
    candidates.push({ num, score: score * typeMul });
  }
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, targetCount).map(c => c.num);
}

// ========== 算法C: 集成（概率+杀号+位置笛卡尔积） ==========
function algoEnsemble(draws, upToIdx, targetCount = 700) {
  const posProb = getPosProbabilities(draws, upToIdx);
  const condProb = getConditionalProb(draws, upToIdx);
  const lastDraw = draws[upToIdx];
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent20 = draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  
  // === 每位综合评分 ===
  const posFinalScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];
    
    // 1) 先验概率
    for (let d = 0; d <= 9; d++) {
      posFinalScore[pos][d] += posProb[pos][d] * 40;
    }
    
    // 2) 条件概率
    for (let d = 0; d <= 9; d++) {
      posFinalScore[pos][d] += condProb[pos][lastD][d] * 50;
    }
    
    // 3) 二阶条件概率
    if (upToIdx >= 2) {
      const prev2 = [draws[upToIdx - 1][key], draws[upToIdx][key]];
      const trans2 = new Array(10).fill(0);
      for (let i = 0; i < recent100.length - 2; i++) {
        if (recent100[i][key] === prev2[0] && recent100[i + 1][key] === prev2[1]) {
          trans2[recent100[i + 2][key]]++;
        }
      }
      const maxT2 = Math.max(...trans2, 1);
      for (let d = 0; d <= 9; d++) posFinalScore[pos][d] += (trans2[d] / maxT2) * 40;
    }
    
    // 4) 遗漏回归
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      if (miss >= 4 && miss <= 10) posFinalScore[pos][d] += miss * 3;
      else if (miss > 10 && miss <= 20) posFinalScore[pos][d] += 25;
      else if (miss > 20) posFinalScore[pos][d] += 15;
      else posFinalScore[pos][d] += miss * 1;
    }
    
    // 5) 跨位关联
    for (let otherPos = 0; otherPos < 3; otherPos++) {
      if (otherPos === pos) continue;
      const otherKey = keys[otherPos];
      const otherLast = lastDraw[otherKey];
      const crossFreq = new Array(10).fill(0);
      for (let i = 0; i < recent50.length - 1; i++) {
        if (recent50[i][otherKey] === otherLast) {
          crossFreq[recent50[i + 1][key]]++;
        }
      }
      const maxCF = Math.max(...crossFreq, 1);
      for (let d = 0; d <= 9; d++) posFinalScore[pos][d] += (crossFreq[d] / maxCF) * 20;
    }
  }

  // === 每位选top9 → 729注 → 排序取700 ===
  const topPerPos = posFinalScore.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 9)
      .map(x => x.digit);
  });

  const candidates = [];
  for (const d1 of topPerPos[0]) {
    for (const d2 of topPerPos[1]) {
      for (const d3 of topPerPos[2]) {
        const num = `${d1}${d2}${d3}`;
        let score = posFinalScore[0][d1] + posFinalScore[1][d2] + posFinalScore[2][d3];
        const type = getType(num);
        if (type === 'baozi') score *= 0.01;
        else if (type === 'zusan') score *= 0.55;
        candidates.push({ num, score });
      }
    }
  }
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, targetCount).map(c => c.num);
}

// ========== 算法D: 超参数搜索 - 每位选N个 ==========
function algoTunable(draws, upToIdx, targetCount = 700, topN = [9, 9, 9]) {
  const posProb = getPosProbabilities(draws, upToIdx);
  const condProb = getConditionalProb(draws, upToIdx);
  const lastDraw = draws[upToIdx];
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  
  const posFinalScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];
    
    for (let d = 0; d <= 9; d++) {
      posFinalScore[pos][d] += posProb[pos][d] * 40;
      posFinalScore[pos][d] += condProb[pos][lastD][d] * 50;
    }
    
    // 二阶
    if (upToIdx >= 2) {
      const prev2 = [draws[upToIdx - 1][key], draws[upToIdx][key]];
      const trans2 = new Array(10).fill(0);
      for (let i = 0; i < recent100.length - 2; i++) {
        if (recent100[i][key] === prev2[0] && recent100[i + 1][key] === prev2[1]) {
          trans2[recent100[i + 2][key]]++;
        }
      }
      const maxT2 = Math.max(...trans2, 1);
      for (let d = 0; d <= 9; d++) posFinalScore[pos][d] += (trans2[d] / maxT2) * 40;
    }
    
    // 遗漏
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      if (miss >= 4 && miss <= 10) posFinalScore[pos][d] += miss * 3;
      else if (miss > 10) posFinalScore[pos][d] += 25;
      else posFinalScore[pos][d] += miss;
    }
    
    // 跨位
    for (let otherPos = 0; otherPos < 3; otherPos++) {
      if (otherPos === pos) continue;
      const otherKey = keys[otherPos];
      const otherLast = lastDraw[otherKey];
      const crossFreq = new Array(10).fill(0);
      for (let i = 0; i < recent50.length - 1; i++) {
        if (recent50[i][otherKey] === otherLast) {
          crossFreq[recent50[i + 1][key]]++;
        }
      }
      const maxCF = Math.max(...crossFreq, 1);
      for (let d = 0; d <= 9; d++) posFinalScore[pos][d] += (crossFreq[d] / maxCF) * 20;
    }
  }

  const topPerPos = posFinalScore.map((scores, posIdx) => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN[posIdx])
      .map(x => x.digit);
  });

  const candidates = [];
  for (const d1 of topPerPos[0]) {
    for (const d2 of topPerPos[1]) {
      for (const d3 of topPerPos[2]) {
        const num = `${d1}${d2}${d3}`;
        let score = posFinalScore[0][d1] + posFinalScore[1][d2] + posFinalScore[2][d3];
        const type = getType(num);
        if (type === 'baozi') score *= 0.01;
        else if (type === 'zusan') score *= 0.55;
        candidates.push({ num, score });
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
  }

  const rate = (hits / total * 100).toFixed(2);
  console.log(`\n=== ${label} ===`);
  console.log(`验证期数: ${total}, 命中: ${hits}, 命中率: ${rate}%`);
  console.log(`最大连续命中: ${maxConsecHit}, 最大连续未中: ${maxConsecMiss}`);
  return { hits, total, rate: parseFloat(rate), maxConsecMiss, maxConsecHit };
}

// ========== 主验证 ==========
const START_ISSUE = '25001';
const startIdx = draws.findIndex(d => d.issue >= START_ISSUE);
const warmup = 100;
const actualStart = Math.max(startIdx, warmup);

console.log(`\n从 ${draws[actualStart].issue} 期开始验证\n`);

const rA = verifyAlgorithm(algoProb, draws, actualStart, 'A: 纯概率乘积');
const rB = verifyAlgorithm(algoKill, draws, actualStart, 'B: 杀号策略');
const rC = verifyAlgorithm(algoEnsemble, draws, actualStart, 'C: 集成(9×9×9)');

// 调参搜索：不同topN组合
console.log('\n\n=== 调参搜索 ===');
const configs = [
  [8, 8, 8], [8, 8, 9], [8, 9, 9], [9, 9, 9], [9, 9, 10], [10, 10, 10], [10, 10, 9], [10, 9, 9]
];
for (const topN of configs) {
  const fn = (draws, upToIdx, count) => algoTunable(draws, upToIdx, count, topN);
  const r = verifyAlgorithm(fn, draws, actualStart, `topN=[${topN}]`);
}

console.log('\n理论随机基准: 70.00%');
