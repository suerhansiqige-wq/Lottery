// 大底策略复刻：基于上期开奖号的多条件复合过滤，生成约650注直选大底
const { lotteryData } = require('./src/data/lotteryData.js');
const data = lotteryData;
const N = data.length;
const TONGSHA_MAP = { 0: 0, 1: 8, 2: 6, 3: 4, 4: 7, 5: 9, 6: 1, 7: 2, 8: 4, 9: 6 };

// 过滤链（全部只依赖上期开奖号，与网友可用信息一致）：
// A. 通杀码：上期十位映射出杀码，杀掉所有含该数字的号码
// B. 杀同位重号：百位≠上期百位 且 十位≠上期十位（同位重复概率仅10%/位）
// C. 排豹子
function genBigBase(prev, opts = {}) {
  const killAll = TONGSHA_MAP[prev.d2];
  const nums = [];
  for (let n = 0; n < 1000; n++) {
    const a = Math.floor(n / 100), b = Math.floor(n / 10) % 10, c = n % 10;
    if (a === b && b === c) continue;                        // C 排豹子
    if (a === killAll || b === killAll || c === killAll) continue; // A 通杀码
    if (opts.killBai && a === prev.d1) continue;             // B 杀百位重号
    if (opts.killShi && b === prev.d2) continue;             // B 杀十位重号
    if (opts.killGe && c === prev.d3) continue;              // B 杀个位重号
    nums.push(String(n).padStart(3, '0'));
  }
  return nums;
}

// 找接近650注的配置
const configs = [
  { name: '通杀码+排豹子', opts: {} },
  { name: '通杀码+杀百十重号', opts: { killBai: true, killShi: true } },
  { name: '通杀码+杀百重号', opts: { killBai: true } },
  { name: '通杀码+杀百十个重号', opts: { killBai: true, killShi: true, killGe: true } },
];
console.log('=== 各配置注数（以上期26228开奖399为例）===');
const last = data[N - 1];
configs.forEach(cfg => {
  console.log(cfg.name + ':', genBigBase(last, cfg.opts).length, '注');
});

// 回测全量：每期用上期生成大底，检查当期开奖号是否在内
console.log('\n=== 全量回测（8600+期）===');
configs.forEach(cfg => {
  let hit = 0, total = 0, sizes = 0;
  for (let i = 1; i < N; i++) {
    const base = new Set(genBigBase(data[i - 1], cfg.opts));
    sizes += base.size;
    total++;
    const num = `${data[i].d1}${data[i].d2}${data[i].d3}`;
    if (base.has(num)) hit++;
  }
  const avgSize = Math.round(sizes / total);
  console.log(`${cfg.name}: 平均${avgSize}注 | 命中${hit}/${total} = ${(hit / total * 100).toFixed(1)}%（纯覆盖基准=${(avgSize / 10).toFixed(1)}%）`);
});

// 最近30期明细（最佳配置：通杀码+杀百重号，平均648注最接近网友646/650注规模）
console.log('\n=== 最近30期明细（通杀码+杀百重号）===');
const bestOpts = { killBai: true };
let hit30 = 0;
for (let i = N - 30; i < N; i++) {
  const base = new Set(genBigBase(data[i - 1], bestOpts));
  const num = `${data[i].d1}${data[i].d2}${data[i].d3}`;
  const ok = base.has(num);
  if (ok) hit30++;
  console.log(`第${data[i].issue}期 开奖${num} 大底${base.size}注 ${ok ? '✓' : '✗'}`);
}
console.log('最近30期命中:', hit30 + '/30');

// 输出下期(26229)大底
const next = genBigBase(last, bestOpts);
console.log('\n=== 26229期大底（基于26228开奖399）共', next.length, '注 ===');
require('fs').writeFileSync('./dadi_26229.txt', next.join(' '), 'utf8');
console.log(next.join(' '));
