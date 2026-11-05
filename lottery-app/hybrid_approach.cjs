// 混合方案：安全9规则 + 多维度过滤
const fs = require('fs');
const path = require('path');

const lotteryDataPath = path.join(__dirname, 'src/data/lotteryData.js');
const content = fs.readFileSync(lotteryDataPath, 'utf-8');
const match = content.match(/export const lotteryData = (\[[\s\S]*?\]);/);
const allData = eval(match[1]);

console.log(`总期数: ${allData.length}\n`);

function hAddFn(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function hSubFn(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function vAddFn(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function vSubFn(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

function computePools(prev1, prev2, prev3) {
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = hAddFn(d1), hs1 = hSubFn(d1);
  const ha2 = hAddFn(d2), hs2 = hSubFn(d2);
  const ha3 = hAddFn(d3), hs3 = hSubFn(d3);
  const va1 = vAddFn(d1, d2), vs1 = vSubFn(d1, d2);
  const va2 = vAddFn(d2, d3), vs2 = vSubFn(d2, d3);

  const bc1 = new Set(), bc2 = new Set();
  for (let d = 0; d <= 9; d++) {
    let cnt1 = [ha1, hs1, va1, vs1].filter(arr => arr.includes(d)).length;
    if (cnt1 >= 2) bc1.add(d);
    let cnt2 = [ha2, hs2, va2, vs2].filter(arr => arr.includes(d)).length;
    if (cnt2 >= 2) bc2.add(d);
  }

  return { ha1: new Set(ha1), hs1: new Set(hs1), ha2: new Set(ha2), hs2: new Set(hs2),
    ha3: new Set(ha3), hs3: new Set(hs3), va1: new Set(va1), vs1: new Set(vs1),
    va2: new Set(va2), vs2: new Set(vs2), bc1, bc2 };
}

const SAFE_9 = [
  'allIn(ha1)', 'allIn(hs1)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
  'dblHSub(va1)',
  'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)'
];

function applyRules(pools, rules, num) {
  const sa = Math.floor(num / 100);
  const sb = Math.floor((num % 100) / 10);
  const sc = num % 10;

  for (const rule of rules) {
    const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
    if (!match) continue;
    const [, type, poolName] = match;
    const pool = pools[poolName];
    if (!pool) continue;
    
    if (type === 'allIn' && pool.has(sa) && pool.has(sb) && pool.has(sc)) return true;
    else if (type === 'dblHAdd') {
      const ha = hAddFn([sa,sb,sc]);
      if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) return true;
    } else if (type === 'dblHSub') {
      const hs = hSubFn([sa,sb,sc]);
      if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) return true;
    }
  }
  return false;
}

// 多维度评分（用于在安全9规则基础上进一步筛选）
function multiDimScore(num, data, currentIdx) {
  const d1 = Math.floor(num / 100);
  const d2 = Math.floor((num % 100) / 10);
  const d3 = num % 10;
  
  const recent = data.slice(Math.max(0, currentIdx - 50), currentIdx);
  
  // 频率
  const freq = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  recent.forEach(item => {
    freq.d1[item.d1]++;
    freq.d2[item.d2]++;
    freq.d3[item.d3]++;
  });
  
  // 遗漏
  const missing = { d1: 0, d2: 0, d3: 0 };
  for (let v = 0; v <= 9; v++) {
    let miss = 0;
    for (let i = currentIdx - 1; i >= Math.max(0, currentIdx - 50); i--) {
      if (data[i].d1 === v) break;
      miss++;
    }
    if (v === d1) missing.d1 = miss;
  }
  for (let v = 0; v <= 9; v++) {
    let miss = 0;
    for (let i = currentIdx - 1; i >= Math.max(0, currentIdx - 50); i--) {
      if (data[i].d2 === v) break;
      miss++;
    }
    if (v === d2) missing.d2 = miss;
  }
  for (let v = 0; v <= 9; v++) {
    let miss = 0;
    for (let i = currentIdx - 1; i >= Math.max(0, currentIdx - 50); i--) {
      if (data[i].d3 === v) break;
      miss++;
    }
    if (v === d3) missing.d3 = miss;
  }
  
  // 和值趋势
  const sumRecent = recent.map(d => d.d1 + d.d2 + d.d3);
  const avgSum = sumRecent.reduce((a, b) => a + b, 0) / sumRecent.length;
  const sum = d1 + d2 + d3;
  
  // 跨度趋势
  const spanRecent = recent.map(d => Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3));
  const avgSpan = spanRecent.reduce((a, b) => a + b, 0) / spanRecent.length;
  const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
  
  let score = 0;
  
  // 频率得分（热号加分）
  score += (freq.d1[d1] + freq.d2[d2] + freq.d3[d3]) * 0.5;
  
  // 遗漏得分（高遗漏加分）
  score += (missing.d1 + missing.d2 + missing.d3) * 0.3;
  
  // 和值接近度
  score += Math.max(0, 10 - Math.abs(sum - avgSum)) * 1.5;
  
  // 跨度接近度
  score += Math.max(0, 5 - Math.abs(span - avgSpan)) * 2;
  
  // 避免豹子
  if (d1 === d2 && d2 === d3) score -= 50;
  
  return score;
}

console.log("=== 混合方案测试 ===\n");

// 方案1: 安全9规则（基线）
let plan1Total = 0, plan1Hit = 0, plan1Cnt = 0;

// 方案2: 安全9 + 多维度Top 650
let plan2Total = 0, plan2Hit = 0, plan2Cnt = 0;

// 方案3: 安全9 + 和值过滤
let plan3Total = 0, plan3Hit = 0, plan3Cnt = 0;

// 方案4: 安全9 + 多维度过滤 + 和值过滤
let plan4Total = 0, plan4Hit = 0, plan4Cnt = 0;

const testCount = 100;
const startIdx = allData.length - testCount;
const details = [];

for (let i = startIdx; i < allData.length; i++) {
  const current = allData[i];
  const prev1 = allData[i-1];
  const prev2 = allData[i-2];
  const prev3 = allData[i-3];
  const pools = computePools(prev1, prev2, prev3);
  const actual = `${current.d1}${current.d2}${current.d3}`;
  
  // 方案1: 安全9规则
  const plan1Nums = [];
  for (let num = 0; num < 1000; num++) {
    if (!applyRules(pools, SAFE_9, num)) {
      plan1Nums.push(String(num).padStart(3, '0'));
    }
  }
  
  // 方案2: 安全9 + 多维度评分Top 650
  const scored = [];
  for (let num = 0; num < 1000; num++) {
    if (!applyRules(pools, SAFE_9, num)) {
      const score = multiDimScore(num, allData, i);
      scored.push({ num: String(num).padStart(3, '0'), score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  const plan2Nums = scored.slice(0, 650).map(s => s.num);
  
  // 方案3: 安全9 + 和值6-20
  const plan3Nums = plan1Nums.filter(s => {
    const sum = (+s[0]) + (+s[1]) + (+s[2]);
    return sum >= 6 && sum <= 20;
  });
  
  // 方案4: 安全9 + 多维度 + 和值6-20
  const plan4Nums = plan2Nums.filter(s => {
    const sum = (+s[0]) + (+s[1]) + (+s[2]);
    return sum >= 6 && sum <= 20;
  });
  
  // 统计
  plan1Total += plan1Nums.length;
  if (plan1Nums.includes(actual)) plan1Hit++;
  plan1Cnt++;
  
  plan2Total += plan2Nums.length;
  if (plan2Nums.includes(actual)) plan2Hit++;
  plan2Cnt++;
  
  plan3Total += plan3Nums.length;
  if (plan3Nums.includes(actual)) plan3Hit++;
  plan3Cnt++;
  
  plan4Total += plan4Nums.length;
  if (plan4Nums.includes(actual)) plan4Hit++;
  plan4Cnt++;
  
  details.push({
    issue: current.issue,
    actual,
    plan1: { count: plan1Nums.length, hit: plan1Nums.includes(actual) },
    plan2: { count: plan2Nums.length, hit: plan2Nums.includes(actual) },
    plan3: { count: plan3Nums.length, hit: plan3Nums.includes(actual) },
    plan4: { count: plan4Nums.length, hit: plan4Nums.includes(actual) }
  });
}

console.log(`测试期数: ${testCount}\n`);

console.log("方案1 (安全9规则):");
console.log(`  平均: ${(plan1Total/plan1Cnt).toFixed(0)}注, 命中: ${plan1Hit}/${plan1Cnt} (${(plan1Hit/plan1Cnt*100).toFixed(1)}%)\n`);

console.log("方案2 (安全9 + 多维度Top650):");
console.log(`  平均: ${(plan2Total/plan2Cnt).toFixed(0)}注, 命中: ${plan2Hit}/${plan2Cnt} (${(plan2Hit/plan2Cnt*100).toFixed(1)}%)\n`);

console.log("方案3 (安全9 + 和值6-20):");
console.log(`  平均: ${(plan3Total/plan3Cnt).toFixed(0)}注, 命中: ${plan3Hit}/${plan3Cnt} (${(plan3Hit/plan3Cnt*100).toFixed(1)}%)\n`);

console.log("方案4 (安全9 + 多维度 + 和值6-20):");
console.log(`  平均: ${(plan4Total/plan4Cnt).toFixed(0)}注, 命中: ${plan4Hit}/${plan4Cnt} (${(plan4Hit/plan4Cnt*100).toFixed(1)}%)\n`);

// 找最佳方案
const plans = [
  { name: '方案1', hit: plan1Hit, cnt: plan1Cnt, avg: plan1Total/plan1Cnt },
  { name: '方案2', hit: plan2Hit, cnt: plan2Cnt, avg: plan2Total/plan2Cnt },
  { name: '方案3', hit: plan3Hit, cnt: plan3Cnt, avg: plan3Total/plan3Cnt },
  { name: '方案4', hit: plan4Hit, cnt: plan4Cnt, avg: plan4Total/plan4Cnt },
];

plans.sort((a, b) => (b.hit/b.cnt) - (a.hit/a.cnt));
console.log("=== 命中率排名 ===");
plans.forEach((p, i) => {
  console.log(`${i+1}. ${p.name}: ${(p.hit/p.cnt*100).toFixed(1)}% (${p.avg.toFixed(0)}注)`);
});

// 显示最近20期
console.log("\n=== 最近20期详情 ===");
details.slice(-20).forEach(d => {
  console.log(`${d.issue}: 开奖=${d.actual}`);
  console.log(`  方案1: ${d.plan1.count}注 ${d.plan1.hit?'✓':'✗'}`);
  console.log(`  方案2: ${d.plan2.count}注 ${d.plan2.hit?'✓':'✗'}`);
  console.log(`  方案3: ${d.plan3.count}注 ${d.plan3.hit?'✓':'✗'}`);
  console.log(`  方案4: ${d.plan4.count}注 ${d.plan4.hit?'✓':'✗'}`);
});

// 用最佳方案生成下一期预测
console.log("\n=== 下一期预测 ===");
const bestPlan = plans[0];
console.log(`最佳方案: ${bestPlan.name}`);

const i = allData.length;
const current = allData[i-1];
const prev1 = allData[i-1];
const prev2 = allData[i-2];
const prev3 = allData[i-3];
const pools = computePools(prev1, prev2, prev3);

let predictions = [];
for (let num = 0; num < 1000; num++) {
  if (!applyRules(pools, SAFE_9, num)) {
    predictions.push(String(num).padStart(3, '0'));
  }
}

if (bestPlan.name === '方案2' || bestPlan.name === '方案4') {
  const scored = predictions.map(s => ({
    num: s,
    score: multiDimScore(+s, allData, i)
  }));
  scored.sort((a, b) => b.score - a.score);
  predictions = scored.slice(0, 650).map(s => s.num);
}

if (bestPlan.name === '方案3' || bestPlan.name === '方案4') {
  predictions = predictions.filter(s => {
    const sum = (+s[0]) + (+s[1]) + (+s[2]);
    return sum >= 6 && sum <= 20;
  });
}

console.log(`生成${predictions.length}注`);
console.log(`前30注: ${predictions.slice(0, 30).join(', ')}`);
console.log(`...`);
console.log(`后30注: ${predictions.slice(-30).join(', ')}`);

const outputPath = path.join(__dirname, 'hybrid_prediction.json');
fs.writeFileSync(outputPath, JSON.stringify({
  bestPlan: bestPlan.name,
  hitRate: (bestPlan.hit/bestPlan.cnt*100).toFixed(1),
  avgCount: bestPlan.avg.toFixed(0),
  predictions
}, null, 2));
console.log(`\n已保存: ${outputPath}`);
