// Browser-controlled install UI. Unsupported browsers receive manual instructions.
let installPrompt=null;
const installButton=document.querySelector('#install-home'),help=document.querySelector('#install-help'),message=document.querySelector('#install-message');
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function showHelp(text){message.textContent=text;if(!help.open)help.showModal()}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event});
window.addEventListener('appinstalled',()=>{installPrompt=null;if(help.open)help.close();installButton.title='홈 화면에 추가됨'});
installButton.addEventListener('click',async()=>{
 if(standalone()){showHelp('홈 화면에서 실행한 앱입니다. 이미 홈 화면에 추가되어 있어요.');return}
 if(installPrompt){const prompt=installPrompt;installPrompt=null;try{await prompt.prompt();await prompt.userChoice;return}catch{}}
 showHelp('브라우저 메뉴(⋮ 또는 ≡)에서 “홈 화면에 추가” 또는 “앱 설치”를 선택해 주세요. 메뉴가 없다면 Chrome이나 삼성 인터넷에서 이 주소를 열어 주세요.');
});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
