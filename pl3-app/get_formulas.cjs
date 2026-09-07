const XLSX = require('xlsx');
const wb = XLSX.readFile('c:\\Users\\boloor\\Desktop\\0000.xlsx');
const ws = wb.Sheets['\u798f'];

// Get raw cell formulas for 生号, 连号, 必出号 columns (S, T, U = cols 18, 19, 20)
console.log('=== Excel Formulas ===\n');

for (let r = 3; r <= 6; r++) {
  const rowLetters = ['S', 'T', 'U'];
  const colNames = ['生号(18)', '连号(19)', '必出号(20)'];
  
  console.log(`Row ${r+1} (period ${ws['A'+(r+1)]?.v}):`);
  for (let c = 0; c < 3; c++) {
    const addr = rowLetters[c] + (r+1);
    const cell = ws[addr];
    if (cell && cell.f) {
      console.log(`  ${colNames[c]}: FORMULA = ${cell.f.substring(0, 200)}`);
    } else if (cell) {
      console.log(`  ${colNames[c]}: VALUE = ${cell.v}`);
    } else {
      console.log(`  ${colNames[c]}: (empty)`);
    }
  }
  console.log('');
}
