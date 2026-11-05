// 用回溯200期对最后一期（2026年第285期，期号26285）做复盘
import { writeFileSync } from 'node:fs';

const TARGET = '26285';
const L = 200;
const PRIZE = 1040;
const COST = 2;

const calcs = {
  add: (d1, d2, d3) => [(d1 + d2) % 10, (d2 + d3) % 10, (d1 + d3) % 10],
  sub: (d1, d2, d3) => [Math.abs(d1 - d2), Math.abs(d2 - d3), Math.abs(d1 - d3)],
};
const ALL = [];
for (let a = 0; a <= 9; a++) for (let b = 0; b <= 9; b++) for (let c = 0; c <= 9; c++) ALL.push([a, b, c]);
const maps = {};
for (const [mode, fn] of Object.entries(calcs)) {
  const m = new Map();
  for (const [a, b, c] of ALL) {
    const k = fn(a, b, c).join('');
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(`${a}${b}${c}`);
  }
  maps[mode] = m;
}

const patternsOf = (rows, mode) => new Set(rows.map(d => calcs[mode](d.d1, d.d2, d.d3).join('')));

function buildPool(rows) {
  const aPats = patternsOf(rows, 'add');
  const sPats = patternsOf(rows, 'sub');
  const aSet = new Set();
  for (const p of aPats) for (const n of maps.add.get(p)) aSet.add(n);
  const sSet = new Set();
  for (const p of sPats) for (const n of maps.sub.get(p)) sSet.add(n);
  const union = new Set([...aSet, ...sSet]);
  return { aPats, sPats, aSet, sSet, union };
}

function review(name, data) {
  const idx = data.findIndex(d => d.issue === TARGET);
  if (idx < L) throw new Error(`${name} 数据不足：目标期索引 ${idx}`);
  const win = data.slice(idx - L, idx);
  const cur = data[idx];
  const actual = `${cur.d1}${cur.d2}${cur.d3}`;
  const { aPats, sPats, aSet, sSet, union } = buildPool(win);
  const overlap = [...aSet].filter(n => sSet.has(n)).length;

  const hit = union.has(actual);
  const hitAdd = aSet.has(actual);
  const hitSub = sSet.has(actual);
  const curAdd = calcs.add(cur.d1, cur.d2, cur.d3).join('');
  const curSub = calcs.sub(cur.d1, cur.d2, cur.d3).join('');
  const cost = union.size * COST;

  console.log(`\n########## ${name}｜回溯 ${L} 期复盘 ${TARGET} ##########`);
  console.log(`窗口：${win[0].issue} ~ ${win[win.length - 1].issue}（${win.length} 期）`);
  console.log(`${TARGET} 开奖号：${actual}  （横相加 ${curAdd} / 横相减 ${curSub}）`);
  console.log(`候选池：横相加 ${aPats.size} 种模式 → ${aSet.size} 注；横相减 ${sPats.size} 种模式 → ${sSet.size} 注`);
  console.log(`重叠 ${overlap} 注，合并去重 ${union.size} 注，覆盖率 ${(union.size / 10).toFixed(2)}%`);
  console.log(`结论：${hit ? '✔ 命中' : '✘ 未中'}（相加${hitAdd ? '中' : '不中'} / 相减${hitSub ? '中' : '不中'}）`);
  console.log(`盈亏：成本 ${cost} 元，${hit ? `直选奖金 ${PRIZE} 元，净利 ${PRIZE - cost >= 0 ? '+' : ''}${PRIZE - cost} 元` : `回收 0 元，净利 -${cost} 元`}`);

  if (hit) {
    const fromAdd = win.filter(d => calcs.add(d.d1, d.d2, d.d3).join('') === curAdd);
    const fromSub = win.filter(d => calcs.sub(d.d1, d.d2, d.d3).join('') === curSub);
    console.log(`模式归属：横相加模式 ${curAdd} 由窗口内 ${fromAdd.length} 期产生${fromAdd.length ? `，最近 ${fromAdd[fromAdd.length - 1].issue}` : ''}`);
    console.log(`         横相减模式 ${curSub} 由窗口内 ${fromSub.length} 期产生${fromSub.length ? `，最近 ${fromSub[fromSub.length - 1].issue}` : ''}`);
  }

  console.log(`\n===== 近 20 期滚动复盘（每期用其前 ${L} 期建池）=====`);
  console.log('期号    开奖号  相加注  相减注  合并注  覆盖率  结果  距上次命中');
  let lastHitIdx = null;
  const start = Math.max(L, idx - 19);
  const history = [];
  for (let i = start; i <= idx; i++) {
    const p = buildPool(data.slice(i - L, i));
    const num = `${data[i].d1}${data[i].d2}${data[i].d3}`;
    const h = p.union.has(num);
    const gap = h && lastHitIdx !== null ? i - lastHitIdx : null;
    history.push({ issue: data[i].issue, num, size: p.union.size, hit: h });
    console.log(
      `${data[i].issue}  ${num}   ${String(p.aSet.size).padStart(5)}  ${String(p.sSet.size).padStart(6)}  ` +
      `${String(p.union.size).padStart(6)} ${(p.union.size / 10).toFixed(1).padStart(5)}%  ${h ? '中' : '未'}   ` +
      `${h ? (gap === null ? '窗口内首个' : `${gap} 期`) : '-'}`
    );
    if (h) lastHitIdx = i;
  }
  const hits = history.filter(r => r.hit);
  const totalCost = history.reduce((a, r) => a + r.size * COST, 0);
  const ret = hits.length * PRIZE;
  const sizes = history.map(r => r.size);
  console.log(`\n近 ${history.length} 期小结：命中 ${hits.length}/${history.length}（${(hits.length / history.length * 100).toFixed(1)}%）`);
  console.log(`池注数 ${Math.min(...sizes)} ~ ${Math.max(...sizes)} 注，平均 ${(totalCost / COST / history.length).toFixed(0)} 注/期`);
  console.log(`累计投入 ${totalCost.toFixed(0)} 元，回收 ${ret} 元，净利 ${(ret - totalCost >= 0 ? '+' : '')}${(ret - totalCost).toFixed(0)} 元`);
  console.log(`命中期号：${hits.length ? hits.map(r => r.issue).join(' ') : '近' + history.length + '期全部未中'}`);

  const file = `复盘_${TARGET}_${L}期_${name}.txt`;
  writeFileSync(file, [...union].sort().join(' ') + '\n');
  console.log(`合并候选全表已导出：${file}（${union.size} 注）`);
}

const { lotteryData: fc3d } = await import('./lottery-app/src/data/lotteryData.js');
const { lotteryData: pl3 } = await import('./pl3-app/src/data/lotteryData.js');
review('福彩3D', fc3d);
review('排列三', pl3);
console.log('\n口径：直选奖金 1040 元/注中，成本 2 元/注；覆盖率=合并注数/10。');
