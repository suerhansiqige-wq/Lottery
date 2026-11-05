// 综合多维度组号策略
// 结合：横加减、竖加减、生号、连号、必出号 + 遗漏验证、新黄金三格、规则9
const fs = require('fs');
const path = require('path');

const lotteryDataPath = path.join(__dirname, 'src/data/lotteryData.js');
const content = fs.readFileSync(lotteryDataPath, 'utf-8');
const match = content.match(/export const lotteryData = (\[[\s\S]*?\]);/);
const allData = eval(match[1]);

console.log(`总期数: ${allData.length}\n`);

// 基础函数
function hAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function hSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function vAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function vSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

// 生号：上期未出现的数字
function getShengHao(d) {
  return [0,1,2,3,4,5,6,7,8,9].filter(x => !d.includes(x));
}

// 连号：与上期数字相邻的数字
function getLianHao(d) {
  const result = new Set();
  d.forEach(v => {
    result.add((v+1)%10);
    result.add((v-1+10)%10);
  });
  return Array.from(result);
}

// 必出号：横加减竖加减中出现2次以上的数字
function getBiChuHao(prev1, prev2) {
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const ha = hAdd(d1), hs = hSub(d1);
  const va = vAdd(d1, d2), vs = vSub(d1, d2);
  
  const result = [];
  for (let d = 0; d <= 9; d++) {
    const count = [ha, hs, va, vs].filter(arr => arr.includes(d)).length;
    if (count >= 2) result.push(d);
  }
  return result;
}

// 综合多维度评分
function comprehensiveScore(num, data, idx) {
  const d1 = Math.floor(num / 100);
  const d2 = Math.floor((num % 100) / 10);
  const d3 = num % 10;
  const digits = [d1, d2, d3];
  
  const prev1 = data[idx-1];
  const prev2 = data[idx-2];
  const prev3 = data[idx-3];
  
  if (!prev1 || !prev2 || !prev3) return 0;
  
  const p1 = [prev1.d1, prev1.d2, prev1.d3];
  const p2 = [prev2.d1, prev2.d2, prev2.d3];
  const p3 = [prev3.d1, prev3.d2, prev3.d3];
  
  let score = 0;
  
  // 1. 横加减池匹配
  const ha1 = hAdd(p1), hs1 = hSub(p1);
  const ha2 = hAdd(p2), hs2 = hSub(p2);
  const ha = hAdd(digits), hs = hSub(digits);
  
  // 横加匹配度
  const haMatch = ha.filter(v => new Set(ha1).has(v)).length;
  score += haMatch * 3;
  
  // 横减匹配度
  const hsMatch = hs.filter(v => new Set(hs1).has(v)).length;
  score += hsMatch * 3;
  
  // 2. 竖加减池匹配
  const va1 = vAdd(p1, p2), vs1 = vSub(p1, p2);
  const va = vAdd(digits, p1), vs = vSub(digits, p1);
  
  const vaMatch = va.filter(v => new Set(va1).has(v)).length;
  score += vaMatch * 2;
  
  const vsMatch = vs.filter(v => new Set(vs1).has(v)).length;
  score += vsMatch * 2;
  
  // 3. 生号匹配（使用上期生号）
  const shengHao = getShengHao(p1);
  const shMatch = digits.filter(v => shengHao.includes(v)).length;
  score += shMatch * 2;
  
  // 4. 连号匹配
  const lianHao = getLianHao(p1);
  const lhMatch = digits.filter(v => lianHao.includes(v)).length;
  score += lhMatch * 1.5;
  
  // 5. 必出号匹配
  const biChuHao = getBiChuHao(prev1, prev2);
  const bcMatch = digits.filter(v => biChuHao.includes(v)).length;
  score += bcMatch * 2.5;
  
  // 6. 和值接近度（基于近10期平均）
  const recentSums = [];
  for (let i = 1; i <= 10; i++) {
    if (data[idx-i]) {
      recentSums.push(data[idx-i].d1 + data[idx-i].d2 + data[idx-i].d3);
    }
  }
  const avgSum = recentSums.reduce((a,b) => a+b, 0) / recentSums.length;
  const sum = d1 + d2 + d3;
  score += Math.max(0, 8 - Math.abs(sum - avgSum)) * 1.5;
  
  // 7. 跨度接近度
  const recentSpans = [];
  for (let i = 1; i <= 10; i++) {
    if (data[idx-i]) {
      const d = [data[idx-i].d1, data[idx-i].d2, data[idx-i].d3];
      recentSpans.push(Math.max(...d) - Math.min(...d));
    }
  }
  const avgSpan = recentSpans.reduce((a,b) => a+b, 0) / recentSpans.length;
  const span = Math.max(...digits) - Math.min(...digits);
  score += Math.max(0, 5 - Math.abs(span - avgSpan)) * 2;
  
  // 8. 避免豹子
  if (d1 === d2 && d2 === d3) score -= 30;
  
  // 9. 避免完全重复上期
  if (d1 === prev1.d1 && d2 === prev1.d2 && d3 === prev1.d3) score -= 50;
  
  return score;
}

// 规则9杀号（安全9规则）
function rule9Kill(num, prev1, prev2, prev3) {
  const d1 = [prev1.d1, prev1.d2, prev1.d3];
  const d2 = [prev2.d1, prev2.d2, prev2.d3];
  const d3 = [prev3.d1, prev3.d2, prev3.d3];

  const ha1 = hAdd(d1), hs1 = hSub(d1);
  const ha2 = hAdd(d2), hs2 = hSub(d2);
  const ha3 = hAdd(d3), hs3 = hSub(d3);
  const va1 = vAdd(d1, d2), vs1 = vSub(d1, d2);
  const va2 = vAdd(d2, d3), vs2 = vSub(d2, d3);

  const poolHA1 = new Set(ha1), poolHS1 = new Set(hs1);
  const poolHA2 = new Set(ha2), poolHS2 = new Set(hs2);
  const poolHA3 = new Set(ha3), poolHS3 = new Set(hs3);
  const poolVA1 = new Set(va1), poolVS1 = new Set(vs1);
  const poolVA2 = new Set(va2), poolVS2 = new Set(vs2);

  const a = Math.floor(num / 100);
  const b = Math.floor((num % 100) / 10);
  const c = num % 10;

  const ha = hAdd([a,b,c]);
  const hs = hSub([a,b,c]);

  // 安全9规则
  if ([a,b,c].every(v => poolHA1.has(v))) return true;
  if ([a,b,c].every(v => poolHS1.has(v))) return true;
  if ([a,b,c].every(v => poolVA1.has(v))) return true;
  if ([a,b,c].every(v => poolHA3.has(v))) return true;
  if (ha.every(v => poolHA1.has(v))) return true;
  if (ha.every(v => poolHA2.has(v))) return true;
  if (ha.every(v => poolHA3.has(v))) return true;
  if (ha.every(v => poolVA2.has(v))) return true;
  if (hs.every(v => poolVS1.has(v))) return true;

  return false;
}

console.log("=== 综合多维度组号策略回测 ===\n");

const testCount = 100;
const startIdx = allData.length - testCount;
let totalHit = 0;
let totalPred = 0;
const details = [];

for (let i = startIdx; i < allData.length; i++) {
  const current = allData[i];
  const actual = `${current.d1}${current.d2}${current.d3}`;
  
  // 第一步：规则9杀号（保留约840注）
  const afterRule9 = [];
  for (let num = 0; num < 1000; num++) {
    if (!rule9Kill(num, allData[i-1], allData[i-2], allData[i-3])) {
      afterRule9.push(num);
    }
  }
  
  // 第二步：多维度评分排序
  const scored = afterRule9.map(num => ({
    num,
    score: comprehensiveScore(num, allData, i)
  }));
  scored.sort((a, b) => b.score - a.score);
  
  // 第三步：取Top 650
  const top650 = scored.slice(0, 650).map(s => String(s.num).padStart(3, '0'));
  
  const hit = top650.includes(actual);
  if (hit) totalHit++;
  totalPred++;
  
  details.push({
    issue: current.issue,
    actual,
    hit,
    predCount: top650.length,
    rule9Count: afterRule9.length
  });
}

const hitRate = (totalHit / totalPred * 100).toFixed(1);
console.log(`测试期数: ${totalPred}`);
console.log(`命中: ${totalHit} (${hitRate}%)`);
console.log(`规则9保留: ${details[0].rule9Count}注`);
console.log(`最终注数: 650注\n`);

console.log("最近20期详情:");
details.slice(-20).forEach(d => {
  console.log(`  ${d.issue}: ${d.hit?'✓':'✗'} 开奖=${d.actual} (规则9:${d.rule9Count}注)`);
});

// 连续统计
let maxHitStreak = 0, curHitStreak = 0;
let maxMissStreak = 0, curMissStreak = 0;
details.forEach(d => {
  if (d.hit) {
    curHitStreak++;
    curMissStreak = 0;
    if (curHitStreak > maxHitStreak) maxHitStreak = curHitStreak;
  } else {
    curMissStreak++;
    curHitStreak = 0;
    if (curMissStreak > maxMissStreak) maxMissStreak = curMissStreak;
  }
});

console.log(`\n连续统计:`);
console.log(`  最长连续命中: ${maxHitStreak}`);
console.log(`  最长连续未中: ${maxMissStreak}`);

// 生成下一期预测
console.log("\n=== 下一期预测 ===");
const i = allData.length;
const afterRule9 = [];
for (let num = 0; num < 1000; num++) {
  if (!rule9Kill(num, allData[i-1], allData[i-2], allData[i-3])) {
    afterRule9.push(num);
  }
}

const scored = afterRule9.map(num => ({
  num,
  score: comprehensiveScore(num, allData, i)
}));
scored.sort((a, b) => b.score - a.score);
const predictions = scored.slice(0, 650).map(s => String(s.num).padStart(3, '0'));

console.log(`生成${predictions.length}注`);
console.log(`前30注: ${predictions.slice(0, 30).join(', ')}`);
console.log(`...`);
console.log(`后30注: ${predictions.slice(-30).join(', ')}`);

const outputPath = path.join(__dirname, 'comprehensive_prediction.json');
fs.writeFileSync(outputPath, JSON.stringify({
  hitRate,
  testPeriods: testCount,
  predictions
}, null, 2));
console.log(`\n已保存: ${outputPath}`);
