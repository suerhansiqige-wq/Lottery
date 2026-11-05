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

function computeAllPools(prev1, prev2, prev3) {
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = hAddFn(d1), hs1 = hSubFn(d1);
  const ha2 = hAddFn(d2), hs2 = hSubFn(d2);
  const ha3 = hAddFn(d3), hs3 = hSubFn(d3);
  const va1 = vAddFn(d1, d2), vs1 = vSubFn(d1, d2);
  const va2 = vAddFn(d2, d3), vs2 = vSubFn(d2, d3);

  const sh1 = new Set(), sh2 = new Set(), sh3 = new Set();
  for (let d = 0; d <= 9; d++) {
    if (!d1.includes(d)) sh1.add(d);
    if (!d2.includes(d)) sh2.add(d);
    if (!d3.includes(d)) sh3.add(d);
  }

  const lh1 = new Set(), lh2 = new Set(), lh3 = new Set();
  for (let i = 0; i < 2; i++) {
    lh1.add(d1[i]); lh1.add(d1[i+1]);
    lh2.add(d2[i]); lh2.add(d2[i+1]);
    lh3.add(d3[i]); lh3.add(d3[i+1]);
  }

  const bc1 = new Set();
  for (let d = 0; d <= 9; d++) {
    let cnt = 0;
    if (ha1.includes(d)) cnt++;
    if (hs1.includes(d)) cnt++;
    if (va1.includes(d)) cnt++;
    if (vs1.includes(d)) cnt++;
    if (cnt >= 2) bc1.add(d);
  }
  const bc2 = new Set();
  for (let d = 0; d <= 9; d++) {
    let cnt = 0;
    if (ha2.includes(d)) cnt++;
    if (hs2.includes(d)) cnt++;
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
  };
}

const allNums = [];
for (let n = 0; n < 1000; n++) allNums.push(String(n).padStart(3, '0'));

// Test all possible single rules
const ruleDefs = [];

// allIn rules
const poolNames = ['ha1','hs1','ha2','hs2','ha3','hs3','va1','vs1','va2','vs2','sh1','sh2','sh3','lh1','lh2','lh3','bc1','bc2'];
for (const pn of poolNames) {
  ruleDefs.push({
    name: `allIn(${pn})`,
    test: (pools, a, b, c) => [a,b,c].every(v => pools[pn].has(v))
  });
}

// dblHAdd rules
for (const pn of poolNames) {
  ruleDefs.push({
    name: `dblHAdd(${pn})`,
    test: (pools, a, b, c) => {
      const ha = hAddFn([a,b,c]);
      return ha.every(v => pools[pn].has(v));
    }
  });
}

// dblHSub rules
for (const pn of poolNames) {
  ruleDefs.push({
    name: `dblHSub(${pn})`,
    test: (pools, a, b, c) => {
      const hs = hSubFn([a,b,c]);
      return hs.every(v => pools[pn].has(v));
    }
  });
}

// 豹子
ruleDefs.push({
  name: '豹子',
  test: (pools, a, b, c) => a === b && b === c
});

// Test each rule across all periods
const periods = allData.filter(d => excelPredMap.has(d.issue));
console.log("测试期数: " + periods.length);
console.log("测试规则数: " + ruleDefs.length);

const ruleStats = [];
for (const rule of ruleDefs) {
  let totalFP = 0;
  let totalKilled = 0;
  let periodsTested = 0;

  for (const period of periods) {
    const idx = allData.indexOf(period);
    if (idx < 3) continue;

    const prev1 = allData[idx-1];
    const prev2 = allData[idx-2];
    const prev3 = allData[idx-3];
    const pools = computeAllPools(prev1, prev2, prev3);
    const excelPred = excelPredMap.get(period.issue);

    let killed = 0, fp = 0;
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (rule.test(pools, a, b, c)) {
        killed++;
        if (excelPred.has(s)) fp++;
      }
    }
    totalKilled += killed;
    totalFP += fp;
    periodsTested++;
  }

  ruleStats.push({
    name: rule.name,
    totalFP,
    avgKilled: (totalKilled / periodsTested).toFixed(1),
    periods: periodsTested
  });
}

// Sort by FP
ruleStats.sort((a, b) => a.totalFP - b.totalFP);

console.log("\n=== 零误杀规则（总FP=0）===");
const zeroFP = ruleStats.filter(r => r.totalFP === 0);
for (const r of zeroFP) {
  console.log(`  ${r.name}: 平均杀${r.avgKilled}注, 跨${r.periods}期`);
}

console.log("\n=== 低误杀规则（总FP≤5）===");
const lowFP = ruleStats.filter(r => r.totalFP > 0 && r.totalFP <= 5);
for (const r of lowFP) {
  console.log(`  ${r.name}: 平均杀${r.avgKilled}注, 总FP=${r.totalFP}, 跨${r.periods}期`);
}

// Now try greedy combination of zero-FP rules
console.log("\n=== 零误杀规则贪心组合 ===");
const usedRules = [];
const availableZeroFP = [...zeroFP];

for (let round = 0; round < Math.min(20, availableZeroFP.length); round++) {
  let bestRule = null;
  let bestAvgPred = Infinity;

  for (const zr of availableZeroFP) {
    if (usedRules.includes(zr.name)) continue;

    // Test combination
    let totalPred = 0, cnt = 0;
    for (const period of periods) {
      const idx = allData.indexOf(period);
      if (idx < 3) continue;

      const prev1 = allData[idx-1];
      const prev2 = allData[idx-2];
      const prev3 = allData[idx-3];
      const pools = computeAllPools(prev1, prev2, prev3);

      const killed = new Set();
      for (const s of allNums) {
        const a = +s[0], b = +s[1], c = +s[2];
        // Check all used rules + this new one
        const ruleNames = [...usedRules, zr.name];
        for (const rn of ruleNames) {
          const ruleDef = ruleDefs.find(r => r.name === rn);
          if (ruleDef && ruleDef.test(pools, a, b, c)) {
            killed.add(s);
            break;
          }
        }
      }
      totalPred += (1000 - killed.size);
      cnt++;
    }

    const avgPred = totalPred / cnt;
    if (avgPred < bestAvgPred) {
      bestRule = zr;
      bestAvgPred = avgPred;
    }
  }

  if (!bestRule) break;
  usedRules.push(bestRule.name);
  console.log(`第${round+1}轮: 加入 ${bestRule.name} → 平均${bestAvgPred.toFixed(0)}注`);

  if (bestAvgPred < 660) break;
}

console.log("\n最终规则集:");
for (const r of usedRules) console.log("  " + r);

// Verify final combination
console.log("\n=== 最终组合验证 ===");
let finalTotalPred = 0, finalTotalFP = 0, finalCnt = 0;
for (const period of periods) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computeAllPools(prev1, prev2, prev3);
  const excelPred = excelPredMap.get(period.issue);

  const killed = new Set();
  for (const s of allNums) {
    const a = +s[0], b = +s[1], c = +s[2];
    for (const rn of usedRules) {
      const ruleDef = ruleDefs.find(r => r.name === rn);
      if (ruleDef && ruleDef.test(pools, a, b, c)) {
        killed.add(s);
        break;
      }
    }
  }

  const predCount = 1000 - killed.size;
  let fp = 0;
  for (const k of killed) {
    if (excelPred.has(k)) fp++;
  }
  finalTotalPred += predCount;
  finalTotalFP += fp;
  finalCnt++;
  console.log(`  ${period.issue}: ${predCount}注, 误杀=${fp}`);
}

console.log(`\n总计: 平均${(finalTotalPred/finalCnt).toFixed(0)}注, 总误杀=${finalTotalFP}`);
