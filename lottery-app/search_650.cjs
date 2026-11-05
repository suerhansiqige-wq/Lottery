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

// Correct safe 9 rules
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

// Test many filter combinations
console.log("=== 全面过滤器搜索 (目标: ~650注, 高命中率) ===\n");

const sumRanges = [
  [3, 24], [4, 23], [5, 22], [6, 21], [7, 20], [8, 19], [9, 18],
  [4, 22], [5, 21], [6, 20], [7, 19], [8, 18],
  [5, 20], [6, 19], [7, 18], [8, 17],
];

const spanMins = [0, 1, 2, 3];

// Also test odd/even and big/small patterns
const results = [];

for (const period of periods) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const actual = `${period.d1}${period.d2}${period.d3}`;
  
  const baseKilled = applyRules(pools, SAFE_RULES);
  const baseCount = 1000 - baseKilled.size;
  const baseHit = !baseKilled.has(actual);
  
  // Store for each filter combo
  for (const [sumMin, sumMax] of sumRanges) {
    for (const spanMin of spanMins) {
      const key = `和值${sumMin}-${sumMax}+跨度>=${spanMin}`;
      
      let count = 0, hit = false;
      for (const s of allNums) {
        if (baseKilled.has(s)) continue;
        const sa = +s[0], sb = +s[1], sc = +s[2];
        const sum = sa + sb + sc;
        const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
        if (sum < sumMin || sum > sumMax) continue;
        if (span < spanMin) continue;
        count++;
        if (s === actual) hit = true;
      }
      
      if (!results.find(r => r.key === key)) {
        results.push({ key, sumMin, sumMax, spanMin, totalPred: 0, totalHit: 0, cnt: 0, counts: [] });
      }
      const r = results.find(r => r.key === key);
      r.totalPred += count;
      r.totalHit += hit ? 1 : 0;
      r.cnt++;
      r.counts.push(count);
    }
  }
}

// Print results sorted by average count
console.log("所有组合结果 (按注数排序):\n");
for (const r of results) {
  const avgPred = r.totalPred / r.cnt;
  const hitRate = (r.totalHit / r.cnt * 100).toFixed(1);
  r.avgPred = avgPred;
  r.hitRate = parseFloat(hitRate);
}

results.sort((a, b) => a.avgPred - b.avgPred);

// Show results around 650
const near650 = results.filter(r => r.avgPred >= 550 && r.avgPred <= 750);
for (const r of near650) {
  const marker = r.avgPred >= 620 && r.avgPred <= 680 ? ' <<<' : '';
  console.log(`  ${r.key}: 平均${r.avgPred.toFixed(0)}注, 命中率${r.hitRate.toFixed(1)}%${marker}`);
}

// Find best: closest to 650 with hit rate >= 90%
console.log("\n=== 最优方案 ===");
const good = results.filter(r => r.hitRate >= 85 && r.avgPred >= 550 && r.avgPred <= 750);
good.sort((a, b) => Math.abs(a.avgPred - 650) - Math.abs(b.avgPred - 650));

if (good.length > 0) {
  console.log("\n命中率>=85% 且注数550-750的方案 (按接近650排序):");
  for (let i = 0; i < Math.min(10, good.length); i++) {
    const r = good[i];
    console.log(`  ${r.key}: 平均${r.avgPred.toFixed(0)}注, 命中率${r.hitRate.toFixed(1)}%`);
  }
  
  // Detailed breakdown of best
  const best = good[0];
  console.log(`\n=== 最佳方案详情: ${best.key} ===`);
  console.log(`平均: ${best.avgPred.toFixed(0)}注, 命中率: ${best.hitRate.toFixed(1)}%`);
  console.log(`最少: ${Math.min(...best.counts)}注, 最多: ${Math.max(...best.counts)}注`);
  
  // Show each period
  let idx2 = 0;
  for (const period of periods) {
    const idx = allData.indexOf(period);
    if (idx < 3) continue;

    const prev1 = allData[idx-1];
    const prev2 = allData[idx-2];
    const prev3 = allData[idx-3];
    const pools = computePools(prev1, prev2, prev3);
    const actual = `${period.d1}${period.d2}${period.d3}`;
    
    const baseKilled = applyRules(pools, SAFE_RULES);
    
    let count = 0, hit = false;
    for (const s of allNums) {
      if (baseKilled.has(s)) continue;
      const sa = +s[0], sb = +s[1], sc = +s[2];
      const sum = sa + sb + sc;
      const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
      if (sum < best.sumMin || sum > best.sumMax) continue;
      if (span < best.spanMin) continue;
      count++;
      if (s === actual) hit = true;
    }
    
    console.log(`  ${period.issue}: ${count}注 ${hit?'✓':'✗'} 开奖=${actual}`);
    idx2++;
  }
}

// Also test: safe rules + additional kill rules
console.log("\n=== 额外杀号规则测试 ===");

const extraRules = [
  { name: '杀全偶', fn: (sa,sb,sc) => [sa,sb,sc].every(d => d%2===0) },
  { name: '杀全奇', fn: (sa,sb,sc) => [sa,sb,sc].every(d => d%2===1) },
  { name: '杀全大', fn: (sa,sb,sc) => [sa,sb,sc].every(d => d>=5) },
  { name: '杀全小', fn: (sa,sb,sc) => [sa,sb,sc].every(d => d<5) },
  { name: '杀和值<3', fn: (sa,sb,sc) => (sa+sb+sc) < 3 },
  { name: '杀和值>24', fn: (sa,sb,sc) => (sa+sb+sc) > 24 },
  { name: '杀和值<4', fn: (sa,sb,sc) => (sa+sb+sc) < 4 },
  { name: '杀和值>23', fn: (sa,sb,sc) => (sa+sb+sc) > 23 },
  { name: '杀跨度0', fn: (sa,sb,sc) => Math.max(sa,sb,sc)-Math.min(sa,sb,sc) === 0 },
  { name: '杀跨度0+1', fn: (sa,sb,sc) => Math.max(sa,sb,sc)-Math.min(sa,sb,sc) <= 1 },
];

for (const extra of extraRules) {
  let totalPred = 0, totalHit = 0, cnt = 0;
  
  for (const period of periods) {
    const idx = allData.indexOf(period);
    if (idx < 3) continue;

    const prev1 = allData[idx-1];
    const prev2 = allData[idx-2];
    const prev3 = allData[idx-3];
    const pools = computePools(prev1, prev2, prev3);
    const actual = `${period.d1}${period.d2}${period.d3}`;
    
    const baseKilled = applyRules(pools, SAFE_RULES);
    
    let count = 0, hit = false;
    for (const s of allNums) {
      if (baseKilled.has(s)) continue;
      const sa = +s[0], sb = +s[1], sc = +s[2];
      if (extra.fn(sa, sb, sc)) continue;
      count++;
      if (s === actual) hit = true;
    }
    
    totalPred += count;
    if (hit) totalHit++;
    cnt++;
  }
  
  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  console.log(`  ${extra.name}: 平均${avgPred.toFixed(0)}注, 命中率${hitRate}%`);
}

// Test combinations of extra rules
console.log("\n=== 组合额外杀号规则 ===");
const comboTests = [
  ['杀和值<4', '杀和值>23'],
  ['杀和值<4', '杀和值>23', '杀跨度0'],
  ['杀和值<4', '杀和值>23', '杀跨度0+1'],
  ['杀全偶', '杀和值<4', '杀和值>23'],
  ['杀全奇', '杀和值<4', '杀和值>23'],
  ['杀全大', '杀和值<4', '杀和值>23'],
  ['杀全小', '杀和值<4', '杀和值>23'],
];

for (const combo of comboTests) {
  let totalPred = 0, totalHit = 0, cnt = 0;
  
  for (const period of periods) {
    const idx = allData.indexOf(period);
    if (idx < 3) continue;

    const prev1 = allData[idx-1];
    const prev2 = allData[idx-2];
    const prev3 = allData[idx-3];
    const pools = computePools(prev1, prev2, prev3);
    const actual = `${period.d1}${period.d2}${period.d3}`;
    
    const baseKilled = applyRules(pools, SAFE_RULES);
    
    let count = 0, hit = false;
    for (const s of allNums) {
      if (baseKilled.has(s)) continue;
      const sa = +s[0], sb = +s[1], sc = +s[2];
      
      let skip = false;
      for (const ruleName of combo) {
        const rule = extraRules.find(r => r.name === ruleName);
        if (rule && rule.fn(sa, sb, sc)) { skip = true; break; }
      }
      if (skip) continue;
      
      count++;
      if (s === actual) hit = true;
    }
    
    totalPred += count;
    if (hit) totalHit++;
    cnt++;
  }
  
  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  console.log(`  ${combo.join('+')}: 平均${avgPred.toFixed(0)}注, 命中率${hitRate}%`);
}
