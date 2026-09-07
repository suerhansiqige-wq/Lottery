// 获取排列三2024年历史数据
const https = require('https');

function fetchPage(pageNo, pageSize = 100) {
  return new Promise((resolve, reject) => {
    const url = `https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=35&provinceId=0&pageSize=${pageSize}&isVerify=1&pageNo=${pageNo}`;
    const options = {
      headers: {
        'Referer': 'https://www.lottery.gov.cn/',
        'Origin': 'https://www.lottery.gov.cn',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch(e) {
          reject(new Error(`Parse error: ${data.substring(0, 200)}`));
        }
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('获取排列三2024年数据...');
  
  const allDraws = [];
  let pageNo = 1;
  let hasMore = true;
  
  while (hasMore) {
    console.log(`  获取第${pageNo}页...`);
    try {
      const result = await fetchPage(pageNo, 100);
      if (!result || !result.value || !result.value.list || result.value.list.length === 0) {
        hasMore = false;
        break;
      }
      
      const draws = result.value.list;
      for (const draw of draws) {
        // 期号格式: 2024001 -> 24001
        const issue = draw.lotteryDrawNum;
        const nums = draw.lotteryDrawResult.split(' ').map(Number);
        
        // 只取2024年的数据
        if (issue.startsWith('2024')) {
          allDraws.push({
            issue: issue.substring(2), // 2024001 -> 24001
            d1: nums[0],
            d2: nums[1],
            d3: nums[2],
            fullIssue: issue
          });
        }
        
        // 如果已经到2023年的数据，停止
        if (issue.startsWith('2023')) {
          hasMore = false;
          break;
        }
      }
      
      console.log(`  本页${draws.length}条, 已获取2024年${allDraws.length}条`);
      pageNo++;
      
      // 安全检查
      if (pageNo > 10) {
        hasMore = false;
        console.log('  达到最大页数限制');
      }
    } catch(e) {
      console.error(`  获取失败: ${e.message}`);
      hasMore = false;
    }
  }
  
  // 按期号排序（从早到晚）
  allDraws.sort((a, b) => a.issue.localeCompare(b.issue));
  
  console.log(`\n2024年排列三数据: ${allDraws.length}期`);
  if (allDraws.length > 0) {
    console.log(`  首期: ${allDraws[0].issue} (${allDraws[0].fullIssue})`);
    console.log(`  末期: ${allDraws[allDraws.length-1].issue} (${allDraws[allDraws.length-1].fullIssue})`);
  }
  
  // 输出为JS格式
  console.log('\n// 生成lotteryData2024.js格式:');
  console.log('export const lotteryData2024 = [');
  for (const d of allDraws) {
    console.log(`  { issue: '${d.issue}', d1: ${d.d1}, d2: ${d.d2}, d3: ${d.d3} },`);
  }
  console.log('];');
}

main().catch(console.error);
