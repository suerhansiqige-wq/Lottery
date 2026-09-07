// 校验：Excel「黄金三格」体 sheet 的横加减/竖加减列（排列三）
// 体 sheet 比 福 sheet 多一列「号码」，列位右移一位：
//   A=期数 B=号码 C/D/E=第一位/第二位/第三位 F=和值 G=跨度
//   H/I/J=横相减  K/L/M=横相加  N/O/P=竖相减  Q/R/S=竖相加
// 1) 打印表头确认列位  2) Excel 自校验  3) 与 pl3-app 数据层比对
import XLSX from 'xlsx';
import { lotteryData, enrichData } from './src/data/lotteryData.js';

const wb = XLSX.readFile('c:\\Users\\boloor\\Desktop\\黄金三格.xlsx', { cellFormula: false });
const ws = wb.Sheets['体'];
const range = XLSX.utils.decode_range(ws['!ref']);
const raw = (a) => { const c = ws[a]; return c && c.v !== '' && c.v !== undefined ? c.v : null; };
const num = (a) => { const v = raw(a); return v === null ? null : Number(v); };
const letters = (i) => { let s = '', n = i; while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } return s; };

// 1) 表头
console.log('[表头] ' + Array.from({ length: 26 }, (_, i) => letters(i) + '=' + (raw(letters(i) + '1') ?? '')).join(' | '));
console.log('[范围] ' + ws['!ref']);

// 收集数据行（保留 Excel 行序，竖列依赖上一行）
const rows = [];
for (let r = range.s.r + 1; r <= range.e.r; r++) {
  const issue = num('A' + (r + 1));
  const c = num('C' + (r + 1));
  if (issue === null || c === null) continue;
  rows.push({
    row: r + 1, issue: String(issue),
    d: [c, num('D' + (r + 1)), num('E' + (r + 1))],
    v: ['H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S'].map(x => num(x + (r + 1))),
  });
}
console.log(`[数据行] ${rows.length} 行，首期 ${rows[0]?.issue} 末期 ${rows[rows.length - 1]?.issue}`);

// 2) Excel 自校验
const tail10 = (x) => (x >= 10 ? x - 10 : x);
let selfBad = 0; const selfSamples = [];
for (let i = 0; i < rows.length; i++) {
  const [b, c, d] = rows[i].d;
  const p = i > 0 ? rows[i - 1].d : null;
  const exp = [
    Math.abs(b - c), Math.abs(c - d), Math.abs(b - d),
    tail10(b + c), tail10(c + d), tail10(b + d),
    ...(p ? [Math.abs(p[0] - b), Math.abs(p[1] - c), Math.abs(p[2] - d),
      tail10(p[0] + b), tail10(p[1] + c), tail10(p[2] + d)] : [null, null, null, null, null, null]),
  ];
  for (let k = 0; k < 12; k++) {
    const e = rows[i].v[k], m = exp[k];
    if (e === null || m === null) continue;
    if (e !== m) {
      selfBad++;
      if (selfSamples.length < 6) selfSamples.push(`行${rows[i].row} 期${rows[i].issue} 第${k}列 Excel=${e} 复算=${m} 开奖${rows[i].d.join('')} 上行${p ? p.join('') : '-'}`);
      break;
    }
  }
}
console.log(`\n[Excel自校验] 不符=${selfBad}`);
selfSamples.forEach(s => console.log('  ' + s));

// 3) 与 pl3-app 比对（App.jsx 规则：过滤NaN + Map去重 + 期号升序）
const issueMap = new Map();
for (const it of lotteryData) {
  if (isNaN(Number(it.issue)) || isNaN(it.d1) || isNaN(it.d2) || isNaN(it.d3)) continue;
  if (!issueMap.has(it.issue)) issueMap.set(it.issue, it);
}
const baseData = [...issueMap.values()].sort((a, b) => Number(a.issue) - Number(b.issue));
const appMap = new Map(enrichData(baseData).map(it => [String(it.issue), it]));
console.log(`[应用数据] ${baseData.length} 期，首期 ${baseData[0].issue} 末期 ${baseData[baseData.length - 1].issue}`);

let cmp = 0, bad = 0, skipped = 0, noIssue = 0; const samples = [];
for (const ex of rows) {
  const app = appMap.get(ex.issue);
  if (!app) { noIssue++; continue; }
  if (app.d1 !== ex.d[0] || app.d2 !== ex.d[1] || app.d3 !== ex.d[2]) { skipped++; continue; }
  const mine = [...app.hSub, ...app.hAdd, ...app.vSub, ...app.vAdd];
  cmp++;
  let isBad = false;
  for (let k = 0; k < 12; k++) {
    const e = ex.v[k], m = mine[k];
    if (e === null && m === null) continue;
    if (e === null || m === null || e !== m) { isBad = true; break; }
  }
  if (isBad) { bad++; if (samples.length < 6) samples.push(`期${ex.issue} Excel=[${ex.v}] 应用=[${mine}]`); }
}
console.log(`\n[应用比对] 期号+开奖号匹配=${cmp} 不一致=${bad} 期号同开奖号不同=${skipped} 应用中无此期号=${noIssue}`);
samples.forEach(s => console.log('  ' + s));

// 4) 末尾5期对照
console.log('\n末尾5期对照（横减3|横加3|竖减3|竖加3）:');
for (const ex of rows.slice(-5)) {
  const app = appMap.get(ex.issue);
  console.log(`  期${ex.issue} 开奖${ex.d.join('')}`);
  console.log(`    Excel: ${ex.v.join(',')}`);
  console.log(`    应用 : ${app ? [...app.hSub, ...app.hAdd, ...app.vSub, ...app.vAdd].join(',') : '(应用中无此期号)'}`);
}
