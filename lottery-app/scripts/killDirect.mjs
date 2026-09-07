// 直选杀号算法测试
// 规则：从百十个提取不重复数字
// 组六(3个不同数字)：全排列6注
// 组三(2个不同数字)：2个数字分别与0-9组合成3位数，再全排列去重

import { lotteryData as ld1 } from '../src/data/lotteryData.js';
import { lotteryData as ld2 } from '../src/data/excelData.js';

const allData = [...ld2, ...ld1];
const dataMap = new Map();
allData.forEach(d => dataMap.set(d.issue, d));
const data = [...dataMap.values()].sort((a, b) => a.issue.localeCompare(b.issue));
const N = data.length;

// 全排列
function permute(arr) {
  if (arr.length <= 1) return [arr];
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const perm of permute(rest)) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

// 生成直选杀号
function generateKillNumbers(d1, d2, d3) {
  const unique = [...new Set([d1, d2, d3])].sort((a, b) => a - b);
  const isZuSan = unique.length === 2;
  const results = new Set();

  if (unique.length === 3) {
    // 组六：3个不同数字，全排列6注
    for (const perm of permute(unique)) {
      results.add(perm.join(''));
    }
  } else if (unique.length === 2) {
    // 组三：2个不同数字，分别与0-9组合
    const [a, b] = unique;
    for (let c = 0; c <= 9; c++) {
      if (c === a || c === b) continue; // 跳过已有的数字，避免重复
      const combo = [a, b, c];
      for (const perm of permute(combo)) {
        results.add(perm.join(''));
      }
    }
  } else if (unique.length === 1) {
    // 豹子：1个数字，与0-9中其他数字组合
    const a = unique[0];
    for (let b = 0; b <= 9; b++) {
      if (b === a) continue;
      for (let c = 0; c <= 9; c++) {
        if (c === a || c === b) continue;
        const combo = [a, b, c];
        for (const perm of permute(combo)) {
          results.add(perm.join(''));
        }
      }
    }
  }

  return [...results].sort();
}

// 测试
const START = 200;
const END = N;
const TOTAL = END - START;

let hitCount = 0; // 杀号命中（开奖号不在杀号中）
let missCount = 0; // 杀号失败（开奖号在杀号中）
let totalKills = 0;

console.log(`测试 ${data[START].issue}~${data[END-1].issue} (${TOTAL}期)\n`);

// 前10期展示（用上期百十个杀本期）
for (let i = START; i < START + 10 && i < END; i++) {
  const item = data[i];
  const prev = data[i-1];
  const kills = generateKillNumbers(prev.d1, prev.d2, prev.d3);
  const actual = `${item.d1}${item.d2}${item.d3}`;
  const isKilled = kills.includes(actual);
  const unique = [...new Set([prev.d1, prev.d2, prev.d3])];
  const type = unique.length === 3 ? '组六' : unique.length === 2 ? '组三' : '豹子';

  console.log(`${item.issue}期 开奖:${actual} | 上期${prev.issue}:${prev.d1}${prev.d2}${prev.d3}(${type})`);
  console.log(`  杀号${kills.length}注: ${kills.slice(0, 20).join(',')}${kills.length > 20 ? '...' : ''}`);
  console.log(`  验证: ${isKilled ? '× 杀号失败(开奖号在杀号中)' : '✓ 杀号成功'}`);
  console.log('');

  if (isKilled) missCount++; else hitCount++;
  totalKills += kills.length;
}

// 全量统计
hitCount = 0; missCount = 0; totalKills = 0;
let maxConsecHit = 0, curConsecHit = 0;
let maxConsecMiss = 0, curConsecMiss = 0;

for (let i = START; i < END; i++) {
  const item = data[i];
  const prev = data[i-1];
  const kills = generateKillNumbers(prev.d1, prev.d2, prev.d3);
  const actual = `${item.d1}${item.d2}${item.d3}`;
  const isKilled = kills.includes(actual);

  if (isKilled) {
    missCount++;
    curConsecHit = 0; curConsecMiss++;
  } else {
    hitCount++;
    curConsecHit++; curConsecMiss = 0;
  }
  maxConsecHit = Math.max(maxConsecHit, curConsecHit);
  maxConsecMiss = Math.max(maxConsecMiss, curConsecMiss);
  totalKills += kills.length;
}

console.log(`\n===== 全量统计 (${TOTAL}期) =====`);
console.log(`杀号成功: ${hitCount}/${TOTAL} = ${(hitCount/TOTAL*100).toFixed(1)}%`);
console.log(`杀号失败: ${missCount}/${TOTAL} = ${(missCount/TOTAL*100).toFixed(1)}%`);
console.log(`平均每期杀号: ${(totalKills/TOTAL).toFixed(0)}注`);
console.log(`最大连对(杀号成功): ${maxConsecHit}`);
console.log(`最大连错(杀号失败): ${maxConsecMiss}`);
