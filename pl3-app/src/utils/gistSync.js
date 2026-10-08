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

export async function loadFromGist() {
  try {
    const cfg = getConfig();
    console.log('[Gist] 加载配置:', { hasToken: !!cfg.githubToken, hasGistId: !!cfg.gistId });
    if (!cfg.githubToken) {
      console.log('[Gist] 未配置 token，跳过加载');
      return null;
    }
    
    let gistId = cfg.gistId;
    
    // 如果没有 gistId，尝试查找已有的 Gist
    if (!gistId) {
      console.log('[Gist] 未找到 gistId，尝试查找已有 Gist...');
      const res = await fetch('https://api.github.com/gists', {
        headers: { Authorization: `token ${cfg.githubToken}` }
      });
      console.log('[Gist] 查找 Gist 响应:', res.status);
      if (res.ok) {
        const gists = await res.json();
        console.log('[Gist] 找到', gists.length, '个 Gist');
        const found = gists.find(g => g.description === '彩票分解数据同步');
        if (found) {
          gistId = found.id;
          saveGistId(gistId);
          console.log('[Gist] 找到匹配 Gist:', gistId);
        } else {
          console.log('[Gist] 未找到匹配的 Gist');
        }
      }
    }
    
    if (!gistId) {
      console.log('[Gist] 无可用 gistId，返回 null');
      return null;
    }
    
    console.log('[Gist] 加载 Gist:', gistId);
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: { Authorization: `token ${cfg.githubToken}` }
    });
    console.log('[Gist] 加载响应:', res.status);
    if (!res.ok) return null;
    const data = await res.json();
    const out = {};
    for (const [k, v] of Object.entries(data.files || {})) {
      try { out[k.replace('.json', '')] = JSON.parse(v.content); } catch {}
    }
    console.log('[Gist] 加载完成，数据键:', Object.keys(out));
    return out;
  } catch (e) {
    console.error('[Gist] 加载失败:', e);
    return null;
  }
}

export async function saveToGist(obj) {
  try {
    const cfg = getConfig();
    console.log('[Gist] 保存配置:', { hasToken: !!cfg.githubToken, hasGistId: !!cfg.gistId });
    if (!cfg.githubToken) {
      console.log('[Gist] 未配置 token，保存失败');
      return false;
    }
    const files = {};
    for (const [k, v] of Object.entries(obj)) {
      files[`${k}.json`] = { content: JSON.stringify(v, null, 2) };
    }
    console.log('[Gist] 准备保存文件:', Object.keys(files));
    let res;
    if (cfg.gistId) {
      console.log('[Gist] 更新已有 Gist:', cfg.gistId);
      res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `token ${cfg.githubToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ files })
      });
    } else {
      console.log('[Gist] 创建新 Gist...');
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
        console.log('[Gist] 创建成功，gistId:', data.id);
      }
    }
    console.log('[Gist] 保存响应:', res.status, res.ok);
    return res.ok;
  } catch (e) {
    console.error('[Gist] 保存失败:', e);
    return false;
  }
}
