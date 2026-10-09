/* Local time, daylight and small movements. No network or archive content. */
window.createRoomLife = function (a) {
 'use strict';
 const {T,scene,root,renderer,canvasTexture,windowTexture,assetPromises,outside,sideView,
  sun,hemi,frontLight,windowFill,lightPatch,dust,clock,rod,M} = a;
 const clamp=x=>Math.max(0,Math.min(1,x));
 const keys=[
  {h:0,n:1,sky:'#809acb',ground:'#414c69',sun:'#a5bae0',power:.12,fill:.16,ambient:.78,exposure:1.00,tint:'#dce3f2',patch:0},
  {h:5,n:.92,sky:'#9a9ab5',ground:'#555764',sun:'#d6afb4',power:.18,fill:.32,ambient:.73,exposure:.96,tint:'#eee0e0',patch:.01},
  {h:7,n:.08,sky:'#d4dfe9',ground:'#98836f',sun:'#ffe1b4',power:1.15,fill:.24,ambient:.96,exposure:1.03,tint:'#fff1df',patch:.21},
  {h:12,n:0,sky:'#d4e4eb',ground:'#978576',sun:'#fff1d8',power:1.65,fill:.25,ambient:.98,exposure:1.01,tint:'#ffffff',patch:.26},
  {h:16,n:0,sky:'#d6dfe5',ground:'#a1876c',sun:'#ffdfad',power:1.38,fill:.23,ambient:.94,exposure:1.02,tint:'#fff0d9',patch:.24},
  {h:18,n:.36,sky:'#bbb1c4',ground:'#665f67',sun:'#ffc89b',power:.72,fill:.36,ambient:.89,exposure:.98,tint:'#f1c3a7',patch:.13},
  {h:20,n:1,sky:'#809acb',ground:'#414c69',sun:'#a5bae0',power:.12,fill:.16,ambient:.78,exposure:1.00,tint:'#dce3f2',patch:0},
  {h:24,n:1,sky:'#809acb',ground:'#414c69',sun:'#a5bae0',power:.12,fill:.16,ambient:.78,exposure:1.00,tint:'#dce3f2',patch:0}
 ];
 function sample(hour){
  hour=((Number(hour)%24)+24)%24;if(!Number.isFinite(hour))hour=12;
  const i=keys.findIndex((k,j)=>j<keys.length-1&&hour>=k.h&&hour<keys[j+1].h),lo=keys[Math.max(0,i)],hi=keys[Math.max(0,i)+1];
  let t=clamp((hour-lo.h)/(hi.h-lo.h));t=t*t*(3-2*t);const v={hour};
  for(const k of ['n','power','fill','ambient','exposure','patch'])v[k]=lo[k]+(hi[k]-lo[k])*t;
  for(const k of ['sky','ground','sun','tint'])v[k]=new T.Color(lo[k]).lerp(new T.Color(hi[k]),t);
  return v;
 }
 const nightViews=[];
 for(const [direction,day,aspect] of [['north',outside,4.50/2.22],['west',sideView,1.70/2.10]]){
  const tex=windowTexture(direction+'Night',aspect);
  const night=new T.Mesh(day.geometry,new T.MeshBasicMaterial({map:tex,transparent:true,opacity:0,depthWrite:false,toneMapped:false}));
  night.position.copy(day.position);night.rotation.copy(day.rotation);night.position.z+=.001;
  night.userData.dynamic=true;day.parent.add(night);nightViews.push(night);
 }
 // UV motion is masked to the foliage at the left edge of each existing landscape.
 // Houses, mountains and the window frame keep their positions.
 const windTime={value:0},windStrength={value:.4},windMaterials=[];
 for(const view of [outside,sideView,...nightViews]){
  const material=view.material,west=view===sideView||view===nightViews[1];windMaterials.push(material);
  material.onBeforeCompile=shader=>{
   shader.uniforms.roomWindTime=windTime;
   shader.uniforms.roomWindStrength=windStrength;
   shader.uniforms.roomTreeSide={value:west?1:0};
   shader.fragmentShader='uniform float roomWindTime;\nuniform float roomWindStrength;\nuniform float roomTreeSide;\n'+shader.fragmentShader;
   const mapChunk=T.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )',`texture2D( map, roomWindUv )`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
    #ifdef USE_MAP
    vec2 roomWindUv=vMapUv;
    float northEdge=mix(0.205,0.10,smoothstep(0.62,0.96,vMapUv.y))+sin(vMapUv.y*24.0)*0.014;
    float westEdge=mix(0.18,0.31,smoothstep(0.35,0.60,vMapUv.y))+sin(vMapUv.y*22.0)*0.019;
    float treeEdge=mix(northEdge,westEdge,roomTreeSide);
    float foliage=(1.0-smoothstep(treeEdge-0.04,treeEdge,vMapUv.x))*smoothstep(0.08,0.70,vMapUv.y);
    roomWindUv.x+=foliage*(sin(roomWindTime*1.18+vMapUv.y*8.0)*0.007+sin(roomWindTime*2.1+vMapUv.y*19.0)*0.0018)*roomWindStrength;
    roomWindUv.y+=foliage*sin(roomWindTime*1.34+vMapUv.x*13.0)*0.0025*roomWindStrength;
    #endif
    `+mapChunk);
  };
  material.customProgramCacheKey=()=> 'room-foliage-wind-v1';material.needsUpdate=true;
 }

 // Working hands replace the previous permanently painted time.
 const hands=[new T.Group(),new T.Group(),new T.Group()];hands.forEach(g=>{g.position.z=.053;g.userData.dynamic=true;clock.add(g);});
 rod([0,-.014,0],[0,.052,0],.004,M.woodDark,hands[0]);
 rod([0,-.018,.001],[0,.083,.001],.003,M.woodDark,hands[1]);
 rod([0,-.027,.004],[0,.086,.004],.0015,M.red,hands[2]);
 let setting='auto',lastMinute=-1,lastSecond=-1,current=sample(12),phase=0;
 try{const saved=localStorage.getItem('cat-room-time');if(['auto','7','12','18','22'].includes(saved))setting=saved;}catch{}
 const selector=document.createElement('select');selector.id='room-time';selector.setAttribute('aria-label','窗外时间');
 for(const [value,text] of [['auto','随当地时间'],['7','清晨'],['12','白昼'],['18','黄昏'],['22','夜晚']]){const option=document.createElement('option');option.value=value;option.textContent=text;selector.append(option);}
 selector.value=setting;const wrap=document.createElement('label');wrap.className='room-time-control';const caption=document.createElement('span');caption.textContent='窗外';wrap.append(caption,selector);document.querySelector('.room-footer').append(wrap);
 function apply(hour){
  current=sample(hour);nightViews.forEach(m=>{m.material.opacity=current.n;});
  outside.material.color.copy(current.tint);sideView.material.color.copy(current.tint);
  hemi.color.copy(current.sky);hemi.groundColor.copy(current.ground);hemi.intensity=current.ambient;
  sun.color.copy(current.sun);sun.intensity=current.power;frontLight.intensity=current.fill;
  renderer.toneMappingExposure=current.exposure;
  lightPatch.material.opacity=current.patch*.58;windowFill.intensity=.30+.34*(1-current.n);windowFill.color.set(current.n>.6?'#a8c2ed':'#e8ecee');
  dust.material.opacity=.30+.15*(1-current.n);
  document.body.dataset.daypart=current.n>.65?'night':current.n>.15?'twilight':'day';
  renderer.shadowMap.needsUpdate=true;
 }
 function setTime(value){if(!['auto','7','12','18','22'].includes(String(value)))return;setting=String(value);selector.value=setting;lastMinute=-1;try{localStorage.setItem('cat-room-time',setting);}catch{}tick(0,false);}
 selector.addEventListener('change',()=>setTime(selector.value));
 function tick(dt,moving){
  const now=new Date(),minutes=now.getHours()*60+now.getMinutes();
  if(minutes!==lastMinute){lastMinute=minutes;apply(setting==='auto'?minutes/60:Number(setting));}
  if(now.getSeconds()!==lastSecond){lastSecond=now.getSeconds();const h=now.getHours(),m=now.getMinutes(),s=moving?now.getSeconds():0;
   hands[0].rotation.z=-((h%12)+m/60)*Math.PI/6;hands[1].rotation.z=-(m+s/60)*Math.PI/30;hands[2].rotation.z=-s*Math.PI/30;}
  if(moving){phase+=dt;windTime.value=phase;windStrength.value=.40+.65*Math.pow(.5+.5*Math.sin(phase*.52),3);lightPatch.material.opacity=current.patch*.58*(.96+Math.sin(phase*.47)*.04);}
 }
 tick(0,false);
 return {tick,setTime,sample,nightViews,hands,windTime,windStrength,windMaterials,get state(){return {setting,hour:current.hour,night:current.n,wind:windStrength.value};}};
};
