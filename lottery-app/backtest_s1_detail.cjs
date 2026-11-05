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

// Also get manual predictions
const manualPreds = {};
for (let i = 1; i < data2.length; i++) {
  const row = data2[i];
  if (row[0] && row[4]) {
    const period = String(row[0]);
    const predStr = String(row[4]).trim();
    const nums = predStr.split(/\s+/).filter(s => /^\d{3}$/.test(s));
    if (nums.length > 0) manualPreds[period] = new Set(nums);
  }
}

const periods = Object.keys(resultMap).sort();
const allNums = [];
for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);

function getHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function getHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }

// Strategy: dblHAdd(N-1) - the highest accuracy single rule
// For each period, kill numbers whose hAdd values all fall in hAdd(N-1)
console.log("=== S1策略回测: dblHAdd(N-1) ===");
console.log("规则: 号码的横加值全部落在上期横加池中 → 杀");
console.log("");

let s1Hit = 0, s1Miss = 0;
let s1MaxHit = 0, s1MaxMiss = 0, s1CurHit = 0, s1CurMiss = 0;
const s1Details = [];

for (let i = 3; i < periods.length; i++) {
  const pp = periods[i];
  const actual = resultMap[pp];
  const actualNum = "" + actual.d1 + actual.d2 + actual.d3;
  const isBaozi = actual.d1 === actual.d2 && actual.d2 === actual.d3;

  const r1 = resultMap[periods[i-1]];
  const d1 = [r1.d1, r1.d2, r1.d3];
  const hAdd1 = getHAdd(d1);
  const hAdd1Set = new Set(hAdd1);

  // Kill: numbers whose hAdd values all in hAdd1
  const kill = new Set();
  for (const n of allNums) {
    const dd = [+n[0],+n[1],+n[2]];
    if (getHAdd(dd).every(v => hAdd1Set.has(v))) kill.add(n);
  }

  const predSize = 1000 - kill.size;
  const hit = !kill.has(actualNum);

  if (hit) { s1Hit++; s1CurHit++; if (s1CurMiss > s1MaxMiss) s1MaxMiss = s1CurMiss; s1CurMiss = 0; }
  else { s1Miss++; s1CurMiss++; if (s1CurHit > s1MaxHit) s1MaxHit = s1CurHit; s1CurHit = 0; }

  s1Details.push({period: pp, actual: actualNum, predSize, hit, isBaozi});
}
if (s1CurHit > s1MaxHit) s1MaxHit = s1CurHit;
if (s1CurMiss > s1MaxMiss) s1MaxMiss = s1CurMiss;

const s1Total = s1Hit + s1Miss;
console.log("回测期数: " + s1Total);
console.log("命中: " + s1Hit + " (" + (s1Hit/s1Total*100).toFixed(1) + "%)");
console.log("未中: " + s1Miss + " (" + (s1Miss/s1Total*100).toFixed(1) + "%)");
console.log("最长连续命中: " + s1MaxHit);
console.log("最长连续未中: " + s1MaxMiss);
console.log("");

// Compare with manual predictions
console.log("=== 原始手动预测对比 ===");
let manualHit = 0, manualMiss = 0;
const manualPeriods = Object.keys(manualPreds).sort();
for (const pp of manualPeriods) {
  const actual = resultMap[pp];
  if (!actual) continue;
  const actualNum = "" + actual.d1 + actual.d2 + actual.d3;
  const isBaozi = actual.d1 === actual.d2 && actual.d2 === actual.d3;
  const hit = manualPreds[pp].has(actualNum);
  if (hit) manualHit++;
  else {
    manualMiss++;
    console.log("  未中: " + pp + " 开奖=" + actualNum + (isBaozi?"(豹子)":"") + " 预测=" + manualPreds[pp].size + "注");
  }
}
const manualTotal = manualHit + manualMiss;
console.log("原始预测: " + manualHit + "/" + manualTotal + " = " + (manualHit/manualTotal*100).toFixed(1) + "%");
console.log("");

// Show S1 misses
console.log("=== S1策略未中期详情 ===");
for (const d of s1Details) {
  if (!d.hit) {
    console.log(d.period + ": 开奖=" + d.actual + (d.isBaozi?"(豹子)":"") + " 预测=" + d.predSize + "注");
  }
}
console.log("");

// Show S1 streaks
console.log("=== S1连续命中>=5期 ===");
let curHit = 0, hitStart = null;
for (let j = 0; j < s1Details.length; j++) {
  const d = s1Details[j];
  if (d.hit) {
    if (curHit === 0) hitStart = d.period;
    curHit++;
  } else {
    if (curHit >= 5) console.log("  " + hitStart + "~" + s1Details[j-1].period + ": 连续" + curHit + "期命中");
    curHit = 0;
  }
}
if (curHit >= 5) console.log("  " + hitStart + "~" + s1Details[s1Details.length-1].period + ": 连续" + curHit + "期命中(至末期)");

console.log("");
console.log("=== S1连续未中记录 ===");
let curMiss = 0, missStart = null;
for (let j = 0; j < s1Details.length; j++) {
  const d = s1Details[j];
  if (!d.hit) {
    if (curMiss === 0) missStart = d.period;
    curMiss++;
  } else {
    if (curMiss > 0) console.log("  " + missStart + "~" + s1Details[j-1].period + ": 连续" + curMiss + "期未中");
    curMiss = 0;
  }
}
if (curMiss > 0) console.log("  " + missStart + "~" + s1Details[s1Details.length-1].period + ": 连续" + curMiss + "期未中(至末期)");

// Segmented accuracy
console.log("");
console.log("=== S1分段命中率 ===");
const segSize = 20;
for (let s = 0; s < s1Details.length; s += segSize) {
  const seg = s1Details.slice(s, s + segSize);
  const segHit = seg.filter(d => d.hit).length;
  console.log(seg[0].period + "~" + seg[seg.length-1].period + ": " + segHit + "/" + seg.length + " (" + (segHit/seg.length*100).toFixed(1) + "%)");
}
