import test from 'node:test';
import assert from 'node:assert/strict';
import {buildDays,weatherIcon,halfDayWeather} from '../daily.js';
import {waterChart} from '../water-chart.js';
const afternoon=()=>Array.from({length:12},(_,i)=>({date:'20261118',time:String(i+12)+'00',pty:i===8?1:0,sky:4,temp:12,pop:i===8?60:30}));
test('one rainy hour produces intermittent daily rain without changing hourly data',()=>{
 const rows=afternoon();const day=buildDays({rows},new Date('2026-11-18T13:00:00+09:00'))[0];
 assert.equal(day.parts[1].weather,'일부 시간 비');assert.equal(day.parts[1].pop,60);
 assert.match(weatherIcon(day.parts[1].weather),/folded-umbrella/);assert.match(weatherIcon(day.parts[1].weather),/intermittent-sun/);
 assert.doesNotMatch(weatherIcon('비'),/folded-umbrella/);assert.equal(rows[8].pty,1);
});
test('persistent rain and sparse, unknown or gapped hours do not infer intermittent rain',()=>{
 assert.equal(halfDayWeather(afternoon().map(r=>({...r,pty:1}))),'비');
 assert.equal(halfDayWeather(afternoon().slice(8,10)),'비');
 const missing=afternoon();missing[2].pty=null;assert.equal(halfDayWeather(missing),'비');
 assert.equal(halfDayWeather(afternoon().filter((_,i)=>i!==3)),'비');
});
test('mixed precipitation and official occasional labels use folded umbrella',()=>{
 const rows=afternoon();rows[8].pty=2;assert.equal(halfDayWeather(rows),'일부 시간 비 또는 눈');
 for(const label of ['한때 비','가끔 비 또는 눈',halfDayWeather(rows)])assert.match(weatherIcon(label),/folded-umbrella/);
 assert.match(weatherIcon('가끔 비 또는 눈'),/snowman/);
});
test('water charts retain observed levels on left and remove right axis',()=>{
 for(const [id,unit,level,gaugeDatum] of [['4007625','EL.m',125.87,0],['4007630','m',2.17,111.25]]){
  const html=waterChart({id,name:id,unit,gaugeDatum,history:[{observedAt:'2026-11-18T12:00:00+09:00',level},{observedAt:'2026-11-18T12:10:00+09:00',level:level+.02}]});
  assert.doesNotMatch(html,/x="407"|translate\(468/);assert.ok(html.includes(level.toFixed(2)));
  assert.ok(html.includes(unit==='EL.m'?'해발수위(EL.m)':'수위표수위(m)'));
 }
});
