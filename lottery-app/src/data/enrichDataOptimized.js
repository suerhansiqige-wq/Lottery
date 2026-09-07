// O(n) enrichData - 支持displayCount按需计算
// 策略：G2/G4增量状态遍历全部数据，但只对末尾N+lookback行创建完整对象
export function enrichData(data, displayCount) {
  const n = data.length;
  // displayCount=0/undefined时处理全部；否则只处理最后displayCount+lookback行
  const lookback = 3; // canKaoEr需要前2期 + 1安全余量
  const processCount = displayCount ? Math.min(n, displayCount + lookback) : n;
  const startIdx = n - processCount;

  let prevG2 = Array(10).fill(null);
  let prevG4 = Array(10).fill(null);

  // 第一遍：遍历全部数据维护G2/G4增量状态，只对末尾行创建对象
  const pass1 = [];
  for (let index = 0; index < n; index++) {
    const item = data[index];
    const digits = [item.d1, item.d2, item.d3];
    // G1/G3/curG2/curG4 轻量计算（不创建对象）
    const g1=Array(10).fill(0);
    for(let d=0;d<=9;d++){for(let k=0;k<3;k++){const idx=index-k;if(idx>=0){const dd=data[idx];if(dd.d1===d||dd.d2===d||dd.d3===d){g1[d]=1;break;}}}}
    const g3=Array(10).fill(0);
    for(let d=0;d<=9;d++){for(const cd of digits){if(cd+1===d||cd-1===d){g3[d]=1;break;}}}
    const curG2=Array(10).fill(null);
    for(let d=0;d<=9;d++){if(g1[d]===1)curG2[d]=null;else curG2[d]=(prevG2[d]!==null)?prevG2[d]:d;}
    const drawSet=new Set(digits);
    const curG4=Array(10).fill(null);
    for(let d=0;d<=9;d++){if(g3[d]===1&&!drawSet.has(d))curG4[d]=d;else curG4[d]=null;}
    prevG2=curG2;prevG4=curG4;

    // 只对末尾processCount行创建完整对象
    if (index >= startIdx) {
      const sum = item.d1 + item.d2 + item.d3;
      const span = Math.max(...digits) - Math.min(...digits);
      const hAdd = [(item.d1+item.d2)%10,(item.d2+item.d3)%10,(item.d3+item.d1)%10];
      const hSub = [Math.abs(item.d1-item.d2),Math.abs(item.d2-item.d3),Math.abs(item.d3-item.d1)];
      let vAdd=[null,null,null], vSub=[null,null,null];
      if (index>0) {
        const prev=data[index-1];
        vAdd=[(item.d1+prev.d1)%10,(item.d2+prev.d2)%10,(item.d3+prev.d3)%10];
        vSub=[Math.abs(item.d1-prev.d1),Math.abs(item.d2-prev.d2),Math.abs(item.d3-prev.d3)];
      }
      const mustOutNums=Array(10).fill(-1);
      for(let d=0;d<=9;d++){if(curG2[d]===null&&curG4[d]===null)mustOutNums[d]=d;}
      const shenghao=Array(10).fill(-1),lianhao=Array(10).fill(-1);
      for(let d=0;d<=9;d++){if(curG2[d]!==null)shenghao[d]=curG2[d];if(curG4[d]!==null)lianhao[d]=curG4[d];}
      const trackGroups=[g1,shenghao,g3,lianhao,mustOutNums];
      const uniqueDigits=[...new Set(digits)].sort((a,b)=>a-b);
      const allCalcValues=new Set([...hSub,...hAdd,...(vSub[0]!==null?vSub:[]),...(vAdd[0]!==null?vAdd:[])]);
      const canKaoYi=[];for(let d=0;d<=9;d++){if(!allCalcValues.has(d))canKaoYi.push(d);}
      pass1.push({...item,digits,sum,span,hAdd,hSub,vAdd,vSub,uniqueDigits,shenghao,lianhao,mustOutNums,canKaoYi,trackGroups});
    }
  }

  // 第二遍：只对最后displayCount行计算canKaoEr/danMa等重计算
  // lookback行不计算（App.jsx只用最后一行的danMa等）
  const displayStartInPass1 = displayCount ? Math.max(0, processCount - displayCount) : 0;
  return pass1.map((enriched, localIdx) => {
    if (localIdx < displayStartInPass1) return enriched;
    const shenghaoDigits=new Set();
    for(let k=0;k<3;k++){const idx=localIdx-k;if(idx>=0){pass1[idx].shenghao.forEach(v=>{if(v!==-1)shenghaoDigits.add(v);});}}
    const canKaoEr=[];for(let d=0;d<=9;d++){if(!shenghaoDigits.has(d))canKaoEr.push(d);}
    const sumDigits=String(enriched.sum).split('').map(Number);
    const groupA=new Set([...enriched.digits,...sumDigits,enriched.span]);
    const groupB=new Set([...enriched.mustOutNums.filter(v=>v!==-1),...enriched.canKaoYi,...canKaoEr]);
    const danMa=[];for(let d=0;d<=9;d++){const inA=groupA.has(d),inB=groupB.has(d);if((inA&&!inB)||(!inA&&inB))danMa.push(d);}
    danMa.sort((a,b)=>a-b);
    const mustOutSet=new Set(enriched.mustOutNums.filter(v=>v!==-1));
    const canKaoYiSet=new Set(enriched.canKaoYi),canKaoErSet=new Set(canKaoEr);
    const chuXianCi1=[],chuXianCi2=[];
    for(let d=0;d<=9;d++){const count=[mustOutSet,canKaoYiSet,canKaoErSet].filter(s=>s.has(d)).length;if(count===1)chuXianCi1.push(d);if(count>=2)chuXianCi2.push(d);}
    const danMaSet=new Set(danMa);const zuSan1=[];for(let d=0;d<=9;d++){if(!danMaSet.has(d))zuSan1.push(d);}
    const cxSet=new Set([...chuXianCi1,...chuXianCi2]);const zuSan2=[];for(const d of danMa){if(cxSet.has(d))zuSan2.push(d);}
    return{...enriched,canKaoEr,danMa,chuXianCi1,chuXianCi2,zuSan1,zuSan2};
  });
}
