import {createRetryQueue} from './retry.js?v=0.7.9';
export function createRecovery({request,current,apply,diagnostic,visible,queueOptions={}}){
 const queue=createRetryQueue({visible,...queueOptions});
 function active(path,p,target){
  const c=current();if(path.startsWith('/api/water'))return c.tab==='water'&&c.station===p.station;
  if(path==='/api/tide')return c.tab==='tide'&&p.date>=c.tideStart&&p.date<=c.tideEnd;
  if(c.tab!=='weather')return false;
  if(path.startsWith('/api/observation'))return c.place===target;
  if(path==='/api/mid')return c.region===p.region;
  return c.nx===p.nx&&c.ny===p.ny;
 }
 function healthy(path,p,d,target){
  if(!d)return false;
  if(path.startsWith('/api/observation')){
   const o=d.observations?.[target];return !!o&&(Number.isFinite(o.rain)||o.rainDash===true)&&!o.delayed&&!o.stale&&
    (path.endsWith('yesterday')?d.date===current().yesterday:o.observedAt?.slice(0,10)===current().today);
  }
  if(path==='/api/weather')return Array.isArray(d.rows);
  if(path==='/api/mid')return Array.isArray(d.days);
  if(path==='/api/water')return d.stations?.some(s=>s.id===p.station&&Number.isFinite(s.level)&&Array.isArray(s.history));
  if(path==='/api/water-chart')return d.station===p.station&&!!d.officialChart;
  if(path==='/api/tide')return d.date===p.date&&d.station?.id==='SO_0757'&&d.days?.length===1&&d.days[0].date===p.date;
  return true;
 }
 function status(path,p,data,minimum=0){
  const target=current().place,keyParams=path==='/api/weather-extremes'?{nx:p.nx,ny:p.ny}:p,key=JSON.stringify([path,keyParams,path.startsWith('/api/observation')?target:'']);
  if(healthy(path,p,data,target)){queue.success(key);return}
  queue.fail(key,async()=>{
   diagnostic({path,params:p,result:'AUTO_RETRY'});
   const d=await request(path,p);
   // status() inside request handles transport recovery; validate application data too.
   if(healthy(path,p,d,target))queue.success(key);
   if(active(path,p,target))await apply(path,p,d);
  },()=>active(path,p,target),minimum||0);
 }
 return {status,sync:()=>queue.sync()};
}
