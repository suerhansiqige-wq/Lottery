// 校验：Excel「黄金三格」福表 G~R 列（横相减/横相加/竖相减/竖相加）逻辑
// 1) Excel 自校验：用 Excel 自己的 B/C/D（及上一行 B/C/D）复算 G~R，确认公式口径
// 2) 应用校验：lotteryData 按 App.jsx 同样规则（Map去重 + 期号升序）后，比对 enrichData 结果
//    仅对「期号相同且开奖号相同」的行比对（Excel 早期行 A 列用 ROW()+23000 生成，期号有漂移）
import XLSX from 'xlsx';
import { lotteryData } from './src/data/lotteryData.js';
import { enrichData } from './src/data/enrichDataOptimized.js';

const wb = XLSX.readFile('c:\\Users\\boloor\\Desktop\\黄金三格.xlsx', { cellFormula: false });
const ws = wb.Sheets['福'];
const range = XLSX.utils.decode_range(ws['!ref']);
const num = (addr) => { const c = ws[addr]; return c && c.v !== '' && c.v !== undefined ? Number(c.v) : null; };

// 收集 Excel 行：{ issue, d:[B,C,D], v:[G..R] }
const rows = [];
for (let r = range.s.r + 1; r <= range.e.r; r++) {
  const issue = num('A' + (r + 1));
  const b = num('B' + (r + 1));
  if (issue === null || b === null) continue;
  rows.push({
    issue: String(issue),
    d: [b, num('C' + (r + 1)), num('D' + (r + 1))],
    v: ['G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R'].map(c => num(c + (r + 1))),
  });
}

// ===== 1) Excel 自校验 =====
const tail10 = (x) => (x >= 10 ? x - 10 : x);
let selfBad = 0, selfChecked = 0;
const selfSamples = [];
for (let i = 0; i < rows.length; i++) {
  const [b, c, d] = rows[i].d;
  const prev = i > 0 ? rows[i - 1].d : null;
  const exp = [
    Math.abs(b - c), Math.abs(c - d), Math.abs(b - d),
    tail10(b + c), tail10(c + d), tail10(b + d),
    ...(prev ? [Math.abs(prev[0] - b), Math.abs(prev[1] - c), Math.abs(prev[2] - d),
      tail10(prev[0] + b), tail10(prev[1] + c), tail10(prev[2] + d)] : [null, null, null, null, null, null]),
  ];
  selfChecked++;
  for (let k = 0; k < 12; k++) {
    const e = rows[i].v[k], m = exp[k];
    if (e === null || m === null) continue;
    if (e !== m) {
      selfBad++;
      if (selfSamples.length < 5) selfSamples.push(`Excel行${i + 2} 期${rows[i].issue} 第${k}列 Excel=${e} 复算=${m}`);
      break;
    }
  }
}
console.log(`[Excel自校验] 行数=${selfChecked} 不符=${selfBad}`);
selfSamples.forEach(s => console.log('  ' + s));

// ===== 2) 应用侧校验 =====
const issueMap = new Map();
for (const it of lotteryData) if (!issueMap.has(it.issue)) issueMap.set(it.issue, it);
const baseData = [...issueMap.values()].sort((a, b) => Number(a.issue) - Number(b.issue));
const enriched = enrichData(baseData, 0);
const appMap = new Map(enriched.map(it => [String(it.issue), it]));

let cmp = 0, bad = 0, skippedDraw = 0;
const samples = [];
for (let i = 0; i < rows.length; i++) {
  const ex = rows[i];
  const app = appMap.get(ex.issue);
  if (!app) continue;
  if (app.d1 !== ex.d[0] || app.d2 !== ex.d[1] || app.d3 !== ex.d[2]) { skippedDraw++; continue; }
  const mine = [...app.hSub, ...app.hAdd, ...app.vSub, ...app.vAdd];
  cmp++;
  let isBad = false;
  for (let k = 0; k < 12; k++) {
    const e = ex.v[k], m = mine[k];
    if (e === null && m === null) continue;
    if (e === null || m === null || e !== m) { isBad = true; break; }
  }
  if (isBad) {
    bad++;
    if (samples.length < 5) samples.push(`期${ex.issue} Excel=[${ex.v}] 应用=[${mine}]`);
  }
}
console.log(`\n[应用校验] 期号+开奖号均匹配=${cmp} 不一致=${bad} 期号同但开奖号不同(Excel期号漂移，已跳过)=${skippedDraw}`);
samples.forEach(s => console.log('  ' + s));

console.log('\n最后5期对照（横减3|横加3|竖减3|竖加3）:');
const lastRows = rows.slice(-5);
for (const ex of lastRows) {
  const app = appMap.get(ex.issue);
  console.log(`  期${ex.issue} 开奖${ex.d.join('')}`);
  console.log(`    Excel: ${ex.v.join(',')}`);
  console.log(`    应用 : ${app ? [...app.hSub, ...app.hAdd, ...app.vSub, ...app.vAdd].join(',') : '(该期号应用中不存在)'}`);
}
