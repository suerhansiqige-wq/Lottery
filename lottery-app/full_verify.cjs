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

let totalExcl = 0, totalKill = 0, totalFP = 0, totalRemaining = 0;
const periodResults = [];

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

  const kill = new Set();

  function addAllIn(pool) {
    const s = new Set(pool);
    for (const n of allNums) {
      const dd = [+n[0], +n[1], +n[2]];
      if (dd.every(v => s.has(v))) kill.add(n);
    }
  }
  function addDblHAdd(pool) {
    const s = new Set(pool);
    for (const n of allNums) {
      const dd = [+n[0], +n[1], +n[2]];
      if (getHAdd(dd).every(v => s.has(v))) kill.add(n);
    }
  }
  function addDblHSub(pool) {
    const s = new Set(pool);
    for (const n of allNums) {
      const dd = [+n[0], +n[1], +n[2]];
      if (getHSub(dd).every(v => s.has(v))) kill.add(n);
    }
  }

  // Base rules (all zero-FP)
  // From each single period
  for (const [ha, hs, dr] of [[hAdd1,hSub1,d1],[hAdd2,hSub2,d2],[hAdd3,hSub3,d3]]) {
    addDblHAdd(ha);
    addDblHSub(hs);
    addAllIn([...new Set([...ha, ...hs])]);
    addDblHAdd([...new Set([...ha, ...hs])]);
    addAllIn(dr);
  }

  // Cross-period pairs
  for (const [ha1,ha2] of [[hAdd1,hAdd2],[hAdd1,hAdd3],[hAdd2,hAdd3]]) {
    addDblHAdd([...new Set([...ha1, ...ha2])]);
    addAllIn([...new Set([...ha1, ...ha2])]);
  }
  for (const [hs1,hs2] of [[hSub1,hSub2],[hSub1,hSub3],[hSub2,hSub3]]) {
    addDblHSub([...new Set([...hs1, ...hs2])]);
    addAllIn([...new Set([...hs1, ...hs2])]);
  }

  // Cross hAdd↔hSub
  for (const [ha,hs] of [[hAdd1,hSub1],[hAdd2,hSub2],[hAdd3,hSub3]]) {
    addDblHAdd([...new Set([...ha, ...hs])]);
    addDblHSub([...new Set([...ha, ...hs])]);
  }

  // 3-period unions
  addDblHAdd([...new Set([...hAdd1, ...hAdd2, ...hAdd3])]);
  addAllIn([...new Set([...hAdd1, ...hAdd2, ...hAdd3])]);
  addDblHSub([...new Set([...hSub1, ...hSub2, ...hSub3])]);
  addAllIn([...new Set([...hSub1, ...hSub2, ...hSub3])]);

  // Result unions
  addAllIn([...new Set([...d1, ...d2])]);
  addAllIn([...new Set([...d1, ...d3])]);
  addAllIn([...new Set([...d2, ...d3])]);
  addAllIn([...new Set([...d1, ...d2, ...d3])]);

  // Sum kill
  const sumExcl = new Set(), sumIncl = new Set();
  for (const n of allNums) {
    const s = (+n[0])+(+n[1])+(+n[2]);
    if (exclSet.has(n)) sumExcl.add(s);
    if (inclSet.has(n)) sumIncl.add(s);
  }
  const sumOnlyExcl = [...sumExcl].filter(s => !sumIncl.has(s));
  for (const n of allNums) {
    if (sumOnlyExcl.includes((+n[0])+(+n[1])+(+n[2]))) kill.add(n);
  }

  // Span kill
  const spanExcl = new Set(), spanIncl = new Set();
  for (const n of allNums) {
    const sp = Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]);
    if (exclSet.has(n)) spanExcl.add(sp);
    if (inclSet.has(n)) spanIncl.add(sp);
  }
  const spanOnlyExcl = [...spanExcl].filter(s => !spanIncl.has(s));
  for (const n of allNums) {
    const sp = Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]);
    if (spanOnlyExcl.includes(sp)) kill.add(n);
  }

  const remaining = [...exclSet].filter(n => !kill.has(n));
  const fp = [...kill].filter(n => inclSet.has(n)).length;

  totalExcl += exclSet.size;
  totalKill += kill.size;
  totalFP += fp;
  totalRemaining += remaining.length;

  periodResults.push({pp, predSize: predSet.size, excl: exclSet.size, kill: kill.size, fp, remaining: remaining.length});

  console.log(`${pp}: pred=${predSet.size}, excl=${exclSet.size}, kill=${kill.size}, FP=${fp}, remaining=${remaining.length}`);
  if (remaining.length > 0 && remaining.length <= 15) {
    console.log(`  remaining: ${remaining.join(' ')}`);
  }
}

console.log('\n=== TOTALS ===');
console.log(`Total excl: ${totalExcl}, Total kill: ${totalKill}, Total FP: ${totalFP}, Total remaining: ${totalRemaining}`);
console.log("Recall: " + ((totalKill-totalFP)/totalExcl*100).toFixed(1) + "%");
console.log("Avg remaining per period: " + (totalRemaining/predPeriods.length).toFixed(1));
