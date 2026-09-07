function DataTable({ data }) {
  return (
    <div>
      <div className="card">
        <div className="card-title">开奖记录</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>期数</th>
                <th>第一位</th>
                <th>第二位</th>
                <th>第三位</th>
                <th>和值</th>
                <th>跨度</th>
                <th>单双</th>
                <th>大小</th>
                <th>质合</th>
                <th>012路</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr key={item.issue || index}>
                  <td className="issue">{item.issue}</td>
                  <td className="number red">{item.d1}</td>
                  <td className="number blue">{item.d2}</td>
                  <td className="number green">{item.d3}</td>
                  <td>{item.sum}</td>
                  <td>{item.span}</td>
                  <td>
                    {item.oddEven.map((v, i) => (
                      <span key={i} className={`tag ${v === '单' ? 'tag-odd' : 'tag-even'}`}>
                        {v}
                      </span>
                    ))}
                  </td>
                  <td>
                    {item.bigSmall.map((v, i) => (
                      <span key={i} className={`tag ${v === '大' ? 'tag-big' : 'tag-small'}`}>
                        {v}
                      </span>
                    ))}
                  </td>
                  <td>
                    {item.primeComposite.map((v, i) => (
                      <span key={i} className={`tag ${v === '质' ? 'tag-prime' : 'tag-composite'}`}>
                        {v}
                      </span>
                    ))}
                  </td>
                  <td>
                    {item.path012.map((v, i) => (
                      <span key={i} className={`path-badge path-${v}`}>{v}</span>
                    ))}
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

export default DataTable
