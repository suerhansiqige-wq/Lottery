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

function getHAdd(d1,d2,d3) { return [(d1+d2)%10, (d2+d3)%10, (d3+d1)%10]; }
function getHSub(d1,d2,d3) { return [Math.abs(d1-d2), Math.abs(d2-d3), Math.abs(d3-d1)]; }
function getVAdd(r, prev) { return prev ? [(r.d1+prev.d1)%10, (r.d2+prev.d2)%10, (r.d3+prev.d3)%10] : null; }
function getVSub(r, prev) { return prev ? [Math.abs(r.d1-prev.d1), Math.abs(r.d2-prev.d2), Math.abs(r.d3-prev.d3)] : null; }

// For each prediction period, compute various transforms and check which ones are excluded
for (const pp of predPeriods.slice(0, 5)) {
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;

  const predSet = preds[pp];
  const excluded = allNums.filter(n => !predSet.has(n));
  const included = allNums.filter(n => predSet.has(n));

  const r1 = resultMap[periods[idx-1]];
  const r2 = resultMap[periods[idx-2]];
  const r3 = resultMap[periods[idx-3]];

  const hAdd1 = getHAdd(r1.d1, r1.d2, r1.d3);
  const hAdd2 = getHAdd(r2.d1, r2.d2, r2.d3);
  const hAdd3 = getHAdd(r3.d1, r3.d2, r3.d3);
  const hSub1 = getHSub(r1.d1, r1.d2, r1.d3);
  const hSub2 = getHSub(r2.d1, r2.d2, r2.d3);
  const hSub3 = getHSub(r3.d1, r3.d2, r3.d3);
  const vAdd1 = getVAdd(r1, r2);
  const vAdd2 = getVAdd(r2, r3);
  const vSub1 = getVSub(r1, r2);
  const vSub2 = getVSub(r2, r3);

  console.log(`\n=== Period ${pp} (pred:${predSet.size}, excl:${excluded.length}) ===`);
  console.log(`  N-1=${periods[idx-1]}(${r1.d1}${r1.d2}${r1.d3}) N-2=${periods[idx-2]}(${r2.d1}${r2.d2}${r2.d3}) N-3=${periods[idx-3]}(${r3.d1}${r3.d2}${r3.d3})`);
  console.log(`  hAdd: [${hAdd1}] [${hAdd2}] [${hAdd3}]`);
  console.log(`  hSub: [${hSub1}] [${hSub2}] [${hSub3}]`);
  if (vAdd1) console.log(`  vAdd: [${vAdd1}] [${vAdd2||[]}]`);
  if (vSub1) console.log(`  vSub: [${vSub1}] [${vSub2||[]}]`);

  // Test: for each excluded number, check if its hAdd has ANY digit in hAdd(N-1)
  const hAdd1Set = new Set(hAdd1);
  const hAdd2Set = new Set(hAdd2);
  const hAdd3Set = new Set(hAdd3);
  const hSub1Set = new Set(hSub1);
  const hSub2Set = new Set(hSub2);
  const hSub3Set = new Set(hSub3);

  // RULE A: number's hAdd has ALL digits in hAdd(N-1) pool (doubleHAdd - already confirmed)
  const ruleA = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const ha = getHAdd(d[0], d[1], d[2]);
    return ha.every(v => hAdd1Set.has(v));
  }));

  // RULE B: number's hSub has ALL digits in hSub(N-1) pool
  const ruleB = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const hs = getHSub(d[0], d[1], d[2]);
    return hs.every(v => hSub1Set.has(v));
  }));

  // RULE C: number's hAdd has ALL digits in hSub(N-1) pool (cross)
  const ruleC = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const ha = getHAdd(d[0], d[1], d[2]);
    return ha.every(v => hSub1Set.has(v));
  }));

  // RULE D: number's hSub has ALL digits in hAdd(N-1) pool (cross)
  const ruleD = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const hs = getHSub(d[0], d[1], d[2]);
    return hs.every(v => hAdd1Set.has(v));
  }));

  // RULE E: number's digits ALL in hAdd(N-1) ∪ hSub(N-1)
  const hUnion1 = new Set([...hAdd1, ...hSub1]);
  const ruleE = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => hUnion1.has(v));
  }));

  // RULE F: number's hAdd ALL in hAdd(N-1) ∪ hAdd(N-2)
  const hAddUnion2 = new Set([...hAdd1, ...hAdd2]);
  const ruleF = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const ha = getHAdd(d[0], d[1], d[2]);
    return ha.every(v => hAddUnion2.has(v));
  }));

  // RULE G: number's hAdd ALL in hAdd(N-1) ∪ hSub(N-1)
  const hAddSubUnion1 = new Set([...hAdd1, ...hSub1]);
  const ruleG = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const ha = getHAdd(d[0], d[1], d[2]);
    return ha.every(v => hAddSubUnion1.has(v));
  }));

  // RULE H: number's vAdd ALL in vAdd(N-1) pool
  if (vAdd1 && vAdd2) {
    const vAdd1Set = new Set(vAdd1);
    const ruleH = excluded.filter(n => {
      const d = [+n[0], +n[1], +n[2]];
      const va = getVAdd(d[0], d[1], d[2], n); // need prev for vAdd...
      // Actually vAdd needs a "previous period" concept - for a static number it doesn't apply
      // Skip vAdd for now
      return false;
    });
  }

  // RULE I: number's hAdd has ≥2 digits in hAdd(N-1)
  const ruleI = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const ha = getHAdd(d[0], d[1], d[2]);
    return ha.filter(v => hAdd1Set.has(v)).length >= 2;
  }));

  // RULE J: number's hAdd has ≥1 digit in hAdd(N-1) AND ≥1 in hSub(N-1)
  const ruleJ = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    const ha = getHAdd(d[0], d[1], d[2]);
    return ha.some(v => hAdd1Set.has(v)) && ha.some(v => hSub1Set.has(v));
  }));

  // RULE K: allIn(result(N-1)) - digits all in result digits
  const res1Set = new Set([r1.d1, r1.d2, r1.d3]);
  const ruleK = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => res1Set.has(v));
  }));

  // RULE L: allIn(hAdd(N-1)) + allIn(hAdd(N-2)) + allIn(hAdd(N-3))
  const ruleL = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => hAdd1Set.has(v)) || d.every(v => hAdd2Set.has(v)) || d.every(v => hAdd3Set.has(v));
  }));

  // RULE M: allIn(hSub(N-1)) from 3 periods
  const ruleM = new Set(excluded.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(v => hSub1Set.has(v)) || d.every(v => hSub2Set.has(v)) || d.every(v => hSub3Set.has(v));
  }));

  // RULE N: sum-based - exclude if sum in certain set
  const exclSums = new Set(excluded.map(n => (+n[0])+(+n[1])+(+n[2])));
  const inclSums = new Set(included.map(n => (+n[0])+(+n[1])+(+n[2])));
  const sumOnlyExcl = [...exclSums].filter(s => !inclSums.has(s));

  // Print results
  const exclSet = new Set(excluded);
  console.log(`  Rule A (dblHAdd N-1): ${ruleA.size} / ${excluded.length}`);
  console.log(`  Rule B (dblHSub N-1): ${ruleB.size} / ${excluded.length}`);
  console.log(`  Rule C (hAdd allIn hSub N-1): ${ruleC.size}`);
  console.log(`  Rule D (hSub allIn hAdd N-1): ${ruleD.size}`);
  console.log(`  Rule E (allIn hAdd∪hSub N-1): ${ruleE.size}`);
  console.log(`  Rule F (dblHAdd N-1∪N-2): ${ruleF.size}`);
  console.log(`  Rule G (dblHAdd hAdd∪hSub N-1): ${ruleG.size}`);
  console.log(`  Rule I (hAdd ≥2 in hAdd(N-1)): ${ruleI.size}`);
  console.log(`  Rule J (hAdd ≥1 hAdd + ≥1 hSub): ${ruleJ.size}`);
  console.log(`  Rule K (allIn result N-1): ${ruleK.size}`);
  console.log(`  Rule L (allIn hAdd 3periods): ${ruleL.size}`);
  console.log(`  Rule M (allIn hSub 3periods): ${ruleM.size}`);

  // Union of all rules so far
  const allRules = new Set([...ruleA, ...ruleB, ...ruleE, ...ruleF, ...ruleG, ...ruleI, ...ruleJ, ...ruleK, ...ruleL, ...ruleM]);
  console.log(`  UNION ALL RULES: ${allRules.size} / ${excluded.length}`);

  // Check false positives (in included set)
  const fp = [...allRules].filter(n => !exclSet.has(n)).length;
  console.log(`  False positives: ${fp}`);

  // Sum-only excluded
  console.log(`  Sums only in excluded: [${sumOnlyExcl.sort((a,b)=>a-b).join(',')}]`);

  // What about: the number's OWN hAdd/hSub values match some pattern?
  // Let me check: for excluded numbers, what are their hAdd values?
  // And for included numbers, what are their hAdd values?
  // If there's a clean separation, we found the rule

  // Check: per-position kill using hAdd from N-1
  // hAdd(N-1) = [h0, h1, h2] - kill digit h_i at position i
  const posKill_hAdd1 = excluded.filter(n => {
    return +n[0] === hAdd1[0] || +n[1] === hAdd1[1] || +n[2] === hAdd1[2];
  });
  console.log(`  PosKill hAdd(N-1): ${posKill_hAdd1.length} / ${excluded.length}`);

  // Check: per-position kill using hSub from N-1
  const posKill_hSub1 = excluded.filter(n => {
    return +n[0] === hSub1[0] || +n[1] === hSub1[1] || +n[2] === hSub1[2];
  });
  console.log(`  PosKill hSub(N-1): ${posKill_hSub1.length} / ${excluded.length}`);

  // Combined per-position kill from all transforms of N-1
  const killDigits = {
    0: new Set([hAdd1[0], hSub1[0], ...(vAdd1||[]), ...(vSub1||[])]),
    1: new Set([hAdd1[1], hSub1[1], ...(vAdd1||[]), ...(vSub1||[])]),
    2: new Set([hAdd1[2], hSub1[2], ...(vAdd1||[]), ...(vSub1||[])]),
  };
  const posKillAll = excluded.filter(n => {
    return killDigits[0].has(+n[0]) || killDigits[1].has(+n[1]) || killDigits[2].has(+n[2]);
  });
  console.log(`  PosKill ALL N-1: ${posKillAll.length} / ${excluded.length}`);

  // Per-position kill from 3 periods combined
  const kill3 = {
    0: new Set(),
    1: new Set(),
    2: new Set(),
  };
  for (const ha of [hAdd1, hAdd2, hAdd3]) {
    kill3[0].add(ha[0]); kill3[1].add(ha[1]); kill3[2].add(ha[2]);
  }
  for (const hs of [hSub1, hSub2, hSub3]) {
    kill3[0].add(hs[0]); kill3[1].add(hs[1]); kill3[2].add(hs[2]);
  }
  if (vAdd1) { kill3[0].add(vAdd1[0]); kill3[1].add(vAdd1[1]); kill3[2].add(vAdd1[2]); }
  if (vAdd2) { kill3[0].add(vAdd2[0]); kill3[1].add(vAdd2[1]); kill3[2].add(vAdd2[2]); }
  if (vSub1) { kill3[0].add(vSub1[0]); kill3[1].add(vSub1[1]); kill3[2].add(vSub1[2]); }
  if (vSub2) { kill3[0].add(vSub2[0]); kill3[1].add(vSub2[1]); kill3[2].add(vSub2[2]); }

  console.log(`  Kill digits 3periods: pos0=[${[...kill3[0]].sort()}] pos1=[${[...kill3[1]].sort()}] pos2=[${[...kill3[2]].sort()}]`);
  const posKill3 = allNums.filter(n => {
    return kill3[0].has(+n[0]) || kill3[1].has(+n[1]) || kill3[2].has(+n[2]);
  });
  const posKill3Excl = posKill3.filter(n => exclSet.has(n));
  const posKill3Incl = posKill3.filter(n => !exclSet.has(n));
  console.log(`  PosKill 3periods: ${posKill3.length} total, ${posKill3Excl.length} match excl, ${posKill3Incl.length} FP`);

  // Remaining after posKill3
  const remaining = excluded.filter(n => !kill3[0].has(+n[0]) && !kill3[1].has(+n[1]) && !kill3[2].has(+n[2]));
  console.log(`  Remaining after posKill3: ${remaining.length}`);

  // What if we combine posKill3 with the set-based rules?
  const combined = new Set([...posKill3.filter(n => exclSet.has(n)), ...allRules]);
  console.log(`  Combined posKill3+rules: ${combined.size} / ${excluded.length}, FP: ${[...combined].filter(n => !exclSet.has(n)).length}`);
}

// Now let me try a completely different approach:
// Look at the PREDICTED numbers and see what they have in common
console.log('\n\n=== ANALYZING PREDICTED NUMBERS ===');
for (const pp of predPeriods.slice(0, 3)) {
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;

  const predSet = preds[pp];
  const included = allNums.filter(n => predSet.has(n));

  const r1 = resultMap[periods[idx-1]];
  const r2 = resultMap[periods[idx-2]];
  const r3 = resultMap[periods[idx-3]];

  console.log(`\n=== Period ${pp} (included: ${included.length}) ===`);

  // Check: do all included numbers have their hAdd values in some specific set?
  const inclHAdds = included.map(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHAdd(d[0], d[1], d[2]);
  });

  // What digit values appear in hAdd of included numbers?
  const hAddDigits = new Set();
  for (const ha of inclHAdds) {
    for (const v of ha) hAddDigits.add(v);
  }
  console.log(`  hAdd digits in included: [${[...hAddDigits].sort().join(',')}] (count: ${hAddDigits.size})`);

  // What about hSub?
  const inclHSubs = included.map(n => {
    const d = [+n[0], +n[1], +n[2]];
    return getHSub(d[0], d[1], d[2]);
  });
  const hSubDigits = new Set();
  for (const hs of inclHSubs) {
    for (const v of hs) hSubDigits.add(v);
  }
  console.log(`  hSub digits in included: [${[...hSubDigits].sort().join(',')}] (count: ${hSubDigits.size})`);

  // Check: what's the digit frequency at each position in included numbers?
  const posFreq = [{},{},{}];
  for (const n of included) {
    for (let p = 0; p < 3; p++) {
      posFreq[p][n[p]] = (posFreq[p][n[p]] || 0) + 1;
    }
  }
  console.log(`  Pos0 freq: ${JSON.stringify(posFreq[0])}`);
  console.log(`  Pos1 freq: ${JSON.stringify(posFreq[1])}`);
  console.log(`  Pos2 freq: ${JSON.stringify(posFreq[2])}`);

  // Check: which digits are MISSING from each position?
  for (let p = 0; p < 3; p++) {
    const missing = [];
    for (let d = 0; d <= 9; d++) {
      if (!posFreq[p][d]) missing.push(d);
    }
    if (missing.length > 0) console.log(`  Pos${p} missing digits: [${missing}]`);
  }
}
