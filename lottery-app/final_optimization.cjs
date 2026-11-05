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

// 分析Excel排除的号码有什么共同特征
console.log("=== Excel排除号码特征分析 ===\n");

for (const period of periods.slice(0, 5)) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const excelPred = excelPredMap.get(period.issue);
  const actual = `${period.d1}${period.d2}${period.d3}`;

  console.log(`\n${period.issue}: 开奖=${actual}, Excel预测${excelPred.size}注, 排除${1000-excelPred.size}注`);

  // 分析被排除的号码
  const excluded = allNums.filter(s => !excelPred.has(s));

  // 检查和值分布
  const excludedSums = excluded.map(s => {
    const a = +s[0], b = +s[1], c = +s[2];
    return a+b+c;
  });
  const includedSums = Array.from(excelPred).map(s => {
    const a = +s[0], b = +s[1], c = +s[2];
    return a+b+c;
  });

  const avgExcludedSum = excludedSums.reduce((a,b)=>a+b,0)/excludedSums.length;
  const avgIncludedSum = includedSums.reduce((a,b)=>a+b,0)/includedSums.length;
  console.log(`  被排除号码平均和值: ${avgExcludedSum.toFixed(1)}`);
  console.log(`  被包含号码平均和值: ${avgIncludedSum.toFixed(1)}`);

  // 检查跨度分布
  const excludedSpans = excluded.map(s => {
    const a = +s[0], b = +s[1], c = +s[2];
    return Math.max(a,b,c)-Math.min(a,b,c);
  });
  const includedSpans = Array.from(excelPred).map(s => {
    const a = +s[0], b = +s[1], c = +s[2];
    return Math.max(a,b,c)-Math.min(a,b,c);
  });

  const avgExcludedSpan = excludedSpans.reduce((a,b)=>a+b,0)/excludedSpans.length;
  const avgIncludedSpan = includedSpans.reduce((a,b)=>a+b,0)/includedSpans.length;
  console.log(`  被排除号码平均跨度: ${avgExcludedSpan.toFixed(1)}`);
  console.log(`  被包含号码平均跨度: ${avgIncludedSpan.toFixed(1)}`);

  // 检查是否包含豹子
  const excludedBaozi = excluded.filter(s => s[0]===s[1] && s[1]===s[2]);
  const includedBaozi = Array.from(excelPred).filter(s => s[0]===s[1] && s[1]===s[2]);
  console.log(`  被排除豹子: ${excludedBaozi.length}个 (${excludedBaozi.join(',') || '无'})`);
  console.log(`  被包含豹子: ${includedBaozi.length}个 (${includedBaozi.join(',') || '无'})`);

  // 检查与上期号码的关系
  const prevDigits = [prev1.d1, prev1.d2, prev1.d3];
  const excludedWithPrevDigit = excluded.filter(s => {
    const a = +s[0], b = +s[1], c = +s[2];
    return [a,b,c].some(d => prevDigits.includes(d));
  });
  const includedWithPrevDigit = Array.from(excelPred).filter(s => {
    const a = +s[0], b = +s[1], c = +s[2];
    return [a,b,c].some(d => prevDigits.includes(d));
  });
  console.log(`  包含上期数字的号码: 被排除${excludedWithPrevDigit.length}, 被包含${includedWithPrevDigit.length}`);
}

// 测试：基于分析结果，尝试新的杀号规则
console.log("\n=== 基于Excel特征的新规则测试 ===\n");

const safeRules = [
  'allIn(ha1)', 'allIn(hs1)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
  'dblHSub(va1)',
  'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)'
];

// 新规则1: 杀和值<3或>24的号码
function testNewRule(name, rules, extraFilter) {
  let totalPred = 0, totalHit = 0, cnt = 0;

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

      // Base rules
      for (const rule of rules) {
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

      // Extra filter
      if (!killed.has(s) && extraFilter(a, b, c, prev1, prev2, prev3)) {
        killed.add(s);
      }
    }

    const predCount = 1000 - killed.size;
    const hit = !killed.has(actual);
    totalPred += predCount;
    if (hit) totalHit++;
    cnt++;
  }

  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  console.log(`${name}: 平均${avgPred.toFixed(0)}注, 命中率${hitRate}%`);
}

// 测试各种和值范围
testNewRule("和值4-23", safeRules, (a,b,c) => {
  const sum = a+b+c;
  return sum < 4 || sum > 23;
});

testNewRule("和值5-22", safeRules, (a,b,c) => {
  const sum = a+b+c;
  return sum < 5 || sum > 22;
});

testNewRule("和值6-21", safeRules, (a,b,c) => {
  const sum = a+b+c;
  return sum < 6 || sum > 21;
});

// 测试跨度过滤
testNewRule("跨度>=1", safeRules, (a,b,c) => {
  const span = Math.max(a,b,c)-Math.min(a,b,c);
  return span < 1;
});

testNewRule("跨度>=2", safeRules, (a,b,c) => {
  const span = Math.max(a,b,c)-Math.min(a,b,c);
  return span < 2;
});

// 测试组合
testNewRule("和值5-22+跨度>=1", safeRules, (a,b,c) => {
  const sum = a+b+c;
  const span = Math.max(a,b,c)-Math.min(a,b,c);
  return (sum < 5 || sum > 22) || span < 1;
});

testNewRule("和值5-22+跨度>=2", safeRules, (a,b,c) => {
  const sum = a+b+c;
  const span = Math.max(a,b,c)-Math.min(a,b,c);
  return (sum < 5 || sum > 22) || span < 2;
});

testNewRule("和值6-21+跨度>=2", safeRules, (a,b,c) => {
  const sum = a+b+c;
  const span = Math.max(a,b,c)-Math.min(a,b,c);
  return (sum < 6 || sum > 21) || span < 2;
});

// 最终推荐方案
console.log("\n=== 最终推荐方案 ===\n");

const finalRules = [
  'allIn(ha1)', 'allIn(hs1)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
  'dblHSub(va1)',
  'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)'
];

let finalTotalPred = 0, finalTotalHit = 0, finalCnt = 0;
const finalDetails = [];

for (const period of periods) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const actual = `${period.d1}${period.d2}${period.d3}`;
  const a = period.d1, b = period.d2, c = period.d3;

  const killed = new Set();
  for (const s of allNums) {
    const sa = +s[0], sb = +s[1], sc = +s[2];

    // Base rules
    for (const rule of finalRules) {
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

    // Sum filter
    if (!killed.has(s)) {
      const sum = sa + sb + sc;
      if (sum < 5 || sum > 22) killed.add(s);
    }
  }

  const predCount = 1000 - killed.size;
  const hit = !killed.has(actual);
  finalTotalPred += predCount;
  if (hit) finalTotalHit++;
  finalCnt++;
  finalDetails.push({ period: period.issue, predCount, hit, actual });
}

const finalAvgPred = finalTotalPred / finalCnt;
const finalHitRate = (finalTotalHit / finalCnt * 100).toFixed(1);
console.log(`最终方案: 平均${finalAvgPred.toFixed(0)}注, 命中率${finalHitRate}%`);
for (const d of finalDetails) {
  console.log(`  ${d.period}: ${d.predCount}注 ${d.hit?'✓':'✗'} 开奖=${d.actual}`);
}
