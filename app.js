import {windArrow,windSpeed} from './wind.js?v=0.5.1';
import {waterChart,bindWaterCharts} from './water-chart.js?v=0.5.1';
import {dayOffset,grid,kstDate} from './core.js?v=0.5.1';
import {dailyTable,dateText,weatherIcon,rainDisplay,rainMarkup,unit,esc} from './daily.js?v=0.5.1';
import {weatherLabel} from './core.js?v=0.5.1';
const cfg=window.APP_CONFIG,$=s=>document.querySelector(s),demo=new URLSearchParams(location.search).get('demo')==='1';
const places=(cfg.locations||[]).slice(0,4),memory=new Map(),midMemory=new Map();let saved;
try{saved=localStorage.getItem('fishing-place')}catch{}
let place=places.find(p=>p.id===saved)||places[0],serial=0,selectedDate=kstDate().replaceAll('-',''),activeData=null,hourScroll=0;
function diskKey(kind,key){return `fishing-cache-v1:${cfg.apiBase}:${kind}:${key}`}
function cached(map,kind,key,maxAge,valid){
 if(map.has(key)){const c=map.get(key),age=Date.now()-c.at;if(age>=0&&age<maxAge&&valid(c.data))return c;map.delete(key)}
 try{const c=JSON.parse(localStorage.getItem(diskKey(kind,key)));const age=Date.now()-c?.at;
  if(c&&Number.isFinite(c.at)&&age>=0&&age<maxAge&&valid(c.data)){const entry={...c,restored:true};map.set(key,entry);return entry}
  localStorage.removeItem(diskKey(kind,key));
 }catch{}return null;
}
function remember(map,kind,key,data){const entry={at:Date.now(),data};map.set(key,entry);try{localStorage.setItem(diskKey(kind,key),JSON.stringify(entry))}catch{}return entry}
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
 $('#weather-content').innerHTML=warning+(place.approximate?'<p class="meta compact">마을 주변 기준 예보</p>':'')+dailyTable({...data,placeName:place.name},selectedDate)+`<p class="table-legend"><span class="low">최저</span> / <span class="high">최고</span> · 날짜를 누르면 시간별 예보</p><p class="mid-status">${data.midError?esc(data.midError):data.midLoading?'중기예보 불러오는 중…':''}</p><div class="timeline-heading hourly-heading"><h2>시간별 예보</h2><span id="selected-date">${dateText(selectedDate)}</span></div><div id="hourly-content"></div><details class="forecast-notes"><summary>예보 기준·발표 시각</summary><p>기온은 하루 최저·최고 예보입니다. 오전·오후 기온이 아닙니다. 값이 없으면 —로 표시합니다.</p><p>단기 강수확률은 해당 오전·오후의 최대값, 일별 강수량은 그 구간에서 가장 많은 1시간 예상량입니다. 구간의 총강수량이 아닙니다.</p><p>풍향 이름은 바람이 불어오는 쪽이며, 화살표는 향하는 쪽입니다. 예: 북풍 ↓, 서풍 →. 먼 날짜의 풍속은 기상청 정성예보(약함·약간 강함·강함)로 표시합니다.</p><p>중기예보는 광주·전남 날씨와 해당 시군 기온입니다. +8~10일은 종일 예보이며, 중기 강수량과 시간별 예보는 제공되지 않습니다.</p><p>단기 ${esc(data.issuedAt?.slice(5,16).replace('T',' '))}${data.mid?.issuedAt?` / 중기 ${esc(data.mid.issuedAt.slice(5,16).replace('T',' '))}`:''} 발표 · 기상청</p></details>`;
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
 const fields=[['날씨',r=>weatherIcon(weatherLabel(r)),'condition'],['기온',r=>unit(r.temp,'℃'),'temperature'],['강수확률',r=>unit(r.pop,'%'),'probability'],['강수량',r=>rainMarkup(r.rain),'rainfall'],['풍향',r=>windArrow(r),'direction'],['풍속',r=>windSpeed(r),'wind']];
 $('#hourly-content').innerHTML=`<div id="timeline-scroll" class="timeline-scroll" tabindex="0" role="region" aria-label="시간별 예보, 좌우로 스크롤"><table class="forecast-table hourly-table"><caption class="sr-only">${esc(place.name)} ${dateText(selectedDate)} 시간별 예보</caption><thead><tr><th scope="col" class="row-label">날짜<br>시간</th>${rows.map(r=>`<th scope="col" class="time-head"><span>${dateText(r.date,false)}</span><strong>${r.time.slice(0,2)}시</strong></th>`).join('')}</tr></thead><tbody>${fields.map(([label,get,cls])=>`<tr class="${cls}"><th scope="row" class="row-label">${label}</th>${rows.map(r=>`<td>${get(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="meta compact">화살표는 바람이 향하는 쪽 · 북풍 ↓<br>강수량은 1시간 예상량 · 옆으로 밀어보세요 →</p>`;
 const scroll=$('#timeline-scroll'),step=()=>scroll.querySelector('.time-head').getBoundingClientRect().width||64;
 scroll.scrollLeft=hourScroll;
 scroll.addEventListener('scroll',()=>{hourScroll=scroll.scrollLeft},{passive:true});
 scroll.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();scroll.scrollBy({left:(e.key==='ArrowRight'?1:-1)*step(),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'})}};
}
function sample(){const rows=[];for(let d=0;d<4;d++)for(let h=0;h<24;h++)rows.push({date:dayOffset(d).replaceAll('-',''),time:String(h).padStart(2,'0')+'00',temp:Math.round(13+5*Math.sin((h-6)*Math.PI/18)),tmin:h===6?8:null,tmax:h===15?18:null,pop:h>=12&&h<=17?60:20,rain:h>=12&&h<=17?'1mm 미만':'강수없음',wind:1.9,direction:h*30%360,sky:3,pty:h>=12&&h<=17?1:0});const days=Array.from({length:7},(_,n)=>({date:dayOffset(n+4).replaceAll('-',''),min:7+n,max:16+n,allDay:n+4>=8,parts:[{weather:'맑음',pop:20},{weather:'흐리고 비',pop:40}]}));return {rows,mid:{days,issuedAt:new Date().toISOString()},issuedAt:new Date().toISOString(),grid:{nx:0,ny:0}}}
const pendingRequests=new Map();
async function jsonRequest(path,params){
 const base=new URL(cfg.apiBase);if(base.protocol!=='https:')throw Error('연결 주소를 확인해 주세요.');
 const url=new URL(path,base);Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v));const key=url.href;
 if(pendingRequests.has(key))return pendingRequests.get(key);
 const pending=(async()=>{try{const res=await fetch(url,{signal:AbortSignal.timeout(25000),cache:'no-store'});const data=await res.json();if(!res.ok)throw Error(data.message||'예보를 가져오지 못했습니다.');return data}catch(e){if(e.name==='TimeoutError')throw Error('제공기관 응답이 지연됩니다. 잠시 후 새로고침해 주세요.');throw e}})();
 pendingRequests.set(key,pending);try{return await pending}finally{pendingRequests.delete(key)}
}
async function load(force=false){
 const ticket=++serial;$('#refresh').disabled=false;
 if(demo){render(sample());return}
 if(!place||!cfg.apiBase){$('#weather-content').innerHTML=empty('날씨 연결을 준비하고 있어요.','연결 설정을 확인해 주세요.');return}
 let g;try{g=grid(place.lat,place.lng)}catch{$('#weather-content').innerHTML=empty('장소 위치를 확인 중입니다.','위도·경도 설정을 확인해 주세요.');return}
 const region=place.midRegion||({yeolhwa:'boseong',hyanggyo:'boseong',songsan:'goheung',sacho:'gangjin'})[place.id],key=`${g.nx},${g.ny}`;
 const cache=cached(memory,'weather',key,21600000,d=>Array.isArray(d?.rows)),midCache=cached(midMemory,'mid',region,86400000,d=>Array.isArray(d?.days));
 const midPromise=(!force&&midCache&&!midCache.restored&&Date.now()-midCache.at<1800000?Promise.resolve(midCache.data):jsonRequest('/api/mid',{region}).then(d=>{if(!Array.isArray(d.days))throw Error('중기예보 형식을 확인해 주세요.');remember(midMemory,'mid',region,d);return d})).then(d=>({mid:d}),()=>({...(midCache?{mid:midCache.data}:{}),midError:midCache?'중기예보 갱신 실패 · 이전 발표 자료입니다.':'중기예보를 불러오지 못했습니다. 단기예보만 표시합니다.'}));
 $('#refresh').disabled=true;if(cache){render({...cache.data,...(midCache?{mid:midCache.data}:{}),midLoading:!midCache});$('#weather-content').insertAdjacentHTML('afterbegin','<p class="loading-note">저장된 예보 표시 중 · 최신 자료 확인 중…</p>')}else $('#weather-content').innerHTML=empty('날씨를 가져오는 중입니다.','잠시만 기다려 주세요.');
 try{
  const data=!force&&cache&&!cache.restored&&Date.now()-cache.at<300000?cache.data:await jsonRequest('/api/weather',g);
  if(!Array.isArray(data.rows))throw Error('날씨 자료 형식을 확인해 주세요.');if(data!==cache?.data)remember(memory,'weather',key,data);
  if(ticket===serial){render({...data,...(midCache?{mid:midCache.data}:{}),midLoading:!midCache});$('#refresh').disabled=false;}
  const mid=await midPromise;if(ticket===serial)render({...data,...mid});
 }catch(e){if(ticket===serial){if(cache){render({...cache.data,...(midCache?{mid:midCache.data}:{})});$('#weather-content').insertAdjacentHTML('afterbegin','<p class="notice">최신 자료 갱신 실패 · 이전에 받은 예보입니다. 발표 시각을 확인해 주세요.</p>')}else $('#weather-content').innerHTML=empty('날씨를 확인할 수 없습니다.',e.message||'잠시 후 다시 시도해 주세요.')}}
 finally{if(ticket===serial)$('#refresh').disabled=false}
}
const waterMemory=new Map(),chartMemory=new Map();let waterData=null,waterSerial=0,waterSelection='4007630';
try{const saved=localStorage.getItem('fishing-water-station');if(['4007630','4007625'].includes(saved))waterSelection=saved}catch{}
const waterTime=t=>t?new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Seoul'}).format(new Date(t)):'관측 시각 없음';
function renderWaterButtons(){
 $('#water-places').innerHTML=[['4007630','가장교'],['4007625','보성강댐']].map(([id,name])=>`<button data-water="${id}" aria-pressed="${id===waterSelection}">${name}</button>`).join('');
}
renderWaterButtons();
$('#water-places').onclick=e=>{const b=e.target.closest('[data-water]');if(!b)return;waterSelection=b.dataset.water;try{localStorage.setItem('fishing-water-station',waterSelection)}catch{}renderWaterButtons();loadWater()};
function renderWater(){
 const s=waterData?.stations.find(s=>s.id===waterSelection);if(!s){$('#water-content').innerHTML=empty('수위 자료가 없습니다.','잠시 후 새로고침해 주세요.');return}
 const old=s.observedAt&&Date.now()-Date.parse(s.observedAt)>3600000;
 $('#water-content').innerHTML=`<section class="water-station"><h3>${esc(s.name)}</h3><p class="water-level">${typeof s.level==='number'?esc(s.level.toFixed(2)):'확인 불가'}<small>${s.level==null?'':esc(s.unit)}</small></p><p>${esc(s.datum)}</p><p class="${old?'notice':'muted'}">${waterTime(s.observedAt)} 관측${old?' · 자료 지연':''}</p>${s.error?`<p>${esc(s.error)}</p>`:''}${waterChart(s)}<a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener">홍수통제소 원본 그래프 ↗</a></section><p class="meta">가장교는 수위표수위, 보성강댐은 해발수위입니다.<br>수심이 아니며 축은 홍수통제소 기준 명칭이며 관측소별 범위가 다릅니다.<br>공개 관측자료는 미검정 자료로 수정될 수 있습니다.</p>`;
 bindWaterCharts([s]);
}
async function loadWater(force=false){
 const id=waterSelection,ticket=++waterSerial;
 const cache=cached(waterMemory,'water',id,3600000,d=>d?.id===id&&Array.isArray(d.history));
 const chartCache=cached(chartMemory,'chart',id,86400000,d=>d?.station===id&&!!d.officialChart);
 let level=null,levelNotice='',chart=chartCache?.data.officialChart||null,chartLoading=!chartCache,chartFailed=false;
 const paint=()=>{
  if(ticket!==waterSerial||!level)return;
  waterData={stations:[{...level,officialChart:chart,chartLoading,chartFailed}]};renderWater();
  if(levelNotice)$('#water-content').insertAdjacentHTML('afterbegin',`<p class="notice">${esc(levelNotice)}</p>`);
 };
 if(cache){level=cache.data;levelNotice='저장된 수위 표시 중 · 최신 관측자료 확인 중…';paint()}else $('#water-content').innerHTML=empty('수위를 가져오는 중입니다.','선택한 관측소부터 확인합니다.');
 $('#water-refresh').disabled=true;
 if(demo){$('#water-content').innerHTML=empty('수위 예시는 제공하지 않습니다.','실제 정보 화면에서 확인해 주세요.');$('#water-refresh').disabled=false;return}
 // This task never holds up the level/history response.
 const chartTask=async()=>{
  if(!force&&chartCache&&!chartCache.restored&&Date.now()-chartCache.at<1800000){chartLoading=false;paint();return}
  chartLoading=true;
  try{const d=await jsonRequest('/api/water-chart',{station:id});if(d.station!==id||!d.officialChart)throw Error('chart');remember(chartMemory,'chart',id,d);chart=d.officialChart}
  catch{chartFailed=true}finally{chartLoading=false;paint()}
 };
 void chartTask();
 try{
  const s=!force&&cache&&!cache.restored&&Date.now()-cache.at<300000?cache.data:(await jsonRequest('/api/water',{station:id})).stations?.find(s=>s.id===id);
  if(!s||!Array.isArray(s.history))throw Error('수위 자료 형식을 확인해 주세요. Worker를 최신 버전으로 배포했는지 확인해 주세요.');
  if(s.level===null&&cache){level=cache.data;levelNotice='최신 수위 확인 실패 · 이전 관측자료입니다.'}
  else{level=s;levelNotice='';if(s.level!==null&&s!==cache?.data)remember(waterMemory,'water',id,s)}
  paint();
 }catch(e){if(cache){level=cache.data;levelNotice='수위 갱신 실패 · 이전 관측자료입니다. 관측 시각을 확인해 주세요.';paint()}else if(ticket===waterSerial)$('#water-content').innerHTML=empty('수위를 확인할 수 없습니다.',e.message||'잠시 후 다시 시도해 주세요.')}
 finally{if(ticket===waterSerial)$('#water-refresh').disabled=false}
}
$('#water-refresh').onclick=()=>loadWater(true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){$('#today').textContent=dateLabel(kstDate());if($('#water').hidden)load();else loadWater()}});
load();
