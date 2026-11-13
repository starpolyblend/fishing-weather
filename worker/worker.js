// Cloudflare 대시보드 편집기에 붙여 넣을 수 있는 단일 파일입니다.
// 인증키는 Settings > Variables and Secrets의 Secret에 KMA_SERVICE_KEY로 등록합니다.
function issueTimes(now = new Date()) {
  const t=new Date(now.getTime()+9*3600000-15*60000);
  t.setUTCHours(Math.floor((t.getUTCHours()-2)/3)*3+2,0,0,0);
  return [0,1,2].map(i=>{const d=new Date(t.getTime()-i*10800000);return {date:d.toISOString().slice(0,10).replaceAll('-',''),time:String(d.getUTCHours()).padStart(2,'0')+'00'};});
}
function numberOrNull(v){if(v==null||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n!==-999&&n!==-9999?n:null;}
function forecasts(items){
  const rows=new Map();for(const it of items){if(!/^\d{8}$/.test(it.fcstDate)||!/^\d{4}$/.test(it.fcstTime))continue;
    const key=it.fcstDate+it.fcstTime;if(!rows.has(key))rows.set(key,{date:it.fcstDate,time:it.fcstTime});const r=rows.get(key),v=it.fcstValue;
    const fields={TMP:'temp',POP:'pop',WSD:'wind',PTY:'pty',SKY:'sky'};if(fields[it.category])r[fields[it.category]]=numberOrNull(v);
    if(it.category==='PCP')r.rain=(v==null||String(v).trim()===''||String(v)==='-999')?null:String(v);
  }
  return [...rows.values()].filter(r=>'temp'in r||'pop'in r||'wind'in r||'rain'in r).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
function decodedKey(key){const k=key.trim();try{return /%[0-9a-f]{2}/i.test(k)?decodeURIComponent(k):k}catch{return k}}
function fail(message,status=502){const e=new Error(message);e.status=status;return e;}
async function fetchForecast(env,nx,ny){
  const provider=env.KMA_PROVIDER||'data-go-kr';
  if(!['data-go-kr','apihub'].includes(provider))throw fail('날씨 제공기관 설정을 확인해 주세요.',503);
  const base=provider==='apihub'?'https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst':'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
  for(const issue of issueTimes()){
    let all=[], total=0;
    for(let page=1;page<=5;page++){
      const url=new URL(base);
      Object.entries({pageNo:page,numOfRows:1000,dataType:'JSON',base_date:issue.date,base_time:issue.time,nx,ny}).forEach(([k,v])=>url.searchParams.set(k,v));
      url.searchParams.set(provider==='apihub'?'authKey':'serviceKey',decodedKey(env.KMA_SERVICE_KEY));
      let res;try{res=await fetch(url,{signal:AbortSignal.timeout(6000)})}catch{throw fail('기상청 연결이 지연됩니다. 잠시 후 새로고침해 주세요.');}
      if(!res.ok)throw fail('기상청 연결 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      let json;try{json=await res.json()}catch{throw fail('기상청 응답을 읽지 못했습니다. 인증키와 활용신청 상태를 확인해 주세요.');}
      const result=json?.response, code=String(result?.header?.resultCode||'');
      if(code==='03'||code==='3'){all=[];break;}
      if(!['00','0'].includes(code))throw fail(['20','21','22','30','31','32'].includes(code)?'기상청 인증키 또는 해당 API의 활용신청 상태를 확인해 주세요.':'기상청 자료를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      const raw=result?.body?.items?.item;const items=Array.isArray(raw)?raw:raw&&typeof raw==='object'?[raw]:[];
      all.push(...items);total=Number(result?.body?.totalCount)||all.length;
      if(all.length>=total||items.length===0)break;
      if(page===5)throw fail('예보 자료가 너무 많아 불러오지 못했습니다.');
    }
    const rows=forecasts(all);if(!rows.length)continue;
    return {source:'기상청 단기예보',grid:{nx,ny},issuedAt:`${issue.date.slice(0,4)}-${issue.date.slice(4,6)}-${issue.date.slice(6,8)}T${issue.time.slice(0,2)}:00:00+09:00`,fetchedAt:new Date().toISOString(),rows};
  }
  throw fail('아직 발표된 예보 자료가 없습니다. 잠시 후 다시 시도해 주세요.');
}

const waterStations=[
 {id:'4007630',name:'보성군 가장교',unit:'m',datum:'수위표수위',column:1},
 {id:'4007625',name:'보성강댐',unit:'EL.m',datum:'해발수위',column:3}
];
function parseWater(html,station,now=new Date()){
 if(!html.includes(`value="${station.id}"`))throw new Error('station');
 const table=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]).find(t=>t.includes('영산강홍수통제소지점별 수위자료'));
 if(!table||!table.includes('수위표수위(m)')||!table.includes('해발수위(El.m)'))throw new Error('format');
 const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1].replace(/<[^>]+>/g,'').replace(/&nbsp;|&#160;/g,' ').trim())).filter(r=>r.length===4);
 if(!rows.length)throw new Error('empty');
 const r=rows[0],m=r[0].match(/^(\d{1,2})\.(\d{1,2})\.\s*(\d{2}):(\d{2})$/);
 if(!m)throw new Error('time');
 const year=new Date(now.getTime()+9*3600000).getUTCFullYear();
 const dates=[year-1,year,year+1].map(y=>new Date(`${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}T${m[3]}:${m[4]}:00+09:00`)).filter(d=>Number.isFinite(+d)).sort((a,b)=>Math.abs(a-now)-Math.abs(b-now));
 const observed=dates[0];if(!observed||observed-now>600000)throw new Error('future');
 const raw=r[station.column],level=/^-?\d+(\.\d+)?$/.test(raw)?numberOrNull(raw):null;
 return {level,observedAt:observed.toISOString()};
}
async function fetchWater(){
 const stations=await Promise.all(waterStations.map(async station=>{
  const sourceUrl=`https://www.yeongsanriver.go.kr/sumun/waterDetail.do?wlobscd=${station.id}`;
  const base={id:station.id,name:station.name,unit:station.unit,datum:station.datum,sourceUrl};
  try{
   const res=await fetch(sourceUrl,{signal:AbortSignal.timeout(10000)});
   if(!res.ok)throw new Error('upstream');
   const parsed=parseWater(await res.text(),station);
   return {...base,...parsed,...(parsed.level===null?{error:'해당 시각의 수위가 제공되지 않았습니다.'}:{})};
  }catch{return {...base,level:null,observedAt:null,error:'공개 관측자료를 읽지 못했습니다. 공식 자료를 확인해 주세요.'};}
 }));
 return {source:'영산강홍수통제소 공개 수위자료',fetchedAt:new Date().toISOString(),stations};
}

export default {
  async fetch(request,env,ctx){
    const origin=request.headers.get('Origin')||'',allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    const respond=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
    if(origin&&!allowed.includes(origin))return respond({message:'허용된 사이트 주소를 확인해 주세요.'},403);
    if(origin)headers['Access-Control-Allow-Origin']=origin;
    if(request.method==='OPTIONS'){headers['Access-Control-Allow-Methods']='GET, OPTIONS';return new Response(null,{status:204,headers});}
    if(request.method!=='GET')return respond({message:'GET 요청만 지원합니다.'},405);
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return respond({ok:true,version:'0.2.0',weatherKeyConfigured:!!env.KMA_SERVICE_KEY,originsConfigured:allowed.length>0});
    if(url.pathname==='/api/water'){
      try{
        const cache=globalThis.caches?.default,key=new Request(`${url.origin}/cache/water-v1`);
        const hit=cache?await cache.match(key):null;if(hit)return respond(await hit.json());
        const data=await fetchWater();
        if(cache&&ctx?.waitUntil&&data.stations.every(s=>s.level!==null))ctx.waitUntil(cache.put(key,new Response(JSON.stringify(data),{headers:{'Cache-Control':'public, max-age=300'}})));
        return respond(data);
      }catch{return respond({message:'수위 자료를 가져오지 못했습니다.'},502);}
    }
    if(url.pathname!=='/api/weather')return respond({message:'주소를 확인해 주세요.'},404);
    if(!env.KMA_SERVICE_KEY)return respond({message:'날씨 연결을 준비하고 있습니다.'},503);
    const nx=Number(url.searchParams.get('nx')),ny=Number(url.searchParams.get('ny'));
    if(!Number.isInteger(nx)||!Number.isInteger(ny)||nx<1||nx>149||ny<1||ny>253)return respond({message:'예보 위치를 확인해 주세요.'},400);
    // 선택사항: 예: 57,34;58,34. 등록한 격자 외 호출을 차단합니다.
    if(env.ALLOWED_GRIDS&&!env.ALLOWED_GRIDS.split(';').map(s=>s.trim()).includes(`${nx},${ny}`))return respond({message:'등록된 예보 위치가 아닙니다.'},400);
    const key=new Request(`${url.origin}/cache/weather-v1/${env.KMA_PROVIDER||'data-go-kr'}/${nx}/${ny}`);
    try{
      const cache=globalThis.caches?.default;
      const cached=cache?await cache.match(key):null;
      if(cached)return respond(await cached.json());
      const data=await fetchForecast(env,nx,ny);
      if(cache&&ctx?.waitUntil)ctx.waitUntil(cache.put(key,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=300'}})));
      return respond(data);
    }catch(e){return respond({message:e.status?e.message:'자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},e.status||502);}
  }
};
export {issueTimes,forecasts,decodedKey,parseWater,waterStations};
