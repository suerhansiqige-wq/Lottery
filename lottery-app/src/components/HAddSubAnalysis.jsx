import { useMemo } from 'react'
import { getHAddSubRecovery } from '../data/lotteryData.js'

function HAddSubAnalysis({ data }) {
  const recovery = useMemo(() => getHAddSubRecovery(data), [data])
  const recent = data.slice(-20).reverse()

  return (
    <div>
      {/* 横相减走势 */}
      <div className="card">
        <div className="card-title">横相减走势（相邻两位差）</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>号码</th>
                <th>|百-十|</th>
                <th>|十-个|</th>
                <th>和</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(item => (
                <tr key={item.issue}>
                  <td className="issue">{item.issue}</td>
                  <td>
                    <span className="number red">{item.d1}</span>
                    <span className="number blue">{item.d2}</span>
                    <span className="number green">{item.d3}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#e74c3c' }}>{item.hSub[0]}</td>
                  <td style={{ fontWeight: 700, color: '#3498db' }}>{item.hSub[1]}</td>
                  <td style={{ color: '#a0a0a0' }}>{item.hSub[0] + item.hSub[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 横相加走势 */}
      <div className="card">
        <div className="card-title">横相加走势（相邻两位和）</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>号码</th>
                <th>百+十</th>
                <th>十+个</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(item => (
                <tr key={item.issue}>
                  <td className="issue">{item.issue}</td>
                  <td>
                    <span className="number red">{item.d1}</span>
                    <span className="number blue">{item.d2}</span>
                    <span className="number green">{item.d3}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#e74c3c' }}>{item.hAdd[0]}</td>
                  <td style={{ fontWeight: 700, color: '#3498db' }}>{item.hAdd[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 横加减回补 */}
      <div className="card">
        <div className="card-title">横相加回补遗漏 (结果值0-18)</div>
        <div className="missing-grid" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
          {Array.from({ length: 19 }, (_, v) => (
            <div key={v} className={`missing-cell ${recovery.hAddMissing[v] >= 10 ? 'hot' : recovery.hAddMissing[v] <= 1 ? 'cold' : ''}`}>
              <div className="digit">{v}</div>
              <div className="miss-count">遗漏 {recovery.hAddMissing[v]} 期</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">横相减回补遗漏 (结果值0-9)</div>
        <div className="missing-grid">
          {Array.from({ length: 10 }, (_, v) => (
            <div key={v} className={`missing-cell ${recovery.hSubMissing[v] >= 10 ? 'hot' : recovery.hSubMissing[v] <= 1 ? 'cold' : ''}`}>
              <div className="digit">{v}</div>
              <div className="miss-count">遗漏 {recovery.hSubMissing[v]} 期</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default HAddSubAnalysis
