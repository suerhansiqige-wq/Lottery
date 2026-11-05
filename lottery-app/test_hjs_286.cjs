// 计算横相减=2,8,6 和 横相加=2,8,6 的所有号码

// 横相减：|百-十| |十-个| |百-个|
function hSub(d1, d2, d3) {
  return [
    Math.abs(d1 - d2),
    Math.abs(d2 - d3),
    Math.abs(d1 - d3)
  ];
}

// 横相加：(百+十)取尾 (十+个)取尾 (百+个)取尾
function hAdd(d1, d2, d3) {
  return [
    (d1 + d2) % 10,
    (d2 + d3) % 10,
    (d1 + d3) % 10
  ];
}

console.log('=== 横相减 = 2, 8, 6 的号码 ===');
const hSub286 = [];
for (let d1 = 0; d1 <= 9; d1++) {
  for (let d2 = 0; d2 <= 9; d2++) {
    for (let d3 = 0; d3 <= 9; d3++) {
      const result = hSub(d1, d2, d3);
      if (result[0] === 2 && result[1] === 8 && result[2] === 6) {
        hSub286.push(`${d1}${d2}${d3}`);
      }
    }
  }
}
console.log(`共 ${hSub286.length} 注`);
console.log(hSub286.join(' '));

console.log('\n=== 横相加 = 2, 8, 6 的号码 ===');
const hAdd286 = [];
for (let d1 = 0; d1 <= 9; d1++) {
  for (let d2 = 0; d2 <= 9; d2++) {
    for (let d3 = 0; d3 <= 9; d3++) {
      const result = hAdd(d1, d2, d3);
      if (result[0] === 2 && result[1] === 8 && result[2] === 6) {
        hAdd286.push(`${d1}${d2}${d3}`);
      }
    }
  }
}
console.log(`共 ${hAdd286.length} 注`);
console.log(hAdd286.join(' '));

console.log('\n=== 横相减或横相加 = 2, 8, 6 的号码（并集） ===');
const union = new Set([...hSub286, ...hAdd286]);
console.log(`共 ${union.size} 注`);
console.log(Array.from(union).sort().join(' '));
