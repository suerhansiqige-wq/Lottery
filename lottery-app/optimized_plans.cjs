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

console.log("=== 优化方案测试 ===\n");

// 方案1: 移除杀未命中的规则，保留安全规则
const plan1Rules = [
  'allIn(ha1)', 'allIn(hs1)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
  'dblHSub(va1)',
  'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)'
];

// 方案2: 方案1 + 和值范围过滤
function testPlan(name, rules, extraFilter = null) {
  let totalPred = 0, totalHit = 0, cnt = 0;
  const details = [];

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
      for (const rule of rules) {
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

      // Extra filter
      if (!killed.has(s) && extraFilter && extraFilter(sa, sb, sc, a, b, c)) {
        killed.add(s);
      }
    }

    const predCount = 1000 - killed.size;
    const hit = !killed.has(actual);
    totalPred += predCount;
    if (hit) totalHit++;
    cnt++;
    details.push({ period: period.issue, predCount, hit, actual });
  }

  const avgPred = totalPred / cnt;
  const hitRate = (totalHit / cnt * 100).toFixed(1);
  console.log(`${name}: 平均${avgPred.toFixed(0)}注, 命中率${hitRate}%`);
  for (const d of details) {
    console.log(`  ${d.period}: ${d.predCount}注 ${d.hit?'✓':'✗'} 开奖=${d.actual}`);
  }
  console.log('');
}

testPlan("方案1: 安全规则集", plan1Rules);

testPlan("方案2: +和值5-22", plan1Rules, (sa, sb, sc) => {
  const sum = sa + sb + sc;
  return sum < 5 || sum > 22;
});

testPlan("方案3: +跨度>=2", plan1Rules, (sa, sb, sc) => {
  const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
  return span < 2;
});

testPlan("方案4: +和值+跨度", plan1Rules, (sa, sb, sc) => {
  const sum = sa + sb + sc;
  const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
  return (sum < 5 || sum > 22) || span < 2;
});

testPlan("方案5: +杀两码和=上期", plan1Rules, (sa, sb, sc, a, b, c) => {
  const s1 = (sa+sb)%10, s2 = (sb+sc)%10, s3 = (sa+sc)%10;
  const ps1 = (a+b)%10, ps2 = (b+c)%10, ps3 = (a+c)%10;
  return [s1,s2,s3].every(s => [ps1,ps2,ps3].includes(s));
});

testPlan("方案6: +2/3位匹配上期", plan1Rules, (sa, sb, sc, a, b, c) => {
  const digits = [sa, sb, sc];
  const prevDigits = [a, b, c];
  const matchCount = digits.filter((d, i) => d === prevDigits[i]).length;
  return matchCount >= 2;
});

testPlan("方案7: 综合优化", plan1Rules, (sa, sb, sc, a, b, c) => {
  const sum = sa + sb + sc;
  const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
  const digits = [sa, sb, sc];
  const prevDigits = [a, b, c];
  const matchCount = digits.filter((d, i) => d === prevDigits[i]).length;
  const s1 = (sa+sb)%10, s2 = (sb+sc)%10, s3 = (sa+sc)%10;
  const ps1 = (a+b)%10, ps2 = (b+c)%10, ps3 = (a+c)%10;
  const twoCodeMatch = [s1,s2,s3].every(s => [ps1,ps2,ps3].includes(s));

  return (sum < 5 || sum > 22) || span < 2 || matchCount >= 2 || twoCodeMatch;
});

// 方案8: 评分法（基于安全规则）
console.log("方案8: 评分法（安全规则+Top 650）");
let scoreTotalPred = 0, scoreTotalHit = 0, scoreCnt = 0;
const scoreDetails = [];

for (const period of periods) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const actual = `${period.d1}${period.d2}${period.d3}`;
  const a = period.d1, b = period.d2, c = period.d3;

  const scored = [];
  for (const s of allNums) {
    const sa = +s[0], sb = +s[1], sc = +s[2];
    let score = 0;

    // Apply plan1 rules as soft penalties
    for (const rule of plan1Rules) {
      const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
      if (!match) continue;
      const [, type, poolName] = match;
      const pool = pools[poolName];
      if (!pool) continue;

      if (type === 'allIn') {
        if (pool.has(sa) && pool.has(sb) && pool.has(sc)) score += 3;
        else if ([sa,sb,sc].filter(d => pool.has(d)).length === 2) score += 1;
      } else if (type === 'dblHAdd') {
        const ha = hAddFn([sa,sb,sc]);
        if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) score += 3;
        else if (ha.filter(v => pool.has(v)).length === 2) score += 1;
      } else if (type === 'dblHSub') {
        const hs = hSubFn([sa,sb,sc]);
        if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) score += 3;
        else if (hs.filter(v => pool.has(v)).length === 2) score += 1;
      }
    }

    // Additional penalties
    const sum = sa + sb + sc;
    if (sum < 5 || sum > 22) score += 2;
    const span = Math.max(sa,sb,sc) - Math.min(sa,sb,sc);
    if (span < 2) score += 2;

    const digits = [sa, sb, sc];
    const prevDigits = [a, b, c];
    const matchCount = digits.filter((d, i) => d === prevDigits[i]).length;
    if (matchCount >= 2) score += 2;

    scored.push({ num: s, score });
  }

  scored.sort((x, y) => x.score - y.score);
  const predictions = scored.slice(0, 650).map(x => x.num);

  const hit = predictions.includes(actual);
  scoreTotalPred += predictions.length;
  if (hit) scoreTotalHit++;
  scoreCnt++;
  scoreDetails.push({ period: period.issue, predCount: predictions.length, hit, actual });
}

const scoreAvgPred = scoreTotalPred / scoreCnt;
const scoreHitRate = (scoreTotalHit / scoreCnt * 100).toFixed(1);
console.log(`评分法结果: 平均${scoreAvgPred.toFixed(0)}注, 命中率${scoreHitRate}%`);
for (const d of scoreDetails) {
  console.log(`  ${d.period}: ${d.predCount}注 ${d.hit?'✓':'✗'} 开奖=${d.actual}`);
}
