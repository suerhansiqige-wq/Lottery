// 杀百位5码 - 全方案极限测试
import { lotteryData as ld1 } from '../src/data/lotteryData.js';
import { lotteryData as ld2 } from '../src/data/excelData.js';

const allData = [...ld2, ...ld1];
const dataMap = new Map();
allData.forEach(d => dataMap.set(d.issue, d));
const data = [...dataMap.values()].sort((a, b) => a.issue.localeCompare(b.issue));
const N = data.length;
console.log(`数据量: ${N}期 (${data[0].issue}~${data[N-1].issue})`);

const START = 200; // 预热期
const END = N;
const TOTAL = END - START;

// 辅助：杀号验证
function verifyKill(idx, killDigits) {
  if (!killDigits || killDigits.length !== 5) return null;
  const actual = data[idx].d1;
  return !killDigits.includes(actual); // true=杀中, false=杀漏
}

// ============================================================
// 方案A: 马尔可夫链 - 基于百位数字转移概率
// ============================================================
function schemeA_Markov() {
  // 构建转移矩阵 P[i][j] = 百位从i转移到j的概率
  const transCount = Array.from({length:10}, () => Array(10).fill(0));
  for (let i = 1; i < START; i++) {
    transCount[data[i-1].d1][data[i].d1]++;
  }
  // 行归一化
  const transProb = transCount.map(row => {
    const sum = row.reduce((a,b) => a+b, 0);
    return sum > 0 ? row.map(v => v/sum) : Array(10).fill(0.1);
  });

  let hits = 0;
  for (let i = START; i < END; i++) {
    const prevBai = data[i-1].d1;
    // 杀转移概率最低的5个数字
    const probs = transProb[prevBai].map((p, d) => ({d, p}));
    probs.sort((a, b) => a.p - b.p);
    const kill = probs.slice(0, 5).map(x => x.d);
    if (verifyKill(i, kill)) hits++;
  }
  return { name: 'A-马尔可夫链', rate: hits/TOTAL*100, hits, total: TOTAL };
}

// ============================================================
// 方案B: 多因子加权评分 - 综合10个维度给每个数字打分
// ============================================================
function schemeB_MultiFactor() {
  let hits = 0;
  for (let i = START; i < END; i++) {
    const scores = Array(10).fill(0);

    // 因子1: 近5期出现频率（出现越多的越可能再出 → 不杀）
    const freq5 = Array(10).fill(0);
    for (let j = 1; j <= 5 && i-j >= 0; j++) freq5[data[i-j].d1]++;
    for (let d = 0; d < 10; d++) scores[d] += freq5[d] * 3;

    // 因子2: 近10期出现频率
    const freq10 = Array(10).fill(0);
    for (let j = 1; j <= 10 && i-j >= 0; j++) freq10[data[i-j].d1]++;
    for (let d = 0; d < 10; d++) scores[d] += freq10[d] * 2;

    // 因子3: 遗漏期数（遗漏越久越可能出 → 不杀）
    const gap = Array(10).fill(999);
    for (let d = 0; d < 10; d++) {
      for (let j = 1; j <= 50 && i-j >= 0; j++) {
        if (data[i-j].d1 === d) { gap[d] = j; break; }
      }
    }
    for (let d = 0; d < 10; d++) scores[d] += Math.min(gap[d], 20) * 1.5;

    // 因子4: 上期百位邻号（邻号更容易出）
    const prevBai = data[i-1].d1;
    scores[(prevBai+1)%10] += 4;
    scores[(prevBai+9)%10] += 4;
    scores[(prevBai+2)%10] += 2;
    scores[(prevBai+8)%10] += 2;

    // 因子5: 和值尾关联
    const prevSum = data[i-1].d1 + data[i-1].d2 + data[i-1].d3;
    const sumTail = prevSum % 10;
    scores[sumTail] += 3;
    scores[(sumTail+1)%10] += 2;
    scores[(sumTail+9)%10] += 2;

    // 因子6: 跨度关联
    const prevDigits = [data[i-1].d1, data[i-1].d2, data[i-1].d3];
    const prevSpan = Math.max(...prevDigits) - Math.min(...prevDigits);
    scores[prevSpan] += 2;

    // 因子7: 百位±3,±4（远距离数字更可能出）
    scores[(prevBai+3)%10] += 3;
    scores[(prevBai+7)%10] += 3;
    scores[(prevBai+4)%10] += 2;
    scores[(prevBai+6)%10] += 2;

    // 因子8: 近3期百位和值尾
    if (i >= 3) {
      const recent3Sum = (data[i-1].d1 + data[i-2].d1 + data[i-3].d1) % 10;
      scores[recent3Sum] += 2;
    }

    // 因子9: 十位个位组合关联
    const prevShi = data[i-1].d2;
    const prevGe = data[i-1].d3;
    scores[(prevShi + prevGe) % 10] += 2;
    scores[Math.abs(prevShi - prevGe)] += 1;

    // 因子10: 周期性（近30期同位置模5的余数分布）
    const mod5Freq = Array(5).fill(0);
    for (let j = 1; j <= 30 && i-j >= 0; j++) mod5Freq[data[i-j].d1 % 5]++;
    const dominantMod = mod5Freq.indexOf(Math.max(...mod5Freq));
    for (let d = 0; d < 10; d++) {
      if (d % 5 === dominantMod) scores[d] += 1;
    }

    // 杀得分最低的5个数字
    const ranked = scores.map((s, d) => ({d, s}));
    ranked.sort((a, b) => a.s - b.s);
    const kill = ranked.slice(0, 5).map(x => x.d);
    if (verifyKill(i, kill)) hits++;
  }
  return { name: 'B-多因子加权', rate: hits/TOTAL*100, hits, total: TOTAL };
}

// ============================================================
// 方案C: 滑动窗口自适应 - 动态选择最优公式
// ============================================================
function schemeC_Adaptive() {
  // 定义一组基础公式
  const baseFormulas = [
    (i) => { // 百位+1~+5
      const p = data[i-1].d1;
      return [1,2,3,4,5].map(k => (p+k)%10);
    },
    (i) => { // 和值尾+0~+4
      const s = (data[i-1].d1+data[i-1].d2+data[i-1].d3)%10;
      return [0,1,2,3,4].map(k => (s+k)%10);
    },
    (i) => { // 跨度+0~+4
      const d = [data[i-1].d1,data[i-1].d2,data[i-1].d3];
      const sp = Math.max(...d)-Math.min(...d);
      return [0,1,2,3,4].map(k => (sp+k)%10);
    },
    (i) => { // 百位*2+0~+4
      const p = data[i-1].d1;
      return [0,1,2,3,4].map(k => (p*2+k)%10);
    },
    (i) => { // 十位+个位+0~+4
      const s = data[i-1].d2+data[i-1].d3;
      return [0,1,2,3,4].map(k => (s+k)%10);
    },
    (i) => { // 9-百位+0~+4
      const c = 9-data[i-1].d1;
      return [0,1,2,3,4].map(k => (c+k)%10);
    },
    (i) => { // 百位²+0~+4
      const p = data[i-1].d1;
      return [0,1,2,3,4].map(k => (p*p+k)%10);
    },
    (i) => { // 和值*百位+0~+4
      const s = data[i-1].d1+data[i-1].d2+data[i-1].d3;
      const b = (s*data[i-1].d1)%10;
      return [0,1,2,3,4].map(k => (b+k)%10);
    },
    (i) => { // 近5期百位
      const recent = new Set();
      for (let j=1;j<=5;j++) recent.add(data[i-j].d1);
      const arr = [...recent];
      if (arr.length>=5) return arr.slice(0,5);
      const kill = new Set(arr);
      for (const d of arr) { kill.add((d+1)%10); kill.add((d+9)%10); if(kill.size>=5) break; }
      return [...kill].slice(0,5);
    },
    (i) => { // 百位+十位差值+步长
      const diff = Math.abs(data[i-1].d1-data[i-1].d2);
      return [0,1,2,3,4].map(k => (diff+k*2+1)%10);
    },
    (i) => { // 百位+个位差值+步长
      const diff = Math.abs(data[i-1].d1-data[i-1].d3);
      return [0,1,2,3,4].map(k => (diff+k*2+2)%10);
    },
    (i) => { // 跨度*2+百位
      const d = [data[i-1].d1,data[i-1].d2,data[i-1].d3];
      const sp = Math.max(...d)-Math.min(...d);
      const b = (sp*2+data[i-1].d1)%10;
      return [0,1,2,3,4].map(k => (b+k)%10);
    },
    (i) => { // 和值尾+跨度
      const s = (data[i-1].d1+data[i-1].d2+data[i-1].d3)%10;
      const d = [data[i-1].d1,data[i-1].d2,data[i-1].d3];
      const sp = Math.max(...d)-Math.min(...d);
      const b = (s+sp)%10;
      return [0,1,2,3,4].map(k => (b+k*3+1)%10);
    },
    (i) => { // 十位*3+个位
      const b = (data[i-1].d2*3+data[i-1].d3)%10;
      return [0,1,2,3,4].map(k => (b+k)%10);
    },
    (i) => { // 和值尾*2+百位
      const s = (data[i-1].d1+data[i-1].d2+data[i-1].d3)%10;
      const b = (s*2+data[i-1].d1)%10;
      return [0,1,2,3,4].map(k => (b+k)%10);
    },
  ];

  const WINDOW = 10;
  let hits = 0;
  const formulaHits = Array(baseFormulas.length).fill(0);
  const formulaTotal = Array(baseFormulas.length).fill(0);

  for (let i = START; i < END; i++) {
    // 计算每个公式在最近WINDOW期的胜率
    const winRates = baseFormulas.map((fn, fi) => {
      let w = 0, t = 0;
      for (let j = Math.max(START, i-WINDOW); j < i; j++) {
        const kill = fn(j);
        if (!kill) continue;
        t++;
        if (!kill.includes(data[j].d1)) w++;
      }
      return t > 0 ? w/t : 0.5;
    });

    // 选胜率最高的公式
    let bestIdx = 0;
    for (let fi = 1; fi < baseFormulas.length; fi++) {
      if (winRates[fi] > winRates[bestIdx]) bestIdx = fi;
    }

    const kill = baseFormulas[bestIdx](i);
    if (verifyKill(i, kill)) hits++;
  }
  return { name: 'C-滑动窗口自适应(W=10)', rate: hits/TOTAL*100, hits, total: TOTAL };
}

// ============================================================
// 方案D: 频率衰减模型 - 近期权重高，远期权重低
// ============================================================
function schemeD_FrequencyDecay() {
  let hits = 0;
  for (let i = START; i < END; i++) {
    const scores = Array(10).fill(0);

    // 指数衰减频率统计
    for (let j = 1; j <= 30 && i-j >= 0; j++) {
      const weight = Math.exp(-j / 8); // 衰减系数
      scores[data[i-j].d1] += weight;
    }

    // 杀得分最低的5个（近期出现最少的）
    const ranked = scores.map((s, d) => ({d, s}));
    ranked.sort((a, b) => a.s - b.s);
    const kill = ranked.slice(0, 5).map(x => x.d);
    if (verifyKill(i, kill)) hits++;
  }
  return { name: 'D-频率衰减模型', rate: hits/TOTAL*100, hits, total: TOTAL };
}

// ============================================================
// 方案E: 反向思维 - 杀"最不可能出的"（冷号+远号）
// ============================================================
function schemeE_ColdKill() {
  let hits = 0;
  for (let i = START; i < END; i++) {
    const scores = Array(10).fill(0); // 得分越高越可能出

    // 近期热号加分
    for (let j = 1; j <= 5 && i-j >= 0; j++) scores[data[i-j].d1] += 5;
    for (let j = 6; j <= 15 && i-j >= 0; j++) scores[data[i-j].d1] += 2;

    // 邻号加分
    if (i >= 1) {
      const p = data[i-1].d1;
      scores[(p+1)%10] += 3;
      scores[(p+9)%10] += 3;
    }

    // 遗漏回补加分
    for (let d = 0; d < 10; d++) {
      let gap = 0;
      for (let j = 1; j <= 30 && i-j >= 0; j++) {
        if (data[i-j].d1 === d) { gap = j; break; }
      }
      if (gap >= 5 && gap <= 15) scores[d] += 4; // 中等遗漏最可能回补
      if (gap > 15) scores[d] += 2;
    }

    // 和值尾加分
    if (i >= 1) {
      const st = (data[i-1].d1+data[i-1].d2+data[i-1].d3)%10;
      scores[st] += 2;
    }

    // 杀得分最低的5个
    const ranked = scores.map((s, d) => ({d, s}));
    ranked.sort((a, b) => a.s - b.s);
    const kill = ranked.slice(0, 5).map(x => x.d);
    if (verifyKill(i, kill)) hits++;
  }
  return { name: 'E-冷号反向杀', rate: hits/TOTAL*100, hits, total: TOTAL };
}

// ============================================================
// 方案F: 组合投票 - 多个公式投票，票最少的5个被杀
// ============================================================
function schemeF_Voting() {
  const allFormulas = [
    (i) => { const p=data[i-1].d1; return [1,2,3,4,5].map(k=>(p+k)%10); },
    (i) => { const s=(data[i-1].d1+data[i-1].d2+data[i-1].d3)%10; return [0,1,2,3,4].map(k=>(s+k)%10); },
    (i) => { const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3]; const sp=Math.max(...d)-Math.min(...d); return [0,1,2,3,4].map(k=>(sp+k)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p*2+k)%10); },
    (i) => { const s=data[i-1].d2+data[i-1].d3; return [0,1,2,3,4].map(k=>(s+k)%10); },
    (i) => { const c=9-data[i-1].d1; return [0,1,2,3,4].map(k=>(c+k)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p*p+k)%10); },
    (i) => { const s=data[i-1].d1+data[i-1].d2+data[i-1].d3; const b=(s*data[i-1].d1)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
    (i) => { const diff=Math.abs(data[i-1].d1-data[i-1].d2); return [0,1,2,3,4].map(k=>(diff+k*2+1)%10); },
    (i) => { const diff=Math.abs(data[i-1].d1-data[i-1].d3); return [0,1,2,3,4].map(k=>(diff+k*2+2)%10); },
    (i) => { const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3]; const sp=Math.max(...d)-Math.min(...d); const b=(sp*2+data[i-1].d1)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
    (i) => { const s=(data[i-1].d1+data[i-1].d2+data[i-1].d3)%10; const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3]; const sp=Math.max(...d)-Math.min(...d); const b=(s+sp)%10; return [0,1,2,3,4].map(k=>(b+k*3+1)%10); },
    (i) => { const b=(data[i-1].d2*3+data[i-1].d3)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
    (i) => { const s=(data[i-1].d1+data[i-1].d2+data[i-1].d3)%10; const b=(s*2+data[i-1].d1)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p+9-k)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p*3+k*2+1)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p*7+k*3+2)%10); },
    (i) => { const s=data[i-1].d1+data[i-1].d2+data[i-1].d3; return [0,1,2,3,4].map(k=>(s+k*2+3)%10); },
    (i) => { const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3]; const sp=Math.max(...d)-Math.min(...d); return [0,1,2,3,4].map(k=>(sp*3+k+2)%10); },
    (i) => { const b=(data[i-1].d1+data[i-1].d2*2+data[i-1].d3*3)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
  ];

  let hits = 0;
  for (let i = START; i < END; i++) {
    // 每个公式给出"不杀"的5个数字（即保留的5个）
    const keepVotes = Array(10).fill(0);
    for (const fn of allFormulas) {
      const kill = fn(i);
      if (!kill) continue;
      const keep = [0,1,2,3,4,5,6,7,8,9].filter(d => !kill.includes(d));
      for (const d of keep) keepVotes[d]++;
    }

    // 杀得票最少的5个数字
    const ranked = keepVotes.map((v, d) => ({d, v}));
    ranked.sort((a, b) => a.v - b.v);
    const kill = ranked.slice(0, 5).map(x => x.d);
    if (verifyKill(i, kill)) hits++;
  }
  return { name: 'F-组合投票(20公式)', rate: hits/TOTAL*100, hits, total: TOTAL };
}

// ============================================================
// 方案G: 贝叶斯更新 - 基于先验概率动态调整
// ============================================================
function schemeG_Bayesian() {
  let hits = 0;
  // 初始先验：均匀分布
  let prior = Array(10).fill(0.1);

  for (let i = START; i < END; i++) {
    // 用最近20期数据更新似然
    const likelihood = Array(10).fill(0);
    for (let j = 1; j <= 20 && i-j >= 0; j++) {
      const weight = Math.exp(-j/10);
      likelihood[data[i-j].d1] += weight;
    }
    const maxL = Math.max(...likelihood);
    const normLikelihood = likelihood.map(l => l / (maxL || 1));

    // 后验 = 先验 × 似然
    const posterior = prior.map((p, d) => p * (0.3 + 0.7 * normLikelihood[d]));
    const sumP = posterior.reduce((a,b) => a+b, 0);
    const normPosterior = posterior.map(p => p / sumP);

    // 杀后验概率最低的5个
    const ranked = normPosterior.map((p, d) => ({d, p}));
    ranked.sort((a, b) => a.p - b.p);
    const kill = ranked.slice(0, 5).map(x => x.d);

    if (verifyKill(i, kill)) hits++;

    // 更新先验（贝叶斯更新）
    const actual = data[i].d1;
    prior = prior.map((p, d) => {
      const update = d === actual ? p * 1.5 : p * 0.9;
      return update;
    });
    const sumPrior = prior.reduce((a,b) => a+b, 0);
    prior = prior.map(p => p / sumPrior);
  }
  return { name: 'G-贝叶斯更新', rate: hits/TOTAL*100, hits, total: TOTAL };
}

// ============================================================
// 方案H: 杀号保守策略 - 只杀1码（高准确率）
// ============================================================
function schemeH_Kill1() {
  // 杀百位1码：用多因子评分杀最不可能的1个
  let hits = 0;
  for (let i = START; i < END; i++) {
    const scores = Array(10).fill(0);
    for (let j = 1; j <= 10 && i-j >= 0; j++) scores[data[i-j].d1] += (11-j);
    const prevBai = data[i-1].d1;
    scores[(prevBai+1)%10] += 8;
    scores[(prevBai+9)%10] += 8;
    const st = (data[i-1].d1+data[i-1].d2+data[i-1].d3)%10;
    scores[st] += 5;

    const ranked = scores.map((s, d) => ({d, s}));
    ranked.sort((a, b) => a.s - b.s);
    const kill = [ranked[0].d]; // 只杀1个
    const actual = data[i].d1;
    if (!kill.includes(actual)) hits++;
  }
  return { name: 'H-杀百位1码', rate: hits/TOTAL*100, hits, total: TOTAL };
}

// ============================================================
// 方案I: 杀号2码
// ============================================================
function schemeI_Kill2() {
  let hits = 0;
  for (let i = START; i < END; i++) {
    const scores = Array(10).fill(0);
    for (let j = 1; j <= 10 && i-j >= 0; j++) scores[data[i-j].d1] += (11-j);
    const prevBai = data[i-1].d1;
    scores[(prevBai+1)%10] += 8;
    scores[(prevBai+9)%10] += 8;
    scores[(prevBai+2)%10] += 4;
    scores[(prevBai+8)%10] += 4;
    const st = (data[i-1].d1+data[i-1].d2+data[i-1].d3)%10;
    scores[st] += 5;
    scores[(st+1)%10] += 3;
    scores[(st+9)%10] += 3;

    const ranked = scores.map((s, d) => ({d, s}));
    ranked.sort((a, b) => a.s - b.s);
    const kill = ranked.slice(0, 2).map(x => x.d);
    const actual = data[i].d1;
    if (!kill.includes(actual)) hits++;
  }
  return { name: 'I-杀百位2码', rate: hits/TOTAL*100, hits, total: TOTAL };
}

// ============================================================
// 运行所有方案
// ============================================================
console.log(`\n测试范围: ${data[START].issue}~${data[END-1].issue} (共${TOTAL}期)\n`);

const results = [
  schemeA_Markov(),
  schemeB_MultiFactor(),
  schemeC_Adaptive(),
  schemeD_FrequencyDecay(),
  schemeE_ColdKill(),
  schemeF_Voting(),
  schemeG_Bayesian(),
  schemeH_Kill1(),
  schemeI_Kill2(),
];

console.log('===== 全部方案结果 =====\n');
results.sort((a, b) => b.rate - a.rate);
results.forEach((r, i) => {
  const bar = '█'.repeat(Math.round(r.rate / 2));
  console.log(`${i+1}. ${r.name}: ${r.rate.toFixed(1)}% (${r.hits}/${r.total}) ${bar}`);
});

// 方案F详细分析：错误期分布
console.log('\n===== 方案F(组合投票)错误分析 =====');
{
  const allFormulas = [
    (i) => { const p=data[i-1].d1; return [1,2,3,4,5].map(k=>(p+k)%10); },
    (i) => { const s=(data[i-1].d1+data[i-1].d2+data[i-1].d3)%10; return [0,1,2,3,4].map(k=>(s+k)%10); },
    (i) => { const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3]; const sp=Math.max(...d)-Math.min(...d); return [0,1,2,3,4].map(k=>(sp+k)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p*2+k)%10); },
    (i) => { const s=data[i-1].d2+data[i-1].d3; return [0,1,2,3,4].map(k=>(s+k)%10); },
    (i) => { const c=9-data[i-1].d1; return [0,1,2,3,4].map(k=>(c+k)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p*p+k)%10); },
    (i) => { const s=data[i-1].d1+data[i-1].d2+data[i-1].d3; const b=(s*data[i-1].d1)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
    (i) => { const diff=Math.abs(data[i-1].d1-data[i-1].d2); return [0,1,2,3,4].map(k=>(diff+k*2+1)%10); },
    (i) => { const diff=Math.abs(data[i-1].d1-data[i-1].d3); return [0,1,2,3,4].map(k=>(diff+k*2+2)%10); },
    (i) => { const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3]; const sp=Math.max(...d)-Math.min(...d); const b=(sp*2+data[i-1].d1)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
    (i) => { const s=(data[i-1].d1+data[i-1].d2+data[i-1].d3)%10; const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3]; const sp=Math.max(...d)-Math.min(...d); const b=(s+sp)%10; return [0,1,2,3,4].map(k=>(b+k*3+1)%10); },
    (i) => { const b=(data[i-1].d2*3+data[i-1].d3)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
    (i) => { const s=(data[i-1].d1+data[i-1].d2+data[i-1].d3)%10; const b=(s*2+data[i-1].d1)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p+9-k)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p*3+k*2+1)%10); },
    (i) => { const p=data[i-1].d1; return [0,1,2,3,4].map(k=>(p*7+k*3+2)%10); },
    (i) => { const s=data[i-1].d1+data[i-1].d2+data[i-1].d3; return [0,1,2,3,4].map(k=>(s+k*2+3)%10); },
    (i) => { const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3]; const sp=Math.max(...d)-Math.min(...d); return [0,1,2,3,4].map(k=>(sp*3+k+2)%10); },
    (i) => { const b=(data[i-1].d1+data[i-1].d2*2+data[i-1].d3*3)%10; return [0,1,2,3,4].map(k=>(b+k)%10); },
  ];

  let missCount = 0;
  const missIssues = [];
  for (let i = START; i < END; i++) {
    const keepVotes = Array(10).fill(0);
    for (const fn of allFormulas) {
      const kill = fn(i);
      if (!kill) continue;
      const keep = [0,1,2,3,4,5,6,7,8,9].filter(d => !kill.includes(d));
      for (const d of keep) keepVotes[d]++;
    }
    const ranked = keepVotes.map((v, d) => ({d, v}));
    ranked.sort((a, b) => a.v - b.v);
    const kill = ranked.slice(0, 5).map(x => x.d);
    const actual = data[i].d1;
    if (kill.includes(actual)) {
      missCount++;
      if (missIssues.length < 20) missIssues.push({issue: data[i].issue, actual, kill});
    }
  }
  console.log(`总错误: ${missCount}期 / ${TOTAL}期`);
  console.log(`前20个错误期: ${missIssues.map(m => `${m.issue}期(开${m.actual},杀${m.kill.join(',')})`).join('\n  ')}`);
}
