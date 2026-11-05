// 测试本期保本投注号码计算逻辑

// 模拟数据
const goldenGridValue = ''; // 空
const rule9BtgNumbers = Array.from({ length: 751 }, (_, i) => String(i).padStart(3, '0')); // 模拟751注

console.log('黄金三格号码数:', goldenGridValue.trim().length > 0 ? goldenGridValue.split(/\s+/).length : 0);
console.log('Rule9+BTG号码数:', rule9BtgNumbers.length);

// BaobenModule的计算逻辑
const ggTokens = (goldenGridValue || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
const ggSet = new Set(ggTokens);
const r9btgSet = new Set(rule9BtgNumbers || []);

console.log('ggTokens长度:', ggTokens.length);
console.log('ggSet大小:', ggSet.size);
console.log('r9btgSet大小:', r9btgSet.size);

// Part 1: 黄金三格 - Rule9+BTG
const part1 = ggTokens.filter(t => !r9btgSet.has(t));
// Part 2: Rule9+BTG - 黄金三格
const part2 = (rule9BtgNumbers || []).filter(t => !ggSet.has(t));

console.log('Part1长度:', part1.length);
console.log('Part2长度:', part2.length);

const seen = new Set();
const combined = [];
for (const n of [...part1, ...part2]) {
  if (!seen.has(n)) { seen.add(n); combined.push(n); }
}

console.log('Combined长度:', combined.length);
console.log('预期结果: 751注');
console.log('实际结果:', combined.length, '注');
console.log('是否匹配:', combined.length === 751 ? '✓' : '✗');

// 测试如果有重复的情况
console.log('\n--- 测试有重复的情况 ---');
const rule9BtgWithDupes = [...rule9BtgNumbers, '000', '001']; // 添加2个重复
console.log('带重复的Rule9+BTG长度:', rule9BtgWithDupes.length);

const r9btgSet2 = new Set(rule9BtgWithDupes);
const part2_2 = rule9BtgWithDupes.filter(t => !ggSet.has(t));
console.log('Part2长度（有重复）:', part2_2.length);

const seen2 = new Set();
const combined2 = [];
for (const n of [...part1, ...part2_2]) {
  if (!seen2.has(n)) { seen2.add(n); combined2.push(n); }
}
console.log('Combined长度（去重后）:', combined2.length);
console.log('是否正确:', combined2.length === 751 ? '✓' : '✗');
