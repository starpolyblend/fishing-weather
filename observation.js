import {esc} from './daily.js?v=0.6.3';
export function createObservationView({request,demo}){
 const holder=document.querySelector('#observation'),memory=new Map();let serial=0;
 const names={yeolhwa:'보성군',hyanggyo:'보성',songsan:'포두',sacho:'북일'};
 const today=()=>new Date(Date.now()+32400000).toISOString().slice(0,10);
 function paint(data,note=''){
  const sameDay=data?.observedAt?.slice(0,10)===today();
  const rain=sameDay&&Number.isFinite(data?.rain)?`${data.rain}mm`:'확인 불가';
  const name=data?.station?.name||'가까운 관측지점';
  const time=data?.observedAt?new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Seoul'}).format(new Date(data.observedAt)):'';
  const delayed=data?.observedAt&&Date.now()-Date.parse(data.observedAt)>1800000;
  holder.innerHTML=`<div class="observation-line"><span>${esc(name)} 관측</span><span>오늘 누적 강수량 <strong>${rain}</strong></span></div><p class="observation-meta">${esc([time?`${time} 기준`:'',delayed?'자료 지연':'',note||data?.message||''].filter(Boolean).join(' · '))}</p>`;
 }
 async function load(place,force=false){
  const ticket=++serial;
  if(demo){holder.textContent='관측자료는 실제 정보 화면에서 확인하세요.';return}
  const cached=memory.get(place);
  const usable=cached&&cached.data.observedAt?.slice(0,10)===today()&&Date.now()-cached.at<1800000;
  if(usable)paint(cached.data);else holder.innerHTML=`<p class="observation-meta">${esc(names[place]||'관측지점')} 관측 · 오늘 누적 강수량 확인 중…</p>`;
  if(!force&&usable&&Date.now()-cached.at<300000)return;
  try{
   const data=await request('/api/observation',{place});
   if(!data.station||!Object.hasOwn(data,'rain'))throw Error('관측자료 형식 확인 불가');
   if(Number.isFinite(data.rain))memory.set(place,{data,at:Date.now()});
   if(ticket===serial)paint(data);
  }catch(e){if(ticket===serial)paint(usable?cached.data:{station:{name:names[place]}},usable?'갱신 실패 · 이전 관측자료':'관측자료 확인 불가 · 잠시 후 새로고침해 주세요.');}
 }
 return {load};
}
