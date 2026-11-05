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

// Analyze current misses
console.log("=== 当前算法未命中分析 ===\n");

const currentRules = [
  'allIn(ha1)', 'allIn(hs1)', 'allIn(lh1)', 'allIn(lh2)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHSub(hs1)', 'dblHSub(hs2)',
  '豹子',
  'allIn(bc2)', 'dblHSub(vs1)', 'dblHAdd(ha3)', 'dblHSub(va1)',
  'allIn(hs3)', 'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)', 'dblHAdd(va1)'
];

const misses = [];
const hits = [];

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

    for (const rule of currentRules) {
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

  const hit = !killed.has(actual);
  if (hit) {
    hits.push({ period: period.issue, actual });
  } else {
    misses.push({ period: period.issue, actual, prev1: `${prev1.d1}${prev1.d2}${prev1.d3}`, prev2: `${prev2.d1}${prev2.d2}${prev2.d3}`, prev3: `${prev3.d1}${prev3.d2}${prev3.d3}` });
  }
}

console.log(`命中: ${hits.length}期`);
console.log(`未中: ${misses.length}期\n`);

console.log("未中期详情:");
for (const m of misses) {
  console.log(`  ${m.period}: 开奖=${m.actual}, 前三期=${m.prev3},${m.prev2},${m.prev1}`);
}

// Analyze characteristics of missed numbers
console.log("\n=== 未命中号码特征分析 ===\n");

const missDigits = misses.map(m => m.actual.split('').map(Number));
const hitDigits = hits.map(h => h.actual.split('').map(Number));

// Sum distribution
const missSums = missDigits.map(d => d[0]+d[1]+d[2]);
const hitSums = hitDigits.map(d => d[0]+d[1]+d[2]);
console.log("未命中和值: " + missSums.join(','));
console.log("未命中和值平均: " + (missSums.reduce((a,b)=>a+b,0)/missSums.length).toFixed(1));
console.log("命中和值平均: " + (hitSums.reduce((a,b)=>a+b,0)/hitSums.length).toFixed(1));

// Span distribution
const missSpans = missDigits.map(d => Math.max(...d) - Math.min(...d));
const hitSpans = hitDigits.map(d => Math.max(...d) - Math.min(...d));
console.log("\n未命中跨度: " + missSpans.join(','));
console.log("未命中跨度平均: " + (missSpans.reduce((a,b)=>a+b,0)/missSpans.length).toFixed(1));
console.log("命中跨度平均: " + (hitSpans.reduce((a,b)=>a+b,0)/hitSpans.length).toFixed(1));

// Odd/Even distribution
const missOE = missDigits.map(d => d.filter(x => x%2===1).length);
const hitOE = hitDigits.map(d => d.filter(x => x%2===1).length);
console.log("\n未命中奇数个数: " + missOE.join(','));
console.log("命中奇数个数: " + hitOE.join(','));

// Big/Small distribution (0-4 small, 5-9 big)
const missBS = missDigits.map(d => d.filter(x => x>=5).length);
const hitBS = hitDigits.map(d => d.filter(x => x>=5).length);
console.log("\n未命中大数个数: " + missBS.join(','));
console.log("命中大数个数: " + hitBS.join(','));

// Test optimization strategies
console.log("\n=== 优化策略测试 ===\n");

// Strategy 1: Remove rules that kill too many correct predictions
console.log("策略1: 移除高误杀规则");
const ruleKillStats = {};
for (const rule of currentRules) {
  let killCount = 0, hitKillCount = 0;
  for (const period of periods) {
    const idx = allData.indexOf(period);
    if (idx < 3) continue;
    const prev1 = allData[idx-1];
    const prev2 = allData[idx-2];
    const prev3 = allData[idx-3];
    const pools = computePools(prev1, prev2, prev3);
    const actual = `${period.d1}${period.d2}${period.d3}`;

    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      let killed = false;

      if (rule === '豹子') {
        if (a === b && b === c) killed = true;
      } else {
        const match = rule.match(/^(allIn|dblHAdd|dblHSub)\((\w+)\)$/);
        if (match) {
          const [, type, poolName] = match;
          const pool = pools[poolName];
          if (pool) {
            if (type === 'allIn' && pool.has(a) && pool.has(b) && pool.has(c)) killed = true;
            else if (type === 'dblHAdd') {
              const ha = hAddFn([a,b,c]);
              if (pool.has(ha[0]) && pool.has(ha[1]) && pool.has(ha[2])) killed = true;
            } else if (type === 'dblHSub') {
              const hs = hSubFn([a,b,c]);
              if (pool.has(hs[0]) && pool.has(hs[1]) && pool.has(hs[2])) killed = true;
            }
          }
        }
      }

      if (killed) {
        killCount++;
        if (s === actual) hitKillCount++;
      }
    }
  }
  ruleKillStats[rule] = { total: killCount, hitKilled: hitKillCount, hitRate: hitKillCount/(killCount||1) };
}

console.log("各规则误杀统计:");
const sortedRules = Object.entries(ruleKillStats).sort((a,b) => b[1].hitRate - a[1].hitRate);
for (const [rule, stats] of sortedRules) {
  console.log(`  ${rule}: 杀${stats.total}注, 误杀${stats.hitKilled}注, 误杀率${(stats.hitRate*100).toFixed(1)}%`);
}

// Strategy 2: Try removing high-miss-rate rules
console.log("\n策略2: 移除误杀率>5%的规则");
const safeRules = currentRules.filter(r => ruleKillStats[r].hitRate < 0.05);
console.log("安全规则集:");
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

// Strategy 3: Add new rule types
console.log("\n=== 策略3: 测试新规则类型 ===\n");

const newRuleTests = [
  { name: '杀和值=上期和值', test: (pools, a, b, c, prev1) => (a+b+c)%10 === (prev1.d1+prev1.d2+prev1.d3)%10 },
  { name: '杀跨度=上期跨度', test: (pools, a, b, c, prev1) => (Math.max(a,b,c)-Math.min(a,b,c)) === (Math.max(prev1.d1,prev1.d2,prev1.d3)-Math.min(prev1.d1,prev1.d2,prev1.d3)) },
  { name: '杀百位=上期百位', test: (pools, a, b, c, prev1) => a === prev1.d1 },
  { name: '杀十位=上期十位', test: (pools, a, b, c, prev1) => b === prev1.d2 },
  { name: '杀个位=上期个位', test: (pools, a, b, c, prev1) => c === prev1.d3 },
  { name: '杀两码和=上期两码和', test: (pools, a, b, c, prev1) => {
    const s1 = (a+b)%10, s2 = (b+c)%10, s3 = (a+c)%10;
    const ps1 = (prev1.d1+prev1.d2)%10, ps2 = (prev1.d2+prev1.d3)%10, ps3 = (prev1.d1+prev1.d3)%10;
    return [s1,s2,s3].every(s => [ps1,ps2,ps3].includes(s));
  }},
];

for (const nr of newRuleTests) {
  let killCount = 0, hitKillCount = 0;
  for (const period of periods) {
    const idx = allData.indexOf(period);
    if (idx < 3) continue;
    const prev1 = allData[idx-1];
    const actual = `${period.d1}${period.d2}${period.d3}`;

    for (const s of allNums) {
      const a = +s[0], b = +s[1], c = +s[2];
      if (nr.test(null, a, b, c, prev1)) {
        killCount++;
        if (s === actual) hitKillCount++;
      }
    }
  }
  const hitRate = hitKillCount/(killCount||1);
  console.log(`${nr.name}: 杀${killCount}注, 误杀${hitKillCount}注, 误杀率${(hitRate*100).toFixed(1)}%`);
}
