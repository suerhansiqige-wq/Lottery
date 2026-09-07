// 用新VI算法重新生成smartNumbersData.json
// 每期用该期之前的所有数据生成700注，验证该期开奖号是否命中
const fs = require('fs');
const path = require('path');

// 读取开奖数据
const dataFile = path.join(__dirname, 'lottery-app', 'src', 'data', 'lotteryData.js');
let dataStr = fs.readFileSync(dataFile, 'utf-8');
const m = dataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = m[1].split('\n').filter(l => l.trim().startsWith('{'));
const allDraws = lines.map(line => {
  const mm = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (mm) return { issue: mm[1], d1: Number(mm[2]), d2: Number(mm[3]), d3: Number(mm[4]) };
  return null;
}).filter(Boolean);

console.log(`总数据: ${allDraws.length}期 (${allDraws[0].issue} - ${allDraws[allDraws.length-1].issue})`);

// ========== 算法（与smartNumbers.js一致） ==========
function getType(num) {
  const d = num.split('').map(Number);
  if (d[0] === d[1] && d[1] === d[2]) return '豹子';
  if (d[0] === d[1] || d[0] === d[2] || d[1] === d[2]) return '组三';
  return '组六';
}

function scorePositions(draws, upToIdx) {
  const keys = ['d1', 'd2', 'd3'];
  const lastDraw = draws[upToIdx];
  const recent100 = draws.slice(Math.max(0, upToIdx - 99), upToIdx + 1);
  const recent50 = draws.slice(Math.max(0, upToIdx - 49), upToIdx + 1);
  const posScore = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];

  for (let pos = 0; pos < 3; pos++) {
    const key = keys[pos];
    const lastD = lastDraw[key];

    const momentum = new Array(10).fill(0);
    draws.slice(Math.max(0, upToIdx - 4), upToIdx + 1).forEach(d => { momentum[d[key]] += 15; });
    draws.slice(Math.max(0, upToIdx - 9), upToIdx + 1).forEach(d => { momentum[d[key]] += 8; });
    draws.slice(Math.max(0, upToIdx - 19), upToIdx + 1).forEach(d => { momentum[d[key]] += 4; });

    const reversion = new Array(10).fill(0);
    for (let d = 0; d <= 9; d++) {
      let miss = 0;
      for (let i = recent100.length - 1; i >= 0; i--) {
        if (recent100[i][key] === d) break;
        miss++;
      }
      reversion[d] = Math.max(0, miss - 5) * 3;
    }

    const maxMom = Math.max(...momentum, 1);
    const momConcentration = momentum.reduce((a, b) => a + (b / maxMom) ** 2, 0) / 10;
    const momWeight = momConcentration > 0.15 ? 0.7 : 0.4;
    const revWeight = 1 - momWeight;

    for (let d = 0; d <= 9; d++) {
      posScore[pos][d] += (momentum[d] / maxMom) * 80 * momWeight;
      posScore[pos][d] += reversion[d] * revWeight;
    }

    const trans = new Array(10).fill(0);
    for (let i = 0; i < recent100.length - 1; i++) {
      if (recent100[i][key] === lastD) trans[recent100[i + 1][key]]++;
    }
    const maxT = Math.max(...trans, 1);
    for (let d = 0; d <= 9; d++) posScore[pos][d] += (trans[d] / maxT) * 80;

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

function generateSmartNumbers(draws, targetCount = 700) {
  if (!draws || draws.length < 100) return null;
  const upToIdx = draws.length - 1;
  const posScore = scorePositions(draws, upToIdx);

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
        if (type === '豹子') score *= 0.01;
        else if (type === '组三') score *= 0.55;
        candidates.push({ num, score });
      }
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  const topNums = candidates.slice(0, targetCount).map(c => c.num).sort();

  const zulu = topNums.filter(n => getType(n) === '组六');
  const zusan = topNums.filter(n => getType(n) === '组三');
  const lastIssue = draws[draws.length - 1].issue;
  const nextIssue = String(Number(lastIssue) + 1);

  return { numbers: topNums, zulu, zusan, nextIssue, totalCount: topNums.length, zuluCount: zulu.length, zusanCount: zusan.length };
}

// ========== 生成预计算数据 ==========
const result = {};
let hitCount = 0, totalCount = 0;

// 从25001期开始（需要前100期作为历史窗口，但25001是第一期数据）
// 对于25001期，前面没有100期数据，所以跳过（用fallback动态生成）
// 实际从有足够的历史数据的期号开始预计算
const START_PRECOMPUTE = '25001';
const startIdx = allDraws.findIndex(d => d.issue >= START_PRECOMPUTE);

for (let i = startIdx; i < allDraws.length; i++) {
  const currentDraw = allDraws[i];
  // 用该期之前的所有数据生成推荐
  const drawsBefore = allDraws.slice(0, i);
  
  if (drawsBefore.length < 100) {
    // 历史数据不足100期，跳过预计算（前端会动态生成）
    continue;
  }

  const smartResult = generateSmartNumbers(drawsBefore, 700);
  if (!smartResult) continue;

  // 验证该期开奖号是否在推荐号码中
  const actualNum = `${currentDraw.d1}${currentDraw.d2}${currentDraw.d3}`;
  const hit = smartResult.numbers.includes(actualNum);
  if (hit) hitCount++;
  totalCount++;

  result[currentDraw.issue] = {
    numbers: smartResult.numbers,
    zulu: smartResult.zulu,
    zusan: smartResult.zusan,
    count: smartResult.totalCount,
    zuluCount: smartResult.zuluCount,
    zusanCount: smartResult.zusanCount,
    hit: hit,
    nextNum: actualNum,
  };

  if (totalCount % 50 === 0) {
    console.log(`已处理 ${totalCount} 期, 当前: ${currentDraw.issue}, 命中率: ${(hitCount/totalCount*100).toFixed(1)}%`);
  }
}

// 保存
const outputPath = path.join(__dirname, 'lottery-app', 'src', 'data', 'smartNumbersData.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 0));

console.log(`\n完成! 预计算 ${totalCount} 期`);
console.log(`总命中: ${hitCount}/${totalCount} = ${(hitCount/totalCount*100).toFixed(2)}%`);
console.log(`文件已保存: ${outputPath}`);
console.log(`文件大小: ${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB`);
