const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/boloor/Desktop/新黄金三格.xlsm', {type:'binary'});

// Check all sheets
console.log('Sheet names:', wb.SheetNames);

// Check sheet '福' full header
const ws1 = wb.Sheets['福'];
const data1 = XLSX.utils.sheet_to_json(ws1, {header:1});
console.log('\n=== Sheet 福 ===');
console.log('Rows:', data1.length);
console.log('Header columns:', data1[0].length);
console.log('Header:', JSON.stringify(data1[0]));

// Check for any non-empty columns beyond what we know
console.log('\nSample row 1 (first 30 cols):', JSON.stringify(data1[1].slice(0, 30)));
console.log('Sample row 1 (cols 20-50):', JSON.stringify(data1[1].slice(20, 50)));
console.log('Sample row 1 (cols 50-80):', JSON.stringify(data1[1].slice(50, 80)));
console.log('Sample row 1 (cols 80-114):', JSON.stringify(data1[1].slice(80, 114)));

// Check sheet '福 (2)' full structure
const ws2 = wb.Sheets['福 (2)'];
const data2 = XLSX.utils.sheet_to_json(ws2, {header:1});
console.log('\n=== Sheet 福 (2) ===');
console.log('Rows:', data2.length);
console.log('Header columns:', data2[0].length);
console.log('Header:', JSON.stringify(data2[0]));
console.log('Row 1 all cols:', JSON.stringify(data2[1]));
console.log('Row 1 length:', data2[1].length);

// Check if there are more sheets
for (const name of wb.SheetNames) {
  if (name !== '福' && name !== '福 (2)') {
    const ws = wb.Sheets[name];
    const d = XLSX.utils.sheet_to_json(ws, {header:1});
    console.log('\n=== Sheet', name, '===');
    console.log('Rows:', d.length);
    if (d.length > 0) {
      console.log('Header:', JSON.stringify(d[0]));
      if (d.length > 1) console.log('Row 1:', JSON.stringify(d[1]));
    }
  }
}
