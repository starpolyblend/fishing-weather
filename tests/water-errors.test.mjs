import test from 'node:test';import assert from 'node:assert/strict';import worker from '../worker/worker.js';
async function run(t,host,mock,path='/api/water?station=4007630'){
 const old=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return mock()};t.after(()=>globalThis.fetch=old);
 const req=new Request(`https://${host}${path}`),r=await worker.fetch(req,{}),d=await r.json();assert.equal(r.status,502);
 return {req,d,calls:()=>calls};
}
test('upstream HTTP failure is sanitized and repeated missing levels are suppressed',async t=>{
 const x=await run(t,'water-http',()=>new Response('private details',{status:503}));assert.equal(x.d.code,'WATER_HTTP');assert.equal(x.d.upstreamStatus,503);assert.ok(!JSON.stringify(x.d).includes('private details'));
 const r=await worker.fetch(x.req,{});assert.equal(r.status,502);assert.equal(r.headers.get('X-Data-Cache'),'failure-cooldown');assert.equal(x.calls(),1);
});
test('HTML layout mismatch is distinct from network error',async t=>{const x=await run(t,'water-format',()=>new Response('<html>maintenance</html>'));assert.equal(x.d.code,'WATER_FORMAT')});
test('timeout is recorded explicitly',async t=>{const x=await run(t,'water-timeout',()=>{throw new DOMException('slow','TimeoutError')});assert.equal(x.d.code,'WATER_TIMEOUT')});
test('chart invalid JSON is recorded explicitly',async t=>{const x=await run(t,'water-json',()=>new Response('<html>maintenance</html>'),'/api/water-chart?station=4007625');assert.equal(x.d.code,'WATER_CHART_FORMAT')});
