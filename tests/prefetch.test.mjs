import test from 'node:test';
import assert from 'node:assert/strict';
import {createWaterPrefetch} from '../water-prefetch.js';
test('one pass fetches both stations and charts, saves valid results',async()=>{
 const calls=[],saved=[];let job;
 const p=createWaterPrefetch({schedule:f=>job=f,read:()=>null,save:(...a)=>saved.push(a),request:async(path,{station})=>{
  calls.push(path+station);return path.endsWith('chart')?{station,officialChart:{}}:{stations:[{id:station,level:0,history:[]}]};
 }});
 p.start();p.start();await job();p.start();assert.equal(calls.length,4);assert.equal(saved.length,4);
});
test('fresh records skip requests and preserve their original age',async()=>{
 let job;const p=createWaterPrefetch({schedule:f=>job=f,read:(kind,id,age)=>{assert.equal(age,kind==='water'?300000:1800000);return {}},save:()=>assert.fail(),request:()=>assert.fail()});
 p.start();await job();
});
test('failed level does not stop other station or graphs; invalid data is not saved',async()=>{
 let job;const saved=[];const p=createWaterPrefetch({schedule:f=>job=f,read:()=>null,save:(...a)=>saved.push(a),request:async(path,{station})=>{
  if(path.endsWith('chart'))return {station,officialChart:{}};
  if(station==='4007630')throw Error('timeout');
  return {stations:[{id:station,level:null,history:[]}]};
 }});p.start();await job();assert.deepEqual(saved.map(x=>x[0]),['chart','chart']);
});
test('hidden page may schedule once when visible',async()=>{
 let visible=false,count=0;const p=createWaterPrefetch({enabled:()=>visible,schedule:()=>count++,read:()=>null,save(){},request(){}});
 p.start();assert.equal(count,0);visible=true;p.start();p.start();assert.equal(count,1);
});
