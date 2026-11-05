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

// Plan 1: Safe 9 rules
const PLAN1_RULES = [
  'allIn(ha1)', 'allIn(hs1)',
  'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)',
  'dblHSub(va1)',
  'dblHAdd(va2)', 'allIn(va1)', 'allIn(ha3)'
];

// Plan 2: Safe 9 + sum 5-22
const PLAN2_RULES = PLAN1_RULES; // Same rules, different filter

console.log("=== 方案1 vs 方案2 vs 并集 全量验证 ===\n");

let plan1Total = 0, plan1Hit = 0;
let plan2Total = 0, plan2Hit = 0;
let unionTotal = 0, unionHit = 0;
let plan1Cnt = 0, plan2Cnt = 0, unionCnt = 0;

const details = [];

for (let i = 3; i < allData.length; i++) {
  const cur = allData[i];
  const prev1 = allData[i-1];
  const prev2 = allData[i-2];
  const prev3 = allData[i-3];
  
  const pools = computePools(prev1, prev2, prev3);
  const actual = `${cur.d1}${cur.d2}${cur.d3}`;
  
  // Plan 1: safe 9 rules, no filter
  const plan1Killed = applyRules(pools, PLAN1_RULES);
  const plan1Pred = new Set(allNums.filter(s => !plan1Killed.has(s)));
  
  // Plan 2: safe 9 rules + sum 5-22
  const plan2Pred = new Set();
  for (const s of plan1Pred) {
    const sa = +s[0], sb = +s[1], sc = +s[2];
    const sum = sa + sb + sc;
    if (sum >= 5 && sum <= 22) {
      plan2Pred.add(s);
    }
  }
  
  // Union: Plan 1 ∪ Plan 2
  const unionPred = new Set([...plan1Pred, ...plan2Pred]);
  
  // Test hits
  const plan1HitThis = plan1Pred.has(actual);
  const plan2HitThis = plan2Pred.has(actual);
  const unionHitThis = unionPred.has(actual);
  
  plan1Total += plan1Pred.size;
  if (plan1HitThis) plan1Hit++;
  plan1Cnt++;
  
  plan2Total += plan2Pred.size;
  if (plan2HitThis) plan2Hit++;
  plan2Cnt++;
  
  unionTotal += unionPred.size;
  if (unionHitThis) unionHit++;
  unionCnt++;
  
  details.push({
    issue: cur.issue,
    actual,
    plan1: { count: plan1Pred.size, hit: plan1HitThis },
    plan2: { count: plan2Pred.size, hit: plan2HitThis },
    union: { count: unionPred.size, hit: unionHitThis }
  });
}

console.log(`测试期数: ${plan1Cnt}\n`);

console.log("方案1 (安全9规则, 无过滤):");
console.log(`  平均注数: ${(plan1Total/plan1Cnt).toFixed(0)}`);
console.log(`  命中: ${plan1Hit}/${plan1Cnt} (${(plan1Hit/plan1Cnt*100).toFixed(1)}%)`);

console.log("\n方案2 (安全9规则 + 和值5-22):");
console.log(`  平均注数: ${(plan2Total/plan2Cnt).toFixed(0)}`);
console.log(`  命中: ${plan2Hit}/${plan2Cnt} (${(plan2Hit/plan2Cnt*100).toFixed(1)}%)`);

console.log("\n并集 (方案1 ∪ 方案2):");
console.log(`  平均注数: ${(unionTotal/unionCnt).toFixed(0)}`);
console.log(`  命中: ${unionHit}/${unionCnt} (${(unionHit/unionCnt*100).toFixed(1)}%)`);

console.log("\n=== 关键发现 ===");
console.log(`方案2是方案1的子集: ${plan2Hit <= plan1Hit ? '是' : '否'}`);
console.log(`并集等于方案1: ${unionHit === plan1Hit && (unionTotal/unionCnt).toFixed(0) === (plan1Total/plan1Cnt).toFixed(0) ? '是' : '否'}`);

console.log("\n=== 最近20期详情 ===");
const last20 = details.slice(-20);
for (const d of last20) {
  console.log(`${d.issue}: 开奖=${d.actual}`);
  console.log(`  方案1: ${d.plan1.count}注 ${d.plan1.hit?'✓':'✗'}`);
  console.log(`  方案2: ${d.plan2.count}注 ${d.plan2.hit?'✓':'✗'}`);
  console.log(`  并集: ${d.union.count}注 ${d.union.hit?'✓':'✗'}`);
}

console.log("\n=== 未命中分析 ===");
const plan1Misses = details.filter(d => !d.plan1.hit);
const plan2Misses = details.filter(d => !d.plan2.hit);
const unionMisses = details.filter(d => !d.union.hit);

console.log(`方案1未中: ${plan1Misses.length}期`);
console.log(`方案2未中: ${plan2Misses.length}期`);
console.log(`并集未中: ${unionMisses.length}期`);

if (plan1Misses.length > 0 && plan1Misses.length <= 10) {
  console.log(`\n方案1未中详情: ${plan1Misses.map(d => d.issue).join(', ')}`);
}
