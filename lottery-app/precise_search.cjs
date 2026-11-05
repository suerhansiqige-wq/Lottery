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

function applyRulesAndFilters(pools, rules, sumMin, sumMax, spanMin) {
  const result = [];
  for (const s of allNums) {
    const sa = +s[0], sb = +s[1], sc = +s[2];
    let killed = false;

    for (const rule of rules) {
      if (rule === '豹子') {
        if (sa === sb && sb === sc) { killed = true; break; }
        continue;
      }
      const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
      if (!match) continue;
      const [, type, poolName] = match;
      const pool = pools[poolName];
      if (!pool) continue;
      
      if (type === 'allIn' && pool.has(sa) && pool.has(sb) && pool.has(sc)) { killed = true; break; }
      else if (type === 'dblHAdd') {
        const ha = hAddFn([sa,sb,sc]);
        if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) { killed = true; break; }
      } else if (type === 'dblHSub') {
        const hs = hSubFn([sa,sb,sc]);
        if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) { killed = true; break; }
      }
    }
    
    if (killed) continue;
    
    const sum = sa + sb + sc;
    const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
    if (sum < sumMin || sum > sumMax) continue;
    if (span < spanMin) continue;
    
    result.push(s);
  }
  return result;
}

// Test many rule+filter combinations targeting ~650 notes
console.log("=== 精确搜索: 目标650注附近 ===\n");

const SAFE_9 = [
  'allIn(ha1)', 'allIn(hs1)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
  'dblHSub(va1)',
  'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)'
];

const ruleSets = [
  { name: '安全9', rules: SAFE_9 },
  { name: '安全9+hs1', rules: [...SAFE_9, 'dblHSub(hs1)'] },
  { name: '安全9+hs2', rules: [...SAFE_9, 'dblHSub(hs2)'] },
  { name: '安全9+hs1+hs2', rules: [...SAFE_9, 'dblHSub(hs1)', 'dblHSub(hs2)'] },
  { name: '安全9+lh1', rules: [...SAFE_9, 'allIn(lh1)'] },
  { name: '安全9+lh2', rules: [...SAFE_9, 'allIn(lh2)'] },
  { name: '安全9+lh1+lh2', rules: [...SAFE_9, 'allIn(lh1)', 'allIn(lh2)'] },
  { name: '安全9+bc2', rules: [...SAFE_9, 'allIn(bc2)'] },
  { name: '安全9+hs3', rules: [...SAFE_9, 'allIn(hs3)'] },
  { name: '安全9+vs1', rules: [...SAFE_9, 'dblHSub(vs1)'] },
  { name: '安全9+hs1+lh1', rules: [...SAFE_9, 'dblHSub(hs1)', 'allIn(lh1)'] },
  { name: '安全9+hs1+bc2', rules: [...SAFE_9, 'dblHSub(hs1)', 'allIn(bc2)'] },
  { name: '安全9+hs2+lh2', rules: [...SAFE_9, 'dblHSub(hs2)', 'allIn(lh2)'] },
  { name: '安全9+hs1+hs2+lh1', rules: [...SAFE_9, 'dblHSub(hs1)', 'dblHSub(hs2)', 'allIn(lh1)'] },
  { name: '安全9+hs1+hs2+bc2', rules: [...SAFE_9, 'dblHSub(hs1)', 'dblHSub(hs2)', 'allIn(bc2)'] },
];

const filterSets = [
  { name: '和值5-22', sumMin: 5, sumMax: 22, spanMin: 0 },
  { name: '和值6-21', sumMin: 6, sumMax: 21, spanMin: 0 },
  { name: '和值6-20', sumMin: 6, sumMax: 20, spanMin: 0 },
  { name: '和值7-20', sumMin: 7, sumMax: 20, spanMin: 0 },
  { name: '和值7-19', sumMin: 7, sumMax: 19, spanMin: 0 },
  { name: '和值6-20+跨>=1', sumMin: 6, sumMax: 20, spanMin: 1 },
  { name: '和值6-20+跨>=2', sumMin: 6, sumMax: 20, spanMin: 2 },
  { name: '和值6-21+跨>=1', sumMin: 6, sumMax: 21, spanMin: 1 },
  { name: '和值5-21+跨>=1', sumMin: 5, sumMax: 21, spanMin: 1 },
  { name: '和值5-20+跨>=1', sumMin: 5, sumMax: 20, spanMin: 1 },
];

const allResults = [];

for (const rs of ruleSets) {
  for (const fs of filterSets) {
    let totalPred = 0, totalHit = 0, cnt = 0;
    
    for (let i = 3; i < allData.length; i++) {
      const cur = allData[i];
      const prev1 = allData[i-1];
      const prev2 = allData[i-2];
      const prev3 = allData[i-3];
      
      const pools = computePools(prev1, prev2, prev3);
      const predictions = applyRulesAndFilters(pools, rs.rules, fs.sumMin, fs.sumMax, fs.spanMin);
      const actual = `${cur.d1}${cur.d2}${cur.d3}`;
      
      totalPred += predictions.length;
      if (predictions.includes(actual)) totalHit++;
      cnt++;
    }
    
    const avgPred = totalPred / cnt;
    const hitRate = (totalHit / cnt * 100).toFixed(1);
    
    // Only show results close to 650
    if (avgPred >= 600 && avgPred <= 720) {
      allResults.push({
        name: `${rs.name}+${fs.name}`,
        avgPred,
        hitRate: parseFloat(hitRate),
        rules: rs.rules,
        filter: fs
      });
    }
  }
}

// Sort by hit rate descending, then by closeness to 650
allResults.sort((a, b) => {
  if (Math.abs(a.hitRate - b.hitRate) > 0.5) return b.hitRate - a.hitRate;
  return Math.abs(a.avgPred - 650) - Math.abs(b.avgPred - 650);
});

console.log("命中率排序 (600-720注范围):\n");
for (let i = 0; i < Math.min(30, allResults.length); i++) {
  const r = allResults[i];
  const marker = r.avgPred >= 630 && r.avgPred <= 670 ? ' <<<' : '';
  console.log(`  ${r.name}: ${r.avgPred.toFixed(0)}注, ${r.hitRate}%${marker}`);
}

// Show top 5 in detail
console.log("\n=== TOP 5 方案详情 ===\n");
const top5 = allResults.slice(0, 5);

for (let t = 0; t < top5.length; t++) {
  const test = top5[t];
  console.log(`\n--- #${t+1}: ${test.name} ---`);
  
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
    const predictions = applyRulesAndFilters(pools, test.rules, test.filter.sumMin, test.filter.sumMax, test.filter.spanMin);
    const actual = `${cur.d1}${cur.d2}${cur.d3}`;
    const hit = predictions.includes(actual);
    
    totalPred += predictions.length;
    if (hit) {
      totalHit++;
      curHitStreak++;
      curMissStreak = 0;
      if (curHitStreak > maxHitStreak) maxHitStreak = curHitStreak;
    } else {
      curMissStreak++;
      curHitStreak = 0;
      if (curMissStreak > maxMissStreak) maxMissStreak = curMissStreak;
      misses.push({ issue: cur.issue, actual, count: predictions.length });
    }
    cnt++;
  }
  
  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  
  console.log(`  总期数: ${cnt}, 命中: ${totalHit} (${hitRate}%)`);
  console.log(`  平均注数: ${avgPred.toFixed(0)}, 最少: ${Math.min(...misses.map(m=>m.count).concat([avgPred]))}, 最多: ${Math.max(...misses.map(m=>m.count).concat([avgPred]))}`);
  console.log(`  最长连续命中: ${maxHitStreak}, 最长连续未中: ${maxMissStreak}`);
  console.log(`  未中期数: ${misses.length}`);
  if (misses.length <= 15) {
    console.log(`  未中详情: ${misses.map(m => `${m.issue}(${m.actual},${m.count}注)`).join(', ')}`);
  }
}

// Compare with current app's 18 rules
console.log("\n=== 对比当前应用(18规则) ===\n");
const CURRENT_18 = [
  'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
  '豹子',
  'allIn(bc2)', 'dblHSub(vs1)', 'dblHAdd(ha3)', 'dblHSub(va1)',
  'allIn(hs3)', 'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)', 'dblHAdd(va1)'
];

let totalPred = 0, totalHit = 0, cnt = 0;
let maxHitStreak = 0, curHitStreak = 0;
let maxMissStreak = 0, curMissStreak = 0;

for (let i = 3; i < allData.length; i++) {
  const cur = allData[i];
  const prev1 = allData[i-1];
  const prev2 = allData[i-2];
  const prev3 = allData[i-3];
  
  const pools = computePools(prev1, prev2, prev3);
  const predictions = applyRulesAndFilters(pools, CURRENT_18, 0, 27, 0);
  const actual = `${cur.d1}${cur.d2}${cur.d3}`;
  const hit = predictions.includes(actual);
  
  totalPred += predictions.length;
  if (hit) {
    totalHit++;
    curHitStreak++;
    curMissStreak = 0;
    if (curHitStreak > maxHitStreak) maxHitStreak = curHitStreak;
  } else {
    curMissStreak++;
    curHitStreak = 0;
    if (curMissStreak > maxMissStreak) maxMissStreak = curMissStreak;
  }
  cnt++;
}

console.log(`当前18规则: ${(totalPred/cnt).toFixed(0)}注, ${(totalHit/cnt*100).toFixed(1)}%命中率`);
console.log(`  最长连续命中: ${maxHitStreak}, 最长连续未中: ${maxMissStreak}`);
