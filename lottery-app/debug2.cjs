const XLSX = require("xlsx");
const path = require("path");

const FILE = path.join("C:\\Users\\boloor\\Desktop", "新黄金三格.xlsm");
const wb = XLSX.readFile(FILE, { type: "file" });

const ws2 = wb.Sheets["福 (2)"];
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });

// Check all columns for row 1
console.log("Row 1 length:", raw2[1].length);
for (let c = 0; c < raw2[1].length; c++) {
  const v = raw2[1][c];
  const t = typeof v;
  const s = String(v);
  console.log("  col[" + c + "]: type=" + t + ", value=" + s.substring(0, 80) + (s.length > 80 ? "..." : ""));
}

// Check if predictions are in a different column
// Also check row 2
console.log("\nRow 2 length:", raw2[2] ? raw2[2].length : "N/A");
if (raw2[2]) {
  for (let c = 0; c < raw2[2].length; c++) {
    const v = raw2[2][c];
    const s = String(v);
    console.log("  col[" + c + "]: " + s.substring(0, 80) + (s.length > 80 ? "..." : ""));
  }
}
