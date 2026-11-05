// 测试规则9动态过滤效果
const fs = require('fs');
const path = require('path');

const lotteryDataPath = path.join(__dirname, 'src/data/lotteryData.js');
const content = fs.readFileSync(lotteryDataPath, 'utf-8');
const match = content.match(/export const lotteryData = (\[[\s\S]*?\]);/);
const allData = eval(match[1]);

console.log(`总期数: ${allData.length}\n`);

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
    // 第1级：和值5-22过滤
    let filtered = result.filter(s => {
      const sum = (+s[0]) + (+s[1]) + (+s[2]);
      return sum >= 5 && sum <= 22;
    });
    
    // 第2级：如果仍超过850，进一步过滤和值6-21
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const sum = (+s[0]) + (+s[1]) + (+s[2]);
        return sum >= 6 && sum <= 21;
      });
    }
    
    // 第3级：如果仍超过850，过滤跨度>=1（排除豹子）
    if (filtered.length > 850) {
      filtered = filtered.filter(s => {
        const digits = [+s[0], +s[1], +s[2]];
        const span = Math.max(...digits) - Math.min(...digits);
        return span >= 1;
      });
    }
    
    return filtered;
  }
  
  return result;
}

console.log("=== 规则9动态过滤测试 ===\n");

const testCount = 100;
const startIdx = allData.length - testCount;
let totalHit = 0;
let totalPred = 0;
let over850Count = 0;
const details = [];

for (let i = startIdx; i < allData.length; i++) {
  const current = allData[i];
  const actual = `${current.d1}${current.d2}${current.d3}`;
  
  const predictions = generateRule9Numbers(allData[i-1], allData[i-2], allData[i-3]);
  const hit = predictions.includes(actual);
  
  if (hit) totalHit++;
  totalPred++;
  
  if (predictions.length > 850) {
    console.log(`警告: ${current.issue} 生成${predictions.length}注，超过850！`);
    over850Count++;
  }
  
  details.push({
    issue: current.issue,
    actual,
    hit,
    predCount: predictions.length
  });
}

const hitRate = (totalHit / totalPred * 100).toFixed(1);
console.log(`\n测试期数: ${totalPred}`);
console.log(`命中: ${totalHit} (${hitRate}%)`);
console.log(`平均注数: ${(totalPred > 0 ? details.reduce((s,d) => s+d.predCount, 0) / totalPred : 0).toFixed(0)}`);
console.log(`超过850注的期数: ${over850Count}`);
console.log(`最少注数: ${Math.min(...details.map(d => d.predCount))}`);
console.log(`最多注数: ${Math.max(...details.map(d => d.predCount))}`);

console.log("\n最近20期详情:");
details.slice(-20).forEach(d => {
  console.log(`  ${d.issue}: ${d.hit?'✓':'✗'} 开奖=${d.actual} (${d.predCount}注)`);
});
