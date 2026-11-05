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

function hAddFn(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function hSubFn(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function vAddFn(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function vSubFn(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

const allNums = [];
for (let n = 0; n < 1000; n++) allNums.push(String(n).padStart(3, '0'));

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

// Safe 9 rules
const SAFE_RULES = [
  'allIn(ha1)', 'allIn(hs1)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
  'dblHSub(va1)',
  'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)'
];

function applyRules(pools, rules) {
  const killed = new Set();
  for (const s of allNums) {
    const sa = +s[0], sb = +s[1], sc = +s[2];

    for (const rule of rules) {
      if (rule === '豹子') {
        if (sa === sb && sb === sc) { killed.add(s); break; }
        continue;
      }
      const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
      if (!match) continue;
      const [, type, poolName] = match;
      const pool = pools[poolName];
      if (!pool) continue;
      
      if (type === 'allIn' && pool.has(sa) && pool.has(sb) && pool.has(sc)) { killed.add(s); break; }
      else if (type === 'dblHAdd') {
        const ha = hAddFn([sa,sb,sc]);
        if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) { killed.add(s); break; }
      } else if (type === 'dblHSub') {
        const hs = hSubFn([sa,sb,sc]);
        if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) { killed.add(s); break; }
      }
    }
  }
  return killed;
}

// Test on all 114 periods
console.log("=== 全量114期回测 ===\n");

const testConfigs = [
  { name: '安全9规则(无过滤)', sumMin: 0, sumMax: 27, spanMin: 0 },
  { name: '和值6-19+跨度>=0', sumMin: 6, sumMax: 19, spanMin: 0 },
  { name: '和值6-20+跨度>=0', sumMin: 6, sumMax: 20, spanMin: 0 },
  { name: '和值6-20+跨度>=3', sumMin: 6, sumMax: 20, spanMin: 3 },
  { name: '和值5-20+跨度>=0', sumMin: 5, sumMax: 20, spanMin: 0 },
  { name: '和值5-21+跨度>=0', sumMin: 5, sumMax: 21, spanMin: 0 },
  { name: '和值5-22+跨度>=0', sumMin: 5, sumMax: 22, spanMin: 0 },
  { name: '和值6-21+跨度>=0', sumMin: 6, sumMax: 21, spanMin: 0 },
];

for (const config of testConfigs) {
  let totalPred = 0, totalHit = 0, cnt = 0;
  let maxHitStreak = 0, curHitStreak = 0;
  let maxMissStreak = 0, curMissStreak = 0;
  const misses = [];
  
  for (let i = 3; i < allData.length; i++) {
    const cur = allData[i];
    const prev1 = allData[i-1];
    const prev2 = allData[i-2];
    const prev3 = allData[i-3];
    
    const pools = computePools(prev1, prev2, prev3);
    const baseKilled = applyRules(pools, SAFE_RULES);
    const actual = `${cur.d1}${cur.d2}${cur.d3}`;
    
    let count = 0, hit = false;
    for (const s of allNums) {
      if (baseKilled.has(s)) continue;
      const sa = +s[0], sb = +s[1], sc = +s[2];
      const sum = sa + sb + sc;
      const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
      if (sum < config.sumMin || sum > config.sumMax) continue;
      if (span < config.spanMin) continue;
      count++;
      if (s === actual) hit = true;
    }
    
    totalPred += count;
    if (hit) {
      totalHit++;
      curHitStreak++;
      curMissStreak = 0;
      if (curHitStreak > maxHitStreak) maxHitStreak = curHitStreak;
    } else {
      curMissStreak++;
      curHitStreak = 0;
      if (curMissStreak > maxMissStreak) maxMissStreak = curMissStreak;
      misses.push({ issue: cur.issue, actual, count });
    }
    cnt++;
  }
  
  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  
  console.log(`${config.name}:`);
  console.log(`  总期数: ${cnt}, 命中: ${totalHit} (${hitRate}%)`);
  console.log(`  平均注数: ${avgPred.toFixed(0)}`);
  console.log(`  最长连续命中: ${maxHitStreak}, 最长连续未中: ${maxMissStreak}`);
  console.log(`  未中期数: ${misses.length}`);
  if (misses.length > 0 && misses.length <= 10) {
    console.log(`  未中详情: ${misses.map(m => `${m.issue}(${m.actual})`).join(', ')}`);
  }
  console.log('');
}

// Detailed analysis of best candidate
console.log("=== 最优方案详细分析 ===\n");
const bestConfig = { name: '和值6-19+跨度>=0', sumMin: 6, sumMax: 19, spanMin: 0 };

let totalPred = 0, totalHit = 0, cnt = 0;
const periodDetails = [];

for (let i = 3; i < allData.length; i++) {
  const cur = allData[i];
  const prev1 = allData[i-1];
  const prev2 = allData[i-2];
  const prev3 = allData[i-3];
  
  const pools = computePools(prev1, prev2, prev3);
  const baseKilled = applyRules(pools, SAFE_RULES);
  const actual = `${cur.d1}${cur.d2}${cur.d3}`;
  
  let count = 0, hit = false;
  for (const s of allNums) {
    if (baseKilled.has(s)) continue;
    const sa = +s[0], sb = +s[1], sc = +s[2];
    const sum = sa + sb + sc;
    const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
    if (sum < bestConfig.sumMin || sum > bestConfig.sumMax) continue;
    if (span < bestConfig.spanMin) continue;
    count++;
    if (s === actual) hit = true;
  }
  
  totalPred += count;
  if (hit) totalHit++;
  cnt++;
  periodDetails.push({ issue: cur.issue, actual, count, hit });
}

console.log(`方案: ${bestConfig.name}`);
console.log(`总期数: ${cnt}`);
console.log(`命中: ${totalHit} (${(totalHit/cnt*100).toFixed(1)}%)`);
console.log(`平均注数: ${(totalPred/cnt).toFixed(0)}`);

// Show last 20 periods
console.log(`\n最近20期详情:`);
const last20 = periodDetails.slice(-20);
for (const p of last20) {
  console.log(`  ${p.issue}: ${p.count}注 ${p.hit?'✓':'✗'} 开奖=${p.actual}`);
}

// Show all misses
const allMisses = periodDetails.filter(p => !p.hit);
console.log(`\n所有未中期 (${allMisses.length}期):`);
for (const p of allMisses) {
  const digits = [+p.actual[0], +p.actual[1], +p.actual[2]];
  const sum = digits[0] + digits[1] + digits[2];
  const span = Math.max(...digits) - Math.min(...digits);
  console.log(`  ${p.issue}: ${p.count}注 开奖=${p.actual} (和值=${sum}, 跨度=${span})`);
}

// Compare with Excel predictions for the periods where we have Excel data
console.log("\n=== 与Excel预测对比 ===");
const predictions2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
const excelPredMap = new Map();
for (let r = 1; r < predictions2.length; r++) {
  const row = predictions2[r];
  if (!row || row.length < 5) continue;
  const period = String(row[0]).trim();
  const predStr = row[4];
  if (predStr == null) continue;
  const preds = String(predStr).split(/[,\s\n]+/).filter(s => /^\d{3}$/.test(s.trim()));
  if (preds.length > 0) excelPredMap.set(period, { count: preds.length, numbers: new Set(preds) });
}

let excelHits = 0, ourHits = 0, bothHit = 0, total = 0;
for (const p of periodDetails) {
  const excel = excelPredMap.get(p.issue);
  if (!excel) continue;
  total++;
  
  const excelHit = excel.numbers.has(p.actual);
  if (excelHit) excelHits++;
  if (p.hit) ourHits++;
  if (excelHit && p.hit) bothHit++;
}

console.log(`对比期数: ${total}`);
console.log(`Excel命中: ${excelHits} (${(excelHits/total*100).toFixed(1)}%)`);
console.log(`本算法命中: ${ourHits} (${(ourHits/total*100).toFixed(1)}%)`);
console.log(`两者都中: ${bothHit} (${(bothHit/total*100).toFixed(1)}%)`);

// Show intersection analysis
console.log("\n=== 交集分析 ===");
let intersectionHits = 0, intersectionTotal = 0;
for (const p of periodDetails) {
  const excel = excelPredMap.get(p.issue);
  if (!excel) continue;
  
  // Get our numbers
  const cur = allData.find(d => d.issue === p.issue);
  const idx = allData.indexOf(cur);
  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const baseKilled = applyRules(pools, SAFE_RULES);
  
  const ourNumbers = new Set();
  for (const s of allNums) {
    if (baseKilled.has(s)) continue;
    const sa = +s[0], sb = +s[1], sc = +s[2];
    const sum = sa + sb + sc;
    const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
    if (sum < bestConfig.sumMin || sum > bestConfig.sumMax) continue;
    if (span < bestConfig.spanMin) continue;
    ourNumbers.add(s);
  }
  
  // Intersection
  const intersection = new Set([...ourNumbers].filter(n => excel.numbers.has(n)));
  const intersectionHit = intersection.has(p.actual);
  
  if (intersection.size > 0) {
    intersectionTotal++;
    if (intersectionHit) intersectionHits++;
  }
}

console.log(`有交集期数: ${intersectionTotal}`);
console.log(`交集命中: ${intersectionHits} (${(intersectionHits/intersectionTotal*100).toFixed(1)}%)`);
console.log(`交集平均注数: 需要进一步计算`);
