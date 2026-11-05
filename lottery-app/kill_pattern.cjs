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

// For each prediction period, find the EXACT per-position digit distribution
// and check if the prediction is a Cartesian product
console.log('=== TEST: Is prediction a Cartesian product? ===');
for (const pp of predPeriods) {
  const predArr = [...preds[pp]];
  const posDigits = [{},{},{}];
  for (let pos = 0; pos < 3; pos++) {
    for (let d = 0; d <= 9; d++) posDigits[pos][d] = 0;
    for (const n of predArr) posDigits[pos][+n[pos]]++;
  }

  // Check: if prediction were a Cartesian product of per-position digit sets,
  // then every combination of (present digits at pos0) × (present at pos1) × (present at pos2)
  // should be in the prediction
  const presentDigits = [];
  for (let pos = 0; pos < 3; pos++) {
    presentDigits[pos] = [];
    for (let d = 0; d <= 9; d++) if (posDigits[pos][d] > 0) presentDigits[pos].push(d);
  }

  const cartesianSize = presentDigits[0].length * presentDigits[1].length * presentDigits[2].length;
  const predSet = preds[pp];

  // Check how many of the Cartesian product are actually in the prediction
  let cartesianInPred = 0;
  for (const a of presentDigits[0]) {
    for (const b of presentDigits[1]) {
      for (const c of presentDigits[2]) {
        if (predSet.has(''+a+b+c)) cartesianInPred++;
      }
    }
  }

  console.log(`${pp} (pred=${predSet.size}): posDigits=[${presentDigits[0].length},${presentDigits[1].length},${presentDigits[2].length}] cartesian=${cartesianSize} inPred=${cartesianInPred} (${(cartesianInPred/cartesianSize*100).toFixed(1)}%)`);
}

// Now let me try a completely different approach
// For each period, look at the EXCLUDED numbers and try to find a consistent property
console.log('\n=== TEST: Per-position kill digit analysis ===');
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const excluded = allNums.filter(n => !predSet.has(n));
  const predArr = [...predSet];

  const idx = periods.indexOf(pp);
  if (idx < 3) continue;
  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];
  const a1 = analysis[p1], a2 = analysis[p2], a3 = analysis[p3];

  // For each position, find which digits are LEAST represented in the prediction
  // These might be the "kill" digits
  const posFreq = [{},{},{}];
  for (let pos = 0; pos < 3; pos++) {
    for (let d = 0; d <= 9; d++) posFreq[pos][d] = 0;
    for (const n of predArr) posFreq[pos][+n[pos]]++;
  }

  // For each position, sort digits by frequency (ascending)
  const sortedDigits = [];
  for (let pos = 0; pos < 3; pos++) {
    sortedDigits[pos] = Object.entries(posFreq[pos]).sort((a,b) => a[1]-b[1]).map(([d,c]) => ({d:+d, c}));
  }

  console.log(`\n${pp} (pred=${predSet.size}, excl=${excluded.length}):`);
  for (let pos = 0; pos < 3; pos++) {
    const bottom3 = sortedDigits[pos].slice(0, 3);
    console.log(`  Pos${pos} least frequent: ${bottom3.map(x => `${x.d}(${x.c})`).join(' ')}`);
  }

  // Now check: do the least-frequent digits at each position correspond to analysis values?
  // Get all analysis values per position
  const posValues = [{},{},{}];
  for (let pos = 0; pos < 3; pos++) {
    const vals = new Set();
    vals.add(a1.hAdd[pos]); vals.add(a1.hSub[pos]);
    if (a1.vAdd[0] !== null) { vals.add(a1.vAdd[pos]); vals.add(a1.vSub[pos]); }
    vals.add(a1.digits[pos]); // result digit
    if (a2) { vals.add(a2.hAdd[pos]); vals.add(a2.hSub[pos]); }
    if (a3) { vals.add(a3.hAdd[pos]); vals.add(a3.hSub[pos]); }
    posValues[pos] = vals;
  }

  // Check: for each position, which of the bottom-3 least-frequent digits are in the analysis values?
  for (let pos = 0; pos < 3; pos++) {
    const bottom1 = sortedDigits[pos][0];
    const inAnalysis = posValues[pos].has(bottom1.d);
    console.log(`  Pos${pos} least=${bottom1.d}(${bottom1.c}) inAnalysisValues=${inAnalysis} analysisVals=[${[...posValues[pos]].sort()}]`);
  }
}

// Let me try yet another approach: check if the prediction excludes numbers
// based on a "kill set" derived from the 3-period data
// The kill set is a set of 3-digit numbers (not just digits)
console.log('\n\n=== TEST: Kill set as 3-digit numbers ===');
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const excluded = new Set(allNums.filter(n => !predSet.has(n)));

  const idx = periods.indexOf(pp);
  if (idx < 3) continue;
  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];
  const a1 = analysis[p1], a2 = analysis[p2], a3 = analysis[p3];

  // Hypothesis: the "kill set" consists of specific 3-digit numbers derived from the analysis
  // For example: the hAdd values from 3 periods form a 3-digit number
  // hAdd(N-1)[0], hAdd(N-2)[0], hAdd(N-3)[0] -> a 3-digit number?

  // Let me check: are the excluded numbers related to permutations of analysis values?
  // Generate candidate kill numbers from analysis values
  const candidates = new Set();

  // Method 1: hAdd from each period as 3-digit numbers
  for (const a of [a1, a2, a3]) {
    candidates.add(''+a.hAdd[0]+a.hAdd[1]+a.hAdd[2]);
    candidates.add(''+a.hSub[0]+a.hSub[1]+a.hSub[2]);
    if (a.vAdd[0] !== null) {
      candidates.add(''+a.vAdd[0]+a.vAdd[1]+a.vAdd[2]);
      candidates.add(''+a.vSub[0]+a.vSub[1]+a.vSub[2]);
    }
    // Also permutations
    const perms = [
      [0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]
    ];
    for (const p of perms) {
      candidates.add(''+a.hAdd[p[0]]+a.hAdd[p[1]]+a.hAdd[p[2]]);
      candidates.add(''+a.hSub[p[0]]+a.hSub[p[1]]+a.hSub[p[2]]);
    }
  }

  // Check how many candidates are in the excluded set
  const candArr = [...candidates];
  const candExcluded = candArr.filter(n => excluded.has(n));
  const candInPred = candArr.filter(n => predSet.has(n));
  console.log(`${pp}: candidates=${candidates.size} excluded=${candExcluded.length} inPred=${candInPred.length}`);
  if (candExcluded.length <= 20) {
    console.log(`  Excluded candidates: ${candExcluded.sort().join(' ')}`);
  }
}

// Let me try the most promising approach: for each excluded number,
// compute ALL its properties and look for a consistent pattern
console.log('\n\n=== TEST: Property-based exclusion for a single period ===');
const pp = predPeriods[2]; // Period 26268
const predSet = preds[pp];
const excluded = allNums.filter(n => !predSet.has(n));
const included = allNums.filter(n => predSet.has(n));

const idx = periods.indexOf(pp);
const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];
const a1 = analysis[p1], a2 = analysis[p2], a3 = analysis[p3];

console.log(`Period ${pp}: pred=${predSet.size}, excl=${excluded.length}`);
console.log(`N-1=${a1.digits.join('')}, N-2=${a2.digits.join('')}, N-3=${a3.digits.join('')}`);

// For each excluded number, check various properties
const properties = {
  'sum<=3': n => { const s = (+n[0])+(+n[1])+(+n[2]); return s <= 3; },
  'sum>=24': n => { const s = (+n[0])+(+n[1])+(+n[2]); return s >= 24; },
  'span=0': n => (+n[0])===(+n[1]) && (+n[1])===(+n[2]),
  'span>=8': n => Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]) >= 8,
  'allEven': n => (+n[0])%2===0 && (+n[1])%2===0 && (+n[2])%2===0,
  'allOdd': n => (+n[0])%2===1 && (+n[1])%2===1 && (+n[2])%2===1,
  'allBig': n => (+n[0])>=5 && (+n[1])>=5 && (+n[2])>=5,
  'allSmall': n => (+n[0])<5 && (+n[1])<5 && (+n[2])<5,
  'allInShenghao': n => new Set(a1.shenghao).has(+n[0]) && new Set(a1.shenghao).has(+n[1]) && new Set(a1.shenghao).has(+n[2]),
  'allInLianhao': n => new Set(a1.lianhao).has(+n[0]) && new Set(a1.lianhao).has(+n[1]) && new Set(a1.lianhao).has(+n[2]),
  'allInBichu': n => new Set(a1.bichu).has(+n[0]) && new Set(a1.bichu).has(+n[1]) && new Set(a1.bichu).has(+n[2]),
  'allDigitsInResult': n => a1.digits.includes(+n[0]) && a1.digits.includes(+n[1]) && a1.digits.includes(+n[2]),
  'has5': n => (+n[0])===5 || (+n[1])===5 || (+n[2])===5,
  'allIn_hAdd_hSub_N1': n => {
    const pool = new Set([...a1.hAdd, ...a1.hSub]);
    return pool.has(+n[0]) && pool.has(+n[1]) && pool.has(+n[2]);
  },
};

console.log('\nProperty analysis:');
for (const [name, fn] of Object.entries(properties)) {
  const exclMatch = excluded.filter(n => fn(n)).length;
  const inclMatch = included.filter(n => fn(n)).length;
  const total = exclMatch + inclMatch;
  console.log(`  ${name}: excl=${exclMatch}/${excluded.length} (${(exclMatch/total*100).toFixed(1)}%) incl=${inclMatch}`);
}

// Now try: combine multiple properties
console.log('\nCombination analysis:');
const combos = {
  '豹子': n => (+n[0])===(+n[1]) && (+n[1])===(+n[2]),
  'sum<=3 OR sum>=24': n => { const s = (+n[0])+(+n[1])+(+n[2]); return s<=3 || s>=24; },
  'span>=8': n => Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]) >= 8,
  'allInSheng': n => { const s = new Set(a1.shenghao); return s.has(+n[0]) && s.has(+n[1]) && s.has(+n[2]); },
  'allInBichu': n => { const s = new Set(a1.bichu); return s.has(+n[0]) && s.has(+n[1]) && s.has(+n[2]); },
};

// Try: union of 豹子 + sum<=3|>=24 + span>=8
const combo1 = new Set(allNums.filter(n => {
  if ((+n[0])===(+n[1]) && (+n[1])===(+n[2])) return true;
  const s = (+n[0])+(+n[1])+(+n[2]);
  if (s <= 3 || s >= 24) return true;
  const span = Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]);
  if (span >= 8) return true;
  return false;
}));
const match1 = [...combo1].filter(n => !predSet.has(n)).length;
console.log(`  豹子∪extremeSum∪span≥8: ${combo1.size} killed, ${match1} match actual excl`);

// Try adding allInShenghao
const combo2 = new Set([...combo1, ...allNums.filter(n => {
  const s = new Set(a1.shenghao);
  return s.has(+n[0]) && s.has(+n[1]) && s.has(+n[2]);
})]);
const match2 = [...combo2].filter(n => !predSet.has(n)).length;
console.log(`  +allIn生号: ${combo2.size} killed, ${match2} match`);

// Try adding allInBichu
const combo3 = new Set([...combo2, ...allNums.filter(n => {
  const s = new Set(a1.bichu);
  return s.has(+n[0]) && s.has(+n[1]) && s.has(+n[2]);
})]);
const match3 = [...combo3].filter(n => !predSet.has(n)).length;
console.log(`  +allIn必出号: ${combo3.size} killed, ${match3} match`);

// What if we use N-2 and N-3 data too?
const combo4 = new Set([...combo1]);
for (const a of [a1, a2, a3]) {
  const shengSet2 = new Set(a.shenghao);
  for (const n of allNums) {
    if (shengSet2.has(+n[0]) && shengSet2.has(+n[1]) && shengSet2.has(+n[2])) combo4.add(n);
  }
}
const match4 = [...combo4].filter(n => !predSet.has(n)).length;
console.log(`  +allIn生号(all 3 periods): ${combo4.size} killed, ${match4} match`);

// What about: exclude numbers where all digits are from the SAME source?
// e.g., all digits from hAdd, or all from hSub, etc.
const combo5 = new Set([...combo1]);
for (const a of [a1, a2, a3]) {
  const hAddSet = new Set(a.hAdd);
  const hSubSet = new Set(a.hSub);
  for (const n of allNums) {
    if (hAddSet.has(+n[0]) && hAddSet.has(+n[1]) && hAddSet.has(+n[2])) combo5.add(n);
    if (hSubSet.has(+n[0]) && hSubSet.has(+n[1]) && hSubSet.has(+n[2])) combo5.add(n);
  }
}
const match5 = [...combo5].filter(n => !predSet.has(n)).length;
console.log(`  豹子+extremeSum+span≥8+allIn(hAdd|hSub)(3 periods): ${combo5.size} killed, ${match5} match`);

// Let me also check: what's the overlap between excluded and each "allIn" set?
console.log('\nDetailed overlap for period', pp, ':');
const exclSet = new Set(excluded);
for (const a of [a1, a2, a3]) {
  const pIdx = periods.indexOf(a === a1 ? p1 : a === a2 ? p2 : p3);
  const pName = a === a1 ? p1 : a === a2 ? p2 : p3;

  const sets = {
    'hAdd': new Set(a.hAdd),
    'hSub': new Set(a.hSub),
    'result': new Set(a.digits),
  };
  if (a.vAdd[0] !== null) {
    sets['vAdd'] = new Set(a.vAdd);
    sets['vSub'] = new Set(a.vSub);
  }

  for (const [name, digitSet] of Object.entries(sets)) {
    const allIn = allNums.filter(n => digitSet.has(+n[0]) && digitSet.has(+n[1]) && digitSet.has(+n[2]));
    const overlap = allIn.filter(n => exclSet.has(n)).length;
    console.log(`  allIn${name}(${pName}=[${[...digitSet].sort()}]): ${allIn.length} nums, ${overlap} in excl (${(overlap/excluded.length*100).toFixed(1)}%)`);
  }
}
