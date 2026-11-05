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

// Analyze the 4 misses in detail
console.log("=== 4个未命中期深度分析 ===\n");

const missPeriods = ['26267', '26269', '26275', '26278'];
const hitPeriods = periods.filter(p => !missPeriods.includes(p.issue)).map(p => p.issue);

console.log("未命中期: " + missPeriods.join(', '));
console.log("命中期: " + hitPeriods.join(', ') + "\n");

for (const missIssue of missPeriods) {
  const period = allData.find(d => d.issue === missIssue);
  const idx = allData.indexOf(period);
  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const actual = `${period.d1}${period.d2}${period.d3}`;
  const a = period.d1, b = period.d2, c = period.d3;

  console.log(`\n${missIssue}: 开奖=${actual}`);
  console.log(`  前三期: ${prev3.d1}${prev3.d2}${prev3.d3}, ${prev2.d1}${prev2.d2}${prev2.d3}, ${prev1.d1}${prev1.d2}${prev1.d3}`);
  console.log(`  和值=${a+b+c}, 跨度=${Math.max(a,b,c)-Math.min(a,b,c)}`);

  // Check which rules kill this number
  const killingRules = [];
  const rules = [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
    '豹子',
    'allIn(bc2)', 'dblHSub(vs1)', 'dblHAdd(ha3)', 'dblHSub(va1)',
    'allIn(hs3)', 'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)', 'dblHAdd(va1)'
  ];

  for (const rule of rules) {
    if (rule === '豹子') {
      if (a === b && b === c) killingRules.push(rule);
      continue;
    }
    const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
    if (!match) continue;
    const [, type, poolName] = match;
    const pool = pools[poolName];
    if (!pool) continue;

    if (type === 'allIn' && pool.has(a) && pool.has(b) && pool.has(c)) killingRules.push(rule);
    else if (type === 'dblHAdd') {
      const ha = hAddFn([a,b,c]);
      if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) killingRules.push(rule);
    } else if (type === 'dblHSub') {
      const hs = hSubFn([a,b,c]);
      if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) killingRules.push(rule);
    }
  }

  console.log(`  杀号规则: ${killingRules.join(', ') || '无'}`);

  // Check Excel predictions for this period
  const excelPred = excelPredMap.get(missIssue);
  if (excelPred) {
    console.log(`  Excel预测: ${excelPred.size}注, 包含开奖号: ${excelPred.has(actual) ? '是' : '否'}`);
  }
}

// Analyze what's common in the misses
console.log("\n=== 未命中共同特征 ===\n");

const missData = missPeriods.map(issue => {
  const period = allData.find(d => d.issue === issue);
  const a = period.d1, b = period.d2, c = period.d3;
  return {
    issue,
    actual: `${a}${b}${c}`,
    sum: a+b+c,
    span: Math.max(a,b,c)-Math.min(a,b,c),
    oddCount: [a,b,c].filter(d => d%2===1).length,
    bigCount: [a,b,c].filter(d => d>=5).length,
    hasRepeat: a===b || b===c || a===c,
    isBaozi: a===b && b===c
  };
});

console.log("未命中期特征:");
for (const m of missData) {
  console.log(`  ${m.issue}: ${m.actual} 和值=${m.sum} 跨度=${m.span} 奇数=${m.oddCount} 大数=${m.bigCount} 有重号=${m.hasRepeat} 豹子=${m.isBaozi}`);
}

const hitData = hitPeriods.map(issue => {
  const period = allData.find(d => d.issue === issue);
  const a = period.d1, b = period.d2, c = period.d3;
  return {
    issue,
    actual: `${a}${b}${c}`,
    sum: a+b+c,
    span: Math.max(a,b,c)-Math.min(a,b,c),
    oddCount: [a,b,c].filter(d => d%2===1).length,
    bigCount: [a,b,c].filter(d => d>=5).length,
    hasRepeat: a===b || b===c || a===c,
    isBaozi: a===b && b===c
  };
});

console.log("\n命中期特征:");
for (const h of hitData) {
  console.log(`  ${h.issue}: ${h.actual} 和值=${h.sum} 跨度=${h.span} 奇数=${h.oddCount} 大数=${h.bigCount} 有重号=${h.hasRepeat} 豹子=${h.isBaozi}`);
}

// Calculate averages
const missAvgSum = missData.reduce((s,m) => s+m.sum, 0) / missData.length;
const hitAvgSum = hitData.reduce((s,h) => s+h.sum, 0) / hitData.length;
const missAvgSpan = missData.reduce((s,m) => s+m.span, 0) / missData.length;
const hitAvgSpan = hitData.reduce((s,h) => s+h.span, 0) / hitData.length;

console.log(`\n统计对比:`);
console.log(`  未命中: 平均和值=${missAvgSum.toFixed(1)}, 平均跨度=${missAvgSpan.toFixed(1)}`);
console.log(`  命中:   平均和值=${hitAvgSum.toFixed(1)}, 平均跨度=${hitAvgSpan.toFixed(1)}`);

// Test: what if we remove rules that kill the misses?
console.log("\n=== 移除杀未命中规则测试 ===\n");

// Find rules that kill at least one miss
const rulesThatKillMisses = new Set();
for (const missIssue of missPeriods) {
  const period = allData.find(d => d.issue === missIssue);
  const idx = allData.indexOf(period);
  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const a = period.d1, b = period.d2, c = period.d3;

  const rules = [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
    '豹子',
    'allIn(bc2)', 'dblHSub(vs1)', 'dblHAdd(ha3)', 'dblHSub(va1)',
    'allIn(hs3)', 'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)', 'dblHAdd(va1)'
  ];

  for (const rule of rules) {
    if (rule === '豹子') {
      if (a === b && b === c) rulesThatKillMisses.add(rule);
      continue;
    }
    const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
    if (!match) continue;
    const [, type, poolName] = match;
    const pool = pools[poolName];
    if (!pool) continue;

    if (type === 'allIn' && pool.has(a) && pool.has(b) && pool.has(c)) rulesThatKillMisses.add(rule);
    else if (type === 'dblHAdd') {
      const ha = hAddFn([a,b,c]);
      if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) rulesThatKillMisses.add(rule);
    } else if (type === 'dblHSub') {
      const hs = hSubFn([a,b,c]);
      if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) rulesThatKillMisses.add(rule);
    }
  }
}

console.log("杀未命中的规则:");
for (const r of rulesThatKillMisses) console.log("  " + r);

// Test removing these rules
const safeRules = [
  'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
  '豹子',
  'allIn(bc2)', 'dblHSub(vs1)', 'dblHAdd(ha3)', 'dblHSub(va1)',
  'allIn(hs3)', 'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)', 'dblHAdd(va1)'
].filter(r => !rulesThatKillMisses.has(r));

console.log("\n安全规则集:");
for (const r of safeRules) console.log("  " + r);

// Test safe rules
let safeTotalPred = 0, safeTotalHit = 0, safeCnt = 0;
for (const period of periods) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;
  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const actual = `${period.d1}${period.d2}${period.d3}`;

  const killed = new Set();
  for (const s of allNums) {
    const a = +s[0], b = +s[1], c = +s[2];
    for (const rule of safeRules) {
      if (rule === '豹子') {
        if (a === b && b === c) { killed.add(s); break; }
        continue;
      }
      const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
      if (!match) continue;
      const [, type, poolName] = match;
      const pool = pools[poolName];
      if (!pool) continue;
      if (type === 'allIn' && pool.has(a) && pool.has(b) && pool.has(c)) { killed.add(s); break; }
      else if (type === 'dblHAdd') {
        const ha = hAddFn([a,b,c]);
        if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) { killed.add(s); break; }
      } else if (type === 'dblHSub') {
        const hs = hSubFn([a,b,c]);
        if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) { killed.add(s); break; }
      }
    }
  }
  safeTotalPred += (1000 - killed.size);
  if (!killed.has(actual)) safeTotalHit++;
  safeCnt++;
}

console.log(`\n安全规则结果: 平均${(safeTotalPred/safeCnt).toFixed(0)}注, 命中率${(safeTotalHit/safeCnt*100).toFixed(1)}%`);
