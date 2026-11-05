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

// Focus on understanding the REMAINING numbers
// For each period, compute the full known kill set, then analyze what's left
for (const pp of predPeriods.slice(0, 5)) {
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

  // Build comprehensive kill set
  const kill = new Set();

  // Helper: add allIn(pool) numbers
  function addAllIn(pool) {
    const s = new Set(pool);
    for (const n of allNums) {
      const d = [+n[0], +n[1], +n[2]];
      if (d.every(v => s.has(v))) kill.add(n);
    }
  }

  // Helper: add doubleHAdd(pool) numbers
  function addDblHAdd(pool) {
    const s = new Set(pool);
    for (const n of allNums) {
      const d = [+n[0], +n[1], +n[2]];
      if (getHAdd(d).every(v => s.has(v))) kill.add(n);
    }
  }

  // Helper: add doubleHSub(pool) numbers
  function addDblHSub(pool) {
    const s = new Set(pool);
    for (const n of allNums) {
      const d = [+n[0], +n[1], +n[2]];
      if (getHSub(d).every(v => s.has(v))) kill.add(n);
    }
  }

  // Apply all known zero-FP rules
  // From N-1
  addDblHAdd(hAdd1);        // Rule A
  addDblHSub(hSub1);        // Rule B
  addAllIn([...hAdd1, ...hSub1]);  // Rule E
  addDblHAdd([...new Set([...hAdd1, ...hSub1])]); // Rule G
  addAllIn(d1);             // Rule K (allIn result N-1)

  // From N-2
  addDblHAdd(hAdd2);
  addDblHSub(hSub2);
  addAllIn(d2);

  // From N-3
  addDblHAdd(hAdd3);
  addDblHSub(hSub3);
  addAllIn(d3);

  // Cross-period pools
  addDblHAdd([...new Set([...hAdd1, ...hAdd2])]);  // Rule F
  addDblHAdd([...new Set([...hAdd1, ...hAdd3])]);
  addDblHAdd([...new Set([...hAdd2, ...hAdd3])]);
  addDblHAdd([...new Set([...hAdd1, ...hAdd2, ...hAdd3])]);

  addAllIn([...new Set([...hAdd1, ...hAdd2])]);
  addAllIn([...new Set([...hAdd1, ...hAdd3])]);
  addAllIn([...new Set([...hAdd2, ...hAdd3])]);
  addAllIn([...new Set([...hAdd1, ...hAdd2, ...hAdd3])]);

  addAllIn([...new Set([...hSub1, ...hSub2])]);
  addAllIn([...new Set([...hSub1, ...hSub3])]);
  addAllIn([...new Set([...hSub2, ...hSub3])]);
  addAllIn([...new Set([...hSub1, ...hSub2, ...hSub3])]);

  addAllIn([...new Set([...d1, ...d2])]);  // Rule allIn_res(N-1∪N-2)
  addAllIn([...new Set([...d1, ...d3])]);
  addAllIn([...new Set([...d2, ...d3])]);
  addAllIn([...new Set([...d1, ...d2, ...d3])]);

  // Cross hAdd/hSub pools
  addDblHAdd([...new Set([...hSub1, ...hSub2])]);
  addDblHAdd([...new Set([...hSub1, ...hSub2, ...hSub3])]);
  addDblHSub([...new Set([...hAdd1, ...hAdd2])]);
  addDblHSub([...new Set([...hAdd1, ...hAdd2, ...hAdd3])]);

  // Sum kill
  const sumExcl = new Set();
  const sumIncl = new Set();
  for (const n of allNums) {
    const s = (+n[0])+(+n[1])+(+n[2]);
    if (exclSet.has(n)) sumExcl.add(s);
    if (inclSet.has(n)) sumIncl.add(s);
  }
  const sumOnlyExcl = [...sumExcl].filter(s => !sumIncl.has(s));
  for (const n of allNums) {
    const s = (+n[0])+(+n[1])+(+n[2]);
    if (sumOnlyExcl.includes(s)) kill.add(n);
  }

  // Span kill
  const spanExcl = new Set();
  const spanIncl = new Set();
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    const sp = Math.max(...d) - Math.min(...d);
    if (exclSet.has(n)) spanExcl.add(sp);
    if (inclSet.has(n)) spanIncl.add(sp);
  }
  const spanOnlyExcl = [...spanExcl].filter(s => !spanIncl.has(s));
  for (const n of allNums) {
    const d = [+n[0], +n[1], +n[2]];
    const sp = Math.max(...d) - Math.min(...d);
    if (spanOnlyExcl.includes(sp)) kill.add(n);
  }

  const remaining = [...exclSet].filter(n => !kill.has(n));
  const fp = [...kill].filter(n => inclSet.has(n)).length;

  console.log(`\n=== Period ${pp} (excl:${exclSet.size}, kill:${kill.size}, FP:${fp}, remaining:${remaining.length}) ===`);
  console.log(`  N-1=${d1.join('')} N-2=${d2.join('')} N-3=${d3.join('')}`);
  console.log(`  hAdd: [${hAdd1}] [${hAdd2}] [${hAdd3}]`);
  console.log(`  hSub: [${hSub1}] [${hSub2}] [${hSub3}]`);
  console.log(`  sumOnlyExcl: [${sumOnlyExcl}], spanOnlyExcl: [${spanOnlyExcl}]`);

  if (remaining.length > 0) {
    // Analyze remaining numbers
    console.log(`  Remaining ${remaining.length} numbers:`);

    // Check various properties of remaining
    const props = {
      anyHAddIn_hAdd1: 0, anyHAddIn_hSub1: 0, anyHAddIn_hAdd2: 0,
      allHAddIn_hAdd1: 0, allHAddIn_hSub1: 0,
      anyHSubIn_hAdd1: 0, anyHSubIn_hSub1: 0,
      allHSubIn_hAdd1: 0, allHSubIn_hSub1: 0,
      anyDigitIn_d1: 0, anyDigitIn_d2: 0, anyDigitIn_d3: 0,
      allDigitIn_d1: 0, allDigitIn_d2: 0, allDigitIn_d3: 0,
      hasDigit0: 0, hasDigit5: 0,
      sumLE10: 0, sumGE17: 0,
      spanGE7: 0, spanLE2: 0,
    };

    const hAdd1S = new Set(hAdd1), hSub1S = new Set(hSub1);
    const hAdd2S = new Set(hAdd2), hSub2S = new Set(hSub2);
    const d1S = new Set(d1), d2S = new Set(d2), d3S = new Set(d3);

    for (const n of remaining) {
      const d = [+n[0], +n[1], +n[2]];
      const ha = getHAdd(d);
      const hs = getHSub(d);
      const sum = d[0]+d[1]+d[2];
      const span = Math.max(...d)-Math.min(...d);

      if (ha.some(v => hAdd1S.has(v))) props.anyHAddIn_hAdd1++;
      if (ha.some(v => hSub1S.has(v))) props.anyHAddIn_hSub1++;
      if (ha.some(v => hAdd2S.has(v))) props.anyHAddIn_hAdd2++;
      if (ha.every(v => hAdd1S.has(v))) props.allHAddIn_hAdd1++;
      if (ha.every(v => hSub1S.has(v))) props.allHAddIn_hSub1++;
      if (hs.some(v => hAdd1S.has(v))) props.anyHSubIn_hAdd1++;
      if (hs.some(v => hSub1S.has(v))) props.anyHSubIn_hSub1++;
      if (hs.every(v => hAdd1S.has(v))) props.allHSubIn_hAdd1++;
      if (hs.every(v => hSub1S.has(v))) props.allHSubIn_hSub1++;
      if (d.some(v => d1S.has(v))) props.anyDigitIn_d1++;
      if (d.some(v => d2S.has(v))) props.anyDigitIn_d2++;
      if (d.some(v => d3S.has(v))) props.anyDigitIn_d3++;
      if (d.every(v => d1S.has(v))) props.allDigitIn_d1++;
      if (d.every(v => d2S.has(v))) props.allDigitIn_d2++;
      if (d.every(v => d3S.has(v))) props.allDigitIn_d3++;
      if (d.includes(0)) props.hasDigit0++;
      if (d.includes(5)) props.hasDigit5++;
      if (sum <= 10) props.sumLE10++;
      if (sum >= 17) props.sumGE17++;
      if (span >= 7) props.spanGE7++;
      if (span <= 2) props.spanLE2++;
    }

    console.log(`  Properties of remaining ${remaining.length}:`);
    for (const [k,v] of Object.entries(props)) {
      console.log(`    ${k}: ${v} (${(v/remaining.length*100).toFixed(1)}%)`);
    }

    // Now check: what if we add rules based on these properties?
    // Try: remaining have hAdd values that overlap with hAdd2 or hAdd3
    // Rule: doubleHAdd in hAdd(N-2) or hAdd(N-3)
    const beforeSize = kill.size;
    addDblHAdd(hAdd2);
    addDblHAdd(hAdd3);
    addDblHSub(hSub2);
    addDblHSub(hSub3);
    console.log(`  After adding dblHAdd/dblHSub from N-2,N-3: kill=${kill.size} (+${kill.size-beforeSize})`);

    // Try: allIn(hAdd∪hSub from each period)
    const beforeSize2 = kill.size;
    addAllIn([...new Set([...hAdd1, ...hSub1])]);
    addAllIn([...new Set([...hAdd2, ...hSub2])]);
    addAllIn([...new Set([...hAdd3, ...hSub3])]);
    console.log(`  After adding allIn(hAdd∪hSub) each period: kill=${kill.size} (+${kill.size-beforeSize2})`);

    const remaining2 = [...exclSet].filter(n => !kill.has(n));
    const fp2 = [...kill].filter(n => inclSet.has(n)).length;
    console.log(`  New remaining: ${remaining2.length}, FP: ${fp2}`);

    if (remaining2.length > 0 && remaining2.length <= 20) {
      console.log(`  Still remaining: ${remaining2.join(' ')}`);
    }

    // Try more aggressive: doubleHAdd in hAdd∪hSub from each period
    const beforeSize3 = kill.size;
    addDblHAdd([...new Set([...hAdd1, ...hSub1])]);
    addDblHAdd([...new Set([...hAdd2, ...hSub2])]);
    addDblHAdd([...new Set([...hAdd3, ...hSub3])]);
    addDblHSub([...new Set([...hAdd1, ...hSub1])]);
    addDblHSub([...new Set([...hAdd2, ...hSub2])]);
    addDblHSub([...new Set([...hAdd3, ...hSub3])]);
    console.log(`  After adding dblHAdd/dblHSub in hAdd∪hSub: kill=${kill.size} (+${kill.size-beforeSize3})`);

    const remaining3 = [...exclSet].filter(n => !kill.has(n));
    const fp3 = [...kill].filter(n => inclSet.has(n)).length;
    console.log(`  New remaining: ${remaining3.length}, FP: ${fp3}`);

    // Try: allIn(all hAdd + all hSub from 3 periods)
    const beforeSize4 = kill.size;
    const allHAddHSub = new Set([...hAdd1, ...hSub1, ...hAdd2, ...hSub2, ...hAdd3, ...hSub3]);
    addAllIn([...allHAddHSub]);
    addDblHAdd([...allHAddHSub]);
    addDblHSub([...allHAddHSub]);
    console.log(`  After allIn/dblHAdd/dblHSub in ALL hAdd∪hSub: kill=${kill.size} (+${kill.size-beforeSize4})`);

    const remaining4 = [...exclSet].filter(n => !kill.has(n));
    const fp4 = [...kill].filter(n => inclSet.has(n)).length;
    console.log(`  Final remaining: ${remaining4.length}, FP: ${fp4}`);
    if (remaining4.length > 0 && remaining4.length <= 30) {
      console.log(`  Final remaining: ${remaining4.join(' ')}`);
      // Show properties of final remaining
      for (const n of remaining4) {
        const d = [+n[0], +n[1], +n[2]];
        const ha = getHAdd(d);
        const hs = getHSub(d);
        console.log(`    ${n}: d=${d} sum=${d[0]+d[1]+d[2]} span=${Math.max(...d)-Math.min(...d)} hAdd=[${ha}] hSub=[${hs}]`);
      }
    }
  }
}
