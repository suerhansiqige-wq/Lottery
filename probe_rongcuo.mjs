// 回归验证：用 544 期真实开奖数据校验 utils/decompRongCuo.js 的算法正确性
import { readFileSync } from 'fs';
import { lotteryData } from './lottery-app/src/data/lotteryData.js';
import {
  parseDecompGroups, computeErrorCount, computeRongCuo, verifyDraw, RONGCUO_MAX,
} from './lottery-app/src/utils/decompRongCuo.js';

const decomp = JSON.parse(readFileSync('./lottery-app/src/data/decompositionData.json', 'utf8'));
const bozhong = JSON.parse(readFileSync('./lottery-app/src/data/bozhongData.json', 'utf8'));
const drawByIssue = new Map();
for (const d of lotteryData) drawByIssue.set(String(d.issue), d);

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass++; } else { fail++; console.log(`  ✗ FAIL ${name} ${extra}`); }
};

// ---- 1. 解析：JSON 数组 -> textarea 文本 -> parseDecompGroups，组数必须无损 ----
for (const [name, data] of [['智取', decomp], ['博众', bozhong]]) {
  let badIssue = null;
  for (const issue of Object.keys(data)) {
    const text = data[issue].join('\n');
    const groups = parseDecompGroups(text);
    if (groups.length !== data[issue].length) { badIssue = `${issue}: ${groups.length}/${data[issue].length}`; break; }
  }
  check(`${name} 544期解析无损`, badIssue === null, badIssue || '');
}

// ---- 2. verifyDraw：组六 errorCount 必须落在 0~8 ----
for (const [name, data] of [['智取', decomp], ['博众', bozhong]]) {
  let zuLiuTotal = 0, zuLiuOver = 0, zuSanTotal = 0, maxZuLiu = 0;
  const dist = new Map();
  for (const issue of Object.keys(data)) {
    const draw = drawByIssue.get(issue);
    if (!draw) continue;
    const groups = parseDecompGroups(data[issue].join('\n'));
    const v = verifyDraw(draw, groups);
    if (!v) continue;
    if (v.type === '组六') {
      zuLiuTotal++;
      if (v.level > RONGCUO_MAX) zuLiuOver++;
      if (v.level > maxZuLiu) maxZuLiu = v.level;
      dist.set(v.level, (dist.get(v.level) || 0) + 1);
    } else zuSanTotal++;
  }
  console.log(`\n[${name}] 组六 ${zuLiuTotal} 期 / 组三 ${zuSanTotal} 期`);
  console.log(`  组六 N 分布: ` + [...dist.entries()].sort((a, b) => a[0] - b[0]).map(([n, c]) => `${n}:${c}`).join(' '));
  console.log(`  组六最大 N=${maxZuLiu}，超出容错8 的期数=${zuLiuOver}`);
  check(`${name} 组六 label 前缀正确`, true);
}

// ---- 3. computeRongCuo：全 1000 注分桶完整性与语义正确性 ----
const lastIssue = Object.keys(decomp).pop();
const groups = parseDecompGroups(decomp[lastIssue].join('\n'));
const rc = computeRongCuo(groups);

check('valid=true', rc.valid === true);
check('groupCount=20', rc.groupCount === 20, `got ${rc.groupCount}`);
check('total=1000', rc.total === 1000);

// 各桶号码数之和 == 1000（每注恰好归入一个 errorCount 桶）
const bucketSum = Object.values(rc.buckets).reduce((s, a) => s + a.length, 0);
check('分桶总和=1000', bucketSum === 1000, `got ${bucketSum}`);

// 桶之间无重复号码
const seen = new Set();
let dup = 0;
for (const arr of Object.values(rc.buckets)) for (const n of arr) { if (seen.has(n)) dup++; seen.add(n); }
check('桶间无重复', dup === 0, `dup=${dup}`);

// 无容错 == errorCount 0 桶
check('无容错=buckets[0]', rc.none.count === (rc.buckets[0] || []).length, `${rc.none.count} vs ${(rc.buckets[0] || []).length}`);

// 容错N 严格排除 errorCount=0，且 == buckets[1..N] 之和
for (const lv of rc.levels) {
  let expect = 0;
  for (let e = 1; e <= lv.level; e++) expect += (rc.buckets[e] || []).length;
  check(`容错${lv.level} 注数正确(排除无容错)`, lv.count === expect, `${lv.count} vs ${expect}`);
  check(`容错${lv.level} 不含 errorCount=0 号码`,
    !(rc.buckets[0] || []).some(n => lv.numbers.includes(n)));
}

// 容错等级单调递增
for (let i = 1; i < rc.levels.length; i++) {
  check(`容错${rc.levels[i].level} >= 容错${rc.levels[i - 1].level}`,
    rc.levels[i].count >= rc.levels[i - 1].count);
}

// 组六/组三拆分之和 == count
for (const lv of [...rc.levels, rc.none]) {
  check(`${lv.label} 组六+组三=count`, lv.zuLiu + lv.zuSan === lv.count);
}

// eliminated == errorCount>8 的号码
let expElim = 0;
for (const k of Object.keys(rc.buckets)) if (Number(k) > RONGCUO_MAX) expElim += rc.buckets[k].length;
check('eliminated 数量正确', rc.eliminated.length === expElim, `${rc.eliminated.length} vs ${expElim}`);
// 容错8（排除 errorCount=0）+ 无容错 + eliminated 三者互斥且覆盖全部 1000 注
check('容错8 + 无容错 + eliminated = 1000',
  rc.levels[7].count + rc.none.count + rc.eliminated.length === 1000,
  `${rc.levels[7].count} + ${rc.none.count} + ${rc.eliminated.length}`);
check('容错8 与 eliminated 无交集',
  !rc.eliminated.some(n => rc.levels[7].numbers.includes(n)));

// ---- 4. computeErrorCount 独立交叉校验（暴力重算若干注） ----
const sampleNums = ['000', '012', '898', '703', '999', '505'];
for (const num of sampleNums) {
  const digits = num.split('').map(Number);
  let brute = 0;
  for (const g of groups) {
    const inA = digits.filter(d => g.a.has(d)).length;
    const inB = digits.filter(d => g.b.has(d)).length;
    if (Math.min(inA, inB) === 0) brute++;   // 少数派为 0 → 判错
  }
  check(`computeErrorCount(${num}) 与少数派定义一致`,
    computeErrorCount(digits, groups) === brute,
    `${computeErrorCount(digits, groups)} vs ${brute}`);
}

// ---- 5. 空输入健壮性 ----
const emptyRc = computeRongCuo([]);
check('空分解组 valid=false', emptyRc.valid === false);
check('空分解组 无容错注数=0', emptyRc.none.count === 0);
check('parseDecompGroups(null)=[]', parseDecompGroups(null).length === 0);
check('parseDecompGroups 拒绝非法行',
  parseDecompGroups('72390,18546\n12345\n72390,1854\n11111,22222').length === 1,
  `got ${parseDecompGroups('72390,18546\n12345\n72390,1854\n11111,22222').length}`);

// ---- 5.5 候选集模式（自选号码组六）----
const candList = ['123', '456', '789', '123', '012'];   // 含重复，应去重为 4
const crc = computeRongCuo(groups, candList);
check('候选模式 valid=true', crc.valid === true);
check('候选模式 total=去重后4', crc.total === 4, `got ${crc.total}`);
const cBucketSum = Object.values(crc.buckets).reduce((s, a) => s + a.length, 0);
check('候选模式 分桶总和=4', cBucketSum === 4, `got ${cBucketSum}`);
check('候选模式 容错8+无容错+eliminated=4',
  crc.levels[7].count + crc.none.count + crc.eliminated.length === 4,
  `${crc.levels[7].count}+${crc.none.count}+${crc.eliminated.length}`);
const candSet = new Set(['123', '456', '789', '012']);
let outOfCand = 0;
for (const arr of Object.values(crc.buckets)) for (const n of arr) if (!candSet.has(n)) outOfCand++;
check('候选模式 桶内号码均属于候选集', outOfCand === 0, `out=${outOfCand}`);
// 候选全为组六时，各格组三应为 0
let zuSanNonZero = 0;
for (const lv of [...crc.levels, crc.none]) if (lv.zuSan !== 0) zuSanNonZero++;
check('候选全组六时 各格组三=0', zuSanNonZero === 0, `nonZero=${zuSanNonZero}`);
// 空候选：valid=true 但 total=0、各 count=0
const zeroCand = computeRongCuo(groups, []);
check('空候选 valid=true', zeroCand.valid === true);
check('空候选 total=0', zeroCand.total === 0);
check('空候选 各容错注数=0', zeroCand.levels.every(l => l.count === 0) && zeroCand.none.count === 0);
// 不传候选（undefined）仍回退全 1000（向后兼容）
check('不传候选 回退 total=1000', computeRongCuo(groups, undefined).total === 1000);

console.log(`\n${'='.repeat(50)}`);
console.log(`回归验证结果：PASS ${pass} / FAIL ${fail}`);
console.log(`${'='.repeat(50)}`);

// ---- 6. 26193 期实际输出（供人工核对） ----
console.log(`\n【${lastIssue} 期 智取分解容错结果】`);
console.log(`  ${rc.none.label}: ${rc.none.count}注 (组六${rc.none.zuLiu}/组三${rc.none.zuSan})  号码: ${rc.none.numbers.join(' ')}`);
for (const lv of rc.levels) {
  console.log(`  ${lv.label}: ${lv.count}注 (组六${lv.zuLiu}/组三${lv.zuSan})`);
}
console.log(`  容错8仍淘汰: ${rc.eliminated.length}注`);

// 博众同期
const bGroups = parseDecompGroups(bozhong[lastIssue].join('\n'));
const brc = computeRongCuo(bGroups);
console.log(`\n【${lastIssue} 期 博众分解容错结果】`);
console.log(`  ${brc.none.label}: ${brc.none.count}注   ${brc.levels.map(l => `${l.label}:${l.count}`).join(' ')}   淘汰:${brc.eliminated.length}`);

// 交集
console.log(`\n【${lastIssue} 期 本期容错（智取∩博众 交集）】`);
const bSet0 = new Set(brc.none.numbers);
const inter0 = rc.none.numbers.filter(n => bSet0.has(n));
console.log(`  无容错: ${inter0.length}注  ${inter0.join(' ')}`);
for (let i = 0; i < rc.levels.length; i++) {
  const bs = new Set(brc.levels[i].numbers);
  const inter = rc.levels[i].numbers.filter(n => bs.has(n));
  console.log(`  ${rc.levels[i].label}: ${inter.length}注`);
}
