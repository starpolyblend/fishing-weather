// Bookmarks and home-screen shortcuts are created by the browser, not this page.
const help=document.querySelector('#install-help'),message=document.querySelector('#install-message');
window.addEventListener('beforeinstallprompt',event=>event.preventDefault());
document.querySelector('#install-home').addEventListener('click',()=>{
 message.textContent='브라우저 메뉴(⋮ 또는 ≡)에서 “홈 화면에 추가” → “바로가기 만들기”를 선택해 주세요. 브라우저 안에만 저장하려면 별표(☆) 또는 “북마크 추가”를 선택하세요. 메뉴 이름은 브라우저마다 다를 수 있습니다. 이미 앱으로 설치했다면 브라우저에서 이 사이트 주소를 다시 열어 추가해 주세요. 이 버튼이 직접 바로가기를 만들지는 않습니다.';
 if(!help.open)help.showModal();
});
// Remove only this project's old service worker registration.
if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(registrations=>{
 const scope=new URL('./',location.href).href,script=new URL('./sw.js',location.href).href;
 for(const r of registrations)if(r.scope===scope&&[r.active,r.waiting,r.installing].some(w=>w?.scriptURL===script))r.unregister();
}).catch(()=>{});}
