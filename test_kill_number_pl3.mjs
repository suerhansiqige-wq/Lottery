// BTG跨和杀号法 - 排列三验证脚本
import { lotteryData as draws } from './pl3-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

let total = 0;
let hit = 0;
let maxConsecutiveMiss = 0;
let currentConsecutiveMiss = 0;
let maxConsecutiveHit = 0;
let currentConsecutiveHit = 0;

let minCombo = Infinity;
let maxCombo = 0;
let totalCombo = 0;
const comboCountMap = {};

for (let i = 0; i < data.length - 1; i++) {
  const curr = data[i];
  const next = data[i + 1];
  
  const digits = new Set();
  digits.add(curr.d1);
  digits.add(curr.d2);
  digits.add(curr.d3);
  
  const max = Math.max(curr.d1, curr.d2, curr.d3);
  const min = Math.min(curr.d1, curr.d2, curr.d3);
  digits.add(max - min);
  
  const sum = curr.d1 + curr.d2 + curr.d3;
  if (sum >= 10) {
    digits.add(Math.floor(sum / 10));
    digits.add(sum % 10);
  } else {
    digits.add(sum);
  }
  
  const killDigits = Array.from(digits);
  const killDigitCount = killDigits.length;
  
  const killNumbers = new Set();
  for (const a of killDigits) {
    for (const b of killDigits) {
      for (const c of killDigits) {
        killNumbers.add(`${a}${b}${c}`);
      }
    }
  }
  
  const comboCount = killNumbers.size;
  totalCombo += comboCount;
  if (comboCount < minCombo) minCombo = comboCount;
  if (comboCount > maxCombo) maxCombo = comboCount;
  comboCountMap[killDigitCount] = (comboCountMap[killDigitCount] || 0) + 1;
  
  const nextNum = `${next.d1}${next.d2}${next.d3}`;
  const notInKillSet = !killNumbers.has(nextNum);
  
  total++;
  if (notInKillSet) {
    hit++;
    currentConsecutiveMiss = 0;
    currentConsecutiveHit++;
    if (currentConsecutiveHit > maxConsecutiveHit) {
      maxConsecutiveHit = currentConsecutiveHit;
    }
  } else {
    currentConsecutiveMiss++;
    if (currentConsecutiveMiss > maxConsecutiveMiss) {
      maxConsecutiveMiss = currentConsecutiveMiss;
    }
    currentConsecutiveHit = 0;
  }
}

const rate = (hit / total * 100).toFixed(2);
const avgCombo = Math.round(totalCombo / total);
console.log(`=== BTG跨和杀号法 - 排列三验证 ===`);
console.log(`总期数: ${total}`);
console.log(`杀号成功: ${hit}`);
console.log(`成功率: ${rate}%`);
console.log(`最大连对: ${maxConsecutiveHit}期`);
console.log(`最大连错: ${maxConsecutiveMiss}期`);
console.log(`\n组合数量统计:`);
console.log(`最少: ${minCombo}注`);
console.log(`最多: ${maxCombo}注`);
console.log(`平均: ${avgCombo}注`);
console.log(`\n杀号数字个数分布:`);
for (const [count, freq] of Object.entries(comboCountMap).sort((a, b) => a[0] - b[0])) {
  const combos = Math.pow(count, 3);
  console.log(`  ${count}个数字 → ${combos}注组合，出现${freq}期`);
}
