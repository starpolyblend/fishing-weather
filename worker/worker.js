// Cloudflare 대시보드 편집기에 붙여 넣을 수 있는 단일 파일입니다.
// 인증키는 Settings > Variables and Secrets의 Secret에 KMA_SERVICE_KEY로 등록합니다.
function issueTimes(now = new Date()) {
  const t=new Date(now.getTime()+9*3600000-15*60000);
  t.setUTCHours(Math.floor((t.getUTCHours()-2)/3)*3+2,0,0,0);
  return [0,1,2].map(i=>{const d=new Date(t.getTime()-i*10800000);return {date:d.toISOString().slice(0,10).replaceAll('-',''),time:String(d.getUTCHours()).padStart(2,'0')+'00'};});
}
function numberOrNull(v){if(v==null||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n!==-999&&n!==-9999?n:null;}
function forecasts(items,issue){
  const rows=new Map();for(const it of items){if(!/^\d{8}$/.test(it.fcstDate)||!/^\d{4}$/.test(it.fcstTime))continue;
    const key=it.fcstDate+it.fcstTime;if(!rows.has(key))rows.set(key,{date:it.fcstDate,time:it.fcstTime});const r=rows.get(key),v=it.fcstValue;
    const fields={TMN:'tmin',TMX:'tmax',TMP:'temp',POP:'pop',VEC:'direction',WSD:'wind',PTY:'pty',SKY:'sky'};if(fields[it.category])r[fields[it.category]]=numberOrNull(v);
    if(it.category==='PCP')r.rain=(v==null||String(v).trim()===''||String(v)==='-999')?null:String(v);
  }
  return applyForecastKinds([...rows.values()].filter(r=>'temp'in r||'pop'in r||'wind'in r||'rain'in r||'tmin'in r||'tmax'in r).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)),issue);
}
function decodedKey(key){const k=key.trim();try{return /%[0-9a-f]{2}/i.test(k)?decodeURIComponent(k):k}catch{return k}}
function fail(message,status=502){const e=new Error(message);e.status=status;return e;}
async function fetchForecast(env,nx,ny){
  const provider=env.KMA_PROVIDER||'data-go-kr';
  if(!['data-go-kr','apihub'].includes(provider))throw fail('날씨 제공기관 설정을 확인해 주세요.',503);
  const base=provider==='apihub'?'https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0/getVilageFcst':'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';
  for(const issue of issueTimes()){
    const pageSize=1000;
    const getPage=async page=>{
      const url=new URL(base);
      Object.entries({pageNo:page,numOfRows:1000,dataType:'JSON',base_date:issue.date,base_time:issue.time,nx,ny}).forEach(([k,v])=>url.searchParams.set(k,v));
      url.searchParams.set(provider==='apihub'?'authKey':'serviceKey',decodedKey(env.KMA_SERVICE_KEY));
      let res;try{res=await fetch(url,{signal:AbortSignal.timeout(6000)})}catch{throw fail('기상청 연결이 지연됩니다. 잠시 후 새로고침해 주세요.');}
      if(!res.ok)throw fail('기상청 연결 상태를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      let json;try{json=await res.json()}catch{throw fail('기상청 응답을 읽지 못했습니다. 인증키와 활용신청 상태를 확인해 주세요.');}
      const result=json?.response, code=String(result?.header?.resultCode||'');
      if(code==='03'||code==='3')return null;
      if(!['00','0'].includes(code))throw fail(['20','21','22','30','31','32'].includes(code)?'기상청 인증키 또는 해당 API의 활용신청 상태를 확인해 주세요.':'기상청 자료를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      const raw=result?.body?.items?.item;const items=Array.isArray(raw)?raw:raw&&typeof raw==='object'?[raw]:[];
      return {items,total:Number(result?.body?.totalCount)||items.length};
    };
    const first=await getPage(1);if(!first)continue;
    const count=Math.ceil(first.total/pageSize);if(count>5)throw fail('예보 자료가 너무 많아 불러오지 못했습니다.');
    const rest=await Promise.all(Array.from({length:Math.max(0,count-1)},(_,i)=>getPage(i+2)));
    if(rest.some(page=>!page))continue;
    const all=[...first.items,...rest.flatMap(page=>page.items)];
    if(all.length<first.total)throw fail('예보 자료 일부가 누락되었습니다. 잠시 후 다시 시도해 주세요.');
    const rows=forecasts(all,issue);if(!rows.length)continue;
    return {source:'기상청 단기예보',grid:{nx,ny},issuedAt:`${issue.date.slice(0,4)}-${issue.date.slice(4,6)}-${issue.date.slice(6,8)}T${issue.time.slice(0,2)}:00:00+09:00`,fetchedAt:new Date().toISOString(),rows};
  }
  throw fail('아직 발표된 예보 자료가 없습니다. 잠시 후 다시 시도해 주세요.');
}

const waterStations=[
 {id:'4007630',name:'보성군 가장교',unit:'m',datum:'수위표수위',column:1},
 {id:'4007625',name:'보성강댐',unit:'EL.m',datum:'해발수위',column:3}
];
function waterObservedAt(text,now){
 const m=text.match(/^(\d{1,2})\.(\d{1,2})\.\s*(\d{2}):(\d{2})$/);
 if(!m)throw new Error('time');
 const month=Number(m[1]),day=Number(m[2]),hour=Number(m[3]),minute=Number(m[4]);
 if(month<1||month>12||day<1||day>31||hour>23||minute>59)throw new Error('time');
 const year=new Date(now.getTime()+9*3600000).getUTCFullYear();
 const dates=[year-1,year,year+1].map(y=>new Date(Date.UTC(y,month-1,day,hour-9,minute))).filter(d=>{const k=new Date(+d+9*3600000);return k.getUTCMonth()===month-1&&k.getUTCDate()===day}).sort((a,b)=>Math.abs(a-now)-Math.abs(b-now));
 const observed=dates[0];if(!observed||observed-now>600000)throw new Error('future');
 return observed.toISOString();
}
function parseWater(html,station,now=new Date()){
 const selected=[...html.matchAll(/<input\b[^>]*>/gi)].find(m=>/\bname=["']wlobscd["']/i.test(m[0]));
 if(!selected||!new RegExp(`\\bvalue=["']${station.id}["']`).test(selected[0]))throw new Error('station');
 const table=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[1]).find(t=>t.includes('영산강홍수통제소지점별 수위자료'));
 if(!table||!table.includes('수위표수위(m)')||!table.includes('해발수위(El.m)'))throw new Error('format');
 const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1].replace(/<[^>]+>/g,'').replace(/&nbsp;|&#160;/g,' ').trim())).filter(r=>r.length===4);
 if(!rows.length)throw new Error('empty');
 const parse=r=>({observedAt:waterObservedAt(r[0],now),level:/^-?\d+(\.\d+)?$/.test(r[station.column])?numberOrNull(r[station.column]):null});
 const latest=parse(rows[0]),end=Date.parse(latest.observedAt),samples=new Map();
 for(const row of rows){try{const point=parse(row),t=Date.parse(point.observedAt);if(t<=end&&t>=end-86400000&&!samples.has(t))samples.set(t,point)}catch{/* A malformed row remains a gap, never an invented value. */}}
 const history=[...samples.values()].sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
 const datumRow=rows.find(r=>/^-?\d+(\.\d+)?$/.test(r[1])&&/^-?\d+(\.\d+)?$/.test(r[3]));
 const gaugeDatum=datumRow?Number(datumRow[3])-Number(datumRow[1]):null;
 return {...latest,history,gaugeDatum};
}
async function fetchOfficialChart(id){
 const end=new Date(),start=new Date(+end-86400000),params=new URLSearchParams({wlobscd:id});
 // Official page uses e for the earlier date, s for the later date.
 for(const [prefix,date] of [['e',start],['s',end]]){const k=new Date(+date+32400000),v=[k.getUTCFullYear(),k.getUTCMonth()+1,k.getUTCDate(),k.getUTCHours(),Math.floor(k.getUTCMinutes()/10)*10];['year','mon','day','hour','min'].forEach((part,i)=>params.set('sel_'+prefix+part,String(v[i]).padStart(2,'0')))}
 const res=await fetch('https://www.yeongsanriver.go.kr/sumun/wlChart.do',{method:'POST',body:params,signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('chart');
 const rows=await res.json();if(!Array.isArray(rows)||!rows.length)throw Error('chart');
 const num=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
 const thresholds=[['attList','관심','#46bd0a'],['wrnList','주의','#fde700'],['almList','경계','#fc8200'],['srsList','심각','#d21d25']].flatMap(([key,name,color])=>{const value=rows.map(r=>num(r[key])).find(v=>v!==null&&v!==0);return value===undefined?[]:[{name,color,value}]});
 const section=rows.filter(r=>num(r.xVar)!==null&&num(r.yVar)!==null).map(r=>({x:num(r.xVar),y:num(r.yVar)}));
 return {thresholds,section};
}
async function fetchWater(selected=null,includeChart=true){
 const stations=await Promise.all(waterStations.filter(s=>!selected||s.id===selected).map(async station=>{
  const sourceUrl=`https://www.yeongsanriver.go.kr/sumun/waterDetail.do?wlobscd=${station.id}`;
  const base={id:station.id,name:station.name,unit:station.unit,datum:station.datum,sourceUrl};
  try{
   const chartPromise=includeChart?fetchOfficialChart(station.id).catch(()=>null):Promise.resolve(null);
   const res=await fetch(sourceUrl,{signal:AbortSignal.timeout(10000)});
   if(!res.ok)throw new Error('upstream');
   const parsed=parseWater(await res.text(),station);
   return {...base,...parsed,officialChart:await chartPromise,...(parsed.level===null?{error:'해당 시각의 수위가 제공되지 않았습니다.'}:{})};
  }catch{return {...base,level:null,observedAt:null,history:[],error:'공개 관측자료를 읽지 못했습니다. 공식 자료를 확인해 주세요.'};}
 }));
 return {source:'영산강홍수통제소 공개 수위자료',fetchedAt:new Date().toISOString(),stations};
}


// 중기육상: 광주·전남(11F20000), 중기기온: 보성/고흥/강진.
const midRegions={boseong:'11F20404',goheung:'11F20403',gangjin:'11F20303'};
function midIssueTimes(now=new Date()){
 const t=new Date(now.getTime()+9*3600000-15*60000);
 t.setUTCHours(t.getUTCHours()>=18?18:t.getUTCHours()>=6?6:-6,0,0,0);
 return [0,1].map(i=>new Date(+t-i*43200000).toISOString().slice(0,16).replace(/[-T:]/g,''));
}
function normalizeMid(land,temps,issue){
 const base=new Date(`${issue.slice(0,4)}-${issue.slice(4,6)}-${issue.slice(6,8)}T00:00:00+09:00`);
 return Array.from({length:8},(_,n)=>{
  const i=n+3,allDay=i>=8&&!land[`wf${i}Am`];
  const parts=(allDay?['']:['Am','Pm']).map(suffix=>({weather:land[`wf${i}${suffix}`]||null,pop:numberOrNull(land[`rnSt${i}${suffix}`])}));
  return {date:new Date(+base+i*86400000+9*3600000).toISOString().slice(0,10).replaceAll('-',''),min:numberOrNull(temps[`taMin${i}`]),max:numberOrNull(temps[`taMax${i}`]),allDay,parts};
 }).filter(d=>d.min!==null||d.max!==null||d.parts.some(p=>p.weather||p.pop!==null));
}
async function fetchMid(env,region){
 if((env.KMA_PROVIDER||'data-go-kr')!=='data-go-kr')throw fail('중기예보는 공공데이터포털 연결 설정이 필요합니다.',503);
 const key=env.KMA_MID_SERVICE_KEY||env.KMA_SERVICE_KEY;
 if(!key)throw fail('중기예보 인증키 설정을 확인해 주세요.',503);
 for(const issue of midIssueTimes()){
  const get=async(method,regId)=>{
   const url=new URL(`https://apis.data.go.kr/1360000/MidFcstInfoService/${method}`);
   Object.entries({serviceKey:decodedKey(key),pageNo:1,numOfRows:10,dataType:'JSON',regId,tmFc:issue}).forEach(([k,v])=>url.searchParams.set(k,v));
   let res;try{res=await fetch(url,{signal:AbortSignal.timeout(8000)})}catch{throw fail('중기예보 연결이 지연됩니다. 잠시 후 다시 확인해 주세요.');}
   if(!res.ok)throw fail('중기예보 연결을 확인해 주세요. 해당 서비스 활용신청이 필요할 수 있습니다.');
   let body;try{body=await res.json()}catch{throw fail('중기예보 인증키와 중기예보 조회서비스 활용신청 상태를 확인해 주세요.');}
   const response=body?.response,code=String(response?.header?.resultCode??'');
   if(['03','3'].includes(code))return null;
   if(!['00','0'].includes(code))throw fail('중기예보 조회서비스 활용신청 또는 인증키 상태를 확인해 주세요.');
   const raw=response?.body?.items?.item,item=Array.isArray(raw)?raw[0]:raw;
   if(!item||typeof item!=='object')return null;
   if((item.regId||item.regid)&&String(item.regId||item.regid)!==regId)throw fail('중기예보 지역이 일치하지 않습니다.');
   return item;
  };
  const [land,temps]=await Promise.all([get('getMidLandFcst','11F20000'),get('getMidTa',midRegions[region])]);
  if(!land||!temps)continue;
  const days=normalizeMid(land,temps,issue);if(!days.length)continue;
  return {source:'기상청 중기예보',region,landRegion:'광주·전남',issuedAt:`${issue.slice(0,4)}-${issue.slice(4,6)}-${issue.slice(6,8)}T${issue.slice(8,10)}:00:00+09:00`,fetchedAt:new Date().toISOString(),days};
 }
 throw fail('아직 중기예보 자료가 제공되지 않았습니다.');
}

// Coalesce identical cache misses within this Worker instance.
const pendingUpstream=new Map();
async function shared(key,task){
 if(pendingUpstream.has(key))return pendingUpstream.get(key);
 const promise=task();pendingUpstream.set(key,promise);
 try{return await promise}finally{pendingUpstream.delete(key)}
}
export default {
  async fetch(request,env,ctx){
    const started=Date.now();
    const origin=request.headers.get('Origin')||'',allowed=(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean);
    const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
    const respond=(data,status=200)=>{headers['Server-Timing']=`worker;dur=${Date.now()-started}`;return new Response(JSON.stringify(data),{status,headers})};
    if(origin&&!allowed.includes(origin))return respond({message:'허용된 사이트 주소를 확인해 주세요.'},403);
    if(origin)headers['Access-Control-Allow-Origin']=origin;
    if(request.method==='OPTIONS'){headers['Access-Control-Allow-Methods']='GET, OPTIONS';return new Response(null,{status:204,headers});}
    if(request.method!=='GET')return respond({message:'GET 요청만 지원합니다.'},405);
    const url=new URL(request.url);
    if(url.pathname==='/api/health')return respond({ok:true,version:'0.5.0',weatherKeyConfigured:!!env.KMA_SERVICE_KEY,originsConfigured:allowed.length>0});
    if(url.pathname==='/api/mid'){
      const region=url.searchParams.get('region');
      if(!Object.hasOwn(midRegions,region))return respond({message:'중기예보 지역을 확인해 주세요.'},400);
      try{
        const cache=globalThis.caches?.default,key=new Request(`${url.origin}/cache/mid-v1/${region}/${midIssueTimes()[0]}`);
        const hit=cache?await cache.match(key):null;if(hit)return respond(await hit.json());
        const data=await shared(key.url,()=>fetchMid(env,region));
        if(cache&&ctx?.waitUntil)ctx.waitUntil(cache.put(key,new Response(JSON.stringify(data),{headers:{'Cache-Control':'public, max-age=1800'}})));
        return respond(data);
      }catch(e){return respond({message:e.status?e.message:'중기예보를 불러오지 못했습니다.'},e.status||502);}
    }
    if(url.pathname==='/api/water'||url.pathname==='/api/water-chart'){
      const id=url.searchParams.get('station'),chartOnly=url.pathname==='/api/water-chart';
      if((id&&!waterStations.some(s=>s.id===id))||(chartOnly&&!id))return respond({message:'관측소를 확인해 주세요.'},400);
      try{
        const cache=globalThis.caches?.default,key=new Request(`${url.origin}/cache/water-v4/${chartOnly?'chart':'level'}/${id||'all'}`);
        const hit=cache?await cache.match(key):null;if(hit){headers['X-Data-Cache']='hit';return respond(await hit.json())}
        headers['X-Data-Cache']='miss';
        const data=await shared(key.url,async()=>chartOnly?{station:id,officialChart:await fetchOfficialChart(id),fetchedAt:new Date().toISOString()}:await fetchWater(id,!id));
        if(cache&&ctx?.waitUntil&&(chartOnly||data.stations.every(s=>s.level!==null)))ctx.waitUntil(cache.put(key,new Response(JSON.stringify(data),{headers:{'Cache-Control':`public, max-age=${chartOnly?1800:300}`}})));
        return respond(data);
      }catch{return respond({message:chartOnly?'그래프 부가자료를 가져오지 못했습니다.':'수위 자료를 가져오지 못했습니다.'},502);}
    }
    if(url.pathname!=='/api/weather')return respond({message:'주소를 확인해 주세요.'},404);
    if(!env.KMA_SERVICE_KEY)return respond({message:'날씨 연결을 준비하고 있습니다.'},503);
    const nx=Number(url.searchParams.get('nx')),ny=Number(url.searchParams.get('ny'));
    if(!Number.isInteger(nx)||!Number.isInteger(ny)||nx<1||nx>149||ny<1||ny>253)return respond({message:'예보 위치를 확인해 주세요.'},400);
    // 선택사항: 예: 57,34;58,34. 등록한 격자 외 호출을 차단합니다.
    if(env.ALLOWED_GRIDS&&!env.ALLOWED_GRIDS.split(';').map(s=>s.trim()).includes(`${nx},${ny}`))return respond({message:'등록된 예보 위치가 아닙니다.'},400);
    const key=new Request(`${url.origin}/cache/weather-v4/${env.KMA_PROVIDER||'data-go-kr'}/${nx}/${ny}`);
    try{
      const cache=globalThis.caches?.default;
      const cached=cache?await cache.match(key):null;
      if(cached)return respond(await cached.json());
      const data=await shared(key.url,()=>fetchForecast(env,nx,ny));
      if(cache&&ctx?.waitUntil)ctx.waitUntil(cache.put(key,new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=300'}})));
      return respond(data);
    }catch(e){return respond({message:e.status?e.message:'자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'},e.status||502);}
  }
};
export {issueTimes,forecasts,decodedKey,parseWater,waterStations,midIssueTimes,normalizeMid};

function applyForecastKinds(rows,issue){
 if(!issue||!/^\d{8}$/.test(issue.date)||!/^\d{4}$/.test(issue.time))return rows;
 const start=new Date(`${issue.date.slice(0,4)}-${issue.date.slice(4,6)}-${issue.date.slice(6,8)}T00:00:00+09:00`);
 const offset=Number(issue.time)>=1700?4:3;
 const boundary=new Date(+start+offset*86400000+9*3600000).toISOString().slice(0,10).replaceAll('-','')+'0000';
 for(const r of rows){
  if(r.date+r.time<=boundary)continue;
  r.qualitative=true;
  if(r.wind!=null){r.windCode=r.wind;r.windLabel=({1:'약함',2:'약간 강함',3:'강함'})[r.wind]||null;r.wind=null;}
  if(r.rain!=null&&/^\d+(\.0+)?$/.test(r.rain))r.rain=({0:'강수없음',1:'3mm 미만',2:'3~15mm 미만',3:'15mm 이상'})[Number(r.rain)]??null;
 }
 return rows;
}
