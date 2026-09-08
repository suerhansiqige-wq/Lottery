// GitHub Actions 定时同步脚本：把乐彩网最新开奖数据写回仓库内的 lotteryData.js
// 【延续性锁定】解析规则、过滤规则、写入格式与两个应用完全一致：
//   - 解析：与 App.jsx fetchLatest 相同（空格分隔，parts[0]期号 7位转5位，parts[2..4]=百十个）
//   - 过滤：与 App.jsx 相同（isNaN 丢弃 + 期号 > 静态数据最大期号）
//   - 去重/写入：与 vite.config.js saveDrawsPlugin 相同（正则定位数组结尾 "];"，升序追加条目）
// 只追加、不改写任何历史行，不触碰任何算法逻辑。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const APPS = [
  { name: '福彩3D', url: 'https://data.17500.cn/3d_desc.txt', file: 'lottery-app/src/data/lotteryData.js' },
  { name: '排列三', url: 'https://data.17500.cn/pl32_desc.txt', file: 'pl3-app/src/data/lotteryData.js' },
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/plain, */*',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
};

// 【健康信号】GitHub Actions 的步骤级日志对未登录用户不可读（页面 404 / API 403），
// 只看运行颜色无法区分“数据源不可达”与“确实没有新数据”。因此把异常直接反映到退出码：
// 出现任一异常即把 process.exitCode 置为 1，让 workflow 显示红叉，不必读日志即可发现问题。
// 这只影响 CI 的成败标记，不改变任何解析、过滤与写入逻辑。
const problems = [];

for (const app of APPS) {
  const filePath = path.join(ROOT, app.file);
  try {
    const res = await fetch(app.url, { headers: HEADERS });
    if (!res.ok) {
      console.log(`[${app.name}] 数据源 HTTP ${res.status}，跳过（不写入）`);
      problems.push(`${app.name} 数据源返回 HTTP ${res.status}`);
      continue;
    }
    const text = await res.text();
    const lines = text.trim().split('\n').filter(l => l.trim());
    // 与 App.jsx 相同的行解析
    const items = lines.slice(0, 30).map(line => {
      const parts = line.trim().split(/\s+/);
      const issue = parts[0].length === 7 && parts[0].startsWith('20') ? parts[0].substring(2) : parts[0];
      return { issue, d1: Number(parts[2]), d2: Number(parts[3]), d3: Number(parts[4]) };
    })
      .filter(d => !isNaN(Number(d.issue)) && !isNaN(d.d1) && !isNaN(d.d2) && !isNaN(d.d3))
      // 【写入闸门】无人值守运行，必须确认数据合法才允许落盘：
      //   1) 期号为 5 位纯数字（与应用内格式一致）
      //   2) 三个号码均为 0~9 的整数
      // 不合法则丢弃，宁可当次不同步，也不写入脏数据（算法逻辑零改动）
      .filter(d => /^\d{5}$/.test(d.issue) && [d.d1, d.d2, d.d3].every(v => Number.isInteger(v) && v >= 0 && v <= 9));

    // 解析不出任何有效行，说明数据源改版、被拦截或返回了非开奖内容（例如 HTML 错误页），
    // 这种情况若不报错就会伪装成“无新数据”，是最危险的假绿灯
    if (items.length === 0) {
      console.log(`[${app.name}] 数据源返回内容解析不出任何有效开奖行（可能改版或被拦截），跳过`);
      problems.push(`${app.name} 数据源返回内容无法解析（0 条有效开奖行）`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    // 与 saveDrawsPlugin 相同的数组定位
    const m = content.match(/(export const lotteryData = \[[\s\S]*?\n)(\];)/);
    if (!m) {
      console.log(`[${app.name}] 文件格式错误，跳过`);
      problems.push(`${app.name} 数据文件未匹配到 lotteryData 数组，格式异常`);
      continue;
    }
    const existing = new Set();
    m[1].split('\n').forEach(line => {
      const mm = line.match(/issue:\s*'(\d+)'/);
      if (mm) existing.add(mm[1]);
    });
    const lastIssue = [...existing].sort((a, b) => Number(a) - Number(b)).pop();

    // 与 App.jsx / saveDrawsPlugin 相同的过滤：去重 + 只取比静态数据更新的期号 + 升序
    const fresh = items
      .filter(d => !existing.has(d.issue))
      .filter(d => Number(d.issue) > Number(lastIssue))
      .sort((a, b) => Number(a.issue) - Number(b.issue));

    if (fresh.length === 0) { console.log(`[${app.name}] 无新数据（最新 ${lastIssue}）`); continue; }

    // 【写入闸门】新期号必须从 lastIssue 起连续递增，出现跳号说明源数据异常，放弃写入
    const gap = fresh.filter((d, i) => Number(d.issue) !== Number(lastIssue) + i + 1);
    if (gap.length > 0) {
      console.log(`[${app.name}] 期号不连续（本地最新 ${lastIssue}，源给出 ${fresh.map(d => d.issue).join(',')}），为保护数据完整性放弃本次写入`);
      problems.push(`${app.name} 期号不连续（本地最新 ${lastIssue}，源给出 ${fresh.map(d => d.issue).join(',')}）`);
      continue;
    }

    const entries = fresh.map(d => `  { issue: '${d.issue}', d1: ${d.d1}, d2: ${d.d2}, d3: ${d.d3} },`).join('\n');
    const pos = m.index + m[1].length;
    const updated = content.substring(0, pos).trimEnd() + '\n' + entries + '\n' + content.substring(pos);
    fs.writeFileSync(filePath, updated, 'utf-8');
    console.log(`[${app.name}] 新增 ${fresh.length} 期：${fresh.map(d => `${d.issue}=${d.d1}${d.d2}${d.d3}`).join(' ')}`);
  } catch (err) {
    console.log(`[${app.name}] 同步失败：${err.message}`);
    problems.push(`${app.name} 同步异常：${err.message}`);
  }
}

if (problems.length > 0) {
  console.log(`\n[健康检查] 本次同步存在 ${problems.length} 项异常：`);
  problems.forEach(p => console.log(`  - ${p}`));
  console.log('[健康检查] 退出码置为 1，workflow 将显示红叉，便于在不读日志的情况下发现自动同步中断。');
  console.log('[健康检查] 已成功写入的数据不会丢失：提交步骤带 if: !cancelled()，仍会把已同步部分推上去。');
  process.exitCode = 1;
} else {
  console.log('\n[健康检查] 两个数据源均可正常访问并解析，本次同步健康。');
}
