const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

// 目标：找≥85%的双飞策略
// 上轮发现：宽松验证(每组至少1个数字中) 3组可达87%，但4组才85%+
// 这轮：测试更多组合，找最优3组策略

function test(pickFn, name) {
  let total = 0;
  let strictAtLeast1 = 0;
  let looseAtLeast1 = 0;
  let looseAll3 = 0;
  let pairHits = [0, 0, 0];
  let looseHits = [0, 0, 0];

  for (let i = 0; i < data.length - 1; i++) {
    const pairs = pickFn(data, i);
    if (!pairs || pairs.length < 3) continue;
    const next = data[i + 1];
    const nd = [next.d1, next.d2, next.d3];
    const ndSet = new Set(nd);
    total++;

    let strictCount = 0, looseCount = 0;
    for (let p = 0; p < 3; p++) {
      const [a, b] = pairs[p];
      const sHit = ndSet.has(a) && ndSet.has(b);
      if (sHit) { strictCount++; pairHits[p]++; }
      const lHit = ndSet.has(a) || ndSet.has(b);
      if (lHit) { looseCount++; looseHits[p]++; }
    }
    if (strictCount >= 1) strictAtLeast1++;
    if (looseCount >= 1) looseAtLeast1++;
    if (looseCount >= 3) looseAll3++;
  }

  console.log(`${name}:`);
  console.log(`  严格≥1组全中: ${(strictAtLeast1/total*100).toFixed(1)}% | 宽松≥1组≥1中: ${(looseAtLeast1/total*100).toFixed(1)}% | 各组宽松: ${looseHits.map(h=>(h/total*100).toFixed(1)+'%').join(', ')}`);
  return { strict: strictAtLeast1/total, loose: looseAtLeast1/total, total };
}

// ====== 策略库 ======

// 1. 位置频率(20期) - 上轮最佳之一
function posFreq20(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]]];
}

// 2. 位置交叉(百十/百个/十个) - 上轮严格最佳19.1%
function posCross(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop2 = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop2 = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop2 = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop2[0], sTop2[0]], [bTop2[1], gTop2[0]], [sTop2[1], gTop2[1]]];
}

// 3. 位置遗漏(20期)
function posMiss20(data, i) {
  function lastSeen(digit, pos, endIdx) {
    for (let j = endIdx; j >= Math.max(0, endIdx - 40); j--) {
      if (data[j][pos] === digit) return endIdx - j;
    }
    return 41;
  }
  const bM = Array.from({length:10}, (_,n) => [n, lastSeen(n, 'd1', i)]).sort((a,b)=>b[1]-a[1]);
  const sM = Array.from({length:10}, (_,n) => [n, lastSeen(n, 'd2', i)]).sort((a,b)=>b[1]-a[1]);
  const gM = Array.from({length:10}, (_,n) => [n, lastSeen(n, 'd3', i)]).sort((a,b)=>b[1]-a[1]);
  return [[bM[0][0],bM[1][0]],[sM[0][0],sM[1][0]],[gM[0][0],gM[1][0]]];
}

// 4. 位置频率(10期) + 位置遗漏(30期) 综合评分
function posFreqMiss(data, i) {
  const recent = data.slice(Math.max(0, i-9), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  function lastSeen(digit, pos, endIdx) {
    for (let j = endIdx; j >= Math.max(0, endIdx - 30); j--) {
      if (data[j][pos] === digit) return endIdx - j;
    }
    return 31;
  }
  function top2(freq, pos) {
    const scored = freq.map((f,n) => [n, f * 1.5 + lastSeen(n, pos, i) * 0.5]);
    scored.sort((a,b) => b[1] - a[1]);
    return [scored[0][0], scored[1][0]];
  }
  return [top2(bF,'d1'), top2(sF,'d2'), top2(gF,'d3')];
}

// 5. 位置频率(15期)
function posFreq15(data, i) {
  const recent = data.slice(Math.max(0, i-14), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]]];
}

// 6. 位置频率(30期)
function posFreq30(data, i) {
  const recent = data.slice(Math.max(0, i-29), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]]];
}

// 7. 位置热号TOP1 + 邻码 组合
function posHotNeighbor(data, i) {
  const recent = data.slice(Math.max(0, i-9), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  function topAndNb(freq) {
    const sorted = freq.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]);
    const top = sorted[0][0];
    // 选频率第二高的或邻码
    const nb1 = (top + 1) % 10, nb9 = (top + 9) % 10;
    const second = sorted[1][0];
    // 优先选频率高的邻
    if (freq[nb1] >= freq[second] * 0.5) return [top, nb1];
    if (freq[nb9] >= freq[second] * 0.5) return [top, nb9];
    return [top, second];
  }
  return [topAndNb(bF), topAndNb(sF), topAndNb(gF)];
}

// 8. 位置频率(20期) + 对码(数字+5)%10
function posFreqDuiMa(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  function topWithDui(freq) {
    const sorted = freq.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]);
    const top = sorted[0][0];
    const dui = (top + 5) % 10;
    return [top, dui];
  }
  return [topWithDui(bF), topWithDui(sF), topWithDui(gF)];
}

// 9. 位置频率(20期) 但用加权：近期权重更高
function posFreqWeighted(data, i) {
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = Math.max(0, i-19); j <= i; j++) {
    const w = (j - Math.max(0, i-19) + 1); // 权重1-20
    bF[data[j].d1] += w; sF[data[j].d2] += w; gF[data[j].d3] += w;
  }
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]]];
}

// 10. 位置频率(20期) + 位置冷号(20期) 交叉
function posHotCold(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bHot = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
  const bCold = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const sHot = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
  const sCold = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const gHot = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
  const gCold = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  return [[bHot, bCold], [sHot, sCold], [gHot, gCold]];
}

// 11. 位置频率(20期) 但每组3个数字（3码飞）
function posFreq3(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]]];
}

// 12. 位置频率(20期) + 上期同位数字
function posFreqPrev(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const prev = data[i];
  // 百位：频率TOP1 + 上期百位
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1])[0][0];
  return [[bTop, prev.d1], [sTop, prev.d2], [gTop, prev.d3]];
}

console.log('=== 3组双飞策略全面测试2 ===\n');

test(posFreq20, '1.位置频率(20期)');
test(posCross, '2.位置交叉');
test(posMiss20, '3.位置遗漏(20期)');
test(posFreqMiss, '4.位置频率+遗漏');
test(posFreq15, '5.位置频率(15期)');
test(posFreq30, '6.位置频率(30期)');
test(posHotNeighbor, '7.位置热号+邻码');
test(posFreqDuiMa, '8.位置频率+对码');
test(posFreqWeighted, '9.位置加权频率');
test(posHotCold, '10.位置热+冷');
test(posFreq3, '11.位置频率(20期)TOP3');
test(posFreqPrev, '12.位置频率+上期同位');

// ====== 终极测试：4组双飞 ======
console.log('\n=== 4组双飞测试 ===');

function test4(pickFn, name) {
  let total = 0, strictAtLeast1 = 0, looseAtLeast1 = 0;
  let pairStrict = [0,0,0,0], pairLoose = [0,0,0,0];

  for (let i = 0; i < data.length - 1; i++) {
    const pairs = pickFn(data, i);
    if (!pairs || pairs.length < 4) continue;
    const next = data[i + 1];
    const ndSet = new Set([next.d1, next.d2, next.d3]);
    total++;

    let sc = 0, lc = 0;
    for (let p = 0; p < 4; p++) {
      const [a, b] = pairs[p];
      if (ndSet.has(a) && ndSet.has(b)) { sc++; pairStrict[p]++; }
      if (ndSet.has(a) || ndSet.has(b)) { lc++; pairLoose[p]++; }
    }
    if (sc >= 1) strictAtLeast1++;
    if (lc >= 1) looseAtLeast1++;
  }

  console.log(`${name}:`);
  console.log(`  严格≥1组全中: ${(strictAtLeast1/total*100).toFixed(1)}% | 宽松≥1组≥1中: ${(looseAtLeast1/total*100).toFixed(1)}%`);
  console.log(`  各组宽松: ${pairLoose.map(h=>(h/total*100).toFixed(1)+'%').join(', ')}`);
}

// 4组：百位TOP2 + 十位TOP2 + 个位TOP2 + 交叉(百十)
function fourGroupA(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]],[bTop[0],sTop[0]]];
}

// 4组：百位TOP2 + 十位TOP2 + 个位TOP2 + 遗漏最大
function fourGroupB(data, i) {
  const recent = data.slice(Math.max(0, i-19), i+1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  recent.forEach(d => { bF[d.d1]++; sF[d.d2]++; gF[d.d3]++; });
  const bTop = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const sTop = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  const gTop = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  // 第4组：全局遗漏最大的2个数字
  const allF = new Array(10).fill(0);
  for (let j = Math.max(0, i-19); j <= i; j++) {
    allF[data[j].d1]++; allF[data[j].d2]++; allF[data[j].d3]++;
  }
  const cold = allF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  return [[bTop[0],bTop[1]],[sTop[0],sTop[1]],[gTop[0],gTop[1]],cold];
}

test4(fourGroupA, '4组A: 百十各+交叉');
test4(fourGroupB, '4组B: 百十各+冷号');
