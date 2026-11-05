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
const predPeriods = Object.keys(preds).sort();
const allNums = [];
for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);

function getHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function getHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function getVAdd(d, pd) { return [(d[0]+pd[0])%10, (d[1]+pd[1])%10, (d[2]+pd[2])%10]; }
function getVSub(d, pd) { return [Math.abs(d[0]-pd[0]), Math.abs(d[1]-pd[1]), Math.abs(d[2]-pd[2])]; }
function digitSum(d) { return d[0]+d[1]+d[2]; }
function digitSumMod10(d) { return (d[0]+d[1]+d[2])%10; }

// For each period, compute remaining excluded numbers not captured by known rules
// Then analyze their properties to find additional rules
for (const pp of predPeriods) {
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;

  const predSet = preds[pp];
  const exclSet = new Set(allNums.filter(n => !predSet.has(n)));
  const inclSet = new Set(allNums.filter(n => predSet.has(n)));

  const r1 = resultMap[periods[idx-1]];
  const r2 = resultMap[periods[idx-2]];
  const r3 = resultMap[periods[idx-3]];
  const d1 = [r1.d1, r1.d2, r1.d3];
  const d2 = [r2.d1, r2.d2, r2.d3];
  const d3 = [r3.d1, r3.d2, r3.d3];

  const hAdd1 = getHAdd(d1), hAdd2 = getHAdd(d2), hAdd3 = getHAdd(d3);
  const hSub1 = getHSub(d1), hSub2 = getHSub(d2), hSub3 = getHSub(d3);
  const vAdd1 = getVAdd(d1, d2), vAdd2 = getVAdd(d2, d3);
  const vSub1 = getVSub(d1, d2), vSub2 = getVSub(d2, d3);

  // Known rules (all have 0 FP)
  const knownKill = new Set();

  // Rule A: doubleHAdd from N-1 (hAdd of number all in hAdd(N-1))
  const hAdd1Set = new Set(hAdd1);
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    const ha = getHAdd(d);
    if (ha.every(v => hAdd1Set.has(v))) knownKill.add(n);
  }

  // Rule B: doubleHSub from N-1
  const hSub1Set = new Set(hSub1);
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    const hs = getHSub(d);
    if (hs.every(v => hSub1Set.has(v))) knownKill.add(n);
  }

  // Rule E: allIn(hAdd∪hSub from N-1)
  const hUnion1 = new Set([...hAdd1, ...hSub1]);
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    if (d.every(v => hUnion1.has(v))) knownKill.add(n);
  }

  // Rule F: doubleHAdd from N-1∪N-2
  const hAddUnion12 = new Set([...hAdd1, ...hAdd2]);
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    const ha = getHAdd(d);
    if (ha.every(v => hAddUnion12.has(v))) knownKill.add(n);
  }

  // Rule G: doubleHAdd in hAdd∪hSub from N-1
  const hAddSubUnion1 = new Set([...hAdd1, ...hSub1]);
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    const ha = getHAdd(d);
    if (ha.every(v => hAddSubUnion1.has(v))) knownKill.add(n);
  }

  // Rule K: allIn(result N-1)
  const res1Set = new Set(d1);
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    if (d.every(v => res1Set.has(v))) knownKill.add(n);
  }

  // Rule L: allIn(hAdd) from 3 periods
  const hAdd2Set = new Set(hAdd2), hAdd3Set = new Set(hAdd3);
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    if (d.every(v => hAdd1Set.has(v)) || d.every(v => hAdd2Set.has(v)) || d.every(v => hAdd3Set.has(v))) knownKill.add(n);
  }

  // Rule M: allIn(hSub) from 3 periods
  const hSub2Set = new Set(hSub2), hSub3Set = new Set(hSub3);
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    if (d.every(v => hSub1Set.has(v)) || d.every(v => hSub2Set.has(v)) || d.every(v => hSub3Set.has(v))) knownKill.add(n);
  }

  // Remaining excluded
  const remaining = [...exclSet].filter(n => !knownKill.has(n));

  // Also try NEW rules and check if they have 0 FP
  const newRules = {};

  // NEW 1: doubleHAdd from N-2
  const hAdd2S = new Set(hAdd2);
  newRules['dblHAdd_N-2'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHAdd(d).every(v => hAdd2S.has(v));
  }));

  // NEW 2: doubleHAdd from N-3
  const hAdd3S = new Set(hAdd3);
  newRules['dblHAdd_N-3'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHAdd(d).every(v => hAdd3S.has(v));
  }));

  // NEW 3: doubleHSub from N-2
  const hSub2S = new Set(hSub2);
  newRules['dblHSub_N-2'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHSub(d).every(v => hSub2S.has(v));
  }));

  // NEW 4: doubleHSub from N-3
  const hSub3S = new Set(hSub3);
  newRules['dblHSub_N-3'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHSub(d).every(v => hSub3S.has(v));
  }));

  // NEW 5: allIn(vAdd(N-1))
  const vAdd1S = new Set(vAdd1);
  newRules['allIn_vAdd_N-1'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => vAdd1S.has(v));
  }));

  // NEW 6: allIn(vSub(N-1))
  const vSub1S = new Set(vSub1);
  newRules['allIn_vSub_N-1'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => vSub1S.has(v));
  }));

  // NEW 7: doubleVAdd from N-1
  newRules['dblVAdd_N-1'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getVAdd(d, d2).every(v => vAdd1S.has(v));
  }));

  // NEW 8: doubleVSub from N-1
  newRules['dblVSub_N-1'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getVSub(d, d2).every(v => vSub1S.has(v));
  }));

  // NEW 9: allIn(vAdd∪vSub from N-1)
  const vUnion1 = new Set([...vAdd1, ...vSub1]);
  newRules['allIn_vAdd∪vSub_N-1'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => vUnion1.has(v));
  }));

  // NEW 10: allIn(result N-2)
  const res2Set = new Set(d2);
  newRules['allIn_result_N-2'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => res2Set.has(v));
  }));

  // NEW 11: allIn(result N-3)
  const res3Set = new Set(d3);
  newRules['allIn_result_N-3'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => res3Set.has(v));
  }));

  // NEW 12: allIn(result N-1 ∪ result N-2)
  const resUnion12 = new Set([...d1, ...d2]);
  newRules['allIn_res(N-1∪N-2)'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => resUnion12.has(v));
  }));

  // NEW 13: all digits in all hAdd pools from 3 periods
  const allHAddDigits = new Set([...hAdd1, ...hAdd2, ...hAdd3]);
  newRules['allIn_allHAdd'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => allHAddDigits.has(v));
  }));

  // NEW 14: all digits in all hSub pools from 3 periods
  const allHSubDigits = new Set([...hSub1, ...hSub2, ...hSub3]);
  newRules['allIn_allHSub'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => allHSubDigits.has(v));
  }));

  // NEW 15: doubleHAdd in hAdd(N-2)
  newRules['dblHAdd_in_hAdd_N-2'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHAdd(d).every(v => hAdd2S.has(v));
  }));

  // NEW 16: allIn(hAdd(N-1) ∪ hAdd(N-2) ∪ hAdd(N-3))
  newRules['allIn_hAdd_3union'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => allHAddDigits.has(v));
  }));

  // NEW 17: sum-based kills
  // Check: are certain digit sums always excluded?
  const sumExcl = new Set();
  const sumIncl = new Set();
  for (const n of allNums) {
    const s = digitSum([+n[0], +n[1], +n[2]]);
    if (exclSet.has(n)) sumExcl.add(s);
    if (inclSet.has(n)) sumIncl.add(s);
  }
  const sumOnlyExcl = [...sumExcl].filter(s => !sumIncl.has(s));
  // Kill numbers whose sum is in sumOnlyExcl
  newRules['sumKill'] = new Set(allNums.filter(n => {
    const s = digitSum([+n[0], +n[1], +n[2]]);
    return sumOnlyExcl.includes(s);
  }));

  // NEW 18: span-based kills
  const spanExcl = new Set();
  const spanIncl = new Set();
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    const sp = Math.max(...d) - Math.min(...d);
    if (exclSet.has(n)) spanExcl.add(sp);
    if (inclSet.has(n)) spanIncl.add(sp);
  }
  const spanOnlyExcl = [...spanExcl].filter(s => !spanIncl.has(s));
  newRules['spanKill'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const sp = Math.max(...d) - Math.min(...d);
    return spanOnlyExcl.includes(sp);
  }));

  // NEW 19: digitSumMod10 in hAdd(N-1) set
  newRules['digiSumMod10_in_hAdd1'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return hAdd1Set.has(digitSumMod10(d));
  }));

  // NEW 20: number's hAdd values all in ALL analysis values from N-1
  const allAnalysis1 = new Set([...hAdd1, ...hSub1, ...vAdd1, ...vSub1]);
  newRules['dblHAdd_in_allAnalysis_N-1'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHAdd(d).every(v => allAnalysis1.has(v));
  }));

  // NEW 21: allIn(allAnalysis from N-1)
  newRules['allIn_allAnalysis_N-1'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => allAnalysis1.has(v));
  }));

  // NEW 22: doubleHSub in hSub(N-2)
  newRules['dblHSub_in_hSub_N-2'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHSub(d).every(v => hSub2S.has(v));
  }));

  // NEW 23: doubleHAdd in hAdd(N-1)∪hAdd(N-2)
  newRules['dblHAdd_in_hAdd_12'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHAdd(d).every(v => hAddUnion12.has(v));
  }));

  // NEW 24: allIn(hAdd∪hSub from N-2)
  const hUnion2 = new Set([...hAdd2, ...hSub2]);
  newRules['allIn_hAdd∪hSub_N-2'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => hUnion2.has(v));
  }));

  // NEW 25: allIn(hAdd∪hSub from N-3)
  const hUnion3 = new Set([...hAdd3, ...hSub3]);
  newRules['allIn_hAdd∪hSub_N-3'] = new Set(allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => hUnion3.has(v));
  }));

  // Check each new rule for FP and coverage of remaining
  console.log(`\n=== Period ${pp} (excl:${exclSet.size}, knownKill:${knownKill.size}, remaining:${remaining.length}) ===`);
  console.log(`  N-1=${periods[idx-1]}(${d1.join('')}) hAdd=${hAdd1} hSub=${hSub1} vAdd=${vAdd1} vSub=${vSub1}`);

  let bestNewRules = [];
  for (const [name, ruleSet] of Object.entries(newRules)) {
    const fp = [...ruleSet].filter(n => inclSet.has(n)).length;
    const tp = [...ruleSet].filter(n => exclSet.has(n)).length;
    const remainingHit = [...ruleSet].filter(n => !knownKill.has(n) && exclSet.has(n)).length;
    if (fp === 0 && remainingHit > 0) {
      bestNewRules.push({name, tp, remainingHit, total: ruleSet.size});
    }
    if (fp > 0 && tp > 0) {
      // Rules with some FP but also some new coverage
    }
  }
  bestNewRules.sort((a,b) => b.remainingHit - a.remainingHit);
  console.log(`  Zero-FP new rules covering remaining:`);
  for (const r of bestNewRules) {
    console.log(`    ${r.name}: ${r.remainingHit} new (total ${r.total})`);
  }

  // Now try combining all zero-FP new rules with known
  const allZeroFP = new Set(knownKill);
  for (const [name, ruleSet] of Object.entries(newRules)) {
    const fp = [...ruleSet].filter(n => inclSet.has(n)).length;
    if (fp === 0) {
      for (const n of ruleSet) allZeroFP.add(n);
    }
  }
  const stillRemaining = [...exclSet].filter(n => !allZeroFP.has(n));
  console.log(`  After ALL zero-FP rules: ${allZeroFP.size} kill, ${stillRemaining.length} remaining`);

  // Show some remaining numbers
  if (stillRemaining.length > 0 && stillRemaining.length <= 30) {
    console.log(`  Remaining: ${stillRemaining.join(' ')}`);
  } else if (stillRemaining.length > 30) {
    console.log(`  Remaining (first 30): ${stillRemaining.slice(0, 30).join(' ')}`);
  }

  // Analyze remaining: what properties do they share?
  if (stillRemaining.length > 0) {
    const remSumDist = new Array(28).fill(0);
    const remSpanDist = new Array(10).fill(0);
    const remOE = {};
    for (const n of stillRemaining) {
      const d = [+n[0], +n[1], +n[2]];
      remSumDist[digitSum(d)]++;
      remSpanDist[Math.max(...d) - Math.min(...d)]++;
      const oe = d.map(x => x%2===0?'E':'O').join('');
      remOE[oe] = (remOE[oe]||0) + 1;
    }
    console.log(`  Remaining sum dist: ${remSumDist.map((v,i)=>v>0?`${i}:${v}`:null).filter(Boolean).join(' ')}`);
    console.log(`  Remaining span dist: ${remSpanDist.map((v,i)=>v>0?`${i}:${v}`:null).filter(Boolean).join(' ')}`);
    console.log(`  Remaining OE: ${JSON.stringify(remOE)}`);

    // Check: do remaining have hAdd values that overlap with any analysis pool?
    const remHAddOverlap = stillRemaining.filter(n => {
      const d = [+n[0], +n[1], +n[2]];
      const ha = getHAdd(d);
      // Does at least one hAdd value fall in hAdd1∪hSub1?
      return ha.some(v => hUnion1.has(v));
    });
    console.log(`  Remaining with hAdd≥1 in hAdd∪hSub(N-1): ${remHAddOverlap.length}/${stillRemaining.length}`);
  }
}
