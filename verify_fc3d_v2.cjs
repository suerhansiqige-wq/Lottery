// 福彩3D新算法验证 - 多因子融合+动态权重+杀号
// 目标：85%+命中率，从25001期验证到最新一期
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

// ========== 工具函数 ==========
function getType(num) {
  const d = num.split('').map(Number);
  if (d[0] === d[1] && d[1] === d[2]) return 'baozi';
  if (d[0] === d[1] || d[0] === d[2] || d[1] === d[2]) return 'zusan';
  return 'zulu';
}

// ========== 算法V2: 位置独立多因子评分 ==========
function algoV2(draws, upToIdx, targetCount = 700) {
  // 历史窗口
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent30 = draws.slice(Math.max(0, upToIdx - 29), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);

  // === 因子1: 位置频率评分 (多窗口融合) ===
  const posFreqScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  const windows = [
    { data: recent10, weight: 8 },
    { data: recent30, weight: 4 },
    { data: recent50, weight: 2 },
    { data: recent100, weight: 1 },
  ];
  for (const w of windows) {
    for (const d of w.data) {
      posFreqScore[0][d.d1] += w.weight;
      posFreqScore[1][d.d2] += w.weight;
      posFreqScore[2][d.d3] += w.weight;
    }
  }

  // === 因子2: 遗漏值评分 (遗漏越大越可能出现) ===
  const posMissing = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  for (let pos = 0; pos < 3; pos++) {
    const key = ['d1', 'd2', 'd3'][pos];
    for (let digit = 0; digit <= 9; digit++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === digit) break;
        miss++;
      }
      posMissing[pos][digit] = miss;
    }
  }
  // 遗漏评分：遗漏越大分越高（回归均值）
  const posMissingScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  for (let pos = 0; pos < 3; pos++) {
    for (let d = 0; d <= 9; d++) {
      // 遗漏值适中(3-15)给高分，太大(>20)或太小(0-1)给低分
      const miss = posMissing[pos][d];
      if (miss >= 3 && miss <= 8) posMissingScore[pos][d] = miss * 3;
      else if (miss >= 9 && miss <= 15) posMissingScore[pos][d] = miss * 2;
      else if (miss >= 16 && miss <= 25) posMissingScore[pos][d] = miss * 1;
      else if (miss > 25) posMissingScore[pos][d] = 15; // 过冷不回
      else posMissingScore[pos][d] = miss * 1; // 刚出过，分低
    }
  }

  // === 因子3: 马尔可夫转移概率 ===
  const posTransScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  const lastDraw = draws[upToIdx];
  const lastDigits = [lastDraw.d1, lastDraw.d2, lastDraw.d3];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = ['d1', 'd2', 'd3'][pos];
    const curDigit = lastDigits[pos];
    // 统计历史中该位置出X后下期出Y的频率
    const transCount = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === curDigit) {
        transCount[recent100[i + 1][key]]++;
      }
    }
    // 也看前两位的联合转移
    if (pos < 2) {
      const key2 = ['d1', 'd2', 'd3'][pos + 1];
      const curDigit2 = lastDigits[pos + 1];
      for (let i = 0; i < recent50.length - 1; i++) {
        if (recent50[i][key] === curDigit && recent50[i][key2] === curDigit2) {
          transCount[recent50[i + 1][key]] += 2;
        }
      }
    }
    for (let d = 0; d <= 9; d++) {
      posTransScore[pos][d] = transCount[d];
    }
  }

  // === 因子4: 和值区间过滤 ===
  // 统计近期和值分布，确定高概率区间
  const sumFreq = new Array(28).fill(0);
  recent50.forEach(d => { sumFreq[d.d1 + d.d2 + d.d3]++; });
  // 找出覆盖85%开奖的和值范围
  const totalRecent = recent50.length;
  const sumRank = [];
  for (let s = 0; s <= 27; s++) sumRank.push({ sum: s, freq: sumFreq[s] });
  sumRank.sort((a, b) => b.freq - a.freq);
  let cumSum = 0;
  const hotSums = new Set();
  for (const sr of sumRank) {
    cumSum += sr.freq;
    hotSums.add(sr.sum);
    if (cumSum >= totalRecent * 0.88) break;
  }

  // === 因子5: 跨度过滤 ===
  const spanFreq = new Array(10).fill(0);
  recent50.forEach(d => {
    const span = Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3);
    spanFreq[span]++;
  });
  const spanRank = [];
  for (let s = 0; s <= 9; s++) spanRank.push({ span: s, freq: spanFreq[s] });
  spanRank.sort((a, b) => b.freq - a.freq);
  let cumSpan = 0;
  const hotSpans = new Set();
  for (const sr of spanRank) {
    cumSpan += sr.freq;
    hotSpans.add(sr.span);
    if (cumSpan >= totalRecent * 0.88) break;
  }

  // === 因子6: 杀号 - 近期重复号降低优先级 ===
  const recentRepeatScore = new Array(1000).fill(0);
  const last5Nums = new Set();
  for (let i = Math.max(0, upToIdx - 4); i <= upToIdx; i++) {
    last5Nums.add(`${draws[i].d1}${draws[i].d2}${draws[i].d3}`);
  }

  // === 因子7: 奇偶/大小比过滤 ===
  // 统计近期奇偶比和大小比分布
  const parityPatterns = {}; // e.g. "奇偶奇" -> count
  const sizePatterns = {};
  recent50.forEach(d => {
    const parity = [d.d1, d.d2, d.d3].map(x => x % 2 === 0 ? '偶' : '奇').join('');
    const size = [d.d1, d.d2, d.d3].map(x => x >= 5 ? '大' : '小').join('');
    parityPatterns[parity] = (parityPatterns[parity] || 0) + 1;
    sizePatterns[size] = (sizePatterns[size] || 0) + 1;
  });
  // 找出高频奇偶比和大小比（覆盖85%）
  const paritySorted = Object.entries(parityPatterns).sort((a, b) => b[1] - a[1]);
  const sizeSorted = Object.entries(sizePatterns).sort((a, b) => b[1] - a[1]);
  const hotParity = new Set();
  const hotSize = new Set();
  let cumP = 0;
  for (const [p, c] of paritySorted) { cumP += c; hotParity.add(p); if (cumP >= totalRecent * 0.90) break; }
  let cumS = 0;
  for (const [s, c] of sizeSorted) { cumS += c; hotSize.add(s); if (cumS >= totalRecent * 0.90) break; }

  // === 综合评分 ===
  const scoring = {};
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const digits = num.split('').map(Number);
    
    // 位置因子融合
    let posScore = 0;
    for (let pos = 0; pos < 3; pos++) {
      posScore += posFreqScore[pos][digits[pos]] * 2;       // 频率
      posScore += posMissingScore[pos][digits[pos]] * 1.5;   // 遗漏
      posScore += posTransScore[pos][digits[pos]] * 4;       // 转移
    }

    // 和值过滤
    const sum = digits[0] + digits[1] + digits[2];
    const sumBonus = hotSums.has(sum) ? 1.5 : 0.3;

    // 跨度过滤
    const span = Math.max(...digits) - Math.min(...digits);
    const spanBonus = hotSpans.has(span) ? 1.5 : 0.3;

    // 奇偶比过滤
    const parity = digits.map(x => x % 2 === 0 ? '偶' : '奇').join('');
    const parityBonus = hotParity.has(parity) ? 1.3 : 0.5;

    // 大小比过滤
    const size = digits.map(x => x >= 5 ? '大' : '小').join('');
    const sizeBonus = hotSize.has(size) ? 1.3 : 0.5;

    // 杀号：近5期重复号降权
    const repeatPenalty = last5Nums.has(num) ? 0.5 : 1.0;

    // 类型过滤：豹子极低概率
    const type = getType(num);
    const typeBonus = type === 'zulu' ? 1.2 : (type === 'zusan' ? 0.8 : 0.1);

    scoring[num] = posScore * sumBonus * spanBonus * parityBonus * sizeBonus * repeatPenalty * typeBonus;
  }

  const sorted = Object.entries(scoring).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, targetCount).map(([n]) => n);
}

// ========== 算法V3: 增强版 - 条件概率+模式匹配 ==========
function algoV3(draws, upToIdx, targetCount = 700) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent30 = draws.slice(Math.max(0, upToIdx - 29), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);

  // === 每位独立评分 ===
  const posScores = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = ['d1', 'd2', 'd3'][pos];
    
    // 1) 多窗口频率
    const windows = [
      { data: recent10, w: 10 },
      { data: recent30, w: 5 },
      { data: recent50, w: 3 },
      { data: recent100, w: 1 },
    ];
    const freq = new Array(10).fill(0);
    for (const w of windows) {
      for (const d of w.data) { freq[d[key]] += w.w; }
    }
    const maxFreq = Math.max(...freq);
    for (let d = 0; d <= 9; d++) posScores[pos][d] += (freq[d] / maxFreq) * 30;

    // 2) 遗漏回归
    const miss = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) {
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss[d]++;
      }
    }
    const avgMiss = 10; // 理论平均遗漏
    for (let d = 0; d <= 9; d++) {
      if (miss[d] > avgMiss * 1.5) posScores[pos][d] += Math.min(miss[d], 30) * 1.5;
      else if (miss[d] >= avgMiss * 0.5) posScores[pos][d] += miss[d] * 0.8;
    }

    // 3) 马尔可夫转移
    const lastDigit = draws[upToIdx][key];
    const trans = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastDigit) {
        trans[recent100[i + 1][key]]++;
      }
    }
    const maxTrans = Math.max(...trans, 1);
    for (let d = 0; d <= 9; d++) posScores[pos][d] += (trans[d] / maxTrans) * 25;

    // 4) 二阶马尔可夫（看最近2期的转移）
    if (upToIdx >= 2) {
      const prev2 = [draws[upToIdx - 1][key], draws[upToIdx][key]];
      const trans2 = new Array(10).fill(0);
      for (let i = 0; i < recent100.length - 2; i++) {
        if (recent100[i][key] === prev2[0] && recent100[i + 1][key] === prev2[1]) {
          trans2[recent100[i + 2][key]]++;
        }
      }
      const maxTrans2 = Math.max(...trans2, 1);
      for (let d = 0; d <= 9; d++) posScores[pos][d] += (trans2[d] / maxTrans2) * 20;
    }
  }

  // === 位置间关联：两两组合频率 ===
  const pairScores = {};
  const pairs = [[0, 1], [0, 2], [1, 2]];
  for (const [p1, p2] of pairs) {
    const k1 = ['d1', 'd2', 'd3'][p1];
    const k2 = ['d1', 'd2', 'd3'][p2];
    const pairFreq = {};
    for (const d of recent50) {
      const key = `${d[k1]}_${d[k2]}`;
      pairFreq[key] = (pairFreq[key] || 0) + 1;
    }
    pairScores[`${p1}_${p2}`] = pairFreq;
  }

  // === 和值/跨度/形态过滤 ===
  const sumFreq = new Array(28).fill(0);
  recent50.forEach(d => { sumFreq[d.d1 + d.d2 + d.d3]++; });
  const sumThreshold = [...sumFreq].sort((a, b) => b - a)[Math.floor(18 * 0.88)];
  
  const spanFreq = new Array(10).fill(0);
  recent50.forEach(d => {
    spanFreq[Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3)]++;
  });
  const spanThreshold = [...spanFreq].sort((a, b) => b - a)[Math.floor(8 * 0.88)];

  // === 综合评分 ===
  const candidates = [];
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const digits = num.split('').map(Number);
    
    // 位置独立分
    let score = 0;
    for (let pos = 0; pos < 3; pos++) {
      score += posScores[pos][digits[pos]];
    }

    // 位置间关联加分
    for (const [p1, p2] of pairs) {
      const key = `${digits[p1]}_${digits[p2]}`;
      const pf = pairScores[`${p1}_${p2}`][key] || 0;
      score += pf * 3;
    }

    // 和值过滤
    const sum = digits[0] + digits[1] + digits[2];
    if (sumFreq[sum] < sumThreshold) score *= 0.3;

    // 跨度过滤
    const span = Math.max(...digits) - Math.min(...digits);
    if (spanFreq[span] < spanThreshold) score *= 0.3;

    // 类型过滤
    const type = getType(num);
    if (type === 'baozi') score *= 0.05;
    else if (type === 'zusan') score *= 0.7;

    // 近5期重复降权
    const last5 = new Set();
    for (let j = Math.max(0, upToIdx - 4); j <= upToIdx; j++) {
      last5.add(`${draws[j].d1}${draws[j].d2}${draws[j].d3}`);
    }
    if (last5.has(num)) score *= 0.4;

    candidates.push({ num, score });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, targetCount).map(c => c.num);
}

// ========== 算法V4: 集成学习 - 多算法加权投票 ==========
function algoV4(draws, upToIdx, targetCount = 700) {
  // 运行V2和V3，加上额外策略，加权投票
  const v2Result = algoV2(draws, upToIdx, 1000);
  const v3Result = algoV3(draws, upToIdx, 1000);

  // 额外策略：位置组合频率
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent20 = draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1);
  
  // 统计连续2期的位置模式
  const patternFreq = {};
  for (let i = 1; i < recent50.length; i++) {
    const prev = draws[upToIdx - i];
    const cur = draws[upToIdx - i + 1];
    // 百位变化趋势
    const d1Change = cur.d1 - prev.d1;
    const d2Change = cur.d2 - prev.d2;
    const d3Change = cur.d3 - prev.d3;
    const pattern = `${Math.sign(d1Change)}_${Math.sign(d2Change)}_${Math.sign(d3Change)}`;
    patternFreq[pattern] = (patternFreq[pattern] || 0) + 1;
  }

  // 基于趋势预测下期每位方向
  const lastDraw = draws[upToIdx];
  const prevDraw = draws[upToIdx - 1];
  const trend = `${Math.sign(lastDraw.d1 - prevDraw.d1)}_${Math.sign(lastDraw.d2 - prevDraw.d2)}_${Math.sign(lastDraw.d3 - prevDraw.d3)}`;
  
  // 找趋势后面最可能的变化方向
  const trendNext = {};
  for (let i = 1; i < recent50.length - 1; i++) {
    const d = draws[upToIdx - i];
    const pd = draws[upToIdx - i - 1];
    const t = `${Math.sign(d.d1 - pd.d1)}_${Math.sign(d.d2 - pd.d2)}_${Math.sign(d.d3 - pd.d3)}`;
    if (t === trend) {
      const next = draws[upToIdx - i + 1];
      const nextT = `${Math.sign(next.d1 - d.d1)}_${Math.sign(next.d2 - d.d2)}_${Math.sign(next.d3 - d.d3)}`;
      trendNext[nextT] = (trendNext[nextT] || 0) + 1;
    }
  }

  // 用趋势生成额外的号码集
  const trendNums = [];
  for (const [dir, count] of Object.entries(trendNext).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
    const [s1, s2, s3] = dir.split('_').map(Number);
    // 对每个位置，根据方向生成候选数字
    for (let pos = 0; pos < 3; pos++) {
      const sign = [s1, s2, s3][pos];
      const curD = [lastDraw.d1, lastDraw.d2, lastDraw.d3][pos];
      // 根据方向添加候选
      for (let delta = -3; delta <= 3; delta++) {
        if ((sign > 0 && delta <= 0) || (sign < 0 && delta >= 0) || (sign === 0 && delta === 0)) continue;
        const next = (curD + delta + 10) % 10;
        trendNums.push({ pos, digit: next, weight: count });
      }
    }
  }

  // 投票融合
  const allNums = [];
  for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));
  
  const voteScore = {};
  allNums.forEach(n => voteScore[n] = 0);

  // V2排名投票（前500名得2分，前1000名得1分）
  v2Result.forEach((n, idx) => {
    if (idx < 500) voteScore[n] += 3;
    else voteScore[n] += 1;
  });

  // V3排名投票
  v3Result.forEach((n, idx) => {
    if (idx < 500) voteScore[n] += 3;
    else voteScore[n] += 1;
  });

  // 趋势投票
  // 对每个位置，计算每个数字的趋势分
  const posTrendScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  for (const tn of trendNums) {
    posTrendScore[tn.pos][tn.digit] += tn.weight;
  }

  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const digits = num.split('').map(Number);
    let trendScore = 0;
    for (let pos = 0; pos < 3; pos++) {
      trendScore += posTrendScore[pos][digits[pos]];
    }
    voteScore[num] += trendScore * 0.5;
  }

  const sorted = allNums.slice().sort((a, b) => voteScore[b] - voteScore[a]);
  return sorted.slice(0, targetCount);
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

  return { hits, total, rate: parseFloat(rate), maxConsecMiss };
}

// ========== 主验证 ==========
const START_ISSUE = '25001';
const startIdx = draws.findIndex(d => d.issue >= START_ISSUE);
const warmup = 100; // 前100期作为历史窗口
const actualStart = Math.max(startIdx, warmup);

console.log(`\n从 ${draws[actualStart].issue} 期开始验证（前${actualStart}期作为历史窗口）`);

// 验证3个算法
const r2 = verifyAlgorithm(algoV2, draws, actualStart, '算法V2: 多因子融合');
const r3 = verifyAlgorithm(algoV3, draws, actualStart, '算法V3: 条件概率+模式匹配');
const r4 = verifyAlgorithm(algoV4, draws, actualStart, '算法V4: 集成学习');

console.log('\n\n=== 总结 ===');
console.log(`V2: ${r2.rate}% (最大连续未中: ${r2.maxConsecMiss})`);
console.log(`V3: ${r3.rate}% (最大连续未中: ${r3.maxConsecMiss})`);
console.log(`V4: ${r4.rate}% (最大连续未中: ${r4.maxConsecMiss})`);
