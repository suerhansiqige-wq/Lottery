import { useMemo } from 'react'
import { getMissingNumbers } from '../data/lotteryData.js'

function MissingAnalysis({ data }) {
  const missing = useMemo(() => getMissingNumbers(data, data.length), [data])
  const recentData = data.slice(-15).reverse()

  return (
    <div>
      {/* 各位遗漏 */}
      <div className="card">
        <div className="card-title">百位遗漏分析</div>
        <div className="missing-grid">
          {Array.from({ length: 10 }, (_, digit) => (
            <div key={digit} className={`missing-cell ${missing.d1[digit] >= 10 ? 'hot' : missing.d1[digit] <= 1 ? 'cold' : ''}`}>
              <div className="digit">{digit}</div>
              <div className="miss-count">遗漏 {missing.d1[digit]} 期</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">十位遗漏分析</div>
        <div className="missing-grid">
          {Array.from({ length: 10 }, (_, digit) => (
            <div key={digit} className={`missing-cell ${missing.d2[digit] >= 10 ? 'hot' : missing.d2[digit] <= 1 ? 'cold' : ''}`}>
              <div className="digit">{digit}</div>
              <div className="miss-count">遗漏 {missing.d2[digit]} 期</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">个位遗漏分析</div>
        <div className="missing-grid">
          {Array.from({ length: 10 }, (_, digit) => (
            <div key={digit} className={`missing-cell ${missing.d3[digit] >= 10 ? 'hot' : missing.d3[digit] <= 1 ? 'cold' : ''}`}>
              <div className="digit">{digit}</div>
              <div className="miss-count">遗漏 {missing.d3[digit]} 期</div>
            </div>
          ))}
        </div>
      </div>

      {/* 综合遗漏 */}
      <div className="card">
        <div className="card-title">综合遗漏 (三位置最大遗漏)</div>
        <div className="missing-grid">
          {Array.from({ length: 10 }, (_, digit) => {
            const maxMiss = Math.max(missing.d1[digit], missing.d2[digit], missing.d3[digit])
            return (
              <div key={digit} className={`missing-cell ${maxMiss >= 15 ? 'hot' : maxMiss <= 2 ? 'cold' : ''}`}>
                <div className="digit">{digit}</div>
                <div className="miss-count">最大遗漏 {maxMiss} 期</div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#a0a0a0' }}>
          <span style={{ color: '#e74c3c' }}>■</span> 红色 = 高遗漏(≥10期) 即将回补
          <span style={{ marginLeft: '16px', color: '#3498db' }}>■</span> 蓝色 = 刚出现(≤1期)
        </div>
      </div>

      {/* 最近走势 */}
      <div className="card">
        <div className="card-title">最近15期号码走势</div>
        <div className="table-container" style={{ maxHeight: '400px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>百位</th>
                <th>十位</th>
                <th>个位</th>
                <th>和值</th>
                <th>跨度</th>
                <th>生号</th>
                <th>连号</th>
              </tr>
            </thead>
            <tbody>
              {recentData.map(item => (
                <tr key={item.issue}>
                  <td className="issue">{item.issue}</td>
                  <td className="number red">{item.d1}</td>
                  <td className="number blue">{item.d2}</td>
                  <td className="number green">{item.d3}</td>
                  <td style={{ fontWeight: 700 }}>{item.sum}</td>
                  <td style={{ fontWeight: 700 }}>{item.span}</td>
                  <td style={{ color: '#f39c12' }}>{item.uniqueDigits.join(' ')}</td>
                  <td style={{ color: item.hasConsecutive ? '#e74c3c' : '#666' }}>
                    {item.hasConsecutive ? item.consecutiveNums.map(c => c.join('-')).join(',') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default MissingAnalysis
