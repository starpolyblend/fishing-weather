import {dayOffset,grid,kstDate,weatherLabel,rainText} from './core.js';
const cfg=window.APP_CONFIG, $=s=>document.querySelector(s), demo=new URLSearchParams(location.search).get('demo')==='1';
const places=(cfg.locations||[]).slice(0,4);let saved;try{saved=localStorage.getItem('fishing-place')}catch{}
let place=places.find(p=>p.id===saved)||places[0], serial=0;const memory=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel=d=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(new Date(d+'T12:00:00+09:00'));
const value=v=>v==null?'<span class="missing">확인 불가</span>':esc(v);
let anchorTime=null;
const hourLabel=t=>`${Number(t.slice(0,2))<12?'오전':'오후'} ${Number(t.slice(0,2))%12||12}시`;
function empty(title,message){return `<div class="empty"><h3>${esc(title)}</h3><p>${esc(message)}</p></div>`}
$('#title').textContent=cfg.title;document.title=cfg.title;$('#today').textContent=dateLabel(kstDate());$('#demo').hidden=!demo;
function renderPlaces(){ $('#places').innerHTML=places.map(p=>`<button data-place="${esc(p.id)}" aria-pressed="${p.id===place?.id}">${esc(p.name)}<small>${esc(p.description)}</small></button>`).join(''); }
renderPlaces();
$('#places').addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(!b)return;place=places.find(p=>p.id===b.dataset.place);try{localStorage.setItem('fishing-place',place.id)}catch{}renderPlaces();load();});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#weather').hidden=b.dataset.tab!=='weather';$('#water').hidden=b.dataset.tab!=='water';if(b.dataset.tab==='weather')load();});
$('#refresh').onclick=()=>load(true);
function render(data){
  const today=kstDate().replaceAll('-',''), tomorrow=dayOffset(1).replaceAll('-','');
  const nowTime=new Date(Date.now()+9*3600000).toISOString().slice(11,13)+'00';
  const rows=data.rows.filter(r=>(r.date===today&&r.time>=nowTime)||r.date===tomorrow).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  if(!rows.length){$('#weather-content').innerHTML=empty('예보 자료가 없습니다.','잠시 후 새로고침해 주세요.');return;}
  const age=Date.now()-new Date(data.issuedAt).getTime();
  const warning=age>6*3600000?'<div class="notice">발표 후 6시간 이상 지난 예보입니다. 최신 자료를 다시 확인해 주세요.</div>':'';
  const dayName=r=>r.date===today?'오늘':'내일';
  const dateText=r=>`${dayName(r)} ${Number(r.date.slice(4,6))}/${Number(r.date.slice(6,8))}`;
  const boundary=(r,i)=>i>0&&r.date!==rows[i-1].date?' date-boundary':'';
  const wet=r=>[1,2,3,4].includes(r.pty);
  const rainValue=r=>rainText(r.rain).replace(/mm|㎜/g,'').trim();
  const fields=[
    {name:'날씨',unit:'',get:r=>esc(weatherLabel(r)),style:'condition'},
    {name:'기온',unit:'℃',get:r=>value(r.temp),style:'temperature'},
    {name:'비 확률',unit:'%',get:r=>value(r.pop),style:'probability'},
    {name:'강수량',unit:'mm<br>1시간',get:r=>esc(rainValue(r)),style:'rainfall'},
    {name:'풍속',unit:'m/s',get:r=>value(r.wind),style:'wind'}
  ];
  $('#weather-content').innerHTML=warning+`<p class="timeline-help">옆으로 밀어 다음 시간을 확인하세요 →</p><div id="timeline-scroll" class="timeline-scroll" tabindex="0" role="region" aria-label="시간별 날씨, 좌우로 스크롤"><table class="forecast-table"><caption class="sr-only">${esc(place.name)} 오늘부터 내일까지 시간별 예보</caption><thead><tr><th scope="col" class="row-label">날짜<br>시간</th>${rows.map((r,i)=>`<th scope="col" class="time-head${boundary(r,i)}"><span class="day-label">${dateText(r)}</span><span class="period">${Number(r.time.slice(0,2))<12?'오전':'오후'}</span><strong>${Number(r.time.slice(0,2))%12||12}시</strong></th>`).join('')}</tr></thead><tbody>${fields.map(f=>`<tr class="${f.style}"><th scope="row" class="row-label">${f.name}${f.unit?`<small>${f.unit}</small>`:''}</th>${rows.map((r,i)=>`<td class="${boundary(r,i)}${wet(r)&&(f.style==='rainfall'||f.style==='condition')?' wet':''}">${f.get(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="timeline-controls"><button id="previous-time" aria-label="이전 시간 보기">〈 이전</button><p id="visible-time" aria-live="polite"></p><button id="next-time" aria-label="다음 시간 보기">다음 〉</button></div><p class="meta">${demo?'예시 자료':esc(data.issuedAt.slice(5,16).replace('T',' '))+' 발표 · 기상청'}<br>강수량은 해당 시간의 1시간 예상량입니다.<br>${demo?'':`예보 격자 ${esc(data.grid.nx)}, ${esc(data.grid.ny)} · 약 5km 격자 예보`}</p>`;
  const scroll=$('#timeline-scroll'),table=scroll.querySelector('table'),heads=[...table.querySelectorAll('.time-head')];
  const step=()=>heads[0].getBoundingClientRect().width;
  const labelWidth=()=>table.querySelector('.row-label').getBoundingClientRect().width;
  const keys=rows.map(r=>r.date+r.time);
  let index=anchorTime?keys.findIndex(k=>k>=anchorTime):0;if(index<0)index=rows.length-1;
  scroll.scrollLeft=index*step();
  let frame=0;
  function update(){
    const col=step();if(!col)return;
    const at=Math.min(rows.length-1,Math.max(0,Math.floor((scroll.scrollLeft+2)/col)));
    anchorTime=keys[at];
    $('#visible-time').textContent=`${dayName(rows[at])} ${hourLabel(rows[at].time)}`;
    $('#previous-time').disabled=scroll.scrollLeft<2;
    $('#next-time').disabled=scroll.scrollLeft>=scroll.scrollWidth-scroll.clientWidth-2;
  }
  scroll.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(update);},{passive:true});
  const move=dir=>{const count=Math.max(1,Math.floor((scroll.clientWidth-labelWidth())/step()));scroll.scrollBy({left:dir*count*step(),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  $('#previous-time').onclick=()=>move(-1);$('#next-time').onclick=()=>move(1);
  scroll.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1)}});
  update();
}
function sample(){const rows=[];for(let d=0;d<2;d++)for(let h=0;h<24;h++)rows.push({date:dayOffset(d).replaceAll('-',''),time:String(h).padStart(2,'0')+'00',temp:Math.round(9+7*Math.sin((h-6)*Math.PI/18)),pop:h>=12&&h<=17?60:10,rain:h>=12&&h<=17?'1.0~2.0mm':'강수없음',wind:h>=12?3.2:1.5,sky:3,pty:h>=12&&h<=17?1:0});return {rows,issuedAt:new Date().toISOString(),grid:{nx:0,ny:0}};}
async function load(force=false){
  const ticket=++serial;$('#refresh').disabled=false;
  if(demo){render(sample());return;}
  if(!place){$('#weather-content').innerHTML=empty('장소가 없습니다.','개발자용 연결 설정에서 장소를 추가해 주세요.');return;}
  if(!cfg.apiBase){$('#weather-content').innerHTML=empty('날씨 연결을 준비하고 있어요.','연결 설정이 완료되면 이곳에 날씨가 표시됩니다.');return;}
  let g;try{g=grid(place.lat,place.lng)}catch{ $('#weather-content').innerHTML=empty('장소 위치를 확인 중입니다.','정확한 낚시 포인트를 등록한 뒤 날씨를 보여드립니다.');return; }
  const key=`${g.nx},${g.ny}`, cached=memory.get(key);
  if(!force&&cached&&Date.now()-cached.at<300000){render(cached.data);return;}
  $('#weather-content').innerHTML=empty('날씨를 가져오는 중입니다.','잠시만 기다려 주세요.');$('#refresh').disabled=true;
  try{
    const base=new URL(cfg.apiBase);if(base.protocol!=='https:')throw new Error('연결 주소를 확인해 주세요.');
    const url=new URL('/api/weather',base);url.searchParams.set('nx',g.nx);url.searchParams.set('ny',g.ny);
    const res=await fetch(url,{signal:AbortSignal.timeout(25000),cache:'no-store'});const data=await res.json();
    if(!res.ok)throw new Error(data.message||'날씨 서버에 연결하지 못했습니다.');
    if(!Array.isArray(data.rows))throw new Error('날씨 자료 형식을 확인해 주세요.');
    memory.set(key,{at:Date.now(),data});if(ticket===serial)render(data);
  }catch(e){if(ticket===serial)$('#weather-content').innerHTML=empty('날씨를 확인할 수 없습니다.',e.name==='TimeoutError'?'연결이 지연되고 있습니다. 잠시 후 새로고침해 주세요.':navigator.onLine===false?'인터넷 연결을 확인한 뒤 새로고침해 주세요.':e.message||'잠시 후 다시 시도해 주세요.');}
  finally{if(ticket===serial)$('#refresh').disabled=false;}
}
$('#water-content').innerHTML=empty('수위 관측 지점을 준비하고 있어요.','이용할 관측소와 공개 데이터가 정해지면 수위·관측 시각을 연결합니다. 현재 수위 자료는 연결되지 않았습니다.');
document.addEventListener('visibilitychange',()=>{if(!document.hidden){$('#today').textContent=dateLabel(kstDate());load();}});
load();
