// 断组334模式逻辑

/**
 * 将0-9数字分成3组（3+3+4模式）
 * @param {Array} group1 - 第1组（3个数字）
 * @param {Array} group2 - 第2组（3个数字）
 * @param {Array} group3 - 第3组（4个数字）
 * @returns {Object} - 分组结果
 */
export function createGroups(group1, group2, group3) {
  return {
    group1: new Set(group1),
    group2: new Set(group2),
    group3: new Set(group3),
  };
}

/**
 * 默认分组：012 / 345 / 6789
 */
export const DEFAULT_GROUPS = {
  group1: new Set([0, 1, 2]),
  group2: new Set([3, 4, 5]),
  group3: new Set([6, 7, 8, 9]),
};

/**
 * 判断开奖号断了哪组
 * @param {Object} groups - 分组对象
 * @param {Object} draw - 开奖号 { d1, d2, d3 }
 * @returns {Array} - 断的组编号（1/2/3）
 */
export function findBrokenGroups(groups, draw) {
  if (!draw || draw.d1 === undefined || draw.d2 === undefined || draw.d3 === undefined) {
    return [];
  }

  const digits = [draw.d1, draw.d2, draw.d3];
  const broken = [];

  // 检查每组是否断了（即开奖号中没有该组的任何数字）
  const group1Hit = digits.some(d => groups.group1.has(d));
  const group2Hit = digits.some(d => groups.group2.has(d));
  const group3Hit = digits.some(d => groups.group3.has(d));

  if (!group1Hit) broken.push(1);
  if (!group2Hit) broken.push(2);
  if (!group3Hit) broken.push(3);

  return broken;
}

/**
 * 根据断组预测生成号码
 * @param {Object} groups - 分组对象
 * @param {Array} brokenGroups - 预测断的组编号 [1] 或 [1,2] 等
 * @returns {Set<string>} - 生成的号码集合
 */
export function generateByBrokenGroups(groups, brokenGroups) {
  const result = new Set();

  // 确定可用的数字池（排除断组中的数字）
  const availableDigits = [];
  if (!brokenGroups.includes(1)) {
    availableDigits.push(...groups.group1);
  }
  if (!brokenGroups.includes(2)) {
    availableDigits.push(...groups.group2);
  }
  if (!brokenGroups.includes(3)) {
    availableDigits.push(...groups.group3);
  }

  // 生成所有可能的3位号码
  for (const d1 of availableDigits) {
    for (const d2 of availableDigits) {
      for (const d3 of availableDigits) {
        result.add(`${d1}${d2}${d3}`);
      }
    }
  }

  return result;
}

/**
 * 验证开奖号是否在断组预测的号码中
 * @param {Set<string>} numbers - 预测号码集合
 * @param {Object} draw - 开奖号 { d1, d2, d3 }
 * @returns {boolean} - true表示在集合中（正确），false表示不在集合中（错误）
 */
export function verifyBrokenGroupDraw(numbers, draw) {
  if (!numbers || numbers.size === 0) return null;
  if (!draw || draw.d1 === undefined || draw.d2 === undefined || draw.d3 === undefined) return null;

  const drawNum = `${draw.d1}${draw.d2}${draw.d3}`;
  return numbers.has(drawNum);
}
