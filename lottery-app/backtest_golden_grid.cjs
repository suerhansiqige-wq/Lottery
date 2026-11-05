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

function hAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function hSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function vAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function vSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

function generateGoldenGrid(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = hAdd(d1), hs1 = hSub(d1);
  const ha2 = hAdd(d2), hs2 = hSub(d2);
  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const lh1 = new Set(); for (let i = 0; i < d1.length-1; i++) { lh1.add(d1[i]); lh1.add(d1[i+1]); }
  const lh2 = new Set(); for (let i = 0; i < d2.length-1; i++) { lh2.add(d2[i]); lh2.add(d2[i+1]); }

  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    if (a === b && b === c) continue;
    const ha = hAdd([a,b,c]);
    const hs = hSub([a,b,c]);
    if (ha.every(v => poolHA1.has(v))) continue;
    if (hs.every(v => poolHS1.has(v))) continue;
    if (ha.every(v => poolHA2.has(v))) continue;
    if (hs.every(v => poolHS2.has(v))) continue;
    if ([a,b,c].every(v => poolHA1.has(v))) continue;
    if ([a,b,c].every(v => poolHS1.has(v))) continue;
    if ([a,b,c].every(v => lh1.has(v))) continue;
    if ([a,b,c].every(v => lh2.has(v))) continue;
    result.push(s);
  }
  return result;
}

// Backtest all periods
console.log("=== 新黄金三格 全期回测 ===\n");
let hits = 0, misses = 0;
const results = [];

for (let i = 2; i < allData.length; i++) {
  const cur = allData[i];
  const prev1 = allData[i-1];
  const prev2 = allData[i-2];
  const prev3 = allData[i-3];

  const predictions = generateGoldenGrid(prev1, prev2, prev3);
  const actual = "" + cur.d1 + cur.d2 + cur.d3;
  const hit = predictions.includes(actual);

  if (hit) hits++; else misses++;
  results.push({ issue: cur.issue, actual, count: predictions.length, hit });
}

console.log("总期数: " + results.length);
console.log("命中: " + hits + " (" + (hits/results.length*100).toFixed(1) + "%)");
console.log("未中: " + misses + " (" + (misses/results.length*100).toFixed(1) + "%)");

// Show last 20 periods
console.log("\n最近20期详情:");
const last20 = results.slice(-20);
for (const r of last20) {
  console.log("  " + r.issue + ": 开奖=" + r.actual + " 预测=" + r.count + "注 " + (r.hit ? "✓" : "✗"));
}

// Show all misses
console.log("\n所有未中期:");
const allMisses = results.filter(r => !r.hit);
for (const r of allMisses) {
  console.log("  " + r.issue + ": 开奖=" + r.actual + " 预测=" + r.count + "注");
}

// Stats
const counts = results.map(r => r.count);
const avgCount = counts.reduce((a,b) => a+b, 0) / counts.length;
const minCount = Math.min(...counts);
const maxCount = Math.max(...counts);
console.log("\n预测注数统计:");
console.log("  平均: " + avgCount.toFixed(0) + "注");
console.log("  最小: " + minCount + "注");
console.log("  最大: " + maxCount + "注");

// Hit streak
let maxHitStreak = 0, curHitStreak = 0;
let maxMissStreak = 0, curMissStreak = 0;
for (const r of results) {
  if (r.hit) { curHitStreak++; curMissStreak = 0; }
  else { curMissStreak++; curHitStreak = 0; }
  if (curHitStreak > maxHitStreak) maxHitStreak = curHitStreak;
  if (curMissStreak > maxMissStreak) maxMissStreak = curMissStreak;
}
console.log("\n连续命中: 最长" + maxHitStreak + "期");
console.log("连续未中: 最长" + maxMissStreak + "期");
