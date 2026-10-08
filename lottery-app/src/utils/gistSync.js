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

    let gistId = cfg.gistId;

    if (!gistId) {
      const res = await fetch('https://api.github.com/gists', {
        headers: { Authorization: `token ${cfg.githubToken}` }
      });
      if (res.ok) {
        const gists = await res.json();
        const found = gists.find(g => g.description === '彩票分解数据同步');
        if (found) {
          gistId = found.id;
          saveGistId(gistId);
        }
      }
    }

    if (!gistId) return null;

    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${cfg.githubToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = {};
    for (const [k, v] of Object.entries(data.files || {})) {
      try { out[k.replace('.json', '')] = JSON.parse(v.content); } catch {}
    }
    return out;
  } catch {
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
    let res;
    if (cfg.gistId) {
      res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${cfg.githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files })
      });
    } else {
      res = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          Authorization: `token ${cfg.githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: '彩票分解数据同步',
          public: false,
          files
        })
      });
      if (res.ok) {
        const data = await res.json();
        saveGistId(data.id);
      }
    }
    return res.ok;
  } catch {
    return false;
  }
}
