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
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(d3)) resultMap[period] = {d1, d2, d3};
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

// Compute all analysis
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
  analysis[p] = {hAdd, hSub, vAdd, vSub, shenghao: sheng, lianhao: [...lian], bichu, result: r};
  prevG2 = g2;
}

// For each prediction period, compute all analysis values and try to find the pattern
const predPeriods = Object.keys(preds).sort();

// Let me try: the prediction EXCLUDES numbers where the number's digits
// are ALL contained in the "横加减回补" set (2-period window)
// PLUS numbers where digits are ALL in "竖加减回补"
// PLUS 豹子
// PLUS numbers where digits are ALL in "生号"
// PLUS numbers where digits are ALL in "连号"

// Let me check each component's contribution

for (const pp of predPeriods.slice(0, 3)) {
  const idx = periods.indexOf(pp);
  if (idx < 3) continue;
  const p1 = periods[idx-1], p2 = periods[idx-2], p3 = periods[idx-3];
  const a1 = analysis[p1], a2 = analysis[p2], a3 = analysis[p3];

  // Compute 回补/遗漏
  const hSet1 = new Set([...a1.hAdd, ...a1.hSub]);
  const hSet2 = new Set([...a2.hAdd, ...a2.hSub]);
  const hSet3 = new Set([...a3.hAdd, ...a3.hSub]);
  const hUnion2 = new Set([...hSet1, ...hSet2]);
  const hUnion3 = new Set([...hSet1, ...hSet2, ...hSet3]);
  const hHuibu = []; for (let d=0;d<=9;d++) if(!hUnion2.has(d)) hHuibu.push(d);
  const hYilou = []; for (let d=0;d<=9;d++) if(!hUnion3.has(d)) hYilou.push(d);

  const vSet1 = new Set([...(a1.vAdd||[]).filter(x=>x!==null), ...(a1.vSub||[]).filter(x=>x!==null)]);
  const vSet2 = new Set([...(a2.vAdd||[]).filter(x=>x!==null), ...(a2.vSub||[]).filter(x=>x!==null)]);
  const vSet3 = new Set([...(a3.vAdd||[]).filter(x=>x!==null), ...(a3.vSub||[]).filter(x=>x!==null)]);
  const vUnion2 = new Set([...vSet1, ...vSet2]);
  const vUnion3 = new Set([...vSet1, ...vSet2, ...vSet3]);
  const vHuibu = []; for (let d=0;d<=9;d++) if(!vUnion2.has(d)) vHuibu.push(d);
  const vYilou = []; for (let d=0;d<=9;d++) if(!vUnion3.has(d)) vYilou.push(d);

  const predSet = preds[pp];
  const allNums = [];
  for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);
  const excluded = new Set(allNums.filter(n => !predSet.has(n)));

  console.log(`\n=== Period ${pp} (excl: ${excluded.size}) ===`);
  console.log(`  横回补(2): [${hHuibu}], 横遗漏(3): [${hYilou}]`);
  console.log(`  竖回补(2): [${vHuibu}], 竖遗漏(3): [${vYilou}]`);
  console.log(`  生号: [${a1.shenghao}], 连号: [${a1.lianhao}], 必出号: [${a1.bichu}]`);

  // Try: exclude = 豹子 ∪ {all digits in 横回补} ∪ {all digits in 竖回补} ∪ {all digits in 生号} ∪ {all digits in 连号}
  const sets = {
    '豹子': new Set(allNums.filter(n => n[0]===n[1] && n[1]===n[2])),
    'allIn横回补': new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].every(d => new Set(hHuibu).has(d)))),
    'allIn竖回补': new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].every(d => new Set(vHuibu).has(d)))),
    'allIn生号': new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].every(d => new Set(a1.shenghao).has(d)))),
    'allIn连号': new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].every(d => new Set(a1.lianhao).has(d)))),
    'allIn横遗漏': new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].every(d => new Set(hYilou).has(d)))),
    'allIn竖遗漏': new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].every(d => new Set(vYilou).has(d)))),
  };

  // Show each set's size and overlap with actual excluded
  for (const [name, set] of Object.entries(sets)) {
    const overlap = [...set].filter(n => excluded.has(n)).length;
    console.log(`  ${name}: ${set.size} nums, ${overlap} match excl`);
  }

  // Try union of all
  const allKilled = new Set();
  for (const set of Object.values(sets)) {
    for (const n of set) allKilled.add(n);
  }
  const matchAll = [...allKilled].filter(n => excluded.has(n)).length;
  console.log(`  UNION ALL: ${allKilled.size} nums, ${matchAll} match excl (target: ${excluded.size})`);

  // What's still missing?
  const missing = [...excluded].filter(n => !allKilled.has(n));
  console.log(`  Missing from union: ${missing.length}`);

  // Let me also try: exclude numbers where ANY digit is in 横遗漏
  const anyInH_Yilou = new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].some(d => new Set(hYilou).has(d))));
  const anyInV_Yilou = new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].some(d => new Set(vYilou).has(d))));
  console.log(`  anyIn横遗漏: ${anyInH_Yilou.size}, match: ${[...anyInH_Yilou].filter(n=>excluded.has(n)).length}`);
  console.log(`  anyIn竖遗漏: ${anyInV_Yilou.size}, match: ${[...anyInV_Yilou].filter(n=>excluded.has(n)).length}`);

  // Try: exclude = 豹子 ∪ {allIn横回补} ∪ {allIn竖回补} ∪ {allIn生号}
  const combo1 = new Set([...sets['豹子'], ...sets['allIn横回补'], ...sets['allIn竖回补'], ...sets['allIn生号']]);
  console.log(`  豹子+allIn横回补+allIn竖回补+allIn生号: ${combo1.size}, match: ${[...combo1].filter(n=>excluded.has(n)).length}`);

  // Try: exclude = combo1 ∪ {anyIn横遗漏}
  const combo2 = new Set([...combo1, ...anyInH_Yilou]);
  console.log(`  combo1+anyIn横遗漏: ${combo2.size}, match: ${[...combo2].filter(n=>excluded.has(n)).length}`);

  // What if we look at it differently: for each excluded number, what property does it have?
  // Let me check: does every excluded number have at least one digit in 横回补∪竖回补?
  const huibuUnion = new Set([...hHuibu, ...vHuibu]);
  const exclWithDigitInHuibu = [...excluded].filter(n => [+n[0],+n[1],+n[2]].some(d => huibuUnion.has(d)));
  console.log(`  Excl with ≥1 digit in 横回补∪竖回补: ${exclWithDigitInHuibu.length}/${excluded.size}`);

  // Does every excluded number have at least one digit in 生号∪连号?
  const shengLianUnion = new Set([...a1.shenghao, ...a1.lianhao]);
  const exclWithDigitInShengLian = [...excluded].filter(n => [+n[0],+n[1],+n[2]].some(d => shengLianUnion.has(d)));
  console.log(`  Excl with ≥1 digit in 生号∪连号: ${exclWithDigitInShengLian.length}/${excluded.size}`);

  // Combined: 横回补∪竖回补∪生号∪连号
  const allKilledDigits = new Set([...hHuibu, ...vHuibu, ...a1.shenghao, ...a1.lianhao]);
  console.log(`  横回补∪竖回补∪生号∪连号 = [${[...allKilledDigits].sort()}]`);
  const exclWithDigitInAll = [...excluded].filter(n => [+n[0],+n[1],+n[2]].some(d => allKilledDigits.has(d)));
  console.log(`  Excl with ≥1 digit in above: ${exclWithDigitInAll.length}/${excluded.size}`);

  // Numbers with NO digit in allKilledDigits
  const noDigitInAll = allNums.filter(n => ![+n[0],+n[1],+n[2]].some(d => allKilledDigits.has(d)));
  console.log(`  Numbers with NO digit in allKilled: ${noDigitInAll.length}`);
  // These should all be in the prediction
  const noDigitInAllExcluded = noDigitInAll.filter(n => excluded.has(n));
  console.log(`  Of these, how many are excluded: ${noDigitInAllExcluded.length}`);
}
