import { useMemo } from 'react'
import { getRecentGeneratedNums } from '../data/lotteryData.js'

function GeneratedNums({ data }) {
  const recent = data.slice(-15).reverse()
  
  const genNums5 = useMemo(() => getRecentGeneratedNums(data, 5), [data])
  const genNums10 = useMemo(() => getRecentGeneratedNums(data, 10), [data])

  // 统计近N期每个数字出现次数
  const freqStats = useMemo(() => {
    const calc = (count) => {
      const recentData = data.slice(-count)
      const freq = Array(10).fill(0)
      recentData.forEach(item => {
        freq[item.d1]++
        freq[item.d2]++
        freq[item.d3]++
      })
      return freq
    }
    return { freq5: calc(5), freq10: calc(10), freq20: calc(20) }
  }, [data])

  return (
    <div>
      {/* 概览 */}
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value" style={{ fontSize: '20px', color: '#f39c12' }}>
            {genNums5.join(' ')}
          </div>
          <div className="stat-label">近5期生号</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ fontSize: '16px', color: '#e94560' }}>
            {data[data.length - 1]?.mustOutNums?.join(' ') || '-'}
          </div>
          <div className="stat-label">最新必出号</div>
        </div>
        <div className="stat-item">
          <div className="stat-value" style={{ fontSize: '20px', color: '#2ecc71' }}>
            {data[data.length - 1]?.hasConsecutive ? '有' : '无'}
          </div>
          <div className="stat-label">最新期连号</div>
        </div>
      </div>

      {/* 生号走势 */}
      <div className="card">
        <div className="card-title">生号走势（每期出现的号码）</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>百</th>
                <th>十</th>
                <th>个</th>
                <th>生号</th>
                <th>生号个数</th>
                <th>连号</th>
                <th>必出号</th>
                <th>必出号个数</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(item => (
                <tr key={item.issue}>
                  <td className="issue">{item.issue}</td>
                  <td className="number red">{item.d1}</td>
                  <td className="number blue">{item.d2}</td>
                  <td className="number green">{item.d3}</td>
                  <td style={{ color: '#f39c12', fontWeight: 700, fontSize: 15 }}>
                    {item.uniqueDigits.join(' ')}
                  </td>
                  <td style={{ fontWeight: 700 }}>{item.uniqueDigits.length}</td>
                  <td style={{ color: item.hasConsecutive ? '#e74c3c' : '#666' }}>
                    {item.hasConsecutive ? item.consecutiveNums.map(c => c.join('-')).join(', ') : '-'}
                  </td>
                  <td style={{ color: '#2ecc71', fontWeight: 600 }}>
                    {item.mustOutNums.length > 0 ? item.mustOutNums.join(' ') : '-'}
                  </td>
                  <td>{item.mustOutNums.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 号码频率统计 */}
      <div className="card">
        <div className="card-title">号码出现频率统计</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>号码</th>
                <th>近5期</th>
                <th>近5期占比</th>
                <th>近10期</th>
                <th>近10期占比</th>
                <th>近20期</th>
                <th>近20期占比</th>
                <th>热度</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 10 }, (_, digit) => {
                const total20 = freqStats.freq20[digit]
                return (
                  <tr key={digit}>
                    <td style={{ fontWeight: 700, color: '#f39c12', fontSize: 16 }}>{digit}</td>
                    <td>{freqStats.freq5[digit]}</td>
                    <td>{(freqStats.freq5[digit] / 15 * 100).toFixed(0)}%</td>
                    <td>{freqStats.freq10[digit]}</td>
                    <td>{(freqStats.freq10[digit] / 30 * 100).toFixed(0)}%</td>
                    <td>{total20}</td>
                    <td>{(total20 / 60 * 100).toFixed(0)}%</td>
                    <td>
                      <div style={{
                        width: `${Math.min(total20 * 8, 100)}%`,
                        height: 16,
                        background: `linear-gradient(90deg, ${total20 > 10 ? '#e74c3c' : total20 > 5 ? '#f39c12' : '#3498db'}, transparent)`,
                        borderRadius: 4,
                        minWidth: total20 > 0 ? 8 : 0
                      }} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 连号统计 */}
      <div className="card">
        <div className="card-title">连号出现记录</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>开奖号码</th>
                <th>连号组合</th>
                <th>连号类型</th>
              </tr>
            </thead>
            <tbody>
              {data.filter(d => d.hasConsecutive).slice(-15).reverse().map(item => (
                <tr key={item.issue}>
                  <td className="issue">{item.issue}</td>
                  <td>
                    <span className="number red">{item.d1}</span>
                    <span className="number blue">{item.d2}</span>
                    <span className="number green">{item.d3}</span>
                  </td>
                  <td style={{ color: '#e74c3c', fontWeight: 700 }}>
                    {item.consecutiveNums.map(c => c.join('-')).join(', ')}
                  </td>
                  <td>
                    {item.consecutiveNums.length === 1 ? '二连号' : 
                     item.consecutiveNums.length === 2 ? '三连号' : '多连号'}
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

export default GeneratedNums
