import test from 'node:test';import assert from 'node:assert/strict';import worker from '../worker/worker.js';
function page(){const k=new Date(Date.now()+32400000);return `<input name="wlobscd" value="4007630"><table><caption>영산강홍수통제소지점별 수위자료</caption><th>수위표수위(m)</th><th>해발수위(El.m)</th><tr><td>${k.getUTCMonth()+1}.${k.getUTCDate()}. ${String(k.getUTCHours()).padStart(2,'0')}:${String(k.getUTCMinutes()).padStart(2,'0')}</td><td>2.16</td><td>0</td><td>113.41</td></tr></table>`}
async function check(t,mode){
 const prevFetch=globalThis.fetch,prevCache=globalThis.caches,tasks=[];t.after(()=>{globalThis.fetch=prevFetch;globalThis.caches=prevCache});
 globalThis.fetch=async()=>new Response(page());
 globalThis.caches={default:{async match(){if(mode==='read')throw Error('cache down');if(mode==='invalid')return new Response('{broken');return null},put(){if(mode==='write-sync')throw Error('write failed');return mode==='write-async'?Promise.reject(Error('write failed')):Promise.resolve()},delete:async()=>true}};
 const r=await worker.fetch(new Request('https://'+mode+'/api/water?station=4007630'),{}, {waitUntil:p=>tasks.push(p)});const d=await r.json();await Promise.all(tasks);
 assert.equal(r.status,200);assert.equal(d.stations[0].level,2.16);
 if(mode==='read')assert.equal(r.headers.get('X-Cache-Warning'),'CACHE_READ');
 if(mode==='invalid')assert.equal(r.headers.get('X-Cache-Warning'),'CACHE_INVALID');
}
for(const mode of ['read','invalid','write-sync','write-async'])test(`valid water survives cache ${mode} failure`,t=>check(t,mode));
test('failed first invocation cannot leave a stuck promise for another request',async t=>{
 const prev=globalThis.fetch,prevCache=globalThis.caches;globalThis.caches=undefined;t.after(()=>{globalThis.fetch=prev;globalThis.caches=prevCache});
 let calls=0,release;const gate=new Promise(r=>release=r);globalThis.fetch=async()=>{const n=++calls;if(n===1){await gate;throw Error('first request lost')}return new Response(page())};
 const request=new Request('https://independent-water/api/water?station=4007630');
 const first=worker.fetch(request,{});await new Promise(r=>setImmediate(r));
 const second=await worker.fetch(request,{});assert.equal(second.status,200);release();assert.equal((await first).status,502);assert.equal(calls,2);
});
