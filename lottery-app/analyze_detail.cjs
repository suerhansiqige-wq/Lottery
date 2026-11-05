const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/boloor/Desktop/新黄金三格.xlsm', {type:'binary'});
const ws2 = wb.Sheets['福 (2)'];
const data2 = XLSX.utils.sheet_to_json(ws2, {header:1});

const preds = {};
for (let i = 1; i < data2.length; i++) {
  const row = data2[i];
  if (row[0] && row[4]) {
    const period = String(row[0]);
    const predStr = String(row[4]).trim();
    const nums = predStr.split(/\s+/).filter(s => /^\d{3}$/.test(s));
    if (nums.length > 0) preds[period] = nums;
  }
}

// Focus on period 26268
const pp = '26268';
const predNums = preds[pp];
const predSet = new Set(predNums);

const allNums = [];
for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);
const excluded = allNums.filter(n => !predSet.has(n)).sort();

console.log('Period', pp, '- Pred:', predNums.length, 'Excluded:', excluded.length);
console.log('\nAll excluded numbers:');
console.log(excluded.join(' '));

// Now let's look at what properties excluded numbers share
// Analysis for prev period (26267): result 8,5,7
const prevResult = {d1:8, d2:5, d3:7};
const hAdd = [(8+5)%10, (5+7)%10, (7+8)%10]; // [3,2,5]
const hSub = [Math.abs(8-5), Math.abs(5-7), Math.abs(7-8)]; // [3,2,1]

// Analysis for period 26268 itself: result 3,5,2 (from sheet 2)
// Wait, let me get the actual result from the sheet
const row26268 = data2.find(r => String(r[0]) === '26268');
console.log('\nPeriod 26268 result:', row26268[1], row26268[2], row26268[3]);

// Prev period result
const row26267 = data2.find(r => String(r[0]) === '26267');
console.log('Period 26267 result:', row26267[1], row26267[2], row26267[3]);

// Compute analysis for 26267
const r267 = {d1: +row26267[1], d2: +row26267[2], d3: +row26267[3]};
const hAdd267 = [(r267.d1+r267.d2)%10, (r267.d2+r267.d3)%10, (r267.d3+r267.d1)%10];
const hSub267 = [Math.abs(r267.d1-r267.d2), Math.abs(r267.d2-r267.d3), Math.abs(r267.d3-r267.d1)];

// Compute analysis for 26266
const row26266 = data2.find(r => String(r[0]) === '26266');
const r266 = {d1: +row26266[1], d2: +row26266[2], d3: +row26266[3]};
const hAdd266 = [(r266.d1+r266.d2)%10, (r266.d2+r266.d3)%10, (r266.d3+r266.d1)%10];
const hSub266 = [Math.abs(r266.d1-r266.d2), Math.abs(r266.d2-r266.d3), Math.abs(r266.d3-r266.d1)];

// vAdd/vSub for 26267 (relative to 26266)
const vAdd267 = [(r267.d1+r266.d1)%10, (r267.d2+r266.d2)%10, (r267.d3+r266.d3)%10];
const vSub267 = [Math.abs(r267.d1-r266.d1), Math.abs(r267.d2-r266.d2), Math.abs(r267.d3-r266.d3)];

console.log('\n26266 result:', r266.d1, r266.d2, r266.d3);
console.log('26266 hAdd:', hAdd266, 'hSub:', hSub266);
console.log('\n26267 result:', r267.d1, r267.d2, r267.d3);
console.log('26267 hAdd:', hAdd267, 'hSub:', hSub267);
console.log('26267 vAdd:', vAdd267, 'vSub:', vSub267);

// Now let's check: for each excluded number, which digits does it contain?
// And compare with the analysis values
console.log('\n=== Checking excluded numbers against analysis values ===');

// Check: does every excluded number contain at least one digit from hAdd267?
const hAddSet = new Set(hAdd267);
const hSubSet = new Set(hSub267);
const vAddSet = new Set(vAdd267);
const vSubSet = new Set(vSub267);
const allAnalysis = new Set([...hAdd267, ...hSub267, ...vAdd267, ...vSub267]);

console.log('hAdd267:', hAdd267, '→ set:', [...hAddSet]);
console.log('hSub267:', hSub267, '→ set:', [...hSubSet]);
console.log('vAdd267:', vAdd267, '→ set:', [...vAddSet]);
console.log('vSub267:', vSub267, '→ set:', [...vSubSet]);
console.log('Union of all:', [...allAnalysis].sort());

// Count how many excluded numbers have ALL digits in the union
const exclAllInUnion = excluded.filter(n => {
  const d = [+n[0], +n[1], +n[2]];
  return d.every(x => allAnalysis.has(x));
});
console.log('Excl with ALL digits in union:', exclAllInUnion.length, '/', excluded.length);

// Count how many excluded numbers have NO digit in the union
const exclNoneInUnion = excluded.filter(n => {
  const d = [+n[0], +n[1], +n[2]];
  return d.every(x => !allAnalysis.has(x));
});
console.log('Excl with NO digit in union:', exclNoneInUnion.length, '/', excluded.length);

// Count how many excluded numbers have at least one digit in hAdd
const exclInHadd = excluded.filter(n => {
  const d = [+n[0], +n[1], +n[2]];
  return d.some(x => hAddSet.has(x));
});
console.log('Excl with ≥1 digit in hAdd:', exclInHadd.length, '/', excluded.length);

// Count how many excluded numbers have at least one digit in hSub
const exclInHsub = excluded.filter(n => {
  const d = [+n[0], +n[1], +n[2]];
  return d.some(x => hSubSet.has(x));
});
console.log('Excl with ≥1 digit in hSub:', exclInHsub.length, '/', excluded.length);

// Let me try: excluded = numbers where d1 is in some kill set for pos 0
// OR d2 is in some kill set for pos 1, etc.
// But we already know all 10 digits appear in every position.

// Let me try: look at 2-digit pairs that are excluded
console.log('\n=== 2-digit pair analysis ===');
const pairCount = {};
for (const n of excluded) {
  const p01 = n[0]+n[1];
  const p12 = n[1]+n[2];
  const p02 = n[0]+n[2];
  pairCount[p01] = (pairCount[p01]||0) + 1;
  pairCount[p12] = (pairCount[p12]||0) + 1;
  pairCount[p02] = (pairCount[p02]||0) + 1;
}

// Which pairs appear most in excluded?
const sortedPairs = Object.entries(pairCount).sort((a,b) => b[1]-a[1]);
console.log('Top 20 most excluded pairs:');
for (const [pair, count] of sortedPairs.slice(0, 20)) {
  console.log(`  ${pair}: ${count}`);
}

// Which pairs appear least?
console.log('Bottom 20 least excluded pairs:');
for (const [pair, count] of sortedPairs.slice(-20)) {
  console.log(`  ${pair}: ${count}`);
}

// Expected: if uniform, each pair would appear ~342/100 = 3.42 times (for 100 possible pairs)
// But some pairs appear much more

// Let me check: for pos0-pos1, which pairs are NEVER excluded?
const allPairs01 = new Set();
for (const n of excluded) allPairs01.add(n[0]+n[1]);
console.log('\nUnique pos01 pairs in excluded:', allPairs01.size, '(max 100)');

// Which pos01 pairs are NOT in excluded?
const missingPairs01 = [];
for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) {
  if (!allPairs01.has(''+a+b)) missingPairs01.push(''+a+b);
}
console.log('Pos01 pairs NOT excluded (all numbers with these pairs are in prediction):', missingPairs01);
