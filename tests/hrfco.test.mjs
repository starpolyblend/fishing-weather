import test from 'node:test';import assert from 'node:assert/strict';import worker,{hrfcoRows,parseHrfcoWater,hrfcoTimestamp,waterStations} from '../worker/worker.js';
const now=Date.parse('2026-11-16T20:30:00+09:00'),bridge=waterStations[0],dam=waterStations[1];
const row=(id,time,wl)=>({wlobscd:id,ymdhm:time,wl});
test('HRFCO uppercase content and documented auth error envelopes',()=>{assert.equal(hrfcoRows({content:[{WLOBSCD:'4007630',WL:'0'}]})[0].wl,'0');assert.throws(()=>hrfcoRows({result:{code:940,message:'private'}}),e=>e.code==='HRFCO_AUTH'&&e.apiCode==='940'&&!e.message.includes('private'))});
test('bridge gauge levels and dam elevations are not confused, including zero datum',()=>{
 for(const [station,gdt,expected] of [[bridge,'111.25',2],[dam,'123',125],[dam,'0',2]]){const d=parseHrfcoWater([row(station.id,'202611162010','2')],{wlobscd:station.id,obsnm:station.name,gdt},station,now);assert.equal(d.level,expected);assert.equal(d.gaugeDatum,Number(gdt))}
});
test('unverified station identity and missing dam datum fail rather than guessing',()=>{assert.throws(()=>parseHrfcoWater([],{wlobscd:dam.id,obsnm:'다른 댐',gdt:0},dam,now),{code:'HRFCO_STATION'});assert.throws(()=>parseHrfcoWater([],{wlobscd:dam.id,obsnm:dam.name},dam,now),{code:'HRFCO_DATUM'})});
test('invalid dates, sentinel values, foreign stations and future timestamps are excluded; gaps remain',()=>{
 assert.equal(hrfcoTimestamp('202602302000'),null);
 const d=parseHrfcoWater([row(bridge.id,'202611162000','0'),row(bridge.id,'202611162010','-999'),row(bridge.id,'202611162020','1.2'),row(bridge.id,'202611172000','99'),row(dam.id,'202611162030','125')],{wlobscd:bridge.id,obsnm:bridge.name,gdt:'111.25'},bridge,now);
 assert.equal(d.level,1.2);assert.deepEqual(d.history.map(p=>p.level),[0,null,1.2]);
});
function harness(t){const original={fetch:globalThis.fetch,caches:globalThis.caches};t.after(()=>Object.assign(globalThis,original));const store=new Map(),tasks=[];globalThis.caches={default:{async match(r){return store.get(r.url)?.clone()},async put(r,v){store.set(r.url,v.clone())}}};return {ctx:{waitUntil(p){tasks.push(p)}},flush:()=>Promise.all(tasks)}}
test('key-enabled Worker uses HTTPS API only, reuses metadata, and returns history with sanitized source',async t=>{
 const h=harness(t),urls=[];globalThis.fetch=async input=>{const u=new URL(input);urls.push(u);assert.equal(u.protocol,'https:');assert.equal(u.hostname,'api.hrfco.go.kr');const id=u.pathname.includes('/4007625/')?dam.id:bridge.id;const stamp=new Date(Date.now()+32400000-1200000).toISOString().slice(0,16).replace(/[-T:]/g,'');return new Response(JSON.stringify({content:u.pathname.endsWith('/info.json')?waterStations.map(s=>({WLOBSCD:s.id,OBSNM:s.name,GDT:'0'})):[{WLOBSCD:id,YMDHM:stamp,WL:'2'}]}))};
 for(const id of [bridge.id,dam.id]){const r=await worker.fetch(new Request(`https://api-test/api/water?station=${id}`),{HRFCO_SERVICE_KEY:'mock-private-key'},h.ctx),d=await r.json();assert.equal(r.status,200);assert.equal(d.provider,'hrfco');assert.equal(d.stations[0].history.length,1);assert.ok(!JSON.stringify(d).includes('mock-private-key'));await h.flush()}
 assert.equal(urls.length,3);assert.match(urls[1].pathname,/\/list\/10M\/4007630\/\d{12}\/\d{12}\.json$/);
});
test('auth error 940 is available for diagnosis without exposing key or raw error',async t=>{const h=harness(t);globalThis.fetch=async()=>new Response(JSON.stringify({result:{code:940,message:'mock-private-key'}}));const r=await worker.fetch(new Request('https://api-auth-test/api/water?station=4007630'),{HRFCO_SERVICE_KEY:'mock-private-key'},h.ctx),d=await r.json();assert.equal(r.status,502);assert.equal(d.code,'HRFCO_AUTH');assert.equal(d.apiCode,'940');assert.ok(!JSON.stringify(d).includes('mock-private-key'))});
