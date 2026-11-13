import {dayOffset,grid,kstDate,weatherLabel,rainText} from './core.js';
const cfg=window.APP_CONFIG, $=s=>document.querySelector(s), demo=new URLSearchParams(location.search).get('demo')==='1';
const places=(cfg.locations||[]).slice(0,4);let saved;try{saved=localStorage.getItem('fishing-place')}catch{}
let place=places.find(p=>p.id===saved)||places[0], day=0, serial=0;const memory=new Map();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLabel=d=>new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Seoul'}).format(new Date(d+'T12:00:00+09:00'));
const value=(v,u)=>v==null?'확인 불가':`${esc(v)}<small>${u}</small>`;
const hourLabel=t=>`${Number(t.slice(0,2))<12?'오전':'오후'} ${Number(t.slice(0,2))%12||12}시`;
function empty(title,message){return `<div class="card empty"><h3>${esc(title)}</h3><p>${esc(message)}</p></div>`}
$('#title').textContent=cfg.title;document.title=cfg.title;$('#today').textContent=dateLabel(kstDate());$('#demo').hidden=!demo;
function renderPlaces(){ $('#places').innerHTML=places.map(p=>`<button data-place="${esc(p.id)}" aria-pressed="${p.id===place?.id}">${esc(p.name)}<small>${esc(p.description)}</small></button>`).join(''); }
renderPlaces();
$('#places').addEventListener('click',e=>{const b=e.target.closest('[data-place]');if(!b)return;place=places.find(p=>p.id===b.dataset.place);try{localStorage.setItem('fishing-place',place.id)}catch{}renderPlaces();load();});
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',x===b));$('#weather').hidden=b.dataset.tab!=='weather';$('#water').hidden=b.dataset.tab!=='water';});
document.querySelectorAll('[data-day]').forEach(b=>b.onclick=()=>{day=Number(b.dataset.day);document.querySelectorAll('[data-day]').forEach(x=>x.setAttribute('aria-pressed',x===b));load();});
$('#refresh').onclick=()=>load(true);
function metrics(r){return `<div class="metrics"><div class="metric"><span>기온</span><strong>${value(r.temp,'℃')}</strong></div><div class="metric"><span>비 올 확률</span><strong>${value(r.pop,'%')}</strong></div><div class="metric rain"><span>1시간 강수량</span><strong>${esc(rainText(r.rain))}</strong></div><div class="metric"><span>풍속</span><strong>${value(r.wind,'m/s')}</strong></div></div>`;}
function render(data){
  const selected=dayOffset(day).replaceAll('-','');
  const nowTime=new Date(Date.now()+9*3600000).toISOString().slice(11,13)+'00';
  const rows=data.rows.filter(r=>r.date===selected&&(day!==0||r.time>=nowTime));
  if(!rows.length){$('#weather-content').innerHTML=empty('해당 시간의 예보가 없습니다.','다른 날짜를 선택하거나 잠시 후 새로고침해 주세요.');return;}
  const first=rows[0],age=Date.now()-new Date(data.issuedAt).getTime();
  const warning=age>6*3600000?'<div class="notice">발표 후 6시간 이상 지난 예보입니다. 최신 자료를 다시 확인해 주세요.</div>':'';
  $('#weather-content').innerHTML=warning+`<article class="card hero"><div class="hero-top"><div><p class="muted">${esc(place.name)} · ${day===0?'오늘':'내일'}</p><h2>${hourLabel(first.time)} 예보</h2></div><span class="badge">${esc(weatherLabel(first))}</span></div>${metrics(first)}<p class="meta">${demo?'예시 자료':esc(data.issuedAt.slice(5,16).replace('T',' '))+' 발표 · 기상청'}<br>강수량은 해당 시간의 1시간 예상량입니다.</p></article><div class="hours-title"><h2>시간별 날씨</h2><p>아래로 내려 확인하세요</p></div>`+rows.map(r=>`<article class="card hour-card"><div class="hour-top"><strong>${hourLabel(r.time)}</strong><span>${esc(weatherLabel(r))}</span></div>${metrics(r)}</article>`).join('')+`<p class="meta">${demo?'미리보기 데이터':`예보 격자 ${esc(data.grid.nx)}, ${esc(data.grid.ny)} · 약 5km 격자 예보`}<br>가까운 장소는 같은 격자에 속해 예보가 같을 수 있습니다.</p>`;
}
function sample(){const rows=[];for(let d=0;d<2;d++)for(let h=0;h<24;h++)rows.push({date:dayOffset(d).replaceAll('-',''),time:String(h).padStart(2,'0')+'00',temp:Math.round(9+7*Math.sin((h-6)*Math.PI/18)),pop:h>=12&&h<=17?60:10,rain:h>=12&&h<=17?'1.0~2.0mm':'강수없음',wind:h>=12?3.2:1.5,sky:3,pty:h>=12&&h<=17?1:0});return {rows,issuedAt:new Date().toISOString(),grid:{nx:0,ny:0}};}
async function load(force=false){
  const ticket=++serial;$('#selected-date').textContent=dateLabel(dayOffset(day));$('#refresh').disabled=false;
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
