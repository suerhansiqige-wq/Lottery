const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/boloor/Desktop/新黄金三格.xlsm', {type:'binary'});

const ws1 = wb.Sheets['福'];
const ws2 = wb.Sheets['福 (2)'];
const data1 = XLSX.utils.sheet_to_json(ws1, {header:1});
const data2 = XLSX.utils.sheet_to_json(ws2, {header:1});

const allRows = [...data1.slice(1), ...data2.slice(1)];
const resultMap = {};
for (const row of allRows) {
  if (row[0] && row[1]!=null && row[2]!=null && row[3]!=null) {
    const period = String(row[0]);
    const d1 = Number(row[1]), d2 = Number(row[2]), d3 = Number(row[3]);
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(d3)) resultMap[period] = {d1, d2, d3};
  }
}

const preds = {};
for (let i = 1; i < data2.length; i++) {
  const row = data2[i];
  if (row[0] && row[4]) {
    const period = String(row[0]);
    const predStr = String(row[4]).trim();
    const nums = predStr.split(/\s+/).filter(s => /^\d{3}$/.test(s));
    if (nums.length > 0) preds[period] = new Set(nums);
  }
}

const periods = Object.keys(resultMap).sort();
const analysis = {};
let prevG2 = [null,null,null,null,null,null,null,null,null,null];

for (const p of periods) {
  const r = resultMap[p];
  const idx = periods.indexOf(p);
  const prev = idx > 0 ? resultMap[periods[idx-1]] : null;
  const hAdd = [(r.d1+r.d2)%10, (r.d2+r.d3)%10, (r.d3+r.d1)%10];
  const hSub = [Math.abs(r.d1-r.d2), Math.abs(r.d2-r.d3), Math.abs(r.d3-r.d1)];
  const vAdd = prev ? [(r.d1+prev.d1)%10, (r.d2+prev.d2)%10, (r.d3+prev.d3)%10] : [null,null,null];
  const vSub = prev ? [Math.abs(r.d1-prev.d1), Math.abs(r.d2-prev.d2), Math.abs(r.d3-prev.d3)] : [null,null,null];
  const g2 = prevG2.map(v => v);
  const sheng = [];
  for (let d = 0; d <= 9; d++) {
    if (g2[d] === null) sheng.push(d);
    if ([r.d1, r.d2, r.d3].includes(d)) { g2[d] = null; }
    else { if (g2[d] === null) g2[d] = 1; else g2[d] = (g2[d] || 0) + 1; }
  }
  const s = new Set([r.d1, r.d2, r.d3]);
  const lian = new Set();
  for (const v of s) { if (v > 0 && !s.has(v-1)) lian.add(v-1); if (v < 9 && !s.has(v+1)) lian.add(v+1); }
  const shengSet = new Set(sheng);
  const bichu = [];
  for (let d = 0; d <= 9; d++) { if (!shengSet.has(d) && !lian.has(d)) bichu.push(d); }

  // Compute 回补/遗漏
  const p1idx = idx-1, p2idx = idx-2, p3idx = idx-3;
  const a1 = p1idx >= 0 ? analysis[periods[p1idx]] : null;
  const a2 = p2idx >= 0 ? analysis[periods[p2idx]] : null;
  const a3 = p3idx >= 0 ? analysis[periods[p3idx]] : null;

  let hHuibu = [], hYilou = [], vHuibu = [], vYilou = [];
  if (a1) {
    const hSet1 = new Set([...a1.hAdd, ...a1.hSub]);
    const hSet2 = a2 ? new Set([...a2.hAdd, ...a2.hSub]) : new Set();
    const hSet3 = a3 ? new Set([...a3.hAdd, ...a3.hSub]) : new Set();
    const hUnion2 = new Set([...hSet1, ...hSet2]);
    const hUnion3 = new Set([...hSet1, ...hSet2, ...hSet3]);
    for (let d=0;d<=9;d++) { if(!hUnion2.has(d)) hHuibu.push(d); if(!hUnion3.has(d)) hYilou.push(d); }

    const vSet1 = new Set([...(a1.vAdd||[]).filter(x=>x!==null), ...(a1.vSub||[]).filter(x=>x!==null)]);
    const vSet2 = a2 ? new Set([...(a2.vAdd||[]).filter(x=>x!==null), ...(a2.vSub||[]).filter(x=>x!==null)]) : new Set();
    const vSet3 = a3 ? new Set([...(a3.vAdd||[]).filter(x=>x!==null), ...(a3.vSub||[]).filter(x=>x!==null)]) : new Set();
    const vUnion2 = new Set([...vSet1, ...vSet2]);
    const vUnion3 = new Set([...vSet1, ...vSet2, ...vSet3]);
    for (let d=0;d<=9;d++) { if(!vUnion2.has(d)) vHuibu.push(d); if(!vUnion3.has(d)) vYilou.push(d); }
  }

  analysis[p] = {hAdd, hSub, vAdd, vSub, shenghao: sheng, lianhao: [...lian], bichu, result: r,
    digits: [r.d1, r.d2, r.d3], hHuibu, hYilou, vHuibu, vYilou};
  prevG2 = g2;
}

const allNums = [];
for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);

const predPeriods = Object.keys(preds).sort();

console.log('=== TEST 1: Union of digit pools from 3 periods ===');
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;
  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];
  const a1 = analysis[p1], a2 = analysis[p2], a3 = analysis[p3];

  // Pool 1: hAdd∪hSub from each period
  const pool1 = new Set([...a1.hAdd, ...a1.hSub]);
  const pool2 = new Set([...a2.hAdd, ...a2.hSub]);
  const pool3 = new Set([...a3.hAdd, ...a3.hSub]);

  // Generate all 3-digit combos from each pool
  const gen = (pool) => {
    const dp = [...pool];
    const s = new Set();
    for (const a of dp) for (const b of dp) for (const c of dp) s.add(''+a+b+c);
    return s;
  };

  const gen1 = gen(pool1), gen2 = gen(pool2), gen3 = gen(pool3);
  const union123 = new Set([...gen1, ...gen2, ...gen3]);

  // Also try: union of result digits from 3 periods
  const resultPool = new Set([...a1.digits, ...a2.digits, ...a3.digits]);
  const genResult = gen(resultPool);

  // Also try: union of all analysis values from 3 periods
  const allPool = new Set([...a1.hAdd, ...a1.hSub, ...a2.hAdd, ...a2.hSub, ...a3.hAdd, ...a3.hSub]);
  const genAll = gen(allPool);

  // Also try: hAdd pool from all 3 + result digits from all 3
  const combinedPool = new Set([...pool1, ...pool2, ...pool3, ...resultPool]);
  const genCombined = gen(combinedPool);

  // Also try: include vAdd/vSub
  const fullPool = new Set([...a1.hAdd, ...a1.hSub, ...(a1.vAdd||[]).filter(x=>x!==null), ...(a1.vSub||[]).filter(x=>x!==null),
    ...a2.hAdd, ...a2.hSub, ...(a2.vAdd||[]).filter(x=>x!==null), ...(a2.vSub||[]).filter(x=>x!==null),
    ...a3.hAdd, ...a3.hSub, ...(a3.vAdd||[]).filter(x=>x!==null), ...(a3.vSub||[]).filter(x=>x!==null)]);
  const genFull = gen(fullPool);

  const match = (s) => [...s].filter(n => predSet.has(n)).length;

  console.log(`\n${pp} (pred=${predSet.size}):`);
  console.log(`  pool1=[${[...pool1].sort()}] pool2=[${[...pool2].sort()}] pool3=[${[...pool3].sort()}]`);
  console.log(`  resultPool=[${[...resultPool].sort()}] (${resultPool.size})`);
  console.log(`  allPool=[${[...allPool].sort()}] (${allPool.size})`);
  console.log(`  fullPool=[${[...fullPool].sort()}] (${fullPool.size})`);
  console.log(`  gen1=${gen1.size} gen2=${gen2.size} gen3=${gen3.size}`);
  console.log(`  union(1,2,3)=${union123.size} match=${match(union123)}`);
  console.log(`  genResult=${genResult.size} match=${match(genResult)}`);
  console.log(`  genAll=${genAll.size} match=${match(genAll)}`);
  console.log(`  genCombined=${genCombined.size} match=${match(genCombined)}`);
  console.log(`  genFull=${genFull.size} match=${match(genFull)}`);

  // Try: genFull minus 豹子
  const genFullNoBaozi = new Set([...genFull].filter(n => !(n[0]===n[1] && n[1]===n[2])));
  console.log(`  genFull-豹子=${genFullNoBaozi.size} match=${match(genFullNoBaozi)}`);

  // Try: genFull minus numbers with all digits in 回补
  const huibuPool = new Set([...a1.hHuibu, ...a1.vHuibu]);
  const genFullNoHuibu = new Set([...genFull].filter(n => {
    if (n[0]===n[1] && n[1]===n[2]) return false;
    const d = [+n[0],+n[1],+n[2]];
    if (d.every(x => huibuPool.has(x))) return false;
    return true;
  }));
  console.log(`  genFull-豹子-allIn回补=${genFullNoHuibu.size} match=${match(genFullNoHuibu)}`);
}

console.log('\n\n=== TEST 2: Span analysis of excluded numbers ===');
for (const pp of predPeriods.slice(0, 3)) {
  const predSet = preds[pp];
  const excluded = allNums.filter(n => !predSet.has(n));

  const exclSpanDist = new Array(10).fill(0);
  const predSpanDist = new Array(10).fill(0);
  for (const n of excluded) {
    const d = [+n[0],+n[1],+n[2]];
    const span = Math.max(...d) - Math.min(...d);
    exclSpanDist[span]++;
  }
  for (const n of [...predSet]) {
    const d = [+n[0],+n[1],+n[2]];
    const span = Math.max(...d) - Math.min(...d);
    predSpanDist[span]++;
  }
  console.log(`\n${pp}:`);
  console.log(`  Excl span dist: ${exclSpanDist.join(' ')}`);
  console.log(`  Pred span dist: ${predSpanDist.join(' ')}`);
  console.log(`  Total span dist: ${exclSpanDist.map((v,i) => v + predSpanDist[i]).join(' ')}`);

  // Check: are ALL span=0 (豹子) excluded?
  console.log(`  Span 0: excl=${exclSpanDist[0]}, pred=${predSpanDist[0]}`);
}

console.log('\n\n=== TEST 3: Sum-based exclusion patterns ===');
for (const pp of predPeriods.slice(0, 5)) {
  const predSet = preds[pp];
  const excluded = new Set(allNums.filter(n => !predSet.has(n)));

  // For each sum value (0-27), count excluded vs included
  const sumExcl = new Array(28).fill(0);
  const sumPred = new Array(28).fill(0);
  for (const n of allNums) {
    const sum = (+n[0]) + (+n[1]) + (+n[2]);
    if (excluded.has(n)) sumExcl[sum]++;
    else sumPred[sum]++;
  }

  // Find sums that are heavily excluded (>50%)
  const highExcl = [];
  for (let s = 0; s < 28; s++) {
    const total = sumExcl[s] + sumPred[s];
    if (total > 0 && sumExcl[s] / total > 0.5) {
      highExcl.push({sum: s, excl: sumExcl[s], pred: sumPred[s], rate: (sumExcl[s]/total*100).toFixed(0)});
    }
  }
  console.log(`${pp}: high-exclusion sums: ${highExcl.map(h => `${h.sum}(${h.rate}%:${h.excl}/${h.excl+h.pred})`).join(', ')}`);
}

console.log('\n\n=== TEST 4: Cross-period exclusion stability ===');
// For each number, count how many periods it's excluded in
const exclFreq = {};
for (const n of allNums) exclFreq[n] = 0;
for (const pp of predPeriods) {
  for (const n of allNums) {
    if (!preds[pp].has(n)) exclFreq[n]++;
  }
}

// Distribution of exclusion frequencies
const freqDist = new Array(16).fill(0);
for (const n of allNums) freqDist[exclFreq[n]]++;
console.log('Exclusion frequency distribution:');
for (let f = 0; f <= 15; f++) {
  if (freqDist[f] > 0) console.log(`  Excluded in ${f}/15 periods: ${freqDist[f]} numbers`);
}

// Numbers excluded in ALL 15 periods
const alwaysExcl = Object.entries(exclFreq).filter(([n,f]) => f === 15).map(([n]) => n).sort();
console.log(`\nAlways excluded (15/15): ${alwaysExcl.length}: ${alwaysExcl.join(' ')}`);

// Numbers excluded in 14/15
const almostAlways = Object.entries(exclFreq).filter(([n,f]) => f === 14).map(([n]) => n).sort();
console.log(`Almost always excluded (14/15): ${almostAlways.length}: ${almostAlways.join(' ')}`);

// Numbers excluded in >= 10/15
const highFreq = Object.entries(exclFreq).filter(([n,f]) => f >= 10).sort((a,b) => b[1]-a[1]);
console.log(`\nHigh-frequency excluded (>=10/15): ${highFreq.length} numbers`);
for (const [n,f] of highFreq.slice(0, 30)) {
  const d = [+n[0],+n[1],+n[2]];
  const sum = d[0]+d[1]+d[2];
  const span = Math.max(...d) - Math.min(...d);
  const isBaozi = d[0]===d[1] && d[1]===d[2];
  console.log(`  ${n}: freq=${f} sum=${sum} span=${span} ${isBaozi?'豹子':''}`);
}

console.log('\n\n=== TEST 5: Never-excluded numbers deep analysis ===');
let neverExcl = null;
for (const pp of predPeriods) {
  const s = new Set(allNums.filter(n => preds[pp].has(n)));
  if (neverExcl === null) neverExcl = s;
  else neverExcl = new Set([...neverExcl].filter(n => s.has(n)));
}
console.log('Never excluded:', [...neverExcl].sort().join(' '), `(${neverExcl.size})`);

// What properties do these share?
for (const n of [...neverExcl].sort()) {
  const d = [+n[0],+n[1],+n[2]];
  const sum = d[0]+d[1]+d[2];
  const span = Math.max(...d) - Math.min(...d);
  const sorted = [...d].sort((a,b) => a-b);
  const hAdd = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
  const hSub = [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])];
  console.log(`  ${n}: sorted=[${sorted}] sum=${sum} span=${span} hAdd=[${hAdd}] hSub=[${hSub}]`);
}

// Check: are these 14 numbers special in any way?
// Let me check their digits
const neDigits = new Set();
for (const n of neverExcl) { for (const c of n) neDigits.add(+c); }
console.log('Digits in never-excluded numbers:', [...neDigits].sort());

// Check: what 3-digit combos of these digits are NOT in the never-excluded set?
const neDigitArr = [...neDigits].sort();
const allCombo = [];
for (const a of neDigitArr) for (const b of neDigitArr) for (const c of neDigitArr) allCombo.push(''+a+b+c);
const notInNE = allCombo.filter(n => !neverExcl.has(n));
console.log(`All ${neDigitArr.length}^3=${allCombo.length} combos of these digits, ${notInNE.length} NOT in never-excluded`);
console.log('Not in NE:', notInNE.sort().join(' '));
