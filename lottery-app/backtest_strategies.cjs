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

// Test multiple rule strategies
const strategies = {
  "S1: dblHAdd(N-1) only": function(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3) {
    const kill = new Set();
    const s = new Set(hAdd1);
    for (const n of allNums) {
      if (getHAdd([+n[0],+n[1],+n[2]]).every(v => s.has(v))) kill.add(n);
    }
    return kill;
  },
  "S2: dblHAdd+dblHSub(N-1)": function(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3) {
    const kill = new Set();
    const s1 = new Set(hAdd1), s2 = new Set(hSub1);
    for (const n of allNums) {
      const dd = [+n[0],+n[1],+n[2]];
      if (getHAdd(dd).every(v => s1.has(v)) || getHSub(dd).every(v => s2.has(v))) kill.add(n);
    }
    return kill;
  },
  "S3: dblHAdd 3periods": function(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3) {
    const kill = new Set();
    for (const pool of [hAdd1, hAdd2, hAdd3]) {
      const s = new Set(pool);
      for (const n of allNums) {
        if (getHAdd([+n[0],+n[1],+n[2]]).every(v => s.has(v))) kill.add(n);
      }
    }
    return kill;
  },
  "S4: dblHAdd+dblHSub 3periods": function(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3) {
    const kill = new Set();
    for (const pool of [...[hAdd1,hAdd2,hAdd3].map(h=>h), ...[hSub1,hSub2,hSub3].map(h=>h)]) {
      const s = new Set(pool);
      for (const n of allNums) {
        const dd = [+n[0],+n[1],+n[2]];
        if (getHAdd(dd).every(v => s.has(v)) || getHSub(dd).every(v => s.has(v))) kill.add(n);
      }
    }
    return kill;
  },
  "S5: allIn(result) 3periods": function(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3) {
    const kill = new Set();
    for (const pool of [d1, d2, d3]) {
      const s = new Set(pool);
      for (const n of allNums) {
        if ([+n[0],+n[1],+n[2]].every(v => s.has(v))) kill.add(n);
      }
    }
    return kill;
  },
  "S6: S4+allIn(result) 3periods": function(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3) {
    const kill = new Set();
    for (const pool of [...[hAdd1,hAdd2,hAdd3], ...[hSub1,hSub2,hSub3], [d1,d2,d3].flat()]) {
      const s = new Set(pool);
      for (const n of allNums) {
        const dd = [+n[0],+n[1],+n[2]];
        if (getHAdd(dd).every(v => s.has(v)) || getHSub(dd).every(v => s.has(v)) ||
            (pool.length <= 3 && dd.every(v => s.has(v)))) kill.add(n);
      }
    }
    // Also allIn for each result
    for (const dr of [d1,d2,d3]) {
      const s = new Set(dr);
      for (const n of allNums) {
        if ([+n[0],+n[1],+n[2]].every(v => s.has(v))) kill.add(n);
      }
    }
    return kill;
  },
  "S7: dblHAdd(N-1)+allIn(hAdd∪hSub N-1)": function(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3) {
    const kill = new Set();
    const s1 = new Set(hAdd1);
    const s2 = new Set([...hAdd1, ...hSub1]);
    for (const n of allNums) {
      const dd = [+n[0],+n[1],+n[2]];
      if (getHAdd(dd).every(v => s1.has(v)) || dd.every(v => s2.has(v))) kill.add(n);
    }
    return kill;
  },
  "S8: dblHAdd(hAdd∪hSub) 3periods": function(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3) {
    const kill = new Set();
    for (const [ha,hs] of [[hAdd1,hSub1],[hAdd2,hSub2],[hAdd3,hSub3]]) {
      const s = new Set([...ha, ...hs]);
      for (const n of allNums) {
        if (getHAdd([+n[0],+n[1],+n[2]]).every(v => s.has(v))) kill.add(n);
      }
    }
    return kill;
  }
};

// Run each strategy
for (const [name, ruleFn] of Object.entries(strategies)) {
  let hit = 0, miss = 0, baoziMiss = 0;
  let totalPred = 0;
  let maxHitStreak = 0, maxMissStreak = 0, curHit = 0, curMiss = 0;
  let hitDetails = [];

  for (let i = 3; i < periods.length; i++) {
    const pp = periods[i];
    const actual = resultMap[pp];
    const actualNum = "" + actual.d1 + actual.d2 + actual.d3;
    const isBaozi = actual.d1 === actual.d2 && actual.d2 === actual.d3;

    const r1 = resultMap[periods[i-1]];
    const r2 = resultMap[periods[i-2]];
    const r3 = resultMap[periods[i-3]];
    const d1 = [r1.d1, r1.d2, r1.d3];
    const d2 = [r2.d1, r2.d2, r2.d3];
    const d3 = [r3.d1, r3.d2, r3.d3];
    const hAdd1 = getHAdd(d1), hAdd2 = getHAdd(d2), hAdd3 = getHAdd(d3);
    const hSub1 = getHSub(d1), hSub2 = getHSub(d2), hSub3 = getHSub(d3);

    const kill = ruleFn(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3);
    const predSize = 1000 - kill.size;
    totalPred += predSize;
    const isHit = !kill.has(actualNum);

    if (isHit) {
      hit++;
      curHit++;
      if (curMiss > maxMissStreak) maxMissStreak = curMiss;
      curMiss = 0;
    } else {
      miss++;
      if (isBaozi) baoziMiss++;
      curMiss++;
      if (curHit > maxHitStreak) maxHitStreak = curHit;
      curHit = 0;
    }
    hitDetails.push({period: pp, hit: isHit});
  }
  if (curHit > maxHitStreak) maxHitStreak = curHit;
  if (curMiss > maxMissStreak) maxMissStreak = curMiss;

  const total = hit + miss;
  const nonBaoziTotal = total - 10; // approx baozi count
  console.log(name);
  console.log("  命中: " + hit + "/" + total + " (" + (hit/total*100).toFixed(1) + "%)");
  console.log("  平均预测: " + (totalPred/total).toFixed(0) + "注");
  console.log("  最长连续命中: " + maxHitStreak + ", 最长连续未中: " + maxMissStreak);
  console.log("  豹子未中: " + baoziMiss);
  console.log("");
}

// Now try the BEST strategy with detailed output
// Use S4 (dblHAdd+dblHSub 3periods) as it seems balanced
console.log("=== 最佳策略详细回测 ===");
const bestStrategy = strategies["S4: dblHAdd+dblHSub 3periods"];
let hitCount = 0, missCount = 0;
const details = [];

for (let i = 3; i < periods.length; i++) {
  const pp = periods[i];
  const actual = resultMap[pp];
  const actualNum = "" + actual.d1 + actual.d2 + actual.d3;
  const isBaozi = actual.d1 === actual.d2 && actual.d2 === actual.d3;

  const r1 = resultMap[periods[i-1]];
  const r2 = resultMap[periods[i-2]];
  const r3 = resultMap[periods[i-3]];
  const d1 = [r1.d1, r1.d2, r1.d3];
  const d2 = [r2.d1, r2.d2, r2.d3];
  const d3 = [r3.d1, r3.d2, r3.d3];
  const hAdd1 = getHAdd(d1), hAdd2 = getHAdd(d2), hAdd3 = getHAdd(d3);
  const hSub1 = getHSub(d1), hSub2 = getHSub(d2), hSub3 = getHSub(d3);

  const kill = bestStrategy(d1,d2,d3,hAdd1,hSub1,hAdd2,hSub2,hAdd3,hSub3);
  const predSize = 1000 - kill.size;
  const isHit = !kill.has(actualNum);

  if (isHit) hitCount++;
  else missCount++;

  details.push({period: pp, actual: actualNum, predSize, hit: isHit, isBaozi});
}

const total = hitCount + missCount;
console.log("总期数: " + total);
console.log("命中: " + hitCount + " (" + (hitCount/total*100).toFixed(1) + "%)");
console.log("未中: " + missCount + " (" + (missCount/total*100).toFixed(1) + "%)");
