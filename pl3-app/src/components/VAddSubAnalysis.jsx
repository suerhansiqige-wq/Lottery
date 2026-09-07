import { useMemo } from 'react'
import { getVAddSubRecovery } from '../data/lotteryData.js'

function VAddSubAnalysis({ data }) {
  const recovery = useMemo(() => getVAddSubRecovery(data), [data])
  const recent = data.slice(-20).reverse()

  return (
    <div>
      {/* 竖相减走势 */}
      <div className="card">
        <div className="card-title">竖相减走势（与上期同位差）</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>本期</th>
                <th>上期</th>
                <th>|百差|</th>
                <th>|十差|</th>
                <th>|个差|</th>
                <th>差和</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item, idx) => {
                const prevIdx = data.indexOf(item) - 1
                const prev = prevIdx >= 0 ? data[prevIdx] : null
                return (
                  <tr key={item.issue}>
                    <td className="issue">{item.issue}</td>
                    <td>
                      <span className="number red">{item.d1}</span>
                      <span className="number blue">{item.d2}</span>
                      <span className="number green">{item.d3}</span>
                    </td>
                    <td style={{ color: '#a0a0a0' }}>
                      {prev ? `${prev.d1} ${prev.d2} ${prev.d3}` : '-'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#e74c3c' }}>
                      {item.vSub[0] !== null ? item.vSub[0] : '-'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#3498db' }}>
                      {item.vSub[1] !== null ? item.vSub[1] : '-'}
                    </td>
                    <td style={{ fontWeight: 700, color: '#2ecc71' }}>
                      {item.vSub[2] !== null ? item.vSub[2] : '-'}
                    </td>
                    <td style={{ color: '#f39c12' }}>
                      {item.vSub[0] !== null ? item.vSub[0] + item.vSub[1] + item.vSub[2] : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 竖相加走势 */}
      <div className="card">
        <div className="card-title">竖相加走势（与上期同位和）</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>百+百</th>
                <th>十+十</th>
                <th>个+个</th>
                <th>和总和</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(item => (
                <tr key={item.issue}>
                  <td className="issue">{item.issue}</td>
                  <td style={{ fontWeight: 700, color: '#e74c3c' }}>
                    {item.vAdd[0] !== null ? item.vAdd[0] : '-'}
                  </td>
                  <td style={{ fontWeight: 700, color: '#3498db' }}>
                    {item.vAdd[1] !== null ? item.vAdd[1] : '-'}
                  </td>
                  <td style={{ fontWeight: 700, color: '#2ecc71' }}>
                    {item.vAdd[2] !== null ? item.vAdd[2] : '-'}
                  </td>
                  <td style={{ color: '#f39c12' }}>
                    {item.vAdd[0] !== null ? item.vAdd[0] + item.vAdd[1] + item.vAdd[2] : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 竖加减回补 */}
      <div className="card">
        <div className="card-title">竖相加回补遗漏 (结果值0-18)</div>
        <div className="missing-grid" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
          {Array.from({ length: 19 }, (_, v) => (
            <div key={v} className={`missing-cell ${recovery.vAddMissing[v] >= 10 ? 'hot' : recovery.vAddMissing[v] <= 1 ? 'cold' : ''}`}>
              <div className="digit">{v}</div>
              <div className="miss-count">遗漏 {recovery.vAddMissing[v]} 期</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">竖相减回补遗漏 (结果值0-9)</div>
        <div className="missing-grid">
          {Array.from({ length: 10 }, (_, v) => (
            <div key={v} className={`missing-cell ${recovery.vSubMissing[v] >= 10 ? 'hot' : recovery.vSubMissing[v] <= 1 ? 'cold' : ''}`}>
              <div className="digit">{v}</div>
              <div className="miss-count">遗漏 {recovery.vSubMissing[v]} 期</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default VAddSubAnalysis
