#!/usr/bin/env node
// 组选过滤：把号码池（或一串直选号码）转成组选下法，去重、过滤、算注数成本，并可拿全历史回测。
//
// 用法：
//   node zuxuan_filter.mjs --pool 01234567            从数字池穷举组选
//   node zuxuan_filter.mjs --numbers "012 345 112 555" 把已有直选号码转成组选（自动去重）
//   过滤项：--kill 4,5   --sum-min 9  --sum-max 18  --span-min 3  --span-max 7  --no-zusan  --no-baozi
//   回测项：--backtest fc3d   或   --backtest pl3
//   导出项：--out tickets.txt
//
// 下法规则：组六 1 注盖 6 个直选排列，组三 1 注盖 3 个排列，豹子没有组选下法、必须单独买直选。
// 奖金：直选 1040，组三 346，组六 173；单注 2 元。

const AWARD = { zhixuan: 1040, zusan: 346, zuli: 173 }
const PRICE = 2

function parseArgs(argv) {
  const o = { pool: '0123456789', kill: '', numbers: '', sumMin: 0, sumMax: 27, spanMin: 0, spanMax: 9, zuli: true, zusan: true, baozi: true, backtest: '', out: '' }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    const next = () => argv[++i]
    if (k === '--pool') o.pool = next()
    else if (k === '--kill') o.kill = next()
    else if (k === '--numbers') o.numbers = next()
    else if (k === '--sum-min') o.sumMin = Number(next())
    else if (k === '--sum-max') o.sumMax = Number(next())
    else if (k === '--span-min') o.spanMin = Number(next())
    else if (k === '--span-max') o.spanMax = Number(next())
    else if (k === '--no-zusan') o.zusan = false
    else if (k === '--no-zuli') o.zuli = false
    else if (k === '--no-baozi') o.baozi = false
    else if (k === '--backtest') o.backtest = next()
    else if (k === '--out') o.out = next()
    else if (!k.startsWith('--')) o.numbers = (o.numbers + ' ' + k).trim()
  }
  return o
}

// 三位数字 -> 组别 + 组选票面（升序）
function classify(digits) {
  const s = [...digits].sort((a, b) => a - b)
  const uniq = new Set(s).size
  const type = uniq === 1 ? 'baozi' : uniq === 2 ? 'zusan' : 'zuli'
  return { type, key: s.join(''), asc: s }
}

function passFilter(asc) {
  const sum = asc[0] + asc[1] + asc[2]
  const span = asc[2] - asc[0]
  return sum >= opts.sumMin && sum <= opts.sumMax && span >= opts.spanMin && span <= opts.spanMax
}

function digitsFrom(str) {
  return [...new Set(String(str).replace(/[^0-9]/g, ''))].map(Number).sort((a, b) => a - b)
}

const opts = parseArgs(process.argv.slice(2))
const K = digitsFrom(opts.pool).filter(d => !digitsFrom(opts.kill).includes(d))
const kset = new Set(K)

// 生成票面：来源要么是数字池穷举，要么是给定号码列表转组选
const tickets = new Map()
if (opts.numbers) {
  const tokens = opts.numbers.split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t))
  for (const t of tokens) {
    const d = [Number(t[0]), Number(t[1]), Number(t[2])]
    const c = classify(d)
    if (!d.every(x => kset.has(x))) continue
    if (!passFilter(c.asc)) continue
    if (c.type === 'zuli' && !opts.zuli) continue
    if (c.type === 'zusan' && !opts.zusan) continue
    if (c.type === 'baozi' && !opts.baozi) continue
    tickets.set(c.key, c)
  }
} else {
  for (let i = 0; i < K.length; i++) {
    if (opts.zuli) for (let j = i + 1; j < K.length; j++) for (let m = j + 1; m < K.length; m++) {
      const asc = [K[i], K[j], K[m]]
      if (passFilter(asc)) { const c = { type: 'zuli', key: asc.join(''), asc }; tickets.set(c.key, c) }
    }
    if (opts.zusan) for (let j = 0; j < K.length; j++) {
      if (j === i) continue
      const asc = [K[i], K[i], K[j]].sort((a, b) => a - b)
      if (passFilter(asc)) { const c = { type: 'zusan', key: asc.join(''), asc }; tickets.set(c.key, c) }
    }
    if (opts.baozi) {
      const asc = [K[i], K[i], K[i]]
      if (passFilter(asc)) { const c = { type: 'baozi', key: asc.join(''), asc }; tickets.set(c.key, c) }
    }
  }
}

const list = [...tickets.values()].sort((a, b) => Number(a.key) - Number(b.key))
const by = { zuli: [], zusan: [], baozi: [] }
list.forEach(t => by[t.type].push(t))

// 覆盖的直选排列数 = 组六注数×6 + 组三注数×3 + 豹子注数×1
const covered = by.zuli.length * 6 + by.zusan.length * 3 + by.baozi.length
const total = list.length
const cost = total * PRICE
const evPrize = (by.zuli.length * 6 * AWARD.zuli + by.zusan.length * 3 * AWARD.zusan + by.baozi.length * AWARD.zhixuan) / 1000
const direct1000 = 1000 * PRICE

console.log(`\n数字池 ${K.join('') || '（空）'}（${K.length} 个数字）` + (opts.numbers ? `，来源：手输 ${opts.numbers.trim()}（转组选去重）` : '，穷举组选'))
console.log(`过滤：和值 ${opts.sumMin}~${opts.sumMax}，跨度 ${opts.spanMin}~${opts.spanMax}，组六${opts.zuli ? '开' : '关'}，组三${opts.zusan ? '开' : '关'}，豹子${opts.baozi ? '开' : '关'}`)
console.log(`\n组六 ${by.zuli.length} 注（每注盖 6 个直选排列，奖金 ${AWARD.zuli} 元）`)
console.log(by.zuli.map(t => t.key).join(' ') || '（无）')
console.log(`\n组三 ${by.zusan.length} 注（每注盖 3 个直选排列，奖金 ${AWARD.zusan} 元）`)
console.log(by.zusan.map(t => t.key).join(' ') || '（无）')
console.log(`\n豹子 ${by.baozi.length} 注（只能直选买，奖金 ${AWARD.zhixuan} 元）`)
console.log(by.baozi.map(t => t.key).join(' ') || '（无）')
console.log(`\n合计 ${total} 注，单期成本 ${cost} 元；盖住 ${covered} 个直选排列，理论命中率 ${(covered / 10).toFixed(2)}%`)
if (covered) {
  const directSame = covered * PRICE
  console.log(`同样覆盖面若用直选买需 ${covered} 注 ${directSame} 元 —— 组选省 ${directSame - cost} 元，即 ${((1 - cost / directSame) * 100).toFixed(1)}%`)
  console.log(`每期期望奖金 ${evPrize.toFixed(2)} 元，期望净亏 ${(cost - evPrize).toFixed(2)} 元，回收率 ${(evPrize / cost * 100).toFixed(2)}%`)
  console.log(`每 1% 命中率折 ${(cost / (covered / 10)).toFixed(2)} 元（直选口径恒为 20 元/1%，单价 ${(cost / covered).toFixed(2)} 元/个排列 对 直选 2 元）`)
}
console.log(`对照全买 1000 注直选：成本 ${direct1000} 元，命中率 100%，每期固定亏 ${direct1000 - 1040} 元`)

if (opts.out) {
  const fs = await import('node:fs')
  fs.writeFileSync(opts.out, list.map(t => t.key).join(' '), 'utf8')
  console.log(`已导出 ${total} 注到 ${opts.out}`)
}

if (opts.backtest) {
  const which = opts.backtest.toLowerCase()
  let rows
  if (which === 'pl3' || which === '排列三') {
    const m = await import('./pl3-app/src/data/lotteryData.js')
    rows = m.enrichData(m.lotteryData)
  } else {
    const fc = await import('./lottery-app/src/data/enrichDataOptimized.js')
    const d = await import('./lottery-app/src/data/lotteryData.js')
    rows = fc.enrichData(d.lotteryData)
  }
  const data = rows.map(r => r.digits || String(r.numbers || r.value).split('').map(Number))
  const keyOf = d => [...d].sort((a, b) => a - b).join('')
  const bought = new Map(list.map(t => [t.key, t]))
  let hit = 0, prize = 0, n = 0
  const cntType = { zuli: 0, zusan: 0, baozi: 0 }
  for (const d of data) {
    n++
    const t = bought.get(keyOf(d))
    if (t) { hit++; cntType[t.type]++; prize += t.type === 'baozi' ? AWARD.zhixuan : t.type === 'zusan' ? AWARD.zusan : AWARD.zuli }
  }
  const actual = hit / n * 100
  const theory = covered / 10
  const sd = Math.sqrt(theory / 100 * (1 - theory / 100) / n) * 100
  const costAll = n * cost
  console.log(`\n全历史回测 ${which || 'fc3d'} 共 ${n} 期，每期都买这 ${total} 注：`)
  console.log(`  命中 ${hit} 期，实测 ${(actual).toFixed(2)}%，理论 ${theory.toFixed(2)}%，差 ${(actual - theory).toFixed(2)} 个点（${((actual - theory) / sd).toFixed(2)} 个标准差）`)
  console.log(`  中奖构成：组六 ${cntType.zuli} 期，组三 ${cntType.zusan} 期，豹子 ${cntType.baozi} 期`)
  console.log(`  总成本 ${costAll} 元，总奖金 ${prize} 元，净 ${(prize - costAll)} 元，实测回收率 ${(prize / costAll * 100).toFixed(2)}%`)
  console.log(`  单期：成本 ${cost} 元，期望奖金 ${evPrize.toFixed(2)} 元，期望净亏 ${(cost - evPrize).toFixed(2)} 元`)
}
