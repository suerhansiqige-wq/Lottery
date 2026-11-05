const XLSX = require('xlsx');
const wb = XLSX.readFile('C:/Users/boloor/Desktop/新黄金三格.xlsm', {type:'binary'});

const ws1 = wb.Sheets['福'];
const data1 = XLSX.utils.sheet_to_json(ws1, {header:1});

// Map header to understand column positions
const header = data1[0];
console.log('Total columns:', header.length);

// Find key columns
for (let i = 0; i < header.length; i++) {
  if (header[i] && typeof header[i] === 'string' && header[i].length > 1) {
    console.log(`  Col ${i}: "${header[i]}"`);
  }
}

// Get data for periods around the prediction range (26266-26280)
// First, find which rows have these periods
console.log('\n=== Looking for periods 26250-26280 ===');
for (let i = 1; i < data1.length; i++) {
  const period = data1[i][0];
  if (period >= 26250 && period <= 26280) {
    const row = data1[i];
    console.log(`\nPeriod ${period}:`);
    console.log(`  Result: ${row[1]} ${row[2]} ${row[3]}`);
    console.log(`  和值: ${row[4]}, 跨度: ${row[5]}`);
    console.log(`  横相减: [${row[6]},${row[7]},${row[8]}]`);
    console.log(`  横相加: [${row[9]},${row[10]},${row[11]}]`);
    console.log(`  竖相减: [${row[12]},${row[13]},${row[14]}]`);
    console.log(`  竖相加: [${row[15]},${row[16]},${row[17]}]`);
    console.log(`  生号: "${row[18]}", 连号: "${row[19]}", 必出号: "${row[20]}"`);

    // Cols 21-30: first tracking group (G2 / 生号 state per digit)
    console.log(`  Cols 21-30 (生号track): [${row.slice(21,31).join(',')}]`);
    // Cols 31-40: second tracking group
    console.log(`  Cols 31-40 (连号track?): [${row.slice(31,41).join(',')}]`);
    // Cols 41-50: third tracking group
    console.log(`  Cols 41-50 (必出track?): [${row.slice(41,51).join(',')}]`);
    // Cols 51-60: fourth tracking group
    console.log(`  Cols 51-60 (G1?): [${row.slice(51,61).join(',')}]`);
    // Cols 61-70: fifth tracking group
    console.log(`  Cols 61-70 (G4?): [${row.slice(61,71).join(',')}]`);

    // 单双大小上下质合 (cols 71-102)
    console.log(`  Cols 71-106 (单双大小...): [${row.slice(71,107).join(',')}]`);

    // Last columns
    // Need to find exact positions of 生号个数 etc
    // From header: after the 0,1,2,0,0,0,1,1,1,2,2,2 section
    // Let me just show the last 10 columns
    const lastN = 10;
    console.log(`  Last ${lastN} cols (from ${header.length-lastN}): [${row.slice(header.length-lastN).join(',')}]`);

    // Show header for last columns
    if (period === 26250) {
      console.log(`  Header last ${lastN}: [${header.slice(header.length-lastN).join(',')}]`);
      console.log(`  Header 103-114: [${header.slice(103).join(',')}]`);
    }
  }
}
