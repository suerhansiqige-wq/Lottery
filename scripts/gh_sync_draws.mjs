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
// 【多源改造 2026-09-09】取数层由“只调用乐彩网”改为“主源 + 官方备源”双通道：
//   福彩3D：乐彩网 txt（主） / 中国福彩官方 www.cwl.gov.cn JSON（备）
//   排列三：乐彩网 txt（主） / 中国体彩官方 webapi.sporttery.cn JSON（备，gameNo=35 即排列3）
// 三个源实测返回的期号与号码逐位一致（26242：福彩3D=555、排列三=244）。
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

  // 中国福彩官方 JSON：{ state:0, message:'查询成功', result:[{ code:'2026242', red:'5,5,5', date:'2026-09-09(三)' }] }
  // code 是 7 位期号，red 是逗号分隔的三个号码
  cwl(text) {
    const j = JSON.parse(text);
    if (j.state !== 0) throw new Error(`接口返回 state=${j.state} message=${j.message}`);
    return clean((j.result || []).slice(0, 30).map(x => {
      const p = String(x.red || '').split(',');
      return { issue: toFive(String(x.code || '')), d1: Number(p[0]), d2: Number(p[1]), d3: Number(p[2]) };
    }));
  },

  // 中国体彩官方 JSON（gameNo=35 = 排列3）：
  //   { success:true, value:{ list:[{ lotteryDrawNum:'26242', lotteryDrawResult:'2 4 4', lotteryDrawTime:'2026-09-09' }] } }
  // lotteryDrawResult 为空格分隔；该接口必须带 Referer，否则被 WAF 拦成 HTTP 567
  sporttery(text) {
    const j = JSON.parse(text);
    if (j.success !== true) throw new Error(`接口返回 errorCode=${j.errorCode} errorMessage=${j.errorMessage}`);
    return clean((((j.value || {}).list) || []).slice(0, 30).map(x => {
      const p = String(x.lotteryDrawResult || '').trim().split(/\s+/);
      return { issue: toFive(String(x.lotteryDrawNum || '')), d1: Number(p[0]), d2: Number(p[1]), d3: Number(p[2]) };
    }));
  },
};

const APPS = [
  {
    name: '福彩3D',
    file: 'lottery-app/src/data/lotteryData.js',
    sources: [
      { label: '乐彩网', parser: 'lecai', url: 'https://data.17500.cn/3d_desc.txt' },
      {
        label: '中国福彩官方',
        parser: 'cwl',
        url: 'https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx/findDrawNotice?name=3d&issueCount=30',
        headers: { Referer: 'https://www.cwl.gov.cn/ygkj/wqkjgg/' },
      },
    ],
  },
  {
    name: '排列三',
    file: 'pl3-app/src/data/lotteryData.js',
    sources: [
      { label: '乐彩网', parser: 'lecai', url: 'https://data.17500.cn/pl32_desc.txt' },
      {
        label: '中国体彩官方',
        parser: 'sporttery',
        url: 'https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=35&provinceId=0&pageSize=30&isVerify=1&pageNo=1',
        headers: { Referer: 'https://static.sporttery.cn/' },
      },
    ],
  },
];

// 【健康信号】GitHub Actions 的步骤级日志对未登录用户不可读（页面 404 / API 403），
// 只看运行颜色无法区分“数据源不可达”与“确实没有新数据”。因此把异常直接反映到退出码：
// 出现任一异常即把 process.exitCode 置为 1，让 workflow 显示红叉，不必读日志即可发现问题。
// 这只影响 CI 的成败标记，不改变任何解析、过滤与写入逻辑。
const problems = [];
// 降级：主源挂了但备源顶上，同步照常完成。这种情况只提示、不置红，否则备源永远白设
const degraded = [];

const fetchSource = async (src) => {
  const t0 = Date.now();
  const res = await fetch(src.url, { headers: { ...BASE_HEADERS, ...(src.headers || {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const items = PARSERS[src.parser](text);
  // 解析不出任何有效行，说明数据源改版、被拦截或返回了非开奖内容
  // （例如 HTML 错误页，或乐彩对带 Origin 请求返回的 169 字节防盗链跳转页）
  // 这种情况若不报错就会伪装成“无新数据”，是最危险的假绿灯
  if (items.length === 0) throw new Error('返回内容解析不出任何有效开奖行（可能改版或被拦截）');
  return { items, ms: Date.now() - t0 };
};

for (const app of APPS) {
  const filePath = path.join(ROOT, app.file);

  // ---- 1) 取数：按顺序尝试全部数据源，成功的都留下（第一个作为写入依据，其余用于交叉校验）----
  const results = [];
  for (const src of app.sources) {
    try {
      const r = await fetchSource(src);
      results.push({ src, items: r.items });
      console.log(`[${app.name}] ${src.label} 可用（${r.ms}ms，${r.items.length} 期，最新 ${fmt(latest(r.items))}）`);
    } catch (err) {
      results.push({ src, error: err.message });
      console.log(`[${app.name}] ${src.label} 不可用：${err.message}`);
    }
  }

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
    console.log(`[${app.name}] 新增 ${fresh.length} 期：${fresh.map(fmt).join(' ')}`);
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
