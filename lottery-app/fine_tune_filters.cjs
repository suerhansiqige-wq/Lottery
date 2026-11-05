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

function hAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function hSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }

// Safe 9 rules from previous analysis
const SAFE_RULES = [
  { name: 'allIn(ha1)', fn: (n, prev1) => { const pool = new Set(hAdd([prev1.d1, prev1.d2, prev1.d3])); return [n[0],n[1],n[2]].every(v => pool.has(v)); }},
  { name: 'allIn(hs1)', fn: (n, prev1) => { const pool = new Set(hSub([prev1.d1, prev1.d2, prev1.d3])); return [n[0],n[1],n[2]].every(v => pool.has(v)); }},
  { name: 'allIn(lh1)', fn: (n, prev1) => { const pool = new Set(); for (let i = 0; i < 3-1; i++) { pool.add(prev1.d1); pool.add(prev1.d1+1 <= 9 ? prev1.d1+1 : prev1.d1-9); } return [n[0],n[1],n[2]].every(v => pool.has(v)); }},
  { name: 'allIn(lh2)', fn: (n, prev2) => { const pool = new Set(); for (let i = 0; i < 3-1; i++) { pool.add(prev2.d1); pool.add(prev2.d1+1 <= 9 ? prev2.d1+1 : prev2.d1-9); } return [n[0],n[1],n[2]].every(v => pool.has(v)); }},
  { name: 'dblHAdd(ha1)', fn: (n, prev1) => { const pool = new Set(hAdd([prev1.d1, prev1.d2, prev1.d3])); const ha = hAdd([n[0],n[1],n[2]]); return ha.filter(v => pool.has(v)).length >= 2; }},
  { name: 'dblHAdd(ha2)', fn: (n, prev2) => { const pool = new Set(hAdd([prev2.d1, prev2.d2, prev2.d3])); const ha = hAdd([n[0],n[1],n[2]]); return ha.filter(v => pool.has(v)).length >= 2; }},
  { name: 'dblHSub(hs1)', fn: (n, prev1) => { const pool = new Set(hSub([prev1.d1, prev1.d2, prev1.d3])); const hs = hSub([n[0],n[1],n[2]]); return hs.filter(v => pool.has(v)).length >= 2; }},
  { name: 'dblHSub(hs2)', fn: (n, prev2) => { const pool = new Set(hSub([prev2.d1, prev2.d2, prev2.d3])); const hs = hSub([n[0],n[1],n[2]]); return hs.filter(v => pool.has(v)).length >= 2; }},
  { name: '豹子', fn: (n) => n[0] === n[1] && n[1] === n[2] }
];

function generateWithSafeRules(prev1, prev2, prev3) {
  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const digits = [+s[0], +s[1], +s[2]];
    
    let killed = false;
    for (const rule of SAFE_RULES) {
      if (rule.name === '豹子') {
        if (rule.fn(digits)) { killed = true; break; }
      } else if (rule.name.includes('prev1') || rule.name.includes('(ha1)') || rule.name.includes('(hs1)') || rule.name.includes('(lh1)')) {
        if (rule.fn(digits, prev1)) { killed = true; break; }
      } else if (rule.name.includes('prev2') || rule.name.includes('(ha2)') || rule.name.includes('(hs2)') || rule.name.includes('(lh2)')) {
        if (rule.fn(digits, prev2)) { killed = true; break; }
      }
    }
    
    if (!killed) result.push(s);
  }
  return result;
}

function applyFilters(numbers, sumMin, sumMax, spanMin) {
  return numbers.filter(s => {
    const digits = [+s[0], +s[1], +s[2]];
    const sum = digits[0] + digits[1] + digits[2];
    const span = Math.max(...digits) - Math.min(...digits);
    
    if (sum < sumMin || sum > sumMax) return false;
    if (span < spanMin) return false;
    
    return true;
  });
}

// Test various filter combinations
console.log("=== 精细过滤器测试 ===\n");

const testCases = [
  { sumMin: 5, sumMax: 22, spanMin: 0, label: '和值5-22' },
  { sumMin: 6, sumMax: 21, spanMin: 0, label: '和值6-21' },
  { sumMin: 7, sumMax: 20, spanMin: 0, label: '和值7-20' },
  { sumMin: 8, sumMax: 19, spanMin: 0, label: '和值8-19' },
  { sumMin: 5, sumMax: 22, spanMin: 1, label: '和值5-22+跨度>=1' },
  { sumMin: 5, sumMax: 22, spanMin: 2, label: '和值5-22+跨度>=2' },
  { sumMin: 6, sumMax: 21, spanMin: 1, label: '和值6-21+跨度>=1' },
  { sumMin: 6, sumMax: 21, spanMin: 2, label: '和值6-21+跨度>=2' },
  { sumMin: 7, sumMax: 20, spanMin: 1, label: '和值7-20+跨度>=1' },
  { sumMin: 7, sumMax: 20, spanMin: 2, label: '和值7-20+跨度>=2' },
  { sumMin: 8, sumMax: 19, spanMin: 1, label: '和值8-19+跨度>=1' },
  { sumMin: 8, sumMax: 19, spanMin: 2, label: '和值8-19+跨度>=2' },
];

// Test on last 15 periods
const testStartIdx = allData.length - 16;
const results = {};

for (const tc of testCases) {
  results[tc.label] = { hits: 0, total: 0, counts: [] };
  
  for (let i = testStartIdx + 2; i < allData.length; i++) {
    const cur = allData[i];
    const prev1 = allData[i-1];
    const prev2 = allData[i-2];
    const prev3 = allData[i-3];
    
    const baseNumbers = generateWithSafeRules(prev1, prev2, prev3);
    const filtered = applyFilters(baseNumbers, tc.sumMin, tc.sumMax, tc.spanMin);
    
    const actual = "" + cur.d1 + cur.d2 + cur.d3;
    const hit = filtered.includes(actual);
    
    results[tc.label].hits += hit ? 1 : 0;
    results[tc.label].total++;
    results[tc.label].counts.push(filtered.length);
  }
}

// Print results sorted by count
const sorted = Object.entries(results).sort((a, b) => {
  const avgA = a[1].counts.reduce((s,v) => s+v, 0) / a[1].counts.length;
  const avgB = b[1].counts.reduce((s,v) => s+v, 0) / b[1].counts.length;
  return avgA - avgB;
});

for (const [label, data] of sorted) {
  const avgCount = data.counts.reduce((s,v) => s+v, 0) / data.counts.length;
  const hitRate = (data.hits / data.total * 100).toFixed(1);
  console.log(`${label}: 平均${avgCount.toFixed(0)}注, 命中率${hitRate}% (${data.hits}/${data.total})`);
}

// Find best balance: ~650 notes with >90% hit rate
console.log("\n=== 最优方案筛选 ===");
const candidates = sorted.filter(([label, data]) => {
  const avgCount = data.counts.reduce((s,v) => s+v, 0) / data.counts.length;
  const hitRate = data.hits / data.total * 100;
  return avgCount >= 600 && avgCount <= 700 && hitRate >= 90;
});

if (candidates.length > 0) {
  console.log("\n符合条件的方案:");
  for (const [label, data] of candidates) {
    const avgCount = data.counts.reduce((s,v) => s+v, 0) / data.counts.length;
    const hitRate = (data.hits / data.total * 100).toFixed(1);
    console.log(`  ${label}: ${avgCount.toFixed(0)}注, ${hitRate}%命中率`);
  }
} else {
  console.log("\n无完全符合方案，显示最接近的:");
  const closest = sorted.filter(([label, data]) => {
    const avgCount = data.counts.reduce((s,v) => s+v, 0) / data.counts.length;
    return avgCount >= 600 && avgCount <= 800;
  }).slice(0, 5);
  
  for (const [label, data] of closest) {
    const avgCount = data.counts.reduce((s,v) => s+v, 0) / data.counts.length;
    const hitRate = (data.hits / data.total * 100).toFixed(1);
    console.log(`  ${label}: ${avgCount.toFixed(0)}注, ${hitRate}%命中率`);
  }
}

// Detailed analysis of best candidate
console.log("\n=== 最优方案详情 ===");
const bestLabel = candidates.length > 0 ? candidates[0][0] : sorted.find(([label, data]) => {
  const avgCount = data.counts.reduce((s,v) => s+v, 0) / data.counts.length;
  return avgCount >= 700 && avgCount <= 800;
})[0];

const bestData = results[bestLabel];
console.log(`方案: ${bestLabel}`);
console.log(`总期数: ${bestData.total}`);
console.log(`命中: ${bestData.hits} (${(bestData.hits/bestData.total*100).toFixed(1)}%)`);
console.log(`平均注数: ${(bestData.counts.reduce((s,v) => s+v, 0) / bestData.counts.length).toFixed(0)}`);
console.log(`最少: ${Math.min(...bestData.counts)}, 最多: ${Math.max(...bestData.counts)}`);

// Show each period
console.log("\n各期详情:");
let idx = 0;
for (let i = testStartIdx + 2; i < allData.length; i++) {
  const cur = allData[i];
  const prev1 = allData[i-1];
  const prev2 = allData[i-2];
  const prev3 = allData[i-3];
  
  const baseNumbers = generateWithSafeRules(prev1, prev2, prev3);
  
  // Parse bestLabel to get parameters
  const parts = bestLabel.split('+');
  let sumMin = 5, sumMax = 22, spanMin = 0;
  for (const p of parts) {
    if (p.includes('和值')) {
      const match = p.match(/和值(\d+)-(\d+)/);
      if (match) { sumMin = +match[1]; sumMax = +match[2]; }
    } else if (p.includes('跨度')) {
      const match = p.match(/跨度>=(\d+)/);
      if (match) { spanMin = +match[1]; }
    }
  }
  
  const filtered = applyFilters(baseNumbers, sumMin, sumMax, spanMin);
  const actual = "" + cur.d1 + cur.d2 + cur.d3;
  const hit = filtered.includes(actual);
  
  console.log(`  ${cur.issue}: ${filtered.length}注 ${hit ? '✓' : '✗'} 开奖=${actual}`);
  idx++;
}
