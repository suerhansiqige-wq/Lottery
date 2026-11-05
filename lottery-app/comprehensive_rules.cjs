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

console.log("=== 综合规则发现（含定位杀/杀和值/杀跨度） ===\n");

// For each period, enumerate ALL possible rules and find those with low FP
const allPeriodRules = {};

for (const period of predPeriods) {
  const idx = periodOrder.indexOf(period);
  if (idx < 3) continue;

  const cur = allData[period];
  const prev1 = allData[periodOrder[idx-1]];
  const prev2 = allData[periodOrder[idx-2]];
  const prev3 = allData[periodOrder[idx-3]];

  const predSet = new Set(predictions[period]);

  // Compute pools
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

  // 生号
  const sh1 = new Set(); for (let i=0;i<=9;i++) if (!new Set(prev1).has(i)) sh1.add(i);
  const sh2 = new Set(); for (let i=0;i<=9;i++) if (!new Set(prev2).has(i)) sh2.add(i);
  const sh3 = new Set(); for (let i=0;i<=9;i++) if (!new Set(prev3).has(i)) sh3.add(i);

  // 连号
  const lh1 = new Set(); for (let i=0;i<prev1.length-1;i++) { lh1.add(prev1[i]); lh1.add(prev1[i+1]); }
  const lh2 = new Set(); for (let i=0;i<prev2.length-1;i++) { lh2.add(prev2[i]); lh2.add(prev2[i+1]); }
  const lh3 = new Set(); for (let i=0;i<prev3.length-1;i++) { lh3.add(prev3[i]); lh3.add(prev3[i+1]); }

  // 必出号
  function biChu(d, p) {
    const ha = hAdd(d), hs = hSub(d), va = vAdd(d, p), vs = vSub(d, p);
    const counts = {}; for (let i=0;i<=9;i++) counts[i]=0;
    for (const v of [...ha,...hs,...va,...vs]) counts[v]++;
    return new Set(Object.entries(counts).filter(([k,v])=>v>=2).map(([k])=>+k));
  }
  const bc1 = biChu(prev1, prev2);
  const bc2 = biChu(prev2, prev3);

  // Evaluate a kill function: returns {name, killsNonPred, killsPred, total}
  function evalRule(name, fn) {
    let killsNP = 0, killsP = 0;
    for (const n of allNums) {
      if (fn(n)) {
        if (predSet.has(n)) killsP++;
        else killsNP++;
      }
    }
    return { name, killsNP, killsP, total: killsNP + killsP };
  }

  const goodRules = []; // Rules with killsNP > 0 and killsP <= 10

  // 1. 豹子
  const r = evalRule("豹子", n => n[0]===n[1] && n[1]===n[2]);
  if (r.killsP <= 10) goodRules.push(r);

  // 2. allIn rules for all pools
  const pools = {
    ha1: poolHA1, hs1: poolHS1, ha2: poolHA2, hs2: poolHS2, ha3: poolHA3, hs3: poolHS3,
    va1: poolVA1, vs1: poolVS1, va2: poolVA2, vs2: poolVS2,
    sh1, sh2, sh3, lh1, lh2, lh3, bc1, bc2,
    ha12: new Set([...poolHA1,...poolHA2]),
    hs12: new Set([...poolHS1,...poolHS2]),
    hahs1: new Set([...poolHA1,...poolHS1]),
    lhlh: new Set([...lh1,...lh2]),
  };

  for (const [pname, pool] of Object.entries(pools)) {
    const r = evalRule("allIn(" + pname + ")", n => { const d = digits(n); return d.every(v => pool.has(v)); });
    if (r.killsNP > 0 && r.killsP <= 10) goodRules.push(r);
  }

  // 3. dblHAdd rules
  for (const [pname, pool] of Object.entries(pools)) {
    const r = evalRule("dblHAdd(" + pname + ")", n => { const d = digits(n); const ha = hAdd(d); return ha.every(v => pool.has(v)); });
    if (r.killsNP > 0 && r.killsP <= 10) goodRules.push(r);
  }

  // 4. dblHSub rules
  for (const [pname, pool] of Object.entries(pools)) {
    const r = evalRule("dblHSub(" + pname + ")", n => { const d = digits(n); const hs = hSub(d); return hs.every(v => pool.has(v)); });
    if (r.killsNP > 0 && r.killsP <= 10) goodRules.push(r);
  }

  // 5. 定位杀: kill all numbers with digit d at position p
  for (let p = 0; p < 3; p++) {
    for (let d = 0; d <= 9; d++) {
      const r = evalRule("定位杀(位" + p + "=" + d + ")", n => +n[p] === d);
      if (r.killsNP > 10 && r.killsP <= 5) goodRules.push(r);
    }
  }

  // 6. 杀和值: kill all numbers with sum = s
  for (let s = 0; s <= 27; s++) {
    const r = evalRule("杀和值" + s, n => { const d = digits(n); return d[0]+d[1]+d[2] === s; });
    if (r.killsNP > 10 && r.killsP <= 5) goodRules.push(r);
  }

  // 7. 杀跨度: kill all numbers with span = sp
  for (let sp = 0; sp <= 9; sp++) {
    const r = evalRule("杀跨度" + sp, n => { const d = digits(n); return Math.max(...d)-Math.min(...d) === sp; });
    if (r.killsNP > 10 && r.killsP <= 5) goodRules.push(r);
  }

  // 8. 杀奇偶模式
  for (let mask = 0; mask < 8; mask++) {
    const pattern = ((mask>>2)&1) + "" + ((mask>>1)&1) + "" + (mask&1);
    const r = evalRule("杀奇偶" + pattern, n => {
      const d = digits(n);
      const m = (d[0]%2)*4 + (d[1]%2)*2 + (d[2]%2);
      return m === mask;
    });
    if (r.killsNP > 10 && r.killsP <= 5) goodRules.push(r);
  }

  // 9. 杀大小模式
  for (let mask = 0; mask < 8; mask++) {
    const pattern = ((mask>>2)&1) + "" + ((mask>>1)&1) + "" + (mask&1);
    const r = evalRule("杀大小" + pattern, n => {
      const d = digits(n);
      const m = (d[0]>=5?1:0)*4 + (d[1]>=5?1:0)*2 + (d[2]>=5?1:0);
      return m === mask;
    });
    if (r.killsNP > 10 && r.killsP <= 5) goodRules.push(r);
  }

  // 10. allIn for derived pools from N-2, N-3
  // 生号 union
  const sh12 = new Set([...sh1,...sh2]);
  const shAll = new Set([...sh1,...sh2,...sh3]);
  for (const [pname, pool] of [["sh12", sh12], ["shAll", shAll]]) {
    const r = evalRule("allIn(" + pname + ")", n => { const d = digits(n); return d.every(v => pool.has(v)); });
    if (r.killsNP > 0 && r.killsP <= 10) goodRules.push(r);
  }

  // Sort by efficiency (killsNP / (killsP + 1))
  goodRules.sort((a, b) => {
    const effA = a.killsNP / (a.killsP + 1);
    const effB = b.killsNP / (b.killsP + 1);
    return effB - effA;
  });

  allPeriodRules[period] = goodRules;

  // Greedy selection with FP budget
  // Allow total FP up to 15 per period
  const MAX_FP = 15;
  let selectedRules = [];
  let totalKilledNP = 0;
  let totalKilledP = 0;
  let covered = new Set();

  for (const rule of goodRules) {
    // Estimate overlap with already covered
    let newNP = 0, newP = 0;
    for (const n of allNums) {
      if (covered.has(n)) continue;
      let killed = false;
      if (rule.name === "豹子") killed = n[0]===n[1] && n[1]===n[2];
      else if (rule.name.startsWith("allIn(")) {
        const pname = rule.name.match(/\((.+)\)/)[1];
        const pool = pools[pname];
        if (pool) { const d = digits(n); killed = d.every(v => pool.has(v)); }
      } else if (rule.name.startsWith("dblHAdd(")) {
        const pname = rule.name.match(/\((.+)\)/)[1];
        const pool = pools[pname];
        if (pool) { const d = digits(n); const ha = hAdd(d); killed = ha.every(v => pool.has(v)); }
      } else if (rule.name.startsWith("dblHSub(")) {
        const pname = rule.name.match(/\((.+)\)/)[1];
        const pool = pools[pname];
        if (pool) { const d = digits(n); const hs = hSub(d); killed = hs.every(v => pool.has(v)); }
      } else if (rule.name.startsWith("定位杀")) {
        const m = rule.name.match(/位(\d)=(\d)/);
        if (m) killed = +n[+m[1]] === +m[2];
      } else if (rule.name.startsWith("杀和值")) {
        const s = +rule.name.replace("杀和值", "");
        const d = digits(n); killed = d[0]+d[1]+d[2] === s;
      } else if (rule.name.startsWith("杀跨度")) {
        const sp = +rule.name.replace("杀跨度", "");
        const d = digits(n); killed = Math.max(...d)-Math.min(...d) === sp;
      } else if (rule.name.startsWith("杀奇偶")) {
        const pat = rule.name.replace("杀奇偶", "");
        const d = digits(n);
        const m = (d[0]%2)*4 + (d[1]%2)*2 + (d[2]%2);
        const mask = (+pat[0])*4 + (+pat[1])*2 + (+pat[2]);
        killed = m === mask;
      } else if (rule.name.startsWith("杀大小")) {
        const pat = rule.name.replace("杀大小", "");
        const d = digits(n);
        const m = (d[0]>=5?1:0)*4 + (d[1]>=5?1:0)*2 + (d[2]>=5?1:0);
        const mask = (+pat[0])*4 + (+pat[1])*2 + (+pat[2]);
        killed = m === mask;
      }

      if (killed) {
        if (predSet.has(n)) newP++;
        else newNP++;
      }
    }

    if (totalKilledP + newP <= MAX_FP) {
      selectedRules.push(rule);
      totalKilledNP += newNP;
      totalKilledP += newP;
      // Update covered
      for (const n of allNums) {
        // Re-check if this rule kills n
        let killed = false;
        if (rule.name === "豹子") killed = n[0]===n[1] && n[1]===n[2];
        else if (rule.name.startsWith("allIn(")) {
          const pname = rule.name.match(/\((.+)\)/)[1];
          const pool = pools[pname];
          if (pool) { const d = digits(n); killed = d.every(v => pool.has(v)); }
        } else if (rule.name.startsWith("dblHAdd(")) {
          const pname = rule.name.match(/\((.+)\)/)[1];
          const pool = pools[pname];
          if (pool) { const d = digits(n); const ha = hAdd(d); killed = ha.every(v => pool.has(v)); }
        } else if (rule.name.startsWith("dblHSub(")) {
          const pname = rule.name.match(/\((.+)\)/)[1];
          const pool = pools[pname];
          if (pool) { const d = digits(n); const hs = hSub(d); killed = hs.every(v => pool.has(v)); }
        } else if (rule.name.startsWith("定位杀")) {
          const m = rule.name.match(/位(\d)=(\d)/);
          if (m) killed = +n[+m[1]] === +m[2];
        } else if (rule.name.startsWith("杀和值")) {
          const s = +rule.name.replace("杀和值", "");
          const d = digits(n); killed = d[0]+d[1]+d[2] === s;
        } else if (rule.name.startsWith("杀跨度")) {
          const sp = +rule.name.replace("杀跨度", "");
          const d = digits(n); killed = Math.max(...d)-Math.min(...d) === sp;
        } else if (rule.name.startsWith("杀奇偶")) {
          const pat = rule.name.replace("杀奇偶", "");
          const d = digits(n);
          const m = (d[0]%2)*4 + (d[1]%2)*2 + (d[2]%2);
          const mask = (+pat[0])*4 + (+pat[1])*2 + (+pat[2]);
          killed = m === mask;
        } else if (rule.name.startsWith("杀大小")) {
          const pat = rule.name.replace("杀大小", "");
          const d = digits(n);
          const m = (d[0]>=5?1:0)*4 + (d[1]>=5?1:0)*2 + (d[2]>=5?1:0);
          const mask = (+pat[0])*4 + (+pat[1])*2 + (+pat[2]);
          killed = m === mask;
        }
        if (killed) covered.add(n);
      }
    }
  }

  const remaining = allNums.filter(n => !covered.has(n));
  const remainingPred = remaining.filter(n => predSet.has(n));
  const remainingNonPred = remaining.filter(n => !predSet.has(n));

  console.log("--- " + period + " (开奖" + numStr(cur) + ", 预测" + predSet.size + ") ---");
  console.log("  可用规则: " + goodRules.length + "个 (FP≤10)");
  console.log("  选择规则: " + selectedRules.length + "个, 总FP=" + totalKilledP);
  for (const r of selectedRules) {
    console.log("    " + r.name + ": 杀非预测=" + r.killsNP + ", 杀预测=" + r.killsP);
  }
  console.log("  剩余: " + remaining.length + " (含预测=" + remainingPred.length + ", 非预测=" + remainingNonPred.length + ")");
  console.log("  覆盖率: " + ((predSet.size - (predSet.size - remainingPred.length)) / predSet.size * 100).toFixed(1) + "%");
  console.log("");
}
