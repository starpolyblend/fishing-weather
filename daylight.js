// Approximate solar elevation from date, time and geographic coordinates.
// KST forecast timestamps; apparent horizon -0.833 degrees includes standard refraction.
export function isNight(date,time,lat,lon){
 if(!/^\d{8}$/.test(date||'')||!/^\d{4}$/.test(time||'')||!Number.isFinite(lat)||!Number.isFinite(lon))return false;
 const at=new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${time.slice(0,2)}:${time.slice(2,4)}:00+09:00`);
 if(!Number.isFinite(+at))return false;
 const rad=Math.PI/180,year=at.getUTCFullYear();
 const day=(+at-Date.UTC(year,0,1))/86400000+1;
 const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/86400000;
 const hour=at.getUTCHours()+at.getUTCMinutes()/60;
 const gamma=2*Math.PI/days*(Math.floor(day)-1+(hour-12)/24);
 const eq=229.18*(0.000075+0.001868*Math.cos(gamma)-0.032077*Math.sin(gamma)-0.014615*Math.cos(2*gamma)-0.040849*Math.sin(2*gamma));
 const dec=0.006918-0.399912*Math.cos(gamma)+0.070257*Math.sin(gamma)-0.006758*Math.cos(2*gamma)+0.000907*Math.sin(2*gamma)-0.002697*Math.cos(3*gamma)+0.00148*Math.sin(3*gamma);
 const solarMinutes=((hour*60+eq+4*lon)%1440+1440)%1440;
 const angle=(solarMinutes/4-180)*rad;
 const sinElevation=Math.sin(lat*rad)*Math.sin(dec)+Math.cos(lat*rad)*Math.cos(dec)*Math.cos(angle);
 return sinElevation<Math.sin(-0.833*rad);
}
