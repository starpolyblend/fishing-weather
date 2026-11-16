import test from 'node:test';import assert from 'node:assert/strict';
const elements=new Map();globalThis.document={querySelector(s){if(!elements.has(s))elements.set(s,{innerHTML:'',textContent:'',disabled:false,addEventListener(){}});return elements.get(s)}};
function storage(){const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}}
globalThis.localStorage=storage();globalThis.sessionStorage=storage();
const {createObservationView}=await import('../observation.js');
const {createTideView}=await import('../tides.js');
test('four places share two observation requests and persist across view recreation',async()=>{
 let calls=0;const date=new Date(Date.now()+32400000).toISOString().slice(0,10),yesterday=new Date(Date.now()+32400000-86400000).toISOString().slice(0,10).replaceAll('-','');
 const request=async path=>{calls++;return {date:yesterday,observations:Object.fromEntries(['yeolhwa','hyanggyo','songsan','sacho'].map(id=>[id,{observedAt:date+'T12:00:00+09:00',rain:0}]))}};
 const args={request,demo:false,apiBase:'https://test'};let view=createObservationView(args);
 for(const place of ['yeolhwa','hyanggyo','songsan','sacho'])await view.load(place);assert.equal(calls,2);
 view=createObservationView(args);await view.load('yeolhwa');assert.equal(calls,2);assert.match(elements.get('#observation').innerHTML,/0mm/);
});
test('fresh persisted tide dates are not requested again after recreation',async()=>{
 let calls=0;const request=async(path,{date})=>{calls++;return {date,station:{id:'SO_0757'},days:[{date,events:[{at:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T12:00:00+09:00`,time:'12:00',type:'high',height:100}]}]}};
 const args={request,apiBase:'https://test',demo:false};await createTideView(args).load();assert.equal(calls,11);
 await createTideView(args).load();assert.equal(calls,11);
});
test('expired tide predictions remain visible on failure and are refreshed on recovery',async()=>{
 const base='https://stale-test';let calls=0;
 const request=async(path,{date})=>{calls++;return {date,station:{id:'SO_0757'},days:[{date,events:[{at:`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T12:00:00+09:00`,time:'12:00',type:'high',height:100}]}]}};
 await createTideView({request,apiBase:base,demo:false}).load();
 const today=new Date(Date.now()+32400000).toISOString().slice(0,10).replaceAll('-',''),key=`fishing-tide-api-v3:${base}:${today}`;
 const stored=JSON.parse(localStorage.getItem(key));stored.at-=7*3600000;localStorage.setItem(key,JSON.stringify(stored));
 await createTideView({request:async()=>{throw Error('offline')},apiBase:base,demo:false}).load();assert.match(elements.get('#tide-content').innerHTML,/이전 자료/);assert.match(elements.get('#tide-content').innerHTML,/높이 100cm/);
 await createTideView({request,apiBase:base,demo:false}).load();assert.equal(calls,12);
});
