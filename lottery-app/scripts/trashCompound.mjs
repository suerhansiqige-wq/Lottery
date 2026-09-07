// 垃圾复式推荐系统 - 4组推荐，每组百十个各5码
import { lotteryData as ld1 } from '../src/data/lotteryData.js';
import { lotteryData as ld2 } from '../src/data/excelData.js';

const allData = [...ld2, ...ld1];
const dataMap = new Map();
allData.forEach(d => dataMap.set(d.issue, d));
const data = [...dataMap.values()].sort((a, b) => a.issue.localeCompare(b.issue));
const N = data.length;

const START = 200;
const END = N;
const TOTAL = END - START;

console.log(`数据: ${N}期 (${data[0].issue}~${data[N-1].issue}), 测试${TOTAL}期`);

// 辅助：确保返回恰好5个不重复数字
function ensure5(arr) {
  const unique = [...new Set(arr.map(d => ((d % 10) + 10) % 10))];
  if (unique.length >= 5) return unique.slice(0, 5);
  const used = new Set(unique);
  for (let d = 0; d < 10 && unique.length < 5; d++) {
    if (!used.has(d)) unique.push(d);
  }
  return unique;
}

// ========== 百位推荐公式（4组不同策略）==========
const baiStrategies = [
  (i) => {
    const p=data[i-1].d1, s=(data[i-1].d1+data[i-1].d2+data[i-1].d3)%10;
    const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3], sp=Math.max(...d)-Math.min(...d);
    return ensure5([p,(p+1)%10,(p+9)%10,s,(s+1)%10,sp]);
  },
  (i) => {
    const freq=Array(10).fill(0);
    for(let j=1;j<=7;j++) freq[data[i-j].d1]++;
    const hot=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
    const gaps=Array(10).fill(99);
    for(let d=0;d<10;d++) for(let j=1;j<=15;j++){if(data[i-j].d1===d){gaps[d]=j;break;}}
    const cold=[...gaps.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
    return ensure5([...hot,...cold]);
  },
  (i) => {
    const p=data[i-1].d1, s=data[i-1].d1+data[i-1].d2+data[i-1].d3;
    const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3], sp=Math.max(...d)-Math.min(...d);
    return ensure5([(p*2)%10,(p*3+1)%10,(s%10),(sp+p)%10,(data[i-1].d2+data[i-1].d3)%10,(9-p)]);
  },
  (i) => {
    const p=data[i-1].d1;
    const recent3=(data[i-1].d1+data[i-2].d1+data[i-3].d1)%10;
    const mod5=data[i-1].d1%5;
    const trend=(data[i-1].d1-data[i-2].d1+10)%10;
    return ensure5([p,(p+2)%10,(p+5)%10,recent3,(mod5*2+1)%10,trend]);
  },
];

// ========== 十位推荐公式 ==========
const shiStrategies = [
  (i) => {
    const p=data[i-1].d2, s=(data[i-1].d1+data[i-1].d2+data[i-1].d3)%10;
    const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3], sp=Math.max(...d)-Math.min(...d);
    return ensure5([p,(p+1)%10,(p+9)%10,s,(s+2)%10,(sp+data[i-1].d2)%10]);
  },
  (i) => {
    const freq=Array(10).fill(0);
    for(let j=1;j<=7;j++) freq[data[i-j].d2]++;
    const hot=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
    const gaps=Array(10).fill(99);
    for(let d=0;d<10;d++) for(let j=1;j<=15;j++){if(data[i-j].d2===d){gaps[d]=j;break;}}
    const cold=[...gaps.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
    return ensure5([...hot,...cold,(data[i-1].d1+data[i-1].d3)%10]);
  },
  (i) => {
    const p=data[i-1].d2, s=data[i-1].d1+data[i-1].d2+data[i-1].d3;
    const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3], sp=Math.max(...d)-Math.min(...d);
    return ensure5([(p*3)%10,(p+4)%10,(s+sp)%10,(data[i-1].d1+data[i-1].d3)%10,(sp*2)%10,(9-p)]);
  },
  (i) => {
    const p=data[i-1].d2;
    const recent3=(data[i-1].d2+data[i-2].d2+data[i-3].d2)%10;
    const mod5=data[i-1].d2%5;
    const trend=(data[i-1].d2-data[i-2].d2+10)%10;
    return ensure5([p,(p+3)%10,(p+7)%10,recent3,(mod5*2+3)%10,trend]);
  },
];

// ========== 个位推荐公式 ==========
const geStrategies = [
  (i) => {
    const p=data[i-1].d3, s=(data[i-1].d1+data[i-1].d2+data[i-1].d3)%10;
    const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3], sp=Math.max(...d)-Math.min(...d);
    return ensure5([p,(p+1)%10,(p+9)%10,s,(s+3)%10,(sp+data[i-1].d3)%10]);
  },
  (i) => {
    const freq=Array(10).fill(0);
    for(let j=1;j<=7;j++) freq[data[i-j].d3]++;
    const hot=[...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
    const gaps=Array(10).fill(99);
    for(let d=0;d<10;d++) for(let j=1;j<=15;j++){if(data[i-j].d3===d){gaps[d]=j;break;}}
    const cold=[...gaps.entries()].sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
    return ensure5([...hot,...cold,(data[i-1].d1+data[i-1].d2)%10]);
  },
  (i) => {
    const p=data[i-1].d3, s=data[i-1].d1+data[i-1].d2+data[i-1].d3;
    const d=[data[i-1].d1,data[i-1].d2,data[i-1].d3], sp=Math.max(...d)-Math.min(...d);
    return ensure5([(p*2+1)%10,(p+5)%10,(s*3)%10,(data[i-1].d1+data[i-1].d2)%10,(sp+3)%10,(9-p)]);
  },
  (i) => {
    const p=data[i-1].d3;
    const recent3=(data[i-1].d3+data[i-2].d3+data[i-3].d3)%10;
    const mod5=data[i-1].d3%5;
    const trend=(data[i-1].d3-data[i-2].d3+10)%10;
    return ensure5([p,(p+4)%10,(p+6)%10,recent3,(mod5*2+2)%10,trend]);
  },
];

// ========== 4组推荐 ==========
const strategies = [];
for (let g = 0; g < 4; g++) {
  strategies.push({
    name: `推荐${['一','二','三','四'][g]}`,
    bai: baiStrategies[g],
    shi: shiStrategies[g],
    ge: geStrategies[g]
  });
}

// ========== 验证 ==========
console.log(`\n测试: ${data[START].issue}~${data[END-1].issue} (${TOTAL}期)\n`);

// 单组统计
console.log('===== 单组复式推荐 =====\n');
for (const s of strategies) {
  let baiHits=0, shiHits=0, geHits=0, total=0;
  let all3=0, atLeast2=0;
  let maxC3=0, curC3=0, maxCF=0, curCF=0;

  for (let i = START; i < END; i++) {
    const bk=s.bai(i), sk=s.shi(i), gk=s.ge(i);
    const a=data[i];
    const bH=bk.includes(a.d1), sH=sk.includes(a.d2), gH=gk.includes(a.d3);
    total++;
    if(bH) baiHits++; if(sH) shiHits++; if(gH) geHits++;
    const hc=(bH?1:0)+(sH?1:0)+(gH?1:0);
    if(hc===3){all3++;curC3++;curCF=0;} else {curC3=0;curCF++;}
    if(hc>=2) atLeast2++;
    maxC3=Math.max(maxC3,curC3); maxCF=Math.max(maxCF,curCF);
  }

  console.log(`${s.name} (测试${total}期):`);
  console.log(`  百位: ${baiHits}/${total}=${(baiHits/total*100).toFixed(1)}% | 十位: ${shiHits}/${total}=${(shiHits/total*100).toFixed(1)}% | 个位: ${geHits}/${total}=${(geHits/total*100).toFixed(1)}%`);
  console.log(`  3位全中: ${all3}/${total}=${(all3/total*100).toFixed(1)}% | >=2位中: ${atLeast2}/${total}=${(atLeast2/total*100).toFixed(1)}%`);
  console.log(`  最大连对: ${maxC3} | 最大连错: ${maxCF}\n`);
}

// 4组组合
console.log('===== 4组组合 =====\n');
let comboAny3=0, comboAll4_3=0;
let comboAtLeast2=0;
let maxCC=0, curCC=0, maxCF2=0, curCF2=0;
let posCover = {bai:0, shi:0, ge:0};

for (let i = START; i < END; i++) {
  const a = data[i];
  let anyAll3 = false, allAll3 = true, anyAtLeast2 = false;

  for (const s of strategies) {
    const bk=s.bai(i), sk=s.shi(i), gk=s.ge(i);
    const bH=bk.includes(a.d1), sH=sk.includes(a.d2), gH=gk.includes(a.d3);
    const hc=(bH?1:0)+(sH?1:0)+(gH?1:0);

    if(bH) posCover.bai++; if(sH) posCover.shi++; if(gH) posCover.ge++;
    if(hc===3) { anyAll3=true; } else { allAll3=false; }
    if(hc>=2) anyAtLeast2=true;
  }

  if(anyAll3){comboAny3++;curCC++;curCF2=0;} else {curCC=0;curCF2++;}
  if(allAll3) comboAll4_3++;
  if(anyAtLeast2) comboAtLeast2++;
  maxCC=Math.max(maxCC,curCC); maxCF2=Math.max(maxCF2,curCF2);
}

console.log(`单位置4组覆盖:`);
console.log(`  百位: ${posCover.bai}/${TOTAL}=${(posCover.bai/TOTAL*100).toFixed(1)}%`);
console.log(`  十位: ${posCover.shi}/${TOTAL}=${(posCover.shi/TOTAL*100).toFixed(1)}%`);
console.log(`  个位: ${posCover.ge}/${TOTAL}=${(posCover.ge/TOTAL*100).toFixed(1)}%`);
console.log(`\n4组组合统计:`);
console.log(`  任意1组3位全中: ${comboAny3}/${TOTAL}=${(comboAny3/TOTAL*100).toFixed(1)}%`);
console.log(`  全部4组3位全中: ${comboAll4_3}/${TOTAL}=${(comboAll4_3/TOTAL*100).toFixed(1)}%`);
console.log(`  任意1组>=2位中: ${comboAtLeast2}/${TOTAL}=${(comboAtLeast2/TOTAL*100).toFixed(1)}%`);
console.log(`  最大连对(任意1组3位全中): ${maxCC}`);
console.log(`  最大连错: ${maxCF2}`);

// 展示前10期
console.log('\n===== 前10期推荐展示 =====\n');
for (let i = START; i < START+10 && i < END; i++) {
  const a=data[i];
  console.log(`${a.issue}期 开奖: ${a.d1}${a.d2}${a.d3}`);
  for (const s of strategies) {
    const bk=s.bai(i), sk=s.shi(i), gk=s.ge(i);
    const bH=bk.includes(a.d1)?'Y':'N';
    const sH=sk.includes(a.d2)?'Y':'N';
    const gH=gk.includes(a.d3)?'Y':'N';
    console.log(`  ${s.name}: 百[${bk.sort((x,y)=>x-y).join(',')}]${bH} 十[${sk.sort((x,y)=>x-y).join(',')}]${sH} 个[${gk.sort((x,y)=>x-y).join(',')}]${gH}`);
  }
  console.log('');
}
