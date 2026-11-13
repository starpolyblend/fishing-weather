import {weatherLabel} from './core.js';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function summarize(rows){
 const dates=[...new Set(rows.map(r=>r.date))];
 return dates.flatMap(date=>[0,1].map(half=>{
  const group=rows.filter(r=>r.date===date&&(Number(r.time.slice(0,2))<12?0:1)===half);
  const nums=k=>group.map(r=>r[k]).filter(v=>typeof v==='number'&&Number.isFinite(v));
  const temps=nums('temp'), pops=nums('pop');
  const representative=group.find(r=>[1,2,3,4].includes(r.pty))||group.reduce((a,b)=>(b.sky||0)>(a?.sky||0)?b:a,null);
  return {date,half,count:group.length,first:group[0]?.time,last:group.at(-1)?.time,temp:temps.length?`${Math.min(...temps)}~${Math.max(...temps)}`:'—',pop:pops.length?Math.max(...pops):'—',weather:representative?weatherLabel(representative):'—'};
 }));
}
export function dailyTable(rows){
 const cells=summarize(rows),dates=[...new Set(rows.map(r=>r.date))];
 return `<p class="meta compact">시간예보를 오전·오후로 요약 · 옆으로 밀어보세요 →</p><div class="timeline-scroll daily-scroll" tabindex="0" role="region" aria-label="일별 예보"><table class="forecast-table daily-table"><thead><tr><th class="row-label" scope="col">날짜</th>${dates.map(d=>`<th colspan="2" scope="colgroup">${Number(d.slice(4,6))}/${Number(d.slice(6,8))}</th>`).join('')}</tr><tr><th class="row-label" scope="col">시간</th>${cells.map(c=>`<th scope="col"><button data-jump="${c.date}${c.half?'1200':'0000'}" ${c.count?'':'disabled'}>${c.half?'오후':'오전'}</button></th>`).join('')}</tr></thead><tbody>${[['날씨','weather'],['기온범위<br><small>℃</small>','temp'],['비 확률<br><small>최대 %</small>','pop']].map(([label,key])=>`<tr><th scope="row" class="row-label">${label}</th>${cells.map(c=>`<td>${esc(c[key])}</td>`).join('')}</tr>`).join('')}<tr class="coverage"><th scope="row" class="row-label">자료 시간</th>${cells.map(c=>`<td>${c.count?`${Number(c.first.slice(0,2))}~${Number(c.last.slice(0,2))}시`:'자료 없음'}</td>`).join('')}</tr></tbody></table></div>`;
}
