// ============================================================
// 【算法锁定】分解容错核心算法（智取分解 / 博众分解 共用）
//
// 分解式格式：每期 20 组，每组 "XXXXX,XXXXX"，前后两半各 5 个数字，
//             恰好互补覆盖 0-9（已对 10880 组全量体检：无重叠、无缺位）
//
// errorCount 定义（经 544 期真实开奖数据反向验证，2026-09 重建）：
//   对某一注号码，逐组计算「少数派数量」= min(落在前半的位数, 落在后半的位数)
//   少数派数量 === 0 表示三个数字全部落在同一半（3-0 或 0-3 分布），该组判为「错」
//   errorCount = 20 组中判「错」的组数
//
// 验证依据：组六开奖号的 errorCount 在 544 期中恒落在 0~8（智取 100%、博众 99.7%），
//           与 UI 仅提供「无容错 + 容错1~8」完全吻合；反向假设（2-1 计错）得到 12~20，直接排除。
//
// 容错等级语义（严格区分，不可合并）：
//   无容错    = errorCount === 0        （20 组全部通过，最严）
//   容错 N    = 1 <= errorCount <= N    （N = 1~8，不含无容错号码）
//
// 禁止：把 errorCount === 0 的号码并入容错1；改动 errorCount 的判定方向
// ============================================================

/** 容错等级：1~8（无容错单独处理，见 RONGCUO_NONE） */
export const RONGCUO_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

/** 无容错等级标识 */
export const RONGCUO_NONE = 0;

/** errorCount 超出容错8 即永久淘汰的阈值 */
export const RONGCUO_MAX = 8;

/**
 * 解析分解文本为 A/B 数字集合数组
 * @param {string} text textarea 内容，每组一行，形如 "72390,18546"
 * @returns {Array<{a:Set<number>, b:Set<number>, raw:string}>} 仅返回合法的 5+5 互补组
 */
export function parseDecompGroups(text) {
  if (!text || typeof text !== 'string') return [];
  const groups = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // 兼容中英文逗号
    const parts = trimmed.split(/[,，]/);
    if (parts.length !== 2) continue;
    const aDigits = parts[0].trim().split('').filter(c => /\d/.test(c)).map(Number);
    const bDigits = parts[1].trim().split('').filter(c => /\d/.test(c)).map(Number);
    if (aDigits.length !== 5 || bDigits.length !== 5) continue;
    const a = new Set(aDigits);
    const b = new Set(bDigits);
    // 每半必须 5 个不同数字，且两半无重叠
    if (a.size !== 5 || b.size !== 5) continue;
    if (aDigits.some(d => b.has(d))) continue;
    groups.push({ a, b, raw: trimmed });
  }
  return groups;
}

/**
 * 计算单注号码在给定分解组下的 errorCount
 * @param {number[]} digits 三位数字（允许重复，组三按原始三位计）
 * @param {Array<{a:Set<number>, b:Set<number>}>} groups
 * @returns {number} 判「错」的组数
 */
export function computeErrorCount(digits, groups) {
  let err = 0;
  for (const g of groups) {
    let inA = 0;
    for (const d of digits) if (g.a.has(d)) inA++;
    // inA === 0（全在后半）或 inA === digits.length（全在前半）→ 少数派为 0 → 该组判错
    if (inA === 0 || inA === digits.length) err++;
  }
  return err;
}

/** 生成全部 1000 注直选号码 '000'~'999' */
function buildAllCandidates() {
  const list = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      for (let k = 0; k <= 9; k++) list.push(`${i}${j}${k}`);
    }
  }
  return list;
}

const ALL_CANDIDATES = buildAllCandidates();

/**
 * 对候选号码集做容错过滤
 * @param {Array<{a:Set<number>, b:Set<number>}>} groups 已解析的分解组
 * @param {string[]} [candidates] 候选号码（三位数字字符串）。不传时默认全部 1000 注直选；
 *   传入时（哪怕为空数组）严格以传入集为准——当前业务传入《自选号码》模块的组六号码，组三不参与
 * @returns {{
 *   valid: boolean,
 *   groupCount: number,
 *   buckets: Object<number, string[]>,      // errorCount -> 号码列表
 *   levels: Array<{level:number,label:string,count:number,numbers:string[],zuLiu:number,zuSan:number}>,
 *   none: {level:number,label:string,count:number,numbers:string[],zuLiu:number,zuSan:number},
 *   eliminated: string[],                    // errorCount > 8，容错8 仍淘汰
 *   total: number
 * }}
 */
export function computeRongCuo(groups, candidates) {
  // 候选集：传入时去重 + 仅保留三位数字；不传时回退全部 1000 注
  let cand = ALL_CANDIDATES;
  if (Array.isArray(candidates)) {
    const seen = new Set();
    cand = [];
    for (const t of candidates) {
      if (typeof t !== 'string' || !/^\d{3}$/.test(t)) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      cand.push(t);
    }
  }

  const empty = {
    valid: false,
    groupCount: groups ? groups.length : 0,
    buckets: {},
    levels: RONGCUO_LEVELS.map(level => ({
      level, label: `容错${level}`, count: 0, numbers: [], zuLiu: 0, zuSan: 0,
    })),
    none: { level: RONGCUO_NONE, label: '无容错', count: 0, numbers: [], zuLiu: 0, zuSan: 0 },
    eliminated: [],
    total: cand.length,
  };
  if (!groups || groups.length === 0) return empty;

  /** @type {Object<number, string[]>} */
  const buckets = {};
  for (const num of cand) {
    const digits = num.split('').map(Number);
    const err = computeErrorCount(digits, groups);
    (buckets[err] || (buckets[err] = [])).push(num);
  }

  // 组六 = 三个数字互不相同；组三 = 存在重复数字
  const isZuLiu = (num) => new Set(num.split('')).size === 3;

  const build = (level, label, errList) => {
    const numbers = [];
    for (const e of errList) if (buckets[e]) numbers.push(...buckets[e]);
    numbers.sort();
    let zuLiu = 0;
    for (const n of numbers) if (isZuLiu(n)) zuLiu++;
    return { level, label, count: numbers.length, numbers, zuLiu, zuSan: numbers.length - zuLiu };
  };

  const levels = RONGCUO_LEVELS.map(level =>
    // 容错 N = errorCount 落在 [1, N]，严格排除 0
    build(level, `容错${level}`, Array.from({ length: level }, (_, i) => i + 1))
  );
  const none = build(RONGCUO_NONE, '无容错', [0]);

  const eliminated = [];
  for (const key of Object.keys(buckets)) {
    if (Number(key) > RONGCUO_MAX) eliminated.push(...buckets[key]);
  }
  eliminated.sort();

  return {
    valid: true,
    groupCount: groups.length,
    buckets,
    levels,
    none,
    eliminated,
    total: cand.length,
  };
}

/**
 * 单期开奖号验证：返回该期开奖号的类型与最小容错等级
 * @param {{d1:number,d2:number,d3:number}} draw 开奖号
 * @param {Array<{a:Set<number>, b:Set<number>}>} groups
 * @returns {{type:'组六'|'组三', level:number, label:string}|null}
 */
export function verifyDraw(draw, groups) {
  if (!draw || draw.d1 === undefined || !groups || groups.length === 0) return null;
  const digits = [draw.d1, draw.d2, draw.d3];
  const isZuSan = new Set(digits).size < 3;
  const level = computeErrorCount(digits, groups);
  const type = isZuSan ? '组三' : '组六';
  return { type, level, label: `${type}${level}` };
}
