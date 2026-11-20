const key='fishing-diagnostics-v1';let entries=[];
try{entries=JSON.parse(sessionStorage.getItem(key)||'[]');if(!Array.isArray(entries))entries=[]}catch{}
export function diagnosticParams(params){return Object.fromEntries(Object.entries(params).filter(([k,v])=>['nx','ny','place','date','region','station'].includes(k)&&/^[a-z0-9_,.-]{1,40}$/i.test(String(v))))}
const panel=document.querySelector('#connection-diagnostics'),output=document.querySelector('#diagnostic-output');
function paint(){if(panel?.open)output.textContent=JSON.stringify({app:'0.7.15',records:entries},null,2)}
export function recordDiagnostic(entry){
 entries.push({at:new Date().toISOString(),...entry});entries=entries.slice(-60);
 try{sessionStorage.setItem(key,JSON.stringify(entries))}catch{}paint();
}
panel?.addEventListener('toggle',paint);
document.querySelector('#diagnostic-copy')?.addEventListener('click',async()=>{
 const status=document.querySelector('#diagnostic-status');
 try{await navigator.clipboard.writeText(JSON.stringify({app:'0.7.15',records:entries},null,2));status.textContent='기록을 복사했습니다.'}catch{status.textContent='아래 기록을 길게 눌러 복사해 주세요.'}
});
document.querySelector('#diagnostic-clear')?.addEventListener('click',()=>{entries=[];try{sessionStorage.removeItem(key)}catch{}paint()});
