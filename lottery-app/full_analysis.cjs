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

// Get predictions
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

// Compute all analysis for all periods
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

  // shenghao
  const g2 = prevG2.map(v => v);
  const sheng = [];
  for (let d = 0; d <= 9; d++) {
    if (g2[d] === null) sheng.push(d);
    if ([r.d1, r.d2, r.d3].includes(d)) { g2[d] = null; }
    else { if (g2[d] === null) g2[d] = 1; else g2[d] = (g2[d] || 0) + 1; }
  }

  // lianhao
  const s = new Set([r.d1, r.d2, r.d3]);
  const lian = new Set();
  for (const v of s) { if (v > 0 && !s.has(v-1)) lian.add(v-1); if (v < 9 && !s.has(v+1)) lian.add(v+1); }

  // bichu
  const shengSet = new Set(sheng);
  const bichu = [];
  for (let d = 0; d <= 9; d++) { if (!shengSet.has(d) && !lian.has(d)) bichu.push(d); }

  analysis[p] = {hAdd, hSub, vAdd, vSub, shenghao: sheng, lianhao: [...lian], bichu, result: r};
  prevG2 = g2;
}

// Compute 回补/遗漏 for each prediction period
const predPeriods = Object.keys(preds).sort();

for (const pp of predPeriods) {
  const idx = periods.indexOf(pp);
  if (idx < 1) continue;

  // Get previous periods (up to 3 back)
  const p1 = periods[idx-1]; // N-1
  const p2 = idx >= 2 ? periods[idx-2] : null; // N-2
  const p3 = idx >= 3 ? periods[idx-3] : null; // N-3

  const a1 = analysis[p1];
  const a2 = p2 ? analysis[p2] : null;
  const a3 = p3 ? analysis[p3] : null;

  // 横加减回补: digits NOT in hAdd∪hSub for last 2 periods
  const hSet1 = new Set([...a1.hAdd, ...a1.hSub]);
  const hSet2 = a2 ? new Set([...a2.hAdd, ...a2.hSub]) : new Set();
  const hUnion2 = new Set([...hSet1, ...hSet2]);
  const hHuibu = [];
  for (let d = 0; d <= 9; d++) { if (!hUnion2.has(d)) hHuibu.push(d); }

  // 横加减遗漏: digits NOT in hAdd∪hSub for last 3 periods
  const hSet3 = a3 ? new Set([...a3.hAdd, ...a3.hSub]) : new Set();
  const hUnion3 = new Set([...hSet1, ...hSet2, ...hSet3]);
  const hYilou = [];
  for (let d = 0; d <= 9; d++) { if (!hUnion3.has(d)) hYilou.push(d); }

  // 竖加减回补: digits NOT in vAdd∪vSub for last 2 periods
  const vSet1 = new Set([...(a1.vAdd||[]).filter(x=>x!==null), ...(a1.vSub||[]).filter(x=>x!==null)]);
  const vSet2 = a2 ? new Set([...(a2.vAdd||[]).filter(x=>x!==null), ...(a2.vSub||[]).filter(x=>x!==null)]) : new Set();
  const vUnion2 = new Set([...vSet1, ...vSet2]);
  const vHuibu = [];
  for (let d = 0; d <= 9; d++) { if (!vUnion2.has(d)) vHuibu.push(d); }

  // 竖加减遗漏: digits NOT in vAdd∪vSub for last 3 periods
  const vSet3 = a3 ? new Set([...(a3.vAdd||[]).filter(x=>x!==null), ...(a3.vSub||[]).filter(x=>x!==null)]) : new Set();
  const vUnion3 = new Set([...vSet1, ...vSet2, ...vSet3]);
  const vYilou = [];
  for (let d = 0; d <= 9; d++) { if (!vUnion3.has(d)) vYilou.push(d); }

  // Now get the prediction and excluded numbers
  const predSet = preds[pp];
  const allNums = [];
  for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);
  const excluded = allNums.filter(n => !predSet.has(n));

  console.log(`\n=== Period ${pp} (pred: ${predSet.size}, excl: ${excluded.length}) ===`);
  console.log(`  Prev results: ${p1}=${a1.result.d1}${a1.result.d2}${a1.result.d3}${p2?', '+p2+'='+a2.result.d1+a2.result.d2+a2.result.d3:''}${p3?', '+p3+'='+a3.result.d1+a3.result.d2+a3.result.d3:''}`);
  console.log(`  生号: [${a1.shenghao}], 连号: [${a1.lianhao}], 必出号: [${a1.bichu}]`);
  console.log(`  横加减回补(2): [${hHuibu}], 横加减遗漏(3): [${hYilou}]`);
  console.log(`  竖加减回补(2): [${vHuibu}], 竖加减遗漏(3): [${vYilou}]`);
  console.log(`  hAdd: [${a1.hAdd}], hSub: [${a1.hSub}], vAdd: [${a1.vAdd}], vSub: [${a1.vSub}]`);

  // Now try to find the kill logic
  // Hypothesis: exclude numbers where ALL digits are in 横加减回补
  const huibuSet = new Set(hHuibu);
  const exclAllInHuibu = allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(x => huibuSet.has(x));
  });
  console.log(`  Excl all digits in 横加减回补: ${exclAllInHuibu.length}`);

  // Hypothesis: exclude numbers where ALL digits are in 竖加减回补
  const vhuibuSet = new Set(vHuibu);
  const exclAllInVhuibu = allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.every(x => vhuibuSet.has(x));
  });
  console.log(`  Excl all digits in 竖加减回补: ${exclAllInVhuibu.length}`);

  // Hypothesis: exclude 豹子 + numbers where all digits in 横加减回补
  const baozi = allNums.filter(n => n[0]===n[1] && n[1]===n[2]);
  const combined1 = new Set([...baozi, ...exclAllInHuibu]);
  console.log(`  豹子 + allIn横回补: ${combined1.size} (target: ${excluded.length})`);

  // Hypothesis: exclude 豹子 + allIn横回补 + allIn竖回补
  const combined2 = new Set([...baozi, ...exclAllInHuibu, ...exclAllInVhuibu]);
  console.log(`  豹子 + allIn横回补 + allIn竖回补: ${combined2.size}`);

  // Check overlap
  const overlap = exclAllInHuibu.filter(n => exclAllInVhuibu.includes(n));
  console.log(`  Overlap (横回补 ∩ 竖回补): ${overlap.length}`);

  // Hypothesis: exclude numbers where any digit is in 横加减遗漏
  const yilouSet = new Set(hYilou);
  const exclAnyInYilou = allNums.filter(n => {
    const d = [+n[0], +n[1], +n[2]];
    return d.some(x => yilouSet.has(x));
  });
  console.log(`  Excl any digit in 横加减遗漏: ${exclAnyInYilou.length}`);

  // How many of the actual excluded are in combined2?
  const exclSet = new Set(excluded);
  const combined2Arr = [...combined2];
  const match2 = combined2Arr.filter(n => exclSet.has(n)).length;
  console.log(`  combined2 match with actual excluded: ${match2} / ${excluded.length}`);

  // How many actual excluded are in combined1?
  const combined1Arr = [...combined1];
  const match1 = combined1Arr.filter(n => exclSet.has(n)).length;
  console.log(`  combined1 match with actual excluded: ${match1} / ${excluded.length}`);

  // What's left? Numbers in excluded but NOT in combined2
  const remaining = excluded.filter(n => !combined2.has(n));
  console.log(`  Remaining (in excluded but not in combined2): ${remaining.length}`);
  if (remaining.length <= 20) {
    console.log(`  Remaining: ${remaining.join(' ')}`);
  }
}
