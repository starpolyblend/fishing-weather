import {recordDiagnostic} from './diagnostics.js?v=0.7.4';
import {esc} from './daily.js?v=0.7.4';
export function createObservationView({request,demo,apiBase}){
 const holder=document.querySelector('#observation'),batches=new Map(),pending=new Map();let serial=0,currentPlace='';
 const names={yeolhwa:'보성군(예당)',hyanggyo:'보성',songsan:'포두',sacho:'북일'};
 const day=n=>new Date(Date.now()+32400000+n*86400000).toISOString().slice(0,10);
 const valid=d=>Number.isFinite(d?.rain)||d?.rainDash===true;
 const storage=kind=>`fishing-observation-v1:${apiBase}:${kind}`;
 function read(kind){
  if(!batches.has(kind))try{const d=JSON.parse(localStorage.getItem(storage(kind)));if(d?.date===day(kind==='yesterday'?-1:0)&&d?.observations&&Number.isFinite(d.at))batches.set(kind,d)}catch{}
  const entry=batches.get(kind);return entry?.date===day(kind==='yesterday'?-1:0)?entry:null;
 }
 async function fetchBatch(kind,force){
  if(pending.has(kind))return pending.get(kind);
  const old=read(kind),ttl=kind==='yesterday'?3600000:300000;
  if(!force&&old&&Date.now()-old.at>=0&&Date.now()-old.at<ttl)return old;
  const date=day(kind==='yesterday'?-1:0);
  const task=(async()=>{
   const data=await request(kind==='yesterday'?'/api/observation-yesterday':'/api/observation',{place:'all'});
   if(!data.observations||kind==='yesterday'&&data.date!==date.replaceAll('-',''))throw Error('OBSERVATION_FORMAT');
   const observations={};for(const id of Object.keys(names)){
    const next=data.observations[id];
    const usable=valid(next)&&(kind==='yesterday'||next.observedAt?.slice(0,10)===date);
    observations[id]=usable?next:valid(old?.observations[id])?{...old.observations[id],stale:true}:next;
   }
   const complete=Object.keys(names).every(id=>valid(observations[id])&&!observations[id].stale);
   if(!complete)recordDiagnostic({path:kind==='yesterday'?'/api/observation-yesterday':'/api/observation',result:'PARTIAL_DATA',missing:Object.keys(names).filter(id=>!valid(observations[id])||observations[id].stale)});
   // Partial data is retried after a minute, while retaining valid station readings.
   const entry={date,at:Date.now()-(complete?0:ttl-60000),observations};batches.set(kind,entry);
   try{localStorage.setItem(storage(kind),JSON.stringify(entry))}catch{}return entry;
  })();pending.set(kind,task);try{return await task}finally{pending.delete(kind)}
 }
 function paint(){
  const current=read('today')?.observations[currentPlace],previous=read('yesterday')?.observations[currentPlace];
  const rain=current?.observedAt?.slice(0,10)===day(0)&&valid(current)?Number.isFinite(current.rain)?`${current.rain}mm`:'-':'확인 불가';
  const prior=valid(previous)?Number.isFinite(previous.rain)?`${previous.rain}mm`:'-':'확인 불가';
  const time=current?.observedAt?new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(current.observedAt)):'';
  const delayed=current?.stale||current?.observedAt&&Date.now()-Date.parse(current.observedAt)>1800000;
  holder.innerHTML=`<div class="observation-line"><span>${esc(names[currentPlace]||'관측지점')} 관측</span><span>오늘 누적 강수량 <strong>${rain}</strong></span></div><p class="yesterday-rain">어제 누적 강수량 ${prior}</p><p class="observation-meta">${esc([time?`${time} 기준`:'',delayed?'갱신 지연 · 이전 관측자료':''].filter(Boolean).join(' · '))}</p>`;
 }
 async function load(place,force=false){
  const ticket=++serial;currentPlace=place;
  if(demo){holder.textContent='관측자료는 실제 정보 화면에서 확인하세요.';return}
  if(read('today'))paint();else holder.innerHTML=`<p class="observation-meta">${esc(names[place]||'관측지점')} 관측 · 강수량 확인 중…</p>`;
  await Promise.allSettled(['today','yesterday'].map(async kind=>{try{await fetchBatch(kind,force)}finally{if(ticket===serial)paint()}}));
 }
 return {load};
}
