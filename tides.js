import {esc} from './daily.js?v=0.6.0';
const names={'한물':'1물','두물':'2물','세물':'3물','네물':'4물','다섯물':'5물','여섯물':'6물','일곱물':'7물','여덟물':'8물','아홉물':'9물','열물':'10물','열한물':'11물','열두물':'12물','열셋물':'13물','열세물':'13물','열넷물':'14물','열네물':'14물','조금':'조금'};
const todayKey=()=>new Date(Date.now()+32400000).toISOString().slice(0,10).replaceAll('-','');
function offset(date,n){const d=new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T12:00:00+09:00`);return new Date(+d+n*86400000+32400000).toISOString().slice(0,10).replaceAll('-','')}
function number(v){return Number.isFinite(v)?String(Math.round(v*10)/10):'—'}
function enrich(days){
 const events=[...days.values()].flatMap(d=>d.events||[]).map(e=>({...e,delta:null})).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at)),lookup=new Map();
 for(let i=0;i<events.length;i++){
  const current=events[i],previous=events[i-1],gap=previous?Date.parse(current.at)-Date.parse(previous.at):0;
  if(previous&&previous.type!==current.type&&gap>0&&gap<=18*3600000&&Number.isFinite(current.height)&&Number.isFinite(previous.height)){
   const delta=current.height-previous.height;
   if((current.type==='high'&&delta>=0)||(current.type==='low'&&delta<=0))current.delta=delta;
  }
  lookup.set(current.at,current);
 }
 return lookup;
}
export function createTideView({request,apiBase,demo}){
 const content=document.querySelector('#tide-content'),refresh=document.querySelector('#tide-refresh');let serial=0,dayKey='',memory=new Map();
 const storageKey=i=>`fishing-tide-v1:${apiBase}:${i}`;
 async function load(force=false){
  const ticket=++serial,today=todayKey();if(dayKey!==today){dayKey=today;memory=new Map()}
  if(demo){content.innerHTML='<p class="notice">물때는 예시 숫자를 표시하지 않습니다. 실제 정보 화면에서 확인해 주세요.</p>';refresh.disabled=false;return}
  const starts=[offset(today,-1),offset(today,6)],records=new Map(),states=['pending','pending'],errors=[];
  const entries=starts.map((start,i)=>{
   let entry=memory.get(start);
   if(!entry)try{const stored=JSON.parse(localStorage.getItem(storageKey(i)));if(stored?.data?.start===start&&stored.data.station?.id==='SO_0757'&&Array.isArray(stored.data.days))entry={...stored,restored:true}}catch{}
   if(!entry||!Number.isFinite(entry.at)||Date.now()-entry.at<0||Date.now()-entry.at>=21600000)return null;
   records.set(start,entry.data);return entry;
  });
  const render=()=>{
   if(ticket!==serial)return;
   const days=new Map();for(const data of records.values())for(const d of data.days)days.set(d.date,d);
   const lookup=enrich(days),pending=states.includes('pending');
   const eventHTML=(events,type)=>{const filtered=events.filter(e=>e.type===type);return filtered.length?filtered.map(e=>{
    const d=lookup.get(e.at)?.delta,delta=d===null||d===undefined?'—':`${d>0?'▲ +':d<0?'▼ −':''}${number(Math.abs(d))}cm`;
    return `<div class="tide-event ${type}"><strong>${esc(e.time)}</strong><span>높이 ${Number.isFinite(e.height)?number(e.height)+'cm':'—'}</span><span class="tide-delta ${d>0?'up':d<0?'down':'flat'}">${delta}</span></div>`;
   }).join(''):'<span class="tide-no-event">—</span>'};
   const rows=Array.from({length:10},(_,i)=>{
    const date=offset(today,i),d=days.get(date),weekday=new Intl.DateTimeFormat('ko-KR',{weekday:'short',timeZone:'Asia/Seoul'}).format(new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T12:00:00+09:00`)),label=`${Number(date.slice(4,6))}/${Number(date.slice(6,8))}`,which=i<6?0:1;
    const empty=d?'예보 없음':states[which]==='pending'?'확인 중':'확인 불가';
    return `<tr${i===0?' class="tide-today"':''}><th scope="row"><strong>${label}</strong><span>(${weekday})</span>${i===0?'<small>오늘</small>':''}</th><td class="tide-mool">${esc(names[d?.mool]||d?.mool||'—')}</td>${d?.events?.length?`<td>${eventHTML(d.events,'high')}</td><td>${eventHTML(d.events,'low')}</td>`:`<td colspan="2" class="tide-missing">${empty}</td>`}</tr>`;
   }).join('');
   const fetched=[...records.values()].map(d=>d.fetchedAt).filter(Boolean).sort()[0];
   content.innerHTML=`${pending?`<p class="loading-note">${records.size?'저장된 자료부터 표시 · 최신 물때 확인 중…':'물때를 가져오는 중입니다…'}</p>`:''}${errors.length?`<p class="notice">${esc([...new Set(errors)].join(' '))}${records.size?' 저장된 자료가 있는 날짜는 이전 자료를 표시합니다.':''}</p>`:''}<p class="tide-table-note">오늘부터 10일 · 남해 8물때식</p><table class="tide-table"><caption class="sr-only">안남리 기준 10일 물때표. 각 시각 아래 높이와 직전 대비 증감은 cm입니다.</caption><colgroup><col class="tide-date-col"><col class="tide-mool-col"><col><col></colgroup><thead><tr><th scope="col">날짜</th><th scope="col">물때</th><th scope="col">▲ 만조</th><th scope="col">▼ 간조</th></tr></thead><tbody>${rows}</tbody></table><p class="meta">+ / − : 직전 간조·만조와의 높이 차이${fetched?`<br>자료 조회 ${esc(new Date(fetched).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}))}`:''}</p>`;
  };
  refresh.disabled=true;render();
  await Promise.allSettled(starts.map(async(start,i)=>{
   const entry=entries[i];
   if(!force&&entry&&!entry.restored){states[i]='done';render();return}
   try{
    const data=await request('/api/tide',{start});
    if(data.start!==start||data.station?.id!=='SO_0757'||!Array.isArray(data.days))throw Error('물때 연결을 확인해 주세요. Worker 업데이트가 필요할 수 있습니다.');
    records.set(start,data);
    if(data.days.length===7&&data.days.every(d=>d.events?.length)){const next={at:Date.now(),data};memory.set(start,next);try{localStorage.setItem(storageKey(i),JSON.stringify(next))}catch{}}
    states[i]='done';
   }catch(e){states[i]='error';errors.push(e.message||'일부 날짜의 물때를 확인할 수 없습니다.')}
   finally{render()}
  }));
  if(ticket===serial)refresh.disabled=false;
 }
 return {load};
}
