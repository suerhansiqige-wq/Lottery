// 规则9全量回测验证
const fs = require('fs');
const path = require('path');

const lotteryDataPath = path.join(__dirname, 'src/data/lotteryData.js');
const content = fs.readFileSync(lotteryDataPath, 'utf-8');
const match = content.match(/export const lotteryData = (\[[\s\S]*?\]);/);
const allData = eval(match[1]);

console.log(`总期数: ${allData.length}`);
console.log(`数据范围: ${allData[0].issue} - ${allData[allData.length-1].issue}\n`);

function hAdd(d) { return [(d[0]+d[1])%10, (d[1]+d[2])%10, (d[2]+d[0])%10]; }
function hSub(d) { return [Math.abs(d[0]-d[1]), Math.abs(d[1]-d[2]), Math.abs(d[2]-d[0])]; }
function vAdd(d, p) { return [(d[0]+p[0])%10, (d[1]+p[1])%10, (d[2]+p[2])%10]; }
function vSub(d, p) { return [Math.abs(d[0]-p[0]), Math.abs(d[1]-p[1]), Math.abs(d[2]-p[2])]; }

function generateRule9Numbers(prev1, prev2, prev3) {
  if (!prev1 || !prev2 || !prev3) return [];
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

  const result = [];
  for (let n = 0; n < 1000; n++) {
    const s = String(n).padStart(3, '0');
    const a = +s[0], b = +s[1], c = +s[2];

    const ha = hAdd([a,b,c]);
    const hs = hSub([a,b,c]);

    if ([a,b,c].every(v => poolHA1.has(v))) continue;
    if ([a,b,c].every(v => poolHS1.has(v))) continue;
    if ([a,b,c].every(v => poolVA1.has(v))) continue;
    if ([a,b,c].every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolHA1.has(v))) continue;
    if (ha.every(v => poolHA2.has(v))) continue;
    if (ha.every(v => poolHA3.has(v))) continue;
    if (ha.every(v => poolVA2.has(v))) continue;
    if (hs.every(v => poolVS1.has(v))) continue;

    result.push(s);
  }
  
  // 动态过滤：超过850注时启用多级过滤
  if (result.length > 850) {
    let filtered = result.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= 5 && sum <= 22;
    });
    
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const sum = (+s[0]) + (+s[1]) + (+s[2]);
        return sum >= 6 && sum <= 21;
      });
    }
    
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        const span = Math.max(...digits) - Math.min(...digits);
        return span >= 1;
      });
    }

    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const sum = (+s[0]) + (+s[1]) + (+s[2]);
        return sum >= 7 && sum <= 20;
      });
    }

    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        const span = Math.max(...digits) - Math.min(...digits);
        return span >= 2;
      });
    }

    return filtered;
  }
  
  return result;
}

console.log("=== 规则9全量回测验证 ===\n");

// 从第4期开始测试（需要前3期数据）
const startIdx = 3;
let totalHit = 0;
let totalPred = 0;
let maxCount = 0;
let minCount = 1000;
let over850Count = 0;
const details = [];

for (let i = startIdx; i < allData.length; i++) {
  const current = allData[i];
  const actual = `${current.d1}${current.d2}${current.d3}`;
  
  const predictions = generateRule9Numbers(allData[i-1], allData[i-2], allData[i-3]);
  const hit = predictions.includes(actual);
  
  if (hit) totalHit++;
  totalPred++;
  
  if (predictions.length > maxCount) maxCount = predictions.length;
  if (predictions.length < minCount) minCount = predictions.length;
  if (predictions.length > 850) over850Count++;
  
  details.push({
    issue: current.issue,
    actual,
    hit,
    predCount: predictions.length
  });
}

const hitRate = (totalHit / totalPred * 100).toFixed(2);
const avgCount = (details.reduce((s, d) => s + d.predCount, 0) / totalPred).toFixed(0);

console.log(`验证期数: ${totalPred}期`);
console.log(`数据范围: ${details[0].issue} - ${details[details.length-1].issue}`);
console.log(`命中期数: ${totalHit}期`);
console.log(`未中期数: ${totalPred - totalHit}期`);
console.log(`命中率: ${hitRate}%`);
console.log(`\n注数统计:`);
console.log(`  平均注数: ${avgCount}注`);
console.log(`  最少注数: ${minCount}注`);
console.log(`  最多注数: ${maxCount}注`);
console.log(`  超过850注: ${over850Count}期`);

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
console.log(`  最长连续命中: ${maxHitStreak}期`);
console.log(`  最长连续未中: ${maxMissStreak}期`);

// 最近50期详情
console.log(`\n最近50期详情:`);
details.slice(-50).forEach(d => {
  console.log(`  ${d.issue}: ${d.hit?'✓':'✗'} 开奖=${d.actual} (${d.predCount}注)`);
});

// 保存结果
const result = {
  strategy: '规则9（安全9规则 + 动态过滤）',
  rules: [
    'allIn(ha1)', 'allIn(hs1)', 'allIn(va1)', 'allIn(ha3)',
    'dblHAdd(ha1)', 'dblHAdd(ha2)', 'dblHAdd(ha3)', 'dblHAdd(va2)',
    'dblHSub(vs1)'
  ],
  dynamicFilter: {
    level1: '和值5-22',
    level2: '和值6-21',
    level3: '跨度>=1（排除豹子）'
  },
  testResults: {
    totalPeriods: totalPred,
    hitPeriods: totalHit,
    missPeriods: totalPred - totalHit,
    hitRate: parseFloat(hitRate),
    avgCount: parseInt(avgCount),
    minCount: minCount,
    maxCount: maxCount,
    over850Count: over850Count,
    maxHitStreak: maxHitStreak,
    maxMissStreak: maxMissStreak,
    dataRange: `${details[0].issue} - ${details[details.length-1].issue}`
  },
  generatedAt: new Date().toISOString()
};

const outputPath = path.join(__dirname, 'rule9_final_verification.json');
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(`\n验证结果已保存: ${outputPath}`);
