(() => {
 'use strict';
 const $=s=>document.querySelector(s),A=window.HerArchive,G=window.FoldBook,D=window.bookData,R=window.ReadingRoute;
 const viewport=$('#book-viewport'),pages=Array.from(document.querySelectorAll('.leaf'));
 const ruler=$('#book-position'),cat=$('#cat-thumb'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),max=pages.length-1;
 let previousPaint=null;
 let cursor=0,target=0,position=0,raf=0,lastTime=0,lastIndex=-1,drag=null,suppressClick=false,rulerPointer=null,rulerOffset=0;
 let rulerBox={left:0,width:1},catWidth=120,motionTime=105;
 const key='cat-ruler-focus-v2';
 try{const saved=Number(localStorage.getItem(key));if(Number.isFinite(saved))cursor=target=G.clamp(saved,0,R.total);}catch{}
 document.querySelectorAll('[data-asset]').forEach(img=>img.src=A.asset(img.dataset.asset));
 document.querySelectorAll('[data-source]').forEach(a=>a.href=A.asset(a.dataset.source));
 function measure(){rulerBox=ruler.getBoundingClientRect();catWidth=rulerBox.width/max;document.documentElement.style.setProperty('--cat-w',catWidth+'px');}
 function remember(){try{localStorage.setItem(key,String(cursor));}catch{}}
 function paint(){
   const state=R.sample(cursor),scene=R.scene(state);position=state.position;
   const f=G.frame(position,viewport.clientWidth,viewport.clientHeight,pages.length,reduced.matches),root=document.documentElement;
   root.style.setProperty('--travel',position/max);root.style.setProperty('--scene-progress',state.progress);
   window.BookEcho?.setScene(state);
   const startShift=viewport.clientWidth>800?Math.max(140,Math.min(160,viewport.clientWidth*.105)):0;
   const endShift=viewport.clientWidth>1000?Math.min(160,viewport.clientWidth*.105):0;
   const shift=startShift*(1-G.clamp(position/1.1))-endShift*G.clamp(position-14);
   root.style.setProperty('--book-shift',shift+'px');root.style.setProperty('--leaf-w',f.w+'px');root.style.setProperty('--leaf-h',f.h+'px');
   const openingWidth=Math.min(360,Math.max(175,viewport.clientWidth*.235));
   const openingGap=Math.min(210,Math.max(48,viewport.clientWidth*.085));
   const openingNudge=Math.min(28,Math.max(12,viewport.clientWidth*.012));
   const openingLeft=Math.max(22,viewport.clientWidth/2+shift-f.w*.54-openingWidth-openingGap-openingNudge);
   root.style.setProperty('--opening-left',openingLeft+'px');root.style.setProperty('--opening-width',openingWidth+'px');
   const font=Math.max(f.h<350?11:12,Math.min(19,f.h/36.8,f.w/23));root.style.setProperty('--font',font+'px');
   document.body.classList.toggle('compact-book',f.h<540||f.w<365);
   document.body.classList.toggle('is-reading-scene',state.holding);
   f.leaves.forEach((leaf,i)=>{
     const node=pages[i],visible=Math.abs(leaf.x+shift)<viewport.clientWidth/2+f.w*1.6;
     node.hidden=!visible;node.inert=!visible;
     node.style.transform=`translate3d(${leaf.x-f.w/2}px,${-f.h/2}px,${leaf.z}px) rotateY(${leaf.a}deg)`;
     node.style.setProperty('--attention',leaf.attention.toFixed(3));node.style.setProperty('--sheen',G.clamp(.5+(i-position)*.24).toFixed(3));
     node.style.setProperty('--defocus',(G.clamp(Math.abs(i-position)-.7,0,2)*3.5).toFixed(2)+'px');node.style.setProperty('--fold-light',(1-Math.abs(leaf.a)/180).toFixed(3));node.style.setProperty('--font',font+'px');
     node.classList.toggle('near',Math.abs(i-position)<1.4);
   });
   window.LeafArrivals?.update({position,previous:previousPaint});previousPaint=position;
   const cup=state.page<1?0:state.page>1?1:scene.cup;
   pages[1].style.setProperty('--cup',cup);
   document.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.room)===(cup>.5?1:0))));
   document.querySelectorAll('[data-voice]').forEach(v=>v.style.setProperty('--voice','1'));
   $('#red-thread').style.left=(position+1)/pages.length*100+'%';
   const c=G.catLayout(position,rulerBox.left,rulerBox.width,window.innerWidth||viewport.clientWidth,catWidth,pages.length);
   cat.style.left=c.offset+'px';

   ruler.value=position;
   const index=state.page;
   if(index!==lastIndex){
     lastIndex=index;
     ruler.setAttribute('aria-valuetext',`第 ${index+1} 页，共 ${pages.length} 页：${D.titles[index]}`);
     document.querySelectorAll('[data-jump]').forEach(b=>b.setAttribute('aria-current',String(Math.abs(Number(b.dataset.jump)-position)<.8)));
   }

 }
 function animate(now){
   const dt=Math.min(50,lastTime?now-lastTime:16.7);lastTime=now;
   cursor=reduced.matches?target:cursor+(target-cursor)*(1-Math.exp(-dt/motionTime));
   if(Math.abs(target-cursor)<.0001)cursor=target;
   paint();
   if(cursor!==target)raf=requestAnimationFrame(animate);else{raf=0;lastTime=0;remember();}
 }
 function schedule(){if(!raf)raf=requestAnimationFrame(animate);}
 function moveCursor(value,instant=false){if(!Number.isFinite(value))return;motionTime=105;target=G.clamp(value,0,R.total);if(instant||reduced.matches)cursor=target;schedule();}
 function move(page,instant=false,progress=0){moveCursor(R.locate(page,progress),instant);}
 function advance(delta){moveCursor(R.advance(cursor,target,delta));}
 window.BookNavigation={state:()=>R.sample(cursor),seek:(page,progress=0,{smooth=false}={})=>{move(page,!smooth,progress);if(smooth)motionTime=260;paint();}};
 document.addEventListener('wheel',event=>{
   if(event.ctrlKey||event.target.closest?.('#listening-panel')||document.querySelector('dialog[open]'))return;
   event.preventDefault();advance(G.wheelDelta(event.deltaX,event.deltaY,event.deltaMode,viewport.clientHeight)*1.15);
 },{passive:false});
 document.addEventListener('keydown',event=>{
   if(document.querySelector('dialog[open]')||event.target.closest('input,textarea,select,button,a,[contenteditable]'))return;
   const keys={ArrowLeft:-.5,ArrowRight:.5,ArrowUp:-.5,ArrowDown:.5,PageUp:-.6,PageDown:.6,' ':.6};
   if(event.key==='Home'||event.key==='End'){event.preventDefault();move(event.key==='Home'?0:max);}
   else if(event.key in keys){event.preventDefault();advance(keys[event.key]);}
 });
 viewport.addEventListener('pointerdown',event=>{
   if(event.button!==0||event.target.closest('input,select,textarea'))return;
   drag={x:event.clientX,y:event.clientY,start:position,id:event.pointerId,moved:false};
 });
 viewport.addEventListener('pointermove',event=>{
   if(!drag||drag.id!==event.pointerId)return;
   const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
   if(!drag.moved&&Math.abs(dx)>7&&Math.abs(dx)>Math.abs(dy)*.8){drag.moved=true;suppressClick=true;viewport.setPointerCapture(event.pointerId);viewport.classList.add('dragging');}
   if(drag.moved){event.preventDefault();const f=G.dimensions(viewport.clientWidth,viewport.clientHeight);move(drag.start-dx/(f.w*.94),true);}
 });
 function endDrag(){if(!drag)return;const moved=drag.moved;drag=null;viewport.classList.remove('dragging');remember();if(moved)setTimeout(()=>suppressClick=false,0);}
 viewport.addEventListener('pointerup',endDrag);viewport.addEventListener('pointercancel',endDrag);
 document.addEventListener('pointerup',()=>{if(drag&&!drag.moved)endDrag();});
 viewport.addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},{capture:true});
 viewport.addEventListener('focusin',event=>{const leaf=event.target.closest('.leaf');if(leaf&&Math.abs(Number(leaf.dataset.page)-position)>1.05)move(Number(leaf.dataset.page));});
 ruler.addEventListener('input',()=>move(Number(ruler.value),true));
 function rulerPoint(event){const v=G.rulerPosition(event.clientX-rulerOffset,rulerBox.left,rulerBox.width,pages.length);move(v,true);paint();}
 function startRuler(event,fromCat){
   if(event.button!==0)return;event.preventDefault();measure();ruler.focus({preventScroll:true});rulerPointer=event.pointerId;
   rulerOffset=fromCat?event.clientX-(rulerBox.left+position/max*rulerBox.width):0;
   ruler.setPointerCapture(event.pointerId);document.body.classList.add('is-cat-dragging');document.body.classList.toggle('is-cat-held',fromCat);rulerPoint(event);
 }
 cat.addEventListener('pointerdown',event=>startRuler(event,true));
 ruler.addEventListener('pointerdown',event=>startRuler(event,false));
 ruler.addEventListener('pointermove',event=>{if(rulerPointer!==event.pointerId)return;event.preventDefault();rulerPoint(event);});
 function endRuler(){rulerPointer=null;document.body.classList.remove('is-cat-dragging');document.body.classList.remove('is-cat-held');remember();}
 ruler.addEventListener('pointerup',endRuler);ruler.addEventListener('pointercancel',endRuler);ruler.addEventListener('lostpointercapture',endRuler);
 ruler.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();move(event.key==='Home'?0:event.key==='End'?max:Math.round(position)+(event.key==='ArrowRight'?1:-1));}});
 for(let i=0;i<=pages.length;i++){const tick=document.createElement('span');tick.textContent=String(i).padStart(2,'0');tick.style.left=i/pages.length*100+'%';$('#ruler-marks').append(tick);}
 for(let i=0;i<=pages.length*10;i++){const tick=document.createElement('i');tick.className=i%10===0?'major':i%5===0?'half':'minor';tick.style.left=i/(pages.length*10)*100+'%';$('#ruler-lines').append(tick);}
 document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>move(Number(b.dataset.jump))));
 $('#home-button').addEventListener('click',()=>move(0));$('#return-start').addEventListener('click',()=>move(0));
 $('#menu-open').addEventListener('click',()=>A.show($('#directory')));
 document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>window.BookNavigation.seek(1,Number(b.dataset.room)?1:.18,{smooth:true})));
 $('#room-original').addEventListener('click',()=>{const state=R.sample(cursor);A.work(state.page>1||(state.page===1&&R.scene(state).cup>.5)?2:1);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)remember();});
  addEventListener('pagehide',remember);addEventListener('resize',()=>{measure();schedule();});
  reduced.addEventListener('change',()=>moveCursor(target,true));
  measure();paint();
})();
