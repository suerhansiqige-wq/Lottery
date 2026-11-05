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

const periods = Object.keys(resultMap).sort();
const allNums = [];
for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);

function getHAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function getHSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }

let hitCount = 0, missCount = 0, skipCount = 0;
const misses = [];
const hitDetails = [];

for (let i = 3; i < periods.length; i++) {
  const pp = periods[i];
  const actual = resultMap[pp];
  const actualNum = "" + actual.d1 + actual.d2 + actual.d3;
  const isBaozi = actual.d1 === actual.d2 && actual.d2 === actual.d3;

  // Get previous 3 periods' results
  const r1 = resultMap[periods[i-1]];
  const r2 = resultMap[periods[i-2]];
  const r3 = resultMap[periods[i-3]];
  const d1 = [r1.d1, r1.d2, r1.d3];
  const d2 = [r2.d1, r2.d2, r2.d3];
  const d3 = [r3.d1, r3.d2, r3.d3];

  const hAdd1 = getHAdd(d1), hAdd2 = getHAdd(d2), hAdd3 = getHAdd(d3);
  const hSub1 = getHSub(d1), hSub2 = getHSub(d2), hSub3 = getHSub(d3);

  // Build kill set using all systematic rules
  const kill = new Set();

  function addAllIn(pool) {
    const s = new Set(pool);
    for (const n of allNums) {
      if ([+n[0],+n[1],+n[2]].every(v => s.has(v))) kill.add(n);
    }
  }
  function addDblHAdd(pool) {
    const s = new Set(pool);
    for (const n of allNums) {
      if (getHAdd([+n[0],+n[1],+n[2]]).every(v => s.has(v))) kill.add(n);
    }
  }
  function addDblHSub(pool) {
    const s = new Set(pool);
    for (const n of allNums) {
      if (getHSub([+n[0],+n[1],+n[2]]).every(v => s.has(v))) kill.add(n);
    }
  }

  // Single period rules (N-1, N-2, N-3)
  const pds = [{ha:hAdd1,hs:hSub1,dr:d1},{ha:hAdd2,hs:hSub2,dr:d2},{ha:hAdd3,hs:hSub3,dr:d3}];
  for (const p of pds) {
    addDblHAdd(p.ha);
    addDblHSub(p.hs);
    addAllIn([...new Set([...p.ha,...p.hs])]);
    addDblHAdd([...new Set([...p.ha,...p.hs])]);
    addDblHSub([...new Set([...p.ha,...p.hs])]);
    addAllIn(p.dr);
  }

  // Cross-period hAdd unions
  addDblHAdd([...new Set([...hAdd1,...hAdd2])]);
  addDblHAdd([...new Set([...hAdd1,...hAdd3])]);
  addDblHAdd([...new Set([...hAdd2,...hAdd3])]);
  addDblHAdd([...new Set([...hAdd1,...hAdd2,...hAdd3])]);
  addAllIn([...new Set([...hAdd1,...hAdd2])]);
  addAllIn([...new Set([...hAdd1,...hAdd3])]);
  addAllIn([...new Set([...hAdd2,...hAdd3])]);
  addAllIn([...new Set([...hAdd1,...hAdd2,...hAdd3])]);

  // Cross-period hSub unions
  addDblHSub([...new Set([...hSub1,...hSub2])]);
  addDblHSub([...new Set([...hSub1,...hSub3])]);
  addDblHSub([...new Set([...hSub2,...hSub3])]);
  addDblHSub([...new Set([...hSub1,...hSub2,...hSub3])]);
  addAllIn([...new Set([...hSub1,...hSub2])]);
  addAllIn([...new Set([...hSub1,...hSub3])]);
  addAllIn([...new Set([...hSub2,...hSub3])]);
  addAllIn([...new Set([...hSub1,...hSub2,...hSub3])]);

  // Cross hAdd-hSub
  for (const p of pds) {
    addDblHAdd(p.hs);
    addDblHSub(p.ha);
  }

  // Result unions
  addAllIn([...new Set([...d1,...d2])]);
  addAllIn([...new Set([...d1,...d3])]);
  addAllIn([...new Set([...d2,...d3])]);
  addAllIn([...new Set([...d1,...d2,...d3])]);

  // Sum kill: kill sums that ONLY appear in excluded numbers
  // For backtest: we compute which sums the actual result would have
  // and check if those sums are "rare" based on the kill set
  // Since we can't know excluded/included without the prediction,
  // we use a proxy: kill sums that are extreme (0-3, 24-27)
  // These are almost always excluded
  for (const n of allNums) {
    const s = (+n[0])+(+n[1])+(+n[2]);
    if (s <= 3 || s >= 24) kill.add(n);
  }

  // Span kill: kill span=0 (baozi already covered by rules above)
  for (const n of allNums) {
    const sp = Math.max(+n[0],+n[1],+n[2]) - Math.min(+n[0],+n[1],+n[2]);
    if (sp === 0) kill.add(n);
  }

  const predSize = allNums.length - kill.size;
  const hit = !kill.has(actualNum);

  if (hit) {
    hitCount++;
  } else {
    missCount++;
    misses.push({period: pp, actual: actualNum, isBaozi, predSize});
  }

  hitDetails.push({period: pp, actual: actualNum, predSize, hit, isBaozi});
}

const total = hitCount + missCount;
console.log("=== 全量回测结果 ===");
console.log("回测期数: " + total + " (从第4期开始,前3期无足够历史数据)");
console.log("命中: " + hitCount + " 期 (" + (hitCount/total*100).toFixed(1) + "%)");
console.log("未中: " + missCount + " 期 (" + (missCount/total*100).toFixed(1) + "%)");
console.log("");

// Exclude baozi
const nonBaoziMiss = misses.filter(m => !m.isBaozi);
const baoziMiss = misses.filter(m => m.isBaozi);
console.log("未中期分类:");
console.log("  豹子未中: " + baoziMiss.length + " 期 (系统性排除,预期内)");
console.log("  非豹子未中: " + nonBaoziMiss.length + " 期");

// Count baozi in total
let totalBaozi = 0;
for (const h of hitDetails) {
  if (h.isBaozi) totalBaozi++;
}
console.log("  豹子总数: " + totalBaozi + "/" + total);
console.log("排除豹子后命中率: " + hitCount + "/" + (total-totalBaozi) + " = " + (hitCount/(total-totalBaozi)*100).toFixed(1) + "%");
console.log("");

// Streaks
let maxHitStreak = 0, maxMissStreak = 0;
let curHit = 0, curMiss = 0;
for (const h of hitDetails) {
  if (h.hit) {
    curHit++;
    if (curMiss > maxMissStreak) maxMissStreak = curMiss;
    curMiss = 0;
  } else {
    curMiss++;
    if (curHit > maxHitStreak) maxHitStreak = curHit;
    curHit = 0;
  }
}
if (curHit > maxHitStreak) maxHitStreak = curHit;
if (curMiss > maxMissStreak) maxMissStreak = curMiss;

console.log("最长连续命中: " + maxHitStreak + " 期");
console.log("最长连续未中: " + maxMissStreak + " 期");
console.log("");

// Show miss details
console.log("=== 未中期详情 ===");
for (const m of misses) {
  console.log(m.period + ": 开奖=" + m.actual + (m.isBaozi ? "(豹子)" : "") + " 预测=" + m.predSize + "注");
}

// Show first 10 and last 10 periods
console.log("");
console.log("=== 前10期详情 ===");
for (const h of hitDetails.slice(0, 10)) {
  console.log(h.period + ": 开奖=" + h.actual + (h.isBaozi ? "(豹子)" : "") + " 预测=" + h.predSize + "注 " + (h.hit ? "命中" : "未中"));
}
console.log("");
console.log("=== 后10期详情 ===");
for (const h of hitDetails.slice(-10)) {
  console.log(h.period + ": 开奖=" + h.actual + (h.isBaozi ? "(豹子)" : "") + " 预测=" + h.predSize + "注 " + (h.hit ? "命中" : "未中"));
}

// Accuracy by segments
console.log("");
console.log("=== 分段命中率 ===");
const segSize = 50;
for (let s = 0; s < hitDetails.length; s += segSize) {
  const seg = hitDetails.slice(s, s + segSize);
  const segHit = seg.filter(h => h.hit).length;
  const segBaozi = seg.filter(h => h.isBaozi).length;
  const segNonBaozi = seg.length - segBaozi;
  const segHitNonBaozi = seg.filter(h => h.hit && !h.isBaozi).length;
  console.log(seg[0].period + "~" + seg[seg.length-1].period + ": " +
    segHit + "/" + seg.length + " (" + (segHit/seg.length*100).toFixed(1) + "%)" +
    " | 排除豹子: " + segHitNonBaozi + "/" + segNonBaozi + " (" + (segHitNonBaozi/segNonBaozi*100).toFixed(1) + "%)");
}
