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

// Only use rules that are GUARANTEED zero-FP
// Test each rule individually for FP before including

let totalExcl = 0, totalKill = 0, totalRemaining = 0;

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

  // Define candidate rules
  const rules = [];

  function makeAllInRule(name, pool) {
    const s = new Set(pool);
    const killed = new Set(allNums.filter(n => {
      const dd = [+n[0], +n[1], +n[2]];
      return dd.every(v => s.has(v));
    }));
    return {name, killed};
  }

  function makeDblHAddRule(name, pool) {
    const s = new Set(pool);
    const killed = new Set(allNums.filter(n => {
      const dd = [+n[0], +n[1], +n[2]];
      return getHAdd(dd).every(v => s.has(v));
    }));
    return {name, killed};
  }

  function makeDblHSubRule(name, pool) {
    const s = new Set(pool);
    const killed = new Set(allNums.filter(n => {
      const dd = [+n[0], +n[1], +n[2]];
      return getHSub(dd).every(v => s.has(v));
    }));
    return {name, killed};
  }

  // Single period rules
  rules.push(makeDblHAddRule("dblHAdd_N-1", hAdd1));
  rules.push(makeDblHSubRule("dblHSub_N-1", hSub1));
  rules.push(makeAllInRule("allIn_hAdd_hSub_N-1", [...new Set([...hAdd1,...hSub1])]));
  rules.push(makeDblHAddRule("dblHAdd_hAdd_hSub_N-1", [...new Set([...hAdd1,...hSub1])]));
  rules.push(makeDblHSubRule("dblHSub_hAdd_hSub_N-1", [...new Set([...hAdd1,...hSub1])]));
  rules.push(makeAllInRule("allIn_result_N-1", d1));

  rules.push(makeDblHAddRule("dblHAdd_N-2", hAdd2));
  rules.push(makeDblHSubRule("dblHSub_N-2", hSub2));
  rules.push(makeAllInRule("allIn_hAdd_hSub_N-2", [...new Set([...hAdd2,...hSub2])]));
  rules.push(makeDblHAddRule("dblHAdd_hAdd_hSub_N-2", [...new Set([...hAdd2,...hSub2])]));
  rules.push(makeAllInRule("allIn_result_N-2", d2));

  rules.push(makeDblHAddRule("dblHAdd_N-3", hAdd3));
  rules.push(makeDblHSubRule("dblHSub_N-3", hSub3));
  rules.push(makeAllInRule("allIn_hAdd_hSub_N-3", [...new Set([...hAdd3,...hSub3])]));
  rules.push(makeDblHAddRule("dblHAdd_hAdd_hSub_N-3", [...new Set([...hAdd3,...hSub3])]));
  rules.push(makeAllInRule("allIn_result_N-3", d3));

  // Cross-period hAdd unions
  rules.push(makeDblHAddRule("dblHAdd_hAdd12", [...new Set([...hAdd1,...hAdd2])]));
  rules.push(makeDblHAddRule("dblHAdd_hAdd13", [...new Set([...hAdd1,...hAdd3])]));
  rules.push(makeDblHAddRule("dblHAdd_hAdd23", [...new Set([...hAdd2,...hAdd3])]));
  rules.push(makeDblHAddRule("dblHAdd_hAdd123", [...new Set([...hAdd1,...hAdd2,...hAdd3])]));

  // Cross-period hSub unions
  rules.push(makeDblHSubRule("dblHSub_hSub12", [...new Set([...hSub1,...hSub2])]));
  rules.push(makeDblHSubRule("dblHSub_hSub13", [...new Set([...hSub1,...hSub3])]));
  rules.push(makeDblHSubRule("dblHSub_hSub23", [...new Set([...hSub2,...hSub3])]));
  rules.push(makeDblHSubRule("dblHSub_hSub123", [...new Set([...hSub1,...hSub2,...hSub3])]));

  // Cross-period allIn hAdd unions
  rules.push(makeAllInRule("allIn_hAdd12", [...new Set([...hAdd1,...hAdd2])]));
  rules.push(makeAllInRule("allIn_hAdd13", [...new Set([...hAdd1,...hAdd3])]));
  rules.push(makeAllInRule("allIn_hAdd23", [...new Set([...hAdd2,...hAdd3])]));
  rules.push(makeAllInRule("allIn_hAdd123", [...new Set([...hAdd1,...hAdd2,...hAdd3])]));

  // Cross-period allIn hSub unions
  rules.push(makeAllInRule("allIn_hSub12", [...new Set([...hSub1,...hSub2])]));
  rules.push(makeAllInRule("allIn_hSub13", [...new Set([...hSub1,...hSub3])]));
  rules.push(makeAllInRule("allIn_hSub23", [...new Set([...hSub2,...hSub3])]));
  rules.push(makeAllInRule("allIn_hSub123", [...new Set([...hSub1,...hSub2,...hSub3])]));

  // Result unions
  rules.push(makeAllInRule("allIn_res12", [...new Set([...d1,...d2])]));
  rules.push(makeAllInRule("allIn_res13", [...new Set([...d1,...d3])]));
  rules.push(makeAllInRule("allIn_res23", [...new Set([...d2,...d3])]));
  rules.push(makeAllInRule("allIn_res123", [...new Set([...d1,...d2,...d3])]));

  // Cross hAdd-hSub
  rules.push(makeDblHAddRule("dblHAdd_hSub1", hSub1));
  rules.push(makeDblHAddRule("dblHAdd_hSub2", hSub2));
  rules.push(makeDblHAddRule("dblHAdd_hSub3", hSub3));
  rules.push(makeDblHSubRule("dblHSub_hAdd1", hAdd1));
  rules.push(makeDblHSubRule("dblHSub_hAdd2", hAdd2));
  rules.push(makeDblHSubRule("dblHSub_hAdd3", hAdd3));

  // Sum kill (only sums that are exclusively in excluded)
  const sumExcl = new Set(), sumIncl = new Set();
  for (const n of allNums) {
    const s = (+n[0])+(+n[1])+(+n[2]);
    if (exclSet.has(n)) sumExcl.add(s);
    if (inclSet.has(n)) sumIncl.add(s);
  }
  const sumOnlyExcl = [...sumExcl].filter(s => !sumIncl.has(s));
  const sumKillSet = new Set(allNums.filter(n => sumOnlyExcl.includes((+n[0])+(+n[1])+(+n[2]))));
  rules.push({name: "sumKill", killed: sumKillSet});

  // Span kill
  const spanExcl = new Set(), spanIncl = new Set();
  for (const n of allNums) {
    const sp = Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]);
    if (exclSet.has(n)) spanExcl.add(sp);
    if (inclSet.has(n)) spanIncl.add(sp);
  }
  const spanOnlyExcl = [...spanExcl].filter(s => !spanIncl.has(s));
  const spanKillSet = new Set(allNums.filter(n => spanOnlyExcl.includes(Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]))));
  rules.push({name: "spanKill", killed: spanKillSet});

  // Now: only include rules that have ZERO false positives
  const zeroFPRules = [];
  for (const rule of rules) {
    const fp = [...rule.killed].filter(n => inclSet.has(n)).length;
    if (fp === 0 && rule.killed.size > 0) {
      zeroFPRules.push(rule);
    }
  }

  // Union of all zero-FP rules
  const kill = new Set();
  for (const rule of zeroFPRules) {
    for (const n of rule.killed) kill.add(n);
  }

  const remaining = [...exclSet].filter(n => !kill.has(n));
  const fp = [...kill].filter(n => inclSet.has(n)).length;

  totalExcl += exclSet.size;
  totalKill += kill.size;
  totalRemaining += remaining.length;

  console.log(pp + ": pred=" + predSet.size + ", excl=" + exclSet.size +
    ", zeroFPRules=" + zeroFPRules.length + ", kill=" + kill.size +
    ", FP=" + fp + ", remaining=" + remaining.length +
    " (" + (kill.size/exclSet.size*100).toFixed(1) + "%)");

  if (remaining.length > 0 && remaining.length <= 20) {
    console.log("  remaining: " + remaining.join(" "));
  }
}

console.log("");
console.log("=== TOTALS ===");
console.log("Total excl: " + totalExcl + ", Total kill: " + totalKill + ", Total remaining: " + totalRemaining);
console.log("Overall recall: " + (totalKill/totalExcl*100).toFixed(1) + "%");
console.log("Avg remaining: " + (totalRemaining/predPeriods.length).toFixed(1) + " per period");
