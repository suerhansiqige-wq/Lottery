import { useMemo } from 'react'
import { parseDecompGroups, verifyDraw } from '../utils/decompRongCuo.js'

// ============================================================
// 【算法锁定】横加减 / 竖加减 4列（对齐 Excel「黄金三格」福表 G~R 列，每 3 列合并为 1 格）
// 横相减：|百-十|、|十-个|、|百-个|              （Excel G/H/I = ABS(B-C)、ABS(C-D)、ABS(B-D)）
// 横相加：(百+十)取尾、(十+个)取尾、(百+个)取尾  （Excel J/K/L = IF(x+y>=10,x+y-10,x+y)）
// 竖相减：|本期-上期|同位差（百/十/个）           （Excel M/N/O = ABS(B上-B本)）
// 竖相加：(本期+上期)同位取尾（百/十/个）         （Excel P/Q/R = IF(B上+B本>=10,...-10,...)）
// 数值口径由 enrichDataOptimized.js 的 hSub/hAdd/vSub/vAdd 提供，禁止在此重复计算
// 显示规则：与生号/连号/必出号一致，统一下移一行（当期行显示上一期算出的值）
// 合并规则：每组 3 个一位数连写为一个单元格（如 7,1,6 → 716），与生号/连号显示风格一致
// ============================================================
const HJS_COLS = [
  { field: 'hSub', th: '横相减', title: '横相减：|百-十| |十-个| |百-个| 三位连写' },
  { field: 'hAdd', th: '横相加', title: '横相加：(百+十) (十+个) (百+个) 取尾 三位连写' },
  { field: 'vSub', th: '竖相减', title: '竖相减：|本期百-上期百| |本期十-上期十| |本期个-上期个| 三位连写' },
  { field: 'vAdd', th: '竖相加', title: '竖相加：(本期百+上期百) (本期十+上期十) (本期个+上期个) 取尾 三位连写' },
];

// 渲染横加减/竖加减4个合并单元格；src 为空或该组无上期数据（全 null）时显示 -
function renderHjsCells(src) {
  return HJS_COLS.map((c, i) => {
    const arr = src ? src[c.field] : null;
    const has = arr && arr.some(v => v !== null && v !== undefined);
    return (
      <td key={'hjs' + i} title={c.title} style={{ fontWeight: 700, color: '#000' }}>
        {has ? arr.join('') : '-'}
      </td>
    );
  });
}

// ============================================================
// 智取分解 / 博众分解 两列（表格最右侧，通杀码之后）
// 【样式锁定】文本框宽 170px、高固定 40px（仅显示 2 行）、overflow:hidden 禁滚动条、
//   resize:none 禁拖拽缩放；有数据白底，无数据灰底
// 【交互锁定】已锁定期号 -> readOnly + 置灰 + 点击弹密码框；未锁定 -> 可编辑，
//   onChange 即时写回 App.jsx 并触发容错重算
// ============================================================
const DECOMP_COLS = [
  { kind: 'decomp', th: '智取分解', title: '智取分解：每期 20 组 5-5 分解，格式 XXXXX,XXXXX，组间换行' },
  { kind: 'bozhong', th: '博众分解', title: '博众分解：每期 20 组 5-5 分解，格式 XXXXX,XXXXX，组间换行' },
];

function FullDataTable({
  data, showCount, setShowCount, trialDigits, onTrialChange,
  decompTexts = {}, bozhongTexts = {},
  setDecompText, setBozhongText,
  lockedDecomp, lockedBozhong,
  onRequestUnlock,
  // App.jsx 基于 baseData 算出的下期待开奖期号；分解录入框必须用它，
  // 不能用本文件预留行内部的 nextIssue——后者基于 enrichedData，
  // 存在测试行时会多算一期，导致分解条件对错期号
  nextIssue: appNextIssue,
}) {
  const displayData = data.slice(-showCount)
  const isTrialRow = (item) => trialDigits && trialDigits.every(d => d !== null) && data.length > 0 && item.issue === data[data.length - 1].issue

  // 往期各期「最小容错等级」徽章数据源：仅对已开奖行（d1/d2/d3 有值）且该期分解非空时计算；
  //   下期预留行尚无开奖号 → 不产出徽章，等开奖数据更新、该行转为正常已开奖行后才显示
  const verifyMaps = useMemo(() => {
    const dm = new Map();
    const bz = new Map();
    for (const item of displayData) {
      if (item.d1 === undefined || item.d2 === undefined || item.d3 === undefined) continue;
      const gd = parseDecompGroups((decompTexts && decompTexts[item.issue]) || '');
      if (gd.length > 0) { const v = verifyDraw(item, gd); if (v) dm.set(item.issue, v); }
      const gb = parseDecompGroups((bozhongTexts && bozhongTexts[item.issue]) || '');
      if (gb.length > 0) { const v = verifyDraw(item, gb); if (v) bz.set(item.issue, v); }
    }
    return { dm, bz };
  }, [displayData, decompTexts, bozhongTexts]);

  // 渲染一个分解文本框单元格；hasData 决定白底/灰底，locked 决定只读与点击解锁
  const renderDecompCell = (kind, issue, title) => {
    const texts = kind === 'decomp' ? decompTexts : bozhongTexts;
    const setText = kind === 'decomp' ? setDecompText : setBozhongText;
    const lockedSet = kind === 'decomp' ? lockedDecomp : lockedBozhong;
    const value = (texts && texts[issue]) || '';
    const hasData = value.trim().length > 0;
    const locked = !!(lockedSet && lockedSet.has(issue));
    const v = (kind === 'decomp' ? verifyMaps.dm : verifyMaps.bz).get(issue);
    return (
      <td key={'dc_' + kind} style={{ padding: 2, background: locked ? '#eceff1' : (hasData ? '#fff' : '#e0e0e0') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <textarea
          readOnly={locked}
          value={value}
          title={locked ? `${title}（已锁定，点击输入密码解锁）` : title}
          placeholder={locked ? '已锁定' : ''}
          onChange={e => { if (setText) setText(issue, e.target.value); }}
          onClick={locked && onRequestUnlock ? () => onRequestUnlock(kind, issue) : undefined}
          style={{
            width: 170, height: 40, resize: 'none', overflow: 'hidden', display: 'block',
            fontSize: 11, lineHeight: '19px', fontFamily: 'Consolas,Menlo,monospace',
            padding: '0 3px', boxSizing: 'border-box', borderRadius: 3,
            border: `1px solid ${locked ? '#cfd8dc' : (hasData ? '#90caf9' : '#bdbdbd')}`,
            background: locked ? '#eceff1' : (hasData ? '#fff' : '#eee'),
            color: locked ? '#78909c' : '#222',
            cursor: locked ? 'pointer' : 'text',
          }}
        />
        {v && (
          <span style={{
            fontSize: 11, padding: '1px 5px', borderRadius: 3, border: '1px solid #e0e0e0',
            background: '#fff', whiteSpace: 'nowrap',
            color: v.type === '组三' ? '#c62828' : '#000',
            fontWeight: v.type === '组三' ? 700 : 600,
          }} title={`${issue} 期开奖最小容错等级（${v.type}）`}>
            {v.type}（容错{v.level}）
          </span>
        )}
        </div>
      </td>
    );
  }

  return (
    <div>
      <div className="card">
        <div className="card-title" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
          <select value={showCount} onChange={e => setShowCount(+e.target.value)}
            style={{ background: 'var(--bg-table)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 4, padding: '4px 8px' }}>
            <option value={10}>最近10期</option>
            <option value={20}>最近20期</option>
            <option value={30}>最近30期</option>
            <option value={50}>最近50期</option>
            <option value={100}>最近100期</option>
            <option value={500}>最近500期</option>
            <option value={1000}>最近1000期</option>
            <option value={data.length}>全部</option>
          </select>
        </div>
        <style>{`input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } input[type=number] { -moz-appearance: textfield; }`}</style>
        <div className="table-container" style={{ maxHeight: '700px' }}>
          <table className="data-table" style={{ fontSize: 17 }}>
            <thead>
              <tr>
                <th>期数</th>
                <th style={{ borderBottom: '3px solid #a8d8ea' }}>百</th>
                <th style={{ borderBottom: '3px solid #a8d8ea' }}>十</th>
                <th style={{ borderBottom: '3px solid #a8d8ea' }}>个</th>
                <th>和值</th>
                <th>跨度</th>
                {/* 横加减/竖加减4列（Excel G~R 每3列合并为1格） */}
                {HJS_COLS.map((c, i) => (
                  <th key={'hjsTh' + i} title={c.title}>{c.th}</th>
                ))}
                <th>生号</th>
                <th>连号</th>
                <th>必出号</th>
                <th>通杀码</th>
                {/* 智取分解 / 博众分解 两列 */}
                {DECOMP_COLS.map(c => (
                  <th key={'dcTh_' + c.kind} title={c.title}
                    style={{ borderBottom: `3px solid ${c.kind === 'decomp' ? '#f9a825' : '#43a047'}` }}>
                    {c.th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((item, idx) => {
                // 组三：百十个中有任意两个相同
                const isZuSan = item.d1 === item.d2 || item.d2 === item.d3 || item.d1 === item.d3;
                const digitStyle = isZuSan ? { color: 'red', fontWeight: 700, fontSize: 20 } : { color: '#000', fontSize: 20 };
                // 生号/连号/必出号/参考一/参考二/胆码：显示下移一行，用上期数据验证当期开奖号
                const prevData = idx > 0 ? displayData[idx - 1] : item; // 第一行显示自身
                // 和值/跨度显示当期实际数据，与前后一期比较重复则蓝色
                const prevItem = idx > 0 ? displayData[idx - 1] : null;
                const nextItem = idx < displayData.length - 1 ? displayData[idx + 1] : null;
                const sumColor = ((prevItem && item.sum === prevItem.sum) || (nextItem && item.sum === nextItem.sum)) ? '#3498db' : '#000';
                const spanColor = ((prevItem && item.span === prevItem.span) || (nextItem && item.span === nextItem.span)) ? '#3498db' : '#000';
                // 当期开奖号（用于验证）
                const curDigits = new Set([item.d1, item.d2, item.d3]);
                // 生号/连号命中判定：与当期开奖号对比
                const getShengLianStyle = (digits) => {
                  if (!curDigits || digits.length === 0) return { color: '#fff', fontWeight: 600, background: '#1e8449' };
                  const uniqueCur = [...curDigits];
                  const hitCount = digits.filter(d => uniqueCur.includes(d)).length;
                  // 全部包含（组三去重后2个数字也算全部包含）→ 红色
                  if (hitCount === uniqueCur.length) return { color: 'red', fontWeight: 700, background: '#1e8449' };
                  // 出现1-2次 → 黄色
                  if (hitCount >= 1) return { color: 'yellow', fontWeight: 600, background: '#1e8449' };
                  // 一个都没有 → 白底蓝字
                  return { color: '#3498db', fontWeight: 600, background: '#fff' };
                };
                const shengHaoDigits = prevData.shenghao.filter(v => v !== -1);
                const lianHaoDigits = prevData.lianhao.filter(v => v !== -1);
                const shengHaoStyle = getShengLianStyle(shengHaoDigits);
                const lianHaoStyle = getShengLianStyle(lianHaoDigits);
                const getHitStyle = (digits, baseBg, textColor) => {
                  if (!curDigits) return { color: textColor || '#000', fontWeight: 600, background: baseBg };
                  const hits = digits.filter(d => curDigits.has(d)).length;
                  if (hits === 0) return { color: '#3498db', fontWeight: 600, background: '#fff' };
                  // 组三时去重后只有2个数字，全部命中即红色
                  if (hits === curDigits.size) return { color: 'red', fontWeight: 700, background: baseBg };
                  return { color: textColor || '#000', fontWeight: 600, background: baseBg };
                };
                const mustOutDigits = prevData.mustOutNums.filter(v => v !== -1);
                const mustOutStyle = getHitStyle(mustOutDigits, '#1e8449', '#fff');                return (
                <tr key={item.issue} style={isTrialRow(item) ? { background: '#fffde7' } : {}}>
                  <td className="issue" style={{ color: '#000', fontWeight: isTrialRow(item) ? 700 : 400 }}>{'20' + item.issue}{isTrialRow(item) ? ' (测试)' : ''}</td>
                  {isTrialRow(item) ? (
                    <>
                      <td><input type="number" min="0" max="9" value={trialDigits[0] ?? ''} onChange={e => { const v = e.target.value; onTrialChange([v === '' ? null : Math.min(9, Math.max(0, Number(v))), trialDigits[1], trialDigits[2]]); }} style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 700, border: '2px solid #f39c12', borderRadius: 4, background: '#fff' }} /></td>
                      <td><input type="number" min="0" max="9" value={trialDigits[1] ?? ''} onChange={e => { const v = e.target.value; onTrialChange([trialDigits[0], v === '' ? null : Math.min(9, Math.max(0, Number(v))), trialDigits[2]]); }} style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 700, border: '2px solid #f39c12', borderRadius: 4, background: '#fff' }} /></td>
                      <td><input type="number" min="0" max="9" value={trialDigits[2] ?? ''} onChange={e => { const v = e.target.value; onTrialChange([trialDigits[0], trialDigits[1], v === '' ? null : Math.min(9, Math.max(0, Number(v)))]); }} style={{ width: 40, textAlign: 'center', fontSize: 16, fontWeight: 700, border: '2px solid #f39c12', borderRadius: 4, background: '#fff' }} /></td>
                    </>
                  ) : (
                    <>
                      <td className="number" style={{ ...digitStyle, background: '#e8f4fd' }}>{item.d1}</td>
                      <td className="number" style={{ ...digitStyle, background: '#e8f4fd' }}>{item.d2}</td>
                      <td className="number" style={{ ...digitStyle, background: '#e8f4fd' }}>{item.d3}</td>
                    </>
                  )}
                  <td style={{ fontWeight: 700, color: sumColor }}>{item.sum}</td>
                  <td style={{ fontWeight: 700, color: spanColor }}>{item.span}</td>
                  {/* 横加减/竖加减：下移一行，显示上期算出的值（与生号/连号/必出号同一规则） */}
                  {renderHjsCells(prevData)}
                  {/* 生号 */}
                  <td style={{ ...shengHaoStyle }}>
                    {shengHaoDigits.length > 0 ? shengHaoDigits.join('') : '-'}
                  </td>
                  {/* 连号 */}
                  <td style={{ ...lianHaoStyle }}>
                    {lianHaoDigits.length > 0 ? lianHaoDigits.join('') : '-'}
                  </td>
                  {/* 必出号 */}
                  <td style={mustOutStyle}>
                    {mustOutDigits.length > 0 ? mustOutDigits.join('') : '-'}
                  </td>
                  {/* 通杀码 - 往期行：上期十位对应通杀码，下期开奖号不含该数字=✓，含=✗ */}
                  <td style={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
                    {(() => {
                      const TONGSHA_MAP = { 0: 0, 1: 8, 2: 6, 3: 4, 4: 7, 5: 9, 6: 1, 7: 2, 8: 4, 9: 6 };
                      const prevItem = data[data.indexOf(item) - 1];
                      if (!prevItem || prevItem.d2 === undefined) return <span style={{ color: '#999' }}>-</span>;
                      const tongsha = TONGSHA_MAP[prevItem.d2];
                      const hasTongsha = item.d1 === tongsha || item.d2 === tongsha || item.d3 === tongsha;
                      const verified = !hasTongsha;
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 700, color: '#333' }}>{tongsha}</span>
                          {verified
                            ? <span style={{ color: 'green', fontWeight: 700, fontSize: 14 }} title={`通杀码${tongsha}：下期${item.d1}${item.d2}${item.d3}不含该数字`}>✓</span>
                            : <span style={{ color: 'red', fontWeight: 700, fontSize: 14 }} title={`通杀码${tongsha}：下期${item.d1}${item.d2}${item.d3}包含该数字`}>✗</span>}
                        </div>
                      );
                    })()}
                  </td>
                  {/* 智取分解 / 博众分解：按期号匹配展示对应 20 组分解参数 */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, item.issue, c.title))}
                  {/* 杀百十合、杀百个合、杀十个合三列已彻底删除 - 用户要求 */}
                </tr>
                );
              })}
              {/* 下期预留行 */}
              {(() => {
                const lastItem = data[data.length - 1];
                const nextIssue = String(Number(lastItem.issue) + 1);
                const isSynced = data.some(d => d.issue === nextIssue);
                return (
                <tr style={{ background: '#f0f8ff' }}>
                  <td className="issue" style={{ color: isSynced ? '#000' : '#e74c3c', fontWeight: 700 }}>{'20' + nextIssue}</td>
                  <td style={{ background: '#e8f4fd' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  <td style={{ fontWeight: 700, color: '#000' }}>-</td>
                  {/* 横加减/竖加减 - 预留行显示最后一期算出的值（与生号/连号/必出号一致） */}
                  {renderHjsCells(lastItem)}
                  {/* 生号 - 预留行显示最后一期数据 */}
                  <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                    {(() => { const d = lastItem.shenghao.filter(v => v !== -1); return d.length > 0 ? d.join('') : '-'; })()}
                  </td>
                  {/* 连号 - 预留行显示最后一期数据 */}
                  <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                    {(() => { const d = lastItem.lianhao.filter(v => v !== -1); return d.length > 0 ? d.join('') : '-'; })()}
                  </td>
                  {/* 必出号 - 预留行显示最后一期数据 */}
                  <td style={{ color: '#fff', fontWeight: 600, background: '#1e8449' }}>
                    {(() => { const d = lastItem.mustOutNums.filter(v => v !== -1); return d.length > 0 ? d.join('') : '-'; })()}
                  </td>
                  {/* 通杀码 - 预留行：最新已开奖期十位对应通杀码，供参考 */}
                  <td style={{ fontWeight: 600, fontSize: 13, textAlign: 'center' }}>
                    {(() => {
                      const TONGSHA_MAP = { 0: 0, 1: 8, 2: 6, 3: 4, 4: 7, 5: 9, 6: 1, 7: 2, 8: 4, 9: 6 };
                      if (!lastItem || lastItem.d2 === undefined) return <span style={{ color: '#999' }}>-</span>;
                      const tongsha = TONGSHA_MAP[lastItem.d2];
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <span style={{ fontWeight: 700, color: '#333' }}>{tongsha}</span>
                          <span style={{ color: '#999', fontSize: 12 }}>(待验证)</span>
                        </div>
                      );
                    })()}
                  </td>
                  {/* 智取分解 / 博众分解 - 预留行：下期分解条件录入框（点按钮后锁定，密码解锁再编辑） */}
                  {DECOMP_COLS.map(c => renderDecompCell(c.kind, appNextIssue || nextIssue, c.title))}
                  {/* 杀百十合、杀百个合、杀十个合三列预留行已彻底删除 - 用户要求 */}
                </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

export default FullDataTable
