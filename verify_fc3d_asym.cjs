// 非对称位置选号 + 最终集成
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

// ========== 核心评分（最佳参数版） ==========
function scorePositions(draws, upToIdx) {
  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);

  const posScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];

    // 动量（增强版）
    const momentum = new Array(10).fill(0);
    draws.slice(Math.max(0, upToIdx - 4), upToIdx + 1).forEach(d => { momentum[d[key]] += 15; });
    draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1).forEach(d => { momentum[d[key]] += 8; });
    draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1).forEach(d => { momentum[d[key]] += 4; });
    
    // 回归
    const reversion = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      reversion[d] = Math.max(0, miss - 5) * 3;
    }

    // 自适应
    const maxMom = Math.max(...momentum, 1);
    const momConcentration = momentum.reduce((a, b) => a + (b / maxMom) ** 2, 0) / 10;
    const momWeight = momConcentration > 0.15 ? 0.7 : 0.4;
    const revWeight = 1 - momWeight;

    for (let d = 0; d <= 9; d++) {
      posScore[pos][d] += (momentum[d] / maxMom) * 80 * momWeight;
      posScore[pos][d] += reversion[d] * revWeight;
    }

    // 马尔可夫（增强）
    const trans = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastD) trans[recent100[i + 1][key]]++;
    }
    const maxT = Math.max(...trans, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans[d] / maxT) * 80;

    // 二阶马尔可夫（增强）
    if (upToIdx >= 2) {
      const prev2 = [draws[upToIdx - 1][key], lastD];
      const trans2 = new Array(10).fill(0);
      for (let i = 0; i < recent100.length - 2; i++) {
        if (recent100[i][key] === prev2[0] && recent100[i + 1][key] === prev2[1]) {
          trans2[recent100[i + 2][key]]++;
        }
      }
      const maxT2 = Math.max(...trans2, 1);
      for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans2[d] / maxT2) * 60;
    }

    // 遗漏
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      if (miss >= 4 && miss <= 10) posScore[pos][d] += miss * 4;
      else if (miss > 10) posScore[pos][d] += 30;
      else posScore[pos][d] += miss * 2;
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
      for (let d = 0; d <= 9; d++) posScore[pos][d] += (crossFreq[d] / maxCF) * 25;
    }
  }

  return posScore;
}

// ========== 非对称选号 ==========
function algoAsymmetric(draws, upToIdx, targetCount = 700, topN = [9, 9, 9]) {
  const posScore = scorePositions(draws, upToIdx);

  const topPerPos = posScore.map((scores, posIdx) => {
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
        let score = posScore[0][d1] + posScore[1][d2] + posScore[2][d3];
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

// ========== 全空间评分（不用笛卡尔积） ==========
function algoFullSpace(draws, upToIdx, targetCount = 700) {
  const posScore = scorePositions(draws, upToIdx);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);

  // 和值/跨度概率
  const sumFreq = new Array(28).fill(0);
  recent50.forEach(d => { sumFreq[d.d1 + d.d2 + d.d3]++; });
  for (let s = 0; s <= 27; s++) sumFreq[s] += 0.5;
  const sumTotal = sumFreq.reduce((a, b) => a + b, 0);

  const spanFreq = new Array(10).fill(0);
  recent50.forEach(d => {
    spanFreq[Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3)]++;
  });
  for (let s = 0; s <= 9; s++) spanFreq[s] += 0.5;
  const spanTotal = spanFreq.reduce((a, b) => a + b, 0);

  const allScored = [];
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const d = num.split('').map(Number);
    
    let score = posScore[0][d[0]] + posScore[1][d[1]] + posScore[2][d[2]];
    
    // 和值加权
    const sum = d[0] + d[1] + d[2];
    const sumRatio = sumFreq[sum] / (sumTotal / 28);
    score *= Math.pow(sumRatio, 1.5);
    
    // 跨度加权
    const span = Math.max(...d) - Math.min(...d);
    const spanRatio = spanFreq[span] / (spanTotal / 10);
    score *= Math.pow(spanRatio, 1.0);
    
    // 类型
    const type = getType(num);
    if (type === 'baozi') score *= 0.01;
    else if (type === 'zusan') score *= 0.55;
    
    allScored.push({ num, score });
  }
  
  allScored.sort((a, b) => b.score - a.score);
  return allScored.slice(0, targetCount).map(c => c.num);
}

// ========== 混合集成：非对称 + 全空间 投票 ==========
function algoHybrid(draws, upToIdx, targetCount = 700) {
  // 两种算法各取top500
  const r1 = new Set(algoAsymmetric(draws, upToIdx, 500, [9, 9, 9]));
  const r2 = new Set(algoFullSpace(draws, upToIdx, 500));
  
  // 投票：两个都选中的优先
  const allNums = [];
  for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));
  
  const posScore = scorePositions(draws, upToIdx);
  
  const scored = allNums.map(num => {
    const d = num.split('').map(Number);
    let baseScore = posScore[0][d[0]] + posScore[1][d[1]] + posScore[2][d[2]];
    
    let voteBonus = 0;
    if (r1.has(num)) voteBonus += 50;
    if (r2.has(num)) voteBonus += 50;
    
    const type = getType(num);
    if (type === 'baozi') baseScore *= 0.01;
    else if (type === 'zusan') baseScore *= 0.55;
    
    return { num, score: baseScore + voteBonus };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, targetCount).map(c => c.num);
}

// ========== 验证函数 ==========
function verify(algoFn, draws, startIdx, label) {
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
  console.log(`命中率: ${rate}% (${hits}/${total}) | 最大连续命中: ${maxConsecHit} | 最大连续未中: ${maxConsecMiss}`);

  const segSize = 50;
  for (let i = 0; i < periodResults.length; i += segSize) {
    const seg = periodResults.slice(i, i + segSize);
    const segHits = seg.filter(r => r.hit).length;
    const segRate = (segHits / seg.length * 100).toFixed(1);
    console.log(`  ${seg[0].issue}-${seg[seg.length-1].issue}: ${segRate}% (${segHits}/${seg.length})`);
  }

  return { hits, total, rate: parseFloat(rate), maxConsecMiss };
}

// ========== 主验证 ==========
const START_ISSUE = '25001';
const startIdx = draws.findIndex(d => d.issue >= START_ISSUE);
const actualStart = Math.max(startIdx, 100);

console.log(`\n从 ${draws[actualStart].issue} 期开始验证\n`);

// 非对称搜索
console.log('=== 非对称位置选号搜索 ===');
const asymConfigs = [
  [9, 9, 9], [8, 9, 10], [10, 9, 8], [9, 10, 8], [8, 10, 9],
  [10, 8, 9], [9, 8, 10], [8, 8, 10], [10, 8, 8], [8, 10, 8],
  [9, 9, 10], [10, 9, 9], [9, 10, 9],
  [7, 9, 10], [10, 9, 7], [8, 9, 9], [9, 8, 9], [9, 9, 8],
];

for (const topN of asymConfigs) {
  const fn = (d, u, c) => algoAsymmetric(d, u, c, topN);
  const r = verify(fn, draws, actualStart, `非对称[${topN}] (${topN[0]*topN[1]*topN[2]}组合)`);
}

// 全空间
const rFS = verify(algoFullSpace, draws, actualStart, '全空间评分(和值跨度加权)');

// 混合集成
const rH = verify(algoHybrid, draws, actualStart, '混合集成(非对称+全空间投票)');

console.log('\n=== 总结 ===');
console.log('之前最佳(VI): 77.70% (连续未中: 3)');
console.log('理论随机基准: 70.00%');
