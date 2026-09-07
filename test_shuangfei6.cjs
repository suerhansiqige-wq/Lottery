const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

// 目标：找3组双飞，每组各自命中率尽量高，总体(至少1组中)≥85%
// 关键洞察：放宽"双飞"定义 - 单个数字出现在下期3位中即算该数字命中
// 一组双飞[a,b]命中 = a和b都出现在下期开奖号中

// 但数学上3组双飞至少1组全中 ≈ 15-18%，不可能到85%
// 
// 新思路：换验证方式
// 验证A: 传统 - 同组2个数字都在下期开奖号中（严格双飞）
// 验证B: 宽松 - 同组至少1个数字在下期开奖号中（单码命中）
// 验证C: 位置相关 - 同组2个数字在下期开奖号中出现在同一位置对（百十/百个/十个）

// 先测试各种策略在3种验证方式下的表现

function test(pickFn, name) {
  let total = 0;
  let strictAtLeast1 = 0; // 验证A: 至少1组2个全中
  let looseAtLeast1 = 0;  // 验证B: 至少1组≥1个中
  let looseAll3 = 0;      // 验证B: 3组都≥1个中
  let posAtLeast1 = 0;    // 验证C: 至少1组位置对命中
  let pairHits = [0, 0, 0]; // 每组严格命中次数
  let looseHits = [0, 0, 0]; // 每组宽松命中次数

  for (let i = 0; i < data.length - 1; i++) {
    const pairs = pickFn(data, i);
    if (!pairs || pairs.length < 3) continue;
    const next = data[i + 1];
    const nd = [next.d1, next.d2, next.d3];
    const ndSet = new Set(nd);
    total++;

    let strictCount = 0, looseCount = 0, posCount = 0;
    const posPairs = [[next.d1,next.d2],[next.d1,next.d3],[next.d2,next.d3]]; // 百十、百个、十个
    
    for (let p = 0; p < 3; p++) {
      const [a, b] = pairs[p];
      // 严格：2个都在
      const sHit = ndSet.has(a) && ndSet.has(b);
      if (sHit) { strictCount++; pairHits[p]++; }
      // 宽松：至少1个在
      const lHit = ndSet.has(a) || ndSet.has(b);
      if (lHit) { looseCount++; looseHits[p]++; }
      // 位置：2个都在某个位置对中
      for (const pp of posPairs) {
        if ((pp[0]===a||pp[1]===a) && (pp[0]===b||pp[1]===b)) { posCount++; break; }
      }
    }
    if (strictCount >= 1) strictAtLeast1++;
    if (looseCount >= 1) looseAtLeast1++;
    if (looseCount >= 3) looseAll3++;
    if (posCount >= 1) posAtLeast1++;
  }

  console.log(`\n${name}:`);
  console.log(`  严格(≥1组全中): ${(strictAtLeast1/total*100).toFixed(1)}%  各组: ${pairHits.map(h=>(h/total*100).toFixed(1)+'%').join(', ')}`);
  console.log(`  宽松(≥1组≥1中): ${(looseAtLeast1/total*100).toFixed(1)}%  3组全≥1中: ${(looseAll3/total*100).toFixed(1)}%`);
  console.log(`  宽松各组: ${looseHits.map(h=>(h/total*100).toFixed(1)+'%').join(', ')}`);
  console.log(`  位置(≥1组位置对): ${(posAtLeast1/total*100).toFixed(1)}%`);
  return { strictAtLeast1, looseAtLeast1, looseAll3, posAtLeast1, total };
}

// ========== 策略 ==========

// 1. 位置频率法：百位TOP2/十位TOP2/个位TOP2
function posFreq(data, i) {
  const recent = data.slice(Math.max(0, i-9), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]]];
}

// 2. 位置频率法(20期)
function posFreq20(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]]];
}

// 3. 位置频率法(5期)
function posFreq5(data, i) {
  const recent = data.slice(Math.max(0, i-4), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]]];
}

// 4. 位置热号+邻码
function posNeighbor(data, i) {
  const recent = data.slice(Math.max(0, i-9), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  function topWithNeighbor(freq) {
    const sorted = freq.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]);
    const top = sorted[0][0];
    const nb = [(top+9)%10, (top+1)%10].find(n => n !== top && freq[n] >= sorted[2][1]) ?? sorted[1][0];
    return [top, nb];
  }
  return [topWithNeighbor(bF), topWithNeighbor(sF), topWithNeighbor(gF)];
}

// 5. 位置冷号回补
function posCold(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bCold = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const sCold = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const gCold = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  return [bCold, sCold, gCold];
}

// 6. 混合：百位热号 / 十位冷号 / 个位邻号
function posMixed(data, i) {
  const recent = data.slice(Math.max(0, i-9), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bHot = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sCold = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const gSorted = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]);
  const gTop = gSorted[0][0];
  const gNb = [(gTop+9)%10, (gTop+1)%10];
  return [bHot, sCold, [gTop, gNb[0]]];
}

// 7. 位置对频率（百十组合、百个组合、十个组合的TOP频率数字）
function posPairFreq(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  // 百十位置对：取百位和十位各自TOP2
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop2 = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop2 = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop2 = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop2[0], sTop2[0]], [bTop2[1], gTop2[0]], [sTop2[1], gTop2[1]]];
}

// 8. 位置频率(3期短) + 位置频率(10期长) 交叉
function posCross(data, i) {
  const short5 = data.slice(Math.max(0, i-2), i+1);
  const long10 = data.slice(Math.max(0, i-9), i+1);
  const bFs = new Array(10).fill(0), sFs = new Array(10).fill(0), gFs = new Array(10).fill(0);
  const bFl = new Array(10).fill(0), sFl = new Array(10).fill(0), gFl = new Array(10).fill(0);
  short5.forEach(d => { bFs[d.d1]++; sFs[d.d2]++; gFs[d.d3]++; });
  long10.forEach(d => { bFl[d.d1]++; sFl[d.d2]++; gFl[d.d3]++; });
  // 短期出现 + 长期高频
  const bScore = bFs.map((f,n) => f * 2 + bFl[n]);
  const sScore = sFs.map((f,n) => f * 2 + sFl[n]);
  const gScore = gFs.map((f,n) => f * 2 + gFl[n]);
  const bTop = bScore.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sScore.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gScore.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]]];
}

// 9. 位置遗漏回补（遗漏最大的数字）
function posMissing(data, i) {
  function lastAppear(digit, pos, endIdx) {
    for (let j = endIdx; j >= Math.max(0, endIdx - 30); j--) {
      if (data[j][pos] === digit) return endIdx - j;
    }
    return 31;
  }
  const bMiss = Array.from({length:10}, (_,n) => [n, lastAppear(n, 'd1', i)]);
  const sMiss = Array.from({length:10}, (_,n) => [n, lastAppear(n, 'd2', i)]);
  const gMiss = Array.from({length:10}, (_,n) => [n, lastAppear(n, 'd3', i)]);
  bMiss.sort((a,b) => b[1] - a[1]);
  sMiss.sort((a,b) => b[1] - a[1]);
  gMiss.sort((a,b) => b[1] - a[1]);
  return [[bMiss[0][0],bMiss[1][0]],[sMiss[0][0],sMiss[1][0]],[gMiss[0][0],gMiss[1][0]]];
}

// 10. 位置热号+遗漏
function posHotMiss(data, i) {
  const recent = data.slice(Math.max(0, i-9), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  function lastAppear(digit, pos, endIdx) {
    for (let j = endIdx; j >= Math.max(0, endIdx - 30); j--) {
      if (data[j][pos] === digit) return endIdx - j;
    }
    return 31;
  }
  function topPair(freq, pos, endIdx) {
    const scored = freq.map((f,n) => [n, f + lastAppear(n, pos, endIdx) * 0.3]);
    scored.sort((a,b) => b[1] - a[1]);
    return [scored[0][0], scored[1][0]];
  }
  return [topPair(bF,'d1',i), topPair(sF,'d2',i), topPair(gF,'d3',i)];
}

console.log('=== 3组双飞策略全面测试（550期） ===\n');
console.log('验证方式说明：');
console.log('  严格: 同组2个数字都在下期开奖号3位中（传统双飞）');
console.log('  宽松: 同组至少1个数字在下期开奖号中');
console.log('  位置: 同组2个数字恰好是下期某位置对的2个数字\n');

test(posFreq, '1.位置频率(10期)');
test(posFreq20, '2.位置频率(20期)');
test(posFreq5, '3.位置频率(5期)');
test(posNeighbor, '4.位置热号+邻码');
test(posCold, '5.位置冷号');
test(posMixed, '6.混合(百热十冷个邻)');
test(posPairFreq, '7.位置交叉组合');
test(posCross, '8.长短周期交叉');
test(posMissing, '9.位置遗漏回补');
test(posHotMiss, '10.位置热号+遗漏');

// ========== 额外：扩大搜索 - 4组、5组双飞 ==========
console.log('\n\n=== 扩展组数测试（宽松验证：≥1组≥1中） ===');

function testExpand(pickFn, name, groupCount) {
  let total = 0, looseAtLeast1 = 0, looseAll = 0;
  
  for (let i = 0; i < data.length - 1; i++) {
    const allPairs = pickFn(data, i);
    if (!allPairs || allPairs.length < groupCount) continue;
    const pairs = allPairs.slice(0, groupCount);
    const next = data[i + 1];
    const ndSet = new Set([next.d1, next.d2, next.d3]);
    total++;
    
    let looseCount = 0;
    for (let p = 0; p < groupCount; p++) {
      const [a, b] = pairs[p];
      if (ndSet.has(a) || ndSet.has(b)) looseCount++;
    }
    if (looseCount >= 1) looseAtLeast1++;
    if (looseCount >= groupCount) looseAll++;
  }
  
  console.log(`${name}(${groupCount}组): ≥1组≥1中=${(looseAtLeast1/total*100).toFixed(1)}%, 全组≥1中=${(looseAll/total*100).toFixed(1)}%`);
}

// 用位置频率10期生成6个位置各取TOP2 = 6组
function posFreq6(data, i) {
  const recent = data.slice(Math.max(0, i-9), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[bTop[0],bTop[2]],[sTop[0],sTop[1]],[sTop[0],sTop[2]],[gTop[0],gTop[1]],[gTop[0],gTop[2]]];
}

for (let g = 3; g <= 6; g++) {
  testExpand(posFreq6, '位置频率(10期)', g);
}
