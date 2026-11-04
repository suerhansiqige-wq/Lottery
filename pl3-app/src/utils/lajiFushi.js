// 垃圾复式号码生成与验证逻辑

/**
 * 解析单组输入数据
 * @param {string} input - 格式如 "79540,46712,24586"
 * @returns {Object} - { bai: [7,9,5,4,0], shi: [4,6,7,1,2], ge: [2,4,5,8,6] }
 */
export function parseLajiGroup(input) {
  if (!input || typeof input !== 'string') return null;
  const parts = input.split(',').map(s => s.trim());
  if (parts.length !== 3) return null;

  const bai = parts[0].split('').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 9);
  const shi = parts[1].split('').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 9);
  const ge = parts[2].split('').map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 9);

  if (bai.length === 0 || shi.length === 0 || ge.length === 0) return null;

  return { bai, shi, ge };
}

/**
 * 根据百十个位候选生成所有直选号码
 * @param {Object} group - { bai: [...], shi: [...], ge: [...] }
 * @returns {Set<string>} - 生成的号码集合
 */
export function generateNumbers(group) {
  const nums = new Set();
  for (const b of group.bai) {
    for (const s of group.shi) {
      for (const g of group.ge) {
        nums.add(`${b}${s}${g}`);
      }
    }
  }
  return nums;
}

/**
 * 解析多组输入数据（换行分隔）
 * @param {string} input - 多组数据，每组一行
 * @returns {Array<Object>} - 解析后的组数据数组
 */
export function parseLajiInput(input) {
  if (!input || typeof input !== 'string') return [];
  const lines = input.split('\n').map(s => s.trim()).filter(s => s.length > 0);
  const groups = [];
  for (const line of lines) {
    const group = parseLajiGroup(line);
    if (group) groups.push(group);
  }
  return groups;
}

/**
 * 找出多个号码集合中重复最多的前2个取值对应的所有号码
 * @param {Array<Set<string>>} sets - 多个号码集合
 * @returns {Set<string>} - 重复最多的前2个取值对应的号码集合
 */
export function findMostFrequent(sets) {
  if (sets.length === 0) return new Set();

  // 统计每个号码出现的次数
  const countMap = new Map();
  for (const set of sets) {
    for (const num of set) {
      countMap.set(num, (countMap.get(num) || 0) + 1);
    }
  }

  // 收集所有不同的出现次数，降序排序
  const counts = [...new Set(countMap.values())].sort((a, b) => b - a);

  // 取前2个不同的出现次数
  const topCounts = counts.slice(0, 2);

  // 收集出现次数在前2个取值中的所有号码
  const result = new Set();
  for (const [num, count] of countMap.entries()) {
    if (topCounts.includes(count)) {
      result.add(num);
    }
  }

  return result;
}

/**
 * 处理完整的垃圾复式逻辑
 * 16组输入 → 每4组一批 → 每批取出现2次或以上的号码 → 合并4批结果
 * @param {string} input - 16组输入数据
 * @returns {Object} - { numbers: Set<string>, batches: Array<Set<string>> }
 */
export function processLajiFushi(input) {
  const groups = parseLajiInput(input);
  if (groups.length === 0) {
    return { numbers: new Set(), batches: [] };
  }

  // 每4组为一批
  const batches = [];
  for (let i = 0; i < groups.length; i += 4) {
    const batchGroups = groups.slice(i, i + 4);
    const batchSets = batchGroups.map(g => generateNumbers(g));

    // 统计该批内每个号码出现的次数
    const countMap = new Map();
    for (const set of batchSets) {
      for (const num of set) {
        countMap.set(num, (countMap.get(num) || 0) + 1);
      }
    }

    // 取出现3~4次的号码
    const batchResult = new Set();
    for (const [num, count] of countMap.entries()) {
      if (count >= 3 && count <= 4) {
        batchResult.add(num);
      }
    }
    batches.push(batchResult);
  }

  // 合并4批的结果
  const result = new Set();
  for (const batch of batches) {
    for (const num of batch) {
      result.add(num);
    }
  }

  return { numbers: result, batches };
}

/**
 * 验证开奖号是否在垃圾复式集合中
 * @param {Set<string>} numbers - 垃圾复式号码集合
 * @param {Object} draw - 开奖号 { d1, d2, d3 }
 * @returns {boolean} - true表示在集合中（错误），false表示不在集合中（正确）
 */
export function verifyLajiDraw(numbers, draw) {
  if (!numbers || numbers.size === 0) return null;
  if (!draw || draw.d1 === undefined || draw.d2 === undefined || draw.d3 === undefined) return null;

  const drawNum = `${draw.d1}${draw.d2}${draw.d3}`;
  return numbers.has(drawNum);
}
