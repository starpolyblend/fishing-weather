import {grid} from './core.js';
const cfg=window.APP_CONFIG;const fields=document.querySelector('#fields');document.querySelector('#api').value=cfg.apiBase||'';
for(let i=0;i<4;i++){
  const p=cfg.locations[i]||{};const field=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=`장소 ${i+1}`;field.append(legend);
  for(const [key,label,type] of [['name','장소 이름','text'],['description','위치 설명','text'],['lat','위도 (예: 34.12345)','number'],['lng','경도 (예: 127.12345)','number']]){
    const lab=document.createElement('label'),input=document.createElement('input');lab.htmlFor=`${key}${i}`;lab.textContent=label;input.id=lab.htmlFor;input.type=type;if(type==='number'){input.step='any';input.inputMode='decimal';}input.value=p[key]??'';field.append(lab,input);
  }fields.append(field);
}
document.querySelector('#setup').onsubmit=e=>{
  e.preventDefault();const output=document.querySelector('#result');output.hidden=false;
  try{
    const api=new URL(document.querySelector('#api').value.trim());if(api.protocol!=='https:'||api.username||api.password||api.search||api.hash)throw new Error('인증정보가 없는 HTTPS Worker 주소를 입력하세요.');
    const locations=[],grids=[];
    for(let i=0;i<4;i++){
      const get=k=>document.getElementById(k+i).value.trim(),name=get('name');if(!name)continue;
      if(!get('lat')||!get('lng'))throw new Error(`${name}: 위도와 경도를 입력하세요.`);
      const lat=Number(get('lat')),lng=Number(get('lng')),g=grid(lat,lng);grids.push(`${g.nx},${g.ny}`);
      locations.push({id:cfg.locations[i]?.id||`place${i+1}`,name,description:get('description'),lat,lng});
    }
    if(!locations.length)throw new Error('장소를 하나 이상 등록하세요.');
    const next={...cfg,apiBase:api.origin,locations};
    const blob=new Blob(['// 공개 설정입니다. API 인증키를 넣지 마세요.\nwindow.APP_CONFIG = '+JSON.stringify(next,null,2)+';\n'],{type:'text/javascript;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='config.js';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
    output.textContent=`config.js를 내려받았습니다. GitHub의 기존 파일을 교체하세요. Cloudflare의 선택 설정 ALLOWED_GRIDS 값: ${[...new Set(grids)].join(';')}`;
  }catch(err){output.textContent=err.message;}
};
