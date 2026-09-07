const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

console.log('=== 全新算法搜索：数字对共现 + 条件概率 ===\n');
console.log('验证标准：每组2个数字都必须出现在下期开奖号3位中\n');

function test(fn, name) {
  let total = 0, hitAny = 0;
  let pairHits = [0, 0, 0];

  for (let i = 0; i < data.length - 1; i++) {
    const pairs = fn(data, i);
    if (!pairs || pairs.length < 3) continue;
    const next = data[i + 1];
    const ndSet = new Set([next.d1, next.d2, next.d3]);
    total++;

    let count = 0;
    for (let p = 0; p < 3; p++) {
      const [a, b] = pairs[p];
      if (a === b) continue;
      if (ndSet.has(a) && ndSet.has(b)) { count++; pairHits[p]++; }
    }
    if (count >= 1) hitAny++;
  }

  console.log(`${name}: ${(hitAny/total*100).toFixed(1)}% | 各组: ${pairHits.map(h=>(h/total*100).toFixed(1)+'%').join(', ')}`);
}

// 预计算：所有数字对的共现频率
function buildPairFreq(endIdx, window) {
  const start = Math.max(0, endIdx - window + 1);
  const pairF = {};
  for (let i = start; i <= endIdx; i++) {
    const d = [data[i].d1, data[i].d2, data[i].d3];
    for (let a = 0; a < 3; a++) {
      for (let b = a + 1; b < 3; b++) {
        const key = d[a] < d[b] ? `${d[a]}_${d[b]}` : `${d[b]}_${d[a]}`;
        pairF[key] = (pairF[key] || 0) + 1;
      }
    }
  }
  return pairF;
}

function getTopPairs(pairF, count) {
  return Object.entries(pairF)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(e => e[0].split('_').map(Number));
}

// 1. 历史共现频率最高的3对
test((data, i) => {
  const pf = buildPairFreq(i, 50);
  return getTopPairs(pf, 3);
}, '共现TOP3(50期)');

test((data, i) => {
  const pf = buildPairFreq(i, 100);
  return getTopPairs(pf, 3);
}, '共现TOP3(100期)');

test((data, i) => {
  const pf = buildPairFreq(i, 200);
  return getTopPairs(pf, 3);
}, '共现TOP3(200期)');

// 2. 近期共现TOP3（短周期）
test((data, i) => {
  const pf = buildPairFreq(i, 10);
  return getTopPairs(pf, 3);
}, '共现TOP3(10期)');

test((data, i) => {
  const pf = buildPairFreq(i, 20);
  return getTopPairs(pf, 3);
}, '共现TOP3(20期)');

// 3. 条件概率：上期百位出现时，十位个位最常一起出现的数字
test((data, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const prev = data[i];
  const start = Math.max(0, i - 49);
  // 当百位=prev.d1时，哪些数字对最常一起出现在同一期
  const condF = {};
  for (let j = start; j <= i; j++) {
    const d = [data[j].d1, data[j].d2, data[j].d3];
    if (d.includes(prev.d1)) {
      const others = d.filter(x => x !== prev.d1);
      if (others.length >= 2) {
        const key = `${Math.min(others[0],others[1])}_${Math.max(others[0],others[1])}`;
        condF[key] = (condF[key] || 0) + 1;
      } else if (others.length === 1) {
        // 组三情况
        const key = `${prev.d1}_${others[0]}`;
        condF[key] = (condF[key] || 0) + 1;
      }
    }
  }
  const topPairs = Object.entries(condF).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0].split('_').map(Number));
  while (topPairs.length < 3) topPairs.push([topPairs.length, topPairs.length+1]);
  return topPairs;
}, '条件概率(百位触发)');

// 4. 位置条件概率：百位=X时，十位最可能是Y
test((data, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const prev = data[i];
  const start = Math.max(0, i - 49);
  
  // 百位=prev.d1的历史中，十位频率
  const bCond = new Array(10).fill(0);
  const sCond = new Array(10).fill(0);
  const gCond = new Array(10).fill(0);
  let bCount = 0, sCount = 0, gCount = 0;
  
  for (let j = start; j <= i; j++) {
    if (data[j].d1 === prev.d1) { bCond[data[j].d2]++; bCond[data[j].d3]++; bCount++; }
    if (data[j].d2 === prev.d2) { sCond[data[j].d1]++; sCond[data[j].d3]++; sCount++; }
    if (data[j].d3 === prev.d3) { gCond[data[j].d1]++; gCond[data[j].d2]++; gCount++; }
  }
  
  const bTop = bCond.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]);
  const sTop = sCond.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]);
  const gTop = gCond.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]);
  
  return [[prev.d1, bTop[0][0]], [prev.d2, sTop[0][0]], [prev.d3, gTop[0][0]]];
}, '位置条件概率(同位触发)');

// 5. 连号对（01,12,23,...,89,90）
test((data, i) => {
  const prev = data[i];
  // 上期开奖号的连号
  const pairs = [];
  for (const d of [prev.d1, prev.d2, prev.d3]) {
    pairs.push([d, (d+1)%10]);
  }
  return pairs.slice(0, 3);
}, '上期连号对');

// 6. 对码对（0-5,1-6,2-7,3-8,4-9）
test((data, i) => {
  const prev = data[i];
  return [[prev.d1, (prev.d1+5)%10], [prev.d2, (prev.d2+5)%10], [prev.d3, (prev.d3+5)%10]];
}, '上期对码对');

// 7. 和值拆分对
test((data, i) => {
  const d = data[i];
  const sum = d.d1 + d.d2 + d.d3;
  // 和值的个位和十位
  const s1 = Math.floor(sum / 10);
  const s2 = sum % 10;
  const span = Math.max(d.d1,d.d2,d.d3) - Math.min(d.d1,d.d2,d.d3);
  return [[s1, s2], [span, (span+5)%10], [d.d1, d.d2]];
}, '和值拆分+跨度');

// 8. 位置条件概率TOP2
test((data, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const prev = data[i];
  const start = Math.max(0, i - 29);
  
  const bCond = new Array(10).fill(0);
  const sCond = new Array(10).fill(0);
  const gCond = new Array(10).fill(0);
  
  for (let j = start; j <= i; j++) {
    if (data[j].d1 === prev.d1) { bCond[data[j].d2]++; bCond[data[j].d3]++; }
    if (data[j].d2 === prev.d2) { sCond[data[j].d1]++; sCond[data[j].d3]++; }
    if (data[j].d3 === prev.d3) { gCond[data[j].d1]++; gCond[data[j].d2]++; }
  }
  
  const bTop2 = bCond.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop2 = sCond.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop2 = gCond.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  
  return [bTop2, sTop2, gTop2];
}, '位置条件概率TOP2');

// 9. 位置条件概率TOP2(10期)
test((data, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const prev = data[i];
  const start = Math.max(0, i - 9);
  
  const bCond = new Array(10).fill(0);
  const sCond = new Array(10).fill(0);
  const gCond = new Array(10).fill(0);
  
  for (let j = start; j <= i; j++) {
    if (data[j].d1 === prev.d1) { bCond[data[j].d2]++; bCond[data[j].d3]++; }
    if (data[j].d2 === prev.d2) { sCond[data[j].d1]++; sCond[data[j].d3]++; }
    if (data[j].d3 === prev.d3) { gCond[data[j].d1]++; gCond[data[j].d2]++; }
  }
  
  const bTop2 = bCond.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop2 = sCond.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop2 = gCond.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  
  return [bTop2, sTop2, gTop2];
}, '位置条件概率TOP2(10期)');

// 10. 马尔可夫链：上期数字→下期最可能共现的数字
test((data, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const prev = data[i];
  const start = Math.max(0, i - 49);
  
  // 对每个上期数字，统计下期哪些数字和它一起出现
  const trans = {};
  for (const d of [0,1,2,3,4,5,6,7,8,9]) trans[d] = new Array(10).fill(0);
  
  for (let j = start; j < i; j++) {
    const cur = new Set([data[j].d1, data[j].d2, data[j].d3]);
    const nxt = new Set([data[j+1].d1, data[j+1].d2, data[j+1].d3]);
    for (const c of cur) {
      for (const n of nxt) {
        if (c !== n) trans[c][n]++;
      }
    }
  }
  
  // 对上期3个数字，各找最可能共现的1个
  const pairs = [];
  for (const d of [prev.d1, prev.d2, prev.d3]) {
    const top = trans[d].map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
    pairs.push([d, top]);
  }
  return pairs;
}, '马尔可夫共现(50期)');

// 11. 马尔可夫链(20期)
test((data, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const prev = data[i];
  const start = Math.max(0, i - 19);
  
  const trans = {};
  for (const d of [0,1,2,3,4,5,6,7,8,9]) trans[d] = new Array(10).fill(0);
  
  for (let j = start; j < i; j++) {
    const cur = new Set([data[j].d1, data[j].d2, data[j].d3]);
    const nxt = new Set([data[j+1].d1, data[j+1].d2, data[j+1].d3]);
    for (const c of cur) {
      for (const n of nxt) {
        if (c !== n) trans[c][n]++;
      }
    }
  }
  
  const pairs = [];
  for (const d of [prev.d1, prev.d2, prev.d3]) {
    const top = trans[d].map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
    pairs.push([d, top]);
  }
  return pairs;
}, '马尔可夫共现(20期)');

// 12. 上期3个数字两两组对
test((data, i) => {
  const d = data[i];
  return [[d.d1, d.d2], [d.d1, d.d3], [d.d2, d.d3]];
}, '上期3个数字两两组对');

// 13. 上期数字+其最高频共现数字（全局）
test((data, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const prev = data[i];
  
  // 全局共现矩阵
  const coOccur = {};
  for (const d of [0,1,2,3,4,5,6,7,8,9]) coOccur[d] = new Array(10).fill(0);
  for (let j = 0; j <= i; j++) {
    const digits = [data[j].d1, data[j].d2, data[j].d3];
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++) {
        if (a !== b) coOccur[digits[a]][digits[b]]++;
      }
    }
  }
  
  const pairs = [];
  for (const d of [prev.d1, prev.d2, prev.d3]) {
    const top = coOccur[d].map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
    pairs.push([d, top]);
  }
  return pairs;
}, '上期数字+全局最高频共现');

// 14. 综合评分：频率+共现+遗漏
test((data, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const prev = data[i];
  const start = Math.max(0, i - 29);
  
  // 位置频率
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) {
    bF[data[j].d1]++; sF[data[j].d2]++; gF[data[j].d3]++;
  }
  
  // 条件共现
  const bCond = new Array(10).fill(0), sCond = new Array(10).fill(0), gCond = new Array(10).fill(0);
  for (let j = start; j <= i; j++) {
    if (data[j].d1 === prev.d1) { bCond[data[j].d2]++; bCond[data[j].d3]++; }
    if (data[j].d2 === prev.d2) { sCond[data[j].d1]++; sCond[data[j].d3]++; }
    if (data[j].d3 === prev.d3) { gCond[data[j].d1]++; gCond[data[j].d2]++; }
  }
  
  function bestPair(freq, cond, anchor) {
    const scored = freq.map((f, n) => [n, f * 0.4 + cond[n] * 0.6]);
    scored.sort((a, b) => b[1] - a[1]);
    return [anchor, scored[0][0]];
  }
  
  return [bestPair(bF, bCond, prev.d1), bestPair(sF, sCond, prev.d2), bestPair(gF, gCond, prev.d3)];
}, '综合评分(频率+条件共现)');

// 15. 上期数字+马尔可夫TOP1(10期)
test((data, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const prev = data[i];
  const start = Math.max(0, i - 9);
  
  const trans = {};
  for (const d of [0,1,2,3,4,5,6,7,8,9]) trans[d] = new Array(10).fill(0);
  
  for (let j = start; j < i; j++) {
    const cur = new Set([data[j].d1, data[j].d2, data[j].d3]);
    const nxt = new Set([data[j+1].d1, data[j+1].d2, data[j+1].d3]);
    for (const c of cur) {
      for (const n of nxt) {
        if (c !== n) trans[c][n]++;
      }
    }
  }
  
  const pairs = [];
  for (const d of [prev.d1, prev.d2, prev.d3]) {
    const top = trans[d].map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
    pairs.push([d, top]);
  }
  return pairs;
}, '马尔可夫共现(10期)');

console.log('\n=== 随机基准 ===');
// 随机100次取平均
let randTotal = 0;
for (let r = 0; r < 100; r++) {
  let total = 0, hitAny = 0;
  for (let i = 0; i < data.length - 1; i++) {
    const digits = [0,1,2,3,4,5,6,7,8,9].sort(() => Math.random() - 0.5);
    const pairs = [[digits[0],digits[1]], [digits[2],digits[3]], [digits[4],digits[5]]];
    const next = data[i + 1];
    const ndSet = new Set([next.d1, next.d2, next.d3]);
    total++;
    for (let p = 0; p < 3; p++) {
      const [a, b] = pairs[p];
      if (ndSet.has(a) && ndSet.has(b)) { hitAny++; break; }
    }
  }
  randTotal += hitAny / total;
}
console.log(`随机100次平均: ${(randTotal/100*100).toFixed(1)}%`);
