const XLSX = require("xlsx");
const path = require("path");

const FILE = path.join("C:\\Users\\boloor\\Desktop", "新黄金三格.xlsm");
const wb = XLSX.readFile(FILE, { type: "file" });

console.log("Sheets:", wb.SheetNames);

const ws = wb.Sheets["福"];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log("Sheet '福' rows:", raw.length, "cols:", raw[0] ? raw[0].length : 0);
console.log("Row 0:", JSON.stringify(raw[0]));
console.log("Row 1:", JSON.stringify(raw[1]));
console.log("Row 2:", JSON.stringify(raw[2]));

const ws2 = wb.Sheets["福 (2)"];
if (ws2) {
  const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
  console.log("\nSheet '福 (2)' rows:", raw2.length, "cols:", raw2[0] ? raw2[0].length : 0);
  console.log("Row 0:", JSON.stringify(raw2[0]));
  console.log("Row 1:", JSON.stringify(raw2[1]));
  if (raw2[1] && raw2[1][3]) {
    console.log("Row 1 col 3 type:", typeof raw2[1][3], "value:", String(raw2[1][3]).substring(0, 200));
  }
} else {
  console.log("Sheet '福 (2)' not found");
  // Try similar names
  for (const name of wb.SheetNames) {
    console.log("  Available:", JSON.stringify(name));
  }
}
