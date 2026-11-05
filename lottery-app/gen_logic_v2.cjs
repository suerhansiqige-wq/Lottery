const XLSX = require("xlsx");
const path = require("path");

const FILE = path.join("C:\\Users\\boloor\\Desktop", "新黄金三格.xlsm");
const wb = XLSX.readFile(FILE, { type: "file" });

// Read Sheet '福' for full history
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

// Read Sheet '福 (2)' for predictions - col 4 is the prediction string
const ws2 = wb.Sheets["福 (2)"];
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
const predictions = {};
for (let r = 1; r < raw2.length; r++) {
  const row = raw2[r];
  if (!row || row.length < 5) continue;
  const period = String(row[0]).trim();
  const predStr = String(row[4] || "").trim();
  if (!predStr) continue;
  const nums = predStr.split(/\s+/).filter(n => /^\d{3}$/.test(n));
  if (nums.length > 0) predictions[period] = nums;
}

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

// 必出号: digits appearing in 2+ of the 4 transformations
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

console.log("=== 预测号码生成逻辑深度分析 ===");
console.log("有预测的期号: " + predPeriods.join(", "));
console.log("");

// For each prediction period, analyze the structure of the prediction set
for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) continue;

  const cur = allData[period];
  const prev1 = allData[periodOrder[idx - 1]];
  const prev2 = allData[periodOrder[idx - 2]];
  const prev3 = allData[periodOrder[idx - 3]];

  const predSet = new Set(predictions[period]);
  const predSize = predSet.size;

  // Compute transformations
  const ha1 = hAdd(prev1), hs1 = hSub(prev1);
  const ha2 = hAdd(prev2), hs2 = hSub(prev2);
  const ha3 = hAdd(prev3), hs3 = hSub(prev3);

  const va1 = vAdd(prev1, prev2), vs1 = vSub(prev1, prev2);
  const va2 = vAdd(prev2, prev3), vs2 = vSub(prev2, prev3);

  const sh1 = shengHao(prev1), sh2 = shengHao(prev2), sh3 = shengHao(prev3);
  const lh1 = lianHao(prev1), lh2 = lianHao(prev2), lh3 = lianHao(prev3);
  const bc1 = biChuHao(prev1, prev2), bc2 = biChuHao(prev2, prev3);

  // Pools
  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);
  const poolSH1 = new Set(sh1), poolSH2 = new Set(sh2), poolSH3 = new Set(sh3);
  const poolLH1 = new Set(lh1), poolLH2 = new Set(lh2), poolLH3 = new Set(lh3);
  const poolBC1 = new Set(bc1), poolBC2 = new Set(bc2);

  // Combined pools
  const poolHA12 = new Set([...poolHA1, ...poolHA2]);
  const poolHS12 = new Set([...poolHS1, ...poolHS2]);
  const poolHA123 = new Set([...poolHA1, ...poolHA2, ...poolHA3]);
  const poolHS123 = new Set([...poolHS1, ...poolHS2, ...poolHS3]);
  const poolHAHS1 = new Set([...poolHA1, ...poolHS1]);
  const poolHAHS12 = new Set([...poolHA12, ...poolHS12]);
  const poolHAHS123 = new Set([...poolHA123, ...poolHS123]);

  const poolVAVS1 = new Set([...poolVA1, ...poolVS1]);
  const poolVAVS12 = new Set([...poolVA1, ...poolVS1, ...poolVA2, ...poolVS2]);

  const poolSH12 = new Set([...poolSH1, ...poolSH2]);
  const poolSH123 = new Set([...poolSH1, ...poolSH2, ...poolSH3]);
  const poolLH123 = new Set([...poolLH1, ...poolLH2, ...poolLH3]);
  const poolBC12 = new Set([...poolBC1, ...poolBC2]);

  console.log("=== 期号 " + period + " ===");
  console.log("开奖: " + numStr(cur) + " | 预测: " + predSize + "注");
  console.log("N-1(" + periodOrder[idx - 1] + "): " + numStr(prev1) + " 横加=" + JSON.stringify(ha1) + " 横减=" + JSON.stringify(hs1) + " 竖加=" + JSON.stringify(va1) + " 竖减=" + JSON.stringify(vs1));
  console.log("  生号=" + JSON.stringify(sh1) + " 连号=" + JSON.stringify(lh1) + " 必出号=" + JSON.stringify(bc1));
  console.log("N-2(" + periodOrder[idx - 2] + "): " + numStr(prev2) + " 横加=" + JSON.stringify(ha2) + " 横减=" + JSON.stringify(hs2));
  console.log("  生号=" + JSON.stringify(sh2) + " 连号=" + JSON.stringify(lh2));
  console.log("N-3(" + periodOrder[idx - 3] + "): " + numStr(prev3) + " 横加=" + JSON.stringify(ha3) + " 横减=" + JSON.stringify(hs3));
  console.log("  生号=" + JSON.stringify(sh3) + " 连号=" + JSON.stringify(lh3));

  // === KILL RULE ANALYSIS ===
  // For each possible kill rule, check:
  // 1. How many prediction numbers does it kill? (should be 0 ideally)
  // 2. How many non-prediction numbers does it kill? (should be high)

  function testKill(name, killSet) {
    const killedPred = [...predSet].filter(n => killSet.has(n));
    const killedNonPred = [...killSet].filter(n => !predSet.has(n));
    const totalKilled = killSet.size;
    return {
      name,
      total: totalKilled,
      killsPred: killedPred.length,
      killsNonPred: killedNonPred.length,
      fpRate: (killedPred.length / predSize * 100).toFixed(1),
      coverage: (killedNonPred.length / (1000 - predSize) * 100).toFixed(1)
    };
  }

  // allIn kill: all 3 digits in pool
  function allInKill(pool) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      if (d.every(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // doubleHAdd kill: hAdd of number all in pool
  function dblHAddKill(pool) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      const ha = hAdd(d);
      if (ha.every(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // doubleHSub kill
  function dblHSubKill(pool) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      const hs = hSub(d);
      if (hs.every(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // doubleVAdd kill
  function dblVAddKill(pool, prev) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      const va = vAdd(d, prev);
      if (va.every(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // doubleVSub kill
  function dblVSubKill(pool, prev) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      const vs = vSub(d, prev);
      if (vs.every(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // atLeastOne kill: all digits NOT in pool (i.e., kill numbers with no digit in pool)
  function atLeastOneKill(pool) {
    const res = new Set();
    for (const n of allNums) {
      const d = digits(n);
      if (!d.some(v => pool.has(v))) res.add(n);
    }
    return res;
  }

  // Test individual kill rules
  const kills = [
    testKill("allIn(ha1)", allInKill(poolHA1)),
    testKill("allIn(hs1)", allInKill(poolHS1)),
    testKill("allIn(ha2)", allInKill(poolHA2)),
    testKill("allIn(hs2)", allInKill(poolHS2)),
    testKill("allIn(ha3)", allInKill(poolHA3)),
    testKill("allIn(hs3)", allInKill(poolHS3)),
    testKill("allIn(ha12)", allInKill(poolHA12)),
    testKill("allIn(hs12)", allInKill(poolHS12)),
    testKill("allIn(ha123)", allInKill(poolHA123)),
    testKill("allIn(hs123)", allInKill(poolHS123)),
    testKill("allIn(hahs1)", allInKill(poolHAHS1)),
    testKill("allIn(hahs12)", allInKill(poolHAHS12)),
    testKill("allIn(hahs123)", allInKill(poolHAHS123)),
    testKill("allIn(va1)", allInKill(poolVA1)),
    testKill("allIn(vs1)", allInKill(poolVS1)),
    testKill("allIn(vavs1)", allInKill(poolVAVS1)),
    testKill("allIn(vavs12)", allInKill(poolVAVS12)),
    testKill("allIn(sh1)", allInKill(poolSH1)),
    testKill("allIn(sh2)", allInKill(poolSH2)),
    testKill("allIn(sh12)", allInKill(poolSH12)),
    testKill("allIn(sh123)", allInKill(poolSH123)),
    testKill("allIn(lh1)", allInKill(poolLH1)),
    testKill("allIn(lh123)", allInKill(poolLH123)),
    testKill("allIn(bc1)", allInKill(poolBC1)),
    testKill("allIn(bc12)", allInKill(poolBC12)),
    testKill("dblHAdd(ha1)", dblHAddKill(poolHA1)),
    testKill("dblHAdd(hs1)", dblHAddKill(poolHS1)),
    testKill("dblHAdd(ha2)", dblHAddKill(poolHA2)),
    testKill("dblHAdd(hs2)", dblHAddKill(poolHS2)),
    testKill("dblHSub(hs1)", dblHSubKill(poolHS1)),
    testKill("dblHSub(ha1)", dblHSubKill(poolHA1)),
    testKill("dblHSub(hs2)", dblHSubKill(poolHS2)),
    testKill("dblVAdd(va1,p2)", dblVAddKill(poolVA1, prev2)),
    testKill("dblVSub(vs1,p2)", dblVSubKill(poolVS1, prev2)),
    testKill("dblVAdd(va2,p3)", dblVAddKill(poolVA2, prev3)),
    testKill("dblVSub(vs2,p3)", dblVSubKill(poolVS2, prev3)),
    testKill("atLeast1(ha1)", atLeastOneKill(poolHA1)),
    testKill("atLeast1(hs1)", atLeastOneKill(poolHS1)),
    testKill("atLeast1(hahs1)", atLeastOneKill(poolHAHS1)),
    testKill("atLeast1(sh1)", atLeastOneKill(poolSH1)),
    testKill("atLeast1(bc1)", atLeastOneKill(poolBC1)),
  ];

  // Show zero-FP kills (kills that don't eliminate any prediction numbers)
  const zeroFP = kills.filter(k => k.killsPred === 0 && k.total > 0);
  const nonZeroFP = kills.filter(k => k.killsPred > 0);

  console.log("\n  [零误杀规则] (不杀预测号的规则):");
  for (const k of zeroFP) {
    console.log("    " + k.name + ": 杀" + k.total + "注, 覆盖非预测=" + k.killsNonPred + " (" + k.coverage + "%)");
  }

  if (nonZeroFP.length > 0) {
    console.log("  [有误杀的规则]:");
    for (const k of nonZeroFP) {
      console.log("    " + k.name + ": 杀" + k.total + "注, 误杀预测=" + k.killsPred + " (" + k.fpRate + "%)");
    }
  }

  // Combined zero-FP kills
  let combinedKill = new Set();
  for (const k of zeroFP) {
    let killSet;
    const poolName = k.name.match(/\((.+)\)/)[1];
    if (k.name.startsWith("allIn")) killSet = allInKill(eval("pool" + poolName.toUpperCase().replace(/\./g, "")));
    else if (k.name.startsWith("dblHAdd")) killSet = dblHAddKill(eval("pool" + poolName.toUpperCase().replace(/\./g, "")));
    else if (k.name.startsWith("dblHSub")) killSet = dblHSubKill(eval("pool" + poolName.toUpperCase().replace(/\./g, "")));
    else if (k.name.startsWith("dblVAdd")) {
      const parts = poolName.split(",");
      killSet = dblVAddKill(eval("pool" + parts[0].toUpperCase()), parts[1] === "p2" ? prev2 : prev3);
    } else if (k.name.startsWith("dblVSub")) {
      const parts = poolName.split(",");
      killSet = dblVSubKill(eval("pool" + parts[0].toUpperCase()), parts[1] === "p2" ? prev2 : prev3);
    } else if (k.name.startsWith("atLeast1")) killSet = atLeastOneKill(eval("pool" + poolName.toUpperCase().replace(/\./g, "")));
    if (killSet) {
      for (const n of killSet) combinedKill.add(n);
    }
  }

  const combinedPredKilled = [...predSet].filter(n => combinedKill.has(n));
  const combinedNonPredKilled = [...combinedKill].filter(n => !predSet.has(n));
  const remaining = new Set(allNums.filter(n => !combinedKill.has(n) && !(n[0] === n[1] && n[1] === n[2])));
  const remainingPred = [...predSet].filter(n => remaining.has(n));

  console.log("\n  [组合零误杀]:");
  console.log("    总杀: " + combinedKill.size + "注 (预测内=" + combinedPredKilled.length + ", 非预测=" + combinedNonPredKilled.length + ")");
  console.log("    去豹子后剩余: " + remaining.size + "注 (含预测=" + remainingPred.length + "/" + predSize + ")");
  console.log("    预测召回率: " + (remainingPred.length / predSize * 100).toFixed(1) + "%");

  // Show what's NOT explained
  const unexplained = [...predSet].filter(n => !remaining.has(n));
  if (unexplained.length > 0) {
    console.log("    未解释的预测号: " + unexplained.length + "注 → " + unexplained.join(" "));
  }

  // Show what's in remaining but NOT in prediction
  const extra = [...remaining].filter(n => !predSet.has(n));
  console.log("    剩余但非预测: " + extra.length + "注");

  console.log("");
}

// === PART 2: Analyze prediction structure ===
console.log("\n=== 第二部分: 预测号码结构分析 ===\n");

for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) continue;

  const cur = allData[period];
  const prev1 = allData[periodOrder[idx - 1]];
  const predSet = new Set(predictions[period]);
  const predArr = [...predSet];

  // Analyze digit distribution
  const d1freq = {}, d2freq = {}, d3freq = {};
  for (let i = 0; i <= 9; i++) { d1freq[i] = 0; d2freq[i] = 0; d3freq[i] = 0; }
  for (const n of predArr) {
    d1freq[+n[0]]++;
    d2freq[+n[1]]++;
    d3freq[+n[2]]++;
  }

  // Count 组三 vs 组六 vs 豹子
  let baozi = 0, zusan = 0, zuliù = 0;
  for (const n of predArr) {
    if (n[0] === n[1] && n[1] === n[2]) baozi++;
    else if (n[0] === n[1] || n[1] === n[2] || n[0] === n[2]) zusan++;
    else zuliù++;
  }

  // Sum distribution
  const sumFreq = {};
  for (const n of predArr) {
    const s = (+n[0]) + (+n[1]) + (+n[2]);
    sumFreq[s] = (sumFreq[s] || 0) + 1;
  }

  console.log("--- " + period + " (预测" + predArr.length + "注, 开奖" + numStr(cur) + ") ---");
  console.log("  百位: " + JSON.stringify(d1freq));
  console.log("  十位: " + JSON.stringify(d2freq));
  console.log("  个位: " + JSON.stringify(d3freq));
  console.log("  豹子=" + baozi + " 组三=" + zusan + " 组六=" + zuliù);
  console.log("  和值分布: " + JSON.stringify(sumFreq));
  console.log("");
}

// === PART 3: Try to find generation pattern ===
console.log("\n=== 第三部分: 生成模式推算 ===\n");

// Hypothesis: predictions are generated by:
// 1. Start with 000-999
// 2. Remove 豹子
// 3. Apply kill rules based on N-1, N-2, N-3 data
// 4. The remaining ~650 numbers are the predictions

// For each period, find the EXACT set of numbers NOT in prediction
for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) continue;

  const cur = allData[period];
  const prev1 = allData[periodOrder[idx - 1]];
  const prev2 = allData[periodOrder[idx - 2]];
  const prev3 = allData[periodOrder[idx - 3]];

  const predSet = new Set(predictions[period]);
  const notPred = allNums.filter(n => !predSet.has(n));

  // Analyze what these NOT-predict numbers have in common
  const notPredDigits = notPred.map(n => digits(n));

  // Check: are all 豹子 in notPred?
  const baoziInNotPred = notPred.filter(n => n[0] === n[1] && n[1] === n[2]);
  const baoziInPred = [...predSet].filter(n => n[0] === n[1] && n[1] === n[2]);

  // For each notPred number, check various properties
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

  const sh1 = new Set(shengHao(prev1));
  const sh2 = new Set(shengHao(prev2));
  const lh1 = new Set(lianHao(prev1));
  const lh2 = new Set(lianHao(prev2));
  const bc1 = new Set(biChuHao(prev1, prev2));

  // For each notPred number, what properties does it have?
  let allInHA1 = 0, allInHS1 = 0, allInHA2 = 0, allInHS2 = 0;
  let allInHA3 = 0, allInHS3 = 0;
  let allInVA1 = 0, allInVS1 = 0;
  let allInSH1 = 0, allInSH2 = 0;
  let allInLH1 = 0, allInBC1 = 0;
  let dblHA1 = 0, dblHS1 = 0, dblHA2 = 0, dblHS2 = 0;
  let dblVA1 = 0, dblVS1 = 0;
  let baoziCount = 0;

  for (const n of notPred) {
    const d = digits(n);
    const isBaozi = d[0] === d[1] && d[1] === d[2];
    if (isBaozi) baoziCount++;

    if (d.every(v => poolHA1.has(v))) allInHA1++;
    if (d.every(v => poolHS1.has(v))) allInHS1++;
    if (d.every(v => poolHA2.has(v))) allInHA2++;
    if (d.every(v => poolHS2.has(v))) allInHS2++;
    if (d.every(v => poolHA3.has(v))) allInHA3++;
    if (d.every(v => poolHS3.has(v))) allInHS3++;
    if (d.every(v => poolVA1.has(v))) allInVA1++;
    if (d.every(v => poolVS1.has(v))) allInVS1++;
    if (d.every(v => sh1.has(v))) allInSH1++;
    if (d.every(v => sh2.has(v))) allInSH2++;
    if (d.every(v => lh1.has(v))) allInLH1++;
    if (d.every(v => bc1.has(v))) allInBC1++;

    const ha = hAdd(d);
    const hs = hSub(d);
    if (ha.every(v => poolHA1.has(v))) dblHA1++;
    if (hs.every(v => poolHS1.has(v))) dblHS1++;
    if (ha.every(v => poolHA2.has(v))) dblHA2++;
    if (hs.every(v => poolHS2.has(v))) dblHS2++;

    const va = vAdd(d, prev1);
    const vs = vSub(d, prev1);
    if (va.every(v => poolVA1.has(v))) dblVA1++;
    if (vs.every(v => poolVS1.has(v))) dblVS1++;
  }

  // Also check how many PRED numbers have each property
  let predAllInHA1 = 0, predAllInHS1 = 0, predDblHA1 = 0, predDblHS1 = 0;
  let predAllInVA1 = 0, predAllInVS1 = 0;
  let predAllInSH1 = 0, predAllInLH1 = 0, predAllInBC1 = 0;
  let predBaozi = 0;

  for (const n of predSet) {
    const d = digits(n);
    if (d[0] === d[1] && d[1] === d[2]) predBaozi++;
    if (d.every(v => poolHA1.has(v))) predAllInHA1++;
    if (d.every(v => poolHS1.has(v))) predAllInHS1++;
    if (d.every(v => poolVA1.has(v))) predAllInVA1++;
    if (d.every(v => poolVS1.has(v))) predAllInVS1++;
    if (d.every(v => sh1.has(v))) predAllInSH1++;
    if (d.every(v => lh1.has(v))) predAllInLH1++;
    if (d.every(v => bc1.has(v))) predAllInBC1++;
    const ha = hAdd(d);
    const hs = hSub(d);
    if (ha.every(v => poolHA1.has(v))) predDblHA1++;
    if (hs.every(v => poolHS1.has(v))) predDblHS1++;
  }

  console.log("--- " + period + " (开奖" + numStr(cur) + ", 预测" + predSet.size + "注, 非预测" + notPred.length + "注) ---");
  console.log("  非预测中: 豹子=" + baoziCount + ", allInHA1=" + allInHA1 + ", allInHS1=" + allInHS1);
  console.log("    allInHA2=" + allInHA2 + ", allInHS2=" + allInHS2 + ", allInHA3=" + allInHA3 + ", allInHS3=" + allInHS3);
  console.log("    allInVA1=" + allInVA1 + ", allInVS1=" + allInVS1);
  console.log("    allInSH1=" + allInSH1 + ", allInSH2=" + allInSH2);
  console.log("    allInLH1=" + allInLH1 + ", allInBC1=" + allInBC1);
  console.log("    dblHA1=" + dblHA1 + ", dblHS1=" + dblHS1 + ", dblHA2=" + dblHA2 + ", dblHS2=" + dblHS2);
  console.log("    dblVA1=" + dblVA1 + ", dblVS1=" + dblVS1);
  console.log("  预测中: 豹子=" + predBaozi + ", allInHA1=" + predAllInHA1 + ", allInHS1=" + predAllInHS1);
  console.log("    allInVA1=" + predAllInVA1 + ", allInVS1=" + predAllInVS1);
  console.log("    allInSH1=" + predAllInSH1 + ", allInLH1=" + predAllInLH1 + ", allInBC1=" + predAllInBC1);
  console.log("    dblHA1=" + predDblHA1 + ", dblHS1=" + predDblHS1);
  console.log("");
}
