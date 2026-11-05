const XLSX = require("xlsx");
const path = require("path");

const FILE = path.join("C:\\Users\\boloor\\Desktop", "新黄金三格.xlsm");
const wb = XLSX.readFile(FILE, { type: "file" });

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

function digits(n) { return [+n[0], +n[1], +n[2]]; }
function numStr(d) { return "" + d[0] + d[1] + d[2]; }
function hAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function hSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function vAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function vSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

const allNums = [];
for (let i = 0; i < 1000; i++) allNums.push(String(i).padStart(3, "0"));

const predPeriods = Object.keys(predictions).sort();

// For each period, analyze the remaining (unexplained) non-pred numbers
// after removing zero-FP rules
console.log("=== 未解释号码特征分析 ===\n");

for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) continue;

  const cur = allData[period];
  const prev1 = allData[periodOrder[idx-1]];
  const prev2 = allData[periodOrder[idx-2]];
  const prev3 = allData[periodOrder[idx-3]];

  const predSet = new Set(predictions[period]);

  // Compute all transformations
  const ha1 = hAdd(prev1), hs1 = hSub(prev1);
  const ha2 = hAdd(prev2), hs2 = hSub(prev2);
  const ha3 = hAdd(prev3), hs3 = hSub(prev3);
  const va1 = vAdd(prev1, prev2), vs1 = vSub(prev1, prev2);
  const va2 = vAdd(prev2, prev3), vs2 = vSub(prev2, prev3);

  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);

  // Identify zero-FP rules for this period
  function isZeroFP(fn) {
    for (const n of predSet) { if (fn(n)) return false; }
    return true;
  }

  // Test which numbers remain after all zero-FP allIn/dblHAdd rules
  const zeroFPKills = [];

  // Check each potential rule
  const candidateRules = [];

  // allIn rules
  const poolMap = {
    "ha1": poolHA1, "hs1": poolHS1, "ha2": poolHA2, "hs2": poolHS2,
    "ha3": new Set(ha3), "hs3": new Set(hs3),
    "va1": new Set(va1), "vs1": new Set(vs1),
    "va2": new Set(va2), "vs2": new Set(vs2),
  };

  // Add more pools
  const sh1 = new Set(); for (let i=0;i<=9;i++) if (!new Set(prev1).has(i)) sh1.add(i);
  const sh2 = new Set(); for (let i=0;i<=9;i++) if (!new Set(prev2).has(i)) sh2.add(i);
  poolMap["sh1"] = sh1; poolMap["sh2"] = sh2;

  const lh1 = new Set(); for (let i=0;i<prev1.length-1;i++) { lh1.add(prev1[i]); lh1.add(prev1[i+1]); }
  const lh2 = new Set(); for (let i=0;i<prev2.length-1;i++) { lh2.add(prev2[i]); lh2.add(prev2[i+1]); }
  poolMap["lh1"] = lh1; poolMap["lh2"] = lh2;

  // 必出号
  function biChu(d, p) {
    const ha = hAdd(d), hs = hSub(d), va = vAdd(d, p), vs = vSub(d, p);
    const counts = {}; for (let i=0;i<=9;i++) counts[i]=0;
    for (const v of [...ha,...hs,...va,...vs]) counts[v]++;
    return new Set(Object.entries(counts).filter(([k,v])=>v>=2).map(([k])=>+k));
  }
  poolMap["bc1"] = biChu(prev1, prev2);
  poolMap["bc2"] = biChu(prev2, prev3);

  // Combined pools
  poolMap["ha12"] = new Set([...poolHA1,...poolHA2]);
  poolMap["hs12"] = new Set([...poolHS1,...poolHS2]);
  poolMap["hahs1"] = new Set([...poolHA1,...poolHS1]);
  poolMap["lhlh"] = new Set([...lh1,...lh2]);

  // For each pool, check if allIn is zero-FP
  for (const [pname, pool] of Object.entries(poolMap)) {
    const fn = n => { const d = digits(n); return d.every(v => pool.has(v)); };
    if (isZeroFP(fn)) {
      let cnt = 0; for (const n of allNums) if (fn(n)) cnt++;
      if (cnt > 0) zeroFPKills.push({ name: "allIn("+pname+")", fn, size: cnt });
    }
  }

  // dblHAdd rules
  for (const [pname, pool] of Object.entries(poolMap)) {
    const fn = n => { const d = digits(n); const ha = hAdd(d); return ha.every(v => pool.has(v)); };
    if (isZeroFP(fn)) {
      let cnt = 0; for (const n of allNums) if (fn(n)) cnt++;
      if (cnt > 0) zeroFPKills.push({ name: "dblHAdd("+pname+")", fn, size: cnt });
    }
  }

  // dblHSub rules
  for (const [pname, pool] of Object.entries(poolMap)) {
    const fn = n => { const d = digits(n); const hs = hSub(d); return hs.every(v => pool.has(v)); };
    if (isZeroFP(fn)) {
      let cnt = 0; for (const n of allNums) if (fn(n)) cnt++;
      if (cnt > 0) zeroFPKills.push({ name: "dblHSub("+pname+")", fn, size: cnt });
    }
  }

  // 豹子
  const baoziFn = n => n[0]===n[1] && n[1]===n[2];
  if (isZeroFP(baoziFn)) {
    zeroFPKills.push({ name: "豹子", fn: baoziFn, size: 10 });
  }

  // Apply all zero-FP kills
  let remaining = new Set(allNums);
  for (const rule of zeroFPKills) {
    remaining = new Set([...remaining].filter(n => !rule.fn(n)));
  }

  // What's left that's NOT in prediction?
  const unexplained = [...remaining].filter(n => !predSet.has(n));
  // What's in prediction but was killed?
  const killed = allNums.filter(n => !remaining.has(n) && predSet.has(n));

  console.log("--- " + period + " (开奖" + numStr(cur) + ", 预测" + predSet.size + ") ---");
  console.log("  零FP规则: " + zeroFPKills.map(r=>r.name+"("+r.size+")").join(", "));
  console.log("  剩余: " + remaining.size + ", 未解释非预测: " + unexplained.length);

  // Analyze unexplained numbers
  // 1. Digit frequency in unexplained vs prediction
  const unexpDigitFreq = [0,0,0,0,0,0,0,0,0,0];
  const predDigitFreq = [0,0,0,0,0,0,0,0,0,0];
  for (const n of unexplained) {
    const d = digits(n);
    unexpDigitFreq[d[0]]++; unexpDigitFreq[d[1]]++; unexpDigitFreq[d[2]]++;
  }
  for (const n of [...predSet]) {
    const d = digits(n);
    predDigitFreq[d[0]]++; predDigitFreq[d[1]]++; predDigitFreq[d[2]]++;
  }

  // 2. Position-specific digit analysis
  const posFreq = [{},{},{}];
  for (const n of unexplained) {
    for (let p = 0; p < 3; p++) {
      posFreq[p][n[p]] = (posFreq[p][n[p]] || 0) + 1;
    }
  }

  console.log("  未解释号码位置分布:");
  for (let p = 0; p < 3; p++) {
    const sorted = Object.entries(posFreq[p]).sort((a,b) => b[1]-a[1]);
    console.log("    位" + p + ": " + sorted.map(([d,c]) => d+"="+c).join(" "));
  }

  // 3. Sum and span analysis
  const sumFreq = {};
  const spanFreq = {};
  for (const n of unexplained) {
    const d = digits(n);
    const s = d[0]+d[1]+d[2];
    const sp = Math.max(...d) - Math.min(...d);
    sumFreq[s] = (sumFreq[s]||0) + 1;
    spanFreq[sp] = (spanFreq[sp]||0) + 1;
  }
  console.log("  未解释和值: " + JSON.stringify(sumFreq));
  console.log("  未解释跨度: " + JSON.stringify(spanFreq));

  // 4. Check if unexplained numbers have specific digit properties
  // e.g., all digits from a certain pool
  const unexpDigits = new Set();
  for (const n of unexplained) {
    for (const c of n) unexpDigits.add(+c);
  }
  console.log("  未解释号码涉及数字: " + JSON.stringify([...unexpDigits].sort()));

  // 5. Check: are unexplained numbers allIn some larger pool?
  for (let size = 4; size <= 7; size++) {
    // Try all combinations of 'size' digits
    // This is too many to enumerate, so just check specific pools
  }

  // 6. Check specific hypotheses about unexplained
  // Hypothesis: unexplained are killed by "at least one digit NOT in pool" rules
  // i.e., numbers where NO digit is in poolHA1 (for example)
  for (const [pname, pool] of Object.entries(poolMap)) {
    let killUnexp = 0, killPred = 0;
    for (const n of unexplained) {
      const d = digits(n);
      if (!d.some(v => pool.has(v))) killUnexp++;
    }
    for (const n of [...predSet]) {
      const d = digits(n);
      if (!d.some(v => pool.has(v))) killPred++;
    }
    if (killUnexp > 20 && killPred < killUnexp * 0.3) {
      console.log("  atLeast1Kill(" + pname + "): 杀未解释=" + killUnexp + ", 杀预测=" + killPred);
    }
  }

  // 7. Check: position-specific kills (杀定位)
  // For each position and digit, check if killing all numbers with that digit at that position helps
  for (let p = 0; p < 3; p++) {
    for (let d = 0; d <= 9; d++) {
      let killUnexp = 0, killPred = 0;
      for (const n of unexplained) { if (+n[p] === d) killUnexp++; }
      for (const n of [...predSet]) { if (+n[p] === d) killPred++; }
      if (killUnexp > 15 && killPred === 0) {
        console.log("  定位杀: 位" + p + "杀" + d + " → 杀未解释=" + killUnexp + ", 杀预测=0");
      }
    }
  }

  // 8. Check: sum-based kills
  for (let s = 0; s <= 27; s++) {
    let killUnexp = 0, killPred = 0;
    for (const n of unexplained) { const d = digits(n); if (d[0]+d[1]+d[2] === s) killUnexp++; }
    for (const n of [...predSet]) { const d = digits(n); if (d[0]+d[1]+d[2] === s) killPred++; }
    if (killUnexp > 10 && killPred === 0) {
      console.log("  杀和值" + s + ": 杀未解释=" + killUnexp + ", 杀预测=0");
    }
  }

  // 9. Check: span-based kills
  for (let sp = 0; sp <= 9; sp++) {
    let killUnexp = 0, killPred = 0;
    for (const n of unexplained) { const d = digits(n); if (Math.max(...d)-Math.min(...d) === sp) killUnexp++; }
    for (const n of [...predSet]) { const d = digits(n); if (Math.max(...d)-Math.min(...d) === sp) killPred++; }
    if (killUnexp > 10 && killPred === 0) {
      console.log("  杀跨度" + sp + ": 杀未解释=" + killUnexp + ", 杀预测=0");
    }
  }

  // 10. Check: odd/even pattern kills
  for (let mask = 0; mask < 8; mask++) {
    let killUnexp = 0, killPred = 0;
    for (const n of unexplained) {
      const d = digits(n);
      const m = (d[0]%2)*4 + (d[1]%2)*2 + (d[2]%2);
      if (m === mask) killUnexp++;
    }
    for (const n of [...predSet]) {
      const d = digits(n);
      const m = (d[0]%2)*4 + (d[1]%2)*2 + (d[2]%2);
      if (m === mask) killPred++;
    }
    if (killUnexp > 15 && killPred === 0) {
      const pattern = ((mask>>2)&1) + "" + ((mask>>1)&1) + "" + (mask&1);
      console.log("  杀奇偶" + pattern + ": 杀未解释=" + killUnexp + ", 杀预测=0");
    }
  }

  // 11. Check: big/small pattern kills
  for (let mask = 0; mask < 8; mask++) {
    let killUnexp = 0, killPred = 0;
    for (const n of unexplained) {
      const d = digits(n);
      const m = (d[0]>=5?1:0)*4 + (d[1]>=5?1:0)*2 + (d[2]>=5?1:0);
      if (m === mask) killUnexp++;
    }
    for (const n of [...predSet]) {
      const d = digits(n);
      const m = (d[0]>=5?1:0)*4 + (d[1]>=5?1:0)*2 + (d[2]>=5?1:0);
      if (m === mask) killPred++;
    }
    if (killUnexp > 15 && killPred === 0) {
      const pattern = ((mask>>2)&1) + "" + ((mask>>1)&1) + "" + (mask&1);
      console.log("  杀大小" + pattern + ": 杀未解释=" + killUnexp + ", 杀预测=0");
    }
  }

  // 12. List the actual unexplained numbers (if few enough)
  if (unexplained.length <= 50) {
    console.log("  未解释号码: " + unexplained.join(" "));
  } else {
    console.log("  未解释号码(前50): " + unexplained.slice(0, 50).join(" ") + "...");
  }

  console.log("");
}
