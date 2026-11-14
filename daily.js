import {weatherLabel,dayOffset,kstDate} from './core.js?v=0.4.1';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=v=>typeof v==='number'&&Number.isFinite(v);
export const unit=(v,u)=>valid(v)?`${v}${u}`:'—';
export function dateText(date,month=true){const d=new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T12:00:00+09:00`);return `${month?Number(date.slice(4,6))+'/':''}${Number(date.slice(6,8))}${month?'':'일'}(${['일','월','화','수','목','금','토'][d.getUTCDay()]})`;}
export function weatherIcon(label){
 if(!label||label==='날씨'||label==='—')return '<span class="missing" aria-label="날씨 자료 없음">—</span>';
 const sun='<g stroke="#eab32c" stroke-width="2.2"><path d="M24 3v4m0 34v4M3 24h4m34 0h4M9 9l3 3m24 24 3 3M9 39l3-3m24-24 3-3"/><circle cx="24" cy="24" r="12" fill="#ffd24a"/></g>';
 const cloud='<path d="M11 37C0 36 2 23 11 22 11 8 32 7 35 23c15-2 15 16 3 16H12Z" fill="#c6cdd1" stroke="#a1aeb6" stroke-width="1.3"/>';
 const umbrella='<path d="M24 23v17c0 7-10 7-10 0" fill="none" stroke="#76ad2b" stroke-width="3"/><path d="M3 25C5 5 42 5 45 25c-6-5-10-5-14 0-5-5-10-5-14 0-5-5-9-5-14 0Z" fill="#8fc83d"/><path d="M24 7v4" stroke="#76ad2b" stroke-width="2"/><path d="m8 5-2 5m33-6-2 5" stroke="#4badd4" stroke-width="2.5"/>';
 const snow='<g stroke="#4798c6" stroke-width="2.5" stroke-linecap="round"><path d="M24 5v38M8 14l32 20M8 34l32-20M19 9l5 5 5-5M19 39l5-5 5 5M9 20l7-1-1-7M33 36l-1-7 7-1M9 28l7 1-1 7M33 12l-1 7 7 1"/></g>';
 const shape=/비|소나기/.test(label)?umbrella:/눈/.test(label)?snow:/맑/.test(label)?sun:/구름/.test(label)?`<g transform="translate(-1 -3) scale(.8)">${sun}</g>${cloud}`:cloud;
 return `<svg class="weather-icon" viewBox="0 0 48 48" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${shape}${/눈/.test(label)&&/비/.test(label)?'<text x="32" y="46" font-size="16" fill="#3182b5">❄</text>':''}</svg>`;
}
export function rainDisplay(raw){
 if(raw==null||raw==='')return '—';if(['강수없음','0','0.0'].includes(String(raw)))return '0mm';
 return /mm|㎜/.test(String(raw))?String(raw).replaceAll('㎜','mm'):String(raw)+'mm';
}
export function rainMarkup(raw){const text=rainDisplay(raw);return text.split(' ').map(part=>`<span class="rain-piece">${esc(part)}</span>`).join('<wbr>');}
function maxRain(rows){
 const all=rows.map(r=>r.rain).filter(v=>v!=null&&v!=='');if(!all.length)return null;
 const score=v=>Math.max(0,...(String(v).match(/\d+(?:\.\d+)?/g)||[]).map(Number));
 return all.reduce((a,b)=>score(b)>score(a)?b:a);
}
export function buildDays(data,now=new Date()){
 const short=data.rows||[],mid=data.mid?.days||[];
 return Array.from({length:11},(_,i)=>{
  const date=dayOffset(i,now).replaceAll('-',''),group=short.filter(r=>r.date===date),m=mid.find(r=>r.date===date);
  const hourly=group.filter(r=>valid(r.temp)||valid(r.sky)||valid(r.pty));
  const pick=k=>group.find(r=>valid(r[k]))?.[k]??null;
  const parts=[0,1].map(half=>{
   const g=hourly.filter(r=>(Number(r.time.slice(0,2))<12?0:1)===half),fallback=m?.parts?.[m.allDay?0:half];
   const representative=g.find(r=>[1,2,3,4].includes(r.pty))||g.reduce((a,b)=>(b.sky||0)>(a?.sky||0)?b:a,null);
   const pops=g.map(r=>r.pop).filter(valid);
   return {weather:representative?weatherLabel(representative):fallback?.weather??null,pop:pops.length?Math.max(...pops):fallback?.pop??null,rain:maxRain(g),available:!!g.length||!!fallback};
  });
  return {date,allDay:!hourly.length&&(m?.allDay??i>=8),parts,min:pick('tmin')??m?.min??null,max:pick('tmax')??m?.max??null,hasHours:!!hourly.length};
 });
}
export function dailyTable(data,selected,now=new Date()){
 const days=buildDays(data,now),today=kstDate(now).replaceAll('-','');
 const cells=(d,fn)=>d.allDay?`<td colspan="2" class="day-edge">${fn(d.parts[0])}</td>`:d.parts.map((p,i)=>`<td class="${i===0?'day-edge':''}">${fn(p)}</td>`).join('');
 return `<div class="timeline-scroll daily-scroll" tabindex="0" role="region" aria-label="오늘부터 10일 후까지 일별 예보"><table class="forecast-table daily-table"><caption class="sr-only">${esc(data.placeName||'')} 일별 예보. 기온은 하루 최저·최고이며 오전·오후 기온이 아닙니다.</caption><thead><tr><th class="row-label" scope="row">날짜</th>${days.map(d=>`<th colspan="2" class="date-cell${d.date===selected?' selected':''}"><button class="date-button" data-date="${d.date}" aria-pressed="${d.date===selected}" aria-label="${dateText(d.date)} 시간별 예보 보기">${dateText(d.date)}<small>${d.date===today?'오늘':d.date===dayOffset(1,now).replaceAll('-','')?'내일':'\u00a0'}</small></button></th>`).join('')}</tr><tr><th class="row-label" scope="row">시간</th>${days.map(d=>d.allDay?'<th colspan="2" class="day-edge">종일</th>':'<th class="day-edge">오전</th><th>오후</th>').join('')}</tr></thead><tbody><tr><th scope="row" class="row-label">날씨</th>${days.map(d=>cells(d,p=>weatherIcon(p.weather))).join('')}</tr><tr><th scope="row" class="row-label">기온</th>${days.map(d=>`<td class="low day-edge" aria-label="최저 ${unit(d.min,'℃')}">${unit(d.min,'℃')}</td><td class="high" aria-label="최고 ${unit(d.max,'℃')}">${unit(d.max,'℃')}</td>`).join('')}</tr><tr><th scope="row" class="row-label">강수확률</th>${days.map(d=>cells(d,p=>unit(p.pop,'%'))).join('')}</tr><tr class="daily-rain"><th scope="row" class="row-label">강수량</th>${days.map(d=>cells(d,p=>rainMarkup(p.rain))).join('')}</tr></tbody></table></div>`;
}
