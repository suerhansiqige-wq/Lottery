// 福彩3D终极优化 - 多层过滤策略
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

// ========== 核心评分引擎 ==========
function scoreAllNumbers(draws, upToIdx) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent30 = draws.slice(Math.max(0, upToIdx - 29), upToIdx + 1);
  const recent20 = draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  const recent5 = draws.slice(Math.max(0, upToIdx - 4), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];

  // === 每位独立评分 ===
  const posScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];
    
    // 1) 多窗口频率 (0-100分)
    const windows = [
      { data: recent5, w: 25 },
      { data: recent10, w: 15 },
      { data: recent20, w: 8 },
      { data: recent30, w: 4 },
      { data: recent50, w: 2 },
      { data: recent100, w: 1 },
    ];
    const freq = new Array(10).fill(0);
    for (const w of windows) {
      for (const d of w.data) { freq[d[key]] += w.w; }
    }
    const maxF = Math.max(...freq, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (freq[d] / maxF) * 100;

    // 2) 一阶马尔可夫 (0-60分)
    const trans1 = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastD) trans1[recent100[i + 1][key]]++;
    }
    const maxT1 = Math.max(...trans1, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans1[d] / maxT1) * 60;

    // 3) 二阶马尔可夫 (0-50分)
    if (upToIdx >= 2) {
      const prev2 = [draws[upToIdx - 1][key], lastD];
      const trans2 = new Array(10).fill(0);
      for (let i = 0; i < recent100.length - 2; i++) {
        if (recent100[i][key] === prev2[0] && recent100[i + 1][key] === prev2[1]) {
          trans2[recent100[i + 2][key]]++;
        }
      }
      const maxT2 = Math.max(...trans2, 1);
      for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans2[d] / maxT2) * 50;
    }

    // 4) 遗漏回归 (0-50分)
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      if (miss >= 3 && miss <= 8) posScore[pos][d] += miss * 5;
      else if (miss >= 9 && miss <= 15) posScore[pos][d] += 40 + miss;
      else if (miss > 15) posScore[pos][d] += 30;
      else posScore[pos][d] += miss * 2;
    }

    // 5) 跨位关联 (0-60分)
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
      for (let d = 0; d <= 9; d++) posScore[pos][d] += (crossFreq[d] / maxCF) * 20;
    }
    
    // 6) 和值关联 (0-40分)
    const lastSum = lastDraw.d1 + lastDraw.d2 + lastDraw.d3;
    const sumToPos = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      const s = recent100[i].d1 + recent100[i].d2 + recent100[i].d3;
      if (s === lastSum) sumToPos[recent100[i + 1][key]]++;
    }
    const maxSP = Math.max(...sumToPos, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (sumToPos[d] / maxSP) * 40;

    // 7) 跨度关联 (0-30分)
    const lastSpan = Math.max(lastDraw.d1, lastDraw.d2, lastDraw.d3) - Math.min(lastDraw.d1, lastDraw.d2, lastDraw.d3);
    const spanToPos = new Array(10).fill(0);
    for (let i = 0; i < recent50.length - 1; i++) {
      const sp = Math.max(recent50[i].d1, recent50[i].d2, recent50[i].d3) - Math.min(recent50[i].d1, recent50[i].d2, recent50[i].d3);
      if (sp === lastSpan) spanToPos[recent50[i + 1][key]]++;
    }
    const maxSTP = Math.max(...spanToPos, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (spanToPos[d] / maxSTP) * 30;
  }

  return posScore;
}

// ========== 算法E: 增强集成（更多因子） ==========
function algoE(draws, upToIdx, targetCount = 700) {
  const posScore = scoreAllNumbers(draws, upToIdx);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  
  // 和值概率
  const sumFreq = new Array(28).fill(0);
  recent50.forEach(d => { sumFreq[d.d1 + d.d2 + d.d3]++; });
  for (let s = 0; s <= 27; s++) sumFreq[s] += 0.5; // 平滑
  
  // 跨度概率
  const spanFreq = new Array(10).fill(0);
  recent50.forEach(d => {
    spanFreq[Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3)]++;
  });
  for (let s = 0; s <= 9; s++) spanFreq[s] += 0.5;

  // 每位选top10 → 1000注全空间
  const topPerPos = posScore.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.digit);
  });

  // 对所有1000注评分
  const candidates = [];
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const d = num.split('').map(Number);
    
    // 位置分
    let score = posScore[0][d[0]] + posScore[1][d[1]] + posScore[2][d[2]];
    
    // 和值加权
    const sum = d[0] + d[1] + d[2];
    const sumRatio = sumFreq[sum] / (sumFreq.reduce((a, b) => a + b, 0) / 28);
    score *= Math.pow(sumRatio, 2.0);
    
    // 跨度加权
    const span = Math.max(...d) - Math.min(...d);
    const spanRatio = spanFreq[span] / (spanFreq.reduce((a, b) => a + b, 0) / 10);
    score *= Math.pow(spanRatio, 1.2);
    
    // 类型过滤
    const type = getType(num);
    if (type === 'baozi') score *= 0.01;
    else if (type === 'zusan') score *= 0.5;
    
    // 近5期重复降权
    const last5 = new Set();
    for (let j = Math.max(0, upToIdx - 4); j <= upToIdx; j++) {
      last5.add(`${draws[j].d1}${draws[j].d2}${draws[j].d3}`);
    }
    if (last5.has(num)) score *= 0.3;
    
    candidates.push({ num, score });
  }
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, targetCount).map(c => c.num);
}

// ========== 算法F: 位置选top9 + 和值跨度约束 ==========
function algoF(draws, upToIdx, targetCount = 700) {
  const posScore = scoreAllNumbers(draws, upToIdx);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  
  // 和值/跨度阈值
  const sumFreq = new Array(28).fill(0);
  recent50.forEach(d => { sumFreq[d.d1 + d.d2 + d.d3]++; });
  for (let s = 0; s <= 27; s++) sumFreq[s] += 0.5;
  
  const spanFreq = new Array(10).fill(0);
  recent50.forEach(d => {
    spanFreq[Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3)]++;
  });
  for (let s = 0; s <= 9; s++) spanFreq[s] += 0.5;

  // 每位选top9
  const topPerPos = posScore.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 9)
      .map(x => x.digit);
  });

  // 生成729注并按综合分排序
  const candidates = [];
  for (const d1 of topPerPos[0]) {
    for (const d2 of topPerPos[1]) {
      for (const d3 of topPerPos[2]) {
        const num = `${d1}${d2}${d3}`;
        let score = posScore[0][d1] + posScore[1][d2] + posScore[2][d3];
        
        // 和值加权
        const sum = d1 + d2 + d3;
        const sumRatio = sumFreq[sum] / (sumFreq.reduce((a, b) => a + b, 0) / 28);
        score *= Math.pow(sumRatio, 2.0);
        
        // 跨度加权
        const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
        const spanRatio = spanFreq[span] / (spanFreq.reduce((a, b) => a + b, 0) / 10);
        score *= Math.pow(spanRatio, 1.2);
        
        // 类型
        const type = getType(num);
        if (type === 'baozi') score *= 0.01;
        else if (type === 'zusan') score *= 0.5;
        
        candidates.push({ num, score });
      }
    }
  }
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, targetCount).map(c => c.num);
}

// ========== 算法G: 动态杀号（每位杀最冷的1个） ==========
function algoG(draws, upToIdx, targetCount = 700) {
  const posScore = scoreAllNumbers(draws, upToIdx);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  
  // 和值/跨度
  const sumFreq = new Array(28).fill(0);
  recent50.forEach(d => { sumFreq[d.d1 + d.d2 + d.d3]++; });
  for (let s = 0; s <= 27; s++) sumFreq[s] += 0.5;
  
  const spanFreq = new Array(10).fill(0);
  recent50.forEach(d => {
    spanFreq[Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3)]++;
  });
  for (let s = 0; s <= 9; s++) spanFreq[s] += 0.5;

  // 每位杀1个最低分数字
  const killPerPos = posScore.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => a.score - b.score)[0].digit;
  });

  // 从非杀号中选top700
  const candidates = [];
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const d = num.split('').map(Number);
    
    // 被杀则跳过
    if (d[0] === killPerPos[0] || d[1] === killPerPos[1] || d[2] === killPerPos[2]) continue;
    
    let score = posScore[0][d[0]] + posScore[1][d[1]] + posScore[2][d[2]];
    
    const sum = d[0] + d[1] + d[2];
    const sumRatio = sumFreq[sum] / (sumFreq.reduce((a, b) => a + b, 0) / 28);
    score *= Math.pow(sumRatio, 2.0);
    
    const span = Math.max(...d) - Math.min(...d);
    const spanRatio = spanFreq[span] / (spanFreq.reduce((a, b) => a + b, 0) / 10);
    score *= Math.pow(spanRatio, 1.2);
    
    const type = getType(num);
    if (type === 'baozi') score *= 0.01;
    else if (type === 'zusan') score *= 0.5;
    
    candidates.push({ num, score });
  }
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, targetCount).map(c => c.num);
}

// ========== 算法H: 每位杀2个 ==========
function algoH(draws, upToIdx, targetCount = 700) {
  const posScore = scoreAllNumbers(draws, upToIdx);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  
  const sumFreq = new Array(28).fill(0);
  recent50.forEach(d => { sumFreq[d.d1 + d.d2 + d.d3]++; });
  for (let s = 0; s <= 27; s++) sumFreq[s] += 0.5;
  
  const spanFreq = new Array(10).fill(0);
  recent50.forEach(d => {
    spanFreq[Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3)]++;
  });
  for (let s = 0; s <= 9; s++) spanFreq[s] += 0.5;

  // 每位杀2个最低分数字
  const killPerPos = posScore.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map(x => x.digit);
  });

  const killSets = killPerPos.map(k => new Set(k));

  const candidates = [];
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const d = num.split('').map(Number);
    
    if (killSets[0].has(d[0]) || killSets[1].has(d[1]) || killSets[2].has(d[2])) continue;
    
    let score = posScore[0][d[0]] + posScore[1][d[1]] + posScore[2][d[2]];
    const sum = d[0] + d[1] + d[2];
    const sumRatio = sumFreq[sum] / (sumFreq.reduce((a, b) => a + b, 0) / 28);
    score *= Math.pow(sumRatio, 2.0);
    const span = Math.max(...d) - Math.min(...d);
    const spanRatio = spanFreq[span] / (spanFreq.reduce((a, b) => a + b, 0) / 10);
    score *= Math.pow(spanRatio, 1.2);
    const type = getType(num);
    if (type === 'baozi') score *= 0.01;
    else if (type === 'zusan') score *= 0.5;
    
    candidates.push({ num, score });
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

  // 分段
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

console.log(`\n从 ${draws[actualStart].issue} 期开始验证\n`);

const rE = verifyAlgorithm(algoE, draws, actualStart, 'E: 增强集成(全空间+和值跨度)');
const rF = verifyAlgorithm(algoF, draws, actualStart, 'F: 9×9×9+和值跨度约束');
const rG = verifyAlgorithm(algoG, draws, actualStart, 'G: 每位杀1个(9×9×9空间)');
const rH = verifyAlgorithm(algoH, draws, actualStart, 'H: 每位杀2个(8×8×8空间)');

console.log('\n\n=== 最终总结 ===');
console.log(`E: ${rE.rate}% (最大连续未中: ${rE.maxConsecMiss})`);
console.log(`F: ${rF.rate}% (最大连续未中: ${rF.maxConsecMiss})`);
console.log(`G: ${rG.rate}% (最大连续未中: ${rG.maxConsecMiss})`);
console.log(`H: ${rH.rate}% (最大连续未中: ${rH.maxConsecMiss})`);
console.log(`\n理论随机基准: 70.00%`);
