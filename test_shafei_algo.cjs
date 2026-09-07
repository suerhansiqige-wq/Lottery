const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

console.log('=== 双飞杀号(5组)算法全面测试 ===\n');
console.log('验证：每组2个不同时出现=✓，同时出现=✗，5组全✓=总体✓\n');

function test(fn, name) {
  let total = 0, allPass = 0;
  let pairFails = [0,0,0,0,0];

  for (let i = 0; i < data.length - 1; i++) {
    const pairs = fn(data, i);
    if (!pairs || pairs.length < 5) continue;
    const next = data[i + 1];
    const ndSet = new Set([next.d1, next.d2, next.d3]);
    total++;

    let pass = true;
    for (let p = 0; p < 5; p++) {
      const [a, b] = pairs[p];
      if (ndSet.has(a) && ndSet.has(b)) { pass = false; pairFails[p]++; }
    }
    if (pass) allPass++;
  }

  console.log(`${name}: ${(allPass/total*100).toFixed(1)}% | 各组失败率: ${pairFails.map(h=>(h/total*100).toFixed(1)+'%').join(', ')}`);
}

// 1. 位置冷号(30期) - 各位置最低频TOP2
test((data, i) => {
  const start = Math.max(0, i - 29);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) { bF[data[j].d1]++; sF[data[j].d2]++; gF[data[j].d3]++; }
  const bCold = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const sCold = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const gCold = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const codes = [...new Set([...bCold,...sCold,...gCold])];
  const allF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) { allF[data[j].d1]++; allF[data[j].d2]++; allF[data[j].d3]++; }
  const hot = allF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  while (codes.length < 6) { const c = hot.find(x=>!codes.includes(x)); if(c) codes.push(c); else break; }
  const pairs = [];
  for (let a=0;a<codes.length;a++) for (let b=a+1;b<codes.length;b++) pairs.push([codes[a],codes[b]]);
  return pairs.slice(0,5);
}, '1.位置冷号(30期)');

// 2. 全局冷号(30期)
test((data, i) => {
  const start = Math.max(0, i - 29);
  const allF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) { allF[data[j].d1]++; allF[data[j].d2]++; allF[data[j].d3]++; }
  const cold = allF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).map(e=>e[0]);
  const codes = cold.slice(0, 6);
  const pairs = [];
  for (let a=0;a<codes.length;a++) for (let b=a+1;b<codes.length;b++) pairs.push([codes[a],codes[b]]);
  return pairs.slice(0,5);
}, '2.全局冷号(30期)');

// 3. 全局冷号(20期)
test((data, i) => {
  const start = Math.max(0, i - 19);
  const allF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) { allF[data[j].d1]++; allF[data[j].d2]++; allF[data[j].d3]++; }
  const cold = allF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).map(e=>e[0]);
  const codes = cold.slice(0, 6);
  const pairs = [];
  for (let a=0;a<codes.length;a++) for (let b=a+1;b<codes.length;b++) pairs.push([codes[a],codes[b]]);
  return pairs.slice(0,5);
}, '3.全局冷号(20期)');

// 4. 全局冷号(10期)
test((data, i) => {
  const start = Math.max(0, i - 9);
  const allF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) { allF[data[j].d1]++; allF[data[j].d2]++; allF[data[j].d3]++; }
  const cold = allF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).map(e=>e[0]);
  const codes = cold.slice(0, 6);
  const pairs = [];
  for (let a=0;a<codes.length;a++) for (let b=a+1;b<codes.length;b++) pairs.push([codes[a],codes[b]]);
  return pairs.slice(0,5);
}, '4.全局冷号(10期)');

// 5. 位置冷号(20期)
test((data, i) => {
  const start = Math.max(0, i - 19);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) { bF[data[j].d1]++; sF[data[j].d2]++; gF[data[j].d3]++; }
  const bCold = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const sCold = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const gCold = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const codes = [...new Set([...bCold,...sCold,...gCold])];
  const allF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) { allF[data[j].d1]++; allF[data[j].d2]++; allF[data[j].d3]++; }
  const hot = allF.map((f,n)=>[n,f]).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);
  while (codes.length < 6) { const c = hot.find(x=>!codes.includes(x)); if(c) codes.push(c); else break; }
  const pairs = [];
  for (let a=0;a<codes.length;a++) for (let b=a+1;b<codes.length;b++) pairs.push([codes[a],codes[b]]);
  return pairs.slice(0,5);
}, '5.位置冷号(20期)');

// 6. 遗漏最大(最久未出)
test((data, i) => {
  function lastSeen(digit, endIdx) {
    for (let j = endIdx; j >= Math.max(0, endIdx-40); j--) {
      if (data[j].d1===digit||data[j].d2===digit||data[j].d3===digit) return endIdx-j;
    }
    return 41;
  }
  const missing = Array.from({length:10},(_,n)=>[n,lastSeen(n,i)]).sort((a,b)=>b[1]-a[1]);
  const codes = missing.slice(0,6).map(e=>e[0]);
  const pairs = [];
  for (let a=0;a<codes.length;a++) for (let b=a+1;b<codes.length;b++) pairs.push([codes[a],codes[b]]);
  return pairs.slice(0,5);
}, '6.遗漏最大(最久未出)');

// 7. 共现频率最低的对（最不可能一起出现）
test((data, i) => {
  const start = Math.max(0, i - 49);
  const pairF = {};
  for (let j = start; j <= i; j++) {
    const d = [data[j].d1, data[j].d2, data[j].d3];
    for (let a=0;a<3;a++) for (let b=a+1;b<3;b++) {
      const key = d[a]<d[b]?`${d[a]}_${d[b]}`:`${d[b]}_${d[a]}`;
      pairF[key] = (pairF[key]||0)+1;
    }
  }
  const allPairs = [];
  for (let a=0;a<10;a++) for (let b=a+1;b<10;b++) {
    const key = `${a}_${b}`;
    allPairs.push([a, b, pairF[key]||0]);
  }
  allPairs.sort((a,b)=>a[2]-b[2]);
  return allPairs.slice(0,5).map(e=>[e[0],e[1]]);
}, '7.共现频率最低TOP5');

// 8. 共现频率最低(20期)
test((data, i) => {
  const start = Math.max(0, i - 19);
  const pairF = {};
  for (let j = start; j <= i; j++) {
    const d = [data[j].d1, data[j].d2, data[j].d3];
    for (let a=0;a<3;a++) for (let b=a+1;b<3;b++) {
      const key = d[a]<d[b]?`${d[a]}_${d[b]}`:`${d[b]}_${d[a]}`;
      pairF[key] = (pairF[key]||0)+1;
    }
  }
  const allPairs = [];
  for (let a=0;a<10;a++) for (let b=a+1;b<10;b++) {
    const key = `${a}_${b}`;
    allPairs.push([a, b, pairF[key]||0]);
  }
  allPairs.sort((a,b)=>a[2]-b[2]);
  return allPairs.slice(0,5).map(e=>[e[0],e[1]]);
}, '8.共现频率最低TOP5(20期)');

// 9. 上期未出现的数字组合
test((data, i) => {
  const prev = data[i];
  const prevDigits = new Set([prev.d1, prev.d2, prev.d3]);
  const notInPrev = [0,1,2,3,4,5,6,7,8,9].filter(d => !prevDigits.has(d));
  const pairs = [];
  for (let a=0;a<notInPrev.length&&pairs.length<5;a++) {
    for (let b=a+1;b<notInPrev.length&&pairs.length<5;b++) {
      pairs.push([notInPrev[a], notInPrev[b]]);
    }
  }
  return pairs;
}, '9.上期未出现数字组合');

// 10. 冷号+低共现混合
test((data, i) => {
  const start = Math.max(0, i - 29);
  const allF = new Array(10).fill(0);
  for (let j = start; j <= i; j++) { allF[data[j].d1]++; allF[data[j].d2]++; allF[data[j].d3]++; }
  const cold6 = allF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,6).map(e=>e[0]);
  // 从冷6中选共现最低的5对
  const pairF = {};
  for (let j = start; j <= i; j++) {
    const d = [data[j].d1, data[j].d2, data[j].d3];
    for (let a=0;a<3;a++) for (let b=a+1;b<3;b++) {
      const key = d[a]<d[b]?`${d[a]}_${d[b]}`:`${d[b]}_${d[a]}`;
      pairF[key] = (pairF[key]||0)+1;
    }
  }
  const coldPairs = [];
  for (let a=0;a<cold6.length;a++) for (let b=a+1;b<cold6.length;b++) {
    const key = cold6[a]<cold6[b]?`${cold6[a]}_${cold6[b]}`:`${cold6[b]}_${cold6[a]}`;
    coldPairs.push([cold6[a], cold6[b], pairF[key]||0]);
  }
  coldPairs.sort((a,b)=>a[2]-b[2]);
  return coldPairs.slice(0,5).map(e=>[e[0],e[1]]);
}, '10.冷号+低共现混合');

// 11. 随机基准
let randTotal = 0;
for (let r = 0; r < 100; r++) {
  let total = 0, allPass = 0;
  for (let i = 0; i < data.length - 1; i++) {
    const digits = [0,1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-0.5);
    const codes = digits.slice(0,6);
    const pairs = [];
    for (let a=0;a<codes.length;a++) for (let b=a+1;b<codes.length;b++) pairs.push([codes[a],codes[b]]);
    const next = data[i+1];
    const ndSet = new Set([next.d1, next.d2, next.d3]);
    total++;
    let pass = true;
    for (let p=0;p<5;p++) { if (ndSet.has(pairs[p][0]) && ndSet.has(pairs[p][1])) { pass=false; break; } }
    if (pass) allPass++;
  }
  randTotal += allPass/total;
}
console.log(`随机基准(100次平均): ${(randTotal/100*100).toFixed(1)}%`);
