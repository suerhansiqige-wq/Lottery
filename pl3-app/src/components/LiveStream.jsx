// 开奖直播组件：嵌入新浪彩票官方直播流
// 福彩3D 每晚 21:15 开奖，排列三每晚 21:25 开奖
const LIVE_STREAM_URLS = {
  fc3d: 'https://lottery.sina.com.cn/video/fcopen/',
  pl3: 'https://sports.sina.com.cn/lottery/video/tcopen/',
};

export default function LiveStream({ type = 'pl3' }) {
  const url = LIVE_STREAM_URLS[type] || LIVE_STREAM_URLS.pl3;
  const title = type === 'fc3d' ? '福彩3D开奖直播' : '排列三开奖直播';
  const schedule = type === 'fc3d' ? '每晚 21:15' : '每晚 21:25';

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{title}</span>
        <span style={{ fontSize: 13, color: '#666', fontWeight: 400 }}>开奖时间：{schedule}</span>
      </div>
      <div style={{ width: '100%', height: 480, background: '#000', borderRadius: 4, overflow: 'hidden' }}>
        <iframe
          src={url}
          title={title}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}
