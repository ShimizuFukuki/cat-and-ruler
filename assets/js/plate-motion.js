(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PlateMotion=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=t=>t*t*(3-2*t);
 function weights(progress,count){
  const w=Array(count).fill(0);w[0]=1;
  for(let i=1;i<count;i++){
   const start=count===2?.48:i/count-.07,end=count===2?.74:i/count+.07;
   const blend=ease(clamp((progress-start)/(end-start)));
   w[i-1]*=1-blend;w[i]=blend;
  }
  return w;
 }
 function step(current,target,dt,reduced){
  const k=reduced?1:1-Math.exp(-Math.min(dt,50)/170);
  const next=current.map((v,i)=>v+(target[i]-v)*k);
  return next.every((v,i)=>Math.abs(v-target[i])<.0005)?target.slice():next;
 }
 // Source-over alpha for a true weighted dissolve; the mount never shines through.
 function alphas(weights){let sum=0;return weights.map(w=>{sum+=w;return sum?w/sum:0;});}
 function create(mount,first,entries,asset,reduced){
  let requested=weights(0,entries.length),current=requested.slice(),raf=0,last=0;
  const ready=entries.map(()=>false),plates=[],images=[];
  function available(){
   const valid=requested.map((w,i)=>ready[i]?w:0),sum=valid.reduce((a,b)=>a+b,0);
   if(sum>.001)return valid.map(w=>w/sum);
   const fallback=current.findIndex((w,i)=>w>.001&&ready[i]);
   return valid.map((_,i)=>i===fallback?1:0);
  }
  function paint(){
   const opacity=alphas(current),active=current.indexOf(Math.max(...current));
   plates.forEach((plate,i)=>{plate.style.opacity=ready[i]?String(opacity[i]):'0';plate.setAttribute('aria-hidden',String(i!==active||!ready[i]));});
   mount.parentElement.style.setProperty('--plate-position',String(current.reduce((a,w,i)=>a+w*i,0)/(entries.length-1)));
   const tabs=mount.nextElementSibling;
   if(tabs)tabs.style.setProperty('--plate-rail',Math.max(0,tabs.clientWidth-28)+'px');
   window.MarginInk?.invalidate();
  }
  function tick(now){
   const target=available(),dt=last?now-last:16.67;last=now;
   current=step(current,target,dt,reduced.matches);paint();
   if(current.some((v,i)=>Math.abs(v-target[i])>.00001))raf=requestAnimationFrame(tick);else{raf=0;last=0;}
  }
  function wake(){if(!raf)raf=requestAnimationFrame(tick);}
  entries.forEach((entry,i)=>{
   const plate=document.createElement('span'),img=i?document.createElement('img'):first;
   plate.className='process-plate';plate.style.opacity='0';
   img.draggable=false;img.decoding='async';img.alt=entry.label||entry.title||'';img.dataset.inkAsset=entry.file;
   async function loaded(){try{if(img.decode)await img.decode();}catch{}if(!img.naturalWidth)return;ready[i]=true;wake();}
   img.onload=loaded;img.onerror=()=>{ready[i]=false;mount.dataset.loadError='true';wake();};
   plate.append(img);mount.append(plate);plates.push(plate);images.push(img);img.src=asset(entry.file);
   if(img.complete&&img.naturalWidth)loaded();
  });
  reduced.addEventListener('change',wake);
  return {set(progress){requested=weights(progress,entries.length);wake();},images,plates};
 }
 return {weights,step,alphas,create};
});
