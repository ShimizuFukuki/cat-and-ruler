/* A fixed population of fibres. Pointer proximity changes paper, never leaves a trail. */
(() => {
  'use strict';
  const body=document.body;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  const air=document.querySelector('.paper-air');
  const opening=document.getElementById('opening-note');
  const viewport=document.getElementById('book-viewport');
  const margins=[...document.querySelectorAll('.echo-panel')];
  const fibres=[];
  let frame=0,point=null,paused=false;

  // Deterministic positions make every initial visit already feel inhabited.
  for(let i=0;i<22;i++){
    const mote=document.createElement('span');mote.className='air-fibre';
    const flake=document.createElement('i');mote.append(flake);
    const x=(i*37+11)%100,y=(i*29+18)%92;
    const properties={x:x+'%',y:y+'%',size:(i%4===0?7:3+i%4)+'px',soft:(i%3===0?.8:.1)+'px',duration:(14+(i*7)%12)+'s',delay:(-((i*3.71)%24))+'s',turn:(4+i%5)+'s',alpha:String(i%3===0?.55:.8)};
    for(const [key,value] of Object.entries(properties))mote.style.setProperty('--'+key,value);
    fibres.push(mote);
  }
  air?.append(...fibres);
  function reset(){
    point=null;
    if(frame){cancelAnimationFrame(frame);frame=0;}
    opening?.classList.remove('is-near-paper');
    if(opening)for(const key of ['paper-rx','paper-ry','paper-x','paper-y','paper-near'])opening.style.removeProperty('--'+key);
    margins.forEach(node=>node.classList.remove('is-near-paper'));
  }
  const update=()=>{
    paused=document.hidden||!!document.querySelector('dialog[open]');
    body.classList.toggle('ambient-paused',paused);
    if(paused||reduced.matches||!fine.matches)reset();
  };
  function near(node,p,padding=24){
    if(!node||node.hidden)return null;
    const r=node.getBoundingClientRect();
    if(r.width<=0||r.height<=0||p.x<r.left-padding||p.x>r.right+padding||p.y<r.top-padding||p.y>r.bottom+padding)return null;
    return {x:Math.min(1,Math.max(0,(p.x-r.left)/r.width)),y:Math.min(1,Math.max(0,(p.y-r.top)/r.height))};
  }
  function respond(){
    frame=0;if(!point||paused||reduced.matches)return;
    const p=near(opening,point,45);
    opening?.classList.toggle('is-near-paper',!!p);
    if(opening){
      opening.style.setProperty('--paper-rx',p?((.5-p.y)*3).toFixed(2)+'deg':'0deg');
      opening.style.setProperty('--paper-ry',p?((p.x-.5)*4).toFixed(2)+'deg':'0deg');
      opening.style.setProperty('--paper-x',p?(p.x*100).toFixed(1)+'%':'50%');
      opening.style.setProperty('--paper-y',p?(p.y*100).toFixed(1)+'%':'50%');
      opening.style.setProperty('--paper-near',p?'.8':'0');
    }
    margins.forEach(node=>node.classList.toggle('is-near-paper',!!near(node,point,12)));
  }
  document.addEventListener('pointermove',event=>{
    if(paused||reduced.matches||!fine.matches||event.pointerType!=='mouse'||event.buttons){reset();return;}
    point={x:event.clientX,y:event.clientY};
    if(!frame)frame=requestAnimationFrame(respond);
  },{passive:true});
  document.addEventListener('pointerout',event=>{if(!event.relatedTarget)reset();},{passive:true});
  viewport?.addEventListener('wheel',reset,{passive:true});
  document.addEventListener('pointerdown',reset,{passive:true});
  document.addEventListener('visibilitychange',update);
  document.querySelectorAll('dialog').forEach(dialog=>new MutationObserver(update).observe(dialog,{attributes:true,attributeFilter:['open']}));
  reduced.addEventListener('change',update);fine.addEventListener('change',update);
  update();
})();
