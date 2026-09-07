const { lotteryData, enrichData } = require('./lottery-app/src/data/lotteryData.js');
const enriched = enrichData(lotteryData);

function combinations(arr, k) {
  const r = [];
  function bt(s, p) {
    if (p.length === k) { r.push([...p]); return; }
    for (let i = s; i < arr.length; i++) { p.push(arr[i]); bt(i + 1, p); p.pop(); }
  }
  bt(0, []);
  return r;
}

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const r = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) r.push([arr[i], ...p]);
  }
  return r;
}

function generateDirect(gA, gB) {
  const r = new Set();
  for (const a of combinations(gA, 1))
    for (const b of combinations(gB, 2)) {
      const d = [...a, ...b];
      permutations(d).forEach(p => r.add(p.join('')));
    }
  for (const a of combinations(gA, 2))
    for (const b of combinations(gB, 1)) {
      const d = [...a, ...b];
      permutations(d).forEach(p => r.add(p.join('')));
    }
  return [...r];
}

// Test last 10 periods
const testStart = Math.max(0, enriched.length - 10);
for (let i = testStart; i < enriched.length - 1; i++) {
  const item = enriched[i];
  const biShu = item.mustOutNums.filter(v => v !== -1);
  const gB = [0,1,2,3,4,5,6,7,8,9].filter(d => !new Set(biShu).has(d));
  const s2 = item.canKaoYi.filter(d => !new Set(biShu).has(d));
  const s3 = item.canKaoEr.filter(d => !new Set([...biShu, ...item.canKaoYi]).has(d));
  const s4 = item.danMa.filter(d => !new Set([...biShu, ...item.canKaoYi, ...item.canKaoEr]).has(d));

  const step1 = biShu.length > 0 && gB.length > 0 ? generateDirect(biShu, gB) : [];
  const step2 = s2.length > 0 && gB.length > 0 ? generateDirect(s2, gB) : [];
  const step3 = s3.length > 0 && gB.length > 0 ? generateDirect(s3, gB) : [];
  const step4 = s4.length > 0 && gB.length > 0 ? generateDirect(s4, gB) : [];

  const merged = [...new Set([...step1, ...step2, ...step3, ...step4])];
  const next = enriched.find(d => Number(d.issue) === Number(item.issue) + 1);
  const target = next ? '' + next.d1 + next.d2 + next.d3 : '?';
  const hit = merged.includes(target);

  console.log(`${item.issue} -> ${target} | merged:${merged.length} | step1:${step1.length} step2:${step2.length} step3:${step3.length} step4:${step4.length} | hit:${hit}`);
  if (!hit && next) {
    console.log(`  必出:${biShu.join('')} 参1:${item.canKaoYi.join('')} 参2:${item.canKaoEr.join('')} 胆码:${item.danMa.join('')}`);
    console.log(`  过滤后: s2:${s2.join('')} s3:${s3.join('')} s4:${s4.join('')}`);
  }
}
