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

// FOCUSED TEST: Verify the allIn(hAdd(N-1)) kill rule
console.log('=== VERIFY: allIn(hAdd(N-1)) kill rule ===');
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const idx = periods.indexOf(pp);
  if (idx < 1) continue;
  const p1 = periods[idx-1];
  const hAddN1 = analysis[p1].hAdd;
  const pool = new Set(hAddN1);
  const poolArr = [...pool].sort();

  // allIn: numbers where all digits are in pool
  const allIn = allNums.filter(n => pool.has(+n[0]) && pool.has(+n[1]) && pool.has(+n[2]));
  const allInExcl = allIn.filter(n => !predSet.has(n));
  const allInIncl = allIn.filter(n => predSet.has(n));

  // doubleHAdd: numbers whose hAdd values are all in hAdd(N-1)
  const dblHAdd = allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const h = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
    return h.every(v => pool.has(v));
  });
  const dblExcl = dblHAdd.filter(n => !predSet.has(n));
  const dblIncl = dblHAdd.filter(n => predSet.has(n));

  console.log(`${pp}: N-1=${p1} result=${analysis[p1].digits.join('')} hAdd=[${hAddN1}] pool=[${poolArr}](${pool.size})`);
  console.log(`  allIn: ${allIn.length} total, ${allInExcl.length} excl, ${allInIncl.length} incl`);
  console.log(`  dblHAdd: ${dblHAdd.length} total, ${dblExcl.length} excl, ${dblIncl.length} incl`);
  if (dblIncl.length > 0) console.log(`  dblHAdd INCL: ${dblIncl.sort().join(' ')}`);
  if (dblExcl.length <= 30) console.log(`  dblHAdd EXCL: ${dblExcl.sort().join(' ')}`);
}

// Now let me try to understand the FULL exclusion pattern
// For one period, list ALL excluded numbers and try to find the rule
console.log('\n\n=== DEEP DIVE: Period 26277 (best match period) ===');
const pp = '26277';
const predSet = preds[pp];
const excluded = allNums.filter(n => !predSet.has(n));
const included = allNums.filter(n => predSet.has(n));
const idx = periods.indexOf(pp);
const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];

console.log(`N-1=${p1}(${analysis[p1].digits.join('')}), N-2=${p2}(${analysis[p2].digits.join('')}), N-3=${p3}(${analysis[p3].digits.join('')})`);
console.log(`hAdd: N-1=[${analysis[p1].hAdd}] N-2=[${analysis[p2].hAdd}] N-3=[${analysis[p3].hAdd}]`);
console.log(`hSub: N-1=[${analysis[p1].hSub}] N-2=[${analysis[p2].hSub}] N-3=[${analysis[p3].hSub}]`);
console.log(`pred=${predSet.size}, excl=${excluded.length}`);

// For each excluded number, check multiple properties
const exclProps = excluded.map(n => {
  const d = [+n[0], +n[1], +n[2]];
  const sum = d[0]+d[1]+d[2];
  const span = Math.max(...d) - Math.min(...d);
  const hAdd = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
  const hSub = [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])];
  const hAddSet = new Set(hAdd);
  const hSubSet = new Set(hSub);

  const poolN1 = new Set(analysis[p1].hAdd);
  const poolN2 = new Set(analysis[p2].hAdd);
  const poolN3 = new Set(analysis[p3].hAdd);

  return {
    n, d, sum, span, hAdd, hSub,
    allInN1: d.every(v => poolN1.has(v)),
    allInN2: d.every(v => poolN2.has(v)),
    allInN3: d.every(v => poolN3.has(v)),
    hAddAllInN1: hAdd.every(v => poolN1.has(v)),
    hAddAllInN2: hAdd.every(v => poolN2.has(v)),
    hAddAllInN3: hAdd.every(v => poolN3.has(v)),
    anyDigitInResultN1: d.some(v => analysis[p1].digits.includes(v)),
  };
});

// Count how many excluded numbers satisfy each property
const props = ['allInN1', 'allInN2', 'allInN3', 'hAddAllInN1', 'hAddAllInN2', 'hAddAllInN3', 'anyDigitInResultN1'];
console.log('\nExcluded numbers by property:');
for (const prop of props) {
  const count = exclProps.filter(e => e[prop]).length;
  console.log(`  ${prop}: ${count}/${excluded.length}`);
}

// Union of all kill methods
const anyKill = exclProps.filter(e => e.allInN1 || e.allInN2 || e.allInN3 || e.hAddAllInN1 || e.hAddAllInN2 || e.hAddAllInN3);
console.log(`  UNION: ${anyKill.length}/${excluded.length}`);

// What about the REMAINING excluded numbers?
const remaining = exclProps.filter(e => !e.allInN1 && !e.allInN2 && !e.allInN3 && !e.hAddAllInN1 && !e.hAddAllInN2 && !e.hAddAllInN3);
console.log(`  Remaining: ${remaining.length}`);
if (remaining.length <= 50) {
  console.log(`  Remaining numbers: ${remaining.map(e => e.n).sort().join(' ')}`);

  // What properties do the remaining have?
  console.log('\n  Remaining number details:');
  for (const e of remaining) {
    console.log(`    ${e.n}: sum=${e.sum} span=${e.span} hAdd=[${e.hAdd}] hSub=[${e.hSub}]`);
  }
}

// Let me also check: is the prediction = 1000 - 豹子 - allIn(hAdd(N-1)) - allIn(hAdd(N-2)) - allIn(hAdd(N-3)) - ...?
// Or is there a simpler structure?
console.log('\n\n=== TEST: Prediction as complement of specific kill sets ===');
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const excluded = new Set(allNums.filter(n => !predSet.has(n)));
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;
  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];

  // Kill set: union of allIn(hAdd) from N-1, N-2, N-3
  // PLUS union of allIn(hSub) from N-1, N-2, N-3
  // PLUS union of allIn(result) from N-1, N-2, N-3
  // PLUS 豹子
  const killSet = new Set();
  // 豹子
  for (const n of allNums) if (n[0]===n[1] && n[1]===n[2]) killSet.add(n);
  // allIn per period per source
  for (const p of [p1, p2, p3]) {
    const a = analysis[p];
    const pools = [
      new Set(a.hAdd),
      new Set(a.hSub),
      new Set(a.digits),
    ];
    if (a.vAdd[0] !== null) {
      pools.push(new Set(a.vAdd));
      pools.push(new Set(a.vSub));
    }
    for (const pool of pools) {
      for (const n of allNums) {
        if (pool.has(+n[0]) && pool.has(+n[1]) && pool.has(+n[2])) killSet.add(n);
      }
    }
  }

  const match = [...killSet].filter(n => excluded.has(n)).length;
  const fp = [...killSet].filter(n => !excluded.has(n)).length;
  const remaining = [...excluded].filter(n => !killSet.has(n));

  console.log(`${pp}: killSet=${killSet.size} match=${match}/${excluded.size} (${(match/excluded.size*100).toFixed(1)}%) fp=${fp} remaining=${remaining.length}`);
}

// Let me try: for each remaining excluded number, check if its hAdd transformation
// falls in a DIFFERENT pool
console.log('\n\n=== REMAINING ANALYSIS for period 26277 ===');
{
  const pp = '26277';
  const predSet = preds[pp];
  const excluded = allNums.filter(n => !predSet.has(n));
  const idx = periods.indexOf(pp);
  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];

  // Build the kill set
  const killSet = new Set();
  for (const n of allNums) if (n[0]===n[1] && n[1]===n[2]) killSet.add(n);
  for (const p of [p1, p2, p3]) {
    const a = analysis[p];
    const pools = [new Set(a.hAdd), new Set(a.hSub), new Set(a.digits)];
    if (a.vAdd[0] !== null) { pools.push(new Set(a.vAdd)); pools.push(new Set(a.vSub)); }
    for (const pool of pools) {
      for (const n of allNums) {
        if (pool.has(+n[0]) && pool.has(+n[1]) && pool.has(+n[2])) killSet.add(n);
      }
    }
  }

  const remaining = excluded.filter(n => !killSet.has(n));
  console.log(`Remaining ${remaining.length} numbers:`);
  for (const n of remaining) {
    const d = [+n[0], +n[1], +n[2]];
    const sum = d[0]+d[1]+d[2];
    const span = Math.max(...d) - Math.min(...d);
    const hAdd = [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10];
    const hSub = [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])];
    console.log(`  ${n}: d=[${d}] sum=${sum} span=${span} hAdd=[${hAdd}] hSub=[${hSub}]`);
  }
}
