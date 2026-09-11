import { useState, useMemo } from 'react';

// ============================================================
// 分解容错结果面板：智取分解（黄）/ 博众分解（绿）并排 + 本期容错（交集）
//
// 布局锁定：
//   - 智取、博众两模块并排、等高贴边（flex + alignItems:stretch）
//   - 每个模块内 3×3 网格 = 容错1~8（8格）+ 无容错（末位1格）
//   - 本期容错模块独占一行，repeat(9,1fr) 单行九格
// 数据锁定：号码默认隐藏仅暴露注数，点「显示」展开，点「复制」一键复制
// ============================================================

const ACCENT = {
  zq: { bg: '#fffde7', border: '#f9a825', head: '#f57f17', tag: '智取' },
  bz: { bg: '#e8f5e9', border: '#43a047', head: '#1b5e20', tag: '博众' },
};

/** 复制按钮：即时反馈，避免等待 clipboard promise 造成的迟滞 */
function CopyBtn({ text, disabled }) {
  const [done, setDone] = useState(false);
  return (
    <button
      disabled={disabled || !text}
      onClick={(e) => {
        e.stopPropagation();
        if (!text) return;
        const finish = () => { setDone(true); setTimeout(() => setDone(false), 900); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(finish).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text; document.body.appendChild(ta); ta.select();
            try { document.execCommand('copy'); } catch { /* 忽略 */ }
            document.body.removeChild(ta); finish();
          });
        } else {
          const ta = document.createElement('textarea');
          ta.value = text; document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); } catch { /* 忽略 */ }
          document.body.removeChild(ta); finish();
        }
      }}
      style={{
        fontSize: 11, padding: '1px 6px', cursor: disabled || !text ? 'default' : 'pointer',
        border: `1px solid ${done ? '#2e7d32' : '#bbb'}`, borderRadius: 3,
        background: done ? '#c8e6c9' : '#fff', color: done ? '#1b5e20' : '#555',
        fontWeight: 600, lineHeight: '16px',
      }}
    >
      {done ? '已复制' : '复制'}
    </button>
  );
}

/**
 * 单个容错等级格子
 * @param {{label:string,count:number,numbers:string[],zuLiu:number,zuSan:number}} cell
 * @param {string} accent 主题色
 * @param {boolean} isNone 是否无容错（errorCount===0，最严等级）
 */
function LevelCell({ cell, accent, isNone }) {
  const [open, setOpen] = useState(false);
  const empty = cell.count === 0;
  return (
    <div style={{
      border: `1px solid ${empty ? '#ddd' : accent}`, borderRadius: 4,
      background: empty ? '#fafafa' : '#fff', padding: '4px 6px',
      display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
      opacity: empty ? 0.55 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        <span style={{
          fontSize: 12, fontWeight: 700, color: isNone ? '#c62828' : '#333',
          whiteSpace: 'nowrap',
        }}>
          {cell.label}
        </span>
        <CopyBtn text={cell.numbers.join(' ')} disabled={empty} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: empty ? '#999' : accent, lineHeight: '22px' }}>
          {cell.count}
        </span>
        <span style={{ fontSize: 11, color: '#888' }}>注</span>
        <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>
          组六{cell.zuLiu}/组三{cell.zuSan}
        </span>
      </div>
      {!empty && (
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            fontSize: 11, padding: '1px 4px', cursor: 'pointer', alignSelf: 'flex-start',
            border: '1px solid #ddd', borderRadius: 3, background: '#f5f5f5', color: '#666',
          }}
        >
          {open ? '隐藏号码' : '显示号码'}
        </button>
      )}
      {open && !empty && (
        <div style={{
          fontSize: 11, color: '#444', fontFamily: 'Consolas,monospace', lineHeight: '15px',
          wordBreak: 'break-all', maxHeight: 76, overflowY: 'auto', background: '#fcfcfc',
          border: '1px dashed #ddd', borderRadius: 3, padding: 3,
        }}>
          {cell.numbers.join(' ')}
        </div>
      )}
    </div>
  );
}

/** 智取 / 博众 单模块：3×3 网格，容错1~8 在前，无容错置末位 */
function DecompModule({ title, issue, result, theme }) {
  const c = ACCENT[theme];
  // 3×3 = 容错1..8 + 无容错（末位）
  const cells = useMemo(() => (result && result.valid
    ? [...result.levels, result.none]
    : []), [result]);

  return (
    <div style={{
      flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
      border: `2px solid ${c.border}`, borderRadius: 6, background: c.bg, overflow: 'hidden',
    }}>
      <div style={{
        padding: '6px 10px', background: c.border, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>{title}</span>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期` : '—'}
          {result && result.valid ? ` · ${result.groupCount} 组分解 · 候选${result.total}注(自选组六)` : ''}
        </span>
      </div>

      <div style={{ padding: 8, flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {result && result.valid ? (
          result.total === 0 ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, color: '#999', minHeight: 120, textAlign: 'center', padding: 12,
            }}>
              《自选号码》未提供组六号码<br />请先在上方「自选号码」录入三位号码（组三自动忽略，不参与分解）
            </div>
          ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {cells.map((cell, i) => (
                <LevelCell
                  key={cell.label}
                  cell={cell}
                  accent={i === cells.length - 1 ? '#c62828' : c.head}
                  isNone={i === cells.length - 1}
                />
              ))}
            </div>

            {result.eliminated.length > 0 && (
              <div style={{
                fontSize: 11, color: '#8d6e63', background: '#efebe9',
                border: '1px solid #d7ccc8', borderRadius: 3, padding: '3px 6px',
              }} title={result.eliminated.join(' ')}>
                另有 <b>{result.eliminated.length}</b> 注 errorCount &gt; 8，容错8 仍淘汰
              </div>
            )}

          </>
          )
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, color: '#999', minHeight: 120, textAlign: 'center', padding: 12,
          }}>
            暂无分解条件<br />请在表格「{c.tag}分解」下期行的文本框中录入 20 组分解数据
          </div>
        )}
      </div>
    </div>
  );
}

/** 自选号码：用户为「最新未开奖期」手填的号码，独立于分解容错，置于智取/博众上方 */
function SelfPickModule({ issue, value, onChange }) {
  // 解析：按空白/逗号/分号切分，仅保留恰好三位数字的 token，去重保序；
  // 并自动拆分为组六（三位互不相同）与组三（含重复数字）两类，供横向并排展示
  const parsed = useMemo(() => {
    const tokens = (value || '').split(/[\s,，;；]+/).filter(t => /^\d{3}$/.test(t));
    const seen = new Set();
    const nums = [];
    for (const t of tokens) if (!seen.has(t)) { seen.add(t); nums.push(t); }
    const zuLiuNums = [];
    const zuSanNums = [];
    for (const n of nums) (new Set(n.split('')).size === 3 ? zuLiuNums : zuSanNums).push(n);
    return { raw: tokens.length, nums, zuLiuNums, zuSanNums, zuLiu: zuLiuNums.length, zuSan: zuSanNums.length };
  }, [value]);

  return (
    <div style={{ border: '2px solid #00838f', borderRadius: 6, background: '#e0f7fa', overflow: 'hidden' }}>
      <div style={{
        padding: '6px 10px', background: '#00838f', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, flexWrap: 'wrap',
      }}>
        {/* 期号搬到「自选号码」标题左侧，两者靠左并排（用户要求） */}
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {issue ? `${issue} 期（最新未开奖）` : '—'}
        </span>
        <span style={{ fontSize: 15, fontWeight: 800 }}>自选号码</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <textarea
          value={value || ''}
          onChange={e => onChange && onChange(e.target.value)}
          placeholder="输入自选号码：每行一个，或空格/逗号分隔的三位数，如 123 456 789"
          style={{
            width: '100%', minHeight: 64, resize: 'vertical',
            fontSize: 12, lineHeight: '18px', fontFamily: 'Consolas,Menlo,monospace',
            padding: '4px 6px', boxSizing: 'border-box', borderRadius: 3,
            border: '1px solid #4dd0e1', background: '#fff', color: '#222',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#00695c', fontWeight: 700 }}>
            共 {parsed.nums.length} 注{parsed.raw !== parsed.nums.length ? `（输入 ${parsed.raw}，去重后）` : ''}
          </span>
          <span style={{ fontSize: 11, color: '#00838f' }}>组六{parsed.zuLiu}/组三{parsed.zuSan}</span>
          <CopyBtn text={parsed.nums.join(' ')} disabled={parsed.nums.length === 0} />
        </div>
        {parsed.nums.length > 0 && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            {/* 组六（青）与组三（红）横向并排 */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px dashed #4dd0e1', borderRadius: 3, background: '#fff', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '2px 6px', background: '#e0f2f1', borderBottom: '1px solid #b2dfdb' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#00695c' }}>组六 {parsed.zuLiu} 注</span>
                <CopyBtn text={parsed.zuLiuNums.join(' ')} disabled={parsed.zuLiu === 0} />
              </div>
              <div style={{ fontSize: 12, color: '#00695c', fontFamily: 'Consolas,monospace', lineHeight: '18px', wordBreak: 'break-all', padding: 4, maxHeight: 88, overflowY: 'auto', flex: 1 }}>
                {parsed.zuLiuNums.join(' ') || '—'}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', border: '1px dashed #ef9a9a', borderRadius: 3, background: '#fff', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '2px 6px', background: '#ffebee', borderBottom: '1px solid #ffcdd2' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#c62828' }}>组三 {parsed.zuSan} 注</span>
                <CopyBtn text={parsed.zuSanNums.join(' ')} disabled={parsed.zuSan === 0} />
              </div>
              <div style={{ fontSize: 12, color: '#c62828', fontFamily: 'Consolas,monospace', lineHeight: '18px', wordBreak: 'break-all', padding: 4, maxHeight: 88, overflowY: 'auto', flex: 1 }}>
                {parsed.zuSanNums.join(' ') || '—'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 容错1-5 合并频次：智取+博众 容错1~5 号码合并后按出现次数降序排列 */
function MergeFreqModule({ decompIssue, bozhongIssue, decompResult, bozhongResult }) {
  // 同期约束：与交集一致，跨期合并无意义
  const sameIssue = !!decompIssue && decompIssue === bozhongIssue;

  const freq = useMemo(() => {
    if (!sameIssue) return null;
    if (!decompResult || !decompResult.valid || !bozhongResult || !bozhongResult.valid) return null;
    if (decompResult.total === 0 || bozhongResult.total === 0) return null;
    const count = new Map();
    const push = (nums) => { for (const n of nums) count.set(n, (count.get(n) || 0) + 1); };
    // 容错1~5 = levels[0..4]（累计语义，号码在容错e~5 各出现一次）
    for (let i = 0; i < 5; i++) {
      push(decompResult.levels[i].numbers);
      push(bozhongResult.levels[i].numbers);
    }
    const arr = [...count.entries()].map(([num, c]) => ({ num, c }));
    arr.sort((a, b) => (b.c - a.c) || (a.num < b.num ? -1 : 1));   // 次数降序，同次数按号码升序
    return arr;
  }, [sameIssue, decompResult, bozhongResult]);

  const maxC = freq && freq.length ? freq[0].c : 0;

  // 按出现次数分组（次数从多到少），号码不显示、仅在复制时带出
  const groups = [];
  if (freq) {
    const m = new Map();
    for (const f of freq) { if (!m.has(f.c)) m.set(f.c, []); m.get(f.c).push(f.num); }
    for (const [c, nums] of m.entries()) groups.push({ c, nums });
    groups.sort((a, b) => b.c - a.c);   // 出现次数最多到最少
  }
  return (
    <div style={{ border: '2px solid #7b1fa2', borderRadius: 6, background: '#f3e5f5', overflow: 'hidden' }}>
      <div style={{
        padding: '6px 10px', background: '#7b1fa2', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>容错1-5 合并频次（智取+博众）</span>
        <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
          {sameIssue ? `${decompIssue} 期` : '目标期不一致'} · 按出现次数降序
        </span>
      </div>
      <div style={{ padding: 8 }}>
        {freq ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#6a1b9a', fontWeight: 700 }}>
                去重 {freq.length} 个号码 · 最高出现 {maxC} 次
              </span>
              <CopyBtn text={freq.map(f => f.num).join(' ')} disabled={freq.length === 0} />
            </div>
            {/* 号码不显示：仅展示出现次数（降序），每个次数下方给复制按钮；格子等宽横向铺满整行 */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {groups.map(g => (
                <div key={g.c} style={{
                  flex: 1, minWidth: 0,
                  border: '1px solid #7b1fa2', borderRadius: 4, background: '#fff',
                  padding: '4px 8px', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 2,
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: '#6a1b9a', lineHeight: '20px' }}>{g.c}</span>
                  <span style={{ fontSize: 11, color: '#888' }}>次 · {g.nums.length} 个号码</span>
                  <CopyBtn text={g.nums.join(' ')} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: 16 }}>
            {!sameIssue
              ? `智取目标期 ${decompIssue || '—'} 与博众目标期 ${bozhongIssue || '—'} 不一致，暂停合并`
              : '需智取与博众分解条件及自选号码候选均已就绪后合并'}
          </div>
        )}
      </div>
    </div>
  );
}

/** 本期容错：智取与博众同等级号码取交集（只保留重复号码），单行九格 */
function InterModule({ decompIssue, bozhongIssue, decompResult, bozhongResult }) {
  // 【同期约束】交集只在智取与博众目标期为同一期时才有意义。
  // 两者分解数据更新进度不同时（如智取已录入 26243、博众仍停在 26193），
  // 跨期取交集会得到无意义的结果，此时直接拒算并提示，不静默输出错误数字
  const sameIssue = !!decompIssue && decompIssue === bozhongIssue;

  const cells = useMemo(() => {
    if (!sameIssue) return [];
    if (!decompResult || !decompResult.valid || !bozhongResult || !bozhongResult.valid) return [];
    // 候选集为空（自选号码无组六）时交集无意义，降级为提示而非九个 0 格
    if (decompResult.total === 0 || bozhongResult.total === 0) return [];
    const inter = (a, b) => {
      const bs = new Set(b);
      const nums = a.filter(n => bs.has(n)).sort();
      let zuLiu = 0;
      for (const n of nums) if (new Set(n.split('')).size === 3) zuLiu++;
      return { count: nums.length, numbers: nums, zuLiu, zuSan: nums.length - zuLiu };
    };
    const out = [];
    for (let i = 0; i < decompResult.levels.length; i++) {
      const r = inter(decompResult.levels[i].numbers, bozhongResult.levels[i].numbers);
      out.push({ label: decompResult.levels[i].label, ...r });
    }
    const n0 = inter(decompResult.none.numbers, bozhongResult.none.numbers);
    out.push({ label: '无容错', ...n0 });
    return out;
  }, [sameIssue, decompResult, bozhongResult]);

  return (
    <div style={{
      border: '2px solid #5c6bc0', borderRadius: 6, background: '#e8eaf6', overflow: 'hidden',
    }}>
      <div style={{
        padding: '6px 10px', background: '#5c6bc0', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>
          本期容错（{sameIssue ? `${decompIssue} 期` : '目标期不一致'} 智取博众 交集）
        </span>
        <span style={{ fontSize: 12, opacity: 0.95 }}>取交集（只保留重复号码），无容错至容错8</span>
      </div>
      <div style={{ padding: 8 }}>
        {cells.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6 }}>
            {cells.map((cell, i) => (
              <LevelCell
                key={cell.label}
                cell={cell}
                accent={i === cells.length - 1 ? '#c62828' : '#283593'}
                isNone={i === cells.length - 1}
              />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: 16 }}>
            {!sameIssue
              ? `智取目标期 ${decompIssue || '—'} 与博众目标期 ${bozhongIssue || '—'} 不一致，跨期取交集无意义，已暂停计算。请把两套分解条件录到同一期。`
              : (decompResult && decompResult.valid && bozhongResult && bozhongResult.valid && (decompResult.total === 0 || bozhongResult.total === 0))
                ? '《自选号码》候选为空（无组六号码），交集暂停计算'
                : '需智取与博众分解条件均已录入后计算交集'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DecompRongCuoPanel({
  decompIssue, decompResult,
  bozhongIssue, bozhongResult,
  selfPickIssue, selfPickValue, onSelfPickChange,
  onDecompSubmit,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 自选号码：置于智取/博众上方，与最新未开奖期对应 */}
      <SelfPickModule issue={selfPickIssue} value={selfPickValue} onChange={onSelfPickChange} />
      {/* 智取、博众分解：锁定按钮 + 目标期提示，置于自选号码下方（功能不变） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={onDecompSubmit}
          title="锁定智取/博众下期分解编辑框（密码 000000 解锁），容错结果自动重算"
          style={{
            padding: '8px 22px', fontSize: 16, fontWeight: 800, cursor: 'pointer',
            border: '2px solid #f57f17', borderRadius: 6, background: '#f9a825', color: '#fff',
          }}
        >
          智取、博众分解
        </button>
        <span style={{ fontSize: 13, color: '#666' }}>
          智取目标期 <b>{decompIssue || '—'}</b>（{decompResult && decompResult.valid ? `${decompResult.groupCount} 组` : '无数据'}）
          {'　｜　'}博众目标期 <b>{bozhongIssue || '—'}</b>（{bozhongResult && bozhongResult.valid ? `${bozhongResult.groupCount} 组` : '无数据'}）
        </span>
      </div>
      {/* 容错1-5 合并频次：置于按钮行下方、智取/博众上方 */}
      <MergeFreqModule
        decompIssue={decompIssue}
        bozhongIssue={bozhongIssue}
        decompResult={decompResult}
        bozhongResult={bozhongResult}
      />
      {/* 智取（黄）与博众（绿）并排等高贴边 */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <DecompModule title="智取分解容错" issue={decompIssue} result={decompResult} theme="zq" />
        <DecompModule title="博众分解容错" issue={bozhongIssue} result={bozhongResult} theme="bz" />
      </div>
      <InterModule
        decompIssue={decompIssue}
        bozhongIssue={bozhongIssue}
        decompResult={decompResult}
        bozhongResult={bozhongResult}
      />
    </div>
  );
}
