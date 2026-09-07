const XLSX = require('xlsx');
const files = ['最佳', '连对', '连错', '最差'];

files.forEach(f => {
  const wb = XLSX.readFile('c:\\Users\\boloor\\Desktop\\' + f + '.xls');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const lastRow = data[data.length - 1];
  for (let i = 2; i <= 10; i += 2) {
    if (lastRow[i]) {
      console.log(lastRow[i].toString());
    }
  }
});
