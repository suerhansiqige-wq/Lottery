// 分析必出号/参考一/参考二 → 胆码 的公式规律
// 数据来自截图

const rows = [
  { bi: [0,3,7,9],       c1: [1,3,7,8],    c2: [2,3,9],       dm: [0,2,6,8] },
  { bi: [0,2,4,5,7,9],   c1: [0,6,7,8],    c2: [0,2,3,9],     dm: [2,3,6,7,8] },
  { bi: [0,2,3,5,7,9],   c1: [4,7,9],      c2: [0,2,3,7,9],   dm: [4,7,9] },
  { bi: [0,2,3,4,6,9],   c1: [1,7],        c2: [0,2,3,4,5,9], dm: [0,1,5,7] },
  { bi: [0,2,3,5,8],     c1: [2,5,6,8,9],  c2: [0,2,3,5,9],   dm: [0,1,2,6,9] },
  { bi: [0,2,6,8,9],     c1: [0,1,9],      c2: [0,2,5,6,9],   dm: [1,5,9] },
  { bi: [0,2,6,9],       c1: [1,4,7,8],    c2: [0,2,5,6,8,9], dm: [2,4,7,8] },
  { bi: [0,2,4,5,9],     c1: [0,4,8],      c2: [0,2,5,6,9],   dm: [0,1,3,6,8,9] },
  { bi: [0,2,4,5,9],     c1: [0,4,5,8],    c2: [0,2,5,6,9],   dm: [0,1,3,6,8,9] },
  { bi: [2,3,5,8],       c1: [2,8,9],      c2: [2,4,5],       dm: [1,4,5,6,9] },
];

function toSet(arr) { return new Set(arr); }
function symDiff(a, b) {
  const sa = toSet(a), sb = toSet(b);
  return [...sa].filter(x => !sb.has(x)).concat([...sb].filter(x => !sa.has(x)));
}
function union(a, b) { return [...new Set([...a, ...b])]; }
function intersect(a, b) { return a.filter(x => toSet(b).has(x)); }
function diff(a, b) { const sb = toSet(b); return a.filter(x => !sb.has(x)); }

console.log('===== 方案1: 对称差集 (必出号 △ (参考一参考二)) =====\n');
let totalHit1 = 0, totalDm1 = 0;
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const c1c2 = union(r.c1, r.c2);
  const sd = symDiff(r.bi, c1c2).sort((a,b)=>a-b);
  const hits = intersect(sd, r.dm);
  const miss = diff(r.dm, sd);
  const extra = diff(sd, r.dm);
  totalHit1 += hits.length;
  totalDm1 += r.dm.length;
  console.log(`Row${i+1}: 必出=${r.bi.join('')} 参1=${r.c1.join('')} 参2=${r.c2.join('')}`);
  console.log(`  对称差集: [${sd.join(',')}] (${sd.length}个)`);
  console.log(`  实际胆码: [${r.dm.join(',')}] (${r.dm.length}个)`);
  console.log(`  命中: [${hits.join(',')}] (${hits.length}/${r.dm.length}) | 多出: [${extra.join(',')}] | 遗漏: [${miss.join(',')}]`);
  console.log('');
}
console.log(`总命中率: ${totalHit1}/${totalDm1} = ${(totalHit1/totalDm1*100).toFixed(1)}%\n`);

console.log('===== 方案2: (参考一参考二) - 必出号 =====\n');
let totalHit2 = 0, totalDm2 = 0;
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const c1c2 = union(r.c1, r.c2);
  const result = diff(c1c2, r.bi).sort((a,b)=>a-b);
  const hits = intersect(result, r.dm);
  const miss = diff(r.dm, result);
  totalHit2 += hits.length;
  totalDm2 += r.dm.length;
  console.log(`Row${i+1}: (参1∪参2)-必出 = [${result.join(',')}] | 胆码=[${r.dm.join('')}] | 命中${hits.length}/${r.dm.length} | 遗漏:[${miss.join(',')}]`);
}
console.log(`\n总命中: ${totalHit2}/${totalDm2} = ${(totalHit2/totalDm2*100).toFixed(1)}%\n`);

console.log('===== 方案3: 三列交集的补集（出现在所有3列中的数字排除）=====\n');
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const all3 = intersect(intersect(r.bi, r.c1), r.c2).sort((a,b)=>a-b);
  const inDm = intersect(all3, r.dm);
  console.log(`Row${i+1}: 三列交集=[${all3.join(',')}] | 在胆码中=[${inDm.join(',')}] ${inDm.length > 0 ? '← 例外!' : '✓ 全部排除'}`);
}

console.log('\n===== 方案4: 参考一△参考二（两参考列对称差）=====\n');
let totalHit4 = 0, totalDm4 = 0;
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const sd = symDiff(r.c1, r.c2).sort((a,b)=>a-b);
  const hits = intersect(sd, r.dm);
  const miss = diff(r.dm, sd);
  totalHit4 += hits.length;
  totalDm4 += r.dm.length;
  console.log(`Row${i+1}: 参1△参2=[${sd.join(',')}] | 胆码=[${r.dm.join('')}] | 命中${hits.length}/${r.dm.length} | 遗漏:[${miss.join(',')}]`);
}
console.log(`\n总命中: ${totalHit4}/${totalDm4} = ${(totalHit4/totalDm4*100).toFixed(1)}%\n`);

console.log('===== 方案5: 综合 - 对称差集中出现频率最高的1-2个数字 =====\n');
// 统计对称差集中每个数字出现在胆码中的频率
const freqMap = {};
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const c1c2 = union(r.c1, r.c2);
  const sd = symDiff(r.bi, c1c2);
  for (const d of sd) {
    if (!freqMap[d]) freqMap[d] = { in: 0, total: 0 };
    freqMap[d].total++;
    if (r.dm.includes(d)) freqMap[d].in++;
  }
}
console.log('对称差集中各数字命中胆码的统计:');
for (const [d, v] of Object.entries(freqMap).sort((a,b) => (b[1].in/b[1].total) - (a[1].in/a[1].total))) {
  console.log(`  数字${d}: 命中${v.in}/${v.total} = ${(v.in/v.total*100).toFixed(0)}%`);
}

console.log('\n===== 方案6: 胆码中不在三列并集中的数字（来自和值/跨度）=====\n');
for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  const allUnion = union(union(r.bi, r.c1), r.c2);
  const outside = diff(r.dm, allUnion).sort((a,b)=>a-b);
  console.log(`Row${i+1}: 三列并集=[${allUnion.sort((a,b)=>a-b).join(',')}] | 胆码中不在并集中的=[${outside.join(',')}]`);
}
