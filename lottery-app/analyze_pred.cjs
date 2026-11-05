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

// Get predictions from sheet 2 (column 4 = "列1")
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

// Compute analysis for all periods
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

  // shenghao: G2 state machine
  const g2 = prevG2.map(v => v);
  const sheng = [];
  for (let d = 0; d <= 9; d++) {
    if (g2[d] === null) {
      sheng.push(d);
    }
    if ([r.d1, r.d2, r.d3].includes(d)) {
      g2[d] = null;
    } else {
      if (g2[d] === null) g2[d] = 1;
      else g2[d] = (g2[d] || 0) + 1;
    }
  }

  // lianhao
  const s = new Set([r.d1, r.d2, r.d3]);
  const lian = new Set();
  for (const v of s) {
    if (v > 0 && !s.has(v-1)) lian.add(v-1);
    if (v < 9 && !s.has(v+1)) lian.add(v+1);
  }

  // bichu: complement of (shenghao union lianhao)
  const shengSet = new Set(sheng);
  const bichu = [];
  for (let d = 0; d <= 9; d++) {
    if (!shengSet.has(d) && !lian.has(d)) bichu.push(d);
  }

  enriched[p] = {hAdd, hSub, vAdd, vSub, shenghao: sheng, lianhao: [...lian], bichu, result: r};
  prevG2 = g2;
}

// Test across multiple periods
const predPeriods = Object.keys(preds).sort();
console.log('Testing periods:', predPeriods.join(', '));
console.log('');

for (const pp of predPeriods) {
  const predNums = preds[pp];
  const predSet = new Set(predNums);

  const idx = periods.indexOf(pp);
  if (idx < 1) continue;
  const prevP = periods[idx-1];
  const prevE = enriched[prevP];
  if (!prevE || prevE.vAdd[0] === null) continue;

  const curE = enriched[pp];

  // All 1000 numbers
  const allNums = [];
  for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);

  const targetExcluded = allNums.filter(n => !predSet.has(n));

  console.log('=== Period', pp, '(pred:', predNums.length, ', excluded:', targetExcluded.length, ') ===');

  // H1: prev hAdd+hSub position kill (union per position)
  const kill1 = {
    0: new Set([prevE.hAdd[0], prevE.hSub[0]]),
    1: new Set([prevE.hAdd[1], prevE.hSub[1]]),
    2: new Set([prevE.hAdd[2], prevE.hSub[2]])
  };
  const exp1 = allNums.filter(n => kill1[0].has(+n[0]) || kill1[1].has(+n[1]) || kill1[2].has(+n[2]));
  const exp1Set = new Set(exp1);
  const match1 = targetExcluded.filter(n => exp1Set.has(n)).length;
  console.log('  H1 (prev hAdd+hSub):', exp1.length, 'excl, match:', match1, '/', targetExcluded.length,
    'kills:', [...kill1[0]], [...kill1[1]], [...kill1[2]]);

  // H2: H1 - 豹子
  const exp2 = exp1.filter(n => !(n[0]===n[1] && n[1]===n[2]));
  const exp2Set = new Set(exp2);
  const match2 = targetExcluded.filter(n => exp2Set.has(n)).length;
  console.log('  H2 (H1 - 豹子):', exp2.length, 'excl, match:', match2, '/', targetExcluded.length);

  // H3: prev vAdd+vSub position kill
  const kill3 = {
    0: new Set([prevE.vAdd[0], prevE.vSub[0]]),
    1: new Set([prevE.vAdd[1], prevE.vSub[1]]),
    2: new Set([prevE.vAdd[2], prevE.vSub[2]])
  };
  const exp3 = allNums.filter(n => kill3[0].has(+n[0]) || kill3[1].has(+n[1]) || kill3[2].has(+n[2]));
  const exp3Set = new Set(exp3);
  const match3 = targetExcluded.filter(n => exp3Set.has(n)).length;
  console.log('  H3 (prev vAdd+vSub):', exp3.length, 'excl, match:', match3, '/', targetExcluded.length,
    'kills:', [...kill3[0]], [...kill3[1]], [...kill3[2]]);

  // H4: combine all 4 per position
  const kill4 = {
    0: new Set([prevE.hAdd[0], prevE.hSub[0], prevE.vAdd[0], prevE.vSub[0]]),
    1: new Set([prevE.hAdd[1], prevE.hSub[1], prevE.vAdd[1], prevE.vSub[1]]),
    2: new Set([prevE.hAdd[2], prevE.hSub[2], prevE.vAdd[2], prevE.vSub[2]])
  };
  const exp4 = allNums.filter(n => kill4[0].has(+n[0]) || kill4[1].has(+n[1]) || kill4[2].has(+n[2]));
  const exp4Set = new Set(exp4);
  const match4 = targetExcluded.filter(n => exp4Set.has(n)).length;
  console.log('  H4 (all4 combined):', exp4.length, 'excl, match:', match4, '/', targetExcluded.length,
    'kills:', [...kill4[0]], [...kill4[1]], [...kill4[2]]);

  // H5: H4 - 豹子
  const exp5 = exp4.filter(n => !(n[0]===n[1] && n[1]===n[2]));
  const exp5Set = new Set(exp5);
  const match5 = targetExcluded.filter(n => exp5Set.has(n)).length;
  console.log('  H5 (H4 - 豹子):', exp5.length, 'excl, match:', match5, '/', targetExcluded.length);

  // H6: H1 + 生号 position kill (生号 kills same position)
  const shengKill = new Set(prevE.shenghao);
  const exp6 = allNums.filter(n =>
    kill1[0].has(+n[0]) || kill1[1].has(+n[1]) || kill1[2].has(+n[2]) ||
    shengKill.has(+n[0]) || shengKill.has(+n[1]) || shengKill.has(+n[2])
  );
  const exp6Set = new Set(exp6);
  const match6 = targetExcluded.filter(n => exp6Set.has(n)).length;
  console.log('  H6 (H1 + 生号):', exp6.length, 'excl, match:', match6, '/', targetExcluded.length);

  // H7: H1 + 连号
  const lianKill = new Set(prevE.lianhao);
  const exp7 = allNums.filter(n =>
    kill1[0].has(+n[0]) || kill1[1].has(+n[1]) || kill1[2].has(+n[2]) ||
    lianKill.has(+n[0]) || lianKill.has(+n[1]) || lianKill.has(+n[2])
  );
  const exp7Set = new Set(exp7);
  const match7 = targetExcluded.filter(n => exp7Set.has(n)).length;
  console.log('  H7 (H1 + 连号):', exp7.length, 'excl, match:', match7, '/', targetExcluded.length);

  // H8: H4 + 生号 + 连号
  const exp8 = allNums.filter(n =>
    kill4[0].has(+n[0]) || kill4[1].has(+n[1]) || kill4[2].has(+n[2]) ||
    shengKill.has(+n[0]) || shengKill.has(+n[1]) || shengKill.has(+n[2]) ||
    lianKill.has(+n[0]) || lianKill.has(+n[1]) || lianKill.has(+n[2])
  );
  const exp8Set = new Set(exp8);
  const match8 = targetExcluded.filter(n => exp8Set.has(n)).length;
  console.log('  H8 (H4+生号+连号):', exp8.length, 'excl, match:', match8, '/', targetExcluded.length);

  // H9: H1 + 生号 only in specific position (shenghao kills pos0, lianhao kills pos1, etc)
  // Try: shenghao kills ALL positions
  const exp9 = allNums.filter(n =>
    kill1[0].has(+n[0]) || kill1[1].has(+n[1]) || kill1[2].has(+n[2]) ||
    shengKill.has(+n[0]) || shengKill.has(+n[1]) || shengKill.has(+n[2])
  ).filter(n => !(n[0]===n[1] && n[1]===n[2]));
  const exp9Set = new Set(exp9);
  const match9 = targetExcluded.filter(n => exp9Set.has(n)).length;
  console.log('  H9 (H1+生号-豹子):', exp9.length, 'excl, match:', match9, '/', targetExcluded.length);

  // H10: Use current period's own hAdd+hSub
  if (curE) {
    const kill10 = {
      0: new Set([curE.hAdd[0], curE.hSub[0]]),
      1: new Set([curE.hAdd[1], curE.hSub[1]]),
      2: new Set([curE.hAdd[2], curE.hSub[2]])
    };
    const exp10 = allNums.filter(n => kill10[0].has(+n[0]) || kill10[1].has(+n[1]) || kill10[2].has(+n[2]));
    const exp10Set = new Set(exp10);
    const match10 = targetExcluded.filter(n => exp10Set.has(n)).length;
    console.log('  H10 (cur hAdd+hSub):', exp10.length, 'excl, match:', match10, '/', targetExcluded.length,
      'kills:', [...kill10[0]], [...kill10[1]], [...kill10[2]]);
  }

  console.log('  prev hAdd:', prevE.hAdd, 'hSub:', prevE.hSub, 'vAdd:', prevE.vAdd, 'vSub:', prevE.vSub);
  console.log('  prev 生号:', prevE.shenghao, '连号:', prevE.lianhao, '必出号:', prevE.bichu);
  console.log('');
}
