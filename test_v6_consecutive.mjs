// 测试V6连续不杀号期数
import { lotteryData as fc3dData } from './lottery-app/src/data/lotteryData.js';

const data = [...fc3dData].sort((a, b) => Number(a.issue) - Number(b.issue));

function generatePositionKillV6Numbers(data, currentIndex) {
  if (currentIndex < 10) return { d1: [], d2: [], d3: [], kill: false };

  const killDigits = { d1: [], d2: [], d3: [] };
  let anyPositionKill = false;

  for (const pos of ['d1', 'd2', 'd3']) {
    const lastDigit = data[currentIndex - 1][pos];
    let shouldKill = false;

    if (currentIndex >= 4 && !shouldKill) {
      let allSame = true;
      for (let j = 1; j < 4; j++) {
        if (data[currentIndex-j][pos] !== lastDigit) {
          allSame = false;
          break;
        }
      }
      if (allSame) shouldKill = true;
    }

    if (currentIndex >= 10 && !shouldKill) {
      const digits = [];
      for (let j = 1; j <= 10; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 10;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 10;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.4) shouldKill = true;
    }

    if (currentIndex >= 7 && !shouldKill) {
      const digits = [];
      for (let j = 1; j <= 7; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 7;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 7;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 1.4) shouldKill = true;
    }

    if (currentIndex >= 5 && !shouldKill) {
      const digits = [];
      for (let j = 1; j <= 5; j++) {
        digits.push(data[currentIndex-j][pos]);
      }
      const mean = digits.reduce((s, v) => s + v, 0) / 5;
      const variance = digits.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / 5;
      const stdDev = Math.sqrt(variance);
      if (stdDev < 0.9) shouldKill = true;
    }

    if (shouldKill) {
      killDigits[pos] = [lastDigit];
      anyPositionKill = true;
    }
  }

  return { ...killDigits, kill: anyPositionKill };
}

let maxConsecutiveNoKill = 0;
let currentNoKill = 0;
let totalNoKill = 0;
let totalKill = 0;

for (let i = 10; i < data.length; i++) {
  const result = generatePositionKillV6Numbers(data, i);
  
  if (result.kill) {
    totalKill++;
    maxConsecutiveNoKill = Math.max(maxConsecutiveNoKill, currentNoKill);
    currentNoKill = 0;
  } else {
    totalNoKill++;
    currentNoKill++;
  }
}

// 处理最后一段
maxConsecutiveNoKill = Math.max(maxConsecutiveNoKill, currentNoKill);

console.log('=== V6连续不杀号统计 ===');
console.log(`总期数: ${data.length}`);
console.log(`杀号期数: ${totalKill} (${(totalKill/(data.length-10)*100).toFixed(2)}%)`);
console.log(`不杀号期数: ${totalNoKill} (${(totalNoKill/(data.length-10)*100).toFixed(2)}%)`);
console.log(`最大连续不杀: ${maxConsecutiveNoKill}期`);
console.log(`平均连续不杀: ${(totalNoKill/totalKill).toFixed(2)}期`);
