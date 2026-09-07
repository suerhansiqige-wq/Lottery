const { lotteryData } = require('./lottery-app/src/data/lotteryData.js');
const data = lotteryData;

console.log('=== 杀百十个各2码 - 全网算法大搜索 ===\n');
console.log('目标：找出总体全杀对最高概率的算法\n');

function test(fn, name) {
  let total = 0, allPass = 0;
  let posPass = [0, 0, 0];
  for (let i = 0; i < data.length - 1; i++) {
    try {
      const kills = fn(data, i);
      if (!kills || kills.length < 3) continue;
      if (kills[0].length < 2 || kills[1].length < 2 || kills[2].length < 2) continue;
      const next = data[i + 1];
      total++;
      const bOk = !kills[0].includes(next.d1);
      const sOk = !kills[1].includes(next.d2);
      const gOk = !kills[2].includes(next.d3);
      if (bOk) posPass[0]++;
      if (sOk) posPass[1]++;
      if (gOk) posPass[2]++;
      if (bOk && sOk && gOk) allPass++;
    } catch(e) {}
  }
  const rate = (allPass/total*100).toFixed(1);
  console.log(`${name}: 总体${rate}% | 百${(posPass[0]/total*100).toFixed(1)}% 十${(posPass[1]/total*100).toFixed(1)}% 个${(posPass[2]/total*100).toFixed(1)}%`);
  return parseFloat(rate);
}

// ========== 一、和值类算法 ==========

// 1. 和值尾杀百位
test((d, i) => {
  const hv = (d[i].d1 + d[i].d2 + d[i].d3) % 10;
  return [[hv, (hv+1)%10], [(hv+2)%10, (hv+3)%10], [(hv+4)%10, (hv+5)%10]];
}, '和值尾递进杀');

// 2. 和值对码杀
test((d, i) => {
  const hv = (d[i].d1 + d[i].d2 + d[i].d3) % 10;
  const dm = n => (n + 5) % 10;
  return [[hv, dm(hv)], [dm(hv), (hv+1)%10], [(hv+1)%10, dm((hv+1)%10)]];
}, '和值对码杀');

// 3. 和值邻码杀
test((d, i) => {
  const hv = (d[i].d1 + d[i].d2 + d[i].d3) % 10;
  return [[(hv+9)%10, (hv+1)%10], [(hv+8)%10, (hv+2)%10], [(hv+7)%10, (hv+3)%10]];
}, '和值邻码杀');

// ========== 二、跨度类算法 ==========

// 4. 跨度杀号
test((d, i) => {
  const span = Math.max(d[i].d1,d[i].d2,d[i].d3) - Math.min(d[i].d1,d[i].d2,d[i].d3);
  return [[span, (span+1)%10], [(span+2)%10, (span+3)%10], [(span+4)%10, (span+5)%10]];
}, '跨度递进杀');

// 5. 跨度对码杀
test((d, i) => {
  const span = Math.max(d[i].d1,d[i].d2,d[i].d3) - Math.min(d[i].d1,d[i].d2,d[i].d3);
  const dm = n => (n + 5) % 10;
  return [[span, dm(span)], [dm(span), (span+1)%10], [(span+1)%10, dm((span+1)%10)]];
}, '跨度对码杀');

// ========== 三、012路算法 ==========

// 6. 012路杀号（上期同路杀）
test((d, i) => {
  const r0 = d[i].d1 % 3, r1 = d[i].d2 % 3, r2 = d[i].d3 % 3;
  const get2 = (mod) => { const r = []; for(let n=0;n<10;n++) if(n%3===mod) r.push(n); return r.slice(0,2); };
  return [get2(r0), get2(r1), get2(r2)];
}, '012路同路杀');

// 7. 012路杀号（上期不同路杀）
test((d, i) => {
  const r0 = (d[i].d1 % 3 + 1) % 3, r1 = (d[i].d2 % 3 + 1) % 3, r2 = (d[i].d3 % 3 + 1) % 3;
  const get2 = (mod) => { const r = []; for(let n=0;n<10;n++) if(n%3===mod) r.push(n); return r.slice(0,2); };
  return [get2(r0), get2(r1), get2(r2)];
}, '012路偏路杀');

// ========== 四、大小奇偶类 ==========

// 8. 大小杀号（上期大杀小，上期小杀大）
test((d, i) => {
  const k = n => n >= 5 ? [0,1] : [8,9];
  return [k(d[i].d1), k(d[i].d2), k(d[i].d3)];
}, '大小反转杀');

// 9. 奇偶杀号
test((d, i) => {
  const k = n => n % 2 === 0 ? [1,3] : [0,2];
  return [k(d[i].d1), k(d[i].d2), k(d[i].d3)];
}, '奇偶反转杀');

// 10. 大小交替杀（连续大小模式）
test((d, i) => {
  if (i < 2) return [[0,1],[2,3],[4,5]];
  const p1 = d[i].d1 >= 5, p2 = d[i-1].d1 >= 5;
  const kill = (p1 && p2) ? [5,6] : (!p1 && !p2) ? [0,1] : (p1 ? [0,1] : [5,6]);
  const kill2 = (pos) => {
    const v1 = d[i][pos] >= 5, v2 = d[i-1][pos] >= 5;
    return (v1 && v2) ? [5,6] : (!v1 && !v2) ? [0,1] : (v1 ? [0,1] : [5,6]);
  };
  return [kill2('d1'), kill2('d2'), kill2('d3')];
}, '大小连续模式杀');

// ========== 五、质数合数类 ==========

// 11. 质合杀号
test((d, i) => {
  const isPrime = n => [2,3,5,7].includes(n);
  const k = n => isPrime(n) ? [4,6] : [2,3];
  return [k(d[i].d1), k(d[i].d2), k(d[i].d3)];
}, '质合反转杀');

// ========== 六、AC值/差值类 ==========

// 12. AC值杀号
test((d, i) => {
  const nums = [d[i].d1, d[i].d2, d[i].d3];
  const diffs = new Set();
  for(let a=0;a<3;a++) for(let b=a+1;b<3;b++) diffs.add(Math.abs(nums[a]-nums[b]));
  const ac = diffs.size - 2; // AC值
  return [[ac, (ac+1)%10], [(ac+2)%10, (ac+3)%10], [(ac+4)%10, (ac+5)%10]];
}, 'AC值递进杀');

// 13. 两两差值杀
test((d, i) => {
  const nums = [d[i].d1, d[i].d2, d[i].d3];
  const d1 = Math.abs(nums[0]-nums[1]);
  const d2 = Math.abs(nums[1]-nums[2]);
  const d3 = Math.abs(nums[0]-nums[2]);
  return [[d1, (d1+5)%10], [d2, (d2+5)%10], [d3, (d3+5)%10]];
}, '两两差值对码杀');

// ========== 七、上期号码变换类 ==========

// 14. 上期同位+邻码（已测，基准）
test((d, i) => {
  const adj = n => (n + 1) % 10;
  return [[d[i].d1, adj(d[i].d1)], [d[i].d2, adj(d[i].d2)], [d[i].d3, adj(d[i].d3)]];
}, '上期同位+右邻码');

// 15. 上期同位+左邻码
test((d, i) => {
  const adj = n => (n + 9) % 10;
  return [[d[i].d1, adj(d[i].d1)], [d[i].d2, adj(d[i].d2)], [d[i].d3, adj(d[i].d3)]];
}, '上期同位+左邻码');

// 16. 上期同位+对码
test((d, i) => {
  const dm = n => (n + 5) % 10;
  return [[d[i].d1, dm(d[i].d1)], [d[i].d2, dm(d[i].d2)], [d[i].d3, dm(d[i].d3)]];
}, '上期同位+对码');

// 17. 上期百位杀十位，十位杀个位，个位杀百位（交叉杀）
test((d, i) => {
  return [[d[i].d1, (d[i].d1+1)%10], [d[i].d2, (d[i].d2+1)%10], [d[i].d3, (d[i].d3+1)%10]];
}, '上期同位+1杀');

// 18. 上期镜像杀（百位杀百位镜像）
test((d, i) => {
  const mirror = n => 9 - n;
  return [[d[i].d1, mirror(d[i].d1)], [d[i].d2, mirror(d[i].d2)], [d[i].d3, mirror(d[i].d3)]];
}, '上期同位+镜像码');

// 19. 上期号码+3杀
test((d, i) => {
  return [[d[i].d1, (d[i].d1+3)%10], [d[i].d2, (d[i].d2+3)%10], [d[i].d3, (d[i].d3+3)%10]];
}, '上期同位+3杀');

// 20. 上期号码+7杀
test((d, i) => {
  return [[d[i].d1, (d[i].d1+7)%10], [d[i].d2, (d[i].d2+7)%10], [d[i].d3, (d[i].d3+7)%10]];
}, '上期同位+7杀');

// ========== 八、两期组合类 ==========

// 21. 两期之和杀
test((d, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const s1 = (d[i].d1 + d[i-1].d1) % 10;
  const s2 = (d[i].d2 + d[i-1].d2) % 10;
  const s3 = (d[i].d3 + d[i-1].d3) % 10;
  return [[s1, (s1+5)%10], [s2, (s2+5)%10], [s3, (s3+5)%10]];
}, '两期同位和+对码杀');

// 22. 两期之差杀
test((d, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const df1 = Math.abs(d[i].d1 - d[i-1].d1);
  const df2 = Math.abs(d[i].d2 - d[i-1].d2);
  const df3 = Math.abs(d[i].d3 - d[i-1].d3);
  return [[df1, (df1+5)%10], [df2, (df2+5)%10], [df3, (df3+5)%10]];
}, '两期同位差+对码杀');

// 23. 两期交叉杀（上期百+本期十，等）
test((d, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  return [[d[i-1].d1, d[i].d2], [d[i-1].d2, d[i].d3], [d[i-1].d3, d[i].d1]];
}, '两期交叉杀');

// ========== 九、三期趋势类 ==========

// 24. 三期递增递减杀
test((d, i) => {
  if (i < 2) return [[0,1],[2,3],[4,5]];
  const k = (pos) => {
    const v0 = d[i][pos], v1 = d[i-1][pos], v2 = d[i-2][pos];
    if (v0 > v1 && v1 > v2) return [(v0+1)%10, (v0+2)%10]; // 连升杀高
    if (v0 < v1 && v1 < v2) return [(v0+8)%10, (v0+9)%10]; // 连降杀低
    return [v0, (v0+5)%10];
  };
  return [k('d1'), k('d2'), k('d3')];
}, '三期趋势杀');

// 25. 三期移动平均杀
test((d, i) => {
  if (i < 2) return [[0,1],[2,3],[4,5]];
  const ma = (pos) => Math.round((d[i][pos] + d[i-1][pos] + d[i-2][pos]) / 3);
  const k = (pos) => { const m = ma(pos); return [m, (m+5)%10]; };
  return [k('d1'), k('d2'), k('d3')];
}, '三期均值+对码杀');

// ========== 十、频率/遗漏类 ==========

// 26. 位置冷号(20期)
test((d, i) => {
  const p = 20, s = Math.max(0, i - p + 1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = s; j <= i; j++) { bF[d[j].d1]++; sF[d[j].d2]++; gF[d[j].d3]++; }
  return [
    bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]),
    sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]),
    gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]),
  ];
}, '位置冷号(20期)');

// 27. 位置遗漏杀
test((d, i) => {
  const p = 30, s = Math.max(0, i - p + 1);
  const miss = (pos) => {
    const m = new Array(10).fill(p);
    for (let dd = 0; dd < 10; dd++) for (let j = i; j >= s; j--) { if(d[j][pos]===dd){m[dd]=i-j;break;} }
    return m.map((v,n)=>[n,v]).sort((a,b)=>b[1]-a[1]).slice(0,2).map(e=>e[0]);
  };
  return [miss('d1'), miss('d2'), miss('d3')];
}, '位置遗漏杀(30期)');

// ========== 十一、混合策略 ==========

// 28. 冷号+邻码混合
test((d, i) => {
  const p = 20, s = Math.max(0, i - p + 1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = s; j <= i; j++) { bF[d[j].d1]++; sF[d[j].d2]++; gF[d[j].d3]++; }
  const bCold = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const sCold = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const gCold = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  return [
    [bCold, (bCold+1)%10],
    [sCold, (sCold+1)%10],
    [gCold, (gCold+1)%10],
  ];
}, '冷号+右邻码混合');

// 29. 冷号+对码混合
test((d, i) => {
  const p = 20, s = Math.max(0, i - p + 1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = s; j <= i; j++) { bF[d[j].d1]++; sF[d[j].d2]++; gF[d[j].d3]++; }
  const bCold = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const sCold = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const gCold = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  return [
    [bCold, (bCold+5)%10],
    [sCold, (sCold+5)%10],
    [gCold, (gCold+5)%10],
  ];
}, '冷号+对码混合');

// 30. 遗漏+邻码混合
test((d, i) => {
  const p = 30, s = Math.max(0, i - p + 1);
  const miss = (pos) => {
    const m = new Array(10).fill(p);
    for (let dd = 0; dd < 10; dd++) for (let j = i; j >= s; j--) { if(d[j][pos]===dd){m[dd]=i-j;break;} }
    return m.map((v,n)=>[n,v]).sort((a,b)=>b[1]-a[1])[0][0];
  };
  const bm = miss('d1'), sm = miss('d2'), gm = miss('d3');
  return [
    [bm, (bm+1)%10],
    [sm, (sm+1)%10],
    [gm, (gm+1)%10],
  ];
}, '遗漏+右邻码混合');

// 31. 和值尾+跨度组合杀
test((d, i) => {
  const hv = (d[i].d1 + d[i].d2 + d[i].d3) % 10;
  const span = Math.max(d[i].d1,d[i].d2,d[i].d3) - Math.min(d[i].d1,d[i].d2,d[i].d3);
  return [[hv, span], [(hv+1)%10, (span+1)%10], [(hv+2)%10, (span+2)%10]];
}, '和值尾+跨度组合杀');

// 32. 百十差+十个差+百个差杀
test((d, i) => {
  const bs = (d[i].d1 - d[i].d2 + 10) % 10;
  const sg = (d[i].d2 - d[i].d3 + 10) % 10;
  const bg = (d[i].d1 - d[i].d3 + 10) % 10;
  return [[bs, (bs+5)%10], [sg, (sg+5)%10], [bg, (bg+5)%10]];
}, '位差对码杀');

// 33. 上期号+和值尾杀
test((d, i) => {
  const hv = (d[i].d1 + d[i].d2 + d[i].d3) % 10;
  return [[d[i].d1, hv], [d[i].d2, (hv+1)%10], [d[i].d3, (hv+2)%10]];
}, '上期号+和值尾杀');

// 34. 黄金分割杀号
test((d, i) => {
  const phi = 0.618;
  const k = n => [Math.round(n * phi) % 10, Math.round(n * (1-phi) * 10) % 10];
  return [k(d[i].d1), k(d[i].d2), k(d[i].d3)];
}, '黄金分割杀');

// 35. 上期百十个位分别乘以2取尾杀
test((d, i) => {
  return [[d[i].d1, (d[i].d1*2)%10], [d[i].d2, (d[i].d2*2)%10], [d[i].d3, (d[i].d3*2)%10]];
}, '上期号×2取尾杀');

// 36. 上期号×3取尾杀
test((d, i) => {
  return [[d[i].d1, (d[i].d1*3)%10], [d[i].d2, (d[i].d2*3)%10], [d[i].d3, (d[i].d3*3)%10]];
}, '上期号×3取尾杀');

// 37. 上期号平方取尾杀
test((d, i) => {
  return [[d[i].d1, (d[i].d1*d[i].d1)%10], [d[i].d2, (d[i].d2*d[i].d2)%10], [d[i].d3, (d[i].d3*d[i].d3)%10]];
}, '上期号平方取尾杀');

// 38. 上期号+下期号位移杀（百位移到十位等）
test((d, i) => {
  return [[d[i].d3, (d[i].d3+1)%10], [d[i].d1, (d[i].d1+1)%10], [d[i].d2, (d[i].d2+1)%10]];
}, '位移交叉杀');

// 39. 和值+百位杀十位，和值+十位杀个位...
test((d, i) => {
  const hv = (d[i].d1 + d[i].d2 + d[i].d3) % 10;
  return [[(hv+d[i].d1)%10, ((hv+d[i].d1)%10+5)%10],
          [(hv+d[i].d2)%10, ((hv+d[i].d2)%10+5)%10],
          [(hv+d[i].d3)%10, ((hv+d[i].d3)%10+5)%10]];
}, '和值+位值组合杀');

// 40. 位置冷号(15期)+邻码
test((d, i) => {
  const p = 15, s = Math.max(0, i - p + 1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = s; j <= i; j++) { bF[d[j].d1]++; sF[d[j].d2]++; gF[d[j].d3]++; }
  const bc = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const sc = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const gc = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  return [[bc,(bc+1)%10],[sc,(sc+1)%10],[gc,(gc+1)%10]];
}, '位置冷号(15期)+邻码');

// 41. 位置冷号(10期)+邻码
test((d, i) => {
  const p = 10, s = Math.max(0, i - p + 1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = s; j <= i; j++) { bF[d[j].d1]++; sF[d[j].d2]++; gF[d[j].d3]++; }
  const bc = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const sc = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const gc = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  return [[bc,(bc+1)%10],[sc,(sc+1)%10],[gc,(gc+1)%10]];
}, '位置冷号(10期)+邻码');

// 42. 马尔可夫链杀号（低频转移）
test((d, i) => {
  if (i < 1) return [[0,1],[2,3],[4,5]];
  const p = 30, s = Math.max(0, i - p);
  const bN = new Array(10).fill(0), sN = new Array(10).fill(0), gN = new Array(10).fill(0);
  for (let j = s; j < i; j++) {
    if(d[j].d1 === d[i].d1) bN[d[j+1].d1]++;
    if(d[j].d2 === d[i].d2) sN[d[j+1].d2]++;
    if(d[j].d3 === d[i].d3) gN[d[j+1].d3]++;
  }
  return [
    bN.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]),
    sN.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]),
    gN.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]),
  ];
}, '马尔可夫链低频杀');

// 43. 上期同位+冷号(5期)
test((d, i) => {
  const p = 5, s = Math.max(0, i - p + 1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = s; j <= i; j++) { bF[d[j].d1]++; sF[d[j].d2]++; gF[d[j].d3]++; }
  const bc = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const sc = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  const gc = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1])[0][0];
  return [[d[i].d1, bc], [d[i].d2, sc], [d[i].d3, gc]];
}, '上期同位+短期冷号');

// 44. 双冷号杀（百位冷+十位冷杀个位）
test((d, i) => {
  const p = 20, s = Math.max(0, i - p + 1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = s; j <= i; j++) { bF[d[j].d1]++; sF[d[j].d2]++; gF[d[j].d3]++; }
  const bc = bF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const sc = sF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  const gc = gF.map((f,n)=>[n,f]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  return [bc, sc, gc];
}, '位置冷号直接杀(20期)');

// 45. 冷热结合：冷号+遗漏
test((d, i) => {
  const p = 20, s = Math.max(0, i - p + 1);
  const bF = new Array(10).fill(0), sF = new Array(10).fill(0), gF = new Array(10).fill(0);
  for (let j = s; j <= i; j++) { bF[d[j].d1]++; sF[d[j].d2]++; gF[d[j].d3]++; }
  const bMiss = new Array(10).fill(p), sMiss = new Array(10).fill(p), gMiss = new Array(10).fill(p);
  for (let dd = 0; dd < 10; dd++) {
    for (let j = i; j >= s; j--) { if(d[j].d1===dd){bMiss[dd]=i-j;break;} }
    for (let j = i; j >= s; j--) { if(d[j].d2===dd){sMiss[dd]=i-j;break;} }
    for (let j = i; j >= s; j--) { if(d[j].d3===dd){gMiss[dd]=i-j;break;} }
  }
  // 综合评分：频率*0.4 - 遗漏*0.6（越低越该杀）
  const score = (freq, miss) => freq * 0.4 - miss * 0.6;
  const kill = (fArr, mArr) => {
    return fArr.map((f,n)=>[n, score(f, mArr[n])]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(e=>e[0]);
  };
  return [kill(bF, bMiss), kill(sF, sMiss), kill(gF, gMiss)];
}, '冷热结合评分杀');

console.log('\n=== 测试完成 ===');
