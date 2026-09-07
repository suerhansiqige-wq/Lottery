// 深度优化VI号算法 - 动量+均值回归混合的参数搜索与增强
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

// ========== 可参数化的VI算法 ==========
function algoVI(draws, upToIdx, targetCount, params) {
  const {
    momW5, momW10, momW20,  // 动量窗口权重
    revThreshold,            // 回归触发遗漏阈值
    revMultiplier,           // 回归倍数
    transWeight,             // 马尔可夫权重
    trans2Weight,            // 二阶马尔可夫权重
    crossWeight,             // 跨位权重
    concThreshold,           // 集中度阈值（决定动量vs回归）
    zusanMul,                // 组三乘数
    topN                     // 每位选几个
  } = params;

  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);

  const posScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];

    // 动量分
    const momentum = new Array(10).fill(0);
    draws.slice(Math.max(0, upToIdx - 4), upToIdx + 1).forEach(d => { momentum[d[key]] += momW5; });
    draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1).forEach(d => { momentum[d[key]] += momW10; });
    draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1).forEach(d => { momentum[d[key]] += momW20; });
    
    // 回归分
    const reversion = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      reversion[d] = Math.max(0, miss - revThreshold) * revMultiplier;
    }

    // 自适应混合
    const maxMom = Math.max(...momentum, 1);
    const momConcentration = momentum.reduce((a, b) => a + (b / maxMom) ** 2, 0) / 10;
    
    const momWeight = momConcentration > concThreshold ? 0.7 : 0.4;
    const revWeight = 1 - momWeight;

    for (let d = 0; d <= 9; d++) {
      posScore[pos][d] += (momentum[d] / maxMom) * 80 * momWeight;
      posScore[pos][d] += reversion[d] * revWeight;
    }

    // 马尔可夫
    const trans = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastD) trans[recent100[i + 1][key]]++;
    }
    const maxT = Math.max(...trans, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans[d] / maxT) * transWeight;

    // 二阶马尔可夫
    if (upToIdx >= 2) {
      const prev2 = [draws[upToIdx - 1][key], lastD];
      const trans2 = new Array(10).fill(0);
      for (let i = 0; i < recent100.length - 2; i++) {
        if (recent100[i][key] === prev2[0] && recent100[i + 1][key] === prev2[1]) {
          trans2[recent100[i + 2][key]]++;
        }
      }
      const maxT2 = Math.max(...trans2, 1);
      for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans2[d] / maxT2) * trans2Weight;
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
      for (let d = 0; d <= 9; d++) posScore[pos][d] += (crossFreq[d] / maxCF) * crossWeight;
    }
  }

  // 每位选topN
  const topPerPos = posScore.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topN)
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
        else if (type === 'zusan') score *= zusanMul;
        candidates.push({ num, score });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, targetCount).map(c => c.num);
}

// ========== 验证函数（快速版） ==========
function verifyFast(algoFn, draws, startIdx) {
  let hits = 0, total = 0;
  let maxConsecMiss = 0, curConsecMiss = 0;

  for (let idx = startIdx; idx < draws.length; idx++) {
    const predicted = new Set(algoFn(draws, idx - 1, 700));
    const actual = `${draws[idx].d1}${draws[idx].d2}${draws[idx].d3}`;
    if (predicted.has(actual)) {
      hits++;
      curConsecMiss = 0;
    } else {
      curConsecMiss++;
      maxConsecMiss = Math.max(maxConsecMiss, curConsecMiss);
    }
    total++;
  }
  return { hits, total, rate: (hits / total * 100).toFixed(2), maxConsecMiss };
}

// ========== 参数搜索 ==========
const START_ISSUE = '25001';
const startIdx = draws.findIndex(d => d.issue >= START_ISSUE);
const actualStart = Math.max(startIdx, 100);

console.log('\n=== 参数搜索 ===\n');

const paramGrid = [
  // 原始VI参数
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 5, revMultiplier: 3, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.15, zusanMul: 0.55, topN: 9 },
  // 调整动量权重
  { momW5: 15, momW10: 8, momW20: 4, revThreshold: 5, revMultiplier: 3, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.15, zusanMul: 0.55, topN: 9 },
  { momW5: 8, momW10: 5, momW20: 2, revThreshold: 4, revMultiplier: 4, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.15, zusanMul: 0.55, topN: 9 },
  // 调整回归
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 3, revMultiplier: 5, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.15, zusanMul: 0.55, topN: 9 },
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 6, revMultiplier: 2, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.15, zusanMul: 0.55, topN: 9 },
  // 调整集中度阈值
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 5, revMultiplier: 3, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.10, zusanMul: 0.55, topN: 9 },
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 5, revMultiplier: 3, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.20, zusanMul: 0.55, topN: 9 },
  // 调整马尔可夫权重
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 5, revMultiplier: 3, transWeight: 80, trans2Weight: 60, crossWeight: 30, concThreshold: 0.15, zusanMul: 0.55, topN: 9 },
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 5, revMultiplier: 3, transWeight: 40, trans2Weight: 30, crossWeight: 20, concThreshold: 0.15, zusanMul: 0.55, topN: 9 },
  // 组三乘数
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 5, revMultiplier: 3, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.15, zusanMul: 0.40, topN: 9 },
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 5, revMultiplier: 3, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.15, zusanMul: 0.70, topN: 9 },
  // 不同topN
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 5, revMultiplier: 3, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.15, zusanMul: 0.55, topN: 8 },
  { momW5: 10, momW10: 6, momW20: 3, revThreshold: 5, revMultiplier: 3, transWeight: 60, trans2Weight: 50, crossWeight: 25, concThreshold: 0.15, zusanMul: 0.55, topN: 10 },
  // 激进动量
  { momW5: 20, momW10: 10, momW20: 5, revThreshold: 5, revMultiplier: 2, transWeight: 50, trans2Weight: 40, crossWeight: 20, concThreshold: 0.12, zusanMul: 0.55, topN: 9 },
  // 激进回归
  { momW5: 5, momW10: 3, momW20: 1, revThreshold: 4, revMultiplier: 6, transWeight: 50, trans2Weight: 40, crossWeight: 20, concThreshold: 0.18, zusanMul: 0.55, topN: 9 },
];

let bestRate = 0;
let bestParams = null;
let bestResult = null;

for (let i = 0; i < paramGrid.length; i++) {
  const params = paramGrid[i];
  const fn = (draws, upToIdx, count) => algoVI(draws, upToIdx, count, params);
  const result = verifyFast(fn, draws, actualStart);
  const label = `P${i}: topN=${params.topN} rev=${params.revThreshold}/${params.revMultiplier} trans=${params.transWeight}/${params.trans2Weight} zusan=${params.zusanMul}`;
  console.log(`${label} → ${result.rate}% (连续未中: ${result.maxConsecMiss})`);
  
  if (parseFloat(result.rate) > bestRate) {
    bestRate = parseFloat(result.rate);
    bestParams = params;
    bestResult = result;
  }
}

console.log(`\n=== 最佳参数 ===`);
console.log(`命中率: ${bestResult.rate}%, 连续未中: ${bestResult.maxConsecMiss}`);
console.log(`参数: ${JSON.stringify(bestParams)}`);

// ========== 用最佳参数做分段统计 ==========
console.log('\n=== 最佳参数分段统计 ===');
const fn = (draws, upToIdx, count) => algoVI(draws, upToIdx, count, bestParams);
let hits = 0, total = 0;
let maxConsecHit = 0, maxConsecMiss = 0;
let curConsecHit = 0, curConsecMiss = 0;
const periodResults = [];

for (let idx = actualStart; idx < draws.length; idx++) {
  const predicted = new Set(fn(draws, idx - 1, 700));
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

const segSize = 50;
for (let i = 0; i < periodResults.length; i += segSize) {
  const seg = periodResults.slice(i, i + segSize);
  const segHits = seg.filter(r => r.hit).length;
  const segRate = (segHits / seg.length * 100).toFixed(1);
  console.log(`  ${seg[0].issue}-${seg[seg.length-1].issue}: ${segRate}% (${segHits}/${seg.length})`);
}

console.log(`\n总计: ${hits}/${total} = ${(hits/total*100).toFixed(2)}%`);
console.log(`最大连续命中: ${maxConsecHit}, 最大连续未中: ${maxConsecMiss}`);
