const XLSX = require("xlsx");
const path = require("path");

const FILE = path.join("C:\\Users\\boloor\\Desktop", "新黄金三格.xlsm");
const wb = XLSX.readFile(FILE, { type: "file" });

const ws = wb.Sheets["福"];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

console.log("Sheet '福' 维度: " + raw.length + " 行 × " + (raw[0] ? raw[0].length : 0) + " 列");
console.log("\n前3行所有列:");
for (let r = 0; r < Math.min(3, raw.length); r++) {
  console.log("行" + r + ": " + JSON.stringify(raw[r]));
}

// Show column headers (row 0) with indices
console.log("\n列头(带索引):");
const headers = raw[0] || [];
for (let c = 0; c < headers.length; c++) {
  if (headers[c] != null) {
    console.log("  列" + c + ": " + headers[c]);
  }
}

// Show a few data rows for key columns
console.log("\n前10期数据 (列0-20):");
for (let r = 1; r < Math.min(11, raw.length); r++) {
  const row = raw[r];
  if (!row) continue;
  const cols = [];
  for (let c = 0; c < Math.min(21, (row||[]).length); c++) {
    cols.push(row[c] != null ? row[c] : '-');
  }
  console.log("  " + cols.join('\t'));
}
