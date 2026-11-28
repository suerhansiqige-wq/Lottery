// 开奖数据同步脚本（GitHub Actions 定时任务与本机一键推送共用）
// 作用：把最新开奖数据追加写回仓库内的 lotteryData.js，Pages 随之重新发布，
//       让纯静态托管也具备“开奖数据自动延续”的能力。
//
// 【延续性锁定】解析规则、过滤规则、写入格式与两个应用完全一致：
//   - 解析：与 App.jsx fetchLatest 相同（空格分隔，parts[0]期号 7位转5位，parts[2..4]=百十个）
//   - 过滤：与 App.jsx 相同（isNaN 丢弃 + 期号 > 静态数据最大期号）
//   - 去重/写入：与 vite.config.js saveDrawsPlugin 相同（正则定位数组结尾 "];"，升序追加条目）
// 只追加、不改写任何历史行，不触碰任何算法逻辑。
//
// 【多源改造 2026-09-09】取数层由“只调用乐彩网”改为多源兜底。
// 【2026-11-28 多线并行】新增博众网走势图（qshx.com 友链，GBK）。
// 【2026-11-28 去官方源】按用户要求移除中国福彩官方(cwl.gov.cn)与中国体彩官方(sporttery.cn)
//   （两者对 GitHub 境外 runner 实测 403/567 拦截，云端从来用不上），
//   改补两条民间彩票网兜底：500彩票网走势图(datachart.500.com) + 彩吧(www.55125.cn)。
//   现每彩种 4 源：乐彩网 / 博众网 / 500彩票网 / 彩吧，全部非官方。
//   两个应用共8条取数线并行发起（Promise.allSettled），单源20秒超时，互不拖累。
// 【2026-11-28 时刻表】云端以 --scheduled 运行时按时刻表轮流抓取：
//   福彩3D 北京 21:19 起每 2 分钟（奇数分），排列三 21:28 起每 2 分钟（偶数分），
//   两彩种逐分轮流、互不同时，直到北京 00:10 收工。
//   本机手动运行不带 --scheduled，两彩种都抓，不受时刻表限制。
// 各源实测返回的期号与号码逐位一致（26318：福彩3D=226、排列三=504）。
// 备源的意义：任一源改版 / 限流 / 封禁 / 被境外 IP 拦截时，同步不会中断；
//   两源同时可用时做交叉校验，只要有一处不一致就放弃写入并让 workflow 变红——
//   宁可当次不同步，也绝不写入可疑数据。
// 本次只替换“从哪里取数”，写入闸门与落盘逻辑与改造前完全相同。
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BASE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/plain, */*',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
};

// ---------------- 解析层：把各源响应统一成 [{ issue(5位字符串), d1, d2, d3 }] ----------------
// 【写入闸门】无人值守运行，必须确认数据合法才允许进入后续流程：
//   1) 期号为 5 位纯数字（与应用内格式一致）
//   2) 三个号码均为 0~9 的整数
const isValid = d => /^\d{5}$/.test(d.issue) && [d.d1, d.d2, d.d3].every(v => Number.isInteger(v) && v >= 0 && v <= 9);
const clean = arr => arr
  .filter(d => !isNaN(Number(d.issue)) && !isNaN(d.d1) && !isNaN(d.d2) && !isNaN(d.d3))
  .filter(isValid);
const toFive = s => (s.length === 7 && s.startsWith('20') ? s.substring(2) : s);
const fmt = d => `${d.issue}=${d.d1}${d.d2}${d.d3}`;
const latest = items => items.reduce((a, b) => (Number(b.issue) > Number(a.issue) ? b : a));

const PARSERS = {
  // 乐彩网倒序 txt：每行空格分隔，parts[0]=期号、parts[1]=日期、parts[2..4]=百/十/个
  // 与 App.jsx fetchLatest 的解析逐字一致
  lecai(text) {
    return clean(text.trim().split('\n').filter(l => l.trim()).slice(0, 30).map(line => {
      const parts = line.trim().split(/\s+/);
      return { issue: toFive(parts[0]), d1: Number(parts[2]), d2: Number(parts[3]), d3: Number(parts[4]) };
    }));
  },

  // 500彩票网走势图（UTF-8）：行格式 期号td + 三个 chartBall01 td
  //   福彩3D期号为7位(2026318)需转5位，排列三为5位；expect=30 取30期
  chart500(text) {
    const re = /<td align="center">(\d{5,7})<\/td>\s*<td class="chartBall01"[^>]*>(\d)<\/td>\s*<td class="chartBall01"[^>]*>(\d)<\/td>\s*<td class="chartBall01"[^>]*>(\d)<\/td>/g;
    return clean([...text.matchAll(re)].map(m => ({ issue: toFive(m[1]), d1: Number(m[2]), d2: Number(m[3]), d3: Number(m[4]) })));
  },

  // 博众网走势图（用户提供的 qshx.com 首页友情链接，GBK 编码）：
  //   行格式 <td>期号</td><td><font>三位奖号</font></td>，cz=1 福彩3D / cz=2 排列三，qs=30 取30期，升序
  bzsoft(text) {
    const re = /<td[^>]*>\s*(\d{5})\s*<\/td>\s*<td[^>]*>\s*(?:<b>)?<font[^>]*>(\d{3})<\/font>(?:<\/b>)?\s*<\/td>/g;
    return clean([...text.matchAll(re)].map(m => ({ issue: m[1], d1: Number(m[2][0]), d2: Number(m[2][1]), d3: Number(m[2][2]) })));
  },
};

// 彩吧(55125.cn)两段式取数：列表页第一个期号链接即最新一期 → 单期页取前三个 ball 数字。
// 只返回最新 1 期，作为交叉校验与兜底足够；path='3d' 福彩3D / 'p3' 排列三
const caibaFetcher = (path) => async () => {
  const get = async (url) => {
    const res = await fetch(url, { headers: BASE_HEADERS, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  };
  const list = await get(`https://www.55125.cn/kaijiang/${path}/`);
  const m = list.match(new RegExp(`/kaijiang/${path}/(\\d{7})\\.htm`));
  if (!m) throw new Error('列表页解析不出期号链接（可能改版或被拦截）');
  const page = await get(`https://www.55125.cn/kaijiang/${path}/${m[1]}.htm`);
  const balls = [...page.matchAll(/class="ball[^"]*">(\d)</g)].slice(0, 3).map(x => Number(x[1]));
  return clean([{ issue: toFive(m[1]), d1: balls[0], d2: balls[1], d3: balls[2] }]);
};

const APPS = [
  {
    name: '福彩3D',
    file: 'lottery-app/src/data/lotteryData.js',
    startOffset: 19, // 北京 21:19 起，每 2 分钟（奇数分）
    sources: [
      { label: '乐彩网', parser: 'lecai', url: 'https://data.17500.cn/3d_desc.txt' },
      { label: '博众网', parser: 'bzsoft', encoding: 'gbk', url: 'https://www.bzsoft.com.cn/chart/tb_fbt.asp?qs=30&cz=1' },
      { label: '500彩票网', parser: 'chart500', url: 'https://datachart.500.com/sd/zoushi/newinc/jbzs.php?expect=30' },
      { label: '彩吧', fetcher: caibaFetcher('3d'), url: 'https://www.55125.cn/kaijiang/3d/' },
    ],
  },
  {
    name: '排列三',
    file: 'pl3-app/src/data/lotteryData.js',
    startOffset: 28, // 北京 21:28 起，每 2 分钟（偶数分）
    sources: [
      { label: '乐彩网', parser: 'lecai', url: 'https://data.17500.cn/pl32_desc.txt' },
      { label: '博众网', parser: 'bzsoft', encoding: 'gbk', url: 'https://www.bzsoft.com.cn/chart/tb_fbt.asp?qs=30&cz=2' },
      { label: '500彩票网', parser: 'chart500', url: 'https://datachart.500.com/pls/zoushi/newinc/jbzs.php?expect=30' },
      { label: '彩吧', fetcher: caibaFetcher('p3'), url: 'https://www.55125.cn/kaijiang/p3/' },
    ],
  },
];

// ---------------- 时刻表闸门（仅云端 --scheduled 模式生效） ----------------
// 以“北京 21:00 之后过了多少分钟”计：福彩3D 从第 19 分钟起每逢奇数分钟抓取，
// 排列三从第 28 分钟起每逢偶数分钟抓取，第 190 分钟（北京 00:10）后收工。
const SCHEDULED = process.argv.includes('--scheduled');
const bjNow = new Date(Date.now() + 8 * 3600e3);
const minsSince21 = ((bjNow.getUTCHours() * 60 + bjNow.getUTCMinutes()) - 21 * 60 + 1440) % 1440;
const isDue = (app) => minsSince21 >= app.startOffset && minsSince21 <= 190 && (minsSince21 - app.startOffset) % 2 === 0;
const dueApps = SCHEDULED ? APPS.filter(isDue) : APPS;
if (SCHEDULED) {
  const hh = String(bjNow.getUTCHours()).padStart(2, '0');
  const mm = String(bjNow.getUTCMinutes()).padStart(2, '0');
  APPS.forEach(a => console.log(`[时刻表] 北京 ${hh}:${mm} ${a.name} ${isDue(a) ? '轮到抓取' : '未到抓取时刻，跳过'}`));
  if (dueApps.length === 0) {
    console.log('[时刻表] 本轮没有彩种轮到抓取，直接结束');
    process.exit(0);
  }
}

// 【健康信号】GitHub Actions 的步骤级日志对未登录用户不可读（页面 404 / API 403），
// 只看运行颜色无法区分“数据源不可达”与“确实没有新数据”。因此把异常直接反映到退出码：
// 出现任一异常即把 process.exitCode 置为 1，让 workflow 显示红叉，不必读日志即可发现问题。
// 这只影响 CI 的成败标记，不改变任何解析、过滤与写入逻辑。
const problems = [];
// 降级：主源挂了但备源顶上，同步照常完成。这种情况只提示、不置红，否则备源永远白设
const degraded = [];

const fetchSource = async (src) => {
  const t0 = Date.now();
  let items;
  if (src.fetcher) {
    // 自定义取数（如彩吧的两段式：列表页定期号 → 单期页取号码）
    items = await src.fetcher();
  } else {
    const res = await fetch(src.url, { headers: { ...BASE_HEADERS, ...(src.headers || {}) }, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = src.encoding === 'gbk' ? new TextDecoder('gbk').decode(await res.arrayBuffer()) : await res.text();
    items = PARSERS[src.parser](text);
  }
  // 解析不出任何有效行，说明数据源改版、被拦截或返回了非开奖内容
  // （例如 HTML 错误页，或乐彩对带 Origin 请求返回的 169 字节防盗链跳转页）
  // 这种情况若不报错就会伪装成“无新数据”，是最危险的假绿灯
  if (items.length === 0) throw new Error('返回内容解析不出任何有效开奖行（可能改版或被拦截）');
  return { items, ms: Date.now() - t0 };
};

// ---- 多线同时取数：本轮轮到的彩种全部数据源并行发起，单源20秒超时，任一源卡死不拖累其他源 ----
const jobs = dueApps.flatMap(app => app.sources.map(src => ({ app, src })));
const settled = await Promise.allSettled(jobs.map(j => fetchSource(j.src)));
const fetched = new Map(dueApps.map(a => [a.name, []]));
settled.forEach((r, i) => {
  const { app, src } = jobs[i];
  if (r.status === 'fulfilled') {
    console.log(`[${app.name}] ${src.label} 可用（${r.value.ms}ms，${r.value.items.length} 期，最新 ${fmt(latest(r.value.items))}）`);
    fetched.get(app.name).push({ src, items: r.value.items });
  } else {
    const msg = r.reason?.message || String(r.reason);
    console.log(`[${app.name}] ${src.label} 不可用：${msg}`);
    fetched.get(app.name).push({ src, error: msg });
  }
});

for (const app of dueApps) {
  const filePath = path.join(ROOT, app.file);

  // ---- 1) 取数结果：成功的都留下（第一个作为写入依据，其余用于交叉校验）----
  const results = fetched.get(app.name);

  const ok = results.filter(r => r.items);
  if (ok.length === 0) {
    console.log(`[${app.name}] ${app.sources.length} 个数据源全部不可用，跳过（不写入）`);
    problems.push(`${app.name} 全部数据源不可用（${results.map(r => `${r.src.label}：${r.error}`).join('；')}）`);
    continue;
  }
  if (ok.length < app.sources.length) {
    const bad = results.filter(r => !r.items);
    degraded.push(`${app.name} 仅 ${ok.map(r => r.src.label).join('、')} 可用（${bad.map(r => `${r.src.label}：${r.error}`).join('；')}）`);
  }

  // ---- 2) 交叉校验：多源同时可用时，对相同期号逐位比对，任何不一致都放弃写入 ----
  const primary = ok[0];
  const items = primary.items;
  if (ok.length > 1) {
    const base = new Map(items.map(d => [d.issue, `${d.d1}${d.d2}${d.d3}`]));
    const diffs = [];
    let compared = 0;
    for (const other of ok.slice(1)) {
      for (const d of other.items) {
        const b = base.get(d.issue);
        if (b === undefined) continue;
        compared++;
        const v = `${d.d1}${d.d2}${d.d3}`;
        if (b !== v) diffs.push(`期号 ${d.issue}：${primary.src.label}=${b} / ${other.src.label}=${v}`);
      }
    }
    if (diffs.length > 0) {
      console.log(`[${app.name}] 多源交叉校验发现 ${diffs.length} 处不一致，为保护数据完整性放弃本次写入：`);
      diffs.forEach(d => console.log(`    ${d}`));
      problems.push(`${app.name} 多源数据不一致（${diffs.length} 处，例：${diffs[0]}）`);
      continue;
    }
    console.log(`[${app.name}] 多源交叉校验一致（${ok.length} 个源、比对 ${compared} 期），采用 ${primary.src.label} 结果`);
  }

  // ---- 3) 以下与改造前完全相同：定位数组 → 去重 → 连续性闸门 → 升序追加写入 ----
  try {
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

    if (fresh.length === 0) {
      console.log(`[${app.name}] 无新数据（最新 ${lastIssue}）`);
      // 检查 optimized 文件是否落后，如果是则补同步
      const optimizedFilePath = filePath.replace('lotteryData.js', 'lotteryDataOptimized.js');
      try {
        const optContent = fs.readFileSync(optimizedFilePath, 'utf-8');
        const compactStart = optContent.indexOf('const COMPACT_DATA = `');
        const compactEnd = compactStart !== -1 ? optContent.indexOf('`;', compactStart + 20) : -1;
        if (compactStart !== -1 && compactEnd !== -1) {
          const dataSection = optContent.substring(compactStart, compactEnd);
          const optIssues = new Set();
          dataSection.split('\n').forEach(line => {
            const mm = line.match(/^(\d{5}),/);
            if (mm) optIssues.add(mm[1]);
          });
          const optLastIssue = [...optIssues].sort((a, b) => Number(a) - Number(b)).pop();
          if (optLastIssue && Number(optLastIssue) < Number(lastIssue)) {
            // optimized 文件落后，补同步（跳过已存在的期号，防止重复行）
            const missing = items.filter(d => Number(d.issue) > Number(optLastIssue) && Number(d.issue) <= Number(lastIssue) && !optIssues.has(d.issue));
            if (missing.length > 0) {
              const optEntries = missing.map(d => `${d.issue},${d.d1},${d.d2},${d.d3}`).join('\n');
              const optUpdated = optContent.substring(0, compactStart) + dataSection.replace(/\s+$/, '') + '\n' + optEntries + optContent.substring(compactEnd);
              fs.writeFileSync(optimizedFilePath, optUpdated, 'utf-8');
              console.log(`[${app.name}] 补同步 optimized 文件（${missing.length} 期：${missing.map(d => d.issue).join(', ')}）`);
            }
          }
        }
      } catch (err) {
        console.log(`[${app.name}] 检查 optimized 文件失败：${err.message}`);
      }
      continue;
    }

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
    console.log(`[${app.name}] 新增 ${fresh.length} 期：${fresh.map(fmt).join(' ')}`);

    // ---- 4) 同步更新 lotteryDataOptimized.js（紧凑格式）----
    const optimizedFilePath = filePath.replace('lotteryData.js', 'lotteryDataOptimized.js');
    try {
      const optContent = fs.readFileSync(optimizedFilePath, 'utf-8');
      // 用字符串查找代替正则，避免 CI 环境正则不匹配
      const compactStart = optContent.indexOf('const COMPACT_DATA = `');
      const compactEnd = optContent.indexOf('`;', compactStart + 20);
      if (compactStart === -1 || compactEnd === -1) {
        console.log(`[${app.name}] lotteryDataOptimized.js 格式错误，跳过`);
        problems.push(`${app.name} 优化数据文件未匹配到 COMPACT_DATA，格式异常`);
      } else {
        const dataSection = optContent.substring(compactStart, compactEnd);
        // 跳过 optimized 中已存在的期号：CI 与本机可能先后追加同一期，重复行会污染统计
        const optExisting = new Set();
        dataSection.split('\n').forEach(line => {
          const mm = line.match(/^(\d{5}),/);
          if (mm) optExisting.add(mm[1]);
        });
        const optFresh = fresh.filter(d => !optExisting.has(d.issue));
        if (optFresh.length === 0) {
          console.log(`[${app.name}] lotteryDataOptimized.js 已包含全部新期号，无需追加`);
        } else {
          const optEntries = optFresh.map(d => `${d.issue},${d.d1},${d.d2},${d.d3}`).join('\n');
          const optUpdated = dataSection.replace(/\s+$/, '') + '\n' + optEntries + optContent.substring(compactEnd);
          fs.writeFileSync(optimizedFilePath, optContent.substring(0, compactStart) + optUpdated, 'utf-8');
          console.log(`[${app.name}] 同步更新 lotteryDataOptimized.js（${optFresh.length} 期）`);
        }
      }
    } catch (err) {
      console.log(`[${app.name}] 更新 lotteryDataOptimized.js 失败：${err.message}`);
      problems.push(`${app.name} 优化数据文件同步异常：${err.message}`);
    }
  } catch (err) {
    console.log(`[${app.name}] 同步失败：${err.message}`);
    problems.push(`${app.name} 同步异常：${err.message}`);
  }
}

if (degraded.length > 0) {
  console.log('\n[降级提示] 部分数据源不可用，已由可用源完成同步，本次结果不受影响：');
  degraded.forEach(d => console.log(`  - ${d}`));
}

if (problems.length > 0) {
  console.log(`\n[健康检查] 本次同步存在 ${problems.length} 项异常：`);
  problems.forEach(p => console.log(`  - ${p}`));
  console.log('[健康检查] 退出码置为 1，workflow 将显示红叉，便于在不读日志的情况下发现自动同步中断。');
  console.log('[健康检查] 已成功写入的数据不会丢失：提交步骤带 if: !cancelled()，仍会把已同步部分推上去。');
  process.exitCode = 1;
} else {
  console.log('\n[健康检查] 数据源可用、多源交叉校验通过，本次同步健康。');
}
