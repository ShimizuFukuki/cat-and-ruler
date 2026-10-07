/* One fixed image plane: time dissolves revisions without moving their shared landmarks. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PlateMotion=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=t=>t*t*t*(t*(t*6-15)+10);
 function selection(progress,count,index){return index??(count===2?(progress<.6?0:1):Math.min(count-1,Math.floor(clamp(progress)*count)));}
 function create(mount,first,entries,asset,reduced){
  const ready=entries.map(()=>false),plates=[],images=[];
  let requested=0,current=-1,exchange=null,raf=0;
  const duration=1500;
  function rail(value){mount.parentElement.style.setProperty('--plate-position',String(value/Math.max(1,entries.length-1)));const tabs=mount.nextElementSibling;if(tabs)tabs.style.setProperty('--plate-rail',Math.max(0,tabs.clientWidth-28)+'px');}
  function show(base,overlay=-1,alpha=0){
   plates.forEach((plate,i)=>{
    // The base stays opaque: identical areas retain their light and colour throughout.
    plate.style.opacity=ready[i]?(i===base?'1':i===overlay?String(alpha):'0'):'0';
    plate.style.zIndex=i===overlay?'2':i===base?'1':'0';
    plate.style.willChange=overlay>=0&&(i===base||i===overlay)?'opacity':'auto';
    plate.setAttribute('aria-hidden',String(i!==(overlay<0?base:overlay)));
   });
  }
  function settle(index){current=index;exchange=null;mount.dataset.plateState='still';show(index);rail(index);}
  function tick(now){
   raf=0;
   if(current<0){const firstReady=ready[requested]?requested:ready.findIndex(Boolean);if(firstReady<0)return;settle(firstReady);}
   if(reduced.matches){settle(ready[requested]?requested:current);return;}
   if(!exchange&&requested!==current&&ready[requested]){
    exchange={from:current,to:requested,progress:0,last:now};mount.dataset.plateState='dissolving';
   }
   if(exchange){
    const x=exchange,goal=requested===x.from?0:1;
    x.progress=clamp(x.progress+(goal?1:-1)*(now-x.last)/duration);x.last=now;
    const alpha=ease(x.progress);show(x.from,x.to,alpha);rail(x.from+(x.to-x.from)*alpha);
    if(x.progress===goal)settle(goal?x.to:x.from);
   }
   window.MarginInk?.invalidate();
   // Scroll selects a revision; stopping scroll cannot freeze a half-dissolved picture.
   if(exchange||(requested!==current&&ready[requested]))raf=requestAnimationFrame(tick);
  }
  function wake(){if(!raf)raf=requestAnimationFrame(tick);}
  entries.forEach((entry,i)=>{
   const plate=document.createElement('span'),img=i?document.createElement('img'):first;
   plate.className='process-plate';plate.style.opacity='0';img.draggable=false;img.decoding='async';img.alt=entry.label||entry.title||'';img.dataset.inkAsset=entry.file;
   async function loaded(){try{if(img.decode)await img.decode();}catch{}if(!img.naturalWidth)return;ready[i]=true;wake();}
   img.onload=loaded;img.onerror=()=>{ready[i]=false;mount.dataset.loadError='true';};
   plate.append(img);mount.append(plate);plates.push(plate);images.push(img);img.src=asset(entry.file);
   if(img.complete&&img.naturalWidth)loaded();
  });
  reduced.addEventListener('change',wake);
  return {set(progress,index){const next=selection(progress,entries.length,index);if(next===requested)return;requested=next;wake();},images,plates};
 }
 return {selection,ease,create};
});
