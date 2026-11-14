const button=document.querySelector('#share-site'),dialog=document.querySelector('#share-help'),field=document.querySelector('#share-url'),status=document.querySelector('#share-status');
// Share the public starting screen, without demo flags or developer settings.
const shareURL=new URL('./',location.href).href;
field.value=shareURL;
function showCopy(){status.textContent='';if(!dialog.open)dialog.showModal()}
button.addEventListener('click',async()=>{
 if(button.disabled)return;
 const data={title:'아빠 낚시가?',text:'낚시 가기 전, 날씨와 가장교·보성강댐 수위를 확인해 보세요. 가입 없이 바로 볼 수 있어요.',url:shareURL};
 if(typeof navigator.share!=='function'){showCopy();return}
 button.disabled=true;
 try{await navigator.share(data)}catch(error){if(error.name!=='AbortError')showCopy()}finally{button.disabled=false}
});
document.querySelector('#copy-share').addEventListener('click',async()=>{
 try{if(!navigator.clipboard?.writeText)throw Error('clipboard');await navigator.clipboard.writeText(shareURL);status.textContent='링크를 복사했어요. 카카오톡 대화창에 붙여넣어 주세요.'}
 catch{field.focus();field.select();field.setSelectionRange(0,field.value.length);status.textContent='주소를 길게 눌러 복사한 뒤 카카오톡에 붙여넣어 주세요.'}
});
window.addEventListener('beforeinstallprompt',event=>event.preventDefault());
// Preserve retirement of this project's former PWA worker only.
if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(registrations=>{
 const scope=new URL('./',location.href).href,script=new URL('./sw.js',location.href).href;
 for(const r of registrations)if(r.scope===scope&&[r.active,r.waiting,r.installing].some(w=>w?.scriptURL===script))r.unregister();
}).catch(()=>{});}
