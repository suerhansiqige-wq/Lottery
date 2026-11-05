// 加减号码：每期固定返回数字三玩法的1000注（000-999）

export const ADD_SUB_LOOKBACK = 300;

// 预生成所有1000注号码（000-999）
const ALL_1000_NUMBERS = Array.from({ length: 1000 }, (_, i) => String(i).padStart(3, '0'));

// 滑动窗口统计每个索引 i 对应的候选池注数与命中情况
// 由于固定返回1000注，所有开奖号都命中
export function buildAddSubIndex(data, L = ADD_SUB_LOOKBACK) {
  const map = new Map();
  for (let i = 0; i < data.length; i++) {
    if (i < L) continue;
    map.set(data[i].issue, { size: 1000, hit: true });
  }
  return map;
}

// 单期候选池号码：固定返回1000注
export function getAddSubNumbers(data, targetIndex, L = ADD_SUB_LOOKBACK) {
  if (targetIndex < L) return [];
  return ALL_1000_NUMBERS;
}
