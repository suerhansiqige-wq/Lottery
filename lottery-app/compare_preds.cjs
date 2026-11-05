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
    if (nums.length > 0) preds[period] = new Set(nums);
  }
}

// Compare consecutive predictions
const predPeriods = Object.keys(preds).sort();
for (let i = 1; i < Math.min(predPeriods.length, 6); i++) {
  const p1 = predPeriods[i-1];
  const p2 = predPeriods[i];
  const s1 = preds[p1];
  const s2 = preds[p2];

  const onlyIn1 = [...s1].filter(n => !s2.has(n)).sort();
  const onlyIn2 = [...s2].filter(n => !s1.has(n)).sort();
  const common = [...s1].filter(n => s2.has(n)).length;

  // Get results for context
  const r1 = data2.find(r => String(r[0]) === p1);
  const r2 = data2.find(r => String(r[0]) === p2);
  const prevR1 = data2.find(r => String(r[0]) === String(+p1 - 1));
  const prevR2 = data2.find(r => String(r[0]) === String(+p2 - 1));

  console.log(`\n=== ${p1} (${s1.size}) vs ${p2} (${s2.size}) ===`);
  console.log(`  Common: ${common}, Only in ${p1}: ${onlyIn1.length}, Only in ${p2}: ${onlyIn2.length}`);
  console.log(`  Result ${p1}: ${r1[1]}${r1[2]}${r1[3]}, prev: ${prevR1?prevR1[1]+''+prevR1[2]+''+prevR1[3]:'N/A'}`);
  console.log(`  Result ${p2}: ${r2[1]}${r2[2]}${r2[3]}, prev: ${prevR2?prevR2[1]+''+prevR2[2]+''+prevR2[3]:'N/A'}`);

  if (onlyIn1.length <= 30) {
    console.log(`  Only in ${p1}:`, onlyIn1.join(' '));
  } else {
    console.log(`  Only in ${p1} (first 30):`, onlyIn1.slice(0, 30).join(' '));
  }
  if (onlyIn2.length <= 30) {
    console.log(`  Only in ${p2}:`, onlyIn2.join(' '));
  } else {
    console.log(`  Only in ${p2} (first 30):`, onlyIn2.slice(0, 30).join(' '));
  }
}

// Now let me try a completely different approach
// Look at what the excluded numbers have in common across ALL periods
console.log('\n\n=== NUMBERS EXCLUDED IN ALL PERIODS ===');
let alwaysExcluded = null;
for (const pp of predPeriods) {
  const allNums = new Set();
  for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.add(''+a+b+c);
  const excluded = [...allNums].filter(n => !preds[pp].has(n));
  const exclSet = new Set(excluded);

  if (alwaysExcluded === null) {
    alwaysExcluded = exclSet;
  } else {
    alwaysExcluded = new Set([...alwaysExcluded].filter(n => exclSet.has(n)));
  }
}
console.log('Numbers excluded in ALL 15 periods:', alwaysExcluded ? [...alwaysExcluded].sort().join(' ') : 'none');
console.log('Count:', alwaysExcluded ? alwaysExcluded.size : 0);

// Numbers excluded in at least 10 of 15 periods
console.log('\n=== EXCLUSION FREQUENCY ===');
const exclCount = {};
for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) {
  exclCount[''+a+b+c] = 0;
}
for (const pp of predPeriods) {
  for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) {
    const n = ''+a+b+c;
    if (!preds[pp].has(n)) exclCount[n]++;
  }
}

// Show numbers excluded in >= 10 periods
const freq10 = Object.entries(exclCount).filter(([n,c]) => c >= 10).sort((a,b) => b[1]-a[1]);
console.log('Numbers excluded in >= 10 of 15 periods:', freq10.length);
console.log(freq10.map(([n,c]) => `${n}(${c})`).join(' '));

// Show numbers excluded in ALL 15 periods
const freq15 = Object.entries(exclCount).filter(([n,c]) => c === 15).sort((a,b) => a[0].localeCompare(b[0]));
console.log('\nNumbers excluded in ALL 15 periods:', freq15.length);
console.log(freq15.map(([n,c]) => n).join(' '));

// Show numbers NEVER excluded (in all predictions)
const freq0 = Object.entries(exclCount).filter(([n,c]) => c === 0).sort((a,b) => a[0].localeCompare(b[0]));
console.log('\nNumbers NEVER excluded (in all predictions):', freq0.length);
console.log(freq0.map(([n]) => n).join(' '));
