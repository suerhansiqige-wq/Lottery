const XLSX = require("xlsx");
const path = require("path");

const FILE = path.join("C:\\Users\\boloor\\Desktop", "新黄金三格.xlsm");
const wb = XLSX.readFile(FILE, { type: "file" });

const ws = wb.Sheets["福"];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
const allData = [];
for (let r = 1; r < raw.length; r++) {
  const row = raw[r];
  if (!row || row.length < 4) continue;
  const period = String(row[0]).trim();
  const d1 = row[1], d2 = row[2], d3 = row[3];
  if (d1 == null || d2 == null || d3 == null) continue;
  allData.push({ issue: period, d1: +d1, d2: +d2, d3: +d3 });
}

const ws2 = wb.Sheets["福 (2)"];
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
for (let r = 1; r < raw2.length; r++) {
  const row = raw2[r];
  if (!row || row.length < 4) continue;
  const period = String(row[0]).trim();
  const d1 = row[1], d2 = row[2], d3 = row[3];
  if (d1 != null && d2 != null && d3 != null && !allData.find(d => d.issue === period)) {
    allData.push({ issue: period, d1: +d1, d2: +d2, d3: +d3 });
  }
}
allData.sort((a, b) => a.issue.localeCompare(b.issue));

// Get predictions from Excel
const predictions2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
const excelPredMap = new Map();
for (let r = 1; r < predictions2.length; r++) {
  const row = predictions2[r];
  if (!row || row.length < 5) continue;
  const period = String(row[0]).trim();
  const predStr = row[4];
  if (predStr == null) continue;
  const preds = String(predStr).split(/[,\s\n]+/).filter(s => /^\d{3}$/.test(s.trim()));
  if (preds.length > 0) excelPredMap.set(period, new Set(preds));
}

function hAddFn(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function hSubFn(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function vAddFn(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function vSubFn(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

// Compute all pools for a period given 3 previous periods
function computeAllPools(prev1, prev2, prev3) {
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = hAddFn(d1), hs1 = hSubFn(d1);
  const ha2 = hAddFn(d2), hs2 = hSubFn(d2);
  const ha3 = hAddFn(d3), hs3 = hSubFn(d3);
  const va1 = vAddFn(d1, d2), vs1 = vSubFn(d1, d2);
  const va2 = vAddFn(d2, d3), vs2 = vSubFn(d2, d3);

  // 生号: digits NOT in the result
  const sh1 = new Set(), sh2 = new Set(), sh3 = new Set();
  for (let d = 0; d <= 9; d++) {
    if (!d1.includes(d)) sh1.add(d);
    if (!d2.includes(d)) sh2.add(d);
    if (!d3.includes(d)) sh3.add(d);
  }

  // 连号: consecutive digit pairs
  const lh1 = new Set(), lh2 = new Set(), lh3 = new Set();
  for (let i = 0; i < 2; i++) {
    lh1.add(d1[i]); lh1.add(d1[i+1]);
    lh2.add(d2[i]); lh2.add(d2[i+1]);
    lh3.add(d3[i]); lh3.add(d3[i+1]);
  }

  // 必出号: digits appearing in 2+ of 4 transforms (hAdd, hSub, vAdd, vSub) for N-1
  // For N-1: transforms are ha1, hs1, va1, vs1
  const bc1 = new Set();
  for (let d = 0; d <= 9; d++) {
    let cnt = 0;
    if (ha1.includes(d)) cnt++;
    if (hs1.includes(d)) cnt++;
    if (va1.includes(d)) cnt++;
    if (vs1.includes(d)) cnt++;
    if (cnt >= 2) bc1.add(d);
  }
  // For N-2
  const bc2 = new Set();
  for (let d = 0; d <= 9; d++) {
    let cnt = 0;
    if (ha2.includes(d)) cnt++;
    if (hs2.includes(d)) cnt++;
    // no vAdd/vSub for d2 since we need d3 as prev
    // Actually bc2 uses ha2, hs2, va2, vs2
    if (va2.includes(d)) cnt++;
    if (vs2.includes(d)) cnt++;
    if (cnt >= 2) bc2.add(d);
  }

  return {
    ha1: new Set(ha1), hs1: new Set(hs1),
    ha2: new Set(ha2), hs2: new Set(hs2),
    ha3: new Set(ha3), hs3: new Set(hs3),
    va1: new Set(va1), vs1: new Set(vs1),
    va2: new Set(va2), vs2: new Set(vs2),
    sh1, sh2, sh3,
    lh1, lh2, lh3,
    bc1, bc2,
    // raw arrays for dbl transforms
    ha1_arr: ha1, hs1_arr: hs1,
    ha2_arr: ha2, hs2_arr: hs2,
    ha3_arr: ha3, hs3_arr: hs3,
    va1_arr: va1, vs1_arr: vs1,
    va2_arr: va2, vs2_arr: vs2,
  };
}

// Test a kill rule: returns set of killed numbers (as strings)
function testKillRule(ruleName, pool, allNums) {
  const killed = new Set();
  if (ruleName.startsWith("allIn(")) {
    const poolSet = pool;
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (a === b && b === c) continue;
      if ([a,b,c].every(v => poolSet.has(v))) killed.add(s);
    }
  } else if (ruleName.startsWith("dblHAdd(")) {
    const poolSet = pool;
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (a === b && b === c) continue;
      const ha = hAddFn([a,b,c]);
      if (ha.every(v => poolSet.has(v))) killed.add(s);
    }
  } else if (ruleName.startsWith("dblHSub(")) {
    const poolSet = pool;
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (a === b && b === c) continue;
      const hs = hSubFn([a,b,c]);
      if (hs.every(v => poolSet.has(v))) killed.add(s);
    }
  } else if (ruleName.startsWith("dblVAdd(")) {
    // needs special handling - pool is array of 3
    const poolArr = pool;
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (a === b && b === c) continue;
      const va = vAddFn([a,b,c], poolArr.prev);
      if (va.every(v => poolArr.pool.has(v))) killed.add(s);
    }
  } else if (ruleName.startsWith("dblVSub(")) {
    const poolArr = pool;
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (a === b && b === c) continue;
      const vs = vSubFn([a,b,c], poolArr.prev);
      if (vs.every(v => poolArr.pool.has(v))) killed.add(s);
    }
  }
  return killed;
}

// All numbers 000-999
const allNums = [];
for (let n = 0; n < 1000; n++) allNums.push(String(n).padStart(3, '0'));

// For each period with Excel predictions, compute all possible rules and check FP
const ruleNames = [
  "allIn(ha1)", "allIn(hs1)", "allIn(ha2)", "allIn(hs2)", "allIn(ha3)", "allIn(hs3)",
  "allIn(va1)", "allIn(vs1)", "allIn(va2)", "allIn(vs2)",
  "allIn(sh1)", "allIn(sh2)", "allIn(sh3)",
  "allIn(lh1)", "allIn(lh2)", "allIn(lh3)",
  "allIn(bc1)", "allIn(bc2)",
  "dblHAdd(ha1)", "dblHAdd(hs1)", "dblHAdd(ha2)", "dblHAdd(hs2)", "dblHAdd(ha3)", "dblHAdd(hs3)",
  "dblHSub(ha1)", "dblHSub(hs1)", "dblHSub(ha2)", "dblHSub(hs2)", "dblHSub(ha3)", "dblHSub(hs3)",
  "dblHAdd(va1)", "dblHAdd(vs1)", "dblHAdd(va2)", "dblHAdd(vs2)",
  "dblHSub(va1)", "dblHSub(vs1)", "dblHSub(va2)", "dblHSub(vs2)",
  "dblVAdd(ha1)", "dblVAdd(hs1)", "dblVAdd(ha2)", "dblVAdd(hs2)",
  "dblVSub(ha1)", "dblVSub(hs1)", "dblVSub(ha2)", "dblVSub(hs2)",
];

// Build period list with predictions
const periods = allData.filter(d => excelPredMap.has(d.issue));
console.log("有Excel预测的期数: " + periods.length);

// For each period, compute pools and check each rule
// Pool lookup: given rule name and pools object, get the pool
function getPool(ruleName, pools) {
  const match = ruleName.match(/\((\w+)\)/);
  if (!match) return null;
  const poolKey = match[1];

  if (ruleName.startsWith("dblVAdd(") || ruleName.startsWith("dblVSub(")) {
    // For dblVAdd(pool), we need the pool set and the "prev" digits for vAdd computation
    // The semantics: for candidate number abc, compute vAdd([a,b,c], poolDigits)
    // where poolDigits = the 3 digits that generated the pool
    // Actually this is wrong - dblVAdd means: the vAdd transform of the candidate,
    // and check if all results fall in the pool
    // vAdd([a,b,c], prev) needs a "prev" - but what prev?
    // In the context of the Excel, dblVAdd(va1,p2) means:
    //   vAdd of candidate using period 2 as "prev", check if all in va1 pool
    // This is getting complex. Let me simplify:
    // For dblVAdd(X), the pool X is a set of digits. For candidate abc,
    // we need SOME prev to compute vAdd. The question is which prev.
    // Let's skip dblVAdd/dblVSub for now and focus on simpler rules.
    return null;
  }

  return pools[poolKey] || null;
}

// For each period, compute killed sets for each rule, check FP against Excel predictions
console.log("\n=== 逐规则跨期分析 ===\n");

const rulePeriodStats = {}; // ruleName -> [{period, killed, fpCount}]
for (const rn of ruleNames) rulePeriodStats[rn] = [];

for (let pi = 0; pi < periods.length; pi++) {
  const period = periods[pi];
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computeAllPools(prev1, prev2, prev3);
  const excelPred = excelPredMap.get(period.issue);

  for (const rn of ruleNames) {
    const pool = getPool(rn, pools);
    if (!pool) continue;

    const killed = testKillRule(rn, pool, allNums);
    // FP = killed numbers that are in Excel predictions
    let fpCount = 0;
    for (const k of killed) {
      if (excelPred.has(k)) fpCount++;
    }
    rulePeriodStats[rn].push({
      period: period.issue,
      killed: killed.size,
      fpCount
    });
  }
}

// Find rules that have ZERO FP across ALL periods
console.log("零误杀规则（跨所有有预测期数）:");
const zeroFPRules = [];
for (const rn of ruleNames) {
  const stats = rulePeriodStats[rn];
  if (stats.length === 0) continue;
  const totalFP = stats.reduce((s, x) => s + x.fpCount, 0);
  const avgKilled = (stats.reduce((s, x) => s + x.killed, 0) / stats.length).toFixed(1);
  if (totalFP === 0) {
    zeroFPRules.push({ name: rn, avgKilled: parseFloat(avgKilled), periods: stats.length });
    console.log("  " + rn + ": 平均杀" + avgKilled + "注, 跨" + stats.length + "期, 零误杀 ✓");
  }
}

// Also show rules with very low FP (≤2 total across all periods)
console.log("\n低误杀规则（总误杀≤2）:");
for (const rn of ruleNames) {
  const stats = rulePeriodStats[rn];
  if (stats.length === 0) continue;
  const totalFP = stats.reduce((s, x) => s + x.fpCount, 0);
  const avgKilled = (stats.reduce((s, x) => s + x.killed, 0) / stats.length).toFixed(1);
  if (totalFP > 0 && totalFP <= 2) {
    console.log("  " + rn + ": 平均杀" + avgKilled + "注, 总误杀=" + totalFP + ", 跨" + stats.length + "期");
  }
}

// Now try combinations of zero-FP rules
console.log("\n=== 零误杀规则组合测试 ===\n");

// Current baseline rules
const baselineRules = [
  "allIn(ha1)", "allIn(hs1)", "allIn(lh1)", "allIn(lh2)",
  "dblHAdd(ha1)", "dblHAdd(ha2)", "dblHSub(hs1)", "dblHSub(hs2)"
];

// Try adding each zero-FP rule to baseline and see the effect
for (const zr of zeroFPRules) {
  if (baselineRules.includes(zr.name)) continue;

  // Test: baseline + this rule
  let totalKilled = 0;
  let totalFP = 0;
  let totalPred = 0;
  let periodsTested = 0;

  for (let pi = 0; pi < periods.length; pi++) {
    const period = periods[pi];
    const idx = allData.indexOf(period);
    if (idx < 3) continue;

    const prev1 = allData[idx-1];
    const prev2 = allData[idx-2];
    const prev3 = allData[idx-3];
    const pools = computeAllPools(prev1, prev2, prev3);
    const excelPred = excelPredMap.get(period.issue);

    // Compute killed union for baseline + new rule
    const allKilled = new Set();
    // 豹子
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (a === b && b === c) allKilled.add(s);
    }
    // baseline rules
    for (const br of baselineRules) {
      const pool = getPool(br, pools);
      if (!pool) continue;
      const killed = testKillRule(br, pool, allNums);
      for (const k of killed) allKilled.add(k);
    }
    // new rule
    const pool = getPool(zr.name, pools);
    if (pool) {
      const killed = testKillRule(zr.name, pool, allNums);
      for (const k of killed) allKilled.add(k);
    }

    const predCount = 1000 - allKilled.size;
    let fp = 0;
    for (const k of allKilled) {
      if (excelPred.has(k)) fp++;
    }
    totalKilled += allKilled.size;
    totalFP += fp;
    totalPred += predCount;
    periodsTested++;
  }

  if (periodsTested > 0) {
    console.log("  baseline + " + zr.name + ": 平均" + (totalPred/periodsTested).toFixed(0) + "注, 总误杀=" + totalFP);
  }
}

// Now try greedy: start from baseline, add zero-FP rules one by one that reduce count most
console.log("\n=== 贪心组合优化 ===\n");

// First, compute baseline alone
let baselineTotalPred = 0;
let baselineTotalFP = 0;
let baselinePeriods = 0;
const baselineDetails = [];

for (let pi = 0; pi < periods.length; pi++) {
  const period = periods[pi];
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computeAllPools(prev1, prev2, prev3);
  const excelPred = excelPredMap.get(period.issue);

  const allKilled = new Set();
  for (const s of allNums) {
    const a = +s[0], b = +s[1], c = +s[2];
    if (a === b && b === c) allKilled.add(s);
  }
  for (const br of baselineRules) {
    const pool = getPool(br, pools);
    if (!pool) continue;
    const killed = testKillRule(br, pool, allNums);
    for (const k of killed) allKilled.add(k);
  }

  const predCount = 1000 - allKilled.size;
  let fp = 0;
  for (const k of allKilled) {
    if (excelPred.has(k)) fp++;
  }
  baselineTotalPred += predCount;
  baselineTotalFP += fp;
  baselinePeriods++;
  baselineDetails.push({ period: period.issue, predCount, fp });
}

console.log("当前baseline: 平均" + (baselineTotalPred/baselinePeriods).toFixed(0) + "注, 总误杀=" + baselineTotalFP + ", 期数=" + baselinePeriods);
console.log("\n各期详情:");
for (const d of baselineDetails) {
  console.log("  " + d.period + ": " + d.predCount + "注, 误杀=" + d.fp);
}

// Greedy: add zero-FP rules one by one
const usedRules = [...baselineRules];
const availableZeroFPRules = zeroFPRules.filter(zr => !baselineRules.includes(zr.name));

for (let round = 0; round < availableZeroFPRules.length; round++) {
  let bestRule = null;
  let bestAvgPred = Infinity;
  let bestFP = Infinity;

  for (const zr of availableZeroFPRules) {
    if (usedRules.includes(zr.name)) continue;

    let totalPred = 0, totalFP = 0, cnt = 0;
    for (let pi = 0; pi < periods.length; pi++) {
      const period = periods[pi];
      const idx = allData.indexOf(period);
      if (idx < 3) continue;

      const prev1 = allData[idx-1];
      const prev2 = allData[idx-2];
      const prev3 = allData[idx-3];
      const pools = computeAllPools(prev1, prev2, prev3);
      const excelPred = excelPredMap.get(period.issue);

      const allKilled = new Set();
      for (const s of allNums) {
        const a = +s[0], b = +s[1], c = +s[2];
        if (a === b && b === c) allKilled.add(s);
      }
      for (const ur of usedRules) {
        const pool = getPool(ur, pools);
        if (!pool) continue;
        const killed = testKillRule(ur, pool, allNums);
        for (const k of killed) allKilled.add(k);
      }
      // try adding zr
      const pool = getPool(zr.name, pools);
      if (pool) {
        const killed = testKillRule(zr.name, pool, allNums);
        for (const k of killed) allKilled.add(k);
      }

      totalPred += (1000 - allKilled.size);
      let fp = 0;
      for (const k of allKilled) {
        if (excelPred.has(k)) fp++;
      }
      totalFP += fp;
      cnt++;
    }

    const avgPred = totalPred / cnt;
    // Prefer: zero FP first, then lowest avgPred
    if (totalFP === 0 && avgPred < bestAvgPred) {
      bestRule = zr;
      bestAvgPred = avgPred;
      bestFP = totalFP;
    }
  }

  if (!bestRule) break;
  usedRules.push(bestRule.name);
  console.log("\n第" + (round+1) + "轮: 加入 " + bestRule.name + " → 平均" + bestAvgPred.toFixed(0) + "注, 总误杀=" + bestFP);
}

console.log("\n最终规则集:");
for (const r of usedRules) console.log("  " + r);
