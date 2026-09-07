// 福彩3D新方向探索 - 条件组合+动态窗口+频率偏差+集成
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

// ========== 方向I: 条件组合约束 ==========
// 不只看每位独立频率，还看两位联合分布
function algoConditionalCombo(draws, upToIdx, targetCount = 700) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent30 = draws.slice(Math.max(0, upToIdx - 29), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];

  // === 每位独立评分 ===
  const posScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];
    
    // 多窗口频率
    const freq = new Array(10).fill(0);
    recent10.forEach(d => { freq[d[key]] += 15; });
    recent30.forEach(d => { freq[d[key]] += 5; });
    recent50.forEach(d => { freq[d[key]] += 2; });
    recent100.forEach(d => { freq[d[key]] += 1; });
    const maxF = Math.max(...freq, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (freq[d] / maxF) * 80;

    // 马尔可夫
    const trans = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastD) trans[recent100[i + 1][key]]++;
    }
    const maxT = Math.max(...trans, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans[d] / maxT) * 50;

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
      for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans2[d] / maxT2) * 40;
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

  // === 两位联合条件概率 ===
  // P(下期百位=a, 十位=b | 上期百位=x, 十位=y)
  const pairCond = {};
  const pairs = [[0, 1], [0, 2], [1, 2]];
  for (const [p1, p2] of pairs) {
    const k1 = keys[p1], k2 = keys[p2];
    const lastV1 = lastDraw[k1], lastV2 = lastDraw[k2];
    // 统计历史中 (pos1=v1, pos2=v2) → 下期(pos1, pos2)的频率
    const jointFreq = {};
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][k1] === lastV1 && recent100[i][k2] === lastV2) {
        const nextV1 = recent100[i + 1][k1];
        const nextV2 = recent100[i + 1][k2];
        const key = `${nextV1}_${nextV2}`;
        jointFreq[key] = (jointFreq[key] || 0) + 1;
      }
    }
    pairCond[`${p1}_${p2}`] = jointFreq;
  }

  // === 综合评分 ===
  const candidates = [];
  for (let i = 0; i <= 999; i++) {
    const num = String(i).padStart(3, '0');
    const d = num.split('').map(Number);
    
    // 位置独立分
    let score = posScore[0][d[0]] + posScore[1][d[1]] + posScore[2][d[2]];
    
    // 两位联合加分
    for (const [p1, p2] of pairs) {
      const key = `${d[p1]}_${d[p2]}`;
      const jf = pairCond[`${p1}_${p2}`][key] || 0;
      score += jf * 15;
    }

    // 类型
    const type = getType(num);
    if (type === 'baozi') score *= 0.01;
    else if (type === 'zusan') score *= 0.55;

    candidates.push({ num, score });
  }
  
  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, targetCount).map(c => c.num);
}

// ========== 方向II: 动态窗口自适应 ==========
function algoDynamicWindow(draws, upToIdx, targetCount = 700) {
  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];

  // 检测近期波动性：如果近期开奖变化大→用短窗口；如果稳定→用长窗口
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  let volatility = 0;
  for (let i = 1; i < recent10.length; i++) {
    for (const key of keys) {
      volatility += Math.abs(recent10[i][key] - recent10[i-1][key]);
    }
  }
  const avgVol = volatility / (recent10.length - 1) / 3;
  
  // 根据波动性选择窗口权重
  let windowWeights;
  if (avgVol > 3) {
    // 高波动：更重视近期
    windowWeights = { w5: 0.4, w10: 0.3, w20: 0.2, w50: 0.1 };
  } else if (avgVol > 2) {
    // 中等波动
    windowWeights = { w5: 0.25, w10: 0.3, w30: 0.25, w50: 0.2 };
  } else {
    // 低波动：更重视长期
    windowWeights = { w5: 0.1, w10: 0.2, w30: 0.3, w50: 0.25, w100: 0.15 };
  }

  const posScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];

    // 动态窗口频率
    const freq = new Array(10).fill(0);
    const wMap = {
      w5: draws.slice(Math.max(0, upToIdx - 4), upToIdx + 1),
      w10: draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1),
      w20: draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1),
      w30: draws.slice(Math.max(0, upToIdx - 29), upToIdx + 1),
      w50: draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1),
      w100: draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1),
    };
    for (const [wk, wv] of Object.entries(windowWeights)) {
      if (wMap[wk]) {
        for (const d of wMap[wk]) { freq[d[key]] += wv * 10; }
      }
    }
    const maxF = Math.max(...freq, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (freq[d] / maxF) * 100;

    // 马尔可夫（窗口也动态）
    const markovWindow = avgVol > 3 ? 50 : 100;
    const recentM = draws.slice(Math.max(0, upToIdx - markovWindow + 1), upToIdx + 1);
    const trans = new Array(10).fill(0);
    for (let i = 0; i < recentM.length - 1; i++) {
      if (recentM[i][key] === lastD) trans[recentM[i + 1][key]]++;
    }
    const maxT = Math.max(...trans, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans[d] / maxT) * 60;

    // 遗漏（用动态窗口）
    const missWindow = avgVol > 3 ? 50 : 100;
    const recentMiss = draws.slice(Math.max(0, upToIdx - missWindow + 1), upToIdx + 1);
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recentMiss.length - 1; i >= 0; i--) {
        if (recentMiss[i][key] === d) break;
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
      const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
      for (let i = 0; i < recent50.length - 1; i++) {
        if (recent50[i][otherKey] === otherLast) {
          crossFreq[recent50[i + 1][key]]++;
        }
      }
      const maxCF = Math.max(...crossFreq, 1);
      for (let d = 0; d <= 9; d++) posScore[pos][d] += (crossFreq[d] / maxCF) * 25;
    }
  }

  // 每位top9 → 729 → 取700
  const topPerPos = posScore.map(scores => {
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

// ========== 方向III: 频率偏差放大+杀号 ==========
function algoFreqDeviation(draws, upToIdx, targetCount = 700) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent20 = draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];

  const posScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];

    // 计算每位每个数字的频率偏差
    // 理论均匀分布: 每位每个数字应出现 N/10 次
    // 偏差 = 实际频率 - 期望频率
    const windows = [
      { data: recent10, expected: 1, weight: 10 },
      { data: recent20, expected: 2, weight: 6 },
      { data: recent50, expected: 5, weight: 3 },
      { data: recent100, expected: 10, weight: 1 },
    ];

    const deviation = new Array(10).fill(0);
    const freq = new Array(10).fill(0);
    for (const w of windows) {
      for (const d of w.data) { freq[d[key]] += w.weight; }
    }
    const totalFreq = freq.reduce((a, b) => a + b, 0);
    const expectedFreq = totalFreq / 10;
    
    for (let d = 0; d <= 9; d++) {
      const dev = (freq[d] - expectedFreq) / expectedFreq;
      // 放大正偏差（热号更热），适度放大负偏差（冷号回归）
      if (dev > 0) deviation[d] = dev * 80; // 热号加分
      else if (dev > -0.3) deviation[d] = dev * 30; // 轻微冷号小扣分
      else deviation[d] = -30; // 很冷的号大扣分
    }
    for (let d = 0; d <= 9; d++) posScore[pos][d] += deviation[d];

    // 马尔可夫
    const trans = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastD) trans[recent100[i + 1][key]]++;
    }
    const maxT = Math.max(...trans, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans[d] / maxT) * 60;

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
      for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans2[d] / maxT2) * 45;
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

  // 每位top9 → 729 → 取700
  const topPerPos = posScore.map(scores => {
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

// ========== 方向IV: 超级集成（融合所有最佳策略） ==========
function algoSuperEnsemble(draws, upToIdx, targetCount = 700) {
  // 运行3个子算法，取各自top500，投票融合
  const r1 = algoConditionalCombo(draws, upToIdx, 500);
  const r2 = algoDynamicWindow(draws, upToIdx, 500);
  const r3 = algoFreqDeviation(draws, upToIdx, 500);

  const allNums = [];
  for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));
  
  const voteScore = {};
  allNums.forEach(n => voteScore[n] = 0);

  // 排名加权投票
  [r1, r2, r3].forEach((result, algoIdx) => {
    result.forEach((num, rank) => {
      // 排名越靠前分越高
      voteScore[num] += (500 - rank) / 500 * 100;
    });
  });

  // 加入位置独立分作为tiebreaker
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];
    const trans = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastD) trans[recent100[i + 1][key]]++;
    }
    const maxT = Math.max(...trans, 1);
    for (let i = 0; i <= 999; i++) {
      const num = String(i).padStart(3, '0');
      const d = Number(num[pos]);
      voteScore[num] += (trans[d] / maxT) * 5;
    }
  }

  const sorted = allNums.sort((a, b) => voteScore[b] - voteScore[a]);
  return sorted.slice(0, targetCount);
}

// ========== 方向V: 位置评分+三位联合条件概率重排 ==========
function algoJointRerank(draws, upToIdx, targetCount = 700) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];

  // 第一步：每位独立评分（同之前）
  const posScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];

    // 频率
    const freq = new Array(10).fill(0);
    draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1).forEach(d => { freq[d[key]] += 15; });
    draws.slice(Math.max(0, upToIdx - 29), upToIdx + 1).forEach(d => { freq[d[key]] += 5; });
    recent50.forEach(d => { freq[d[key]] += 2; });
    recent100.forEach(d => { freq[d[key]] += 1; });
    const maxF = Math.max(...freq, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (freq[d] / maxF) * 100;

    // 马尔可夫
    const trans = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastD) trans[recent100[i + 1][key]]++;
    }
    const maxT = Math.max(...trans, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans[d] / maxT) * 60;

    // 二阶
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

  // 第二步：每位取top10 → 1000注
  const topPerPos = posScore.map(scores => {
    return scores.map((s, d) => ({ digit: d, score: s }))
      .sort((a, b) => b.score - a.score)
      .map(x => x.digit);
  });

  // 第三步：用三位联合条件概率重排
  // P(下期=a,b,c | 上期=x,y,z) 从历史中统计
  const lastV = [lastDraw.d1, lastDraw.d2, lastDraw.d3];
  const jointFreq = {};
  for (let i = 0; i < recent100.length - 1; i++) {
    if (recent100[i].d1 === lastV[0] && recent100[i].d2 === lastV[1] && recent100[i].d3 === lastV[2]) {
      const next = recent100[i + 1];
      const key = `${next.d1}_${next.d2}_${next.d3}`;
      jointFreq[key] = (jointFreq[key] || 0) + 1;
    }
  }

  // 也用前2期的联合条件
  if (upToIdx >= 2) {
    const prev2 = [
      [draws[upToIdx - 1].d1, draws[upToIdx - 1].d2, draws[upToIdx - 1].d3],
      [lastDraw.d1, lastDraw.d2, lastDraw.d3]
    ];
    for (let i = 0; i < recent100.length - 2; i++) {
      const d1 = [recent100[i].d1, recent100[i].d2, recent100[i].d3];
      const d2 = [recent100[i + 1].d1, recent100[i + 1].d2, recent100[i + 1].d3];
      if (d1[0] === prev2[0][0] && d1[1] === prev2[0][1] && d1[2] === prev2[0][2] &&
          d2[0] === prev2[1][0] && d2[1] === prev2[1][1] && d2[2] === prev2[1][2]) {
        const next = recent100[i + 2];
        const key = `${next.d1}_${next.d2}_${next.d3}`;
        jointFreq[key] = (jointFreq[key] || 0) + 2;
      }
    }
  }

  // 综合评分
  const candidates = [];
  for (const d1 of topPerPos[0]) {
    for (const d2 of topPerPos[1]) {
      for (const d3 of topPerPos[2]) {
        const num = `${d1}${d2}${d3}`;
        let score = posScore[0][d1] + posScore[1][d2] + posScore[2][d3];
        
        // 联合条件概率加分
        const jk = `${d1}_${d2}_${d3}`;
        score += (jointFreq[jk] || 0) * 30;
        
        // 类型
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

// ========== 方向VI: 趋势动量+均值回归混合 ==========
function algoMomentumReversion(draws, upToIdx, targetCount = 700) {
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const recent20 = draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1);
  const recent10 = draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1);
  const recent5 = draws.slice(Math.max(0, upToIdx - 4), upToIdx + 1);
  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];

  const posScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
  
  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];

    // 动量分：近期出现频率越高越好
    const momentum = new Array(10).fill(0);
    recent5.forEach(d => { momentum[d[key]] += 10; });
    recent10.forEach(d => { momentum[d[key]] += 6; });
    recent20.forEach(d => { momentum[d[key]] += 3; });
    
    // 均值回归分：遗漏越大越好
    const reversion = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      reversion[d] = Math.max(0, miss - 5) * 3; // 遗漏>5才开始回归
    }

    // 自适应混合：如果某位近期集中度高→用动量；如果分散→用回归
    const maxMom = Math.max(...momentum, 1);
    const momConcentration = momentum.reduce((a, b) => a + (b / maxMom) ** 2, 0) / 10;
    
    const momWeight = momConcentration > 0.15 ? 0.7 : 0.4;
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
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans[d] / maxT) * 60;

    // 二阶
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

  // 每位top9
  const topPerPos = posScore.map(scores => {
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

console.log(`\n从 ${draws[actualStart].issue} 期开始验证\n`);

const rI = verifyAlgorithm(algoConditionalCombo, draws, actualStart, 'I: 条件组合约束');
const rII = verifyAlgorithm(algoDynamicWindow, draws, actualStart, 'II: 动态窗口自适应');
const rIII = verifyAlgorithm(algoFreqDeviation, draws, actualStart, 'III: 频率偏差放大');
const rIV = verifyAlgorithm(algoSuperEnsemble, draws, actualStart, 'IV: 超级集成投票');
const rV = verifyAlgorithm(algoJointRerank, draws, actualStart, 'V: 联合条件重排');
const rVI = verifyAlgorithm(algoMomentumReversion, draws, actualStart, 'VI: 动量+均值回归混合');

console.log('\n\n=== 所有方向总结 ===');
console.log(`I:   ${rI.rate}% (连续未中: ${rI.maxConsecMiss})`);
console.log(`II:  ${rII.rate}% (连续未中: ${rII.maxConsecMiss})`);
console.log(`III: ${rIII.rate}% (连续未中: ${rIII.maxConsecMiss})`);
console.log(`IV:  ${rIV.rate}% (连续未中: ${rIV.maxConsecMiss})`);
console.log(`V:   ${rV.rate}% (连续未中: ${rV.maxConsecMiss})`);
console.log(`VI:  ${rVI.rate}% (连续未中: ${rVI.maxConsecMiss})`);
console.log(`\n之前最佳(C): 76.13% (连续未中: 4)`);
console.log(`理论随机基准: 70.00%`);
