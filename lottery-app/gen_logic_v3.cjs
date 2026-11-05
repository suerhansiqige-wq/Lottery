const XLSX = require("xlsx");
const path = require("path");

const FILE = path.join("C:\\Users\\boloor\\Desktop", "新黄金三格.xlsm");
const wb = XLSX.readFile(FILE, { type: "file" });

// Read Sheet '福' for history
const ws = wb.Sheets["福"];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

const allData = {};
const periodOrder = [];
for (let r = 1; r < raw.length; r++) {
  const row = raw[r];
  if (!row || row.length < 4) continue;
  const period = String(row[0]).trim();
  const d1 = row[1], d2 = row[2], d3 = row[3];
  if (d1 == null || d2 == null || d3 == null) continue;
  allData[period] = [+d1, +d2, +d3];
  periodOrder.push(period);
}

// Read Sheet '福 (2)' for additional periods + predictions
const ws2 = wb.Sheets["福 (2)"];
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
const predictions = {};
for (let r = 1; r < raw2.length; r++) {
  const row = raw2[r];
  if (!row || row.length < 5) continue;
  const period = String(row[0]).trim();
  const d1 = row[1], d2 = row[2], d3 = row[3];
  if (d1 != null && d2 != null && d3 != null && !allData[period]) {
    allData[period] = [+d1, +d2, +d3];
    periodOrder.push(period);
  }
  const predStr = String(row[4] || "").trim();
  if (!predStr) continue;
  const nums = predStr.split(/\s+/).filter(n => /^\d{3}$/.test(n));
  if (nums.length > 0) predictions[period] = nums;
}

periodOrder.sort();

console.log("Total periods:", periodOrder.length);
console.log("Range:", periodOrder[0], "~", periodOrder[periodOrder.length - 1]);
console.log("Prediction periods:", Object.keys(predictions).sort().join(", "));

// Helpers
function digits(n) { return [+n[0], +n[1], +n[2]]; }
function numStr(d) { return "" + d[0] + d[1] + d[2]; }
function hAdd(d) { return [(d[0] + d[1]) % 10, (d[1] + d[2]) % 10, (d[2] + d[0]) % 10]; }
function hSub(d) { return [Math.abs(d[0] - d[1]), Math.abs(d[1] - d[2]), Math.abs(d[2] - d[0])]; }
function vAdd(d, prev) { return [(d[0] + prev[0]) % 10, (d[1] + prev[1]) % 10, (d[2] + prev[2]) % 10]; }
function vSub(d, prev) { return [Math.abs(d[0] - prev[0]), Math.abs(d[1] - prev[1]), Math.abs(d[2] - prev[2])]; }

function shengHao(d) {
  const s = new Set(d);
  const res = [];
  for (let i = 0; i <= 9; i++) if (!s.has(i)) res.push(i);
  return res;
}

function lianHao(d) {
  const s = new Set();
  for (let i = 0; i < d.length - 1; i++) {
    s.add(d[i]); s.add(d[i + 1]);
  }
  return [...s].sort((a, b) => a - b);
}

function biChuHao(d, prev) {
  const ha = hAdd(d), hs = hSub(d);
  const va = vAdd(d, prev), vs = vSub(d, prev);
  const counts = {};
  for (let i = 0; i <= 9; i++) counts[i] = 0;
  for (const v of [...ha, ...hs, ...va, ...vs]) counts[v]++;
  return Object.entries(counts).filter(([k, v]) => v >= 2).map(([k]) => +k);
}

const allNums = [];
for (let i = 0; i < 1000; i++) allNums.push(String(i).padStart(3, "0"));

const predPeriods = Object.keys(predictions).sort();

// === PART 1: Per-period kill rule analysis ===
console.log("\n=== 第一部分: 逐期杀号规则分析 ===\n");

for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) { console.log("Skip " + period + " (no enough history)"); continue; }

  const cur = allData[period];
  const prev1 = allData[periodOrder[idx - 1]];
  const prev2 = allData[periodOrder[idx - 2]];
  const prev3 = allData[periodOrder[idx - 3]];

  const predSet = new Set(predictions[period]);
  const notPred = new Set(allNums.filter(n => !predSet.has(n)));

  // Compute all pools
  const ha1 = hAdd(prev1), hs1 = hSub(prev1);
  const ha2 = hAdd(prev2), hs2 = hSub(prev2);
  const ha3 = hAdd(prev3), hs3 = hSub(prev3);
  const va1 = vAdd(prev1, prev2), vs1 = vSub(prev1, prev2);
  const va2 = vAdd(prev2, prev3), vs2 = vSub(prev2, prev3);

  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);

  const sh1 = new Set(shengHao(prev1)), sh2 = new Set(shengHao(prev2)), sh3 = new Set(shengHao(prev3));
  const lh1 = new Set(lianHao(prev1)), lh2 = new Set(lianHao(prev2)), lh3 = new Set(lianHao(prev3));
  const bc1 = new Set(biChuHao(prev1, prev2)), bc2 = new Set(biChuHao(prev2, prev3));

  console.log("=== " + period + " 开奖=" + numStr(cur) + " 预测=" + predSet.size + "注 非预测=" + notPred.size + "注 ===");
  console.log("  N-1=" + numStr(prev1) + " ha=" + JSON.stringify(ha1) + " hs=" + JSON.stringify(hs1) + " va=" + JSON.stringify(va1) + " vs=" + JSON.stringify(vs1));
  console.log("  N-2=" + numStr(prev2) + " ha=" + JSON.stringify(ha2) + " hs=" + JSON.stringify(hs2));
  console.log("  N-3=" + numStr(prev3) + " ha=" + JSON.stringify(ha3) + " hs=" + JSON.stringify(hs3));
  console.log("  生号: N-1=" + JSON.stringify([...sh1]) + " N-2=" + JSON.stringify([...sh2]) + " N-3=" + JSON.stringify([...sh3]));
  console.log("  连号: N-1=" + JSON.stringify([...lh1]) + " N-2=" + JSON.stringify([...lh2]) + " N-3=" + JSON.stringify([...lh3]));
  console.log("  必出号: N-1=" + JSON.stringify([...bc1]) + " N-2=" + JSON.stringify([...bc2]));

  // Test each kill rule: count how many notPred it explains, and how many pred it wrongly kills
  function analyzeKill(name, killFn) {
    let killNotPred = 0, killPred = 0;
    for (const n of notPred) { if (killFn(n)) killNotPred++; }
    for (const n of predSet) { if (killFn(n)) killPred++; }
    return { name, killNotPred, killPred, total: killNotPred + killPred };
  }

  // allIn kill
  function allInFn(pool) { return (n) => { const d = digits(n); return d.every(v => pool.has(v)); }; }
  // doubleHAdd kill
  function dblHAddFn(pool) { return (n) => { const d = digits(n); const ha = hAdd(d); return ha.every(v => pool.has(v)); }; }
  // doubleHSub kill
  function dblHSubFn(pool) { return (n) => { const d = digits(n); const hs = hSub(d); return hs.every(v => pool.has(v)); }; }
  // doubleVAdd kill
  function dblVAddFn(pool, prev) { return (n) => { const d = digits(n); const va = vAdd(d, prev); return va.every(v => pool.has(v)); }; }
  // doubleVSub kill
  function dblVSubFn(pool, prev) { return (n) => { const d = digits(n); const vs = vSub(d, prev); return vs.every(v => pool.has(v)); }; }

  const results = [
    analyzeKill("豹子", n => n[0] === n[1] && n[1] === n[2]),
    analyzeKill("allIn(ha1)", allInFn(poolHA1)),
    analyzeKill("allIn(hs1)", allInFn(poolHS1)),
    analyzeKill("allIn(ha2)", allInFn(poolHA2)),
    analyzeKill("allIn(hs2)", allInFn(poolHS2)),
    analyzeKill("allIn(ha3)", allInFn(poolHA3)),
    analyzeKill("allIn(hs3)", allInFn(poolHS3)),
    analyzeKill("allIn(va1)", allInFn(poolVA1)),
    analyzeKill("allIn(vs1)", allInFn(poolVS1)),
    analyzeKill("allIn(va2)", allInFn(poolVA2)),
    analyzeKill("allIn(vs2)", allInFn(poolVS2)),
    analyzeKill("allIn(sh1)", allInFn(sh1)),
    analyzeKill("allIn(sh2)", allInFn(sh2)),
    analyzeKill("allIn(sh3)", allInFn(sh3)),
    analyzeKill("allIn(lh1)", allInFn(lh1)),
    analyzeKill("allIn(lh2)", allInFn(lh2)),
    analyzeKill("allIn(lh3)", allInFn(lh3)),
    analyzeKill("allIn(bc1)", allInFn(bc1)),
    analyzeKill("allIn(bc2)", allInFn(bc2)),
    analyzeKill("dblHAdd(ha1)", dblHAddFn(poolHA1)),
    analyzeKill("dblHAdd(hs1)", dblHAddFn(poolHS1)),
    analyzeKill("dblHAdd(ha2)", dblHAddFn(poolHA2)),
    analyzeKill("dblHAdd(hs2)", dblHAddFn(poolHS2)),
    analyzeKill("dblHSub(hs1)", dblHSubFn(poolHS1)),
    analyzeKill("dblHSub(ha1)", dblHSubFn(poolHA1)),
    analyzeKill("dblHSub(hs2)", dblHSubFn(poolHS2)),
    analyzeKill("dblVAdd(va1,p2)", dblVAddFn(poolVA1, prev2)),
    analyzeKill("dblVSub(vs1,p2)", dblVSubFn(poolVS1, prev2)),
    analyzeKill("dblVAdd(va2,p3)", dblVAddFn(poolVA2, prev3)),
    analyzeKill("dblVSub(vs2,p3)", dblVSubFn(poolVS2, prev3)),
  ];

  // Show results sorted by killNotPred (how many non-pred explained)
  const sorted = results.filter(r => r.killPred === 0).sort((a, b) => b.killNotPred - a.killNotPred);
  const withFP = results.filter(r => r.killPred > 0);

  console.log("  [零误杀规则]:");
  for (const r of sorted) {
    console.log("    " + r.name + ": 杀非预测=" + r.killNotPred);
  }
  if (withFP.length > 0) {
    console.log("  [有误杀规则]:");
    for (const r of withFP) {
      console.log("    " + r.name + ": 杀非预测=" + r.killNotPred + ", 误杀预测=" + r.killPred);
    }
  }
  console.log("");
}

// === PART 2: Find the best combination of zero-FP rules ===
console.log("\n=== 第二部分: 最优零误杀组合 ===\n");

for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) continue;

  const cur = allData[period];
  const prev1 = allData[periodOrder[idx - 1]];
  const prev2 = allData[periodOrder[idx - 2]];
  const prev3 = allData[periodOrder[idx - 3]];

  const predSet = new Set(predictions[period]);

  const ha1 = hAdd(prev1), hs1 = hSub(prev1);
  const ha2 = hAdd(prev2), hs2 = hSub(prev2);
  const ha3 = hAdd(prev3), hs3 = hSub(prev3);
  const va1 = vAdd(prev1, prev2), vs1 = vSub(prev1, prev2);
  const va2 = vAdd(prev2, prev3), vs2 = vSub(prev2, prev3);

  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);

  const sh1 = new Set(shengHao(prev1)), sh2 = new Set(shengHao(prev2)), sh3 = new Set(shengHao(prev3));
  const lh1 = new Set(lianHao(prev1)), lh2 = new Set(lianHao(prev2)), lh3 = new Set(lianHao(prev3));
  const bc1 = new Set(biChuHao(prev1, prev2)), bc2 = new Set(biChuHao(prev2, prev3));

  // Build kill sets that have zero FP for THIS period
  const killRules = [];

  function addKillRule(name, fn) {
    let killsPred = 0;
    const killed = [];
    for (const n of allNums) {
      if (fn(n)) {
        killed.push(n);
        if (predSet.has(n)) killsPred++;
      }
    }
    if (killsPred === 0 && killed.length > 0) {
      killRules.push({ name, killed: new Set(killed) });
    }
  }

  // 豹子
  addKillRule("豹子", n => n[0] === n[1] && n[1] === n[2]);
  // allIn rules
  const pools = [
    ["ha1", poolHA1], ["hs1", poolHS1], ["ha2", poolHA2], ["hs2", poolHS2],
    ["ha3", poolHA3], ["hs3", poolHS3], ["va1", poolVA1], ["vs1", poolVS1],
    ["va2", poolVA2], ["vs2", poolVS2], ["sh1", sh1], ["sh2", sh2], ["sh3", sh3],
    ["lh1", lh1], ["lh2", lh2], ["lh3", lh3], ["bc1", bc1], ["bc2", bc2]
  ];
  for (const [pname, pool] of pools) {
    addKillRule("allIn(" + pname + ")", n => { const d = digits(n); return d.every(v => pool.has(v)); });
  }
  // doubleHAdd/doubleHSub rules
  for (const [pname, pool] of pools) {
    addKillRule("dblHAdd(" + pname + ")", n => { const d = digits(n); const ha = hAdd(d); return ha.every(v => pool.has(v)); });
    addKillRule("dblHSub(" + pname + ")", n => { const d = digits(n); const hs = hSub(d); return hs.every(v => pool.has(v)); });
  }
  // doubleVAdd/doubleVSub rules
  addKillRule("dblVAdd(va1,p2)", n => { const d = digits(n); const va = vAdd(d, prev2); return va.every(v => poolVA1.has(v)); });
  addKillRule("dblVSub(vs1,p2)", n => { const d = digits(n); const vs = vSub(d, prev2); return vs.every(v => poolVS1.has(v)); });
  addKillRule("dblVAdd(va2,p3)", n => { const d = digits(n); const va = vAdd(d, prev3); return va.every(v => poolVA2.has(v)); });
  addKillRule("dblVSub(vs2,p3)", n => { const d = digits(n); const vs = vSub(d, prev3); return vs.every(v => poolVS2.has(v)); });

  // Greedy set cover: pick the rule that covers the most uncovered non-pred numbers
  let uncovered = new Set(allNums.filter(n => !predSet.has(n)));
  const selected = [];

  while (uncovered.size > 0) {
    let bestRule = null, bestCover = 0;
    for (const rule of killRules) {
      if (selected.find(s => s.name === rule.name)) continue;
      let cover = 0;
      for (const n of rule.killed) { if (uncovered.has(n)) cover++; }
      if (cover > bestCover) { bestCover = cover; bestRule = rule; }
    }
    if (!bestRule || bestCover === 0) break;
    selected.push(bestRule);
    for (const n of bestRule.killed) uncovered.delete(n);
  }

  const totalKilled = allNums.length - predSet.size - uncovered.size;
  const totalNonPred = allNums.length - predSet.size;

  console.log("--- " + period + " (开奖" + numStr(cur) + ", 预测" + predSet.size + "注) ---");
  console.log("  可用零误杀规则: " + killRules.length + "个");
  console.log("  贪心选择: " + selected.length + "个规则, 覆盖" + totalKilled + "/" + totalNonPred + "非预测 (" + (totalKilled / totalNonPred * 100).toFixed(1) + "%)");
  for (const s of selected) {
    console.log("    " + s.name + " (杀" + s.killed.size + ")");
  }
  console.log("  未覆盖非预测: " + uncovered.size + "个");
  if (uncovered.size <= 30) {
    console.log("    → " + [...uncovered].join(" "));
  }
  console.log("");
}

// === PART 3: Cross-period analysis - which rules are consistently zero-FP? ===
console.log("\n=== 第三部分: 跨期零误杀规则统计 ===\n");

const ruleStats = {};

for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[periodOrder[idx - 1]];
  const prev2 = allData[periodOrder[idx - 2]];
  const prev3 = allData[periodOrder[idx - 3]];
  const predSet = new Set(predictions[period]);

  const ha1 = hAdd(prev1), hs1 = hSub(prev1);
  const ha2 = hAdd(prev2), hs2 = hSub(prev2);
  const ha3 = hAdd(prev3), hs3 = hSub(prev3);
  const va1 = vAdd(prev1, prev2), vs1 = vSub(prev1, prev2);
  const va2 = vAdd(prev2, prev3), vs2 = vSub(prev2, prev3);

  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);
  const sh1 = new Set(shengHao(prev1)), sh2 = new Set(shengHao(prev2)), sh3 = new Set(shengHao(prev3));
  const lh1 = new Set(lianHao(prev1)), lh2 = new Set(lianHao(prev2)), lh3 = new Set(lianHao(prev3));
  const bc1 = new Set(biChuHao(prev1, prev2)), bc2 = new Set(biChuHao(prev2, prev3));

  function testRule(name, fn) {
    let killsPred = 0, killsNonPred = 0;
    for (const n of allNums) {
      if (fn(n)) {
        if (predSet.has(n)) killsPred++;
        else killsNonPred++;
      }
    }
    if (!ruleStats[name]) ruleStats[name] = { zeroFP: 0, nonZeroFP: 0, totalKills: 0, periods: [] };
    if (killsPred === 0 && killsNonPred > 0) {
      ruleStats[name].zeroFP++;
      ruleStats[name].totalKills += killsNonPred;
      ruleStats[name].periods.push(period);
    } else {
      ruleStats[name].nonZeroFP++;
    }
  }

  testRule("豹子", n => n[0] === n[1] && n[1] === n[2]);

  const pools = [
    ["ha1", poolHA1], ["hs1", poolHS1], ["ha2", poolHA2], ["hs2", poolHS2],
    ["ha3", poolHA3], ["hs3", poolHS3], ["va1", poolVA1], ["vs1", poolVS1],
    ["va2", poolVA2], ["vs2", poolVS2], ["sh1", sh1], ["sh2", sh2], ["sh3", sh3],
    ["lh1", lh1], ["lh2", lh2], ["lh3", lh3], ["bc1", bc1], ["bc2", bc2]
  ];
  for (const [pname, pool] of pools) {
    testRule("allIn(" + pname + ")", n => { const d = digits(n); return d.every(v => pool.has(v)); });
    testRule("dblHAdd(" + pname + ")", n => { const d = digits(n); const ha = hAdd(d); return ha.every(v => pool.has(v)); });
    testRule("dblHSub(" + pname + ")", n => { const d = digits(n); const hs = hSub(d); return hs.every(v => pool.has(v)); });
  }
  testRule("dblVAdd(va1,p2)", n => { const d = digits(n); const va = vAdd(d, prev2); return va.every(v => poolVA1.has(v)); });
  testRule("dblVSub(vs1,p2)", n => { const d = digits(n); const vs = vSub(d, prev2); return vs.every(v => poolVS1.has(v)); });
  testRule("dblVAdd(va2,p3)", n => { const d = digits(n); const va = vAdd(d, prev3); return va.every(v => poolVA2.has(v)); });
  testRule("dblVSub(vs2,p3)", n => { const d = digits(n); const vs = vSub(d, prev3); return vs.every(v => poolVS2.has(v)); });
}

// Show rules that are zero-FP in ALL 15 periods
console.log("规则                     | 零误杀期数 | 有误杀期数 | 平均杀数");
console.log("-".repeat(70));
const sortedRules = Object.entries(ruleStats).sort((a, b) => b[1].zeroFP - a[1].zeroFP);
for (const [name, stats] of sortedRules) {
  if (stats.zeroFP > 0) {
    const avg = stats.zeroFP > 0 ? (stats.totalKills / stats.zeroFP).toFixed(0) : "0";
    console.log(name.padEnd(27) + "| " + String(stats.zeroFP).padStart(3) + "/15        | " + String(stats.nonZeroFP).padStart(3) + "        | " + avg);
  }
}

// Show rules that are zero-FP in >= 12 periods
console.log("\n高稳定零误杀规则 (>=12/15期):");
for (const [name, stats] of sortedRules) {
  if (stats.zeroFP >= 12) {
    console.log("  " + name + ": " + stats.zeroFP + "/15期零误杀, 平均杀" + (stats.totalKills / stats.zeroFP).toFixed(0) + "注");
    console.log("    零误杀期号: " + stats.periods.join(", "));
  }
}
