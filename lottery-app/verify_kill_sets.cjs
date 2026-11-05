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

// For each prediction period, check: are all numbers formed from N-1 hAdd digits excluded?
console.log('=== TEST: allIn(hAdd) from various periods ===');
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const excluded = new Set(allNums.filter(n => !predSet.has(n)));
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;

  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];

  // For each source period, check allIn(hAdd), allIn(hSub), allIn(vAdd), allIn(vSub), allIn(result)
  const sources = {
    'N-1': analysis[p1],
    'N-2': analysis[p2],
    'N-3': analysis[p3],
  };

  console.log(`\n${pp} (pred=${predSet.size}, excl=${excluded.size}):`);

  for (const [label, src] of Object.entries(sources)) {
    const pools = {
      'hAdd': new Set(src.hAdd),
      'hSub': new Set(src.hSub),
      'result': new Set(src.digits),
    };
    if (src.vAdd[0] !== null) {
      pools['vAdd'] = new Set(src.vAdd);
      pools['vSub'] = new Set(src.vSub);
    }

    for (const [poolName, pool] of Object.entries(pools)) {
      const poolArr = [...pool].sort();
      // Generate all numbers using only these digits
      const allIn = [];
      for (const a of poolArr) for (const b of poolArr) for (const c of poolArr) allIn.push(''+a+b+c);
      const allInExcluded = allIn.filter(n => excluded.has(n));
      const pct = (allInExcluded.length / allIn.length * 100).toFixed(0);
      if (allIn.length > 0) {
        console.log(`  ${label} allIn${poolName}[${poolArr}](${allIn.length}): ${allInExcluded.length} excluded (${pct}%)`);
      }
    }

    // Also check: union of hAdd and hSub
    const hUnion = new Set([...src.hAdd, ...src.hSub]);
    const hUnionArr = [...hUnion].sort();
    const hUnionAll = [];
    for (const a of hUnionArr) for (const b of hUnionArr) for (const c of hUnionArr) hUnionAll.push(''+a+b+c);
    const hUnionExcl = hUnionAll.filter(n => excluded.has(n));
    console.log(`  ${label} allIn(hAdd∪hSub)[${hUnionArr}](${hUnionAll.length}): ${hUnionExcl} excluded (${(hUnionExcl.length/hUnionAll.length*100).toFixed(0)}%)`);
  }
}

// Now let me try: what if the kill is "allIn(hAdd(N-1))" + "allIn(hSub(N-1))" + "allIn(hAdd(N-2))" + ...
// i.e., union of all these kills across 3 periods
console.log('\n\n=== TEST: Combined kill sets across 3 periods ===');
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const excluded = new Set(allNums.filter(n => !predSet.has(n)));
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;

  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];

  // Kill set 1: allIn(hAdd) from each of 3 periods
  const kill_hAdd = new Set();
  for (const p of [p1, p2, p3]) {
    const pool = [...new Set(analysis[p].hAdd)].sort();
    for (const a of pool) for (const b of pool) for (const c of pool) kill_hAdd.add(''+a+b+c);
  }
  const match_hAdd = [...kill_hAdd].filter(n => excluded.has(n)).length;

  // Kill set 2: allIn(hSub) from each of 3 periods
  const kill_hSub = new Set();
  for (const p of [p1, p2, p3]) {
    const pool = [...new Set(analysis[p].hSub)].sort();
    for (const a of pool) for (const b of pool) for (const c of pool) kill_hSub.add(''+a+b+c);
  }
  const match_hSub = [...kill_hSub].filter(n => excluded.has(n)).length;

  // Kill set 3: allIn(vAdd) from each of 3 periods
  const kill_vAdd = new Set();
  for (const p of [p1, p2, p3]) {
    const a = analysis[p];
    if (a.vAdd[0] === null) continue;
    const pool = [...new Set(a.vAdd)].sort();
    for (const x of pool) for (const y of pool) for (const z of pool) kill_vAdd.add(''+x+y+z);
  }
  const match_vAdd = [...kill_vAdd].filter(n => excluded.has(n)).length;

  // Kill set 4: allIn(vSub) from each of 3 periods
  const kill_vSub = new Set();
  for (const p of [p1, p2, p3]) {
    const a = analysis[p];
    if (a.vSub[0] === null) continue;
    const pool = [...new Set(a.vSub)].sort();
    for (const x of pool) for (const y of pool) for (const z of pool) kill_vSub.add(''+x+y+z);
  }
  const match_vSub = [...kill_vSub].filter(n => excluded.has(n)).length;

  // Kill set 5: allIn(result digits) from each of 3 periods
  const kill_result = new Set();
  for (const p of [p1, p2, p3]) {
    const pool = [...new Set(analysis[p].digits)].sort();
    for (const a of pool) for (const b of pool) for (const c of pool) kill_result.add(''+a+b+c);
  }
  const match_result = [...kill_result].filter(n => excluded.has(n)).length;

  // Combined: union of all
  const killAll = new Set([...kill_hAdd, ...kill_hSub, ...kill_vAdd, ...kill_vSub, ...kill_result]);
  const matchAll = [...killAll].filter(n => excluded.has(n)).length;

  // Also: allIn(hAdd∪hSub) from each period
  const kill_hUnion = new Set();
  for (const p of [p1, p2, p3]) {
    const pool = [...new Set([...analysis[p].hAdd, ...analysis[p].hSub])].sort();
    for (const a of pool) for (const b of pool) for (const c of pool) kill_hUnion.add(''+a+b+c);
  }
  const match_hUnion = [...kill_hUnion].filter(n => excluded.has(n)).length;

  // All-in-one: allIn(hAdd∪hSub∪vAdd∪vSub∪result) from each period
  const kill_everything = new Set();
  for (const p of [p1, p2, p3]) {
    const a = analysis[p];
    const pool = new Set([...a.hAdd, ...a.hSub, ...a.digits]);
    if (a.vAdd[0] !== null) { pool.add(a.vAdd[0]); pool.add(a.vAdd[1]); pool.add(a.vAdd[2]); }
    if (a.vSub[0] !== null) { pool.add(a.vSub[0]); pool.add(a.vSub[1]); pool.add(a.vSub[2]); }
    const poolArr = [...pool].sort();
    for (const x of poolArr) for (const y of poolArr) for (const z of poolArr) kill_everything.add(''+x+y+z);
  }
  const match_everything = [...kill_everything].filter(n => excluded.has(n)).length;

  // Add 豹子
  const baozi = new Set(allNums.filter(n => n[0]===n[1] && n[1]===n[2]));

  const combinedWithBaozi = new Set([...killAll, ...baozi]);
  const matchCombinedBaozi = [...combinedWithBaozi].filter(n => excluded.has(n)).length;

  const combEverything = new Set([...kill_everything, ...baozi]);
  const matchEverythingBaozi = [...combEverything].filter(n => excluded.has(n)).length;

  console.log(`\n${pp} (excl=${excluded.size}):`);
  console.log(`  allIn(hAdd)(3p): ${kill_hAdd.size} kill, ${match_hAdd} match (${(match_hAdd/kill_hAdd.size*100).toFixed(0)}% precision)`);
  console.log(`  allIn(hSub)(3p): ${kill_hSub.size} kill, ${match_hSub} match (${(kill_hSub.size>0?(match_hSub/kill_hSub.size*100).toFixed(0):0)}% precision)`);
  console.log(`  allIn(vAdd)(3p): ${kill_vAdd.size} kill, ${match_vAdd} match`);
  console.log(`  allIn(vSub)(3p): ${kill_vSub.size} kill, ${match_vSub} match`);
  console.log(`  allIn(result)(3p): ${kill_result.size} kill, ${match_result} match`);
  console.log(`  allIn(hAdd∪hSub)(3p): ${kill_hUnion.size} kill, ${match_hUnion} match`);
  console.log(`  UNION all: ${killAll.size} kill, ${matchAll} match`);
  console.log(`  UNION all + 豹子: ${combinedWithBaozi.size} kill, ${matchCombinedBaozi} match`);
  console.log(`  allIn(everything)(3p): ${kill_everything.size} kill, ${match_everything} match`);
  console.log(`  allIn(everything) + 豹子: ${combEverything.size} kill, ${matchEverythingBaozi} match`);

  // What's left? Excluded numbers NOT in the combined kill set
  const remaining = [...excluded].filter(n => !combEverything.has(n));
  console.log(`  Remaining (not in everything+豹子): ${remaining.length}`);
}
