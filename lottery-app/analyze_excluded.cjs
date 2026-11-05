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

// For each prediction period, analyze excluded numbers
const predPeriods = Object.keys(preds).sort();

for (const pp of predPeriods.slice(0, 5)) {
  const predNums = preds[pp];
  const predSet = new Set(predNums);

  const allNums = [];
  for (let a=0;a<=9;a++) for(let b=0;b<=9;b++) for(let c=0;c<=9;c++) allNums.push(''+a+b+c);
  const excluded = allNums.filter(n => !predSet.has(n));

  console.log('=== Period', pp, '(pred:', predNums.length, ', excl:', excluded.length, ') ===');

  // Analyze properties of excluded vs included
  const exclProps = {
    baozi: 0, // 豹子
    zuSan: 0, // 组三
    zuLiu: 0, // 组六
    sumDist: new Array(28).fill(0), // sum 0-27
    spanDist: new Array(10).fill(0), // span 0-9
    oddCount: [0,0,0,0,0], // number of odd digits (0-3)
    bigCount: [0,0,0,0,0], // number of big digits (5-9) (0-3)
    oddEvenPattern: {}, // e.g. "奇奇偶"
  };

  const predProps = {
    baozi: 0, zuSan: 0, zuLiu: 0,
    sumDist: new Array(28).fill(0),
    spanDist: new Array(10).fill(0),
    oddCount: [0,0,0,0,0],
    bigCount: [0,0,0,0,0],
    oddEvenPattern: {},
  };

  for (const n of excluded) {
    const d = [+n[0], +n[1], +n[2]];
    const sum = d[0]+d[1]+d[2];
    const span = Math.max(...d) - Math.min(...d);
    const sorted = [...d].sort();
    const isBaozi = d[0]===d[1] && d[1]===d[2];
    const isZuSan = d[0]===d[1] || d[1]===d[2] || d[0]===d[2];

    if (isBaozi) exclProps.baozi++;
    else if (isZuSan) exclProps.zuSan++;
    else exclProps.zuLiu++;

    exclProps.sumDist[sum]++;
    exclProps.spanDist[span]++;
    const odds = d.filter(x => x%2===1).length;
    exclProps.oddCount[odds]++;
    const bigs = d.filter(x => x>=5).length;
    exclProps.bigCount[bigs]++;

    const pattern = d.map(x => x%2===1 ? 'O' : 'E').join('');
    exclProps.oddEvenPattern[pattern] = (exclProps.oddEvenPattern[pattern]||0) + 1;
  }

  for (const n of predNums) {
    const d = [+n[0], +n[1], +n[2]];
    const sum = d[0]+d[1]+d[2];
    const span = Math.max(...d) - Math.min(...d);
    const isBaozi = d[0]===d[1] && d[1]===d[2];
    const isZuSan = !isBaozi && (d[0]===d[1] || d[1]===d[2] || d[0]===d[2]);

    if (isBaozi) predProps.baozi++;
    else if (isZuSan) predProps.zuSan++;
    else predProps.zuLiu++;

    predProps.sumDist[sum]++;
    predProps.spanDist[span]++;
    const odds = d.filter(x => x%2===1).length;
    predProps.oddCount[odds]++;
    const bigs = d.filter(x => x>=5).length;
    predProps.bigCount[bigs]++;

    const pattern = d.map(x => x%2===1 ? 'O' : 'E').join('');
    predProps.oddEvenPattern[pattern] = (predProps.oddEvenPattern[pattern]||0) + 1;
  }

  console.log('  Excluded - 豹子:', exclProps.baozi, '组三:', exclProps.zuSan, '组六:', exclProps.zuLiu);
  console.log('  Predict  - 豹子:', predProps.baozi, '组三:', predProps.zuSan, '组六:', predProps.zuLiu);

  // Check: are ALL 豹子 excluded?
  console.log('  All 豹子 excluded?', exclProps.baozi === 10);

  // Odd digit count distribution
  console.log('  Excl odd-count dist:', exclProps.oddCount);
  console.log('  Pred odd-count dist:', predProps.oddCount);

  // Big digit count distribution
  console.log('  Excl big-count dist:', exclProps.bigCount);
  console.log('  Pred big-count dist:', predProps.bigCount);

  // Odd/Even pattern distribution
  console.log('  Excl OE patterns:', JSON.stringify(exclProps.oddEvenPattern));
  console.log('  Pred OE patterns:', JSON.stringify(predProps.oddEvenPattern));

  // Sum distribution - show which sums are heavily excluded
  const sumExclRate = [];
  for (let s = 0; s < 28; s++) {
    const total = exclProps.sumDist[s] + predProps.sumDist[s];
    const rate = total > 0 ? exclProps.sumDist[s] / total : 0;
    sumExclRate.push({sum: s, rate: rate.toFixed(2), excl: exclProps.sumDist[s], pred: predProps.sumDist[s]});
  }
  // Show sums with >50% exclusion rate
  const highExclSums = sumExclRate.filter(s => parseFloat(s.rate) > 0.5);
  console.log('  High-exclusion sums (>50%):', highExclSums.map(s => `${s.sum}(${s.rate})`).join(', '));

  // Span distribution
  console.log('  Excl span dist:', exclProps.spanDist);
  console.log('  Pred span dist:', predProps.spanDist);

  // Check: what's the total of all 1000 numbers by type?
  // 豹子: 10, 组三: 270, 组六: 720
  console.log('  Expected: 豹子=10, 组三=270, 组六=720');
  console.log('');
}
