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

// 分析Excel的选号逻辑
console.log("=== Excel选号逻辑分析 ===\n");

// 方案1的规则（100%命中，813注）
const safeRules = [
  'allIn(ha1)', 'allIn(hs1)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
  'dblHSub(va1)',
  'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)'
];

for (const period of periods.slice(0, 3)) { // 分析前3期
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const excelPred = excelPredMap.get(period.issue);
  const actual = `${period.d1}${period.d2}${period.d3}`;

  console.log(`\n${period.issue}: 开奖=${actual}, Excel预测${excelPred.size}注`);

  // 生成方案1的预测
  const ourPred = new Set();
  for (const s of allNums) {
    const a = +s[0], b = +s[1], c = +s[2];
    let killed = false;
    for (const rule of safeRules) {
      const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
      if (!match) continue;
      const [, type, poolName] = match;
      const pool = pools[poolName];
      if (!pool) continue;
      if (type === 'allIn' && pool.has(a) && pool.has(b) && pool.has(c)) { killed = true; break; }
      else if (type === 'dblHAdd') {
        const ha = hAddFn([a,b,c]);
        if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) { killed = true; break; }
      } else if (type === 'dblHSub') {
        const hs = hSubFn([a,b,c]);
        if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) { killed = true; break; }
      }
    }
    if (!killed) ourPred.add(s);
  }

  console.log(`  我们的预测: ${ourPred.size}注`);

  // 找出Excel包含但我们不包含的号（假阴性）
  const falseNegatives = [];
  for (const s of excelPred) {
    if (!ourPred.has(s)) falseNegatives.push(s);
  }

  // 找出我们包含但Excel不包含的号（假阳性）
  const falsePositives = [];
  for (const s of ourPred) {
    if (!excelPred.has(s)) falsePositives.push(s);
  }

  console.log(`  假阴性（Excel有我们没有）: ${falseNegatives.length}注`);
  console.log(`  假阳性（我们有Excel没有）: ${falsePositives.length}注`);

  // 分析假阴性的特征
  if (falseNegatives.length > 0) {
    console.log(`  假阴性示例（前10个）:`);
    for (const s of falseNegatives.slice(0, 10)) {
      const a = +s[0], b = +s[1], c = +s[2];
      const sum = a+b+c;
      const span = Math.max(a,b,c)-Math.min(a,b,c);
      console.log(`    ${s}: 和值=${sum}, 跨度=${span}`);
    }
  }

  // 分析假阳性的特征
  if (falsePositives.length > 0) {
    console.log(`  假阳性特征分析:`);
    const fpSums = falsePositives.map(s => {
      const a = +s[0], b = +s[1], c = +s[2];
      return a+b+c;
    });
    const fpSpans = falsePositives.map(s => {
      const a = +s[0], b = +s[1], c = +s[2];
      return Math.max(a,b,c)-Math.min(a,b,c);
    });
    const avgSum = fpSums.reduce((a,b)=>a+b,0)/fpSums.length;
    const avgSpan = fpSpans.reduce((a,b)=>a+b,0)/fpSpans.length;
    console.log(`    平均和值: ${avgSum.toFixed(1)}, 平均跨度: ${avgSpan.toFixed(1)}`);

    // 和值分布
    const sumDist = {};
    for (const sum of fpSums) {
      sumDist[sum] = (sumDist[sum]||0) + 1;
    }
    console.log(`    和值分布: ${Object.entries(sumDist).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}:${v}`).join(', ')}`);
  }
}

// 测试：如果我们只保留Excel也包含的号（交集），命中率如何？
console.log("\n=== 交集测试 ===\n");
let intersectionTotal = 0, intersectionHit = 0, intersectionCnt = 0;

for (const period of periods) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const excelPred = excelPredMap.get(period.issue);
  const actual = `${period.d1}${period.d2}${period.d3}`;

  const ourPred = new Set();
  for (const s of allNums) {
    const a = +s[0], b = +s[1], c = +s[2];
    let killed = false;
    for (const rule of safeRules) {
      const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
      if (!match) continue;
      const [, type, poolName] = match;
      const pool = pools[poolName];
      if (!pool) continue;
      if (type === 'allIn' && pool.has(a) && pool.has(b) && pool.has(c)) { killed = true; break; }
      else if (type === 'dblHAdd') {
        const ha = hAddFn([a,b,c]);
        if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) { killed = true; break; }
      } else if (type === 'dblHSub') {
        const hs = hSubFn([a,b,c]);
        if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) { killed = true; break; }
      }
    }
    if (!killed) ourPred.add(s);
  }

  // 取交集
  const intersection = new Set();
  for (const s of ourPred) {
    if (excelPred.has(s)) intersection.add(s);
  }

  const hit = intersection.has(actual);
  intersectionTotal += intersection.size;
  if (hit) intersectionHit++;
  intersectionCnt++;
}

console.log(`交集结果: 平均${(intersectionTotal/intersectionCnt).toFixed(0)}注, 命中率${(intersectionHit/intersectionCnt*100).toFixed(1)}%`);

// 分析Excel的选号是否有规律
console.log("\n=== Excel选号规律分析 ===\n");

for (const period of periods.slice(0, 2)) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const excelPred = excelPredMap.get(period.issue);

  console.log(`\n${period.issue}: Excel预测${excelPred.size}注`);

  // 分析和值分布
  const sums = [];
  for (const s of excelPred) {
    const a = +s[0], b = +s[1], c = +s[2];
    sums.push(a+b+c);
  }
  const sumDist = {};
  for (const sum of sums) {
    sumDist[sum] = (sumDist[sum]||0) + 1;
  }
  console.log(`  和值分布: ${Object.entries(sumDist).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}:${v}`).join(', ')}`);

  // 分析跨度分布
  const spans = [];
  for (const s of excelPred) {
    const a = +s[0], b = +s[1], c = +s[2];
    spans.push(Math.max(a,b,c)-Math.min(a,b,c));
  }
  const spanDist = {};
  for (const span of spans) {
    spanDist[span] = (spanDist[span]||0) + 1;
  }
  console.log(`  跨度分布: ${Object.entries(spanDist).sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}:${v}`).join(', ')}`);

  // 分析奇偶分布
  const oeDist = { '0奇': 0, '1奇': 0, '2奇': 0, '3奇': 0 };
  for (const s of excelPred) {
    const a = +s[0], b = +s[1], c = +s[2];
    const oddCount = [a,b,c].filter(d => d%2===1).length;
    oeDist[`${oddCount}奇`]++;
  }
  console.log(`  奇偶分布: ${Object.entries(oeDist).map(([k,v])=>`${k}:${v}`).join(', ')}`);

  // 分析大小分布
  const bsDist = { '0大': 0, '1大': 0, '2大': 0, '3大': 0 };
  for (const s of excelPred) {
    const a = +s[0], b = +s[1], c = +s[2];
    const bigCount = [a,b,c].filter(d => d>=5).length;
    bsDist[`${bigCount}大`]++;
  }
  console.log(`  大小分布: ${Object.entries(bsDist).map(([k,v])=>`${k}:${v}`).join(', ')}`);
}
