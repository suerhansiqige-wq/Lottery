// GitHub Gist 跨设备数据同步（免费方案）
// 配置：public/gist-config.json（需用户填入 GitHub Token 和 Gist ID）

export async function loadFromGist() {
  try {
    const cfg = await fetch('./gist-config.json').then(r => r.json());
    if (!cfg.githubToken || !cfg.gistId) return null;
    const res = await fetch(`https://api.github.com/gists/${cfg.gistId}`, {
      headers: { Authorization: `token ${cfg.githubToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const out = {};
    for (const [k, v] of Object.entries(data.files || {})) {
      try { out[k.replace('.json', '')] = JSON.parse(v.content); } catch {}
    }
    return out;
  } catch { return null; }
}

export async function saveToGist(obj) {
  try {
    const cfg = await fetch('./gist-config.json').then(r => r.json());
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
        const cfgRes = await fetch('./gist-config.json');
        const cfgText = await cfgRes.text();
        const newCfg = cfgText.replace('"gistId": ""', `"gistId": "${data.id}"`);
        try {
          await fetch('/api/save-gist-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gistId: data.id })
          });
        } catch {}
      }
    }
    return res.ok;
  } catch { return false; }
}
