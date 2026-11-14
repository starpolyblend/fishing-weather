import {dayOffset,grid,kstDate} from './core.js?v=0.3.0';
import {dailyTable,dateText,weatherIcon,rainDisplay,rainMarkup,unit,esc} from './daily.js?v=0.3.0';
import {weatherLabel} from './core.js?v=0.3.0';
const cfg=window.APP_CONFIG,$=s=>document.querySelector(s),demo=new URLSearchParams(location.search).get('demo')==='1';
const places=(cfg.locations||[]).slice(0,4),memory=new Map(),midMemory=new Map();let saved;
try{saved=localStorage.getItem('fishing-place')}catch{}
let place=places.find(p=>p.id===saved)||places[0],serial=0,selectedDate=kstDate().replaceAll('-',''),activeData=null,hourScroll=0;
const dateLabel=d=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(new Date(d+'T12:00:00+09:00'));
function empty(title,message){return `<div class="empty"><h3>${esc(title)}</h3><p>${esc(message)}</p></div>`}
$('#title').textContent=cfg.title;document.title=cfg.title;$('#today').textContent=dateLabel(kstDate());$('#demo').hidden=!demo;
function renderPlaces(){$('#places').innerHTML=places.map(p=>`<button data-place="${esc(p.id)}" aria-pressed="${p.id===place?.id}">${esc(p.name)}</button>`).join('')}
renderPlaces();
$('#places').onclick=e=>{const b=e.target.closest('[data-place]');if(!b)return;place=places.find(p=>p.id===b.dataset.place);try{localStorage.setItem('fishing-place',place.id)}catch{}renderPlaces();load()};
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#weather').hidden=b.dataset.tab!=='weather';$('#water').hidden=b.dataset.tab!=='water';if(b.dataset.tab==='weather')load();else loadWater()});
$('#refresh').onclick=()=>load(true);
function render(data){
 activeData=data;const today=kstDate().replaceAll('-','');
 if(selectedDate<today||selectedDate>dayOffset(10).replaceAll('-','')){selectedDate=today;hourScroll=0}
 const previousDaily=$('.daily-scroll')?.scrollLeft||0;
 const warning=Date.now()-Date.parse(data.issuedAt)>21600000?'<p class="notice">6시간 이상 지난 예보입니다. 새로고침해 주세요.</p>':'';
 $('#weather-content').innerHTML=warning+(place.approximate?'<p class="meta compact">마을 주변 기준 예보</p>':'')+dailyTable({...data,placeName:place.name},selectedDate)+`<p class="table-legend"><span class="low">최저</span> / <span class="high">최고</span> · 날짜를 누르면 시간별 예보</p><p class="mid-status">${data.midError?esc(data.midError):data.midLoading?'중기예보 불러오는 중…':''}</p><div class="timeline-heading hourly-heading"><h2>시간별 예보</h2><span id="selected-date">${dateText(selectedDate)}</span></div><div id="hourly-content"></div><details class="forecast-notes"><summary>예보 기준·발표 시각</summary><p>기온은 하루 최저·최고 예보입니다. 오전·오후 기온이 아닙니다. 값이 없으면 —로 표시합니다.</p><p>단기 강수확률은 해당 오전·오후의 최대값, 일별 강수량은 그 구간에서 가장 많은 1시간 예상량입니다. 구간의 총강수량이 아닙니다.</p><p>중기예보는 광주·전남 날씨와 해당 시군 기온입니다. +8~10일은 종일 예보이며, 중기 강수량과 시간별 예보는 제공되지 않습니다.</p><p>단기 ${esc(data.issuedAt?.slice(5,16).replace('T',' '))}${data.mid?.issuedAt?` / 중기 ${esc(data.mid.issuedAt.slice(5,16).replace('T',' '))}`:''} 발표 · 기상청</p></details>`;
 $('.daily-scroll').scrollLeft=previousDaily;
 document.querySelectorAll('[data-date]').forEach(b=>b.onclick=()=>{
  selectedDate=b.dataset.date;hourScroll=0;
  document.querySelectorAll('[data-date]').forEach(x=>{x.setAttribute('aria-pressed',x===b);x.closest('th').classList.toggle('selected',x===b)});
  $('#selected-date').textContent=dateText(selectedDate);renderHours(data);
 });
 renderHours(data);
}
function renderHours(data){
 const today=kstDate().replaceAll('-',''),hour=new Date(Date.now()+32400000).toISOString().slice(11,13)+'00';
 const rows=data.rows.filter(r=>r.date===selectedDate&&(r.date!==today||r.time>=hour)&&(r.temp!=null||r.sky!=null||r.pty!=null)).sort((a,b)=>a.time.localeCompare(b.time));
 if(!rows.length){$('#hourly-content').innerHTML=empty(`${dateText(selectedDate)} 시간별 예보 없음`,'시간별 예보가 제공되는 날짜를 선택해 주세요.');return}
 const fields=[['날씨',r=>weatherIcon(weatherLabel(r)),'condition'],['기온',r=>unit(r.temp,'℃'),'temperature'],['강수확률',r=>unit(r.pop,'%'),'probability'],['강수량',r=>rainMarkup(r.rain),'rainfall'],['풍속',r=>unit(r.wind,'m/s'),'wind']];
 $('#hourly-content').innerHTML=`<div id="timeline-scroll" class="timeline-scroll" tabindex="0" role="region" aria-label="시간별 예보, 좌우로 스크롤"><table class="forecast-table hourly-table"><caption class="sr-only">${esc(place.name)} ${dateText(selectedDate)} 시간별 예보</caption><thead><tr><th scope="col" class="row-label">날짜<br>시간</th>${rows.map(r=>`<th scope="col" class="time-head"><span>${dateText(r.date,false)}</span><strong>${r.time.slice(0,2)}시</strong></th>`).join('')}</tr></thead><tbody>${fields.map(([label,get,cls])=>`<tr class="${cls}"><th scope="row" class="row-label">${label}</th>${rows.map(r=>`<td>${get(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="timeline-controls"><button id="previous-time" aria-label="이전 시간 보기">〈 이전</button><p id="visible-time"></p><button id="next-time" aria-label="다음 시간 보기">다음 〉</button></div><p class="meta compact">강수량은 1시간 예상량 · 옆으로 밀어보세요 →</p>`;
 const scroll=$('#timeline-scroll'),step=()=>scroll.querySelector('.time-head').getBoundingClientRect().width||64;
 scroll.scrollLeft=hourScroll;
 function update(){hourScroll=scroll.scrollLeft;const i=Math.min(rows.length-1,Math.floor((hourScroll+1)/step()));$('#visible-time').textContent=rows[i].time.slice(0,2)+'시';$('#previous-time').disabled=hourScroll<2;$('#next-time').disabled=hourScroll>=scroll.scrollWidth-scroll.clientWidth-2}
 scroll.addEventListener('scroll',update,{passive:true});const move=d=>scroll.scrollBy({left:d*Math.max(1,Math.floor((scroll.clientWidth-64)/step()))*step(),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 $('#previous-time').onclick=()=>move(-1);$('#next-time').onclick=()=>move(1);scroll.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowRight'?1:-1)}};update();
}
function sample(){const rows=[];for(let d=0;d<4;d++)for(let h=0;h<24;h++)rows.push({date:dayOffset(d).replaceAll('-',''),time:String(h).padStart(2,'0')+'00',temp:Math.round(13+5*Math.sin((h-6)*Math.PI/18)),tmin:h===6?8:null,tmax:h===15?18:null,pop:h>=12&&h<=17?60:20,rain:h>=12&&h<=17?'1mm 미만':'강수없음',wind:1.9,sky:3,pty:h>=12&&h<=17?1:0});const days=Array.from({length:7},(_,n)=>({date:dayOffset(n+4).replaceAll('-',''),min:7+n,max:16+n,allDay:n+4>=8,parts:[{weather:'맑음',pop:20},{weather:'흐리고 비',pop:40}]}));return {rows,mid:{days,issuedAt:new Date().toISOString()},issuedAt:new Date().toISOString(),grid:{nx:0,ny:0}}}
async function jsonRequest(path,params){const base=new URL(cfg.apiBase);if(base.protocol!=='https:')throw Error('연결 주소를 확인해 주세요.');const url=new URL(path,base);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));const res=await fetch(url,{signal:AbortSignal.timeout(25000),cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data.message||'예보를 가져오지 못했습니다.');return data}
async function load(force=false){
 const ticket=++serial;$('#refresh').disabled=false;
 if(demo){render(sample());return}
 if(!place||!cfg.apiBase){$('#weather-content').innerHTML=empty('날씨 연결을 준비하고 있어요.','연결 설정을 확인해 주세요.');return}
 let g;try{g=grid(place.lat,place.lng)}catch{$('#weather-content').innerHTML=empty('장소 위치를 확인 중입니다.','위도·경도 설정을 확인해 주세요.');return}
 const region=place.midRegion||({yeolhwa:'boseong',hyanggyo:'boseong',songsan:'goheung',sacho:'gangjin'})[place.id],key=`${g.nx},${g.ny}`;
 const cache=memory.get(key),midCache=midMemory.get(region);
 const midPromise=(!force&&midCache&&Date.now()-midCache.at<1800000?Promise.resolve(midCache.data):jsonRequest('/api/mid',{region}).then(d=>{if(!Array.isArray(d.days))throw Error('중기예보 형식을 확인해 주세요.');midMemory.set(region,{at:Date.now(),data:d});return d})).then(d=>({mid:d}),()=>({midError:'중기예보를 불러오지 못했습니다. 단기예보만 표시합니다.'}));
 $('#refresh').disabled=true;$('#weather-content').innerHTML=empty('날씨를 가져오는 중입니다.','잠시만 기다려 주세요.');
 try{
  const data=!force&&cache&&Date.now()-cache.at<300000?cache.data:await jsonRequest('/api/weather',g);
  if(!Array.isArray(data.rows))throw Error('날씨 자료 형식을 확인해 주세요.');if(data!==cache?.data)memory.set(key,{at:Date.now(),data});
  if(ticket===serial)render({...data,midLoading:true});
  const mid=await midPromise;if(ticket===serial)render({...data,...mid});
 }catch(e){if(ticket===serial)$('#weather-content').innerHTML=empty('날씨를 확인할 수 없습니다.',e.message||'잠시 후 다시 시도해 주세요.')}
 finally{if(ticket===serial)$('#refresh').disabled=false}
}
let waterLoaded=0,waterBusy=false;
const waterTime=t=>t?new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(t)):'관측 시각 없음';
async function loadWater(force=false){
 if(waterBusy||(!force&&Date.now()-waterLoaded<300000))return;
 waterBusy=true;$('#water-refresh').disabled=true;
 $('#water-content').innerHTML=empty('수위를 가져오는 중입니다.','잠시만 기다려 주세요.');
 try{
  if(demo)throw new Error('수위는 예시 숫자를 표시하지 않습니다. 실제 정보 화면에서 확인해 주세요.');
  const res=await fetch(new URL('/api/water',cfg.apiBase),{signal:AbortSignal.timeout(20000),cache:'no-store'}),data=await res.json();
  if(!res.ok||!Array.isArray(data.stations))throw new Error(data.message||'수위 연결을 확인해 주세요.');
  $('#water-content').innerHTML=data.stations.map(s=>{
   const old=s.observedAt&&Date.now()-Date.parse(s.observedAt)>3600000;
   return `<section class="water-station"><h3>${esc(s.name)}</h3><p class="water-level">${s.level==null?'확인 불가':esc(s.level.toFixed(2))}<small>${s.level==null?'':esc(s.unit)}</small></p><p>${esc(s.datum)}</p><p class="${old?'notice':'muted'}">${waterTime(s.observedAt)} 관측${old?' · 자료 지연':''}</p>${s.error?`<p>${esc(s.error)}</p>`:''}<a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener">공식 관측자료 ↗</a></section>`;
  }).join('')+'<p class="meta">수위표수위와 해발수위는 기준이 다릅니다.<br>수심이 아니며, 두 숫자를 직접 비교하지 마세요.<br>공개 관측자료는 미검정 자료로 수정될 수 있습니다.</p>';
  waterLoaded=Date.now();
 }catch(e){$('#water-content').innerHTML=empty('수위를 확인할 수 없습니다.',e.message||'잠시 후 다시 시도해 주세요.');}
 finally{waterBusy=false;$('#water-refresh').disabled=false;}
}
$('#water-refresh').onclick=()=>loadWater(true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){$('#today').textContent=dateLabel(kstDate());if($('#water').hidden)load();else loadWater();}});
load();
