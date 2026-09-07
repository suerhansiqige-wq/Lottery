// 验证：横相减（|百-十|、|十-个|、|百-个| 三元组连写）相邻两期是否一致
// 数据源与两个应用 App.jsx 的 baseData 规则一致：过滤NaN + 期号Map去重 + Number(issue)升序
// 统计口径：
//   相邻一致对数 P   = 满足 v[i] === v[i-1] 的 i 的个数（即"有多少期与上一期一致"）
//   连续段（run）    = 连续多期取值相同的区间，长度 L（L 期连续一致 = L-1 个相邻一致对）
//   涉及期数         = 所有 L>=2 的连续段包含的期数之和
import fs from 'fs';
import { lotteryData as fc3d } from './lottery-app/src/data/lotteryData.js';
import { lotteryData as pl3 } from './pl3-app/src/data/lotteryData.js';

const buildBase = (raw) => {
  const m = new Map();
  for (const it of raw) {
    if (isNaN(Number(it.issue)) || isNaN(it.d1) || isNaN(it.d2) || isNaN(it.d3)) continue;
    if (!m.has(it.issue)) m.set(it.issue, it);
  }
  return [...m.values()].sort((a, b) => Number(a.issue) - Number(b.issue));
};

const hSubStr = (it) => [Math.abs(it.d1 - it.d2), Math.abs(it.d2 - it.d3), Math.abs(it.d3 - it.d1)].join('');

function analyze(name, base) {
  const seq = base.map(it => ({ issue: it.issue, v: hSubStr(it) }));
  const out = [];
  out.push(`===== ${name} =====`);
  out.push(`总期数: ${seq.length}（${seq[0].issue} ~ ${seq[seq.length - 1].issue}）`);

  // 相邻一致对
  const pairs = [];
  for (let i = 1; i < seq.length; i++) {
    if (seq[i].v === seq[i - 1].v) pairs.push({ prev: seq[i - 1].issue, cur: seq[i].issue, v: seq[i].v });
  }
  out.push(`相邻两期一致的次数(对数 P): ${pairs.length}`);

  // 连续段
  const runs = [];
  let s = 0;
  for (let i = 1; i <= seq.length; i++) {
    if (i === seq.length || seq[i].v !== seq[s].v) {
      const L = i - s;
      if (L >= 2) runs.push({ from: seq[s].issue, to: seq[i - 1].issue, L, v: seq[s].v });
      s = i;
    }
  }
  const involved = runs.reduce((a, r) => a + r.L, 0);
  out.push(`连续一致段数(长度>=2): ${runs.length}`);
  out.push(`涉及期数(所有连续段包含的期数之和): ${involved}`);
  const byLen = {};
  runs.forEach(r => { byLen[r.L] = (byLen[r.L] || 0) + 1; });
  out.push(`按连续长度分布: ` + Object.keys(byLen).sort((a, b) => a - b).map(k => `${k}期×${byLen[k]}段`).join(', '));
  const maxRun = runs.reduce((a, r) => (r.L > (a ? a.L : 0) ? r : a), null);
  out.push(`最长连续一致: ${maxRun ? `${maxRun.L} 期（${maxRun.from}~${maxRun.to}，横相减=${maxRun.v}）` : '无'}`);
  out.push(``);
  out.push(`全部连续一致段明细（按期号升序）:`);
  runs.forEach(r => out.push(`  ${r.from} ~ ${r.to}  连续${r.L}期  横相减=${r.v}`));
  out.push(``);
  out.push(`前20个相邻一致对示例:`);
  pairs.slice(0, 20).forEach(p => out.push(`  ${p.prev} → ${p.cur}  横相减=${p.v}`));
  out.push(``);
  return out.join('\n');
}

const rep = [analyze('福彩3D', buildBase(fc3d)), analyze('排列三', buildBase(pl3))].join('\n');
fs.writeFileSync(new URL('./hsub_repeat_out.txt', import.meta.url), rep, 'utf8');
console.log('written');
