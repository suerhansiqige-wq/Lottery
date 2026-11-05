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
  analysis[p] = {hAdd, hSub, vAdd, vSub, shenghao: sheng, lianhao: [...lian], bichu, result: r, digits: [r.d1, r.d2, r.d3]};
  prevG2 = g2;
}

const allNums = [];
for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);
const predPeriods = Object.keys(preds).sort();

// TEST: For each excluded number, compute ITS OWN hAdd and check if allIn(hAdd(N-1))
console.log('=== TEST: hAdd transformation of excluded numbers ===');
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const excluded = allNums.filter(n => !predSet.has(n));
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;
  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];

  // For each excluded number, compute its hAdd
  // Check if all 3 hAdd values are in hAdd(N-1)
  const hAddN1 = new Set(analysis[p1].hAdd);
  const hSubN1 = new Set(analysis[p1].hSub);
  const hAddN2 = new Set(analysis[p2].hAdd);
  const hAddN3 = new Set(analysis[p3].hAdd);
  const resultN1 = new Set(analysis[p1].digits);

  // Also check: is the number's hAdd in the UNION of hAdd from 3 periods?
  const hAddUnion = new Set([...analysis[p1].hAdd, ...analysis[p2].hAdd, ...analysis[p3].hAdd]);
  const hSubUnion = new Set([...analysis[p1].hSub, ...analysis[p2].hSub, ...analysis[p3].hSub]);
  const allAnalysisUnion = new Set([
    ...analysis[p1].hAdd, ...analysis[p1].hSub,
    ...analysis[p2].hAdd, ...analysis[p2].hSub,
    ...analysis[p3].hAdd, ...analysis[p3].hSub,
  ]);

  let countHAddN1 = 0, countHAddUnion = 0, countAllUnion = 0;
  let countHAddN1OrHSubN1 = 0;

  for (const n of excluded) {
    const d = [+n[0], +n[1], +n[2]];
    const nhAdd = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];

    // Check: all nhAdd values in hAdd(N-1)?
    if (nhAdd.every(v => hAddN1.has(v))) countHAddN1++;
    // Check: all nhAdd values in hAdd(3 periods union)?
    if (nhAdd.every(v => hAddUnion.has(v))) countHAddUnion++;
    // Check: all nhAdd values in all analysis union?
    if (nhAdd.every(v => allAnalysisUnion.has(v))) countAllUnion++;
    // Check: all nhAdd in hAdd(N-1) OR all nhAdd in hSub(N-1)?
    if (nhAdd.every(v => hAddN1.has(v)) || nhAdd.every(v => hSubN1.has(v))) countHAddN1OrHSubN1++;
  }

  // Also check for INCLUDED numbers
  let inclHAddN1 = 0, inclHAddUnion = 0, inclAllUnion = 0;
  const included = allNums.filter(n => predSet.has(n));
  for (const n of included) {
    const d = [+n[0], +n[1], +n[2]];
    const nhAdd = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
    if (nhAdd.every(v => hAddN1.has(v))) inclHAddN1++;
    if (nhAdd.every(v => hAddUnion.has(v))) inclHAddUnion++;
    if (nhAdd.every(v => allAnalysisUnion.has(v))) inclAllUnion++;
  }

  console.log(`${pp} (excl=${excluded.length}):`);
  console.log(`  hAdd∈hAdd(N-1): excl=${countHAddN1} incl=${inclHAddN1}`);
  console.log(`  hAdd∈hAdd(3p): excl=${countHAddUnion} incl=${inclHAddUnion}`);
  console.log(`  hAdd∈allAnalysis(3p): excl=${countAllUnion} incl=${inclAllUnion}`);
  console.log(`  hAdd∈hAdd(N-1) OR hAdd∈hSub(N-1): excl=${countHAddN1OrHSubN1}`);
}

// TEST: Check if excluded numbers have their hAdd allIn(hAdd(N-1)∪hAdd(N-2)∪hAdd(N-3))
// AND check other transformations
console.log('\n\n=== TEST: Multiple transformation checks ===');
for (const pp of predPeriods.slice(0, 5)) {
  const predSet = preds[pp];
  const excluded = allNums.filter(n => !predSet.has(n));
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;
  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];

  // Pool: union of hAdd from 3 periods
  const pool = new Set([...analysis[p1].hAdd, ...analysis[p2].hAdd, ...analysis[p3].hAdd]);
  const poolArr = [...pool].sort();

  // allIn(pool) - numbers where all digits are in the pool
  const allInPool = allNums.filter(n => pool.has(+n[0]) && pool.has(+n[1]) && pool.has(+n[2]));
  const allInPoolExcl = allInPool.filter(n => !predSet.has(n));

  // hAdd allIn(pool) - numbers where all hAdd values are in the pool
  const hAddAllInPool = allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const h = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
    return h.every(v => pool.has(v));
  });
  const hAddAllInPoolExcl = hAddAllInPool.filter(n => !predSet.has(n));
  const hAddAllInPoolIncl = hAddAllInPool.filter(n => predSet.has(n));

  // hSub allIn(pool)
  const hSubAllInPool = allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const h = [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])];
    return h.every(v => pool.has(v));
  });
  const hSubAllInPoolExcl = hSubAllInPool.filter(n => !predSet.has(n));

  // Combined: allIn(pool) ∪ hAddAllIn(pool) ∪ hSubAllIn(pool)
  const combined = new Set([...allInPool, ...hAddAllInPool, ...hSubAllInPool]);
  const combinedExcl = [...combined].filter(n => !predSet.has(n));

  // Also try: pool = hAdd∪hSub from 3 periods
  const pool2 = new Set([...analysis[p1].hAdd, ...analysis[p1].hSub,
    ...analysis[p2].hAdd, ...analysis[p2].hSub,
    ...analysis[p3].hAdd, ...analysis[p3].hSub]);
  const allInPool2 = allNums.filter(n => pool2.has(+n[0]) && pool2.has(+n[1]) && pool2.has(+n[2]));
  const hAddAllInPool2 = allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const h = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
    return h.every(v => pool2.has(v));
  });
  const combined2 = new Set([...allInPool2, ...hAddAllInPool2]);
  const combined2Excl = [...combined2].filter(n => !predSet.has(n));

  console.log(`\n${pp} (excl=${excluded.length}):`);
  console.log(`  pool(hAdd 3p)=[${poolArr}](${pool.size})`);
  console.log(`  allIn(pool): ${allInPool.length} total, ${allInPoolExcl.length} excl`);
  console.log(`  hAddAllIn(pool): ${hAddAllInPool.length} total, ${hAddAllInPoolExcl} excl, ${hAddAllInPoolIncl} incl`);
  console.log(`  hSubAllIn(pool): ${hSubAllInPool.length} total, ${hSubAllInPoolExcl} excl`);
  console.log(`  combined(allIn∪hAddAllIn∪hSubAllIn): ${combined.size} total, ${combinedExcl.length} excl`);
  console.log(`  pool2(hAdd∪hSub 3p)=(${pool2.size})`);
  console.log(`  allIn(pool2): ${allInPool2.length}, hAddAllIn(pool2): ${hAddAllInPool2.length}`);
  console.log(`  combined2: ${combined2.size} total, ${combined2Excl} excl`);

  // What about: hAdd of number allIn(hAdd(N-1))
  // This is the "double hAdd" check
  const hAddN1 = new Set(analysis[p1].hAdd);
  const doubleHAdd = allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const h = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
    return h.every(v => hAddN1.has(v));
  });
  const dblExcl = doubleHAdd.filter(n => !predSet.has(n));
  const dblIncl = doubleHAdd.filter(n => predSet.has(n));
  console.log(`  doubleHAdd(N-1): ${doubleHAdd.length} total, ${dblExcl} excl, ${dblIncl} incl`);
}

// TEST: Check if the prediction = all 1000 numbers minus:
// 1. 豹子
// 2. Numbers where all digits are in allIn(hAdd(N-1)) pool
// 3. Numbers where all digits are in allIn(hAdd(N-2)) pool
// 4. Numbers where all digits are in allIn(hAdd(N-3)) pool
// 5. Additional pruning based on other criteria
console.log('\n\n=== TEST: Systematic kill method combination ===');
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const excluded = new Set(allNums.filter(n => !predSet.has(n)));
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;
  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];

  // Kill method 1: 豹子
  const baozi = new Set(allNums.filter(n => n[0]===n[1] && n[1]===n[2]));

  // Kill method 2: allIn(hAdd) from each period
  const kill_hAdd = new Set();
  for (const p of [p1, p2, p3]) {
    const pool = new Set(analysis[p].hAdd);
    for (const n of allNums) {
      if (pool.has(+n[0]) && pool.has(+n[1]) && pool.has(+n[2])) kill_hAdd.add(n);
    }
  }

  // Kill method 3: allIn(hSub) from each period
  const kill_hSub = new Set();
  for (const p of [p1, p2, p3]) {
    const pool = new Set(analysis[p].hSub);
    for (const n of allNums) {
      if (pool.has(+n[0]) && pool.has(+n[1]) && pool.has(+n[2])) kill_hSub.add(n);
    }
  }

  // Kill method 4: allIn(result) from each period
  const kill_result = new Set();
  for (const p of [p1, p2, p3]) {
    const pool = new Set(analysis[p].digits);
    for (const n of allNums) {
      if (pool.has(+n[0]) && pool.has(+n[1]) && pool.has(+n[2])) kill_result.add(n);
    }
  }

  // Kill method 5: allIn(hAdd∪hSub) from each period
  const kill_hUnion = new Set();
  for (const p of [p1, p2, p3]) {
    const pool = new Set([...analysis[p].hAdd, ...analysis[p].hSub]);
    for (const n of allNums) {
      if (pool.has(+n[0]) && pool.has(+n[1]) && pool.has(+n[2])) kill_hUnion.add(n);
    }
  }

  // Kill method 6: hAdd transformation allIn(hAdd(N-1))
  const kill_doubleHAdd = new Set();
  for (const p of [p1, p2, p3]) {
    const targetPool = new Set(analysis[p].hAdd);
    for (const n of allNums) {
      const d = [+n[0], +n[1], +n[2]];
      const h = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
      if (h.every(v => targetPool.has(v))) kill_doubleHAdd.add(n);
    }
  }

  // Try combinations
  const combos = {
    'A': new Set([...baozi, ...kill_hAdd]),
    'B': new Set([...baozi, ...kill_hAdd, ...kill_hSub]),
    'C': new Set([...baozi, ...kill_hAdd, ...kill_result]),
    'D': new Set([...baozi, ...kill_hAdd, ...kill_hSub, ...kill_result]),
    'E': new Set([...baozi, ...kill_hUnion]),
    'F': new Set([...baozi, ...kill_hUnion, ...kill_result]),
    'G': new Set([...baozi, ...kill_doubleHAdd]),
    'H': new Set([...baozi, ...kill_hAdd, ...kill_doubleHAdd]),
    'I': new Set([...baozi, ...kill_hAdd, ...kill_hSub, ...kill_doubleHAdd]),
    'J': new Set([...kill_hAdd, ...kill_hSub, ...kill_result, ...kill_doubleHAdd]),
  };

  const bestMatch = {name: '', match: 0, size: 0};
  for (const [name, killSet] of Object.entries(combos)) {
    const match = [...killSet].filter(n => excluded.has(n)).length;
    const falsePositive = [...killSet].filter(n => !excluded.has(n)).length;
    if (match > bestMatch.match) {
      bestMatch.name = name;
      bestMatch.match = match;
      bestMatch.size = killSet.size;
      bestMatch.fp = falsePositive;
    }
  }

  console.log(`${pp} (excl=${excluded.size}): best=${bestMatch.name} size=${bestMatch.size} match=${bestMatch.match}/${excluded.size} (${(bestMatch.match/excluded.size*100).toFixed(1)}%) fp=${bestMatch.fp}`);

  // Show details for top combos
  for (const [name, killSet] of Object.entries(combos)) {
    const match = [...killSet].filter(n => excluded.has(n)).length;
    const fp = [...killSet].filter(n => !excluded.has(n)).length;
    console.log(`  ${name}: size=${killSet.size} match=${match} fp=${fp}`);
  }
}
