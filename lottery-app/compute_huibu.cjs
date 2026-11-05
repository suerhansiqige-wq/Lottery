const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/boloor/Desktop/新黄金三格.xlsm', {type:'binary'});

const ws1 = wb.Sheets['福'];
const ws2 = wb.Sheets['福 (2)'];
const data1 = XLSX.utils.sheet_to_json(ws1, {header:1});
const data2 = XLSX.utils.sheet_to_json(ws2, {header:1});

// Build full result history from both sheets
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

// Compute hAdd/hSub for all periods
const periods = Object.keys(resultMap).sort();
const analysis = {};
for (const p of periods) {
  const r = resultMap[p];
  const idx = periods.indexOf(p);
  const prev = idx > 0 ? resultMap[periods[idx-1]] : null;
  const hAdd = [(r.d1+r.d2)%10, (r.d2+r.d3)%10, (r.d3+r.d1)%10];
  const hSub = [Math.abs(r.d1-r.d2), Math.abs(r.d2-r.d3), Math.abs(r.d3-r.d1)];
  const vAdd = prev ? [(r.d1+prev.d1)%10, (r.d2+prev.d2)%10, (r.d3+prev.d3)%10] : [null,null,null];
  const vSub = prev ? [Math.abs(r.d1-prev.d1), Math.abs(r.d2-prev.d2), Math.abs(r.d3-prev.d3)] : [null,null,null];
  analysis[p] = {hAdd, hSub, vAdd, vSub, result: r};
}

// For each prediction period, compute 横加减回补/遗漏
// "回补" = digits that appeared in hAdd∪hSub in the LAST period
// "遗漏" = digits that did NOT appear in hAdd∪hSub in the LAST period
// OR maybe it's cumulative over multiple periods

// Let me first check: for period 26253 (last with data), what are the 回补/遗漏?
// From the Excel: 横加减回补 = "048", 横加减遗漏 = "4"
// Period 26253 result: 0,6,9
// hAdd = [6,5,9], hSub = [6,3,9]
// hAdd∪hSub = {3,5,6,9}
// Digits NOT in hAdd∪hSub: {0,1,2,4,7,8}
// But 回补 = "048" which is a subset of {0,1,2,4,7,8}
// And 遗漏 = "4" which is also a subset

// Let me check period 26252:
// Result: 8,9,3; hAdd=[7,2,1], hSub=[1,6,5]; hAdd∪hSub={1,2,5,6,7}
// 横加减回补 = "34", 横加减遗漏 = "4"
// Digits NOT in hAdd∪hSub: {0,3,4,8,9}
// 回补 = "34" ⊂ {0,3,4,8,9} ✓
// 遗漏 = "4" ⊂ {0,3,4,8,9} ✓

// Period 26251:
// Result: 1,9,0; hAdd=[0,9,1], hSub=[8,9,1]; hAdd∪hSub={0,1,8,9}
// 横加减回补 = "2367", 横加减遗漏 = "26"
// Digits NOT in hAdd∪hSub: {2,3,4,5,6,7}
// 回补 = "2367" ⊂ {2,3,4,5,6,7} ✓
// 遗漏 = "26" ⊂ {2,3,4,5,6,7} ✓

// Period 26250:
// Result: 2,3,7; hAdd=[5,0,9], hSub=[1,4,5]; hAdd∪hSub={0,1,4,5,9}
// 横加减回补 = "268", 横加减遗漏 = "28"
// Digits NOT in hAdd∪hSub: {2,3,6,7,8}
// 回补 = "268" ⊂ {2,3,6,7,8} ✓
// 遗漏 = "28" ⊂ {2,3,6,7,8} ✓

// So 回补 and 遗漏 are both subsets of the digits NOT in hAdd∪hSub.
// But what determines which subset?

// Let me check if 回补 = digits not in hAdd∪hSub for the LAST 2 periods
// For 26253: last 2 periods are 26252 and 26253
// 26253 hAdd∪hSub = {3,5,6,9}
// 26252 hAdd∪hSub = {1,2,5,6,7}
// Union of last 2: {1,2,3,5,6,7,9}
// Digits NOT in union: {0,4,8}
// 回补 for 26253 = "048" → {0,4,8} = digits not in union of last 2! ✓✓✓

// Let me verify with 26252:
// 26252 hAdd∪hSub = {1,2,5,6,7}
// 26251 hAdd∪hSub = {0,1,8,9}
// Union of last 2: {0,1,2,5,6,7,8,9}
// Digits NOT in union: {3,4}
// 回补 for 26252 = "34" → {3,4} ✓✓✓

// Verify with 26251:
// 26251 hAdd∪hSub = {0,1,8,9}
// 26250 hAdd∪hSub = {0,1,4,5,9}
// Union of last 2: {0,1,4,5,8,9}
// Digits NOT in union: {2,3,6,7}
// 回补 for 26251 = "2367" → {2,3,6,7} ✓✓✓

// Verify with 26250:
// 26250 hAdd∪hSub = {0,1,4,5,9}
// 26249 hAdd∪hSub = ?
// Need to compute...

console.log('=== 横加减回补 = digits NOT in hAdd∪hSub for last 2 periods ===');
console.log('Verified for periods 26250-26253!');

// Now what about 遗漏?
// 26253: 遗漏 = "4"
// 26252: 遗漏 = "4"
// 26251: 遗漏 = "26"
// 26250: 遗漏 = "28"

// Maybe 遗漏 = digits not in hAdd∪hSub for last 3 periods?
// For 26253: last 3 periods are 26251, 26252, 26253
// 26253 hAdd∪hSub = {3,5,6,9}
// 26252 hAdd∪hSub = {1,2,5,6,7}
// 26251 hAdd∪hSub = {0,1,8,9}
// Union of last 3: {0,1,2,3,5,6,7,8,9}
// Digits NOT in union: {4}
// 遗漏 for 26253 = "4" → {4} ✓✓✓

// Verify 26252:
// 26252, 26251, 26250
// 26252 hAdd∪hSub = {1,2,5,6,7}
// 26251 hAdd∪hSub = {0,1,8,9}
// 26250 hAdd∪hSub = {0,1,4,5,9}
// Union: {0,1,2,4,5,6,7,8,9}
// NOT in union: {3}
// But 遗漏 for 26252 = "4" ≠ {3} ✗

// Hmm, doesn't work for 26252. Let me try different window.
// Maybe 遗漏 is for the LAST 1 period only?
// 26253: last 1 period hAdd∪hSub = {3,5,6,9}, NOT = {0,1,2,4,7,8}
// 遗漏 = "4" ⊂ {0,1,2,4,7,8} but not equal

// Maybe 遗漏 tracks something different. Let me look at 竖加减回补/遗漏 too.
// For 26253: 竖加减回补 = "14", 竖加减遗漏 = "4"
// 26253 vAdd=[6,4,7], vSub=[0,4,7], vAdd∪vSub = {0,4,6,7}
// 26252 vAdd=[9,8,3], vSub=[7,0,3], vAdd∪vSub = {0,3,7,8,9}
// Union of last 2 vAdd∪vSub: {0,3,4,6,7,8,9}
// NOT in union: {1,2,5}
// But 竖加减回补 = "14" ≠ {1,2,5}

// Hmm, let me try: 竖加减回补 for 26253 = "14"
// Maybe it uses vAdd only (not vSub)?
// 26253 vAdd = [6,4,7], 26252 vAdd = [9,8,3]
// Union: {3,4,6,7,8,9}
// NOT: {0,1,2,5}
// Still not "14"

// Or maybe 竖加减 uses just the vSub?
// 26253 vSub = [0,4,7], 26252 vSub = [7,0,3]
// Union: {0,3,4,7}
// NOT: {1,2,5,6,8,9}
// Not "14" either

// Let me reconsider. Maybe the 回补/遗漏 concept is different from what I think.
// Let me look at the竖加减回补 column more carefully for period 26250.
// It showed a multi-line string. Let me re-examine.

// Actually, looking at the raw data again for period 26250:
// Last 10 cols (from 104): [1,0,0,,,,268,28,04689,06,,...]
// Col 110 (横加减回补) = 268
// Col 111 (横加减遗漏) = 28
// Col 112 (竖加减回补) = "04689"
// Col 113 (竖加减遗漏) = "06"

// For period 26251:
// Col 110 = 2367, Col 111 = 26, Col 112 = "0489", Col 113 = "0489"

// Wait, for 26251: 竖加减回补 = "0489" and 竖加减遗漏 = "0489" - they're the SAME!
// That's suspicious.

// For 26252: Col 110 = 34, Col 111 = 3, Col 112 = "45", Col 113 = "4"

// For 26253: Col 110 = "048", Col 111 = "4", Col 112 = "14", Col 113 = "4"

// Let me check: 竖加减回补 for 26253 = "14"
// 26253 vAdd=[6,4,7], vSub=[0,4,7]
// 26252 vAdd=[9,8,3], vSub=[7,0,3]
// vAdd∪vSub for 26253: {0,4,6,7}
// vAdd∪vSub for 26252: {0,3,7,8,9}
// Union of last 2: {0,3,4,6,7,8,9}
// NOT: {1,2,5}
// But 竖加减回补 = "14" ≠ {1,2,5}

// Hmm. Let me try: maybe it's only vAdd (not vSub) for the 竖加减 columns
// 26253 vAdd=[6,4,7], 26252 vAdd=[9,8,3]
// Union: {3,4,6,7,8,9}
// NOT: {0,1,2,5}
// Still not "14"

// Or maybe it's vSub only?
// 26253 vSub=[0,4,7], 26252 vSub=[7,0,3]
// Union: {0,3,4,7}
// NOT: {1,2,5,6,8,9}
// Not "14"

// I'm stuck on the 竖加减回补/遗漏 definition. Let me focus on what I KNOW:
// 横加减回补(N) = digits NOT in (hAdd∪hSub)(N) ∪ (hAdd∪hSub)(N-1)
// This is confirmed for 4 periods.

// Now let me compute this for the prediction periods and see if it helps.

console.log('\n=== Computing 横加减回补 for prediction periods ===');
const predPeriods = ['26266','26267','26268','26269','26270'];
for (const pp of predPeriods) {
  const idx = periods.indexOf(pp);
  if (idx < 1) continue;
  const prevP = periods[idx-1];
  const prev2P = idx >= 2 ? periods[idx-2] : null;

  const a1 = analysis[prevP];
  const a2 = prev2P ? analysis[prev2P] : null;

  const set1 = new Set([...a1.hAdd, ...a1.hSub]);
  const set2 = a2 ? new Set([...a2.hAdd, ...a2.hSub]) : new Set();
  const union = new Set([...set1, ...set2]);
  const huibu = [];
  for (let d = 0; d <= 9; d++) { if (!union.has(d)) huibu.push(d); }

  console.log(`Period ${pp}: prev=${prevP}(${a1.result.d1}${a1.result.d2}${a1.result.d3}), prev2=${prev2P||'N/A'}`);
  console.log(`  hAdd∪hSub for ${prevP}: [${set1}]`);
  if (a2) console.log(`  hAdd∪hSub for ${prev2P}: [${set2}]`);
  console.log(`  横加减回补: ${huibu.join('')}`);

  // Also compute for 3-period window
  if (prev2P && idx >= 3) {
    const prev3P = periods[idx-3];
    const a3 = analysis[prev3P];
    const set3 = new Set([...a3.hAdd, ...a3.hSub]);
    const union3 = new Set([...set1, ...set2, ...set3]);
    const yilou3 = [];
    for (let d = 0; d <= 9; d++) { if (!union3.has(d)) yilou3.push(d); }
    console.log(`  hAdd∪hSub for ${prev3P}: [${set3}]`);
    console.log(`  3-period 遗漏: ${yilou3.join('')}`);
  }
}

// Now let me also compute 竖加减回补
// I need to figure out the definition first.
// Let me try: 竖加减回补(N) = digits NOT in (vAdd∪vSub)(N) ∪ (vAdd∪vSub)(N-1)
console.log('\n=== Testing 竖加减回补 definition ===');
// For 26253: expected "14"
const a253 = analysis['26253'];
const a252 = analysis['26252'];
const vSet253 = new Set([...a253.vAdd, ...a253.vSub]);
const vSet252 = new Set([...a252.vAdd, ...a252.vSub]);
const vUnion253 = new Set([...vSet253, ...vSet252]);
const vHuibu253 = [];
for (let d = 0; d <= 9; d++) { if (!vUnion253.has(d)) vHuibu253.push(d); }
console.log(`26253: vAdd∪vSub 26253=[${[...vSet253]}], 26252=[${[...vSet252]}]`);
console.log(`  Union: [${[...vUnion253]}], NOT: [${vHuibu253}]`);
console.log(`  Expected 竖加减回补: "14", Got: "${vHuibu253.join('')}"`);

// Try just vAdd (not vSub)
const vaSet253 = new Set(a253.vAdd.filter(x=>x!==null));
const vaSet252 = new Set(a252.vAdd.filter(x=>x!==null));
const vaUnion = new Set([...vaSet253, ...vaSet252]);
const vaHuibu = [];
for (let d = 0; d <= 9; d++) { if (!vaUnion.has(d)) vaHuibu.push(d); }
console.log(`  vAdd only 26253=[${[...vaSet253]}], 26252=[${[...vaSet252]}]`);
console.log(`  Union: [${[...vaUnion]}], NOT: [${vaHuibu}]`);

// Try just vSub
const vsSet253 = new Set(a253.vSub.filter(x=>x!==null));
const vsSet252 = new Set(a252.vSub.filter(x=>x!==null));
const vsUnion = new Set([...vsSet253, ...vsSet252]);
const vsHuibu = [];
for (let d = 0; d <= 9; d++) { if (!vsUnion.has(d)) vsHuibu.push(d); }
console.log(`  vSub only 26253=[${[...vsSet253]}], 26252=[${[...vsSet252]}]`);
console.log(`  Union: [${[...vsUnion]}], NOT: [${vsHuibu}]`);
