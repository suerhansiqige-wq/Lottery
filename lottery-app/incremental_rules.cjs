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

// Safe 9 rules
const SAFE_9 = [
  'allIn(ha1)', 'allIn(hs1)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
  'dblHSub(va1)',
  'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)'
];

// Additional rules from the original 18
const EXTRA_RULES = [
  'allIn(lh1)', 'allIn(lh2)', 
  'dblHSub(hs1)', 'dblHSub(hs2)', 
  '豹子',
  'allIn(bc2)', 'dblHSub(vs1)', 'allIn(hs3)'
];

console.log("=== 逐步添加规则测试 (114期全量) ===\n");

// Test safe 9 + each extra rule individually
for (const extra of EXTRA_RULES) {
  const rules = [...SAFE_9, extra];
  let totalPred = 0, totalHit = 0, cnt = 0;
  
  for (let i = 3; i < allData.length; i++) {
    const cur = allData[i];
    const prev1 = allData[i-1];
    const prev2 = allData[i-2];
    const prev3 = allData[i-3];
    
    const pools = computePools(prev1, prev2, prev3);
    const baseKilled = applyRules(pools, rules);
    const actual = `${cur.d1}${cur.d2}${cur.d3}`;
    
    const count = 1000 - baseKilled.size;
    const hit = !baseKilled.has(actual);
    
    totalPred += count;
    if (hit) totalHit++;
    cnt++;
  }
  
  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  console.log(`安全9+${extra}: ${avgPred.toFixed(0)}注, ${hitRate}%命中率`);
}

// Test safe 9 + combinations of extra rules
console.log("\n=== 组合添加规则 ===\n");

const combos = [
  ['豹子'],
  ['allIn(lh1)', 'allIn(lh2)'],
  ['dblHSub(hs1)', 'dblHSub(hs2)'],
  ['豹子', 'allIn(lh1)', 'allIn(lh2)'],
  ['豹子', 'dblHSub(hs1)', 'dblHSub(hs2)'],
  ['豹子', 'allIn(lh1)', 'allIn(lh2)', 'dblHSub(hs1)', 'dblHSub(hs2)'],
  ['allIn(bc2)'],
  ['allIn(hs3)'],
  ['dblHSub(vs1)'],
  ['豹子', 'allIn(bc2)'],
  ['豹子', 'allIn(hs3)'],
  ['豹子', 'dblHSub(vs1)'],
];

for (const combo of combos) {
  const rules = [...SAFE_9, ...combo];
  let totalPred = 0, totalHit = 0, cnt = 0;
  
  for (let i = 3; i < allData.length; i++) {
    const cur = allData[i];
    const prev1 = allData[i-1];
    const prev2 = allData[i-2];
    const prev3 = allData[i-3];
    
    const pools = computePools(prev1, prev2, prev3);
    const baseKilled = applyRules(pools, rules);
    const actual = `${cur.d1}${cur.d2}${cur.d3}`;
    
    const count = 1000 - baseKilled.size;
    const hit = !baseKilled.has(actual);
    
    totalPred += count;
    if (hit) totalHit++;
    cnt++;
  }
  
  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  console.log(`安全9+${combo.join('+')}: ${avgPred.toFixed(0)}注, ${hitRate}%命中率`);
}

// Now test with sum filter
console.log("\n=== 最佳规则组合 + 和值过滤 ===\n");

const bestCombos = [
  { name: '安全9', rules: SAFE_9 },
  { name: '安全9+豹子', rules: [...SAFE_9, '豹子'] },
  { name: '安全9+lh1+lh2', rules: [...SAFE_9, 'allIn(lh1)', 'allIn(lh2)'] },
  { name: '安全9+豹子+lh1+lh2', rules: [...SAFE_9, '豹子', 'allIn(lh1)', 'allIn(lh2)'] },
];

const sumFilters = [
  { name: '无', min: 0, max: 27 },
  { name: '5-22', min: 5, max: 22 },
  { name: '6-21', min: 6, max: 21 },
  { name: '6-20', min: 6, max: 20 },
  { name: '7-20', min: 7, max: 20 },
];

for (const combo of bestCombos) {
  console.log(`\n${combo.name}:`);
  for (const filter of sumFilters) {
    let totalPred = 0, totalHit = 0, cnt = 0;
    
    for (let i = 3; i < allData.length; i++) {
      const cur = allData[i];
      const prev1 = allData[i-1];
      const prev2 = allData[i-2];
      const prev3 = allData[i-3];
      
      const pools = computePools(prev1, prev2, prev3);
      const baseKilled = applyRules(pools, combo.rules);
      const actual = `${cur.d1}${cur.d2}${cur.d3}`;
      
      let count = 0, hit = false;
      for (const s of allNums) {
        if (baseKilled.has(s)) continue;
        const sa = +s[0], sb = +s[1], sc = +s[2];
        const sum = sa + sb + sc;
        if (sum < filter.min || sum > filter.max) continue;
        count++;
        if (s === actual) hit = true;
      }
      
      totalPred += count;
      if (hit) totalHit++;
      cnt++;
    }
    
    const avgPred = totalPred / cnt;
    const hitRate = (totalHit / cnt * 100).toFixed(1);
    console.log(`  和值${filter.name}: ${avgPred.toFixed(0)}注, ${hitRate}%命中率`);
  }
}

// Final recommendation
console.log("\n=== 最终推荐方案 ===\n");

const finalTests = [
  { name: '方案A: 安全9+和值5-22', rules: SAFE_9, sumMin: 5, sumMax: 22 },
  { name: '方案B: 安全9+豹子+和值5-22', rules: [...SAFE_9, '豹子'], sumMin: 5, sumMax: 22 },
  { name: '方案C: 安全9+和值6-21', rules: SAFE_9, sumMin: 6, sumMax: 21 },
  { name: '方案D: 安全9+豹子+和值6-21', rules: [...SAFE_9, '豹子'], sumMin: 6, sumMax: 21 },
  { name: '方案E: 安全9+和值6-20', rules: SAFE_9, sumMin: 6, sumMax: 20 },
  { name: '方案F: 当前18规则', rules: [...SAFE_9, 'allIn(lh1)', 'allIn(lh2)', 'dblHSub(hs1)', 'dblHSub(hs2)', '豹子', 'allIn(bc2)', 'dblHSub(vs1)', 'allIn(hs3)'], sumMin: 0, sumMax: 27 },
];

for (const test of finalTests) {
  let totalPred = 0, totalHit = 0, cnt = 0;
  let maxHitStreak = 0, curHitStreak = 0;
  let maxMissStreak = 0, curMissStreak = 0;
  
  for (let i = 3; i < allData.length; i++) {
    const cur = allData[i];
    const prev1 = allData[i-1];
    const prev2 = allData[i-2];
    const prev3 = allData[i-3];
    
    const pools = computePools(prev1, prev2, prev3);
    const baseKilled = applyRules(pools, test.rules);
    const actual = `${cur.d1}${cur.d2}${cur.d3}`;
    
    let count = 0, hit = false;
    for (const s of allNums) {
      if (baseKilled.has(s)) continue;
      const sa = +s[0], sb = +s[1], sc = +s[2];
      const sum = sa + sb + sc;
      if (sum < test.sumMin || sum > test.sumMax) continue;
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
    }
    cnt++;
  }
  
  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  console.log(`${test.name}`);
  console.log(`  平均: ${avgPred.toFixed(0)}注, 命中率: ${hitRate}%`);
  console.log(`  最长连续命中: ${maxHitStreak}, 最长连续未中: ${maxMissStreak}\n`);
}
