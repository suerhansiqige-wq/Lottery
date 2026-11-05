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

const allNums = [];
for (let n = 0; n < 1000; n++) allNums.push(String(n).padStart(3, '0'));

const periods = allData.filter(d => excelPredMap.has(d.issue));
console.log("测试期数: " + periods.length);

// Test comprehensive rule types
const ruleResults = {};

for (const period of periods) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = hAddFn(d1), hs1 = hSubFn(d1);
  const ha2 = hAddFn(d2), hs2 = hSubFn(d2);
  const ha3 = hAddFn(d3), hs3 = hSubFn(d3);
  const va1 = vAddFn(d1, d2), vs1 = vSubFn(d1, d2);
  const va2 = vAddFn(d2, d3), vs2 = vSubFn(d2, d3);

  const excelPred = excelPredMap.get(period.issue);

  // Test each rule type
  const testRule = (name, killFn) => {
    if (!ruleResults[name]) ruleResults[name] = { totalKilled: 0, totalFP: 0, periods: 0 };
    let killed = 0, fp = 0;
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (killFn(a, b, c)) {
        killed++;
        if (excelPred.has(s)) fp++;
      }
    }
    ruleResults[name].totalKilled += killed;
    ruleResults[name].totalFP += fp;
    ruleResults[name].periods++;
  };

  // 豹子
  testRule('豹子', (a,b,c) => a===b && b===c);

  // allIn pools
  const pools = {
    ha1, hs1, ha2, hs2, ha3, hs3, va1, vs1, va2, vs2,
    sh1: [...new Set([0,1,2,3,4,5,6,7,8,9].filter(d => !d1.includes(d)))],
    sh2: [...new Set([0,1,2,3,4,5,6,7,8,9].filter(d => !d2.includes(d)))],
    sh3: [...new Set([0,1,2,3,4,5,6,7,8,9].filter(d => !d3.includes(d)))],
    lh1: [...new Set([d1[0],d1[1],d1[2]])],
    lh2: [...new Set([d2[0],d2[1],d2[2]])],
    lh3: [...new Set([d3[0],d3[1],d3[2]])],
  };

  // 必出号
  const bc1Arr = [], bc2Arr = [];
  for (let d = 0; d <= 9; d++) {
    let cnt1 = [ha1, hs1, va1, vs1].filter(arr => arr.includes(d)).length;
    if (cnt1 >= 2) bc1Arr.push(d);
    let cnt2 = [ha2, hs2, va2, vs2].filter(arr => arr.includes(d)).length;
    if (cnt2 >= 2) bc2Arr.push(d);
  }
  pools.bc1 = bc1Arr;
  pools.bc2 = bc2Arr;

  for (const [pname, parr] of Object.entries(pools)) {
    const pset = new Set(parr);
    testRule(`allIn(${pname})`, (a,b,c) => pset.has(a) && pset.has(b) && pset.has(c));
  }

  // dblHAdd/dblHSub
  for (const [pname, parr] of Object.entries(pools)) {
    const pset = new Set(parr);
    testRule(`dblHAdd(${pname})`, (a,b,c) => {
      const ha = hAddFn([a,b,c]);
      return pset.has(ha[0]) && pset.has(ha[1]) && pset.has(ha[2]);
    });
    testRule(`dblHSub(${pname})`, (a,b,c) => {
      const hs = hSubFn([a,b,c]);
      return pset.has(hs[0]) && pset.has(hs[1]) && pset.has(hs[2]);
    });
  }

  // 定位杀: kill numbers where position X has digit from pool
  for (const [pname, parr] of Object.entries(pools)) {
    const pset = new Set(parr);
    for (let pos = 0; pos < 3; pos++) {
      testRule(`定位杀${pos}In(${pname})`, (a,b,c) => {
        const digits = [a,b,c];
        return pset.has(digits[pos]);
      });
    }
  }

  // 杀和值: kill numbers whose digit sum is in pool
  for (const [pname, parr] of Object.entries(pools)) {
    const pset = new Set(parr);
    testRule(`杀和值In(${pname})`, (a,b,c) => pset.has((a+b+c) % 10));
    testRule(`杀和值RawIn(${pname})`, (a,b,c) => pset.has(a+b+c > 9 ? (a+b+c)%10 : a+b+c));
  }

  // 杀跨度: kill numbers whose span is in pool
  for (const [pname, parr] of Object.entries(pools)) {
    const pset = new Set(parr);
    const span = (a,b,c) => Math.max(a,b,c) - Math.min(a,b,c);
    testRule(`杀跨度In(${pname})`, (a,b,c) => pset.has(span(a,b,c)));
  }

  // 杀两码和: kill numbers where any pair sum is in pool
  for (const [pname, parr] of Object.entries(pools)) {
    const pset = new Set(parr);
    testRule(`杀两码和In(${pname})`, (a,b,c) => {
      const s1 = (a+b)%10, s2 = (b+c)%10, s3 = (a+c)%10;
      return pset.has(s1) && pset.has(s2) && pset.has(s3);
    });
  }

  // 杀两码差: kill numbers where any pair diff is in pool
  for (const [pname, parr] of Object.entries(pools)) {
    const pset = new Set(parr);
    testRule(`杀两码差In(${pname})`, (a,b,c) => {
      const d1 = Math.abs(a-b), d2 = Math.abs(b-c), d3 = Math.abs(a-c);
      return pset.has(d1) && pset.has(d2) && pset.has(d3);
    });
  }
}

// Sort rules by FP rate
const ruleList = Object.entries(ruleResults).map(([name, stats]) => ({
  name,
  avgKilled: (stats.totalKilled / stats.periods).toFixed(1),
  totalFP: stats.totalFP,
  avgFP: (stats.totalFP / stats.periods).toFixed(2),
  fpRate: stats.totalFP / (stats.totalKilled || 1),
  periods: stats.periods
}));

// Show zero-FP rules
console.log("\n=== 零误杀规则 ===");
const zeroFP = ruleList.filter(r => r.totalFP === 0).sort((a,b) => parseFloat(b.avgKilled) - parseFloat(a.avgKilled));
for (const r of zeroFP) {
  console.log(`  ${r.name}: 平均杀${r.avgKilled}注`);
}

// Show low-FP rules (total FP ≤ 5)
console.log("\n=== 低误杀规则 (总FP≤5) ===");
const lowFP = ruleList.filter(r => r.totalFP > 0 && r.totalFP <= 5).sort((a,b) => a.totalFP - b.totalFP || parseFloat(b.avgKilled) - parseFloat(a.avgKilled));
for (const r of lowFP.slice(0, 30)) {
  console.log(`  ${r.name}: 平均杀${r.avgKilled}注, 总FP=${r.totalFP}, 平均FP=${r.avgFP}`);
}

// Try greedy combination
console.log("\n=== 贪心组合（允许总FP≤10）===");
const candidateRules = [...zeroFP, ...lowFP.filter(r => r.totalFP <= 2)];
const usedRuleNames = [];
let currentTotalFP = 0;
const maxFP = 10;

for (let round = 0; round < candidateRules.length; round++) {
  let bestRule = null;
  let bestAvgPred = Infinity;
  let bestAddFP = 0;

  for (const cr of candidateRules) {
    if (usedRuleNames.includes(cr.name)) continue;

    // Test combination
    let totalPred = 0, totalFP = 0, cnt = 0;
    for (const period of periods) {
      const idx = allData.indexOf(period);
      if (idx < 3) continue;

      const prev1 = allData[idx-1];
      const prev2 = allData[idx-2];
      const prev3 = allData[idx-3];
      const d1 = [prev1.d1, prev1.d2, prev1.d3];
      const d2 = [prev2.d1, prev2.d2, prev2.d3];
      const d3 = [prev3.d1, prev3.d2, prev3.d3];

      const excelPred = excelPredMap.get(period.issue);

      let killed = 0, fp = 0;
      for (const s of allNums) {
        const a = +s[0], b = +s[1], c = +s[2];
        // Check if ANY used rule kills this number
        let isKilled = false;
        for (const urn of [...usedRuleNames, cr.name]) {
          // Re-test the rule
          const ruleMatch = urn.match(/^(allIn|dblHAdd|dblHSub|定位杀\dIn|杀和值In|杀和值RawIn|杀跨度In|杀两码和In|杀两码差In|豹子)\((.+)\)$/);
          if (!ruleMatch && urn !== '豹子') continue;

          if (urn === '豹子') {
            if (a === b && b === c) { isKilled = true; break; }
            continue;
          }

          const ruleType = ruleMatch[1];
          const poolName = ruleMatch[2];

          // Compute pool
          const ha1 = hAddFn(d1), hs1 = hSubFn(d1);
          const ha2 = hAddFn(d2), hs2 = hSubFn(d2);
          const ha3 = hAddFn(d3), hs3 = hSubFn(d3);
          const va1 = vAddFn(d1, d2), vs1 = vSubFn(d1, d2);
          const va2 = vAddFn(d2, d3), vs2 = vSubFn(d2, d3);

          const poolMap = {
            ha1, hs1, ha2, hs2, ha3, hs3, va1, vs1, va2, vs2,
            sh1: [0,1,2,3,4,5,6,7,8,9].filter(d => !d1.includes(d)),
            sh2: [0,1,2,3,4,5,6,7,8,9].filter(d => !d2.includes(d)),
            sh3: [0,1,2,3,4,5,6,7,8,9].filter(d => !d3.includes(d)),
            lh1: [d1[0],d1[1],d1[2]],
            lh2: [d2[0],d2[1],d2[2]],
            lh3: [d3[0],d3[1],d3[2]],
          };

          // 必出号
          const bc1Arr = [], bc2Arr = [];
          for (let dd = 0; dd <= 9; dd++) {
            let cnt1 = [ha1, hs1, va1, vs1].filter(arr => arr.includes(dd)).length;
            if (cnt1 >= 2) bc1Arr.push(dd);
            let cnt2 = [ha2, hs2, va2, vs2].filter(arr => arr.includes(dd)).length;
            if (cnt2 >= 2) bc2Arr.push(dd);
          }
          poolMap.bc1 = bc1Arr;
          poolMap.bc2 = bc2Arr;

          const pool = poolMap[poolName];
          if (!pool) continue;
          const pset = new Set(pool);

          if (ruleType === 'allIn') {
            if (pset.has(a) && pset.has(b) && pset.has(c)) { isKilled = true; break; }
          } else if (ruleType === 'dblHAdd') {
            const ha = hAddFn([a,b,c]);
            if (pset.has(ha[0]) && pset.has(ha[1]) && pset.has(ha[2])) { isKilled = true; break; }
          } else if (ruleType === 'dblHSub') {
            const hs = hSubFn([a,b,c]);
            if (pset.has(hs[0]) && pset.has(hs[1]) && pset.has(hs[2])) { isKilled = true; break; }
          } else if (ruleType.startsWith('定位杀')) {
            const pos = parseInt(ruleType[3]);
            const digits = [a,b,c];
            if (pset.has(digits[pos])) { isKilled = true; break; }
          } else if (ruleType === '杀和值In') {
            if (pset.has((a+b+c) % 10)) { isKilled = true; break; }
          } else if (ruleType === '杀和值RawIn') {
            const sum = a+b+c;
            if (pset.has(sum > 9 ? sum%10 : sum)) { isKilled = true; break; }
          } else if (ruleType === '杀跨度In') {
            const span = Math.max(a,b,c) - Math.min(a,b,c);
            if (pset.has(span)) { isKilled = true; break; }
          } else if (ruleType === '杀两码和In') {
            const s1 = (a+b)%10, s2 = (b+c)%10, s3 = (a+c)%10;
            if (pset.has(s1) && pset.has(s2) && pset.has(s3)) { isKilled = true; break; }
          } else if (ruleType === '杀两码差In') {
            const dd1 = Math.abs(a-b), dd2 = Math.abs(b-c), dd3 = Math.abs(a-c);
            if (pset.has(dd1) && pset.has(dd2) && pset.has(dd3)) { isKilled = true; break }
          }
        }

        if (isKilled) {
          killed++;
          if (excelPred.has(s)) fp++;
        }
      }

      totalPred += (1000 - killed);
      totalFP += fp;
      cnt++;
    }

    const avgPred = totalPred / cnt;
    const addFP = totalFP - currentTotalFP;

    if (totalFP <= maxFP && avgPred < bestAvgPred) {
      bestRule = cr;
      bestAvgPred = avgPred;
      bestAddFP = totalFP;
    }
  }

  if (!bestRule) break;
  usedRuleNames.push(bestRule.name);
  currentTotalFP = bestAddFP;
  console.log(`第${round+1}轮: 加入 ${bestRule.name} → 平均${bestAvgPred.toFixed(0)}注, 总FP=${currentTotalFP}`);

  if (bestAvgPred < 660 && currentTotalFP <= 5) break;
}

console.log("\n最终规则集:");
for (const r of usedRuleNames) console.log("  " + r);
console.log("总FP: " + currentTotalFP);
