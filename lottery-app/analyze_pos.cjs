const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/boloor/Desktop/新黄金三格.xlsm', {type:'binary'});

const ws1 = wb.Sheets['福'];
const ws2 = wb.Sheets['福 (2)'];
const data1 = XLSX.utils.sheet_to_json(ws1, {header:1});
const data2 = XLSX.utils.sheet_to_json(ws2, {header:1});

// Build full result history
const allRows = [...data1.slice(1), ...data2.slice(1)];
const resultMap = {};
for (const row of allRows) {
  if (row[0] && row[1]!=null && row[2]!=null && row[3]!=null) {
    const period = String(row[0]);
    const d1 = Number(row[1]), d2 = Number(row[2]), d3 = Number(row[3]);
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(d3)) {
      resultMap[period] = {d1, d2, d3};
    }
  }
}

// Get predictions from sheet 2
const preds = {};
for (let i = 1; i < data2.length; i++) {
  const row = data2[i];
  if (row[0] && row[4]) {
    const period = String(row[0]);
    const predStr = String(row[4]).trim();
    const nums = predStr.split(/\s+/).filter(s => /^\d{3}$/.test(s));
    if (nums.length > 0) preds[period] = nums;
  }
}

// Compute analysis
const periods = Object.keys(resultMap).sort();
const enriched = {};
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
  enriched[p] = {hAdd, hSub, vAdd, vSub, shenghao: sheng, lianhao: [...lian], bichu, result: r};
  prevG2 = g2;
}

// For each prediction period, analyze per-position digit distribution
const predPeriods = Object.keys(preds).sort();

for (const pp of predPeriods.slice(0, 5)) { // first 5 periods
  const predNums = preds[pp];
  const idx = periods.indexOf(pp);
  const prevP = periods[idx-1];
  const prevE = enriched[prevP];
  const curE = enriched[pp];

  // Count which digits appear in each position
  const posDigits = [{}, {}, {}];
  for (const n of predNums) {
    posDigits[0][+n[0]] = (posDigits[0][+n[0]] || 0) + 1;
    posDigits[1][+n[1]] = (posDigits[1][+n[1]] || 0) + 1;
    posDigits[2][+n[2]] = (posDigits[2][+n[2]] || 0) + 1;
  }

  console.log('=== Period', pp, '===');
  console.log('  Pred count:', predNums.length);
  console.log('  Pos0 digits present:', Object.keys(posDigits[0]).sort((a,b)=>a-b).join(','));
  console.log('  Pos1 digits present:', Object.keys(posDigits[1]).sort((a,b)=>a-b).join(','));
  console.log('  Pos2 digits present:', Object.keys(posDigits[2]).sort((a,b)=>a-b).join(','));

  // Which digits are MISSING from each position?
  const missing = [{}, {}, {}];
  for (let pos = 0; pos < 3; pos++) {
    const present = new Set(Object.keys(posDigits[pos]).map(Number));
    const miss = [];
    for (let d = 0; d <= 9; d++) { if (!present.has(d)) miss.push(d); }
    missing[pos] = miss;
  }
  console.log('  Pos0 MISSING:', missing[0]);
  console.log('  Pos1 MISSING:', missing[1]);
  console.log('  Pos2 MISSING:', missing[2]);

  // Compare with analysis values
  console.log('  Prev hAdd:', prevE.hAdd, 'hSub:', prevE.hSub);
  console.log('  Prev vAdd:', prevE.vAdd, 'vSub:', prevE.vSub);
  console.log('  Prev 生号:', prevE.shenghao, '连号:', prevE.lianhao, '必出号:', prevE.bichu);
  console.log('  Cur  hAdd:', curE.hAdd, 'hSub:', curE.hSub);
  console.log('  Cur  vAdd:', curE.vAdd, 'vSub:', curE.vSub);
  console.log('  Cur  生号:', curE.shenghao, '连号:', curE.lianhao, '必出号:', curE.bichu);

  // Check: do missing digits match any analysis values?
  const prevResult = prevE.result;
  console.log('  Prev result:', prevResult.d1, prevResult.d2, prevResult.d3);

  // Check if missing = prev result digits
  console.log('  Prev result digits as kill?', [prevResult.d1, prevResult.d2, prevResult.d3], 'vs missing:', missing[0], missing[1], missing[2]);

  // Check per-position kill: does pos0 miss hAdd[0] and/or hSub[0]?
  console.log('  Pos0 miss vs hAdd[0]:', prevE.hAdd[0], '->', missing[0].includes(prevE.hAdd[0]));
  console.log('  Pos0 miss vs hSub[0]:', prevE.hSub[0], '->', missing[0].includes(prevE.hSub[0]));
  console.log('  Pos1 miss vs hAdd[1]:', prevE.hAdd[1], '->', missing[1].includes(prevE.hAdd[1]));
  console.log('  Pos1 miss vs hSub[1]:', prevE.hSub[1], '->', missing[1].includes(prevE.hSub[1]));
  console.log('  Pos2 miss vs hAdd[2]:', prevE.hAdd[2], '->', missing[2].includes(prevE.hAdd[2]));
  console.log('  Pos2 miss vs hSub[2]:', prevE.hSub[2], '->', missing[2].includes(prevE.hSub[2]));

  // Also check: count per position how many numbers have each digit
  console.log('  Pos0 digit counts:', JSON.stringify(posDigits[0]));
  console.log('  Pos1 digit counts:', JSON.stringify(posDigits[1]));
  console.log('  Pos2 digit counts:', JSON.stringify(posDigits[2]));
  console.log('');
}
