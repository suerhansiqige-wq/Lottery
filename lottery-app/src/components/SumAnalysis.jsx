import { useMemo } from 'react'
import { getSumDistribution } from '../data/lotteryData.js'

function SumAnalysis({ data }) {
  const sumDist = useMemo(() => getSumDistribution(data), [data])
  
  const sumData = useMemo(() => {
    const arr = []
    for (let i = 0; i <= 27; i++) {
      arr.push({ sum: i, count: sumDist[i] || 0 })
    }
    return arr
  }, [sumDist])

  const maxSumCount = Math.max(...sumData.map(d => d.count))

  // 和值区间统计
  const sumRanges = useMemo(() => {
    const ranges = [
      { label: '0-6 (小)', min: 0, max: 6 },
      { label: '7-12 (中)', min: 7, max: 12 },
      { label: '13-20 (中)', min: 13, max: 20 },
      { label: '21-27 (大)', min: 21, max: 27 },
    ]
    return ranges.map(r => {
      const count = data.filter(d => d.sum >= r.min && d.sum <= r.max).length
      return { ...r, count, pct: (count / data.length * 100).toFixed(1) }
    })
  }, [data])

  // 跨度分布
  const spanDist = useMemo(() => {
    const dist = {}
    data.forEach(d => {
      dist[d.span] = (dist[d.span] || 0) + 1
    })
    const arr = []
    for (let i = 0; i <= 9; i++) {
      arr.push({ span: i, count: dist[i] || 0 })
    }
    return arr
  }, [data])

  const maxSpanCount = Math.max(...spanDist.map(d => d.count))

  return (
    <div>
      {/* 和值区间统计 */}
      <div className="stats-grid">
        {sumRanges.map((r, i) => (
          <div key={i} className="stat-item">
            <div className="stat-value" style={{ fontSize: '18px' }}>{r.count}</div>
            <div className="stat-label">{r.label}</div>
            <div style={{ fontSize: '12px', color: '#a0a0a0', marginTop: '4px' }}>{r.pct}%</div>
          </div>
        ))}
      </div>

      {/* 和值分布图 */}
      <div className="card">
        <div className="card-title">和值分布图 (0-27)</div>
        <div className="sum-dist">
          {sumData.map(item => (
            <div key={item.sum} className="sum-bar-wrapper">
              <div className="sum-bar-value">{item.count || ''}</div>
              <div
                className="sum-bar"
                style={{
                  height: `${maxSumCount > 0 ? (item.count / maxSumCount) * 100 : 0}%`,
                  minHeight: item.count > 0 ? '4px' : '0px'
                }}
              />
              <div className="sum-bar-label">{item.sum}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 跨度分布 */}
      <div className="card">
        <div className="card-title">跨度分布图 (0-9)</div>
        <div className="sum-dist">
          {spanDist.map(item => (
            <div key={item.span} className="sum-bar-wrapper">
              <div className="sum-bar-value">{item.count || ''}</div>
              <div
                className="sum-bar"
                style={{
                  height: `${maxSpanCount > 0 ? (item.count / maxSpanCount) * 100 : 0}%`,
                  minHeight: item.count > 0 ? '4px' : '0px',
                  background: 'linear-gradient(180deg, #3498db, #74b9ff)'
                }}
              />
              <div className="sum-bar-label">{item.span}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 和值详细表格 */}
      <div className="card">
        <div className="card-title">和值出现明细</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>和值</th>
                <th>出现次数</th>
                <th>出现概率</th>
                <th>理论概率</th>
                <th>偏差</th>
              </tr>
            </thead>
            <tbody>
              {sumData.filter(d => d.count > 0).map(item => {
                // 理论概率（简化计算）
                const totalCombos = 1000 // 0-9 each position
                let theoreticalCount = 0
                for (let a = 0; a <= 9; a++) {
                  for (let b = 0; b <= 9; b++) {
                    const c = item.sum - a - b
                    if (c >= 0 && c <= 9) theoreticalCount++
                  }
                }
                const theoreticalPct = (theoreticalCount / totalCombos * 100).toFixed(1)
                const actualPct = (item.count / data.length * 100).toFixed(1)
                const deviation = (actualPct - theoreticalPct).toFixed(1)
                return (
                  <tr key={item.sum}>
                    <td style={{ fontWeight: 700, color: '#f39c12' }}>{item.sum}</td>
                    <td>{item.count}</td>
                    <td>{actualPct}%</td>
                    <td>{theoreticalPct}%</td>
                    <td style={{ color: deviation > 0 ? '#e74c3c' : '#2ecc71' }}>
                      {deviation > 0 ? '+' : ''}{deviation}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default SumAnalysis
