import {esc} from './daily.js?v=0.4.0';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
export const observedText=t=>{const d=new Date(Date.parse(t)+9*3600000);return `${d.getUTCMonth()+1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}`};
export function chartModel(history){
 const unique=new Map();for(const p of history||[]){const t=Date.parse(p.observedAt);if(Number.isFinite(t)&&!unique.has(t))unique.set(t,{t,observedAt:p.observedAt,level:finite(p.level)?p.level:null})}
 const all=[...unique.values()].sort((a,b)=>a.t-b.t),last=all.at(-1)?.t;
 const points=all.filter(p=>p.t>=last-86400000),values=points.filter(p=>p.level!==null).map(p=>p.level);
 if(values.length<2)return {points,available:false};
 const low=Math.min(...values),high=Math.max(...values),span=Math.max(.2,high-low),raw=span/4,power=10**Math.floor(Math.log10(raw)),step=[1,2,5,10].find(n=>n*power>=raw)*power;
 let min=Math.floor((low-(span-(high-low))/2)/step)*step,max=Math.ceil((high+(span-(high-low))/2)/step)*step;
 if(max===min){min-=step;max+=step}
 const ticks=[];for(let n=0;n<=Math.round((max-min)/step);n++)ticks.push(min+n*step);
 const first=points[0].t,end=points.at(-1).t;
 const x=t=>54+(t-first)/(end-first||1)*290,y=v=>20+(max-v)/(max-min)*128;
 const segments=[];let part=[];
 for(const point of points){if(point.level===null){if(part.length)segments.push(part);part=[];continue}if(part.length&&point.t-part.at(-1).t>15*60000){segments.push(part);part=[]}part.push({...point,x:x(point.t),y:y(point.level)})}if(part.length)segments.push(part);
 return {points,available:true,min,max,ticks,first,end,x,y,segments};
}
export function waterChart(station){
 const model=chartModel(station.history),id='water-chart-'+station.id;
 if(!model.available)return '<p class="chart-empty">그래프를 그릴 관측자료가 부족합니다.</p>';
 const {points,segments,x,y,ticks,first,end}=model,latest=points.at(-1),latestText=`${observedText(latest.observedAt)} · ${latest.level===null?'자료 없음':latest.level.toFixed(2)+' '+station.unit}`;
 const timeTicks=[first,(first+end)/2,end];
 return `<div class="water-chart" id="${esc(id)}"><p class="chart-heading">최근 24시간 수위</p><p class="chart-readout" data-readout aria-live="polite">${esc(latestText)}</p><svg viewBox="0 0 360 185" class="level-chart" role="img" aria-label="${esc(station.name)} 수위 변화, 단위 ${esc(station.unit)}"><title>${esc(station.name)} 관측 수위</title><desc>가로축은 한국시간, 세로축은 ${esc(station.unit)} 수위입니다. 관측 공백은 선으로 연결하지 않습니다.</desc>${ticks.map(v=>`<line x1="54" x2="344" y1="${y(v)}" y2="${y(v)}" class="chart-grid"/><text x="48" y="${y(v)+4}" text-anchor="end" class="chart-label">${v.toFixed(2)}</text>`).join('')}${timeTicks.map((t,i)=>`<text x="${x(t)}" y="174" text-anchor="${i===0?'start':i===2?'end':'middle'}" class="chart-label">${observedText(new Date(t).toISOString())}</text>`).join('')}${segments.map(seg=>seg.length===1?`<circle cx="${seg[0].x}" cy="${seg[0].y}" r="2.5" class="chart-dot"/>`:`<polyline points="${seg.map(p=>`${p.x},${p.y}`).join(' ')}" class="chart-line"/>`).join('')}<line data-cursor x1="${x(latest.t)}" x2="${x(latest.t)}" y1="18" y2="150" class="chart-cursor"/><circle data-selected cx="${x(latest.t)}" cy="${latest.level===null?20:y(latest.level)}" r="4" class="chart-selected" ${latest.level===null?'visibility="hidden"':''}/></svg><label class="sr-only" for="${esc(id)}-slider">${esc(station.name)} 관측 시각 선택</label><input id="${esc(id)}-slider" class="chart-slider" type="range" min="0" max="${points.length-1}" step="1" value="${points.length-1}" aria-valuetext="${esc(latestText)}"><p class="chart-caption">시간을 밀어서 확인 · ${esc(station.unit)} · 세로축 자동 조절</p><details class="water-history"><summary>관측값 목록</summary><div class="water-history-scroll"><table><thead><tr><th>관측 시각</th><th>수위 (${esc(station.unit)})</th></tr></thead><tbody>${[...points].reverse().map(p=>`<tr><td>${observedText(p.observedAt)}</td><td>${p.level===null?'자료 없음':p.level.toFixed(2)}</td></tr>`).join('')}</tbody></table></div></details></div>`;
}
export function bindWaterCharts(stations,root=document){
 for(const station of stations){
  const box=root.getElementById('water-chart-'+station.id);if(!box)continue;
  const model=chartModel(station.history);if(!model.available)continue;
  const slider=box.querySelector('.chart-slider'),svg=box.querySelector('svg');
  const select=index=>{
   const p=model.points[index];if(!p)return;slider.value=index;
   const text=`${observedText(p.observedAt)} · ${p.level===null?'자료 없음':p.level.toFixed(2)+' '+station.unit}`;
   box.querySelector('[data-readout]').textContent=text;slider.setAttribute('aria-valuetext',text);
   const cursor=box.querySelector('[data-cursor]'),dot=box.querySelector('[data-selected]');cursor.setAttribute('x1',model.x(p.t));cursor.setAttribute('x2',model.x(p.t));dot.setAttribute('cx',model.x(p.t));dot.setAttribute('visibility',p.level===null?'hidden':'visible');if(p.level!==null)dot.setAttribute('cy',model.y(p.level));
  };
  slider.addEventListener('input',()=>select(Number(slider.value)));
  svg.addEventListener('click',e=>{const rect=svg.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,((e.clientX-rect.left)/rect.width*360-54)/290)),time=model.first+fraction*(model.end-model.first);let nearest=0;for(let i=1;i<model.points.length;i++)if(Math.abs(model.points[i].t-time)<Math.abs(model.points[nearest].t-time))nearest=i;select(nearest)});
 }
}
