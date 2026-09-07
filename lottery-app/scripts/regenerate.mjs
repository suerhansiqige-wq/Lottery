import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 动态导入ES模块
const lotteryModule = await import('../src/data/lotteryData.js');
const lotteryData = lotteryModule.lotteryData;
const { generateSmartNumbers } = await import('../src/utils/smartNumbers.js');

console.log('开始重新生成smartNumbersData...');
console.log('总数据量:', lotteryData.length, '期');

const result = {};
let hits = 0, misses = 0;

for (let i = 100; i < lotteryData.length - 1; i++) {
  const drawsUpToHere = lotteryData.slice(0, i + 1);
  const currentIssue = drawsUpToHere[drawsUpToHere.length - 1].issue;
  const nextDraw = lotteryData[i + 1];
  
  const smartResult = generateSmartNumbers(drawsUpToHere, 700);
  if (!smartResult) continue;
  
  const target = `${nextDraw.d1}${nextDraw.d2}${nextDraw.d3}`;
  const hit = smartResult.numbers.includes(target);
  
  if (hit) hits++; else misses++;
  
  result[currentIssue] = {
    numbers: smartResult.numbers,
    count: smartResult.numbers.length,
    hit: hit,
    zulu: smartResult.zulu,
    zusan: smartResult.zusan,
    nextIssue: nextDraw.issue
  };
  
  if ((i - 100) % 50 === 0) {
    process.stdout.write(`\r处理中... ${i - 100}/${lotteryData.length - 101} 期`);
  }
}

console.log(`\n完成！共 ${hits + misses} 期`);
console.log(`命中: ${hits}, 未中: ${misses}, 命中率: ${(hits / (hits + misses) * 100).toFixed(2)}%`);

writeFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../src/data/smartNumbersData.json'),
  JSON.stringify(result, null, 2)
);
console.log('已保存到 smartNumbersData.json');
