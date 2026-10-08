// GitHub Gist 跨设备数据同步（免费方案）
// Token 存储在 localStorage（键：gist_githubToken / gist_gistId）

const TOKEN_KEY = 'gist_githubToken';
const GIST_ID_KEY = 'gist_gistId';

function getConfig() {
  try {
    return {
      githubToken: localStorage.getItem(TOKEN_KEY) || '',
      gistId: localStorage.getItem(GIST_ID_KEY) || ''
    };
  } catch { return { githubToken: '', gistId: '' }; }
}

function saveGistId(id) {
  try { localStorage.setItem(GIST_ID_KEY, id); } catch {}
}

export function setGistToken(token) {
  try { localStorage.setItem(TOKEN_KEY, token); } catch {}
}

export function getGistToken() {
  return getConfig().githubToken;
}

export function clearGistToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(GIST_ID_KEY);
  } catch {}
}

export async function testGistToken(token) {
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: { Authorization: `token ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      return { ok: true, login: user.login };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export async function loadFromGist() {
  try {
    const cfg = getConfig();
    if (!cfg.githubToken) return null;

    // 排列三使用独立的 Gist，与福彩 3D 数据隔离
    const res = await fetch('https://api.github.com/gists', {
      headers: { Authorization: `token ${cfg.githubToken}` }
    });
    let gistId = null;
    if (res.ok) {
      const gists = await res.json();
      const found = gists.filter(g => g.description === '排列三分解数据同步');
      if (found.length > 0) {
        // 按创建时间排序，使用最早的那个
        found.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        gistId = found[0].id;
        saveGistId(gistId);
        console.log('[Gist] 使用 Gist ID:', gistId, '(共找到', found.length, '个匹配的 Gist)');
      }
    }

    if (!gistId) {
      console.log('[Gist] 未找到匹配的 Gist');
      return null;
    }

    const res2 = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${cfg.githubToken}` }
    });
    if (!res2.ok) return null;
    const data = await res2.json();
    const out = {};
    for (const [k, v] of Object.entries(data.files || {})) {
      try { out[k.replace('.json', '')] = JSON.parse(v.content); } catch {}
    }
    console.log('[Gist] 加载成功，文件:', Object.keys(out).join(', '));
    return out;
  } catch (e) {
    console.error('[Gist] 加载失败:', e.message);
    return null;
  }
}

export async function saveToGist(obj) {
  try {
    const cfg = getConfig();
    if (!cfg.githubToken) return false;
    const files = {};
    for (const [k, v] of Object.entries(obj)) {
      files[`${k}.json`] = { content: JSON.stringify(v, null, 2) };
    }

    // 排列三使用独立的 Gist，与福彩 3D 数据隔离
    const res = await fetch('https://api.github.com/gists', {
      headers: { Authorization: `token ${cfg.githubToken}` }
    });
    let gistId = null;
    if (res.ok) {
      const gists = await res.json();
      const found = gists.filter(g => g.description === '排列三分解数据同步');
      if (found.length > 0) {
        found.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        gistId = found[0].id;
        saveGistId(gistId);
      }
    }

    let res2;
    if (gistId) {
      // 更新已有的 Gist
      res2 = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${cfg.githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files })
      });
      console.log('[Gist] 更新 Gist:', gistId, res2.ok ? '✓' : '✗');
    } else {
      // 创建新 Gist
      res2 = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `token ${cfg.githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: '排列三分解数据同步',
          public: false,
          files
        })
      });
      if (res2.ok) {
        const data = await res2.json();
        saveGistId(data.id);
        console.log('[Gist] 创建新 Gist:', data.id);
      }
    }
    return res2.ok;
  } catch (e) {
    console.error('[Gist] 保存失败:', e.message);
    return false;
  }
}
