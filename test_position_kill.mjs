// 位置杀号法 - 百位/十位/个位分别杀号
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V9: 位置杀号法 - 每位独立分析
function generatePositionKill(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];
  
  // 百位杀号：近3期百位 + 相关衍生
  const killBai = new Set();
  killBai.add(d1[0]); killBai.add(d2[0]); killBai.add(d3[0]); // 近3期百位
  killBai.add((d1[0] + d1[1]) % 10); // 百+十取尾
  killBai.add((d1[0] + d1[2]) % 10); // 百+个取尾
  killBai.add(Math.abs(d1[0] - d1[1])); // |百-十|
  killBai.add(Math.abs(d1[0] - d1[2])); // |百-个|
  
  // 十位杀号
  const killShi = new Set();
  killShi.add(d1[1]); killShi.add(d2[1]); killShi.add(d3[1]); // 近3期十位
  killShi.add((d1[1] + d1[0]) % 10); // 十+百取尾
  killShi.add((d1[1] + d1[2]) % 10); // 十+个取尾
  killShi.add(Math.abs(d1[1] - d1[0])); // |十-百|
  killShi.add(Math.abs(d1[1] - d1[2])); // |十-个|
  
  // 个位杀号
  const killGe = new Set();
  killGe.add(d1[2]); killGe.add(d2[2]); killGe.add(d3[2]); // 近3期个位
  killGe.add((d1[2] + d1[0]) % 10); // 个+百取尾
  killGe.add((d1[2] + d1[1]) % 10); // 个+十取尾
  killGe.add(Math.abs(d1[2] - d1[0])); // |个-百|
  killGe.add(Math.abs(d1[2] - d1[1])); // |个-十|
  
  // 生成所有组合，排除任一位置在杀号集合中的
  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    
    // 如果任一位置在对应杀号集合中，排除
    if (killBai.has(a)) continue;
    if (killShi.has(b)) continue;
    if (killGe.has(c)) continue;
    
    result.push(s);
  }
  
  return result;
}

// V10: 位置杀号 + 和值/跨度过滤
function generatePositionKillV2(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];
  
  const killBai = new Set();
  killBai.add(d1[0]); killBai.add(d2[0]); killBai.add(d3[0]);
  killBai.add((d1[0] + d1[1]) % 10);
  killBai.add((d1[0] + d1[2]) % 10);
  killBai.add(Math.abs(d1[0] - d1[1]));
  killBai.add(Math.abs(d1[0] - d1[2]));
  
  const killShi = new Set();
  killShi.add(d1[1]); killShi.add(d2[1]); killShi.add(d3[1]);
  killShi.add((d1[1] + d1[0]) % 10);
  killShi.add((d1[1] + d1[2]) % 10);
  killShi.add(Math.abs(d1[1] - d1[0]));
  killShi.add(Math.abs(d1[1] - d1[2]));
  
  const killGe = new Set();
  killGe.add(d1[2]); killGe.add(d2[2]); killGe.add(d3[2]);
  killGe.add((d1[2] + d1[0]) % 10);
  killGe.add((d1[2] + d1[1]) % 10);
  killGe.add(Math.abs(d1[2] - d1[0]));
  killGe.add(Math.abs(d1[2] - d1[1]));
  
  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    
    if (killBai.has(a)) continue;
    if (killShi.has(b)) continue;
    if (killGe.has(c)) continue;
    
    result.push(s);
  }
  
  // 和值/跨度过滤
  if (result.length > 500) {
    let filtered = result.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= 6 && sum <= 21;
    });
    if (filtered.length > 500) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        return Math.max(...digits) - Math.min(...digits) >= 2;
      });
    }
    return filtered;
  }
  
  return result;
}

// V11: 精简位置杀号（只杀近3期位+和值拆分）
function generatePositionKillV3(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
  
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];
  
  // 百位：近3期百位 + 和值十位
  const sum = d1[0] + d1[1] + d1[2];
  const killBai = new Set([d1[0], d2[0], d3[0]]);
  if (sum >= 10) killBai.add(Math.floor(sum/10));
  
  // 十位：近3期十位 + 和值个位
  const killShi = new Set([d1[1], d2[1], d3[1]]);
  if (sum >= 10) killShi.add(sum % 10);
  else killShi.add(sum);
  
  // 个位：近3期个位 + 跨度
  const span = Math.max(...d1) - Math.min(...d1);
  const killGe = new Set([d1[2], d2[2], d3[2], span]);
  
  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];
    
    if (killBai.has(a)) continue;
    if (killShi.has(b)) continue;
    if (killGe.has(c)) continue;
    
    result.push(s);
  }
  
  return result;
}

function testVersion(name, func) {
  let total = 0, hit = 0, totalNotes = 0;
  for (let i = 2; i < data.length; i++) {
    const numbers = func(data[i-1], data[i-2], data[i-3]);
    const currNum = `${data[i].d1}${data[i].d2}${data[i].d3}`;
    total++;
    totalNotes += numbers.length;
    if (numbers.includes(currNum)) hit++;
  }
  console.log(`\n=== ${name} ===`);
  console.log(`总期数: ${total}`);
  console.log(`命中: ${hit}`);
  console.log(`命中率: ${(hit/total*100).toFixed(2)}%`);
  console.log(`平均注数: ${Math.round(totalNotes/total)}注`);
}

console.log('=== 位置杀号法测试 ===');
testVersion('V9 位置杀号 (基础)', generatePositionKill);
testVersion('V10 位置杀号+过滤', generatePositionKillV2);
testVersion('V11 精简位置杀号', generatePositionKillV3);
