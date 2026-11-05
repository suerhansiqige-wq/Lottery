const XLSX = require("xlsx");
const path = require("path");

const FILE = path.join("C:\\Users\\boloor\\Desktop", "新黄金三格.xlsm");
const wb = XLSX.readFile(FILE, { type: "file" });

const ws = wb.Sheets["福"];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });

const allData = {};
const periodOrder = [];
for (let r = 1; r < raw.length; r++) {
  const row = raw[r];
  if (!row || row.length < 4) continue;
  const period = String(row[0]).trim();
  const d1 = row[1], d2 = row[2], d3 = row[3];
  if (d1 == null || d2 == null || d3 == null) continue;
  allData[period] = [+d1, +d2, +d3];
  periodOrder.push(period);
}

console.log("periodOrder length:", periodOrder.length);
console.log("First 5:", periodOrder.slice(0, 5));
console.log("Last 5:", periodOrder.slice(-5));
console.log("Has 26266?", periodOrder.includes("26266"));
console.log("Has 26265?", periodOrder.includes("26265"));
console.log("Type of first:", typeof periodOrder[0]);

// Check what the prediction periods look like
const ws2 = wb.Sheets["福 (2)"];
const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1 });
for (let r = 1; r < Math.min(5, raw2.length); r++) {
  const period = String(raw2[r][0]).trim();
  console.log("Pred period:", JSON.stringify(period), "In allData?", period in allData, "In order?", periodOrder.indexOf(period));
}
