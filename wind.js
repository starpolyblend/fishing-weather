import {esc,unit} from './daily.js?v=0.4.1';
export function windInfo(direction,speed){
 if(speed===0)return {calm:true,label:'무풍',degrees:null};
 if(typeof direction!=='number'||!Number.isFinite(direction)||direction<0||direction>360)return null;
 const degrees=direction%360,names=['북','북북동','북동','동북동','동','동남동','남동','남남동','남','남남서','남서','서남서','서','서북서','북서','북북서'];
 return {calm:false,label:names[Math.round(degrees/22.5)%16],degrees};
}
export function windArrow(row){
 const w=windInfo(row.direction,row.wind);if(!w)return '—';if(w.calm)return '<span class="wind-calm">무풍</span>';
 return `<span class="wind-direction"><svg viewBox="0 0 32 32" class="wind-arrow" role="img" aria-label="${w.label}풍, ${w.label}쪽에서 불어오는 바람"><title>${w.label}풍 · 화살표는 바람이 향하는 쪽</title><path d="M13 3h6v15l8-4-11 16L5 14l8 4Z" fill="currentColor" transform="rotate(${w.degrees} 16 16)"/></svg><small>${w.label}</small></span>`;
}
export function windSpeed(row){return row.qualitative?esc(row.windLabel||'—'):unit(row.wind,'m/s')}
