// 杀150注：聚类K3热百5十3 = 在线k-means（K=3，上期百十个/和尾/跨度五维特征）聚簇，
// 取当前簇内频次（衰减0.999）最热的百位5码×十位3码×个位全部，固定150注
// 质心每500期重拟合（窗口1000期、10轮）；排列三回测7334期86.57%（连错5）
// ✓=奖号不在杀集（杀对），✗=奖号被杀（误杀）

export const KILL_COUNT = 150;
const START = 451; // 热身期数，与回测一致
const K = 3;

const numKey = (d) => d.d1 * 100 + d.d2 * 10 + d.d3;
const toStr = (n) => String(n).padStart(3, '0');

function feat(data, i) {
  const a = data[i - 1];
  const s = [a.d1, a.d2, a.d3].sort((x, y) => x - y);
  return [a.d1 / 9, a.d2 / 9, a.d3 / 9, ((a.d1 + a.d2 + a.d3) % 10) / 9, (s[2] - s[0]) / 9];
}

// 在线聚类重放：逐期产杀集（i>=START），回调 onMask(i, mask)
function runClusters(data, upto, onMask) {
  const cent = [feat(data, 3), feat(data, 40), feat(data, 77)];
  const assign = (f) => {
    let bi = 0, bd = Infinity;
    for (let k = 0; k < K; k++) {
      let d = 0;
      for (let a = 0; a < 5; a++) d += (f[a] - cent[k][a]) ** 2;
      if (d < bd) { bd = d; bi = k; }
    }
    return bi;
  };
  const cnt = Array.from({ length: 3 }, () => Array.from({ length: K }, () => new Float64Array(10)));
  for (let i = 0; i <= upto; i++) {
    const f = feat(data, Math.max(i, 3));
    const cl = i >= START ? assign(f) : 0;
    if (i >= START && onMask) {
      const hot = (pos, w) => [...Array(10).keys()]
        .sort((a, b) => cnt[pos][cl][a] - cnt[pos][cl][b] || a - b)
        .slice(10 - w);
      const hh = hot(0, 5), ht = hot(1, 3);
      const mask = new Uint8Array(1000);
      for (const a of hh) for (const b of ht) for (let c = 0; c < 10; c++) mask[a * 100 + b * 10 + c] = 1;
      onMask(i, mask);
    }
    if (i >= 3 && i < data.length) {
      const dg = [data[i].d1, data[i].d2, data[i].d3];
      for (let pos = 0; pos < 3; pos++) {
        const cp = cnt[pos];
        for (let k = 0; k < K; k++) for (let d = 0; d < 10; d++) cp[k][d] *= 0.999;
        cp[cl][dg[pos]] += 1;
      }
      if (i >= START && (i - START) % 500 === 0) {
        const samples = [];
        for (let j = Math.max(3, i - 1000); j < i; j++) samples.push(feat(data, j));
        for (let it = 0; it < 10; it++) {
          const sums = Array.from({ length: K }, () => new Float64Array(5));
          const ns = new Int32Array(K);
          for (const f2 of samples) {
            const k = assign(f2);
            ns[k]++;
            for (let a = 0; a < 5; a++) sums[k][a] += f2[a];
          }
          for (let k = 0; k < K; k++) if (ns[k] > 0) for (let a = 0; a < 5; a++) cent[k][a] = sums[k][a] / ns[k];
        }
      }
    }
  }
}

export function killMaskToNumbers(mask) {
  const out = [];
  for (let n = 0; n < 1000; n++) if (mask[n]) out.push(toStr(n));
  return out;
}

// 预计算各期杀集与对错：issue -> { size, hit, kill }
export function buildKill150Index(data) {
  const map = new Map();
  runClusters(data, data.length - 1, (i, mask) => {
    const t = numKey(data[i]);
    map.set(data[i].issue, { size: KILL_COUNT, hit: !mask[t], kill: mask });
  });
  return map;
}

// 下期预留行：重放聚类到 targetIndex（含该期预测，用其前一期特征与已更新频次）
export function getKill150Numbers(data, targetIndex) {
  if (targetIndex < START || targetIndex > data.length) return [];
  let out = [];
  runClusters(data, targetIndex, (i, mask) => {
    if (i === targetIndex) out = killMaskToNumbers(mask);
  });
  return out;
}