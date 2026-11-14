// Network-only: never cache weather or water readings as current data.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate')return;
 event.respondWith(fetch(event.request).catch(()=>new Response('<!doctype html><html lang="ko"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>아빠 낚시가?</title><body style="font:22px/1.6 sans-serif;padding:24px"><h1>인터넷 연결을 확인해 주세요</h1><p>최신 날씨와 수위를 보려면 인터넷 연결이 필요합니다.</p><p>연결 후 화면을 새로고침해 주세요.</p></body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'},status:503})));
});
