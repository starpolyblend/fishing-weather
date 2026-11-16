// One background pass per page. Shared request() coalesces foreground requests.
export function createWaterPrefetch({request,read,save,enabled=()=>true,schedule=fn=>setTimeout(fn,150)}){
 let started=false;
 async function station(id){
  if(!enabled())return;
  if(!read('water',id,300000)){
   try{
    const data=await request('/api/water',{station:id});
    const s=data.stations?.find(s=>s.id===id);
    if(s&&Number.isFinite(s.level)&&Array.isArray(s.history))save('water',id,s);
   }catch{/* Keep existing observations; foreground uses the shared cooldown. */}
  }
  if(!enabled()||read('chart',id,1800000))return;
  try{
   const d=await request('/api/water-chart',{station:id});
   if(d.station===id&&d.officialChart)save('chart',id,d);
  }catch{/* Optional graph failure does not affect the weather screen. */}
 }
 return {start(){
  if(started||!enabled())return;
  started=true;
  schedule(()=>Promise.allSettled(['4007625','4007630'].map(station)));
 }};
}
