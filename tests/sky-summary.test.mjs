import test from 'node:test';
import assert from 'node:assert/strict';
import {halfDayWeather,buildDays} from '../daily.js';
const hours=(skies,start=0)=>skies.map((sky,i)=>({date:'20261121',time:String(start+i).padStart(2,'0')+'00',sky,pty:0,temp:4,pop:0}));
test('brief overcast no longer overrides the predominant morning or afternoon sky',()=>{
 const am=hours([3,3,3,3,3,1,1,3,4,1,1,1]);
 const pm=hours([1,1,1,1,1,1,1,1,1,1,4,1],12);
 const rows=[...am,...pm],before=JSON.stringify(rows);
 const day=buildDays({rows},new Date('2026-11-21T09:00:00+09:00'))[0];
 assert.equal(day.parts[0].weather,'구름 많음');
 assert.equal(day.parts[1].weather,'맑음');
 assert.equal(JSON.stringify(rows),before);
});
test('sky ties favor cloudier valid categories; missing and duplicate hours do not distort counts',()=>{
 assert.equal(halfDayWeather(hours([1,3])),'구름 많음');
 assert.equal(halfDayWeather(hours([3,4])),'흐림');
 assert.equal(halfDayWeather(hours([null,undefined,0,2,1])),'맑음');
 assert.equal(halfDayWeather(hours([null,undefined])),null);
 assert.equal(halfDayWeather([]),null);
 const rows=hours([1,1,4]);
 assert.equal(halfDayWeather([...rows,rows[2],rows[2]]),'맑음');
});
test('precipitation priority and supplied midterm summaries remain intact',()=>{
 const rows=hours(Array(12).fill(1));rows[8].pty=1;
 assert.equal(halfDayWeather(rows),'일부 시간 비');
 rows.forEach(r=>r.pty=3);assert.equal(halfDayWeather(rows),'눈');
 const day=buildDays({rows:[],mid:{days:[{date:'20261121',parts:[{weather:'흐림',pop:30},{weather:'맑음',pop:0}]}]}},new Date('2026-11-21T09:00:00+09:00'))[0];
 assert.equal(day.parts[0].weather,'흐림');assert.equal(day.parts[1].weather,'맑음');
});
