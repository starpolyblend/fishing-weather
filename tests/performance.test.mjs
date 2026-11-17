import test from 'node:test';import assert from 'node:assert/strict';
import worker,{issueTimes} from '../worker/worker.js';
const env={KMA_SERVICE_KEY:'mock-secret'};
function harness(t){
 const priorFetch=globalThis.fetch,priorCache=globalThis.caches,store=new Map(),tasks=[];
 globalThis.caches={default:{async match(r){return store.get(r.url)?.clone()},async put(r,v){store.set(r.url,v.clone())}}};
 t.after(()=>{globalThis.fetch=priorFetch;globalThis.caches=priorCache});
 return {store,ctx:{waitUntil(p){tasks.push(p)}},flush:()=>Promise.all(tasks)};
}
const json=(items,code='00')=>new Response(JSON.stringify({response:{header:{resultCode:code},body:{items:{item:items},totalCount:items.length}}}));
function items(date){return [{category:'TMP',fcstDate:date,fcstTime:'2300',fcstValue:'12'}]}
test('forecast cache reuses an issue; supplement is separate and bound to issue',async t=>{
 const h=harness(t);let calls=0;globalThis.fetch=async u=>{calls++;return json(items(new URL(u).searchParams.get('base_date')))};
 const req=new Request('https://performance/api/weather?nx=64&ny=66');
 const response=await worker.fetch(req,env,h.ctx),data=await response.json();await h.flush();assert.equal(calls,1);assert.equal(data.dailyMinimumSupplement,undefined);
 const second=await worker.fetch(req,env,h.ctx);assert.equal(second.headers.get('X-Data-Cache'),'hit');assert.equal(calls,1);
 const ttl=[...h.store.entries()].find(([k])=>k.includes('weather-main'))[1].headers.get('Cache-Control');assert.match(ttl,/21600/);
 const mismatch=await worker.fetch(new Request('https://performance/api/weather-extremes?nx=64&ny=66&issuedAt=old'),env,h.ctx);assert.equal(mismatch.status,409);assert.equal(calls,1);
});
test('not-yet-published fallback is cached for only a minute',async t=>{
 const h=harness(t);let calls=0;globalThis.fetch=async u=>{calls++;return json(calls===1?[]:items(new URL(u).searchParams.get('base_date')),calls===1?'03':'00')};
 const r=await worker.fetch(new Request('https://fallback-performance/api/weather?nx=62&ny=66'),env,h.ctx);assert.equal(r.status,200);await h.flush();assert.equal(calls,2);
 assert.match([...h.store.entries()].find(([k])=>k.includes('weather-main'))[1].headers.get('Cache-Control'),/max-age=60$/);
});
test('failed repeated requests have cooldown and do not reveal raw upstream errors',async t=>{
 const h=harness(t);let calls=0;globalThis.fetch=async()=>{calls++;throw Error('mock-secret')};
 const req=new Request('https://failure-performance/api/weather?nx=56&ny=59');
 for(let i=0;i<2;i++){const r=await worker.fetch(req,env,h.ctx);assert.equal(r.status,502);assert.ok(!(await r.text()).includes('mock-secret'))}assert.equal(calls,1);
});
test('concurrent invocations do not share live upstream promises',async t=>{
 const h=harness(t);let calls=0,release;const gate=new Promise(r=>release=r);globalThis.fetch=async u=>{calls++;await gate;return json(items(new URL(u).searchParams.get('base_date')))};
 const req=new Request('https://concurrent-performance/api/weather?nx=67&ny=62');
 const a=worker.fetch(req,env,h.ctx),b=worker.fetch(req,env,h.ctx);await new Promise(r=>setImmediate(r));release();
 const result=await Promise.all([a,b]);assert.ok(result.every(r=>r.status===200));assert.equal(calls,2);await h.flush();
});
test('incomplete observation batches expire after five seconds; complete batches keep five minutes',async t=>{
 const h=harness(t);let complete=false;
 globalThis.fetch=async()=>{const tm=new Date(Date.now()+32400000).toISOString().slice(0,16).replace(/[-T:]/g,'');return new Response(JSON.stringify({items:(complete?['258','732','767','785']:['258']).map(awsStnId=>({awsStnId,tm,awsPcpDay:'0'}))}))};
 for(const mode of [false,true]){complete=mode;const r=await worker.fetch(new Request(`https://observations-${mode}/api/observation?place=all`),{},h.ctx);assert.equal(r.status,200);await h.flush();const saved=[...h.store.entries()].find(([k])=>k.includes(`observations-${mode}`))[1];assert.equal(saved.headers.get('Cache-Control'),`public, max-age=${mode?300:5}`)}
});
test('server cooldown exposes remaining duration rather than a new five seconds',async t=>{
 const h=harness(t),oldNow=Date.now;let now=oldNow();Date.now=()=>now;t.after(()=>Date.now=oldNow);globalThis.fetch=async()=>new Response('unavailable',{status:503});
 const req=new Request('https://remaining-cooldown/api/water?station=4007630');const first=await worker.fetch(req,{},h.ctx);assert.equal((await first.json()).retryAfterMs,5000);now+=2000;const second=await worker.fetch(req,{},h.ctx);assert.equal((await second.json()).retryAfterMs,3000);
});
