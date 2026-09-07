// 排列三深度优化v2 - 高效搜索90%命中率
const fs = require('fs');
const path = require('path');

const lotteryDataFile = path.join(__dirname, 'pl3-app', 'src', 'data', 'lotteryData.js');
let lotteryDataStr = fs.readFileSync(lotteryDataFile, 'utf-8');
const m = lotteryDataStr.match(/export const lotteryData = \[([\s\S]*?)\];/);
const lines = m[1].split('\n').filter(l => l.trim().startsWith('{'));
const draws = lines.map(line => {
  const mm = line.match(/issue:\s*'(\d+)',\s*d1:\s*(\d+),\s*d2:\s*(\d+),\s*d3:\s*(\d+)/);
  if (mm) return { issue: mm[1], d1: Number(mm[2]), d2: Number(mm[3]), d3: Number(mm[4]) };
  return null;
}).filter(Boolean);

console.log(`排列三数据: ${draws.length}期 (${draws[0].issue} - ${draws[draws.length-1].issue})`);

const allNums = [];
for (let i = 0; i <= 999; i++) allNums.push(String(i).padStart(3, '0'));

function getType(num) {
  const d = num.split('').map(Number);
  if (d[0]===d[1]&&d[1]===d[2]) return 'B';
  if (d[0]===d[1]||d[0]===d[2]||d[1]===d[2]) return 'Z3';
  return 'Z6';
}
function getPS(num) {
  const d = num.split('').map(Number);
  if (d[0]===d[1]) return {p:d[0],s:d[2]};
  if (d[0]===d[2]) return {p:d[0],s:d[1]};
  return {p:d[1],s:d[0]};
}
function hasAny(digits, str) {
  return str.length>0 && str.split('').some(x => digits.includes(Number(x)));
}
function matchBase(num, cond) {
  const d = num.split('').map(Number);
  const t = getType(num);
  if (t==='B') return false;
  if (t==='Z6') return hasAny(d, cond.dg1) && hasAny(d, cond.dg2);
  const {p,s} = getPS(num);
  return cond.zs1.includes(String(p)) && cond.zs2.includes(String(s));
}

const conditions = [
  {danma:'368',dg1:'2',dg2:'147',zs1:'0124579',zs2:'68'},
  {danma:'478',dg1:'12',dg2:'69',zs1:'0123569',zs2:'48'},
  {danma:'23459',dg1:'01',dg2:'68',zs1:'01678',zs2:'23459'},
  {danma:'0345789',dg1:'1',dg2:'26',zs1:'126',zs2:'035789'},
  {danma:'0148',dg1:'23',dg2:'69',zs1:'235679',zs2:'048'},
  {danma:'6789',dg1:'5',dg2:'02',zs1:'012345',zs2:'689'},
  {danma:'0234579',dg1:'18',dg2:'',zs1:'168',zs2:'023459'},
  {danma:'034589',dg1:'16',dg2:'2',zs1:'1267',zs2:'03589'},
  {danma:'04678',dg1:'13',dg2:'29',zs1:'12359',zs2:'068'},
  {danma:'1346',dg1:'09',dg2:'2',zs1:'025789',zs2:'346'},
  {danma:'0268',dg1:'1',dg2:'379',zs1:'134579',zs2:'028'},
  {danma:'23678',dg1:'45',dg2:'09',zs1:'01459',zs2:'23678'},
  {danma:'479',dg1:'5',dg2:'023',zs1:'0123568',zs2:'479'},
  {danma:'0157',dg1:'6',dg2:'2349',zs1:'234689',zs2:'0157'},
  {danma:'01269',dg1:'',dg2:'358',zs1:'34578',zs2:'0269'},
  {danma:'159',dg1:'8',dg2:'026',zs1:'0234678',zs2:'159'},
  {danma:'2478',dg1:'15',dg2:'069',zs1:'013569',zs2:'2478'},
  {danma:'013689',dg1:'',dg2:'245',zs1:'2457',zs2:'0689'},
];

const condScore = {};
allNums.forEach(n => { let s=0; conditions.forEach(c=>{if(matchBase(n,c))s++;}); condScore[n]=s; });

// ========== 10个策略 ==========
function s0_baseline(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const sc={}; allNums.forEach(n=>{let rh=0;r100.forEach(d=>{if(`${d.d1}${d.d2}${d.d3}`===n)rh++;});sc[n]=condScore[n]*10+rh*150;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s1_posFreq(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const pf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d=>{pf[0][d.d1]++;pf[1][d.d2]++;pf[2][d.d3]++;});
  const rf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r20.forEach(d=>{rf[0][d.d1]++;rf[1][d.d2]++;rf[2][d.d3]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);let ps=0;for(let p=0;p<3;p++)ps+=pf[p][d[p]]*2+rf[p][d[p]]*5;let rh=0;r100.forEach(dr=>{if(`${dr.d1}${dr.d2}${dr.d3}`===n)rh++;});sc[n]=ps*3+condScore[n]*10+rh*100;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s2_missing(draws, idx) {
  const lastApp={}; allNums.forEach(n=>lastApp[n]=-1);
  for(let i=idx;i>=Math.max(0,idx-199);i--){const n=`${draws[i].d1}${draws[i].d2}${draws[i].d3}`;if(lastApp[n]===-1)lastApp[n]=idx-i;}
  const sc={}; allNums.forEach(n=>{const m=lastApp[n]===-1?200:lastApp[n];let s=0;if(m>=5&&m<=30)s=50;else if(m>=31&&m<=60)s=30;else if(m>=1&&m<=4)s=40;else if(m===0)s=20;else s=10;sc[n]=s;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s3_sumSpan(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const sf=new Array(28).fill(0),spf=new Array(10).fill(0);
  r100.forEach(d=>{sf[d.d1+d.d2+d.d3]++;spf[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);sc[n]=sf[d[0]+d[1]+d[2]]*3+spf[Math.max(...d)-Math.min(...d)]*5;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s4_paritySize(draws, idx) {
  const r50=draws.slice(Math.max(0,idx-49),idx+1);
  const parityFreq=new Array(8).fill(0),sizeFreq=new Array(8).fill(0),psFreq=new Array(64).fill(0);
  r50.forEach(d=>{const pBit=(d.d1%2)*4+(d.d2%2)*2+(d.d3%2);const sBit=(d.d1>=5?1:0)*4+(d.d2>=5?1:0)*2+(d.d3>=5?1:0);parityFreq[pBit]++;sizeFreq[sBit]++;psFreq[pBit*8+sBit]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);const pBit=(d[0]%2)*4+(d[1]%2)*2+(d[2]%2);const sBit=(d[0]>=5?1:0)*4+(d[1]>=5?1:0)*2+(d[2]>=5?1:0);sc[n]=parityFreq[pBit]*5+sizeFreq[sBit]*5+psFreq[pBit*8+sBit]*8;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s5_pairCorr(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const p01=new Array(100).fill(0),p02=new Array(100).fill(0),p12=new Array(100).fill(0);
  r100.forEach(d=>{p01[d.d1*10+d.d2]++;p02[d.d1*10+d.d3]++;p12[d.d2*10+d.d3]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);sc[n]=p01[d[0]*10+d[1]]*3+p02[d[0]*10+d[2]]*3+p12[d[1]*10+d[2]]*3;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s6_momentum(draws, idx) {
  const r10=draws.slice(Math.max(0,idx-9),idx+1);
  const freq={}; allNums.forEach(n=>freq[n]=0);
  r10.forEach(d=>{freq[`${d.d1}${d.d2}${d.d3}`]++;});
  const pf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r10.forEach(d=>{pf[0][d.d1]++;pf[1][d.d2]++;pf[2][d.d3]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);let ps=0;for(let p=0;p<3;p++)ps+=pf[p][d[p]];sc[n]=freq[n]*200+ps*8+condScore[n]*5;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s7_sumSpanP(draws, idx) {
  const r50=draws.slice(Math.max(0,idx-49),idx+1);
  const r20=draws.slice(Math.max(0,idx-19),idx+1);
  const sf50=new Array(28).fill(0),sf20=new Array(28).fill(0),spf50=new Array(10).fill(0),spf20=new Array(10).fill(0);
  r50.forEach(d=>{sf50[d.d1+d.d2+d.d3]++;spf50[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  r20.forEach(d=>{sf20[d.d1+d.d2+d.d3]++;spf20[Math.max(d.d1,d.d2,d.d3)-Math.min(d.d1,d.d2,d.d3)]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);const sum=d[0]+d[1]+d[2],span=Math.max(...d)-Math.min(...d);sc[n]=sf20[sum]*8+sf50[sum]*3+spf20[span]*12+spf50[span]*5;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s8_posIndep(draws, idx) {
  const r100=draws.slice(Math.max(0,idx-99),idx+1);
  const pf=[[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[0,0,0,0,0,0,0,0,0,0]];
  r100.forEach(d=>{pf[0][d.d1]++;pf[1][d.d2]++;pf[2][d.d3]++;});
  const sc={}; allNums.forEach(n=>{const d=n.split('').map(Number);sc[n]=(pf[0][d[0]]+1)*(pf[1][d[1]]+1)*(pf[2][d[2]]+1)+condScore[n]*50;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}
function s9_warmNum(draws, idx) {
  const lastApp={}; allNums.forEach(n=>lastApp[n]=999);
  const appCount={}; allNums.forEach(n=>appCount[n]=0);
  for(let i=idx;i>=Math.max(0,idx-299);i--){const n=`${draws[i].d1}${draws[i].d2}${draws[i].d3}`;appCount[n]++;if(lastApp[n]===999)lastApp[n]=idx-i;}
  const sc={}; allNums.forEach(n=>{const m=lastApp[n]===999?300:lastApp[n];const freq=appCount[n];let s=0;if(m>=3&&m<=20){s=60;if(freq>=2&&freq<=5)s+=20;}else if(m>=21&&m<=50)s=35;else if(m>=1&&m<=2)s=45;else if(m===0)s=25;else s=10;sc[n]=s+freq*3;});
  return Object.entries(sc).sort((a,b)=>b[1]-a[1]).map(([n])=>n);
}

const allStrategies = [s0_baseline, s1_posFreq, s2_missing, s3_sumSpan, s4_paritySize, 
                       s5_pairCorr, s6_momentum, s7_sumSpanP, s8_posIndep, s9_warmNum];
const stratNames = ['baseline','posFreq','missing','sumSpan','paritySize','pairCorr','momentum','sumSpanP','posIndep','warmNum'];

// ========== 预计算排名 ==========
console.log('\n预计算10个策略排名...');
const startIdx = 100;
const endIdx = draws.length - 1;
const totalPeriods = endIdx - startIdx + 1;

// rankMatrix[stratIdx][periodOffset] = Int16Array(1000) 排名
const rankMatrix = [];
for (let s = 0; s < 10; s++) rankMatrix.push([]);

for (let idx = startIdx; idx <= endIdx; idx++) {
  const historyIdx = idx - 1;
  const history = draws.slice(0, idx);
  for (let s = 0; s < 10; s++) {
    const ranked = allStrategies[s](history, historyIdx);
    const rankArr = new Int16Array(1000);
    ranked.forEach((num, rank) => { rankArr[parseInt(num)] = rank; });
    rankMatrix[s].push(rankArr);
  }
  if ((idx - startIdx) % 50 === 0) process.stdout.write(`\r  预计算 ${idx-startIdx+1}/${totalPeriods} 期...`);
}
console.log('\r  预计算完成!                    ');

// 实际开奖号
const actualNums = [];
for (let idx = startIdx; idx <= endIdx; idx++) {
  actualNums.push(parseInt(`${draws[idx].d1}${draws[idx].d2}${draws[idx].d3}`));
}

// ========== 高效评估 ==========
// 对每个period，预计算每个策略在每个threshold下的binary mask
// binary[stratIdx][thresholdIdx] = Uint8Array[periodCount * 1000]
// 太占内存，改为按需计算

function evalConfigFast(stratIndices, weights, threshold, targetCount) {
  let hits = 0;
  const nPeriods = actualNums.length;
  const nStrats = stratIndices.length;
  
  // 预提取排名数据
  const stratRanks = stratIndices.map(s => rankMatrix[s]);
  
  for (let pi = 0; pi < nPeriods; pi++) {
    // 计算投票
    const votes = new Int16Array(1000);
    for (let si = 0; si < nStrats; si++) {
      const ranks = stratRanks[si][pi];
      const w = weights[si];
      for (let n = 0; n < 1000; n++) {
        if (ranks[n] < threshold) votes[n] += w;
      }
    }
    
    // 找第targetCount大的值
    const voteHist = new Int16Array(20); // max vote = sum of weights
    const maxVote = weights.reduce((a,b)=>a+b, 0);
    for (let n = 0; n < 1000; n++) {
      if (votes[n] <= maxVote) voteHist[votes[n]]++;
    }
    
    let cum = 0, cutoff = 0;
    for (let v = maxVote; v >= 0; v--) {
      cum += voteHist[v];
      if (cum >= targetCount) { cutoff = v; break; }
    }
    
    // 检查actual是否在top-targetCount中
    const actual = actualNums[pi];
    if (votes[actual] > cutoff) {
      hits++;
    } else if (votes[actual] === cutoff) {
      // 需要确认actual在cutoff范围内
      let aboveCount = 0;
      for (let n = 0; n < 1000; n++) {
        if (votes[n] > cutoff) aboveCount++;
      }
      if (aboveCount < targetCount) {
        // 还有空间，检查actual编号是否在cutoff中排前面
        let cutoffCount = 0;
        let hit = false;
        for (let n = 0; n < 1000; n++) {
          if (votes[n] === cutoff) {
            if (n === actual) { hit = true; break; }
            cutoffCount++;
            if (aboveCount + cutoffCount >= targetCount) break;
          }
        }
        if (hit) hits++;
      }
    }
  }
  
  return hits / nPeriods;
}

// ========== 搜索 ==========
console.log('\n开始搜索最优配置...');
const startTime = Date.now();

// 策略组合
const combos = [];
// 2策略
for(let i=0;i<10;i++) for(let j=i+1;j<10;j++) combos.push([i,j]);
// 3策略 - 重点组合
const c3 = [[0,1,2],[0,1,3],[0,1,4],[0,1,5],[0,1,7],[0,1,9],[0,2,3],[0,3,4],[0,4,5],[1,2,3],[1,3,4],[1,4,5],[0,1,6],[0,1,8],[1,5,7],[0,5,9],[1,4,9]];
combos.push(...c3);
// 4策略 - 重点组合
const c4 = [[0,1,2,3],[0,1,3,4],[0,1,4,5],[0,1,2,4],[0,1,3,5],[0,1,4,7],[0,1,4,9],[0,1,5,7],[0,1,5,9],[0,1,7,9],[1,3,4,5],[0,3,4,5],[0,1,2,5],[0,1,3,9],[1,4,5,7],[0,4,5,9]];
combos.push(...c4);
// 5策略
const c5 = [[0,1,2,3,4],[0,1,3,4,5],[0,1,4,5,7],[0,1,4,5,9],[0,1,3,4,7],[0,1,3,5,7],[0,1,2,4,5],[0,1,4,7,9],[0,1,3,4,9]];
combos.push(...c5);
// 6策略
const c6 = [[0,1,2,3,4,5],[0,1,3,4,5,7],[0,1,4,5,7,9],[0,1,3,4,5,9]];
combos.push(...c6);

// 权重模式
const weightPatterns = {
  2: [[1,1],[2,1],[1,2],[3,1],[2,2],[3,2]],
  3: [[1,1,1],[2,1,1],[2,2,1],[3,2,1],[3,1,1],[2,1,2]],
  4: [[2,2,1,1],[3,2,1,1],[2,2,2,1],[3,2,2,1],[4,2,1,1],[2,2,2,2],[3,3,1,1]],
  5: [[2,2,1,1,1],[3,2,1,1,1],[2,2,2,1,1],[3,2,2,1,1],[4,2,1,1,1]],
  6: [[2,2,1,1,1,1],[3,2,1,1,1,1],[2,2,2,1,1,1],[3,2,2,1,1,1]],
};

const thresholds = [100, 200, 300, 400, 500, 600, 700, 800];
const targetCounts = [600, 650, 700, 750, 800, 850, 900];

let bestConfig = null;
let bestRate = 0;
const topConfigs = [];
let totalConfigs = 0;

for (const combo of combos) {
  const size = combo.length;
  const wps = weightPatterns[size] || [[1,1]];
  
  for (const weights of wps) {
    for (const threshold of thresholds) {
      for (const tc of targetCounts) {
        totalConfigs++;
        const rate = evalConfigFast(combo, weights, threshold, tc);
        
        if (rate > bestRate) {
          bestRate = rate;
          bestConfig = { 
            combo: combo.map(i=>stratNames[i]), 
            comboIdx: combo.join(','),
            weights: [...weights], 
            threshold, 
            targetCount: tc, 
            rate 
          };
        }
        
        if (rate >= 0.80) {
          topConfigs.push({ 
            combo: combo.map(i=>stratNames[i]), 
            comboIdx: combo.join(','),
            weights: [...weights], 
            threshold, 
            targetCount: tc, 
            rate 
          });
        }
      }
    }
  }
  
  if ((combos.indexOf(combo)+1) % 20 === 0) {
    const elapsed = (Date.now() - startTime) / 1000;
    process.stdout.write(`\r  进度: ${combos.indexOf(combo)+1}/${combos.length} 组合, 最佳: ${(bestRate*100).toFixed(1)}%, 耗时: ${elapsed.toFixed(0)}s`);
  }
}

const elapsed = (Date.now() - startTime) / 1000;
console.log(`\n\n搜索完成! 总配置: ${totalConfigs}, 耗时: ${elapsed.toFixed(1)}s`);

// ========== 输出结果 ==========
console.log('\n========================================');
console.log('排列三深度优化结果 (目标90%)');
console.log('========================================');
console.log(`\n最佳配置: 命中率 ${(bestRate*100).toFixed(1)}%`);
console.log(`  策略: ${bestConfig.combo.join(' + ')}`);
console.log(`  权重: [${bestConfig.weights.join(', ')}]`);
console.log(`  阈值: ${bestConfig.threshold}`);
console.log(`  注数: ${bestConfig.targetCount}`);

// 按注数分组最佳
console.log('\n=== 各注数最佳配置 ===');
for (const tc of targetCounts) {
  const forTc = topConfigs.filter(c => c.targetCount === tc);
  if (forTc.length > 0) {
    forTc.sort((a, b) => b.rate - a.rate);
    const best = forTc[0];
    console.log(`  注数${tc}: ${(best.rate*100).toFixed(1)}% | ${best.combo.join('+')} | [${best.weights.join(',')}] | 阈值:${best.threshold}`);
  }
}

// TOP30
topConfigs.sort((a, b) => b.rate - a.rate);
const unique = [];
const seen = new Set();
for (const c of topConfigs) {
  const key = `${c.comboIdx}|${c.weights.join(',')}|${c.threshold}|${c.targetCount}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(c);
  if (unique.length >= 30) break;
}

console.log('\n=== TOP30配置 ===');
unique.forEach((c, i) => {
  console.log(`  ${i+1}. ${(c.rate*100).toFixed(1)}% | ${c.combo.join('+')} | [${c.weights.join(',')}] | 阈值:${c.threshold} | 注数:${c.targetCount}`);
});

// 85%以上
const above85 = topConfigs.filter(c => c.rate >= 0.85);
console.log(`\n85%以上配置: ${above85.length}个`);
const above90 = topConfigs.filter(c => c.rate >= 0.90);
console.log(`90%以上配置: ${above90.length}个`);
if (above90.length > 0) {
  console.log('\n=== 90%以上配置详情 ===');
  for (const c of above90.slice(0, 20)) {
    console.log(`  ${(c.rate*100).toFixed(1)}% | ${c.combo.join('+')} | [${c.weights.join(',')}] | 阈值:${c.threshold} | 注数:${c.targetCount}`);
  }
}
