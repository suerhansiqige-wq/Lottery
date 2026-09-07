import { useMemo } from 'react'
import { getFrequencyStats } from '../data/lotteryData.js'

function FrequencyChart({ data }) {
  const stats = useMemo(() => getFrequencyStats(data), [data])
  const maxCount = Math.max(
    ...Object.values(stats.d1),
    ...Object.values(stats.d2),
    ...Object.values(stats.d3)
  )

  return (
    <div>
      {/* 数字频率柱状图 */}
      <div className="card">
        <div className="card-title">各位置号码出现频率 (0-9)</div>
        <div className="freq-bar-container">
          {Array.from({ length: 10 }, (_, digit) => (
            <div key={digit} style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#a0a0a0', marginBottom: '4px' }}>
                数字 {digit}
              </div>
              <div className="freq-row">
                <span className="freq-label" style={{ fontSize: '11px', color: '#e74c3c' }}>百</span>
                <div className="freq-bar-bg">
                  <div
                    className="freq-bar d1"
                    style={{ width: `${(stats.d1[digit] / maxCount) * 100}%` }}
                  >
                    {stats.d1[digit] > 0 && stats.d1[digit]}
                  </div>
                </div>
                <span className="freq-count">{stats.d1[digit]}</span>
              </div>
              <div className="freq-row" style={{ marginTop: '4px' }}>
                <span className="freq-label" style={{ fontSize: '11px', color: '#3498db' }}>十</span>
                <div className="freq-bar-bg">
                  <div
                    className="freq-bar d2"
                    style={{ width: `${(stats.d2[digit] / maxCount) * 100}%` }}
                  >
                    {stats.d2[digit] > 0 && stats.d2[digit]}
                  </div>
                </div>
                <span className="freq-count">{stats.d2[digit]}</span>
              </div>
              <div className="freq-row" style={{ marginTop: '4px' }}>
                <span className="freq-label" style={{ fontSize: '11px', color: '#2ecc71' }}>个</span>
                <div className="freq-bar-bg">
                  <div
                    className="freq-bar d3"
                    style={{ width: `${(stats.d3[digit] / maxCount) * 100}%` }}
                  >
                    {stats.d3[digit] > 0 && stats.d3[digit]}
                  </div>
                </div>
                <span className="freq-count">{stats.d3[digit]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 频率排名 */}
      <div className="card">
        <div className="card-title">号码热度排名</div>
        <div className="stats-grid">
          {(() => {
            // 统计所有位置每个数字的总出现次数
            const totalFreq = {}
            for (let d = 0; d <= 9; d++) {
              totalFreq[d] = stats.d1[d] + stats.d2[d] + stats.d3[d]
            }
            const sorted = Object.entries(totalFreq).sort((a, b) => b[1] - a[1])
            return sorted.map(([digit, count], idx) => (
              <div key={digit} className="stat-item" style={{
                border: idx < 3 ? '1px solid #e94560' : '1px solid transparent',
                background: idx < 3 ? 'rgba(233, 69, 96, 0.1)' : 'var(--bg-table)'
              }}>
                <div className="stat-value">{digit}</div>
                <div className="stat-label">
                  {idx < 3 ? '🔥 ' : ''}出现 {count} 次
                  {idx >= 3 ? ' ❄️' : ''}
                </div>
              </div>
            ))
          })()}
        </div>
      </div>

      {/* 频率表格 */}
      <div className="card">
        <div className="card-title">频率明细表</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>号码</th>
                <th>百位次数</th>
                <th>百位占比</th>
                <th>十位次数</th>
                <th>十位占比</th>
                <th>个位次数</th>
                <th>个位占比</th>
                <th>总次数</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, digit) => {
                const total = stats.d1[digit] + stats.d2[digit] + stats.d3[digit]
                const totalAll = data.length * 3
                return (
                  <tr key={digit}>
                    <td style={{ fontWeight: 700, color: '#f39c12' }}>{digit}</td>
                    <td>{stats.d1[digit]}</td>
                    <td>{(stats.d1[digit] / data.length * 100).toFixed(1)}%</td>
                    <td>{stats.d2[digit]}</td>
                    <td>{(stats.d2[digit] / data.length * 100).toFixed(1)}%</td>
                    <td>{stats.d3[digit]}</td>
                    <td>{(stats.d3[digit] / data.length * 100).toFixed(1)}%</td>
                    <td style={{ fontWeight: 700 }}>{total} ({(total / totalAll * 100).toFixed(1)}%)</td>
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

export default FrequencyChart
