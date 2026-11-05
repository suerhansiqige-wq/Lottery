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

// Test different rule combinations
const ruleSets = {
  'current': [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)', '豹子'
  ],
  '+sh1': [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
    'allIn(sh1)', '豹子'
  ],
  '+sh1+sh2': [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
    'allIn(sh1)', 'allIn(sh2)', '豹子'
  ],
  '+sh1+bc1': [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
    'allIn(sh1)', 'allIn(bc1)', '豹子'
  ],
  '+sh1+sh2+bc1': [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
    'allIn(sh1)', 'allIn(sh2)', 'allIn(bc1)', '豹子'
  ],
  'aggressive': [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(ha2)', 'allIn(hs2)',
    'allIn(lh1)', 'allIn(lh2)', 'allIn(lh3)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
    'dblHSub(hs1)', 'dblHSub(hs2)', 'dblHSub(hs3)',
    'allIn(sh1)', 'allIn(sh2)',
    'allIn(bc1)', 'allIn(bc2)',
    '豹子'
  ],
  'very_aggressive': [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(ha2)', 'allIn(hs2)', 'allIn(ha3)', 'allIn(hs3)',
    'allIn(va1)', 'allIn(vs1)', 'allIn(va2)', 'allIn(vs2)',
    'allIn(lh1)', 'allIn(lh2)', 'allIn(lh3)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
    'dblHSub(hs1)', 'dblHSub(hs2)', 'dblHSub(hs3)',
    'dblHAdd(va1)', 'dblHAdd(vs1)', 'dblHAdd(va2)', 'dblHAdd(vs2)',
    'dblHSub(va1)', 'dblHSub(vs1)', 'dblHSub(va2)', 'dblHSub(vs2)',
    'allIn(sh1)', 'allIn(sh2)', 'allIn(sh3)',
    'allIn(bc1)', 'allIn(bc2)',
    '豹子'
  ]
};

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

  return {
    ha1: new Set(ha1), hs1: new Set(hs1),
    ha2: new Set(ha2), hs2: new Set(hs2),
    ha3: new Set(ha3), hs3: new Set(hs3),
    va1: new Set(va1), vs1: new Set(vs1),
    va2: new Set(va2), vs2: new Set(vs2),
    sh1, sh2, sh3, lh1, lh2, lh3, bc1, bc2
  };
}

function testRuleSet(ruleSetName, ruleList) {
  let totalPred = 0, totalFP = 0, totalHit = 0, cnt = 0;

  for (const period of periods) {
    const idx = allData.indexOf(period);
    if (idx < 3) continue;

    const prev1 = allData[idx-1];
    const prev2 = allData[idx-2];
    const prev3 = allData[idx-3];
    const pools = computePools(prev1, prev2, prev3);
    const excelPred = excelPredMap.get(period.issue);
    const actual = `${period.d1}${period.d2}${period.d3}`;

    const killed = new Set();
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];

      for (const rule of ruleList) {
        if (rule === '豹子') {
          if (a === b && b === c) { killed.add(s); break; }
          continue;
        }

        const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
        if (!match) continue;
        const [, type, poolName] = match;
        const pool = pools[poolName];
        if (!pool) continue;

        if (type === 'allIn') {
          if (pool.has(a) && pool.has(b) && pool.has(c)) { killed.add(s); break; }
        } else if (type === 'dblHAdd') {
          const ha = hAddFn([a,b,c]);
          if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) { killed.add(s); break; }
        } else if (type === 'dblHSub') {
          const hs = hSubFn([a,b,c]);
          if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) { killed.add(s); break; }
        }
      }
    }

    const predCount = 1000 - killed.size;
    let fp = 0;
    for (const k of killed) {
      if (excelPred.has(k)) fp++;
    }
    const hit = !killed.has(actual);

    totalPred += predCount;
    totalFP += fp;
    if (hit) totalHit++;
    cnt++;
  }

  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  console.log(`${ruleSetName}: 平均${avgPred.toFixed(0)}注, 总FP=${totalFP}, 命中率=${hitRate}%`);
}

console.log("=== 测试不同规则组合 ===\n");
for (const [name, rules] of Object.entries(ruleSets)) {
  testRuleSet(name, rules);
}
