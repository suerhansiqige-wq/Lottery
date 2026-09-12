// 本机一键同步并推送：开奖后运行一次，GitHub Pages 约 1~2 分钟内更新到最新一期
//
// 【为什么需要它】GitHub Actions 的 schedule 对本仓库实测不可靠：
//   - 2026-09-08 的两个 cron（UTC 13:30 / 14:05）分别延迟 5h01m / 4h50m 才执行，
//     实际跑在北京时间次日凌晨 02:31 / 02:55；
//   - 2026-09-09 的 cron 到 UTC 15:07 为止一次都没被触发（运行记录 total 未增加）。
//   而 push 事件触发的 pages-deploy 实测 4/4 全部成功。
//   所以可靠链路是：本机拉数据 → push → pages-deploy 自动重新发布。
//
// 【它不做什么】不改动任何应用源码、算法与显示逻辑；提交范围严格限定为两个 lotteryData.js，
//   工作树里其他未提交的改动一律不碰（rebase 用 --autostash 保护）。
//
// 【2026-09-12 加固】此前是「先取数提交、再变基」，而 GitHub Actions 的 bot 常在开奖后
//   15~35 分钟内抢先提交同一期数据，于是本地补丁被变基判定为「上游已有」而丢弃，
//   git push 实际是空操作（不产生任何 push 事件），却仍打印「✓ 推送成功」——假绿灯。
//   现在改为：① 取数之前先与远端对齐；② 万一仍撞上竞争，明确报告「本次没有产生新的推送」。
//   发布也不再依赖本机 push：sync-draws.yml 已能在同一次运行内自行构建并发布 Pages。
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_FILES = ['lottery-app/src/data/lotteryData.js', 'pl3-app/src/data/lotteryData.js'];
const SITE = 'https://suerhansiqige-wq.github.io/Lottery';

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf-8', ...opts });
const die = (msg, code = 1) => { console.log(`\n✗ ${msg}`); process.exit(code); };

const nowBJ = () => new Date(Date.now() + 8 * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
console.log(`\n===== 彩票开奖数据 一键同步并推送 | 北京时间 ${nowBJ()} =====`);

// ---- 1) 环境检查 ----
if (run('git', ['--version']).status !== 0) die('未检测到 git，请先安装 Git for Windows');
if (run('git', ['rev-parse', '--is-inside-work-tree']).stdout?.trim() !== 'true') die('当前目录不是 git 仓库');
const remote = run('git', ['remote', 'get-url', 'origin']).stdout?.trim();
if (!remote) die('未配置 origin 远端，无法推送');
const branch = run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).stdout?.trim();
if (!branch || branch === 'HEAD') die('当前处于分离头指针状态，请先切回 main 分支');
console.log(`仓库 ${remote}\n分支 ${branch}`);

// ---- 2) 先与远端对齐：bot 可能已抢先把同一期数据提交上去 ----
//   放在取数之前，后面的「数据变更检查」才是拿最新仓库状态做比较，
//   否则会把上游已有的那期又提交一遍，再被变基丢弃（正是过去假绿灯的成因）。
console.log('\n----- 第 1 步：与远端对齐 -----');
const pre = run('git', ['pull', '--rebase', '--autostash', 'origin', branch]);
if (pre.status !== 0) {
  run('git', ['rebase', '--abort']);
  die(`git pull --rebase 失败（已回滚变基）：\n${pre.stdout || ''}${pre.stderr || ''}`);
}
console.log(`已对齐到 ${run('git', ['rev-parse', '--short', 'HEAD']).stdout?.trim()}`);

// ---- 3) 拉取最新开奖数据（多源兜底 + 交叉校验 + 写入闸门）----
console.log('\n----- 第 2 步：拉取最新开奖数据 -----');
const sync = run(process.execPath, [path.join(ROOT, 'scripts', 'gh_sync_draws.mjs')], { stdio: 'inherit' });
const syncHealthy = sync.status === 0;

// ---- 4) 检查数据文件是否真的有新增 ----
console.log('\n----- 第 3 步：检查数据变更 -----');
const changed = run('git', ['status', '--porcelain', '--', ...DATA_FILES]).stdout?.trim();
if (!changed) {
  console.log('两个 lotteryData.js 均无变更 → 没有新开奖数据需要推送。');
  if (!syncHealthy) {
    console.log('\n⚠ 但取数阶段报告了异常（见上方红字）。线上数据仍是仓库里已有的最新一期，未被破坏。');
    process.exit(1);
  }
  console.log(`\n✓ 线上已是最新，无需操作。\n  ${SITE}/3d/\n  ${SITE}/pl3/`);
  process.exit(0);
}
console.log(changed);

// 把新增的开奖行打出来，便于推送前肉眼核对
const diff = run('git', ['diff', '-U0', '--', ...DATA_FILES]).stdout || '';
const added = diff.split('\n').filter(l => /^\+\s*\{\s*issue:/.test(l)).map(l => l.trim());
if (added.length > 0) {
  console.log(`\n本次将新增 ${added.length} 行开奖数据：`);
  added.forEach(a => console.log(`  ${a}`));
}

// ---- 5) 提交（只提交这两个数据文件）----
console.log('\n----- 第 4 步：提交 -----');
if (run('git', ['add', '--', ...DATA_FILES]).status !== 0) die('git add 失败');
const issues = added.map(a => (a.match(/issue:\s*'(\d+)'/) || [])[1]).filter(Boolean);
const msg = `chore(data): 同步最新开奖数据${issues.length ? `（${issues.join('、')}）` : ''}`;
const commit = run('git', ['commit', '-m', msg]);
if (commit.status !== 0) die(`git commit 失败：\n${commit.stdout || ''}${commit.stderr || ''}`);
console.log((commit.stdout || '').trim().split('\n')[0]);

// ---- 6) 推送前先变基，避免与 GitHub 定时任务的提交冲突 ----
console.log('\n----- 第 5 步：变基并推送 -----');
const localCommit = run('git', ['rev-parse', 'HEAD']).stdout?.trim();
const pull = run('git', ['pull', '--rebase', '--autostash', 'origin', branch]);
if (pull.status !== 0) {
  run('git', ['rebase', '--abort']);
  die(`git pull --rebase 失败（已回滚变基，本地提交仍保留）：\n${pull.stdout || ''}${pull.stderr || ''}`);
}
// 变基后本地提交不见了 = 上游已有完全相同的补丁（bot 抢先几分钟同步了同一期），
//   此时 push 是空操作、不产生 push 事件。过去这里照样打印「✓ 推送成功」，属假绿灯。
const headFull = run('git', ['rev-parse', 'HEAD']).stdout?.trim();
const dropped = headFull !== localCommit;
const push = run('git', ['push', 'origin', `HEAD:${branch}`]);
const pushOut = `${push.stdout || ''}${push.stderr || ''}`;
if (push.status !== 0) {
  die(`git push 失败：\n${pushOut}\n提交已在本地保留，稍后重试即可。`);
}
const noop = dropped || /Everything up-to-date/i.test(pushOut);
const head = (headFull || '').slice(0, 7);

// ---- 7) 结果 ----
if (noop) {
  console.log(`\n⚠ 本次没有产生新的推送（上游 ${head} 已包含相同数据）：GitHub Actions 抢先同步了同一期。`);
  console.log('  数据本身是最新的；发布由那次 Actions 运行的 deploy 作业自行完成，不需要本机 push 触发。');
} else {
  console.log(`\n✓ 推送成功（${head}）。push 已自动触发 pages-deploy 重新构建发布。`);
}
console.log('  约 1~2 分钟后线上即为最新数据：');
console.log(`    ${SITE}/3d/`);
console.log(`    ${SITE}/pl3/`);
console.log('  构建进度可看：https://github.com/suerhansiqige-wq/Lottery/actions/workflows/pages-deploy.yml');
if (!syncHealthy) {
  console.log(`\n⚠ 数据${noop ? '' : '已推送成功，'}但取数阶段有异常提示（见上方），说明部分数据源不可用，建议留意。`);
  process.exit(1);
}
process.exit(0);
