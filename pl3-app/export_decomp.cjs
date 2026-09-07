const XLSX = require('xlsx');
const fs = require('fs');
const files = ['最佳', '连对', '连错', '最差'];
const result = {};

files.forEach(f => {
  const wb = XLSX.readFile('c:\\Users\\boloor\\Desktop\\' + f + '.xls');
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  for (let row = 1; row < data.length; row++) {
    const r = data[row];
    if (!r[0]) continue;
    let issue = r[0].toString();
    issue = issue.replace(/^0+/, ''); // "002026192" -> "2026192"
    if (issue.startsWith('20') && issue.length === 7) {
      issue = issue.substring(2); // "2026192" -> "26192"
    }
    if (!result[issue]) result[issue] = [];
    for (let i = 2; i <= 10; i += 2) {
      if (r[i]) {
        result[issue].push(r[i].toString());
      }
    }
  }
});

fs.writeFileSync('c:\\Users\\boloor\\Desktop\\彩票\\lottery-app\\src\\data\\decompositionData.json', JSON.stringify(result, null, 2));
console.log('Done! Total periods:', Object.keys(result).length);
console.log('Sample keys:', Object.keys(result).slice(-5));
console.log('26192:', result['26192'] ? result['26192'].length + ' groups' : 'not found');
console.log('26193:', result['26193'] ? result['26193'].length + ' groups' : 'not found');
