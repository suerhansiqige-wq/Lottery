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

// Test advanced optimization strategies
console.log("=== 高级优化策略测试 ===\n");

const baseRules = [
  'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
  '豹子',
  'allIn(bc2)', 'dblHSub(vs1)', 'dblHAdd(ha3)', 'dblHSub(va1)',
  'allIn(hs3)', 'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)', 'dblHAdd(va1)'
];

function testRules(name, rules, extraKillFn = null) {
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

    const killed = new Set();
    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];

      // Base rules
      for (const rule of rules) {
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

      // Extra kill function
      if (!killed.has(s) && extraKillFn && extraKillFn(a, b, c, pools, prev1, prev2, prev3)) {
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
    console.log(`  ${d.period}: ${d.predCount}注 ${d.hit?'✓':''} 开奖=${d.actual}`);
  }
  console.log('');
}

// Strategy 1: Add 杀两码和 rule
testRules("策略1: +杀两码和=上期两码和", baseRules, (a, b, c, pools, prev1) => {
  const s1 = (a+b)%10, s2 = (b+c)%10, s3 = (a+c)%10;
  const ps1 = (prev1.d1+prev1.d2)%10, ps2 = (prev1.d2+prev1.d3)%10, ps3 = (prev1.d1+prev1.d3)%10;
  return [s1,s2,s3].every(s => [ps1,ps2,ps3].includes(s));
});

// Strategy 2: Add partial position kills (kill if 2/3 positions match prev)
testRules("策略2: +2/3位匹配上期", baseRules, (a, b, c, pools, prev1) => {
  const digits = [a, b, c];
  const prevDigits = [prev1.d1, prev1.d2, prev1.d3];
  const matchCount = digits.filter((d, i) => d === prevDigits[i]).length;
  return matchCount >= 2;
});

// Strategy 3: Add sum range filter (kill if sum is too high or too low)
testRules("策略3: +和值范围过滤(5-22)", baseRules, (a, b, c) => {
  const sum = a + b + c;
  return sum < 5 || sum > 22;
});

// Strategy 4: Add span filter (kill if span is too small)
testRules("策略4: +跨度>=2", baseRules, (a, b, c) => {
  const span = Math.max(a,b,c) - Math.min(a,b,c);
  return span < 2;
});

// Strategy 5: Combined optimization
testRules("策略5: 综合优化", baseRules, (a, b, c, pools, prev1) => {
  const sum = a + b + c;
  const span = Math.max(a,b,c) - Math.min(a,b,c);
  const digits = [a, b, c];
  const prevDigits = [prev1.d1, prev1.d2, prev1.d3];
  const matchCount = digits.filter((d, i) => d === prevDigits[i]).length;

  // Kill if: sum out of range OR span too small OR 2+ positions match prev
  return (sum < 5 || sum > 22) || span < 2 || matchCount >= 2;
});

// Strategy 6: Scoring-based approach
console.log("策略6: 评分法（保留Top 650）");
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

  // Score each number
  const scored = [];
  for (const s of allNums) {
    const a = +s[0], b = +s[1], c = +s[2];
    if (a === b && b === c) continue; // 豹子

    let score = 0;

    // Apply base rules as soft penalties
    const rules = baseRules.filter(r => r !== '豹子');
    for (const rule of rules) {
      const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
      if (!match) continue;
      const [, type, poolName] = match;
      const pool = pools[poolName];
      if (!pool) continue;

      if (type === 'allIn') {
        if (pool.has(a) && pool.has(b) && pool.has(c)) score += 3;
        else if ([a,b,c].filter(d => pool.has(d)).length === 2) score += 1;
      } else if (type === 'dblHAdd') {
        const ha = hAddFn([a,b,c]);
        if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) score += 3;
        else if (ha.filter(v => pool.has(v)).length === 2) score += 1;
      } else if (type === 'dblHSub') {
        const hs = hSubFn([a,b,c]);
        if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) score += 3;
        else if (hs.filter(v => pool.has(v)).length === 2) score += 1;
      }
    }

    // Additional penalties
    const sum = a + b + c;
    if (sum < 5 || sum > 22) score += 2;
    const span = Math.max(a,b,c) - Math.min(a,b,c);
    if (span < 2) score += 2;

    const digits = [a, b, c];
    const prevDigits = [prev1.d1, prev1.d2, prev1.d3];
    const matchCount = digits.filter((d, i) => d === prevDigits[i]).length;
    if (matchCount >= 2) score += 2;

    scored.push({ num: s, score });
  }

  // Sort by score (ascending) and keep top 650
  scored.sort((a, b) => a.score - b.score);
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

// Strategy 7: Adaptive rule selection based on period characteristics
console.log("\n策略7: 自适应规则选择");
let adaptTotalPred = 0, adaptTotalHit = 0, adaptCnt = 0;
const adaptDetails = [];

for (const period of periods) {
  const idx = allData.indexOf(period);
  if (idx < 3) continue;

  const prev1 = allData[idx-1];
  const prev2 = allData[idx-2];
  const prev3 = allData[idx-3];
  const pools = computePools(prev1, prev2, prev3);
  const actual = `${period.d1}${period.d2}${period.d3}`;

  // Select rules based on characteristics
  const selectedRules = [...baseRules];

  // If prev period has high sum (>15), add sum filter
  const prevSum = prev1.d1 + prev1.d2 + prev1.d3;
  if (prevSum > 15) {
    // Add sum range filter
  }

  // If prev period has small span (<3), add span filter
  const prevSpan = Math.max(prev1.d1,prev1.d2,prev1.d3) - Math.min(prev1.d1,prev1.d2,prev1.d3);
  if (prevSpan < 3) {
    // Add span filter
  }

  const killed = new Set();
  for (const s of allNums) {
    const a = +s[0], b = +s[1], c = +s[2];

    for (const rule of selectedRules) {
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

  const predCount = 1000 - killed.size;
  const hit = !killed.has(actual);
  adaptTotalPred += predCount;
  if (hit) adaptTotalHit++;
  adaptCnt++;
  adaptDetails.push({ period: period.issue, predCount, hit, actual });
}

const adaptAvgPred = adaptTotalPred / adaptCnt;
const adaptHitRate = (adaptTotalHit / adaptCnt * 100).toFixed(1);
console.log(`自适应结果: 平均${adaptAvgPred.toFixed(0)}注, 命中率${adaptHitRate}%`);
for (const d of adaptDetails) {
  console.log(`  ${d.period}: ${d.predCount}注 ${d.hit?'✓':'✗'} 开奖=${d.actual}`);
}
