// ============================================================
// 【算法锁定】断组容错核心算法（智取断组 / 博众断组 共用）
//
// 断组式格式：每期 20 组，支持两种输入格式：
//   格式1（简化）：307,189,6245（逗号分隔3个数字串，3位+3位+4位）
//   格式2（完整）：012/345/6789,013/245/6789,014/235/6789（斜杠+逗号混合）
//             每个分组的 3 个集合恰好互补覆盖 0-9（3+3+4 模式）
//
// errorCount 定义：
//   对某一注号码（3 位数字），逐组检查：
//   - 该组有 3 个分组（如 A/B/C）
//   - 如果开奖号的 3 个数字分别落在3个不同的分组内（A、B、C各至少1个），
//     则该组判为「错」（断了该组）
//   - errorCount = 20 组中判「错」的组数
//
// 容错等级语义（与分解容错一致）：
//   无容错    = errorCount === 0        （20 组全部通过，最严）
//   容错 N    = 1 <= errorCount <= N    （N = 1~8，不含无容错号码）
// ============================================================

/** 容错等级：1~8（无容错单独处理） */
export const DUANZU_RONGCUO_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
export const DUANZU_RONGCUO_NONE = 0;
export const DUANZU_RONGCUO_MAX = 8;

/**
 * 解析断组文本为分组数组
 * @param {string} text textarea 内容，每组一行，形如 "307,189,6245" 或 "012/345/6789,013/245/6789,014/235/6789"
 *                     支持两种格式：
 *                     1) 逗号分隔3个数字串（3位+3位+4位）：307,189,6245
 *                     2) 斜杠分隔3个数字集合，逗号分隔3组：012/345/6789,013/245/6789,014/235/6789
 * @returns {Array<{groups: Array<{a:Set<number>, b:Set<number>, c:Set<number>}>, raw:string}>}
 */
export function parseDuanZuGroups(text) {
  if (!text || typeof text !== 'string') return [];
  const result = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 尝试格式1：逗号分隔的3个数字串（如 "307,189,6245"）
    const commaParts = trimmed.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    if (commaParts.length === 3) {
      // 检查是否每个part都是纯数字（不含斜杠）
      const isSimpleFormat = commaParts.every(p => /^\d+$/.test(p));
      if (isSimpleFormat) {
        const groups = [{
          a: new Set(commaParts[0].split('').map(Number)),
          b: new Set(commaParts[1].split('').map(Number)),
          c: new Set(commaParts[2].split('').map(Number))
        }];
        result.push({ groups, raw: trimmed });
        continue;
      }
    }
    
    // 尝试格式2：斜杠+逗号混合格式（如 "012/345/6789,013/245/6789,014/235/6789"）
    // 按逗号分割为 3 个分组
    const parts = trimmed.split(/[,，]/).map(s => s.trim()).filter(Boolean);
    if (parts.length !== 3) continue;
    const groups = [];
    let valid = true;
    for (const part of parts) {
      // 每个分组按斜杠分割为 3 个数字集合
      const subParts = part.split('/').map(s => s.trim()).filter(Boolean);
      if (subParts.length !== 3) { valid = false; break; }
      const digits = subParts.map(sp => {
        const ds = sp.split('').map(c => parseInt(c, 10)).filter(n => !isNaN(n) && n >= 0 && n <= 9);
        return new Set(ds);
      });
      if (digits[0].size === 0 || digits[1].size === 0 || digits[2].size === 0) {
        valid = false;
        break;
      }
      groups.push({ a: digits[0], b: digits[1], c: digits[2] });
    }
    if (valid && groups.length === 3) {
      result.push({ groups, raw: trimmed });
    }
  }
  return result;
}

/**
 * 计算单注号码在给定断组下的 brokenCount（有多少断组的3个数字分布在全3个子组）
 * @param {number[]} digits 三位数字（允许重复）
 * @param {Array<{groups: Array<{a:Set<number>, b:Set<number>, c:Set<number>}>}>} duanzuGroups
 * @returns {number} brokenCount（3个数字分布在所有3个子组的断组数）
 */
export function computeDuanZuErrorCount(digits, duanzuGroups) {
  let brokenCount = 0;
  for (const { groups } of duanzuGroups) {
    // 检查这3个分组中，是否有某个分组的3个数字分布
    let isBroken = false;
    for (const g of groups) {
      const inA = digits.some(d => g.a.has(d));
      const inB = digits.some(d => g.b.has(d));
      const inC = digits.some(d => g.c.has(d));
      // 如果3个数字分别落在a、b、c三个子组中，则该断组"断了"
      if (inA && inB && inC) {
        isBroken = true;
        break;
      }
    }
    if (isBroken) brokenCount++;
  }
  return brokenCount;
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
 * 对候选号码集做断组容错过滤
 * @param {Array<{groups: Array<{a:Set<number>, b:Set<number>, c:Set<number>}>}>} duanzuGroups 已解析的断组
 * @param {string[]} [candidates] 候选号码（三位数字字符串）。不传时默认全部 1000 注直选
 * @returns {{
 *   valid: boolean,
 *   groupCount: number,
 *   buckets: Object<number, string[]>,
 *   levels: Array<{level:number,label:string,count:number,numbers:string[],zuLiu:number,zuSan:number}>,
 *   none: {level:number,label:string,count:number,numbers:string[],zuLiu:number,zuSan:number},
 *   eliminated: string[],
 *   total: number
 * }}
 */
export function computeDuanZuRongCuo(duanzuGroups, candidates) {
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

  // 过滤掉组三，只保留组六（3个数字互不相同）
  cand = cand.filter(num => new Set(num.split('')).size === 3);

  const empty = {
    valid: false,
    groupCount: duanzuGroups ? duanzuGroups.length : 0,
    buckets: {},
    levels: DUANZU_RONGCUO_LEVELS.map(level => ({
      level, label: `容错${level}`, count: 0, numbers: [], zuLiu: 0, zuSan: 0,
    })),
    none: { level: DUANZU_RONGCUO_NONE, label: '无容错', count: 0, numbers: [], zuLiu: 0, zuSan: 0 },
    eliminated: [],
    total: cand.length,
  };
  if (!duanzuGroups || duanzuGroups.length === 0) return empty;

  const buckets = {};
  for (const num of cand) {
    const digits = num.split('').map(Number);
    const brokenCount = computeDuanZuErrorCount(digits, duanzuGroups);
    (buckets[brokenCount] || (buckets[brokenCount] = [])).push(num);
  }

  // 容错N = brokenCount <= N（累积包含）
  const build = (level, label, maxBroken) => {
    const numbers = [];
    for (let b = 0; b <= maxBroken; b++) {
      if (buckets[b]) numbers.push(...buckets[b]);
    }
    numbers.sort();
    return { level, label, count: numbers.length, numbers, zuLiu: numbers.length, zuSan: 0 };
  };

  const levels = DUANZU_RONGCUO_LEVELS.map(level =>
    build(level, `容错${level}`, level)
  );
  const none = build(DUANZU_RONGCUO_NONE, '无容错', 0);

  const eliminated = [];
  for (const key of Object.keys(buckets)) {
    if (Number(key) > DUANZU_RONGCUO_MAX) eliminated.push(...buckets[key]);
  }

  return {
    valid: duanzuGroups.length > 0,
    groupCount: duanzuGroups.length,
    buckets,
    levels,
    none,
    eliminated,
    total: cand.length,
  };
}

/**
 * 验证开奖号是否在断组预测中（用于对错标记）
 * @param {Object} draw - { d1, d2, d3 }
 * @param {Array<{groups: Array<{a:Set<number>, b:Set<number>, c:Set<number>}>}>} duanzuGroups
 * @returns {{type: string, level: number, label: string}|null} - 返回验证结果对象，null表示无法验证
 */
export function verifyDuanZuDraw(draw, duanzuGroups) {
  if (!draw || draw.d1 === undefined || draw.d2 === undefined || draw.d3 === undefined) return null;
  if (!duanzuGroups || duanzuGroups.length === 0) return null;
  const digits = [draw.d1, draw.d2, draw.d3];
  const isZuSan = new Set(digits).size < 3;
  const level = computeDuanZuErrorCount(digits, duanzuGroups);
  const type = isZuSan ? '组三' : '组六';
  return { type, level, label: `${type}${level}` };
}
