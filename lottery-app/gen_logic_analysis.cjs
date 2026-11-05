const XLSX = require("xlsx");
const path = require("path");

const FILE = path.join("C:\\Users\\boloor\\Desktop", "新黄金三格.xlsm");
const wb = XLSX.readFile(FILE, { type: "file" });

// Read Sheet '福' for full history
const ws = wb.Sheets["福"];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Build period data: period -> [d1,d2,d3]
const allData = {};
const periodOrder = [];
for (let r = 1; r < raw.length; r++) {
  const row = raw[r];
  if (!row || row.length < 4) continue;
  const period = String(row[0]).trim();
  const num = String(row[1]).trim();
  if (!/^\d{3}$/.test(num)) continue;
  allData[period] = [+num[0], +num[1], +num[2]];
  periodOrder.push(period);
}

// Read Sheet '福 (2)' for predictions
const ws2 = wb.Sheets["福 (2)"];
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
const predictions = {};
for (let r = 1; r < raw2.length; r++) {
  const row = raw2[r];
  if (!row || row.length < 4) continue;
  const period = String(row[0]).trim();
  const predStr = String(row[3] || "").trim();
  if (!predStr) continue;
  const nums = predStr.split(/\s+/).filter(n => /^\d{3}$/.test(n));
  if (nums.length > 0) predictions[period] = nums;
}

// Helper functions
function digits(n) { return [+n[0], +n[1], +n[2]]; }
function numStr(d) { return ""+d[0]+d[1]+d[2]; }
function hAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function hSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function vAdd(d, prev) { return [(d[0]+prev[0])%10, (d[1]+prev[1])%10, (d[2]+prev[2])%10]; }
function vSub(d, prev) { return [Math.abs(d[0]-prev[0]), Math.abs(d[1]-prev[1]), Math.abs(d[2]-prev[2])]; }

// 生号: digits not in the current result
function shengHao(d) {
  const s = new Set(d);
  const res = [];
  for (let i = 0; i <= 9; i++) if (!s.has(i)) res.push(i);
  return res;
}

// 连号: consecutive digit pairs in the result
function lianHao(d) {
  const s = new Set();
  for (let i = 0; i < d.length-1; i++) {
    s.add(d[i]); s.add(d[i+1]);
  }
  return [...s].sort((a,b)=>a-b);
}

// 必出号: for next period, digits that MUST appear (from various analyses)
// Common definition: union of digits from recent periods' transformations
function biChuHao(d, prev) {
  // Intersection-based: digits appearing in multiple transformations
  const ha = hAdd(d);
  const hs = hSub(d);
  const va = vAdd(d, prev);
  const vs = vSub(d, prev);

  const counts = {};
  for (let i = 0; i <= 9; i++) counts[i] = 0;
  for (const v of [...ha, ...hs, ...va, ...vs]) counts[v]++;

  // Digits appearing in 2+ transformations
  return Object.entries(counts).filter(([k,v]) => v >= 2).map(([k]) => +k);
}

// All 3-digit numbers
const allNums = [];
for (let i = 0; i < 1000; i++) {
  allNums.push(String(i).padStart(3, "0"));
}

// For each prediction period, analyze what rules could generate the prediction set
const predPeriods = Object.keys(predictions).sort();

console.log("=== 预测号码生成逻辑深度分析 ===\n");

for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) continue;

  const cur = allData[period];
  const prev1 = allData[periodOrder[idx-1]];
  const prev2 = allData[periodOrder[idx-2]];
  const prev3 = allData[periodOrder[idx-3]];

  const predSet = new Set(predictions[period]);
  const predSize = predSet.size;

  // Compute all transformations for N-1, N-2, N-3
  const ha1 = hAdd(prev1), hs1 = hSub(prev1);
  const ha2 = hAdd(prev2), hs2 = hSub(prev2);
  const ha3 = hAdd(prev3), hs3 = hSub(prev3);

  const va1 = vAdd(prev1, prev2), vs1 = vSub(prev1, prev2);
  const va2 = vAdd(prev2, prev3), vs2 = vSub(prev2, prev3);

  // Digit pools
  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);

  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);

  // 生号 pools
  const sh1 = new Set(shengHao(prev1));
  const sh2 = new Set(shengHao(prev2));
  const sh3 = new Set(shengHao(prev3));

  // 连号 pools
  const lh1 = new Set(lianHao(prev1));
  const lh2 = new Set(lianHao(prev2));
  const lh3 = new Set(lianHao(prev3));

  // 必出号 pools
  const bc1 = new Set(biChuHao(prev1, prev2));
  const bc2 = new Set(biChuHao(prev2, prev3));

  // Combined pools
  const poolAllHA = new Set([...poolHA1, ...poolHA2, ...poolHA3]);
  const poolAllHS = new Set([...poolHS1, ...poolHS2, ...poolHS3]);
  const poolAllHAHS = new Set([...poolAllHA, ...poolAllHS]);
  const poolAllVA = new Set([...poolVA1, ...poolVA2]);
  const poolAllVS = new Set([...poolVS1, ...poolVS2]);
  const poolAllVAVS = new Set([...poolAllVA, ...poolAllVS]);
  const poolAll = new Set([...poolAllHAHS, ...poolAllVAVS]);

  // 生号 union/intersection
  const shUnion = new Set([...sh1, ...sh2, ...sh3]);
  const shIntersect = new Set([...sh1].filter(x => sh2.has(x) && sh3.has(x)));

  // 连号 union
  const lhUnion = new Set([...lh1, ...lh2, ...lh3]);

  // 必出号 union
  const bcUnion = new Set([...bc1, ...bc2]);

  // === TEST GENERATION HYPOTHESES ===

  // For each hypothesis, generate a set of numbers and compare with prediction

  // H1: All digits in poolHA1 → include all numbers with at least 1 digit in pool
  function genAtLeastOne(pool) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      if (d.some(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // H2: All digits in pool → include numbers where ALL digits in pool
  function genAllIn(pool) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      if (d.every(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // H3: Kill allIn(pool), keep the rest
  function genKillAllIn(pool) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      if (!d.every(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // H4: Kill doubleHAdd - numbers whose hAdd values all fall in pool
  function genKillDoubleHAdd(pool) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      const ha = hAdd(d);
      if (!ha.every(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // H5: Kill doubleHSub
  function genKillDoubleHSub(pool) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      const hs = hSub(d);
      if (!hs.every(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // H6: Include numbers where at least one digit in 生号 pool
  // H7: Include numbers where at least one digit in 连号 pool
  // H8: Include numbers where at least one digit in 必出号 pool

  // H9: Kill numbers where all digits are in 生号 pool (complement of 必出)
  // H10: Keep numbers where at least one digit NOT in some kill pool

  // Combined generation: start with all 1000, apply kills
  function applyKills(kills) {
    let res = new Set(allNums);
    // Remove 豹子
    res = new Set([...res].filter(n => !(n[0]===n[1] && n[1]===n[2])));
    for (const kill of kills) {
      res = new Set([...res].filter(n => !kill.has(n)));
    }
    return res;
  }

  // Build kill sets
  const killAllInHA1 = genAllIn(poolHA1);
  const killAllInHS1 = genAllIn(poolHS1);
  const killAllInHA2 = genAllIn(poolHA2);
  const killAllInHS2 = genAllIn(poolHS2);
  const killAllInHA3 = genAllIn(poolHA3);
  const killAllInHS3 = genAllIn(poolHS3);

  const killDblHA1 = genKillDoubleHAdd(poolHA1);
  const killDblHS1 = genKillDoubleHSub(poolHS1);
  const killDblHA2 = genKillDoubleHAdd(poolHA2);
  const killDblHS2 = genKillDoubleHSub(poolHS2);

  // 生号 kill: all digits are 生号 (not in result) → these are "cold" numbers
  const killAllInSH1 = genAllIn(sh1);
  const killAllInSH2 = genAllIn(sh2);

  // vAdd/vSub kills
  const killAllInVA1 = genAllIn(poolVA1);
  const killAllInVS1 = genAllIn(poolVS1);

  const killDblVA1 = new Set();
  for (const n of allNums) {
    const d = digits(n);
    const va = vAdd(d, prev1);
    if (va.every(v => poolVA1.has(v))) killDblVA1.add(n);
  }

  const killDblVS1 = new Set();
  for (const n of allNums) {
    const d = digits(n);
    const vs = vSub(d, prev1);
    if (vs.every(v => poolVS1.has(v))) killDblVS1.add(n);
  }

  // Test various combinations
  const strategies = {
    "A:killAllIn(ha1)": [killAllInHA1],
    "B:killAllIn(hs1)": [killAllInHS1],
    "C:killDblHA1": [killDblHA1],
    "D:killDblHS1": [killDblHS1],
    "E:A+C": [killAllInHA1, killDblHA1],
    "F:A+C+D": [killAllInHA1, killDblHA1, killDblHS1],
    "G:A+B+C+D": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1],
    "H:G+killAllIn(ha2)": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, killAllInHA2],
    "I:H+killAllIn(hs2)": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, killAllInHA2, killAllInHS2],
    "J:G+killAllIn(ha2)+killAllIn(ha3)": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, killAllInHA2, killAllInHA3],
    "K:G+killSH1": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, killAllInSH1],
    "L:G+killSH1+killSH2": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, killAllInSH1, killAllInSH2],
    "M:G+killVA1+killVS1": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, killAllInVA1, killAllInVS1],
    "N:G+killDblVA1+killDblVS1": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, killDblVA1, killDblVS1],
    "O:G+killAllIn(ha2)+killAllIn(hs2)+killAllIn(ha3)+killAllIn(hs3)": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, killAllInHA2, killAllInHS2, killAllInHA3, killAllInHS3],
    "P:G+killAllIn(lh1∪lh2∪lh3)": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, genAllIn(lhUnion)],
    "Q:G+killAllIn(bc1∪bc2)": [killAllInHA1, killAllInHS1, killDblHA1, killDblHS1, genAllIn(bcUnion)],
  };

  console.log("--- 期号 " + period + " (开奖: " + numStr(cur) + ", 预测: " + predSize + "注) ---");

  // First show the pools
  console.log("  N-1横加=" + JSON.stringify(ha1) + " 横减=" + JSON.stringify(hs1));
  console.log("  N-1竖加=" + JSON.stringify(va1) + " 竖减=" + JSON.stringify(vs1));
  console.log("  N-1生号=" + JSON.stringify([...sh1].sort()) + " 连号=" + JSON.stringify([...lh1].sort()) + " 必出号=" + JSON.stringify([...bc1].sort()));
  console.log("  N-2横加=" + JSON.stringify(ha2) + " 横减=" + JSON.stringify(hs2));
  console.log("  N-2竖加=" + JSON.stringify(va2) + " 竖减=" + JSON.stringify(vs2));
  console.log("  N-3横加=" + JSON.stringify(ha3) + " 横减=" + JSON.stringify(hs3));

  let bestStrategy = null;
  let bestScore = 0;

  for (const [name, kills] of Object.entries(strategies)) {
    const result = applyKills(kills);
    const intersection = [...result].filter(n => predSet.has(n));
    const predInResult = [...predSet].filter(n => result.has(n));

    const precision = intersection.length / result.size * 100;
    const recall = predInResult.length / predSet.size * 100;
    const f1 = 2 * precision * recall / (precision + recall);

    // Also check: how many of the prediction are NOT in result (false negatives)
    const fn = [...predSet].filter(n => !result.has(n));
    // How many in result are NOT in prediction (false positives)
    const fp = [...result].filter(n => !predSet.has(n));

    if (f1 > bestScore) {
      bestScore = f1;
      bestStrategy = { name, result, precision, recall, f1, fn: fn.length, fp: fp.length, size: result.size };
    }

    if (result.size > 0 && recall > 50) {
      console.log("  " + name + ": 生成" + result.size + "注, 精确率=" + precision.toFixed(1) + "%, 召回率=" + recall.toFixed(1) + "%, F1=" + f1.toFixed(1) + ", FN=" + fn.length + ", FP=" + fp.length);
    }
  }

  if (bestStrategy) {
    console.log("  ★ 最佳: " + bestStrategy.name + " (F1=" + bestStrategy.f1.toFixed(1) + "%, 生成" + bestStrategy.size + "注, 召回" + bestStrategy.recall.toFixed(1) + "%, 精确" + bestStrategy.precision.toFixed(1) + "%)");
  }
  console.log("");
}

// === PART 2: Try to find the EXACT generation logic ===
console.log("\n=== 第二部分: 精确匹配推算 ===\n");

// For each period, try to find what's in the prediction but NOT explained by kills
// Then analyze those "extra" numbers to find additional rules

for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) continue;

  const cur = allData[period];
  const prev1 = allData[periodOrder[idx-1]];
  const prev2 = allData[periodOrder[idx-2]];
  const prev3 = allData[periodOrder[idx-3]];

  const predSet = new Set(predictions[period]);

  // Core kill: allIn(ha1) + allIn(hs1) + dblHAdd(ha1) + dblHSub(hs1)
  const ha1 = hAdd(prev1), hs1 = hSub(prev1);
  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);

  let remaining = new Set(allNums);
  // Remove 豹子
  remaining = new Set([...remaining].filter(n => !(n[0]===n[1] && n[1]===n[2])));

  // Kill allIn(ha1)
  remaining = new Set([...remaining].filter(n => {
    const d = digits(n);
    return !d.every(v => poolHA1.has(v));
  }));

  // Kill allIn(hs1)
  remaining = new Set([...remaining].filter(n => {
    const d = digits(n);
    return !d.every(v => poolHS1.has(v));
  }));

  // Kill doubleHAdd(ha1)
  remaining = new Set([...remaining].filter(n => {
    const d = digits(n);
    const ha = hAdd(d);
    return !ha.every(v => poolHA1.has(v));
  }));

  // Kill doubleHSub(hs1)
  remaining = new Set([...remaining].filter(n => {
    const d = digits(n);
    const hs = hSub(d);
    return !hs.every(v => poolHS1.has(v));
  }));

  // What's in prediction but NOT in remaining?
  const predNotInRemaining = [...predSet].filter(n => !remaining.has(n));
  // What's in remaining but NOT in prediction?
  const remainingNotInPred = [...remaining].filter(n => !predSet.has(n));

  console.log("--- " + period + " ---");
  console.log("  基础杀号后剩余: " + remaining.size + "注");
  console.log("  预测总数: " + predSet.size + "注");
  console.log("  预测中但被杀(FN): " + predNotInRemaining.length + "注 → " + predNotInRemaining.join(" "));
  console.log("  剩余但不在预测(FP): " + remainingNotInPred.length + "注 → " + remainingNotInPred.slice(0,30).join(" ") + (remainingNotInPred.length > 30 ? "..." : ""));
  console.log("  匹配率: " + ((predSet.size - predNotInRemaining.length) / predSet.size * 100).toFixed(1) + "%");
  console.log("");
}
