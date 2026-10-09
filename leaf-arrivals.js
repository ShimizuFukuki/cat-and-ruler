/* Ruler page N - 1.5 introduces page N. A/J retain their close-reading entrance. */
(function(root,factory){const api=factory(root);if(typeof module==='object'&&module.exports)module.exports=api;else{root.LeafArrivals=api;api.mount(document);}})(typeof window==='object'?window:globalThis,function(root){
 'use strict';
 let controller=null;
 function update(state){controller?.update(state);}
 const plans=[
  {page:1,selector:'.room-print',kind:'print'},
  {page:3,selector:'.blind-letter',kind:'impression'},
  {page:4,selector:'.blind-letter',kind:'impression'},
  {page:5,selector:'#sea-image-open',kind:'print'},
  {page:7,selector:'#ship-image-open',kind:'drawing'},
  {page:8,selector:'.mounted-art',kind:'print'},
  {page:10,selector:'.mounted-art',kind:'drawing'},
  {page:11,selector:'.portrait-art',kind:'portrait'},
  {page:12,selector:'.signature',kind:'signature'},
  {page:13,selector:'.farewell-mini',kind:'keepsake'},
  {page:14,selector:'.colophon-mark',kind:'drawing'},
  {page:15,selector:'.last-cat',kind:'portrait'}
 ];
 function readable(rect,aperture,defocus=0,kind='print'){
  const photograph=kind==='keepsake';
  if(!rect.width||!rect.height||defocus>(photograph?.85:1.2))return false;
  const x=Math.max(0,Math.min(rect.right,aperture.right)-Math.max(rect.left,aperture.left));
  const y=Math.max(0,Math.min(rect.bottom,aperture.bottom)-Math.max(rect.top,aperture.top));
  return x>=Math.min(photograph?110:80,rect.width*(photograph?.58:.4))&&y>=Math.min(100,rect.height*.5);
 }
 function arrivalPosition(page){return Math.max(0,page-1.5);}
 function eligible(record,position,aperture,width,height){
  const rect=record.node.getBoundingClientRect();
  if(record.kind==='impression')return readable(rect,aperture,Math.max(0,Math.abs(record.page-position)-.7)*3.5,record.kind);
  // Internal positions are zero-based. Page 14 enters at position 11.5 / ruler 12.5.
  // The edge mist remains: do not let its opacity delay the requested entrance again.
  return position>=arrivalPosition(record.page)&&rect.width>0&&rect.height>0&&rect.right>0&&rect.left<width&&rect.bottom>0&&rect.top<height;
 }
 const motions={
  print:{translate:'0 23px',rotate:'-2deg',scale:'.98',blur:1.4,duration:1250},
  impression:{translate:'-7px 4px',rotate:'-2deg',scale:'.99',blur:3,duration:1400},
  drawing:{translate:'-9px 5px',rotate:'-.7deg',scale:'.99',blur:1.5,duration:1200},
  portrait:{translate:'0 5px',rotate:'0deg',scale:'.99',blur:3,duration:1500},
  signature:{translate:'-3px 0',rotate:'-.5deg',scale:'1',blur:1,duration:1100},
  keepsake:{translate:'-8px 30px',rotate:'-5deg',scale:'.97',blur:0,duration:1900}
 };
 function mount(doc){
  const reduced=root.matchMedia('(prefers-reduced-motion: reduce)'),records=new Map(),running=new Map();
  const leaves=[...doc.querySelectorAll('.leaf')],left=doc.querySelector('.mist-left'),right=doc.querySelector('.mist-right');
  let direction=0,position=root.BookNavigation?.state().position||0,frame=0,aperture=null;
  function schedule(){if(!frame)frame=root.requestAnimationFrame(measure);}
  controller={update(s){if(s.previous!=null&&Math.abs(s.position-s.previous)>.00001)direction=s.position>s.previous?1:-1;position=s.position;schedule();},reset(){
   for(const r of records.values()){const a=running.get(r);running.delete(r);a?.cancel();r.revision++;r.forwardSeen=false;r.state='bypass';r.node.classList.remove('arrival-pending');r.node.dataset.arrival='bypass';}schedule();
  }};
  function measure(){
   frame=0;if(doc.hidden||doc.querySelector('dialog[open]'))return;
   const w=doc.documentElement.clientWidth,h=doc.documentElement.clientHeight,l=left?.getBoundingClientRect(),r=right?.getBoundingClientRect();
   // The last 5% of each gradient is nearly transparent; its outer 95% is not a reveal zone.
   aperture={left:l?l.right-l.width*.05:0,right:r?r.left+r.width*.05:w,top:0,bottom:h};
   for(const record of records.values()){
    const distance=Math.abs(record.page-position);
    if(distance<2.5)for(const image of record.node.querySelectorAll('img'))image.loading='eager';
    if(direction<0&&record.state==='entering'){enter(record,true);continue;}
    // Returning from a restored last page must not consume the next forward reading.
    if(record.state==='bypass'&&!record.forwardSeen&&record.page>position+1.35){record.state='waiting';record.node.dataset.arrival='waiting';record.node.classList.add('arrival-pending');}
    if(record.state!=='waiting'||record.leaf.hidden)continue;
    if(direction<0||record.page<position-.5){
     if(distance<2.3)enter(record,true);
     continue;
    }
    if(eligible(record,position,aperture,w,h))enter(record,direction===0);
   }
  }
  function settle(record,forward=true){record.node.classList.remove('arrival-pending');record.forwardSeen=record.forwardSeen||forward;record.state=record.forwardSeen?'seen':'bypass';record.node.dataset.arrival=record.state;}
  function finish(record,forward=true){settle(record,forward);running.delete(record);}
  function enter(record,instant=false){
   if(record.state!=='waiting'){
    if(instant&&record.state==='entering'){running.get(record)?.cancel();finish(record,false);}
    return;
   }
   record.state='entering';const revision=++record.revision;
   const reveal=()=>{
    if(record.state!=='entering'||record.revision!==revision)return;
    // Decoding can finish after the reader has moved. Do not spend the entrance offscreen.
    if(!instant&&!reduced.matches&&!doc.hidden&&direction>=0&&aperture&&!eligible(record,position,aperture,doc.documentElement.clientWidth,doc.documentElement.clientHeight)){
     record.state='waiting';schedule();return;
    }
    record.node.classList.remove('arrival-pending');
    if(instant||direction<0||reduced.matches||doc.hidden||!record.node.animate){finish(record,reduced.matches);return;}
    const m=motions[record.kind],ink=root.getComputedStyle(record.node),opacity=ink.opacity||'1',filter=ink.filter||'none';
    const a=record.node.animate([
     {opacity:0,translate:m.translate,rotate:m.rotate,scale:m.scale,filter:`blur(${m.blur}px)`},
     {opacity,translate:'0px 0px',rotate:'0deg',scale:'1',filter}
    ],{duration:m.duration,easing:'cubic-bezier(.22,.48,.3,1)'});
    record.node.dataset.arrival='entering';running.set(record,a);
    a.finished.then(()=>{if(running.get(record)===a)finish(record);},()=>{if(running.get(record)===a)finish(record,false);});
   };
   // Decode before the photograph's entrance; an unloaded image must not pop in at the end.
   const images=[...record.node.querySelectorAll('img')];
   const pending=images.filter(i=>!i.complete&&typeof i.decode==='function');
   if(pending.length&&!instant)Promise.all(pending.map(i=>i.decode().catch(()=>{}))).then(reveal);else reveal();
  }
  for(const plan of plans){
   const leaf=leaves.find(l=>Number(l.dataset.page)===plan.page),node=leaf?.querySelector(plan.selector);if(!node)continue;
   const record={...plan,leaf,node,revision:0,forwardSeen:reduced.matches,state:reduced.matches?'seen':'waiting'};records.set(node,record);node.dataset.arrival=record.state;
   if(record.state==='waiting')node.classList.add('arrival-pending');
   node.addEventListener('focusin',()=>enter(record,true));
  }
  function stop(){
   if(!reduced.matches&&!doc.hidden)return;
   for(const [record,a] of running){a.cancel();finish(record);}
   // Changing the system preference never leaves a decorative object hidden.
   if(reduced.matches){for(const record of records.values())settle(record);}
  }
  reduced.addEventListener('change',stop);doc.addEventListener('visibilitychange',()=>{stop();schedule();});
  root.addEventListener('resize',schedule);doc.fonts?.ready.then(schedule);
  for(const id of ['home-button','return-start'])doc.getElementById(id)?.addEventListener('click',()=>controller.reset());
  for(const modal of doc.querySelectorAll('dialog'))new root.MutationObserver(schedule).observe(modal,{attributes:true,attributeFilter:['open']});
  schedule();return {records,stop};
 }
 return {plans,readable,arrivalPosition,eligible,mount,update,reset:()=>controller?.reset()};
});
