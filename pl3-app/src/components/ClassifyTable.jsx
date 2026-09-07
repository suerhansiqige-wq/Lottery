import { useMemo } from 'react'

function ClassifyTable({ data }) {
  const recent = data.slice(-30).reverse()

  // 统计各分类组合出现次数
  const combos = useMemo(() => {
    const oddEven = {}, bigSmall = {}, upperLower = {}, primeComp = {}, path012 = {}
    data.forEach(d => {
      oddEven[d.oddEvenCombo] = (oddEven[d.oddEvenCombo] || 0) + 1
      bigSmall[d.bigSmallCombo] = (bigSmall[d.bigSmallCombo] || 0) + 1
      upperLower[d.upperLowerCombo] = (upperLower[d.upperLowerCombo] || 0) + 1
      primeComp[d.primeCompositeCombo] = (primeComp[d.primeCompositeCombo] || 0) + 1
      path012[d.path012Combo] = (path012[d.path012Combo] || 0) + 1
    })
    return { oddEven, bigSmall, upperLower, primeComp, path012 }
  }, [data])

  const total = data.length

  return (
    <div>
      {/* 分类属性走势表 */}
      <div className="card">
        <div className="card-title">分类属性走势</div>
        <div className="table-container" style={{ maxHeight: '500px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>号码</th>
                <th colSpan={3}>单/双</th>
                <th colSpan={3}>大/小</th>
                <th colSpan={3}>上/下</th>
                <th colSpan={3}>质/合</th>
                <th colSpan={3}>012路</th>
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
                  {item.oddEven.map((v, i) => (
                    <td key={`oe${i}`}><span className={`tag ${v === '单' ? 'tag-odd' : 'tag-even'}`}>{v}</span></td>
                  ))}
                  {item.bigSmall.map((v, i) => (
                    <td key={`bs${i}`}><span className={`tag ${v === '大' ? 'tag-big' : 'tag-small'}`}>{v}</span></td>
                  ))}
                  {item.upperLower.map((v, i) => (
                    <td key={`ul${i}`}><span className={`tag ${v === '上' ? 'tag-upper' : 'tag-lower'}`}>{v}</span></td>
                  ))}
                  {item.primeComposite.map((v, i) => (
                    <td key={`pc${i}`}><span className={`tag ${v === '质' ? 'tag-prime' : 'tag-composite'}`}>{v}</span></td>
                  ))}
                  {item.path012.map((v, i) => (
                    <td key={`p${i}`}><span className={`path-badge path-${v}`}>{v}</span></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 各分类组合统计 */}
      <div className="card">
        <div className="card-title">单双组合统计</div>
        <div className="stats-grid">
          {Object.entries(combos.oddEven).sort((a, b) => b[1] - a[1]).map(([combo, count]) => (
            <div key={combo} className="stat-item">
              <div style={{ fontSize: 18 }}>
                {combo.split('').map((c, i) => (
                  <span key={i} className={`tag ${c === '单' ? 'tag-odd' : 'tag-even'}`}>{c}</span>
                ))}
              </div>
              <div className="stat-label">{count}次 ({(count / total * 100).toFixed(1)}%)</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">大小组合统计</div>
        <div className="stats-grid">
          {Object.entries(combos.bigSmall).sort((a, b) => b[1] - a[1]).map(([combo, count]) => (
            <div key={combo} className="stat-item">
              <div style={{ fontSize: 18 }}>
                {combo.split('').map((c, i) => (
                  <span key={i} className={`tag ${c === '大' ? 'tag-big' : 'tag-small'}`}>{c}</span>
                ))}
              </div>
              <div className="stat-label">{count}次 ({(count / total * 100).toFixed(1)}%)</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">上下组合统计 (0-4下, 5-9上)</div>
        <div className="stats-grid">
          {Object.entries(combos.upperLower).sort((a, b) => b[1] - a[1]).map(([combo, count]) => (
            <div key={combo} className="stat-item">
              <div style={{ fontSize: 18 }}>
                {combo.split('').map((c, i) => (
                  <span key={i} className={`tag ${c === '上' ? 'tag-upper' : 'tag-lower'}`}>{c}</span>
                ))}
              </div>
              <div className="stat-label">{count}次 ({(count / total * 100).toFixed(1)}%)</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">质合组合统计 (质:2,3,5,7 合:0,1,4,6,8,9)</div>
        <div className="stats-grid">
          {Object.entries(combos.primeComp).sort((a, b) => b[1] - a[1]).map(([combo, count]) => (
            <div key={combo} className="stat-item">
              <div style={{ fontSize: 18 }}>
                {combo.split('').map((c, i) => (
                  <span key={i} className={`tag ${c === '质' ? 'tag-prime' : 'tag-composite'}`}>{c}</span>
                ))}
              </div>
              <div className="stat-label">{count}次 ({(count / total * 100).toFixed(1)}%)</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-title">012路组合统计 (mod 3)</div>
        <div className="stats-grid">
          {Object.entries(combos.path012).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([combo, count]) => (
            <div key={combo} className="stat-item">
              <div style={{ fontSize: 18 }}>
                {combo.split('').map((c, i) => (
                  <span key={i} className={`path-badge path-${c}`}>{c}</span>
                ))}
              </div>
              <div className="stat-label">{count}次 ({(count / total * 100).toFixed(1)}%)</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ClassifyTable
