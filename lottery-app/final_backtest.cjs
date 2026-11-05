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

// Optimized rule set from greedy optimization
const OPTIMIZED_RULES = [
  'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
  '豹子',
  'allIn(bc2)', 'dblHSub(vs1)', 'dblHAdd(ha3)', 'dblHSub(va1)',
  'allIn(hs3)', 'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)', 'dblHAdd(va1)'
];

function computePools(prev1, prev2, prev3) {
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = hAddFn(d1), hs1 = hSubFn(d1);
  const ha2 = hAddFn(d2), hs2 = hSubFn(d2);
  const ha3 = hAddFn(d3), hs3 = hSubFn(d3);
  const va1 = vAddFn(d1, d2), vs1 = vSubFn(d1, d2);
  const va2 = vAddFn(d2, d3), vs2 = vSubFn(d2, d3);

  const sh1 = new Set([0,1,2,3,4,5,6,7,8,9].filter(d => !d1.includes(d)));
  const sh2 = new Set([0,1,2,3,4,5,6,7,8,9].filter(d => !d2.includes(d)));
  const sh3 = new Set([0,1,2,3,4,5,6,7,8,9].filter(d => !d3.includes(d)));

  const lh1 = new Set([d1[0],d1[1],d1[2]]);
  const lh2 = new Set([d2[0],d2[1],d2[2]]);
  const lh3 = new Set([d3[0],d3[1],d3[2]]);

  const bc1 = new Set(), bc2 = new Set();
  for (let d = 0; d <= 9; d++) {
    let cnt1 = [ha1, hs1, va1, vs1].filter(arr => arr.includes(d)).length;
    if (cnt1 >= 2) bc1.add(d);
    let cnt2 = [ha2, hs2, va2, vs2].filter(arr => arr.includes(d)).length;
    if (cnt2 >= 2) bc2.add(d);
  }

  return { ha1: new Set(ha1), hs1: new Set(hs1), ha2: new Set(ha2), hs2: new Set(hs2),
    ha3: new Set(ha3), hs3: new Set(hs3), va1: new Set(va1), vs1: new Set(vs1),
    va2: new Set(va2), vs2: new Set(vs2), sh1, sh2, sh3, lh1, lh2, lh3, bc1, bc2 };
}

function generatePredictions(pools) {
  const killed = new Set();
  for (const s of allNums) {
    const a = +s[0], b = +s[1], c = +s[2];

    for (const rule of OPTIMIZED_RULES) {
      if (rule === '豹子') {
        if (a === b && b === c) { killed.add(s); break; }
        continue;
      }

      const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
      if (!match) continue;
      const [, type, poolName] = match;
      const pool = pools[poolName];
      if (!pool) continue;

      if (type === 'allIn') {
        if (pool.has(a) && pool.has(b) && pool.has(c)) { killed.add(s); break; }
      } else if (type === 'dblHAdd') {
        const ha = hAddFn([a,b,c]);
        if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) { killed.add(s); break; }
      } else if (type === 'dblHSub') {
        const hs = hSubFn([a,b,c]);
        if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) { killed.add(s); break; }
      }
    }
  }
  return allNums.filter(s => !killed.has(s));
}

// Full backtest
console.log("=== 优化后全量回测 ===\n");
let totalPred = 0, totalHit = 0, cnt = 0;
const results = [];

for (let i = 3; i < allData.length; i++) {
  const cur = allData[i];
  const prev1 = allData[i-1];
  const prev2 = allData[i-2];
  const prev3 = allData[i-3];
  const pools = computePools(prev1, prev2, prev3);
  const predictions = generatePredictions(pools);
  const actual = `${cur.d1}${cur.d2}${cur.d3}`;
  const hit = predictions.includes(actual);

  totalPred += predictions.length;
  if (hit) totalHit++;
  cnt++;
  results.push({ issue: cur.issue, actual, count: predictions.length, hit });
}

console.log(`总期数: ${cnt}`);
console.log(`命中: ${totalHit} (${(totalHit/cnt*100).toFixed(1)}%)`);
console.log(`未中: ${cnt-totalHit} (${((cnt-totalHit)/cnt*100).toFixed(1)}%)`);

const counts = results.map(r => r.count);
const avgCount = counts.reduce((a,b) => a+b, 0) / counts.length;
console.log(`\n预测注数统计:`);
console.log(`  平均: ${avgCount.toFixed(0)}注`);
console.log(`  最小: ${Math.min(...counts)}注`);
console.log(`  最大: ${Math.max(...counts)}注`);

// Hit streak
let maxHitStreak = 0, curHitStreak = 0;
let maxMissStreak = 0, curMissStreak = 0;
for (const r of results) {
  if (r.hit) { curHitStreak++; curMissStreak = 0; }
  else { curMissStreak++; curHitStreak = 0; }
  if (curHitStreak > maxHitStreak) maxHitStreak = curHitStreak;
  if (curMissStreak > maxMissStreak) maxMissStreak = curMissStreak;
}
console.log(`\n连续命中: 最长${maxHitStreak}期`);
console.log(`连续未中: 最长${maxMissStreak}期`);

// Show last 20 periods
console.log(`\n最近20期详情:`);
const last20 = results.slice(-20);
for (const r of last20) {
  console.log(`  ${r.issue}: 开奖=${r.actual} 预测=${r.count}注 ${r.hit ? '✓' : '✗'}`);
}

// Show all misses
console.log(`\n所有未中期:`);
const allMisses = results.filter(r => !r.hit);
for (const r of allMisses) {
  console.log(`  ${r.issue}: 开奖=${r.actual} 预测=${r.count}注`);
}

// Compare with Excel predictions for the 15 periods
console.log(`\n=== 与Excel预测对比（15期）===`);
const excelPeriods = allData.filter(d => excelPredMap.has(d.issue));
for (const period of excelPeriods) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;
  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const predictions = generatePredictions(pools);
  const excelPred = excelPredMap.get(period.issue);
  const actual = `${period.d1}${period.d2}${period.d3}`;

  // Count overlap
  let overlap = 0;
  for (const p of predictions) {
    if (excelPred.has(p)) overlap++;
  }
  console.log(`  ${period.issue}: 我方${predictions.length}注, Excel${excelPred.size}注, 重叠${overlap}注, 开奖=${actual}`);
}
