// 验证 26284 期智取分解容错计算
const decompText = `43908,12675
46031,72589
28193,05764
39487,61250
07258,94613
97812,06345
19207,65438
93521,04768
89742,05631
51937,24608
90718,25634
47928,65130
17625,49083
39487,61250
07258,94613
70941,68235
87064,39251
57639,40812
85974,61230
31584,96072`;

// 解析分解组
function parseDecompGroups(text) {
  const groups = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,，]/);
    if (parts.length !== 2) continue;
    const aDigits = parts[0].trim().split('').filter(c => /\d/.test(c)).map(Number);
    const bDigits = parts[1].trim().split('').filter(c => /\d/.test(c)).map(Number);
    if (aDigits.length !== 5 || bDigits.length !== 5) continue;
    const a = new Set(aDigits);
    const b = new Set(bDigits);
    if (a.size !== 5 || b.size !== 5) continue;
    if (aDigits.some(d => b.has(d))) continue;
    groups.push({ a, b, raw: trimmed });
  }
  return groups;
}

// 计算 errorCount
function computeErrorCount(digits, groups) {
  let err = 0;
  for (const g of groups) {
    let inA = 0;
    for (const d of digits) if (g.a.has(d)) inA++;
    if (inA === 0 || inA === digits.length) err++;
  }
  return err;
}

const groups = parseDecompGroups(decompText);
console.log(`解析到 ${groups.length} 组分解数据`);

// 用户提供的容错1期望号码
const expectedRongCuo1 = `137 142 145 147 154 158 173 174 185 241
245 254 269 296 367 371 376 425 451 452
459 471 495 524 541 542 549 569 581 594
596 629 637 659 673 692 695 731 736 741
763 851 926 945 954 956 962 965`.replace(/\n/g, ' ').split(/\s+/).filter(Boolean);

console.log(`\n用户期望的容错1号码：${expectedRongCuo1.length} 注`);

// 验证这些号码的 errorCount
console.log('\n验证用户期望号码的 errorCount:');
const errorCounts = {};
for (const num of expectedRongCuo1) {
  const digits = num.split('').map(Number);
  const err = computeErrorCount(digits, groups);
  errorCounts[err] = (errorCounts[err] || 0) + 1;
  if (err > 1) {
    console.log(`  ${num}: errorCount=${err} (应该<=1)`);
  }
}

console.log('\nerrorCount 分布:', errorCounts);

// 反向推导：哪些号码的 errorCount = 1
console.log('\n计算所有 000-999 的 errorCount=1 号码:');
const allRongCuo1 = [];
for (let i = 0; i <= 999; i++) {
  const num = String(i).padStart(3, '0');
  const digits = num.split('').map(Number);
  // 只检查组六（3 个不同数字）
  if (new Set(digits).size !== 3) continue;
  const err = computeErrorCount(digits, groups);
  if (err === 1) allRongCuo1.push(num);
}

console.log(`所有 errorCount=1 的组六号码：${allRongCuo1.length} 注`);
console.log('号码:', allRongCuo1.join(' '));

// 对比
const expectedSet = new Set(expectedRongCuo1);
const allSet = new Set(allRongCuo1);

const inExpectedNotAll = expectedRongCuo1.filter(n => !allSet.has(n));
const inAllNotExpected = allRongCuo1.filter(n => !expectedSet.has(n));

console.log('\n对比结果:');
console.log(`  在期望中但不在计算结果中：${inExpectedNotAll.length} 注`, inExpectedNotAll.slice(0, 10));
console.log(`  在计算结果中但不在期望中：${inAllNotExpected.length} 注`, inAllNotExpected.slice(0, 10));
