const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

console.log('=== 杀百十个各3码 - 全面算法测试 ===\n');
console.log('验证：百位杀3码(3个都不中百位) + 十位杀3码 + 个位杀3码，全部杀对=总体✓\n');

function test(fn, name) {
  let total = 0, allPass = 0;
  let posPass = [0, 0, 0]; // 百/十/个各自杀对次数

  for (let i = 0; i < data.length - 1; i++) {
    const kills = fn(data, i); // [[b1,b2,b3], [s1,s2,s3], [g1,g2,g3]]
    if (!kills || kills.length < 3) continue;
    const next = data[i + 1];
    total++;

    const bOk = !kills[0].includes(next.d1);
    const sOk = !kills[1].includes(next.d2);
    const gOk = !kills[2].includes(next.d3);
    if (bOk) posPass[0]++;
    if (sOk) posPass[1]++;
    if (gOk) posPass[2]++;
    if (bOk && sOk && gOk) allPass++;
  }

  console.log(`${name}:`);
  console.log(`  总体全杀对: ${(allPass/total*100).toFixed(1)}%`);
  console.log(`  百位杀对: ${(posPass[0]/total*100).toFixed(1)}% | 十位杀对: ${(posPass[1]/total*100).toFixed(1)}% | 个位杀对: ${(posPass[2]/total*100).toFixed(1)}%`);
}

// ====== 策略库 ======

// 1. 位置冷号(杀最低频3码)
for (const period of [10, 20, 30, 50]) {
  test((data, i) => {
    const start = Math.max(0, i - period + 1);
    const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
    for (let j = start; j <= i; j++) { bF[data[j].d1]++; sF[data[j].d2]++; gF[data[j].d3]++; }
    const bKill = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
    const sKill = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
    const gKill = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
    return [bKill, sKill, gKill];
  }, `1.位置冷号(${period}期)`);
}

// 2. 位置热号(杀最高频3码 - 热号该出了？)
for (const period of [10, 20, 30]) {
  test((data, i) => {
    const start = Math.max(0, i - period + 1);
    const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
    for (let j = start; j <= i; j++) { bF[data[j].d1]++; sF[data[j].d2]++; gF[data[j].d3]++; }
    const bKill = bF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
    const sKill = sF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
    const gKill = gF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
    return [bKill, sKill, gKill];
  }, `2.位置热号(${period}期)`);
}

// 3. 位置遗漏最大(最久未出的3码)
test((data, i) => {
  function lastSeen(digit, pos, endIdx) {
    for (let j = endIdx; j >= Math.max(0, endIdx-40); j--) {
      if (data[j][pos] === digit) return endIdx - j;
    }
    return 41;
  }
  const bM = Array.from({length:10},(_,n)=>[n,lastSeen(n,'d1',i)]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  const sM = Array.from({length:10},(_,n)=>[n,lastSeen(n,'d2',i)]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  const gM = Array.from({length:10},(_,n)=>[n,lastSeen(n,'d3',i)]).sort((a,b)=>b[1]-a[1]).slice(0,3).map(e=>e[0]);
  return [bM, sM, gM];
}, '3.位置遗漏最大');

// 4. 位置遗漏最小(刚出过的3码 - 连出概率低)
test((data, i) => {
  function lastSeen(digit, pos, endIdx) {
    for (let j = endIdx; j >= Math.max(0, endIdx-40); j--) {
      if (data[j][pos] === digit) return endIdx - j;
    }
    return 41;
  }
  const bM = Array.from({length:10},(_,n)=>[n,lastSeen(n,'d1',i)]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  const sM = Array.from({length:10},(_,n)=>[n,lastSeen(n,'d2',i)]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  const gM = Array.from({length:10},(_,n)=>[n,lastSeen(n,'d3',i)]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  return [bM, sM, gM];
}, '4.位置遗漏最小(刚出过)');

// 5. 上期同位数字(杀上期百十个)
test((data, i) => {
  const prev = data[i];
  // 百位杀：上期百位+左右邻
  const bKill = [prev.d1, (prev.d1+1)%10, (prev.d1+9)%10];
  const sKill = [prev.d2, (prev.d2+1)%10, (prev.d2+9)%10];
  const gKill = [prev.d3, (prev.d3+1)%10, (prev.d3+9)%10];
  return [bKill, sKill, gKill];
}, '5.上期同位+左右邻');

// 6. 上期同位+对码
test((data, i) => {
  const prev = data[i];
  const bKill = [prev.d1, (prev.d1+5)%10, (prev.d1+1)%10];
  const sKill = [prev.d2, (prev.d2+5)%10, (prev.d2+1)%10];
  const gKill = [prev.d3, (prev.d3+5)%10, (prev.d3+1)%10];
  return [bKill, sKill, gKill];
}, '6.上期同位+对码+右邻');

// 7. 条件概率(上期百位=X时，百位最不可能出现的3码)
test((data, i) => {
  if (i < 1) return [[0,1,2],[3,4,5],[6,7,8]];
  const prev = data[i];
  const start = Math.max(0, i - 49);
  const bCond = new Array(10).fill(0), sCond = new Array(10).fill(0), gCond = new Array(10).fill(0);
  let bCount = 0, sCount = 0, gCount = 0;
  for (let j = start; j <= i; j++) {
    if (data[j].d1 === prev.d1) { bCond[data[j+1 < data.length ? j+1 : j].d1]++; }
  }
  // 简化：统计上期百位=X时，下期百位各数字出现频率
  const bNext = new Array(10).fill(0);
  const sNext = new Array(10).fill(0);
  const gNext = new Array(10).fill(0);
  for (let j = start; j < i; j++) {
    if (data[j].d1 === prev.d1) bNext[data[j+1].d1]++;
    if (data[j].d2 === prev.d2) sNext[data[j+1].d2]++;
    if (data[j].d3 === prev.d3) gNext[data[j+1].d3]++;
  }
  const bKill = bNext.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  const sKill = sNext.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  const gKill = gNext.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  return [bKill, sKill, gKill];
}, '7.条件概率(低频)');

// 8. 位置频率加权(近期权重高)冷号
test((data, i) => {
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = Math.max(0, i-19); j <= i; j++) {
    const w = j - Math.max(0, i-19) + 1;
    bF[data[j].d1] += w; sF[data[j].d2] += w; gF[data[j].d3] += w;
  }
  const bKill = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  const sKill = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  const gKill = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  return [bKill, sKill, gKill];
}, '8.位置加权冷号(20期)');

// 9. 混合：冷号+遗漏
test((data, i) => {
  const start = Math.max(0, i - 19);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) { bF[data[j].d1]++; sF[data[j].d2]++; gF[data[j].d3]++; }
  function lastSeen(digit, pos, endIdx) {
    for (let j = endIdx; j >= Math.max(0, endIdx-30); j--) {
      if (data[j][pos] === digit) return endIdx - j;
    }
    return 31;
  }
  function kill3(freq, pos) {
    const scored = freq.map((f,n) => [n, f * 0.5 + lastSeen(n, pos, i) * 0.5]);
    scored.sort((a,b) => a[1] - b[1]); // 低频+大遗漏 = 最不可能出
    return scored.slice(0,3).map(e=>e[0]);
  }
  return [kill3(bF,'d1'), kill3(sF,'d2'), kill3(gF,'d3')];
}, '9.混合(冷号+遗漏)');

// 10. 马尔可夫：上期数字→下期该位最低概率
test((data, i) => {
  if (i < 1) return [[0,1,2],[3,4,5],[6,7,8]];
  const prev = data[i];
  const start = Math.max(0, i - 29);
  const bNext = new Array(10).fill(0), sNext = new Array(10).fill(0), gNext = new Array(10).fill(0);
  for (let j = start; j < i; j++) {
    if (data[j].d1 === prev.d1) bNext[data[j+1].d1]++;
    if (data[j].d2 === prev.d2) sNext[data[j+1].d2]++;
    if (data[j].d3 === prev.d3) gNext[data[j+1].d3]++;
  }
  const bKill = bNext.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  const sKill = sNext.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  const gKill = gNext.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,3).map(e=>e[0]);
  return [bKill, sKill, gKill];
}, '10.马尔可夫(低频)');

// 11. 随机基准
let randTotal = 0;
for (let r = 0; r < 100; r++) {
  let total = 0, allPass = 0;
  for (let i = 0; i < data.length - 1; i++) {
    const bKill = [0,1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-0.5).slice(0,3);
    const sKill = [0,1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-0.5).slice(0,3);
    const gKill = [0,1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-0.5).slice(0,3);
    const next = data[i+1];
    total++;
    if (!bKill.includes(next.d1) && !sKill.includes(next.d2) && !gKill.includes(next.d3)) allPass++;
  }
  randTotal += allPass/total;
}
console.log(`\n随机基准(100次平均): ${(randTotal/100*100).toFixed(1)}%`);
console.log('\n理论值: 每位置杀3码命中率70%, 三位置全对=70%^3=34.3%');
