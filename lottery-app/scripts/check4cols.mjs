import { lotteryData, enrichData } from '../src/data/lotteryData.js';

const data = enrichData(lotteryData);
let count = 0;
let details = [];

for (let i = 0; i < data.length - 1; i++) {
  const cur = data[i];
  const next = data[i + 1];
  if (!cur.danMa || !cur.mustOutNums || !cur.canKaoYi || !cur.canKaoEr) continue;
  
  const win = new Set([next.d1, next.d2, next.d3]);
  const d1 = cur.danMa.filter(d => win.has(d)).length;
  const d2 = cur.mustOutNums.filter(v => v !== -1 && win.has(v)).length;
  const d3 = cur.canKaoYi.filter(d => win.has(d)).length;
  const d4 = cur.canKaoEr.filter(d => win.has(d)).length;
  
  if (d1 === 0 && d2 === 0 && d3 === 0 && d4 === 0) {
    count++;
    details.push(cur.issue + ' -> ' + next.issue + ' (' + next.d1 + next.d2 + next.d3 + ')');
  }
}

console.log('四列全错期数: ' + count);
details.forEach(d => console.log(d));
