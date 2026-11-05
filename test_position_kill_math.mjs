// 位杀算法 - 数学逻辑驱动
import { lotteryData as draws } from './lottery-app/src/data/lotteryData.js';

const data = [...draws].sort((a, b) => Number(a.issue) - Number(b.issue));

// V1: 频率位杀 - 杀近5期该位置出现过的数字
function positionKillByFrequency(prevData, pos) {
  const recent = prevData.slice(-5);
  const killSet = new Set(recent.map(d => d[pos]));
  return Array.from(killSet);
}

// V2: 遗漏位杀 - 杀当前遗漏值最大的2个数字
function positionKillByMissing(prevData, pos) {
  const missing = {};
  for (let d = 0; d <= 9; d++) {
    let miss = 0;
    for (let i = prevData.length - 1; i >= 0; i--) {
      if (prevData[i][pos] === d) break;
      miss++;
    }
    missing[d] = miss;
  }
  const sorted = Object.entries(missing).sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 2).map(x => parseInt(x[0]));
}

// V3: 邻位关联位杀 - 杀其他位置近期高频数字
function positionKillByNeighbor(prevData, pos) {
  const otherPos = pos === 'd1' ? 'd2' : (pos === 'd2' ? 'd3' : 'd1');
  const recent = prevData.slice(-3);
  const killSet = new Set(recent.map(d => d[otherPos]));
  return Array.from(killSet);
}

// V4: 综合位杀 - 频率+遗漏+邻位
function positionKillComprehensive(prevData, pos) {
  const otherPos1 = pos === 'd1' ? 'd2' : 'd1';
  const otherPos2 = pos === 'd3' ? 'd2' : 'd3';
  
  const killSet = new Set();
  
  // 频率：近3期该位置
  prevData.slice(-3).forEach(d => killSet.add(d[pos]));
  
  // 遗漏：遗漏值>=10的数字
  for (let d = 0; d <= 9; d++) {
    let miss = 0;
    for (let i = prevData.length - 1; i >= 0; i--) {
      if (prevData[i][pos] === d) break;
      miss++;
    }
    if (miss >= 10) killSet.add(d);
  }
  
  // 邻位：近2期其他位置
  prevData.slice(-2).forEach(d => {
    killSet.add(d[otherPos1]);
    killSet.add(d[otherPos2]);
  });
  
  return Array.from(killSet);
}

// V5: 精简位杀 - 只杀2个（上期该位+上上期该位）
function positionKillSimple(prevData, pos) {
  if (prevData.length < 2) return [];
  return [prevData[prevData.length-1][pos], prevData[prevData.length-2][pos]];
}

// V6: 和值约束位杀 - 基于和值范围杀位
function positionKillBySum(prevData, pos) {
  const recent = prevData.slice(-5);
  const avgSum = recent.reduce((s, d) => s + d.d1 + d.d2 + d.d3, 0) / 5;
  
  const killSet = new Set();
  // 如果平均和值偏大(>=15)，杀大数字(7,8,9)
  if (avgSum >= 15) {
    if (pos === 'd1') killSet.add(9);
    if (pos === 'd2') killSet.add(8);
    if (pos === 'd3') killSet.add(7);
  }
  // 如果平均和值偏小(<=10)，杀小数字(0,1,2)
  if (avgSum <= 10) {
    if (pos === 'd1') killSet.add(0);
    if (pos === 'd2') killSet.add(1);
    if (pos === 'd3') killSet.add(2);
  }
  
  // 加上上期该位
  killSet.add(prevData[prevData.length-1][pos]);
  
  return Array.from(killSet);
}

// 测试函数
function testPositionKill(name, killFunc) {
  let total = 0;
  let baiHit = 0, shiHit = 0, geHit = 0;
  let baiTotal = 0, shiTotal = 0, geTotal = 0;
  let baiKillCount = 0, shiKillCount = 0, geKillCount = 0;
  
  for (let i = 10; i < data.length; i++) {
    const prevData = data.slice(0, i);
    const curr = data[i];
    
    const baiKill = killFunc(prevData, 'd1');
    const shiKill = killFunc(prevData, 'd2');
    const geKill = killFunc(prevData, 'd3');
    
    baiKillCount += baiKill.length;
    shiKillCount += shiKill.length;
    geKillCount += geKill.length;
    
    baiTotal++;
    shiTotal++;
    geTotal++;
    
    if (!baiKill.includes(curr.d1)) baiHit++;
    if (!shiKill.includes(curr.d2)) shiHit++;
    if (!geKill.includes(curr.d3)) geHit++;
    
    total++;
  }
  
  console.log(`\n=== ${name} ===`);
  console.log(`百位命中率: ${(baiHit/baiTotal*100).toFixed(2)}% (平均杀${(baiKillCount/baiTotal).toFixed(1)}个)`);
  console.log(`十位命中率: ${(shiHit/shiTotal*100).toFixed(2)}% (平均杀${(shiKillCount/shiTotal).toFixed(1)}个)`);
  console.log(`个位命中率: ${(geHit/geTotal*100).toFixed(2)}% (平均杀${(geKillCount/geTotal).toFixed(1)}个)`);
  console.log(`综合命中率: ${((baiHit+shiHit+geHit)/(baiTotal+shiTotal+geTotal)*100).toFixed(2)}%`);
}

console.log('=== 位杀算法测试 ===');
testPositionKill('V1 频率位杀(近5期)', positionKillByFrequency);
testPositionKill('V2 遗漏位杀(杀2个)', positionKillByMissing);
testPositionKill('V3 邻位关联位杀', positionKillByNeighbor);
testPositionKill('V4 综合位杀', positionKillComprehensive);
testPositionKill('V5 精简位杀(杀2个)', positionKillSimple);
testPositionKill('V6 和值约束位杀', positionKillBySum);
