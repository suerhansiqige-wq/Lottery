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

// Score-based approach: each number gets a score based on how many kill criteria it matches
// Higher score = more likely to be killed
function scoreNumber(a, b, c, pools) {
  let score = 0;
  const digits = [a, b, c];
  const ha = hAddFn([a,b,c]);
  const hs = hSubFn([a,b,c]);

  // allIn rules (score 2 each)
  const allInPools = ['sh1', 'sh2', 'sh3', 'bc1', 'bc2', 'ha1', 'ha2', 'ha3', 'hs1', 'hs2', 'hs3', 'lh1', 'lh2', 'lh3', 'va1', 'vs1', 'va2', 'vs2'];
  for (const pn of allInPools) {
    const pool = pools[pn];
    if (digits.every(d => pool.has(d))) score += 2;
  }

  // dblHAdd/dblHSub rules (score 2 each)
  for (const pn of allInPools) {
    const pool = pools[pn];
    if (ha.every(v => pool.has(v))) score += 2;
    if (hs.every(v => pool.has(v))) score += 2;
  }

  // Partial matches (score 1 for 2/3 digits in pool)
  for (const pn of ['sh1', 'sh2', 'bc1', 'bc2']) {
    const pool = pools[pn];
    const matchCount = digits.filter(d => pool.has(d)).length;
    if (matchCount === 2) score += 1;
  }

  return score;
}

// Test different score thresholds
console.log("=== 评分法测试 ===\n");

for (const threshold of [3, 4, 5, 6, 7, 8]) {
  let totalPred = 0, totalHit = 0, totalExcelMatch = 0, cnt = 0;

  for (const period of periods) {
    const idx = allData.indexOf(period);
    if (idx < 3) continue;

    const prev1 = allData[idx-1];
    const prev2 = allData[idx-2];
    const prev3 = allData[idx-3];
    const pools = computePools(prev1, prev2, prev3);
    const excelPred = excelPredMap.get(period.issue);
    const actual = `${period.d1}${period.d2}${period.d3}`;

    // Score all numbers
    const scored = [];
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (a === b && b === c) continue; // 豹子
      const score = scoreNumber(a, b, c, pools);
      scored.push({ num: s, score });
    }

    // Kill numbers with score >= threshold
    const predictions = scored.filter(x => x.score < threshold).map(x => x.num);
    const predCount = predictions.length;

    const hit = predictions.includes(actual);
    let excelMatch = 0;
    for (const p of predictions) {
      if (excelPred.has(p)) excelMatch++;
    }

    totalPred += predCount;
    if (hit) totalHit++;
    totalExcelMatch += excelMatch;
    cnt++;
  }

  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  const avgExcelMatch = totalExcelMatch / cnt;
  console.log(`阈值${threshold}: 平均${avgPred.toFixed(0)}注, 命中率${hitRate}%, 平均匹配Excel${avgExcelMatch.toFixed(0)}注`);
}

// Try weighted scoring with different weights
console.log("\n=== 加权评分法测试 ===\n");

const weightSets = [
  { name: 'allIn_sh_only', allInWeight: { sh1: 3, sh2: 3, sh3: 2, bc1: 2, bc2: 2, ha1: 1, hs1: 1, ha2: 1, hs2: 1, ha3: 1, hs3: 1, lh1: 1, lh2: 1, lh3: 1, va1: 1, vs1: 1, va2: 1, vs2: 1 }, dblWeight: 2, threshold: 4 },
  { name: 'balanced', allInWeight: Object.fromEntries(['sh1','sh2','sh3','bc1','bc2','ha1','hs1','ha2','hs2','ha3','hs3','lh1','lh2','lh3','va1','vs1','va2','vs2'].map(k => [k, 2])), dblWeight: 2, threshold: 5 },
  { name: 'conservative', allInWeight: Object.fromEntries(['sh1','sh2','sh3','bc1','bc2','ha1','hs1','ha2','hs2','ha3','hs3','lh1','lh2','lh3','va1','vs1','va2','vs2'].map(k => [k, 1])), dblWeight: 1, threshold: 4 },
];

for (const ws of weightSets) {
  let totalPred = 0, totalHit = 0, cnt = 0;

  for (const period of periods) {
    const idx = allData.indexOf(period);
    if (idx < 3) continue;

    const prev1 = allData[idx-1];
    const prev2 = allData[idx-2];
    const prev3 = allData[idx-3];
    const pools = computePools(prev1, prev2, prev3);
    const actual = `${period.d1}${period.d2}${period.d3}`;

    const scored = [];
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (a === b && b === c) continue;

      let score = 0;
      const digits = [a, b, c];
      const ha = hAddFn([a,b,c]);
      const hs = hSubFn([a,b,c]);

      // allIn rules with weights
      for (const [pn, weight] of Object.entries(ws.allInWeight)) {
        const pool = pools[pn];
        if (digits.every(d => pool.has(d))) score += weight;
      }

      // dblHAdd/dblHSub rules
      for (const pn of Object.keys(ws.allInWeight)) {
        const pool = pools[pn];
        if (ha.every(v => pool.has(v))) score += ws.dblWeight;
        if (hs.every(v => pool.has(v))) score += ws.dblWeight;
      }

      scored.push({ num: s, score });
    }

    const predictions = scored.filter(x => x.score < ws.threshold).map(x => x.num);
    const hit = predictions.includes(actual);

    totalPred += predictions.length;
    if (hit) totalHit++;
    cnt++;
  }

  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  console.log(`${ws.name} (阈值${ws.threshold}): 平均${avgPred.toFixed(0)}注, 命中率${hitRate}%`);
}
