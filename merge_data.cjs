const fs = require('fs');
const path = require('path');

// 读取2024数据
const data2024File = path.join(__dirname, 'pl3-app', 'src', 'data', 'lotteryData2024.js');
let data2024Str = fs.readFileSync(data2024File, 'utf-8');
const m2024 = data2024Str.match(/export const lotteryData2024 = \[([\s\S]*?)\];/);
const entries2024 = m2024[1].trim();

// 读取2025数据
const lotteryDataFile = path.join(__dirname, 'pl3-app', 'src', 'data', 'lotteryData.js');
let lotteryDataStr = fs.readFileSync(lotteryDataFile, 'utf-8');

// 找到数组开始和结束位置
const arrayStart = lotteryDataStr.indexOf('export const lotteryData = [');
const arrayEnd = lotteryDataStr.indexOf('];', arrayStart) + 2;

// 找到函数开始位置（数组之后的第一个export function）
const funcStart = lotteryDataStr.indexOf('\nexport function', arrayEnd);

// 提取数组内容和函数内容
const beforeArray = lotteryDataStr.substring(0, arrayStart);
const afterArray = lotteryDataStr.substring(funcStart);

// 构建合并后的文件
const merged = `${beforeArray}export const lotteryData = [
${entries2024},
${lotteryDataStr.substring(arrayStart + 'export const lotteryData = ['.length, arrayEnd - 2).trim()}
];

${afterArray}`;

fs.writeFileSync(lotteryDataFile, merged, 'utf-8');

// 验证
const newFile = fs.readFileSync(lotteryDataFile, 'utf-8');
const newM = newFile.match(/export const lotteryData = \[([\s\S]*?)\];/);
const newLines = newM[1].split('\n').filter(l => l.trim().startsWith('{'));
console.log(`合并完成！总期数: ${newLines.length}`);
console.log(`首期: ${newLines[0].match(/issue:\s*'(\d+)'/)[1]}`);
console.log(`末期: ${newLines[newLines.length-1].match(/issue:\s*'(\d+)'/)[1]}`);

// 验证2024和2025数据衔接
const issues2024 = newLines.filter(l => l.includes("'24")).length;
const issues2025 = newLines.filter(l => l.includes("'25") || l.includes("'26")).length;
console.log(`2024年: ${issues2024}期, 2025/2026年: ${issues2025}期`);
