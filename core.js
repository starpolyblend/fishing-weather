export function kstDate(now = new Date()) { return new Date(now.getTime()+9*3600000).toISOString().slice(0,10); }
export function dayOffset(offset, now = new Date()) { return kstDate(new Date(now.getTime()+offset*86400000)); }
export function grid(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || lat < 32 || lat > 40 || lng < 123 || lng > 132) throw new Error('한국 내 정확한 위도·경도를 입력해 주세요.');
  const rad = Math.PI/180, re=6371.00877/5, sl1=30*rad, sl2=60*rad;
  const sn=Math.log(Math.cos(sl1)/Math.cos(sl2))/Math.log(Math.tan(Math.PI/4+sl2/2)/Math.tan(Math.PI/4+sl1/2));
  const sf=Math.pow(Math.tan(Math.PI/4+sl1/2),sn)*Math.cos(sl1)/sn;
  const ro=re*sf/Math.pow(Math.tan(Math.PI/4+38*rad/2),sn);
  const ra=re*sf/Math.pow(Math.tan(Math.PI/4+lat*rad/2),sn), theta=(lng-126)*rad*sn;
  return {nx:Math.floor(ra*Math.sin(theta)+43+0.5),ny:Math.floor(ro-ra*Math.cos(theta)+136+0.5)};
}
export function issueTimes(now = new Date()) {
  // 발표 후 15분의 제공 여유를 두고, 자료 지연 시 직전 발표까지 시도합니다.
  const t = new Date(now.getTime()+9*3600000-15*60000);
  const hour = Math.floor((t.getUTCHours()-2)/3)*3+2;
  t.setUTCHours(hour,0,0,0);
  return [0,1,2].map(i=>{ const d=new Date(t.getTime()-i*3*3600000);return {date:d.toISOString().slice(0,10).replaceAll('-',''),time:String(d.getUTCHours()).padStart(2,'0')+'00'}; });
}
export function numberOrNull(v) { if(v===null||v===undefined||String(v).trim()==='')return null;const n=Number(v);return Number.isFinite(n)&&n!==-999&&n!==-9999?n:null; }
export function forecasts(items) {
  const rows=new Map();
  for(const it of items){
    if(!/^\d{8}$/.test(it.fcstDate)||!/^\d{4}$/.test(it.fcstTime))continue;
    const key=it.fcstDate+it.fcstTime;
    if(!rows.has(key))rows.set(key,{date:it.fcstDate,time:it.fcstTime});
    const r=rows.get(key), v=it.fcstValue;
    if(it.category==='TMP')r.temp=numberOrNull(v);
    if(it.category==='POP')r.pop=numberOrNull(v);
    if(it.category==='WSD')r.wind=numberOrNull(v);
    if(it.category==='PTY')r.pty=numberOrNull(v);
    if(it.category==='SKY')r.sky=numberOrNull(v);
    if(it.category==='PCP')r.rain=(v==null||String(v).trim()===''||String(v)==='-999')?null:String(v);
  }
  return [...rows.values()].filter(r=>'temp'in r||'pop'in r||'wind'in r||'rain'in r).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
}
export function weatherLabel(row) { return ({1:'비',2:'비 또는 눈',3:'눈',4:'소나기'})[row.pty] || ({1:'맑음',3:'구름 많음',4:'흐림'})[row.sky] || '날씨'; }
export function rainText(value){if(value==null)return '확인 불가';if(value==='강수없음'||value==='0'||value==='0.0')return '없음';return /mm|㎜/.test(value)?value:value+'mm';}
