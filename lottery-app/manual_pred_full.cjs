const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/boloor/Desktop/新黄金三格.xlsm', {type:'binary'});

const ws1 = wb.Sheets['福'];
const ws2 = wb.Sheets['福 (2)'];
const data1 = XLSX.utils.sheet_to_json(ws1, {header:1});
const data2 = XLSX.utils.sheet_to_json(ws2, {header:1});

// Build result map from both sheets
const allRows = [...data1.slice(1), ...data2.slice(1)];
const resultMap = {};
for (const row of allRows) {
  if (row[0] && row[1]!=null && row[2]!=null && row[3]!=null) {
    const period = String(row[0]);
    const d1 = Number(row[1]), d2 = Number(row[2]), d3 = Number(row[3]);
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(d3)) resultMap[period] = {d1, d2, d3};
  }
}

// Get manual predictions from sheet 2
const manualPreds = {};
for (let i = 1; i < data2.length; i++) {
  const row = data2[i];
  if (row[0] && row[4]) {
    const period = String(row[0]);
    const predStr = String(row[4]).trim();
    const nums = predStr.split(/\s+/).filter(s => /^\d{3}$/.test(s));
    if (nums.length > 0) manualPreds[period] = nums;
  }
}

const periods = Object.keys(resultMap).sort();
const predPeriods = Object.keys(manualPreds).sort();

console.log("=== 全部开奖期数据 ===");
console.log("总开奖期数: " + periods.length);
console.log("期号范围: " + periods[0] + " ~ " + periods[periods.length-1]);
console.log("有手动预测的期数: " + predPeriods.length);
console.log("预测期号: " + predPeriods[0] + " ~ " + predPeriods[predPeriods.length-1]);
console.log("");

// Verify manual predictions against actual results
let hit = 0, miss = 0;
const missList = [];
const hitList = [];

for (const pp of predPeriods) {
  const actual = resultMap[pp];
  if (!actual) continue;
  const actualNum = "" + actual.d1 + actual.d2 + actual.d3;
  const predSet = new Set(manualPreds[pp]);
  const isHit = predSet.has(actualNum);
  const isBaozi = actual.d1 === actual.d2 && actual.d2 === actual.d3;

  if (isHit) {
    hit++;
    hitList.push({period: pp, actual: actualNum, predSize: manualPreds[pp].length});
  } else {
    miss++;
    missList.push({period: pp, actual: actualNum, predSize: manualPreds[pp].length, isBaozi});
  }
}

const total = hit + miss;
console.log("=== 手动预测正确率 ===");
console.log("可验证期数: " + total);
console.log("命中: " + hit + " 期 (" + (hit/total*100).toFixed(1) + "%)");
console.log("未中: " + miss + " 期 (" + (miss/total*100).toFixed(1) + "%)");
console.log("");

// Show all periods detail
console.log("=== 逐期详情 ===");
for (const pp of predPeriods) {
  const actual = resultMap[pp];
  if (!actual) continue;
  const actualNum = "" + actual.d1 + actual.d2 + actual.d3;
  const predSet = new Set(manualPreds[pp]);
  const isHit = predSet.has(actualNum);
  const isBaozi = actual.d1 === actual.d2 && actual.d2 === actual.d3;
  const predSize = manualPreds[pp].length;

  console.log(pp + ": 开奖=" + actualNum +
    (isBaozi ? "(豹子)" : "") +
    " 预测=" + predSize + "注" +
    " " + (isHit ? "✓命中" : "✗未中"));
}

console.log("");
console.log("=== 未中期汇总 ===");
for (const m of missList) {
  console.log(m.period + ": 开奖=" + m.actual + (m.isBaozi ? "(豹子)" : "") + " 预测=" + m.predSize + "注");
}

// Streaks
let maxHit = 0, maxMiss = 0, curHit = 0, curMiss = 0;
for (const pp of predPeriods) {
  const actual = resultMap[pp];
  if (!actual) continue;
  const actualNum = "" + actual.d1 + actual.d2 + actual.d3;
  const isHit = new Set(manualPreds[pp]).has(actualNum);
  if (isHit) { curHit++; if (curMiss > maxMiss) maxMiss = curMiss; curMiss = 0; }
  else { curMiss++; if (curHit > maxHit) maxHit = curHit; curHit = 0; }
}
if (curHit > maxHit) maxHit = curHit;
if (curMiss > maxMiss) maxMiss = curMiss;

console.log("");
console.log("最长连续命中: " + maxHit + " 期");
console.log("最长连续未中: " + maxMiss + " 期");

// Also show all available result periods
console.log("");
console.log("=== 全部开奖期列表 ===");
for (let i = 0; i < periods.length; i++) {
  const r = resultMap[periods[i]];
  const num = "" + r.d1 + r.d2 + r.d3;
  const isBaozi = r.d1 === r.d2 && r.d2 === r.d3;
  const hasPred = manualPreds[periods[i]] ? " [有预测]" : "";
  console.log((i+1) + ". " + periods[i] + ": " + num + (isBaozi ? "(豹子)" : "") + hasPred);
}
