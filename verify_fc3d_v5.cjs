// 福彩3D新算法V5 - 位置独立选号+笛卡尔积
// 核心思路：每位选8个最可能数字 → 8×8×8=512注 → 再补188注
const fs = require('fs');
const path = require('path');

// 读取开奖数据
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

// ========== 核心：每位独立评分 ==========
function scorePerPosition(draws, upToIdx) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent30 = draws.slice(Math.max(0, upToIdx - 29), upToIdx + 1);
  const recent15 = draws.slice(Math.max(0, upToIdx - 14), upToIdx + 1);
  const recent5 = draws.slice(Math.max(0, upToIdx - 4), upToIdx + 1);

  const posScores = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  const keys = ['d1', 'd2', 'd3'];

  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];

    // 1) 多窗口频率加权
    const freqScore = new Array(10).fill(0);
    const windows = [
      { data: recent5, w: 15 },
      { data: recent15, w: 8 },
      { data: recent30, w: 4 },
      { data: recent50, w: 2 },
      { data: recent100, w: 1 },
    ];
    for (const w of windows) {
      for (const d of w.data) { freqScore[d[key]] += w.w; }
    }
    // 归一化
    const maxF = Math.max(...freqScore, 1);
    for (let d = 0; d <= 9; d++) posScores[pos][d] += (freqScore[d] / maxF) * 100;

    // 2) 遗漏值回归（遗漏越大越该出了）
    const miss = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) {
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss[d]++;
      }
    }
    for (let d = 0; d <= 9; d++) {
      // 遗漏5-15期的数字最值得关注
      if (miss[d] >= 5 && miss[d] <= 15) posScores[pos][d] += 40 + miss[d] * 2;
      else if (miss[d] > 15 && miss[d] <= 25) posScores[pos][d] += 30;
      else if (miss[d] > 25) posScores[pos][d] += 20; // 太冷可能继续冷
      else posScores[pos][d] += miss[d] * 3; // 0-4期遗漏，刚出过
    }

    // 3) 一阶马尔可夫（上期→下期）
    const lastDigit = draws[upToIdx][key];
    const trans1 = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastDigit) {
        trans1[recent100[i + 1][key]]++;
      }
    }
    const maxT1 = Math.max(...trans1, 1);
    for (let d = 0; d <= 9; d++) posScores[pos][d] += (trans1[d] / maxT1) * 60;

    // 4) 二阶马尔可夫（前2期→下期）
    if (upToIdx >= 2) {
      const d1 = draws[upToIdx - 1][key], d2 = draws[upToIdx][key];
      const trans2 = new Array(10).fill(0);
      for (let i = 0; i < recent100.length - 2; i++) {
        if (recent100[i][key] === d1 && recent100[i + 1][key] === d2) {
          trans2[recent100[i + 2][key]]++;
        }
      }
      const maxT2 = Math.max(...trans2, 1);
      for (let d = 0; d <= 9; d++) posScores[pos][d] += (trans2[d] / maxT2) * 50;
    }

    // 5) 三阶马尔可夫（前3期→下期）
    if (upToIdx >= 3) {
      const d1 = draws[upToIdx - 2][key], d2 = draws[upToIdx - 1][key], d3 = draws[upToIdx][key];
      const trans3 = new Array(10).fill(0);
      for (let i = 0; i < recent100.length - 3; i++) {
        if (recent100[i][key] === d1 && recent100[i + 1][key] === d2 && recent100[i + 2][key] === d3) {
          trans3[recent100[i + 3][key]]++;
        }
      }
      const maxT3 = Math.max(...trans3, 1);
      for (let d = 0; d <= 9; d++) posScores[pos][d] += (trans3[d] / maxT3) * 45;
    }

    // 6) 邻位关联（其他位置的最新数字→本位置）
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
      for (let d = 0; d <= 9; d++) posScores[pos][d] += (crossFreq[d] / maxCF) * 30;
    }
  }

  return posScores;
}

// ========== 算法V5: 位置选号+笛卡尔积 ==========
function algoV5(draws, upToIdx, targetCount = 700) {
  const posScores = scorePerPosition(draws, upToIdx);
  
  // 每位取top8
  const topPerPos = posScores.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.digit);
  });

  // 笛卡尔积 top8×top8×top8 = 512
  const core = [];
  for (const d1 of topPerPos[0].slice(0, 8)) {
    for (const d2 of topPerPos[1].slice(0, 8)) {
      for (const d3 of topPerPos[2].slice(0, 8)) {
        core.push(`${d1}${d2}${d3}`);
      }
    }
  }

  // 补充：top9×top9×top9 中不在core里的，取综合分最高的
  const coreSet = new Set(core);
  const extras = [];
  for (const d1 of topPerPos[0].slice(0, 9)) {
    for (const d2 of topPerPos[1].slice(0, 9)) {
      for (const d3 of topPerPos[2].slice(0, 9)) {
        const num = `${d1}${d2}${d3}`;
        if (!coreSet.has(num)) {
          const totalScore = posScores[0][d1] + posScores[1][d2] + posScores[2][d3];
          extras.push({ num, score: totalScore });
        }
      }
    }
  }
  extras.sort((a, b) => b.score - a.score);
  
  const result = [...core];
  for (const e of extras) {
    if (result.length >= targetCount) break;
    if (!coreSet.has(e.num)) {
      result.push(e.num);
      coreSet.add(e.num);
    }
  }

  // 如果还不够，扩展到全部10位组合
  if (result.length < targetCount) {
    for (let i = 0; i <= 999 && result.length < targetCount; i++) {
      const num = String(i).padStart(3, '0');
      if (!coreSet.has(num)) {
        result.push(num);
        coreSet.add(num);
      }
    }
  }

  return result.slice(0, targetCount);
}

// ========== 算法V6: V5 + 和值/跨度/形态约束 ==========
function algoV6(draws, upToIdx, targetCount = 700) {
  const posScores = scorePerPosition(draws, upToIdx);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);

  // 计算和值概率
  const sumFreq = new Array(28).fill(0);
  recent50.forEach(d => { sumFreq[d.d1 + d.d2 + d.d3]++; });
  // 平滑
  for (let s = 0; s <= 27; s++) sumFreq[s] += 1;
  const sumTotal = sumFreq.reduce((a, b) => a + b, 0);
  const sumProb = sumFreq.map(f => f / sumTotal);

  // 计算跨度概率
  const spanFreq = new Array(10).fill(0);
  recent50.forEach(d => {
    spanFreq[Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3)]++;
  });
  for (let s = 0; s <= 9; s++) spanFreq[s] += 1;
  const spanTotal = spanFreq.reduce((a, b) => a + b, 0);

  // 评分所有1000个号码
  const allScored = [];
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const digits = num.split('').map(Number);

    // 位置独立分
    let posScore = posScores[0][digits[0]] + posScores[1][digits[1]] + posScores[2][digits[2]];

    // 和值加权
    const sum = digits[0] + digits[1] + digits[2];
    const sumWeight = sumProb[sum] * 28; // 归一化到1附近
    posScore *= Math.pow(sumWeight, 1.5);

    // 跨度加权
    const span = Math.max(...digits) - Math.min(...digits);
    const spanWeight = spanFreq[span] / (spanTotal / 10);
    posScore *= Math.pow(spanWeight, 0.8);

    // 类型加权
    const type = getType(num);
    if (type === 'baozi') posScore *= 0.05;
    else if (type === 'zusan') posScore *= 0.6;

    // 近5期重复降权
    const last5 = new Set();
    for (let j = Math.max(0, upToIdx - 4); j <= upToIdx; j++) {
      last5.add(`${draws[j].d1}${draws[j].d2}${draws[j].d3}`);
    }
    if (last5.has(num)) posScore *= 0.3;

    allScored.push({ num, score: posScore });
  }

  allScored.sort((a, b) => b.score - a.score);
  return allScored.slice(0, targetCount).map(x => x.num);
}

// ========== 算法V7: 纯位置笛卡尔积（无约束） ==========
function algoV7(draws, upToIdx, targetCount = 700) {
  const posScores = scorePerPosition(draws, upToIdx);
  
  // 每位取top9 → 9×9×9 = 729
  const topPerPos = posScores.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.digit);
  });

  const result = [];
  for (const d1 of topPerPos[0].slice(0, 9)) {
    for (const d2 of topPerPos[1].slice(0, 9)) {
      for (const d3 of topPerPos[2].slice(0, 9)) {
        result.push(`${d1}${d2}${d3}`);
      }
    }
  }

  // 取前700
  return result.slice(0, targetCount);
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

  // 分段统计
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

const r5 = verifyAlgorithm(algoV5, draws, actualStart, 'V5: 位置选号+笛卡尔积');
const r6 = verifyAlgorithm(algoV6, draws, actualStart, 'V6: V5+和值跨度约束');
const r7 = verifyAlgorithm(algoV7, draws, actualStart, 'V7: 纯位置9×9×9');

console.log('\n\n=== 总结 ===');
console.log(`V5: ${r5.rate}% (最大连续未中: ${r5.maxConsecMiss})`);
console.log(`V6: ${r6.rate}% (最大连续未中: ${r6.maxConsecMiss})`);
console.log(`V7: ${r7.rate}% (最大连续未中: ${r7.maxConsecMiss})`);

// 理论随机基准
console.log(`\n理论随机基准: 70.00% (700/1000)`);
