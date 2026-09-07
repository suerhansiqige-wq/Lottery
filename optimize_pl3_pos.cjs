// 排列三逐位预测优化 - 目标: 极低注数 + 高命中率
// 思路: 每位预测top-K个数字, 组合成极少注数
const fs = require('fs');
const path = require('path');

const lotteryDataFile = path.join(__dirname, 'pl3-app', 'src', 'data', 'lotteryData.js');
let lotteryDataStr = fs.readFileSync(lotteryDataFile, 'utf-8');
const m = lotteryDataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = m[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws = lines.map(line => {
  const mm = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (mm) return { issue: mm[1], d1: Number(mm[2]), d2: Number(mm[3]), d3: Number(mm[4]) };
  return null;
}).filter(Boolean);

console.log(`排列三数据: ${draws.length}期 (${draws[0].issue} - ${draws[draws.length-1].issue})`);

// ========== 逐位预测策略 ==========
// 每个策略输出: 每个位置(百十个)的0-9数字排名(从高到低)

// P0: 位置频率(近100期)
function p0_posFreq(draws, idx) {
  const r100 = draws.slice(Math.max(0,idx-99), idx+1);
  const freq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d => { freq[0][d.d1]++; freq[1][d.d2]++; freq[2][d.d3]++; });
  return [0,1,2].map(pos => {
    return [...Array(10).keys()].sort((a,b) => freq[pos][b] - freq[pos][a]);
  });
}

// P1: 近期热号(近20期加权)
function p1_recentHot(draws, idx) {
  const r20 = draws.slice(Math.max(0,idx-19), idx+1);
  const freq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r20.forEach(d => { freq[0][d.d1]++; freq[1][d.d2]++; freq[2][d.d3]++; });
  return [0,1,2].map(pos => {
    return [...Array(10).keys()].sort((a,b) => freq[pos][b] - freq[pos][a]);
  });
}

// P2: 遗漏回补(遗漏越大越可能出)
function p2_missing(draws, idx) {
  const lastApp = [[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]];
  for (let i = idx; i >= Math.max(0, idx-99); i--) {
    const d = draws[i];
    [d.d1,d.d2,d.d3].forEach((v,pos) => { if(lastApp[pos][v]===-1) lastApp[pos][v] = idx-i; });
  }
  return [0,1,2].map(pos => {
    return [...Array(10).keys()].sort((a,b) => {
      const ma = lastApp[pos][a]===-1?100:lastApp[pos][a];
      const mb = lastApp[pos][b]===-1?100:lastApp[pos][b];
      return mb - ma; // 遗漏大的排前面
    });
  });
}

// P3: 温号(遗漏3-20期优先)
function p3_warm(draws, idx) {
  const lastApp = [[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]];
  for (let i = idx; i >= Math.max(0, idx-199); i--) {
    const d = draws[i];
    [d.d1,d.d2,d.d3].forEach((v,pos) => { if(lastApp[pos][v]===-1) lastApp[pos][v] = idx-i; });
  }
  return [0,1,2].map(pos => {
    return [...Array(10).keys()].sort((a,b) => {
      const ma = lastApp[pos][a]===-1?200:lastApp[pos][a];
      const mb = lastApp[pos][b]===-1?200:lastApp[pos][b];
      const sa = (ma>=3&&ma<=20)?60:(ma>=1&&ma<=2)?45:(ma>=21&&ma<=50)?35:(ma===0)?20:10;
      const sb = (mb>=3&&mb<=20)?60:(mb>=1&&mb<=2)?45:(mb>=21&&mb<=50)?35:(mb===0)?20:10;
      return sb - sa;
    });
  });
}

// P4: 动量(近5期趋势)
function p4_momentum(draws, idx) {
  const r5 = draws.slice(Math.max(0,idx-4), idx+1);
  const freq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r5.forEach(d => { freq[0][d.d1]++; freq[1][d.d2]++; freq[2][d.d3]++; });
  // 出现过的数字优先
  return [0,1,2].map(pos => {
    return [...Array(10).keys()].sort((a,b) => freq[pos][b] - freq[pos][a]);
  });
}

// P5: 频率融合(100期×2 + 20期×5)
function p5_freqBlend(draws, idx) {
  const r100 = draws.slice(Math.max(0,idx-99), idx+1);
  const r20 = draws.slice(Math.max(0,idx-19), idx+1);
  const f100 = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  const f20 = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d => { f100[0][d.d1]++; f100[1][d.d2]++; f100[2][d.d3]++; });
  r20.forEach(d => { f20[0][d.d1]++; f20[1][d.d2]++; f20[2][d.d3]++; });
  return [0,1,2].map(pos => {
    return [...Array(10).keys()].sort((a,b) => (f100[pos][b]*2+f20[pos][b]*5) - (f100[pos][a]*2+f20[pos][a]*5));
  });
}

// P6: 转移概率(上一期该位置出X→这期出什么的概率)
function p6_transition(draws, idx) {
  const r100 = draws.slice(Math.max(0,idx-99), idx+1);
  // trans[pos][lastDigit][thisDigit] = count
  const trans = [0,1,2].map(() => Array.from({length:10}, ()=>new Array(10).fill(0)));
  for (let i = 1; i < r100.length; i++) {
    const prev = r100[i-1], curr = r100[i];
    [0,1,2].forEach(pos => {
      const pv = [prev.d1,prev.d2,prev.d3][pos];
      const cv = [curr.d1,curr.d2,curr.d3][pos];
      trans[pos][pv][cv]++;
    });
  }
  const lastDraw = r100[r100.length-1];
  const lastDigits = [lastDraw.d1, lastDraw.d2, lastDraw.d3];
  return [0,1,2].map(pos => {
    const probs = [...Array(10).keys()].map(d => trans[pos][lastDigits[pos]][d]);
    return [...Array(10).keys()].sort((a,b) => probs[b] - probs[a]);
  });
}

// P7: 奇偶+大小趋势
function p7_paritySize(draws, idx) {
  const r30 = draws.slice(Math.max(0,idx-29), idx+1);
  // 每位: 奇数频率和 大数(>=5)频率
  const oddFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  const bigFreq = [[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r30.forEach(d => {
    [d.d1,d.d2,d.d3].forEach((v,pos) => {
      if(v%2===1) oddFreq[pos][v]++;
      if(v>=5) bigFreq[pos][v]++;
    });
  });
  // 判断该位下期倾向奇/偶、大/小
  return [0,1,2].map(pos => {
    const oddTotal = oddFreq[pos].reduce((a,b)=>a+b,0);
    const evenTotal = r30.length - oddTotal;
    const bigTotal = bigFreq[pos].reduce((a,b)=>a+b,0);
    const smallTotal = r30.length - bigTotal;
    const preferOdd = oddTotal >= evenTotal;
    const preferBig = bigTotal >= smallTotal;
    return [...Array(10).keys()].sort((a,b) => {
      const sa = (a%2===1?preferOdd:!preferOdd?1:0)*10 + (a>=5?preferBig:!preferBig?1:0)*5;
      const sb = (b%2===1?preferOdd:!preferOdd?1:0)*10 + (b>=5?preferBig:!preferBig?1:0)*5;
      return sb - sa;
    });
  });
}

// P8: 综合评分(频率+遗漏+动量)
function p8_composite(draws, idx) {
  const r100 = draws.slice(Math.max(0,idx-99), idx+1);
  const r20 = draws.slice(Math.max(0,idx-19), idx+1);
  const r5 = draws.slice(Math.max(0,idx-4), idx+1);
  
  return [0,1,2].map(pos => {
    const scores = new Array(10).fill(0);
    // 100期频率
    const f100 = new Array(10).fill(0);
    r100.forEach(d => f100[[d.d1,d.d2,d.d3][pos]]++);
    // 20期频率
    const f20 = new Array(10).fill(0);
    r20.forEach(d => f20[[d.d1,d.d2,d.d3][pos]]++);
    // 5期频率
    const f5 = new Array(10).fill(0);
    r5.forEach(d => f5[[d.d1,d.d2,d.d3][pos]]++);
    // 遗漏
    const lastApp = new Array(10).fill(-1);
    for (let i = idx; i >= Math.max(0, idx-99); i--) {
      const v = [draws[i].d1,draws[i].d2,draws[i].d3][pos];
      if (lastApp[v]===-1) lastApp[v] = idx-i;
    }
    
    for (let d = 0; d < 10; d++) {
      const miss = lastApp[d]===-1?100:lastApp[d];
      const missScore = (miss>=3&&miss<=15)?50:(miss>=1&&miss<=2)?40:(miss>=16&&miss<=30)?30:(miss===0)?15:10;
      scores[d] = f100[d]*2 + f20[d]*5 + f5[d]*10 + missScore;
    }
    return [...Array(10).keys()].sort((a,b) => scores[b] - scores[a]);
  });
}

// P9: 二次转移(2期前的转移)
function p9_trans2(draws, idx) {
  const r100 = draws.slice(Math.max(0,idx-99), idx+1);
  const trans = [0,1,2].map(() => Array.from({length:10}, ()=>new Array(10).fill(0)));
  for (let i = 2; i < r100.length; i++) {
    const prev2 = r100[i-2], curr = r100[i];
    [0,1,2].forEach(pos => {
      const pv = [prev2.d1,prev2.d2,prev2.d3][pos];
      const cv = [curr.d1,curr.d2,curr.d3][pos];
      trans[pos][pv][cv]++;
    });
  }
  const lastDraw = r100[r100.length-1];
  const lastDigits = [lastDraw.d1, lastDraw.d2, lastDraw.d3];
  return [0,1,2].map(pos => {
    const probs = [...Array(10).keys()].map(d => trans[pos][lastDigits[pos]][d]);
    return [...Array(10).keys()].sort((a,b) => probs[b] - probs[a]);
  });
}

const allPosStrategies = [p0_posFreq, p1_recentHot, p2_missing, p3_warm, p4_momentum, 
                         p5_freqBlend, p6_transition, p7_paritySize, p8_composite, p9_trans2];
const posStratNames = ['posFreq','recentHot','missing','warm','momentum','freqBlend','transition','paritySize','composite','trans2'];

// ========== 预计算 ==========
console.log('\n预计算10个逐位策略排名...');
const startIdx = 100;
const endIdx = draws.length - 1;
const totalPeriods = endIdx - startIdx + 1;

// posRank[stratIdx][periodOffset][pos] = Int16Array(10) 每个数字的排名
const posRank = [];
for (let s = 0; s < 10; s++) posRank.push([]);

for (let idx = startIdx; idx <= endIdx; idx++) {
  const historyIdx = idx - 1;
  const history = draws.slice(0, idx);
  for (let s = 0; s < 10; s++) {
    const ranked = allPosStrategies[s](history, historyIdx);
    const rankArr = [0,1,2].map(pos => {
      const arr = new Int16Array(10);
      ranked[pos].forEach((digit, rank) => { arr[digit] = rank; });
      return arr;
    });
    posRank[s].push(rankArr);
  }
  if ((idx - startIdx) % 100 === 0) process.stdout.write(`\r  预计算 ${idx-startIdx+1}/${totalPeriods} 期...`);
}
console.log('\r  预计算完成!                    ');

// 实际开奖号
const actualDigits = [];
for (let idx = startIdx; idx <= endIdx; idx++) {
  actualDigits.push([draws[idx].d1, draws[idx].d2, draws[idx].d3]);
}

// ========== 评估: 逐位投票法 ==========
function evalPosConfig(stratIndices, weights, topKs) {
  // topKs = [k0, k1, k2] 每位取前几个数字
  const nPeriods = actualDigits.length;
  const nStrats = stratIndices.length;
  let hits = 0;
  
  for (let pi = 0; pi < nPeriods; pi++) {
    // 每位独立投票
    const posDigits = [new Set(), new Set(), new Set()]; // 每位选中的数字
    
    for (let pos = 0; pos < 3; pos++) {
      const digitVotes = new Array(10).fill(0);
      for (let si = 0; si < nStrats; si++) {
        const ranks = posRank[stratIndices[si]][pi][pos];
        const w = weights[si];
        const k = topKs[si] !== undefined ? topKs[si] : topKs[0];
        for (let d = 0; d < 10; d++) {
          if (ranks[d] < k) digitVotes[d] += w;
        }
      }
      // 取投票最高的数字(阈值: 至少获得总权重的50%)
      const maxVote = weights.reduce((a,b)=>a+b,0);
      const threshold = Math.ceil(maxVote * 0.5);
      for (let d = 0; d < 10; d++) {
        if (digitVotes[d] >= threshold) posDigits[pos].add(d);
      }
      // 如果选太多, 只保留投票最高的前几个
      if (posDigits[pos].size > 6) {
        const sorted = [...posDigits[pos]].sort((a,b) => digitVotes[b] - digitVotes[a]);
        posDigits[pos] = new Set(sorted.slice(0, 5));
      }
    }
    
    // 生成所有组合
    const d0 = [...posDigits[0]], d1 = [...posDigits[1]], d2 = [...posDigits[2]];
    const totalCombinations = d0.length * d1.length * d2.length;
    
    // 检查实际开奖号是否在组合中
    const [a0, a1, a2] = actualDigits[pi];
    if (posDigits[0].has(a0) && posDigits[1].has(a1) && posDigits[2].has(a2)) {
      hits++;
    }
  }
  
  // 计算平均注数
  let totalCombos = 0;
  for (let pi = 0; pi < nPeriods; pi++) {
    const posDigits = [new Set(), new Set(), new Set()];
    for (let pos = 0; pos < 3; pos++) {
      const digitVotes = new Array(10).fill(0);
      for (let si = 0; si < nStrats; si++) {
        const ranks = posRank[stratIndices[si]][pi][pos];
        const w = weights[si];
        const k = topKs[si] !== undefined ? topKs[si] : topKs[0];
        for (let d = 0; d < 10; d++) {
          if (ranks[d] < k) digitVotes[d] += w;
        }
      }
      const maxVote = weights.reduce((a,b)=>a+b,0);
      const threshold = Math.ceil(maxVote * 0.5);
      for (let d = 0; d < 10; d++) {
        if (digitVotes[d] >= threshold) posDigits[pos].add(d);
      }
      if (posDigits[pos].size > 6) {
        const sorted = [...posDigits[pos]].sort((a,b) => digitVotes[b] - digitVotes[a]);
        posDigits[pos] = new Set(sorted.slice(0, 5));
      }
    }
    totalCombos += posDigits[0].size * posDigits[1].size * posDigits[2].size;
  }
  
  const avgCombos = totalCombos / nPeriods;
  return { rate: hits / nPeriods, avgCombos, hits };
}

// 简化版: 固定每位取K个数字
function evalFixedK(stratIndices, weights, kPerStrat) {
  // kPerStrat: 每个策略的topK (可以不同)
  const nPeriods = actualDigits.length;
  const nStrats = stratIndices.length;
  let hits = 0;
  let totalCombos = 0;
  
  for (let pi = 0; pi < nPeriods; pi++) {
    const posVotes = [new Array(10).fill(0), new Array(10).fill(0), new Array(10).fill(0)];
    
    for (let si = 0; si < nStrats; si++) {
      const k = kPerStrat[si];
      const w = weights[si];
      for (let pos = 0; pos < 3; pos++) {
        const ranks = posRank[stratIndices[si]][pi][pos];
        for (let d = 0; d < 10; d++) {
          if (ranks[d] < k) posVotes[pos][d] += w;
        }
      }
    }
    
    // 每位: 取投票>0的数字
    const posDigits = [0,1,2].map(pos => {
      return [...Array(10).keys()].filter(d => posVotes[pos][d] > 0);
    });
    
    // 限制每位最多5个(按投票数排序)
    const maxVote = weights.reduce((a,b)=>a+b,0);
    const posDigitsLimited = posDigits.map((digits, pos) => {
      if (digits.length <= 5) return digits;
      return digits.sort((a,b) => posVotes[pos][b] - posVotes[pos][a]).slice(0, 5);
    });
    
    totalCombos += posDigitsLimited[0].length * posDigitsLimited[1].length * posDigitsLimited[2].length;
    
    const [a0, a1, a2] = actualDigits[pi];
    if (posDigitsLimited[0].includes(a0) && posDigitsLimited[1].includes(a1) && posDigitsLimited[2].includes(a2)) {
      hits++;
    }
  }
  
  return { rate: hits / nPeriods, avgCombos: totalCombos / nPeriods, hits };
}

// ========== 搜索 ==========
console.log('\n开始搜索逐位预测最优配置...');
const startTime = Date.now();

// 策略组合(2-4个策略)
const combos = [];
for(let i=0;i<10;i++) for(let j=i+1;j<10;j++) combos.push([i,j]);
// 3策略重点组合
const c3 = [[0,1,5],[0,1,6],[0,1,8],[0,5,6],[0,5,8],[0,6,8],[1,5,6],[1,6,8],[5,6,8],[0,1,2],[0,1,3],[0,1,4],[0,2,6],[0,3,6],[1,2,6],[5,6,9],[0,6,9],[1,6,9],[6,8,9],[0,1,9]];
combos.push(...c3);
// 4策略
const c4 = [[0,1,5,6],[0,1,6,8],[0,1,5,8],[0,5,6,8],[0,1,2,6],[0,1,3,6],[0,1,6,9],[0,5,6,9],[1,5,6,8],[0,1,5,6,8]];
combos.push(...c4);

const weightPatterns = {
  2: [[1,1],[2,1],[1,2],[3,1],[2,2]],
  3: [[1,1,1],[2,1,1],[2,2,1],[3,2,1],[3,1,1]],
  4: [[1,1,1,1],[2,1,1,1],[2,2,1,1],[3,2,1,1]],
};

// 每个策略的topK: 2-6
const kValues = [2, 3, 4, 5, 6];

let bestConfig = null;
let bestRate = 0;
const topConfigs = [];
let totalConfigs = 0;

for (const combo of combos) {
  const size = combo.length;
  const wps = weightPatterns[size] || [[1,1]];
  
  for (const weights of wps) {
    // 每个策略一个K值
    if (size === 1) {
      for (const k of kValues) {
        totalConfigs++;
        const result = evalFixedK(combo, weights, [k]);
        if (result.rate > bestRate) {
          bestRate = result.rate;
          bestConfig = { combo: combo.map(i=>posStratNames[i]), weights: [...weights], kPerStrat: [k], ...result };
        }
        if (result.rate >= 0.50 && result.avgCombos <= 500) {
          topConfigs.push({ combo: combo.map(i=>posStratNames[i]), comboIdx: combo.join(','), weights: [...weights], kPerStrat: [k], ...result });
        }
      }
    } else if (size === 2) {
      for (const k1 of kValues) {
        for (const k2 of kValues) {
          totalConfigs++;
          const result = evalFixedK(combo, weights, [k1, k2]);
          if (result.rate > bestRate) {
            bestRate = result.rate;
            bestConfig = { combo: combo.map(i=>posStratNames[i]), weights: [...weights], kPerStrat: [k1,k2], ...result };
          }
          if (result.rate >= 0.50 && result.avgCombos <= 500) {
            topConfigs.push({ combo: combo.map(i=>posStratNames[i]), comboIdx: combo.join(','), weights: [...weights], kPerStrat: [k1,k2], ...result });
          }
        }
      }
    } else {
      // 3+策略: 简化搜索, 所有策略用相同K
      for (const k of kValues) {
        totalConfigs++;
        const ks = new Array(size).fill(k);
        const result = evalFixedK(combo, weights, ks);
        if (result.rate > bestRate) {
          bestRate = result.rate;
          bestConfig = { combo: combo.map(i=>posStratNames[i]), weights: [...weights], kPerStrat: ks, ...result };
        }
        if (result.rate >= 0.50 && result.avgCombos <= 500) {
          topConfigs.push({ combo: combo.map(i=>posStratNames[i]), comboIdx: combo.join(','), weights: [...weights], kPerStrat: ks, ...result });
        }
      }
      // 也测试几个关键的不同K组合
      const kCombos = [[3,3,2],[3,2,3],[2,3,3],[4,3,2],[3,4,2],[4,4,3],[5,3,2],[3,5,2],[4,3,3],[3,4,3],[5,4,3],[4,5,3],[5,5,3],[3,3,4],[4,3,4],[3,4,4],[5,4,2],[4,5,2],[5,3,3],[3,5,3]];
      if (size === 3) {
        for (const ks of kCombos) {
          totalConfigs++;
          const result = evalFixedK(combo, weights, ks);
          if (result.rate > bestRate) {
            bestRate = result.rate;
            bestConfig = { combo: combo.map(i=>posStratNames[i]), weights: [...weights], kPerStrat: ks, ...result };
          }
          if (result.rate >= 0.50 && result.avgCombos <= 500) {
            topConfigs.push({ combo: combo.map(i=>posStratNames[i]), comboIdx: combo.join(','), weights: [...weights], kPerStrat: ks, ...result });
          }
        }
      }
    }
  }
  
  if ((combos.indexOf(combo)+1) % 30 === 0) {
    const elapsed = (Date.now() - startTime) / 1000;
    process.stdout.write(`\r  进度: ${combos.indexOf(combo)+1}/${combos.length}, 最佳: ${(bestRate*100).toFixed(1)}%, ${bestConfig?bestConfig.avgCombos.toFixed(0)+'注':'-'}, 耗时: ${elapsed.toFixed(0)}s`);
  }
}

const elapsed = (Date.now() - startTime) / 1000;
console.log(`\n\n搜索完成! 总配置: ${totalConfigs}, 耗时: ${elapsed.toFixed(1)}s`);

// ========== 输出结果 ==========
console.log('\n========================================');
console.log('排列三逐位预测优化结果');
console.log('========================================');
console.log(`\n最佳配置: 命中率 ${(bestRate*100).toFixed(1)}%, 平均${bestConfig.avgCombos.toFixed(0)}注`);
console.log(`  策略: ${bestConfig.combo.join(' + ')}`);
console.log(`  权重: [${bestConfig.weights.join(', ')}]`);
console.log(`  每位TopK: [${bestConfig.kPerStrat.join(', ')}]`);

// 按注数区间分组
console.log('\n=== 各注数区间最佳配置 ===');
const ranges = [[0,50],[50,100],[100,150],[150,200],[200,300],[300,500],[500,800]];
for (const [lo, hi] of ranges) {
  const inRange = topConfigs.filter(c => c.avgCombos >= lo && c.avgCombos < hi);
  if (inRange.length > 0) {
    inRange.sort((a,b) => b.rate - a.rate);
    const best = inRange[0];
    console.log(`  ${lo}-${hi}注: ${(best.rate*100).toFixed(1)}% (${best.avgCombos.toFixed(0)}注) | ${best.combo.join('+')} | [${best.weights.join(',')}] | K:[${best.kPerStrat.join(',')}]`);
  }
}

// TOP30 (按 命中率/注数 效率排序)
topConfigs.sort((a, b) => {
  // 综合评分: 命中率 × (1 / log(注数))
  const scoreA = a.rate / Math.log(a.avgCombos + 1);
  const scoreB = b.rate / Math.log(b.avgCombos + 1);
  return scoreB - scoreA;
});

const unique = [];
const seen = new Set();
for (const c of topConfigs) {
  const key = `${c.comboIdx}|${c.weights.join(',')}|${c.kPerStrat.join(',')}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(c);
  if (unique.length >= 30) break;
}

console.log('\n=== TOP30配置 (效率排名) ===');
unique.forEach((c, i) => {
  console.log(`  ${i+1}. ${(c.rate*100).toFixed(1)}% / ${c.avgCombos.toFixed(0)}注 | ${c.combo.join('+')} | [${c.weights.join(',')}] | K:[${c.kPerStrat.join(',')}]`);
});

// 纯命中率TOP10
topConfigs.sort((a, b) => b.rate - a.rate);
console.log('\n=== 纯命中率TOP10 ===');
const seen2 = new Set();
let count = 0;
for (const c of topConfigs) {
  const key = `${c.comboIdx}|${c.weights.join(',')}|${c.kPerStrat.join(',')}`;
  if (seen2.has(key)) continue;
  seen2.add(key);
  console.log(`  ${count+1}. ${(c.rate*100).toFixed(1)}% / ${c.avgCombos.toFixed(0)}注 | ${c.combo.join('+')} | [${c.weights.join(',')}] | K:[${c.kPerStrat.join(',')}]`);
  count++;
  if (count >= 10) break;
}

// 低注数TOP10 (注数<=200中命中率最高)
const lowCount = topConfigs.filter(c => c.avgCombos <= 200);
lowCount.sort((a, b) => b.rate - a.rate);
console.log('\n=== 低注数(<=200)TOP10 ===');
const seen3 = new Set();
count = 0;
for (const c of lowCount) {
  const key = `${c.comboIdx}|${c.weights.join(',')}|${c.kPerStrat.join(',')}`;
  if (seen3.has(key)) continue;
  seen3.add(key);
  console.log(`  ${count+1}. ${(c.rate*100).toFixed(1)}% / ${c.avgCombos.toFixed(0)}注 | ${c.combo.join('+')} | [${c.weights.join(',')}] | K:[${c.kPerStrat.join(',')}]`);
  count++;
  if (count >= 10) break;
}
