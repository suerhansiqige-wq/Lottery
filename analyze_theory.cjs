// 理论上限分析：每位预测准确率 vs 整体命中率的关系
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

// 分析：每位选N个数字时的理论命中率
console.log('=== 每位选号数 vs 理论命中率 ===');
console.log('如果每位独立选N个数字（共N³注），且每位准确率p:');
console.log('');

// 先验证：每位top-N的命中率
const START_ISSUE = '25001';
const startIdx = draws.findIndex(d => d.issue >= START_ISSUE);
const warmup = 100;
const actualStart = Math.max(startIdx, warmup);

// 简化的位置评分
function scorePerPosition(draws, upToIdx) {
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

    // 频率
    const freq = new Array(10).fill(0);
    recent10.forEach(d => { freq[d[key]] += 15; });
    recent20.forEach(d => { freq[d[key]] += 8; });
    recent50.forEach(d => { freq[d[key]] += 3; });
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
  return posScore;
}

// 验证每位top-N的命中率
console.log('=== 每位Top-N命中率（独立统计） ===');
for (const topN of [7, 8, 9, 10]) {
  let posHits = [0, 0, 0];
  let total = 0;

  for (let idx = actualStart; idx < draws.length; idx++) {
    const posScore = scorePerPosition(draws, idx - 1);
    const topDigits = posScore.map(scores => {
      return scores.map((s, d) => ({ digit: d, score: s }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map(x => x.digit);
    });

    for (let pos = 0; pos < 3; pos++) {
      const key = ['d1', 'd2', 'd3'][pos];
      if (topDigits[pos].includes(draws[idx][key])) posHits[pos]++;
    }
    total++;
  }

  const posRates = posHits.map(h => (h / total * 100).toFixed(1));
  const allPosRate = (posHits[0] / total * posHits[1] / total * posHits[2] / total * 100).toFixed(1);
  console.log(`Top-${topN}: 百位${posRates[0]}% 十位${posRates[1]}% 个位${posRates[2]}% | 三位全中≈${allPosRate}% | 组合数=${topN}³=${topN**3}`);
}

// 分析：要达到85%整体命中率，每位需要多少准确率
console.log('\n=== 达到85%整体命中率的每位准确率需求 ===');
console.log('如果选9×9×9=729注，每位选9个:');
console.log('  需要每位准确率 ≥ ' + (Math.pow(0.85, 1/3) * 100 / 9 * 10).toFixed(1) + ' (约94.3%×10/9)');
console.log('  即每位top-9中必须包含正确答案的概率 ≥ 94.3%');
console.log('');
console.log('如果选8×9×10=720注:');
console.log('  百位8个准确率 × 十位9个准确率 × 个位10个准确率 ≥ 85%');

// 实际每位top-N的真实命中率
console.log('\n=== 每位Top-N命中（包含正确答案）的详细统计 ===');
for (const topN of [8, 9, 10]) {
  let posHits = [0, 0, 0];
  let total = 0;
  let posConsecMiss = [[0,0,0],[0,0,0],[0,0,0]]; // 每位连续未中
  let posMaxConsecMiss = [0, 0, 0];
  let posCurConsecMiss = [0, 0, 0];

  for (let idx = actualStart; idx < draws.length; idx++) {
    const posScore = scorePerPosition(draws, idx - 1);
    const topDigits = posScore.map(scores => {
      return scores.map((s, d) => ({ digit: d, score: s }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map(x => x.digit);
    });

    for (let pos = 0; pos < 3; pos++) {
      const key = ['d1', 'd2', 'd3'][pos];
      const hit = topDigits[pos].includes(draws[idx][key]);
      if (hit) {
        posHits[pos]++;
        posCurConsecMiss[pos] = 0;
      } else {
        posCurConsecMiss[pos]++;
        posMaxConsecMiss[pos] = Math.max(posMaxConsecMiss[pos], posCurConsecMiss[pos]);
      }
    }
    total++;
  }

  const posRates = posHits.map(h => (h / total * 100).toFixed(1));
  console.log(`Top-${topN}: 百位${posRates[0]}%(最大连续miss:${posMaxConsecMiss[0]}) 十位${posRates[1]}%(最大连续miss:${posMaxConsecMiss[1]}) 个位${posRates[2]}%(最大连续miss:${posMaxConsecMiss[2]})`);
}

// 理论分析
console.log('\n=== 理论极限分析 ===');
console.log('福彩3D每期开一个000-999的三位数');
console.log('选700注 → 理论随机命中率 = 70%');
console.log('');
console.log('要达到85%命中率，需要算法比随机好 15个百分点');
console.log('这意味着需要非常强的统计信号');
console.log('');
console.log('实际数据特征:');
console.log('  总期数: ' + draws.length);
console.log('  每个三位数平均出现次数: ' + (draws.length / 1000).toFixed(2));
console.log('  每位每个数字平均出现次数: ' + (draws.length / 10).toFixed(1));
console.log('');
console.log('结论: 如果开奖是完全随机的，85%不可达');
console.log('但如果存在微弱的非随机模式，可能提升到75-78%');
