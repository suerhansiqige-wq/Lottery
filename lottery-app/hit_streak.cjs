const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/boloor/Desktop/新黄金三格.xlsm', {type:'binary'});

const ws1 = wb.Sheets['福'];
const ws2 = wb.Sheets['福 (2)'];
const data1 = XLSX.utils.sheet_to_json(ws1, {header:1});
const data2 = XLSX.utils.sheet_to_json(ws2, {header:1});

const allRows = [...data1.slice(1), ...data2.slice(1)];
const resultMap = {};
for (const row of allRows) {
  if (row[0] && row[1]!=null && row[2]!=null && row[3]!=null) {
    const period = String(row[0]);
    const d1 = Number(row[1]), d2 = Number(row[2]), d3 = Number(row[3]);
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(d3)) resultMap[period] = {d1, d2, d3};
  }
}

const preds = {};
for (let i = 1; i < data2.length; i++) {
  const row = data2[i];
  if (row[0] && row[4]) {
    const period = String(row[0]);
    const predStr = String(row[4]).trim();
    const nums = predStr.split(/\s+/).filter(s => /^\d{3}$/.test(s));
    if (nums.length > 0) preds[period] = new Set(nums);
  }
}

const predPeriods = Object.keys(preds).sort();

// Check hit/miss for each prediction period
const results = [];
for (const pp of predPeriods) {
  const predSet = preds[pp];
  const actual = resultMap[pp];
  if (!actual) continue;
  const actualNum = "" + actual.d1 + actual.d2 + actual.d3;
  const hit = predSet.has(actualNum);
  results.push({period: pp, actual: actualNum, predSize: predSet.size, hit});
}

// Calculate streaks
let maxMissStreak = 0, maxHitStreak = 0;
let curMissStreak = 0, curHitStreak = 0;
let missStreaks = [], hitStreaks = [];

for (const r of results) {
  if (r.hit) {
    curHitStreak++;
    if (curMissStreak > 0) missStreaks.push(curMissStreak);
    curMissStreak = 0;
  } else {
    curMissStreak++;
    if (curHitStreak > 0) hitStreaks.push(curHitStreak);
    curHitStreak = 0;
  }
}
if (curMissStreak > 0) missStreaks.push(curMissStreak);
if (curHitStreak > 0) hitStreaks.push(curHitStreak);

maxMissStreak = Math.max(...missStreaks, 0);
maxHitStreak = Math.max(...hitStreaks, 0);

const totalHit = results.filter(r => r.hit).length;
const totalMiss = results.filter(r => !r.hit).length;

console.log("=== 命中统计 ===");
console.log("总期数: " + results.length);
console.log("命中: " + totalHit + " 期 (" + (totalHit/results.length*100).toFixed(1) + "%)");
console.log("未中: " + totalMiss + " 期 (" + (totalMiss/results.length*100).toFixed(1) + "%)");
console.log("");
console.log("最长连续未中: " + maxMissStreak + " 期");
console.log("最长连续命中: " + maxHitStreak + " 期");
console.log("");

// Show all miss streaks
console.log("=== 未中连续记录 ===");
let periodIdx = 0;
curMissStreak = 0;
let missStart = null;
for (const r of results) {
  if (!r.hit) {
    if (curMissStreak === 0) missStart = r.period;
    curMissStreak++;
  } else {
    if (curMissStreak > 0) {
      console.log("  " + missStart + "~" + results[periodIdx-1].period + ": 连续" + curMissStreak + "期未中");
    }
    curMissStreak = 0;
  }
  periodIdx++;
}
if (curMissStreak > 0) {
  console.log("  " + missStart + "~" + results[results.length-1].period + ": 连续" + curMissStreak + "期未中(至末期)");
}

console.log("");
console.log("=== 命中连续记录 ===");
periodIdx = 0;
curHitStreak = 0;
let hitStart = null;
for (const r of results) {
  if (r.hit) {
    if (curHitStreak === 0) hitStart = r.period;
    curHitStreak++;
  } else {
    if (curHitStreak > 0) {
      console.log("  " + hitStart + "~" + results[periodIdx-1].period + ": 连续" + curHitStreak + "期命中");
    }
    curHitStreak = 0;
  }
  periodIdx++;
}
if (curHitStreak > 0) {
  console.log("  " + hitStart + "~" + results[results.length-1].period + ": 连续" + curHitStreak + "期命中(至末期)");
}

// Show detail per period
console.log("");
console.log("=== 逐期详情 ===");
for (const r of results) {
  console.log(r.period + ": 开奖=" + r.actual + " 预测=" + r.predSize + "注 " + (r.hit ? "命中✓" : "未中✗"));
}
