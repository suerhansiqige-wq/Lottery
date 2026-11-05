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

  // Generate candidate rules
  const candidateRules = [];

  function addAllInRule(name, pool) {
    const s = new Set(pool);
    const killed = allNums.filter(n => [+n[0],+n[1],+n[2]].every(v => s.has(v)));
    candidateRules.push({name, killed: new Set(killed)});
  }
  function addDblHAddRule(name, pool) {
    const s = new Set(pool);
    const killed = allNums.filter(n => getHAdd([+n[0],+n[1],+n[2]]).every(v => s.has(v)));
    candidateRules.push({name, killed: new Set(killed)});
  }
  function addDblHSubRule(name, pool) {
    const s = new Set(pool);
    const killed = allNums.filter(n => getHSub([+n[0],+n[1],+n[2]]).every(v => s.has(v)));
    candidateRules.push({name, killed: new Set(killed)});
  }

  // Single period rules
  const periods_data = [
    {suffix: "N-1", ha: hAdd1, hs: hSub1, dr: d1},
    {suffix: "N-2", ha: hAdd2, hs: hSub2, dr: d2},
    {suffix: "N-3", ha: hAdd3, hs: hSub3, dr: d3},
  ];

  for (const p of periods_data) {
    addDblHAddRule("dblHAdd_" + p.suffix, p.ha);
    addDblHSubRule("dblHSub_" + p.suffix, p.hs);
    addAllInRule("allIn_ha∪hs_" + p.suffix, [...new Set([...p.ha, ...p.hs])]);
    addDblHAddRule("dblHAdd_ha∪hs_" + p.suffix, [...new Set([...p.ha, ...p.hs])]);
    addDblHSubRule("dblHSub_ha∪hs_" + p.suffix, [...new Set([...p.ha, ...p.hs])]);
    addAllInRule("allIn_result_" + p.suffix, p.dr);
  }

  // Cross-period hAdd unions
  addDblHAddRule("dblHAdd_ha12", [...new Set([...hAdd1,...hAdd2])]);
  addDblHAddRule("dblHAdd_ha13", [...new Set([...hAdd1,...hAdd3])]);
  addDblHAddRule("dblHAdd_ha23", [...new Set([...hAdd2,...hAdd3])]);
  addDblHAddRule("dblHAdd_ha123", [...new Set([...hAdd1,...hAdd2,...hAdd3])]);
  addAllInRule("allIn_ha12", [...new Set([...hAdd1,...hAdd2])]);
  addAllInRule("allIn_ha13", [...new Set([...hAdd1,...hAdd3])]);
  addAllInRule("allIn_ha23", [...new Set([...hAdd2,...hAdd3])]);
  addAllInRule("allIn_ha123", [...new Set([...hAdd1,...hAdd2,...hAdd3])]);

  // Cross-period hSub unions
  addDblHSubRule("dblHSub_hs12", [...new Set([...hSub1,...hSub2])]);
  addDblHSubRule("dblHSub_hs13", [...new Set([...hSub1,...hSub3])]);
  addDblHSubRule("dblHSub_hs23", [...new Set([...hSub2,...hSub3])]);
  addDblHSubRule("dblHSub_hs123", [...new Set([...hSub1,...hSub2,...hSub3])]);
  addAllInRule("allIn_hs12", [...new Set([...hSub1,...hSub2])]);
  addAllInRule("allIn_hs13", [...new Set([...hSub1,...hSub3])]);
  addAllInRule("allIn_hs23", [...new Set([...hSub2,...hSub3])]);
  addAllInRule("allIn_hs123", [...new Set([...hSub1,...hSub2,...hSub3])]);

  // Cross hAdd-hSub
  for (const p of periods_data) {
    addDblHAddRule("dblHAdd_hs_" + p.suffix, p.hs);
    addDblHSubRule("dblHSub_ha_" + p.suffix, p.ha);
    addDblHAddRule("dblHAdd_ha∪hs_" + p.suffix, [...new Set([...p.ha, ...p.hs])]);
    addDblHSubRule("dblHSub_ha∪hs_" + p.suffix, [...new Set([...p.ha, ...p.hs])]);
  }

  // Result unions
  addAllInRule("allIn_res12", [...new Set([...d1,...d2])]);
  addAllInRule("allIn_res13", [...new Set([...d1,...d3])]);
  addAllInRule("allIn_res23", [...new Set([...d2,...d3])]);
  addAllInRule("allIn_res123", [...new Set([...d1,...d2,...d3])]);

  // Sum kill
  const sumExcl = new Set(), sumIncl = new Set();
  for (const n of allNums) {
    const s = (+n[0])+(+n[1])+(+n[2]);
    if (exclSet.has(n)) sumExcl.add(s);
    if (inclSet.has(n)) sumIncl.add(s);
  }
  const sumOnlyExcl = [...sumExcl].filter(s => !sumIncl.has(s));
  candidateRules.push({
    name: "sumKill",
    killed: new Set(allNums.filter(n => sumOnlyExcl.includes((+n[0])+(+n[1])+(+n[2]))))
  });

  // Span kill
  const spanExcl = new Set(), spanIncl = new Set();
  for (const n of allNums) {
    const sp = Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]);
    if (exclSet.has(n)) spanExcl.add(sp);
    if (inclSet.has(n)) spanIncl.add(sp);
  }
  const spanOnlyExcl = [...spanExcl].filter(s => !spanIncl.has(s));
  candidateRules.push({
    name: "spanKill",
    killed: new Set(allNums.filter(n => spanOnlyExcl.includes(Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]))))
  });

  // Filter: only keep rules with ZERO false positives for THIS period
  const zeroFPRules = [];
  for (const rule of candidateRules) {
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

  totalExcl += exclSet.size;
  totalKill += kill.size;
  totalRemaining += remaining.length;

  console.log(pp + ": excl=" + exclSet.size + ", rules=" + zeroFPRules.length +
    ", kill=" + kill.size + " (" + (kill.size/exclSet.size*100).toFixed(1) +
    "%), remaining=" + remaining.length);

  if (remaining.length <= 10) {
    console.log("  remaining: " + remaining.join(" "));
  }
}

console.log("");
console.log("=== TOTALS ===");
console.log("Total excl: " + totalExcl + ", Total kill: " + totalKill + ", Total remaining: " + totalRemaining);
console.log("Overall recall: " + (totalKill/totalExcl*100).toFixed(1) + "%");
console.log("Avg remaining: " + (totalRemaining/predPeriods.length).toFixed(1));
