import { useMemo } from 'react'

function NumberAnalysis({ data }) {
  const stats = useMemo(() => {
    const total = data.length
    const avgSum = (data.reduce((s, d) => s + d.sum, 0) / total).toFixed(1)
    const avgSpan = (data.reduce((s, d) => s + d.span, 0) / total).toFixed(1)
    
    // 单双组合统计
    const oddEvenCombo = {}
    const bigSmallCombo = {}
    const path012Combo = {}
    
    data.forEach(d => {
      oddEvenCombo[d.oddEvenCombo] = (oddEvenCombo[d.oddEvenCombo] || 0) + 1
      bigSmallCombo[d.bigSmallCombo] = (bigSmallCombo[d.bigSmallCombo] || 0) + 1
      path012Combo[d.path012Combo] = (path012Combo[d.path012Combo] || 0) + 1
    })
    
    // 最近10期趋势
    const recent10 = data.slice(-10)
    const recentSumTrend = recent10.map(d => d.sum)
    const recentSpanTrend = recent10.map(d => d.span)
    
    return { total, avgSum, avgSpan, oddEvenCombo, bigSmallCombo, path012Combo, recent10, recentSumTrend, recentSpanTrend }
  }, [data])

  return (
    <div>
      {/* 概览统计 */}
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">总期数</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.avgSum}</div>
          <div className="stat-label">平均和值</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.avgSpan}</div>
          <div className="stat-label">平均跨度</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{stats.recent10[stats.recent10.length - 1]?.sum || '-'}</div>
          <div className="stat-label">最新一期和值</div>
        </div>
      </div>

      {/* 单双组合 */}
      <div className="card">
        <div className="card-title">单双组合分布</div>
        <div className="stats-grid">
          {Object.entries(stats.oddEvenCombo)
            .sort((a, b) => b[1] - a[1])
            .map(([combo, count]) => (
              <div key={combo} className="stat-item">
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  {combo.split('').map((c, i) => (
                    <span key={i} className={`tag ${c === '单' ? 'tag-odd' : 'tag-even'}`}>{c}</span>
                  ))}
                </div>
                <div className="stat-label">{count}次 ({(count / stats.total * 100).toFixed(1)}%)</div>
              </div>
            ))}
        </div>
      </div>

      {/* 大小组合 */}
      <div className="card">
        <div className="card-title">大小组合分布</div>
        <div className="stats-grid">
          {Object.entries(stats.bigSmallCombo)
            .sort((a, b) => b[1] - a[1])
            .map(([combo, count]) => (
              <div key={combo} className="stat-item">
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  {combo.split('').map((c, i) => (
                    <span key={i} className={`tag ${c === '大' ? 'tag-big' : 'tag-small'}`}>{c}</span>
                  ))}
                </div>
                <div className="stat-label">{count}次 ({(count / stats.total * 100).toFixed(1)}%)</div>
              </div>
            ))}
        </div>
      </div>

      {/* 012路组合 */}
      <div className="card">
        <div className="card-title">012路组合分布</div>
        <div className="stats-grid">
          {Object.entries(stats.path012Combo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(([combo, count]) => (
              <div key={combo} className="stat-item">
                <div className="stat-value" style={{ fontSize: '20px' }}>
                  {combo.split('').map((c, i) => (
                    <span key={i} className={`path-badge path-${c}`}>{c}</span>
                  ))}
                </div>
                <div className="stat-label">{count}次 ({(count / stats.total * 100).toFixed(1)}%)</div>
              </div>
            ))}
        </div>
      </div>

      {/* 最近10期走势 */}
      <div className="card">
        <div className="card-title">最近10期和值/跨度走势</div>
        <div className="table-container" style={{ maxHeight: '300px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                {stats.recent10.map(d => <th key={d.issue}>{d.issue.slice(-2)}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>和值</td>
                {stats.recentSumTrend.map((v, i) => <td key={i} style={{ fontWeight: 700, color: '#e74c3c' }}>{v}</td>)}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>跨度</td>
                {stats.recentSpanTrend.map((v, i) => <td key={i} style={{ fontWeight: 700, color: '#3498db' }}>{v}</td>)}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>号码</td>
                {stats.recent10.map((d, i) => (
                  <td key={i} style={{ fontWeight: 700 }}>
                    <span style={{ color: '#e74c3c' }}>{d.d1}</span>
                    <span style={{ color: '#3498db' }}>{d.d2}</span>
                    <span style={{ color: '#2ecc71' }}>{d.d3}</span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default NumberAnalysis
