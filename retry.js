// One timer per resource; hidden/inactive resources never start network work.
export function createRetryQueue({visible=()=>!document.hidden,now=()=>Date.now(),setTimer=setTimeout,clearTimer=clearTimeout}={}){
 let running=0;
 const entries=new Map(),delays=[5000,30000,60000,120000,300000];
 function arm(key,e){
  if(e.timer||e.running||!visible()||!e.active())return;
  e.timer=setTimer(async()=>{
   e.timer=null;if(!visible()||!e.active())return;
   if(running>=3){e.due=now()+250;arm(key,e);return}
   running++;e.running=true;
   try{await e.task()}catch{}finally{running--;e.running=false;if(entries.get(key)===e){e.attempt++;e.due=now()+delays[Math.min(e.attempt,4)];arm(key,e)}}
  },Math.max(0,e.due-now()));
 }
 return {
  fail(key,task,active,minimum=0){let e=entries.get(key);if(!e){e={task,active,attempt:0,due:now()+Math.max(5000,minimum),timer:null,running:false};entries.set(key,e)}arm(key,e)},
  success(key){const e=entries.get(key);if(e?.timer)clearTimer(e.timer);entries.delete(key)},
  sync(){for(const [key,e] of entries){if(!visible()||!e.active()){if(e.timer)clearTimer(e.timer);e.timer=null}else arm(key,e)}},
  clear(){for(const e of entries.values())if(e.timer)clearTimer(e.timer);entries.clear()}
 };
}
