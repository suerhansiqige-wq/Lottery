// 优化多维度评分权重
const fs = require('fs');
const path = require('path');

const lotteryDataPath = path.join(__dirname, 'src/data/lotteryData.js');
const content = fs.readFileSync(lotteryDataPath, 'utf-8');
const match = content.match(/export const lotteryData = (\[[\s\S]*?\]);/);
const allData = eval(match[1]);

console.log(`总期数: ${allData.length}\n`);

function analyzeDimensions(data, currentIdx) {
  const recent = data.slice(Math.max(0, currentIdx - 100), currentIdx);
  const veryRecent = data.slice(Math.max(0, currentIdx - 10), currentIdx);
  
  const freq = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  recent.forEach(item => {
    freq.d1[item.d1]++;
    freq.d2[item.d2]++;
    freq.d3[item.d3]++;
  });
  
  const missing = { d1: Array(10).fill(0), d2: Array(10).fill(0), d3: Array(10).fill(0) };
  for (let pos = 0; pos < 3; pos++) {
    const key = ['d1', 'd2', 'd3'][pos];
    for (let v = 0; v <= 9; v++) {
      let miss = 0;
      for (let i = currentIdx - 1; i >= Math.max(0, currentIdx - 100); i--) {
        if (data[i][key] === v) break;
        miss++;
      }
      missing[key][v] = miss;
    }
  }
  
  const sumRecent = veryRecent.map(d => d.d1 + d.d2 + d.d3);
  const avgSum = sumRecent.reduce((a, b) => a + b, 0) / sumRecent.length;
  
  const spanRecent = veryRecent.map(d => Math.max(d.d1, d.d2, d.d3) - Math.min(d.d1, d.d2, d.d3));
  const avgSpan = spanRecent.reduce((a, b) => a + b, 0) / spanRecent.length;
  
  const oddRecent = veryRecent.map(d => [d.d1, d.d2, d.d3].filter(x => x % 2 === 1).length);
  const avgOdd = oddRecent.reduce((a, b) => a + b, 0) / oddRecent.length;
  
  const bigRecent = veryRecent.map(d => [d.d1, d.d2, d.d3].filter(x => x >= 5).length);
  const avgBig = bigRecent.reduce((a, b) => a + b, 0) / bigRecent.length;
  
  const prev = data[currentIdx - 1];
  
  return { freq, missing, avgSum, avgSpan, avgOdd, avgBig, prev, recent };
}

function scoreNumber(num, dims, weights) {
  const d1 = Math.floor(num / 100);
  const d2 = Math.floor((num % 100) / 10);
  const d3 = num % 10;
  const digits = [d1, d2, d3];
  
  let score = 0;
  
  // 频率得分
  const freqScore = (dims.freq.d1[d1] + dims.freq.d2[d2] + dims.freq.d3[d3]) / 3;
  score += freqScore * weights.freq;
  
  // 遗漏值
  const missScore = (dims.missing.d1[d1] + dims.missing.d2[d2] + dims.missing.d3[d3]) / 3;
  score += missScore * weights.miss;
  
  // 和值
  const sum = d1 + d2 + d3;
  const sumDiff = Math.abs(sum - dims.avgSum);
  score += Math.max(0, 10 - sumDiff) * weights.sum;
  
  // 跨度
  const span = Math.max(d1, d2, d3) - Math.min(d1, d2, d3);
  const spanDiff = Math.abs(span - dims.avgSpan);
  score += Math.max(0, 5 - spanDiff) * weights.span;
  
  // 奇偶
  const oddCount = digits.filter(x => x % 2 === 1).length;
  const oddDiff = Math.abs(oddCount - dims.avgOdd);
  score += Math.max(0, 3 - oddDiff) * weights.odd;
  
  // 大小
  const bigCount = digits.filter(x => x >= 5).length;
  const bigDiff = Math.abs(bigCount - dims.avgBig);
  score += Math.max(0, 3 - bigDiff) * weights.big;
  
  // 豹子
  if (d1 === d2 && d2 === d3) score += weights.baozi;
  
  // 位置延续
  if (d1 === dims.prev.d1) score += weights.pos;
  if (d2 === dims.prev.d2) score += weights.pos;
  if (d3 === dims.prev.d3) score += weights.pos;
  
  return score;
}

function testWeights(weights, testCount = 100) {
  const startIdx = allData.length - testCount;
  let hit = 0;
  
  for (let i = startIdx; i < allData.length; i++) {
    const dims = analyzeDimensions(allData, i);
    const current = allData[i];
    const actual = `${current.d1}${current.d2}${current.d3}`;
    
    const scores = [];
    for (let num = 0; num < 1000; num++) {
      scores.push({ num, score: scoreNumber(num, dims, weights) });
    }
    scores.sort((a, b) => b.score - a.score);
    
    const top650 = scores.slice(0, 650).map(s => String(s.num).padStart(3, '0'));
    if (top650.includes(actual)) hit++;
  }
  
  return (hit / testCount * 100).toFixed(1);
}

// 测试不同权重组合
console.log("=== 权重优化测试 ===\n");

const weightSets = [
  { name: '原始', freq: 2, miss: 3, sum: 2, span: 2, odd: 1, big: 1, baozi: -20, pos: 1 },
  { name: '高遗漏', freq: 1, miss: 5, sum: 2, span: 2, odd: 1, big: 1, baozi: -20, pos: 1 },
  { name: '高频率', freq: 5, miss: 1, sum: 2, span: 2, odd: 1, big: 1, baozi: -20, pos: 1 },
  { name: '和值优先', freq: 2, miss: 2, sum: 5, span: 3, odd: 1, big: 1, baozi: -20, pos: 1 },
  { name: '跨度优先', freq: 2, miss: 2, sum: 3, span: 5, odd: 1, big: 1, baozi: -20, pos: 1 },
  { name: '平衡型', freq: 3, miss: 3, sum: 3, span: 3, odd: 2, big: 2, baozi: -25, pos: 1 },
  { name: '综合优化1', freq: 2, miss: 4, sum: 4, span: 3, odd: 2, big: 2, baozi: -30, pos: 2 },
  { name: '综合优化2', freq: 3, miss: 4, sum: 3, span: 2, odd: 1, big: 1, baozi: -25, pos: 1 },
  { name: '综合优化3', freq: 2, miss: 5, sum: 3, span: 2, odd: 2, big: 2, baozi: -30, pos: 1 },
  { name: '激进遗漏', freq: 1, miss: 7, sum: 3, span: 2, odd: 1, big: 1, baozi: -30, pos: 1 },
];

const results = [];
for (const ws of weightSets) {
  const hitRate = testWeights(ws, 100);
  results.push({ name: ws.name, hitRate: parseFloat(hitRate), weights: ws });
  console.log(`${ws.name}: ${hitRate}%`);
}

results.sort((a, b) => b.hitRate - a.hitRate);
console.log("\n=== 排名 ===");
for (let i = 0; i < results.length; i++) {
  console.log(`${i+1}. ${results[i].name}: ${results[i].hitRate}%`);
}

// 用最佳权重做完整回测
console.log("\n=== 最佳权重完整回测 (200期) ===");
const bestWeights = results[0].weights;
const startIdx = allData.length - 200;
let totalHit = 0;
const details = [];

for (let i = startIdx; i < allData.length; i++) {
  const dims = analyzeDimensions(allData, i);
  const current = allData[i];
  const actual = `${current.d1}${current.d2}${current.d3}`;
  
  const scores = [];
  for (let num = 0; num < 1000; num++) {
    scores.push({ num, score: scoreNumber(num, dims, bestWeights) });
  }
  scores.sort((a, b) => b.score - a.score);
  
  const top650 = scores.slice(0, 650).map(s => String(s.num).padStart(3, '0'));
  const hit = top650.includes(actual);
  
  if (hit) totalHit++;
  details.push({ issue: current.issue, actual, hit, predCount: top650.length });
}

console.log(`测试期数: 200`);
console.log(`命中: ${totalHit} (${(totalHit/200*100).toFixed(1)}%)`);
console.log(`使用权重: ${results[0].name}\n`);

console.log("最近20期:");
details.slice(-20).forEach(d => {
  console.log(`  ${d.issue}: ${d.hit?'✓':'✗'} ${d.actual}`);
});

// 生成下一期预测
console.log("\n=== 下一期预测 ===");
const dims = analyzeDimensions(allData, allData.length);
const scores = [];
for (let num = 0; num < 1000; num++) {
  scores.push({ num, score: scoreNumber(num, dims, bestWeights) });
}
scores.sort((a, b) => b.score - a.score);
const predictions = scores.slice(0, 650).map(s => String(s.num).padStart(3, '0'));

console.log(`生成${predictions.length}注`);
console.log(`前30注: ${predictions.slice(0, 30).join(', ')}`);

const outputPath = path.join(__dirname, 'optimized_prediction.json');
fs.writeFileSync(outputPath, JSON.stringify({
  weights: bestWeights,
  hitRate: (totalHit/200*100).toFixed(1),
  predictions
}, null, 2));
console.log(`\n已保存: ${outputPath}`);
