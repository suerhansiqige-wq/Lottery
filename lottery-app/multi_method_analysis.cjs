const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/boloor/Desktop/新黄金三格.xlsm', {type:'binary'});

const ws1 = wb.Sheets['福'];
const ws2 = wb.Sheets['福 (2)'];
const data1 = XLSX.utils.sheet_to_json(ws1, {header:1});
const data2 = XLSX.utils.sheet_to_json(ws2, {header:1});

const allRows = [...data1.slice(1), ...data2.slice(1)];
const resultMap = {};
for (const row of allRows) {
  if (row[0] && row[1]!=null && row[2]!=null && row[3]!=null) {
    const period = String(row[0]);
    const d1 = Number(row[1]), d2 = Number(row[2]), d3 = Number(row[3]);
    if (!isNaN(d1) && !isNaN(d2) && !isNaN(d3)) resultMap[period] = {d1, d2, d3};
  }
}

const preds = {};
for (let i = 1; i < data2.length; i++) {
  const row = data2[i];
  if (row[0] && row[4]) {
    const period = String(row[0]);
    const predStr = String(row[4]).trim();
    const nums = predStr.split(/\s+/).filter(s => /^\d{3}$/.test(s));
    if (nums.length > 0) preds[period] = new Set(nums);
  }
}

const periods = Object.keys(resultMap).sort();
const analysis = {};
let prevG2 = [null,null,null,null,null,null,null,null,null,null];

for (const p of periods) {
  const r = resultMap[p];
  const idx = periods.indexOf(p);
  const prev = idx > 0 ? resultMap[periods[idx-1]] : null;
  const prev2 = idx > 1 ? resultMap[periods[idx-2]] : null;

  const hAdd = [(r.d1+r.d2)%10, (r.d2+r.d3)%10, (r.d3+r.d1)%10];
  const hSub = [Math.abs(r.d1-r.d2), Math.abs(r.d2-r.d3), Math.abs(r.d3-r.d1)];
  const vAdd = prev ? [(r.d1+prev.d1)%10, (r.d2+prev.d2)%10, (r.d3+prev.d3)%10] : [null,null,null];
  const vSub = prev ? [Math.abs(r.d1-prev.d1), Math.abs(r.d2-prev.d2), Math.abs(r.d3-prev.d3)] : [null,null,null];

  const g2 = prevG2.map(v => v);
  const sheng = [];
  for (let d = 0; d <= 9; d++) {
    if (g2[d] === null) sheng.push(d);
    if ([r.d1, r.d2, r.d3].includes(d)) { g2[d] = null; }
    else { if (g2[d] === null) g2[d] = 1; else g2[d] = (g2[d] || 0) + 1; }
  }

  const s = new Set([r.d1, r.d2, r.d3]);
  const lian = new Set();
  for (const v of s) { if (v > 0 && !s.has(v-1)) lian.add(v-1); if (v < 9 && !s.has(v+1)) lian.add(v+1); }

  const shengSet = new Set(sheng);
  const bichu = [];
  for (let d = 0; d <= 9; d++) { if (!shengSet.has(d) && !lian.has(d)) bichu.push(d); }

  analysis[p] = {hAdd, hSub, vAdd, vSub, shenghao: sheng, lianhao: [...lian], bichu, result: r, digits: [r.d1, r.d2, r.d3]};
  prevG2 = g2;
}

function computeHuibuYilou(p, periods, analysis) {
  const idx = periods.indexOf(p);
  const p1 = periods[idx-1], p2 = idx>=2 ? periods[idx-2] : null, p3 = idx>=3 ? periods[idx-3] : null;
  const a1 = analysis[p1];
  const a2 = p2 ? analysis[p2] : null;
  const a3 = p3 ? analysis[p3] : null;

  const hSet1 = new Set([...a1.hAdd, ...a1.hSub]);
  const hSet2 = a2 ? new Set([...a2.hAdd, ...a2.hSub]) : new Set();
  const hSet3 = a3 ? new Set([...a3.hAdd, ...a3.hSub]) : new Set();
  const hUnion2 = new Set([...hSet1, ...hSet2]);
  const hUnion3 = new Set([...hSet1, ...hSet2, ...hSet3]);
  const hHuibu = []; for (let d=0;d<=9;d++) if(!hUnion2.has(d)) hHuibu.push(d);
  const hYilou = []; for (let d=0;d<=9;d++) if(!hUnion3.has(d)) hYilou.push(d);

  const vSet1 = new Set([...(a1.vAdd||[]).filter(x=>x!==null), ...(a1.vSub||[]).filter(x=>x!==null)]);
  const vSet2 = a2 ? new Set([...(a2.vAdd||[]).filter(x=>x!==null), ...(a2.vSub||[]).filter(x=>x!==null)]) : new Set();
  const vSet3 = a3 ? new Set([...(a3.vAdd||[]).filter(x=>x!==null), ...(a3.vSub||[]).filter(x=>x!==null)]) : new Set();
  const vUnion2 = new Set([...vSet1, ...vSet2]);
  const vUnion3 = new Set([...vSet1, ...vSet2, ...vSet3]);
  const vHuibu = []; for (let d=0;d<=9;d++) if(!vUnion2.has(d)) vHuibu.push(d);
  const vYilou = []; for (let d=0;d<=9;d++) if(!vUnion3.has(d)) vYilou.push(d);

  return {hHuibu, hYilou, vHuibu, vYilou, hSet1, hSet2, hSet3, vSet1, vSet2, vSet3, a1, a2, a3, p1, p2, p3};
}

const allNums = [];
for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);
const baoziSet = new Set(allNums.filter(n => n[0]===n[1] && n[1]===n[2]));

const predPeriods = Object.keys(preds).sort();

console.log('==============================================');
console.log('PART 1: Per-position digit frequency in predictions');
console.log('==============================================');

for (const pp of predPeriods) {
  const predArr = [...preds[pp]];
  const posDigits = [{},{},{}];
  for (let pos = 0; pos < 3; pos++) {
    for (let d = 0; d <= 9; d++) posDigits[pos][d] = 0;
    for (const n of predArr) posDigits[pos][+n[pos]]++;
  }

  const idx = periods.indexOf(pp);
  const ctx = computeHuibuYilou(pp, periods, analysis);

  console.log(`\n=== Period ${pp} (pred: ${predArr.length}) ===`);
  console.log(`  Prev results: ${ctx.p1}=${ctx.a1.result.d1}${ctx.a1.result.d2}${ctx.a1.result.d3}` +
    (ctx.p2 ? `, ${ctx.p2}=${ctx.a2.result.d1}${ctx.a2.result.d2}${ctx.a2.result.d3}` : '') +
    (ctx.p3 ? `, ${ctx.p3}=${ctx.a3.result.d1}${ctx.a3.result.d2}${ctx.a3.result.d3}` : ''));

  for (let pos = 0; pos < 3; pos++) {
    const missing = [];
    for (let d = 0; d <= 9; d++) {
      if (posDigits[pos][d] === 0) missing.push(d);
    }
    const sorted = Object.entries(posDigits[pos]).sort((a,b) => a[0]-b[0]);
    const dist = sorted.map(([d,c]) => c).join(',');
    console.log(`  Pos${pos}: dist=[${dist}] missing=[${missing}]`);

    const r1d = ctx.a1.result[`d${pos+1}`];
    console.log(`    N-1 result[${pos}]=${r1d}, hAdd[${pos}]=${ctx.a1.hAdd[pos]}, hSub[${pos}]=${ctx.a1.hSub[pos]}` +
      (ctx.a1.vAdd[0]!==null ? `, vAdd[${pos}]=${ctx.a1.vAdd[pos]}, vSub[${pos}]=${ctx.a1.vSub[pos]}` : ''));
  }

  console.log(`  生号=[${ctx.a1.shenghao}] 连号=[${ctx.a1.lianhao}] 必出号=[${ctx.a1.bichu}]`);
  console.log(`  横回补=[${ctx.hHuibu}] 横遗漏=[${ctx.hYilou}] 竖回补=[${ctx.vHuibu}] 竖遗漏=[${ctx.vYilou}]`);
}

console.log('\n\n==============================================');
console.log('PART 2: Never-excluded numbers analysis');
console.log('==============================================');

let neverExcluded = null;
for (const pp of predPeriods) {
  if (neverExcluded === null) {
    neverExcluded = new Set(allNums.filter(n => preds[pp].has(n)));
  } else {
    const newSet = new Set();
    for (const n of neverExcluded) {
      if (preds[pp].has(n)) newSet.add(n);
    }
    neverExcluded = newSet;
  }
}

console.log('Never excluded:', [...neverExcluded].sort().join(' '), '(', neverExcluded.size, ')');

const neList = [...neverExcluded].sort();
for (const n of neList) {
  const d = [+n[0], +n[1], +n[2]];
  const sum = d[0]+d[1]+d[2];
  const span = Math.max(...d) - Math.min(...d);
  const isZuSan = d[0]===d[1] || d[1]===d[2] || d[0]===d[2];
  console.log(`  ${n}: sum=${sum} span=${span} type=${isZuSan?'组三':'组六'} digits=[${d.join(',')}]`);
}

console.log('\n\n==============================================');
console.log('PART 3: Multi-method generation hypotheses');
console.log('==============================================');

for (const pp of predPeriods) {
  const predSet = preds[pp];
  const excluded = new Set(allNums.filter(n => !predSet.has(n)));
  const ctx = computeHuibuYilou(pp, periods, analysis);
  const {a1, a2, a3} = ctx;

  console.log(`\n=== Period ${pp} (pred: ${predSet.size}, excl: ${excluded.size}) ===`);

  // Method A: Generate all numbers using digits from {N-1 result digits} x {N-2 result digits} x {N-3 result digits}
  // i.e., pos0 from N-1, pos1 from N-2, pos2 from N-3
  if (a2 && a3) {
    const d1 = a1.digits, d2 = a2.digits, d3 = a3.digits;
    const genA = new Set();
    for (const a of d1) for (const b of d2) for (const c of d3) genA.add(''+a+b+c);
    const matchA = [...genA].filter(n => predSet.has(n)).length;
    console.log(`  A (N-1×N-2×N-3 digits): ${genA.size} nums, ${matchA} in pred`);
  }

  // Method B: All permutations of all 3-digit subsets from N-1 result digits
  {
    const ds = a1.digits;
    const genB = new Set();
    const perms = (arr) => {
      if (arr.length <= 1) return [arr];
      const result = [];
      for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0,i), ...arr.slice(i+1)];
        for (const p of perms(rest)) result.push([arr[i], ...p]);
      }
      return result;
    };
    // All 3-combos from 3 digits (with replacement)
    for (const a of ds) for (const b of ds) for (const c of ds) genB.add(''+a+b+c);
    const matchB = [...genB].filter(n => predSet.has(n)).length;
    console.log(`  B (N-1 digits ^3): ${genB.size} nums, ${matchB} in pred`);
  }

  // Method C: hAdd values from 3 periods combined
  {
    const digitPool = new Set([...a1.hAdd, ...(a2?a2.hAdd:[]), ...(a3?a3.hAdd:[])]);
    const genC = new Set();
    const dp = [...digitPool];
    for (const a of dp) for (const b of dp) for (const c of dp) genC.add(''+a+b+c);
    const matchC = [...genC].filter(n => predSet.has(n)).length;
    console.log(`  C (hAdd pool=[${dp}]): ${genC.size} nums, ${matchC} in pred`);
  }

  // Method D: hAdd∪hSub from 3 periods
  {
    const digitPool = new Set([...a1.hAdd, ...a1.hSub, ...(a2?[...a2.hAdd,...a2.hSub]:[]), ...(a3?[...a3.hAdd,...a3.hSub]:[])]);
    const dp = [...digitPool].sort();
    const genD = new Set();
    for (const a of dp) for (const b of dp) for (const c of dp) genD.add(''+a+b+c);
    const matchD = [...genD].filter(n => predSet.has(n)).length;
    console.log(`  D (hAdd∪hSub pool=[${dp}]): ${genD.size} nums, ${matchD} in pred`);
  }

  // Method E: All analysis digits from N-1 (hAdd, hSub, vAdd, vSub)
  {
    const pool = new Set([...a1.hAdd, ...a1.hSub]);
    if (a1.vAdd[0] !== null) { pool.add(a1.vAdd[0]); pool.add(a1.vAdd[1]); pool.add(a1.vAdd[2]); }
    if (a1.vSub[0] !== null) { pool.add(a1.vSub[0]); pool.add(a1.vSub[1]); pool.add(a1.vSub[2]); }
    const dp = [...pool].sort();
    const genE = new Set();
    for (const a of dp) for (const b of dp) for (const c of dp) genE.add(''+a+b+c);
    const matchE = [...genE].filter(n => predSet.has(n)).length;
    console.log(`  E (N-1 all analysis=[${dp}]): ${genE.size} nums, ${matchE} in pred`);
  }

  // Method F: 必出号 ∪ 生号 ∪ 连号 from N-1
  {
    const pool = new Set([...a1.bichu, ...a1.shenghao, ...a1.lianhao]);
    const dp = [...pool].sort();
    const genF = new Set();
    for (const a of dp) for (const b of dp) for (const c of dp) genF.add(''+a+b+c);
    const matchF = [...genF].filter(n => predSet.has(n)).length;
    console.log(`  F (必出∪生∪连=[${dp}]): ${genF.size} nums, ${matchF} in pred`);
  }

  // Method G: Complement of 横回补 ∪ 竖回补
  {
    const killPool = new Set([...ctx.hHuibu, ...ctx.vHuibu]);
    const keepPool = [];
    for (let d = 0; d <= 9; d++) if (!killPool.has(d)) keepPool.push(d);
    const genG = new Set();
    for (const a of keepPool) for (const b of keepPool) for (const c of keepPool) genG.add(''+a+b+c);
    const matchG = [...genG].filter(n => predSet.has(n)).length;
    console.log(`  G (complement of 横回补∪竖回补=[${keepPool}]): ${genG.size} nums, ${matchG} in pred`);
  }

  // Method H: Union of multiple generation methods
  {
    // H1: N-1 digits^3 ∪ N-2 digits^3 ∪ N-3 digits^3
    if (a2 && a3) {
      const genH1 = new Set();
      for (const ds of [a1.digits, a2.digits, a3.digits]) {
        for (const a of ds) for (const b of ds) for (const c of ds) genH1.add(''+a+b+c);
      }
      const matchH1 = [...genH1].filter(n => predSet.has(n)).length;
      console.log(`  H1 (union of 3 periods digits^3): ${genH1.size} nums, ${matchH1} in pred`);
    }

    // H2: hAdd^3 ∪ hSub^3 ∪ vAdd^3 ∪ vSub^3 from N-1
    {
      const genH2 = new Set();
      const sets = [a1.hAdd];
      sets.push(a1.hSub);
      if (a1.vAdd[0] !== null) { sets.push(a1.vAdd); sets.push(a1.vSub); }
      for (const s of sets) {
        for (const a of s) for (const b of s) for (const c of s) genH2.add(''+a+b+c);
      }
      const matchH2 = [...genH2].filter(n => predSet.has(n)).length;
      console.log(`  H2 (hAdd^3∪hSub^3∪vAdd^3∪vSub^3 N-1): ${genH2.size} nums, ${matchH2} in pred`);
    }

    // H3: Per-period generation then union
    // For each period: take its hAdd∪hSub as digit pool, generate all 3-combos
    {
      const genH3 = new Set();
      for (const a of [a1, a2, a3].filter(Boolean)) {
        const pool = new Set([...a.hAdd, ...a.hSub]);
        const dp = [...pool];
        for (const x of dp) for (const y of dp) for (const z of dp) genH3.add(''+x+y+z);
      }
      const matchH3 = [...genH3].filter(n => predSet.has(n)).length;
      console.log(`  H3 (per-period hAdd∪hSub ^3 union): ${genH3.size} nums, ${matchH3} in pred`);
    }
  }

  // Method I: Position-specific generation
  // pos0 from hAdd[0] of 3 periods, pos1 from hAdd[1], pos2 from hAdd[2]
  if (a2 && a3) {
    const pos0Set = new Set([a1.hAdd[0], a2.hAdd[0], a3.hAdd[0]]);
    const pos1Set = new Set([a1.hAdd[1], a2.hAdd[1], a3.hAdd[1]]);
    const pos2Set = new Set([a1.hAdd[2], a2.hAdd[2], a3.hAdd[2]]);
    const genI = new Set();
    for (const a of pos0Set) for (const b of pos1Set) for (const c of pos2Set) genI.add(''+a+b+c);
    const matchI = [...genI].filter(n => predSet.has(n)).length;
    console.log(`  I (pos-specific hAdd: ${[...pos0Set]}×${[...pos1Set]}×${[...pos2Set]}): ${genI.size} nums, ${matchI} in pred`);
  }

  // Method J: Position-specific from ALL analysis values across 3 periods
  if (a2 && a3) {
    const pos0 = new Set(), pos1 = new Set(), pos2 = new Set();
    for (const a of [a1, a2, a3]) {
      pos0.add(a.hAdd[0]); pos0.add(a.hSub[0]);
      pos1.add(a.hAdd[1]); pos1.add(a.hSub[1]);
      pos2.add(a.hAdd[2]); pos2.add(a.hSub[2]);
      if (a.vAdd[0] !== null) {
        pos0.add(a.vAdd[0]); pos0.add(a.vSub[0]);
        pos1.add(a.vAdd[1]); pos1.add(a.vSub[1]);
        pos2.add(a.vAdd[2]); pos2.add(a.vSub[2]);
      }
    }
    const genJ = new Set();
    for (const a of pos0) for (const b of pos1) for (const c of pos2) genJ.add(''+a+b+c);
    const matchJ = [...genJ].filter(n => predSet.has(n)).length;
    console.log(`  J (pos-specific all: ${[...pos0].sort()}×${[...pos1].sort()}×${[...pos2].sort()}): ${genJ.size} nums, ${matchJ} in pred`);
  }

  // Method K: Generate from 回补/遗漏 digit pools
  {
    // K1: all numbers where at least one digit is in 横回补
    const huibuSet = new Set(ctx.hHuibu);
    const genK1 = new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].some(d => huibuSet.has(d))));
    const matchK1 = [...genK1].filter(n => predSet.has(n)).length;

    // K2: all numbers where at least one digit is in 竖回补
    const vhuibuSet = new Set(ctx.vHuibu);
    const genK2 = new Set(allNums.filter(n => [+n[0],+n[1],+n[2]].some(d => vhuibuSet.has(d))));
    const matchK2 = [...genK2].filter(n => predSet.has(n)).length;

    // K3: union of K1 and K2
    const genK3 = new Set([...genK1, ...genK2]);
    const matchK3 = [...genK3].filter(n => predSet.has(n)).length;

    console.log(`  K1 (≥1 digit in 横回补[${ctx.hHuibu}]): ${genK1.size}, match: ${matchK1}`);
    console.log(`  K2 (≥1 digit in 竖回补[${ctx.vHuibu}]): ${genK2.size}, match: ${matchK2}`);
    console.log(`  K3 (K1∪K2): ${genK3.size}, match: ${matchK3}`);
  }

  // Method L: Exclude = 豹子 ∪ {all digits in 横回补} ∪ {all digits in 竖回补}
  // Then check if prediction = 1000 - exclude
  {
    const huibuSet = new Set(ctx.hHuibu);
    const vhuibuSet = new Set(ctx.vHuibu);
    const excl = new Set();
    for (const n of allNums) {
      if (n[0]===n[1] && n[1]===n[2]) { excl.add(n); continue; }
      const d = [+n[0],+n[1],+n[2]];
      if (d.every(x => huibuSet.has(x))) { excl.add(n); continue; }
      if (d.every(x => vhuibuSet.has(x))) { excl.add(n); continue; }
    }
    const predSize = 1000 - excl.size;
    const match = allNums.filter(n => !excl.has(n) && predSet.has(n)).length;
    console.log(`  L (1000 - 豹子 - allIn横回补 - allIn竖回补): pred=${predSize}, match=${match}`);
  }

  // Method M: Use 3-period kill per position
  // Kill at pos_j = union of hAdd[j] and hSub[j] from N-1, N-2, N-3
  if (a2 && a3) {
    const killPos = [new Set(), new Set(), new Set()];
    for (const a of [a1, a2, a3]) {
      for (let j = 0; j < 3; j++) {
        killPos[j].add(a.hAdd[j]);
        killPos[j].add(a.hSub[j]);
      }
    }
    const genM = new Set(allNums.filter(n =>
      !killPos[0].has(+n[0]) && !killPos[1].has(+n[1]) && !killPos[2].has(+n[2])
    ));
    const matchM = [...genM].filter(n => predSet.has(n)).length;
    console.log(`  M (3-period hAdd+hSub kill: [${[...killPos[0]].sort()}]×[${[...killPos[1]].sort()}]×[${[...killPos[2]].sort()}]): ${genM.size} nums, ${matchM} in pred`);

    // M2: Same but also kill vAdd and vSub
    const killPos2 = [new Set(), new Set(), new Set()];
    for (const a of [a1, a2, a3]) {
      for (let j = 0; j < 3; j++) {
        killPos2[j].add(a.hAdd[j]);
        killPos2[j].add(a.hSub[j]);
        if (a.vAdd[0] !== null) {
          killPos2[j].add(a.vAdd[j]);
          killPos2[j].add(a.vSub[j]);
        }
      }
    }
    const genM2 = new Set(allNums.filter(n =>
      !killPos2[0].has(+n[0]) && !killPos2[1].has(+n[1]) && !killPos2[2].has(+n[2])
    ));
    const matchM2 = [...genM2].filter(n => predSet.has(n)).length;
    console.log(`  M2 (3-period all4 kill: [${[...killPos2[0]].sort()}]×[${[...killPos2[1]].sort()}]×[${[...killPos2[2]].sort()}]): ${genM2.size} nums, ${matchM2} in pred`);

    // M3: 2-period (N-1,N-2 only) hAdd+hSub kill
    const killPos3 = [new Set(), new Set(), new Set()];
    for (const a of [a1, a2]) {
      for (let j = 0; j < 3; j++) {
        killPos3[j].add(a.hAdd[j]);
        killPos3[j].add(a.hSub[j]);
      }
    }
    const genM3 = new Set(allNums.filter(n =>
      !killPos3[0].has(+n[0]) && !killPos3[1].has(+n[1]) && !killPos3[2].has(+n[2])
    ));
    const matchM3 = [...genM3].filter(n => predSet.has(n)).length;
    console.log(`  M3 (2-period hAdd+hSub kill: [${[...killPos3[0]].sort()}]×[${[...killPos3[1]].sort()}]×[${[...killPos3[2]].sort()}]): ${genM3.size} nums, ${matchM3} in pred`);
  }
}
