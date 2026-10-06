(() => {
 'use strict';
 const $=s=>document.querySelector(s),A=window.HerArchive,G=window.FoldBook,D=window.bookData,R=window.ReadingRoute;
 const viewport=$('#book-viewport'),pages=Array.from(document.querySelectorAll('.leaf'));
 const ruler=$('#book-position'),cat=$('#cat-thumb'),tail=$('#cat-tail'),reduced=matchMedia('(prefers-reduced-motion: reduce)'),max=pages.length-1;
 let cursor=0,target=0,position=0,raf=0,lastTime=0,lastIndex=-1,drag=null,suppressClick=false,rulerPointer=null,rulerOffset=0;
 let rulerBox={left:0,width:1},catWidth=120,motionTime=105;
 const key='cat-ruler-focus-v2',pad=n=>String(n).padStart(2,'0');
 try{const saved=Number(localStorage.getItem(key));if(Number.isFinite(saved))cursor=target=G.clamp(saved,0,R.total);}catch{}
 document.querySelectorAll('[data-asset]').forEach(img=>img.src=A.asset(img.dataset.asset));
 document.querySelectorAll('[data-source]').forEach(a=>a.href=A.asset(a.dataset.source));
 function measure(){rulerBox=ruler.getBoundingClientRect();catWidth=cat.getBoundingClientRect().width||120;}
 function remember(){try{localStorage.setItem(key,String(cursor));}catch{}}
 function paint(){
   const state=R.sample(cursor),scene=R.scene(state);position=state.position;
   const f=G.frame(position,viewport.clientWidth,viewport.clientHeight,pages.length,reduced.matches),root=document.documentElement;
   root.style.setProperty('--travel',position/max);root.style.setProperty('--scene-progress',state.progress);
   window.BookEcho?.setScene(state);
   const shift=viewport.clientWidth>1000?Math.min(160,viewport.clientWidth*.105)*(1-G.clamp(position/1.1)-G.clamp(position-14)):0;
   root.style.setProperty('--book-shift',shift+'px');root.style.setProperty('--leaf-w',f.w+'px');root.style.setProperty('--leaf-h',f.h+'px');
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
   const cup=state.page<1?0:state.page>1?1:scene.cup;
   pages[1].style.setProperty('--cup',cup);
   document.querySelectorAll('[data-room]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.room)===(cup>.5?1:0))));
   document.querySelectorAll('[data-voice]').forEach(v=>v.style.setProperty('--voice','1'));
   $('#red-thread').style.left=(position+1)/pages.length*100+'%';
   const c=G.catLayout(position,rulerBox.left,rulerBox.width,window.innerWidth||viewport.clientWidth,catWidth,pages.length);
   cat.style.left=c.offset+'px';
   const tip=c.tailX.toFixed(3);
   tail.setAttribute('d',`M187 53 C215 58 236 88 217 96 C200 104 ${tip} 94 ${tip} 112`);
   ruler.value=position;
   const index=state.page;
   if(index!==lastIndex){
     lastIndex=index;$('#chapter-label').textContent=D.titles[index];$('#page-label').textContent=pad(index+1)+' / '+pad(pages.length);
     ruler.setAttribute('aria-valuetext',`第 ${index+1} 页，共 ${pages.length} 页：${D.titles[index]}`);
     document.querySelectorAll('[data-jump]').forEach(b=>b.setAttribute('aria-current',String(Math.abs(Number(b.dataset.jump)-position)<.8)));
   }
   const focus=state.holding&&R.holds[index]>0;
   $('#scene-meter').hidden=!focus;$('#gesture-hint').hidden=focus;
   const labels=index===1?['看画','灯','留给杯子','添上杯子']:index===7?['模型','橘子','码头','推车']:index===5?['打开','差两指']:['读页','原话','接着读'];
   $('#scene-label').textContent=labels[scene.stage]+'  '+(scene.stage+1)+' / '+scene.stages;
   $('#scene-progress').style.transform=`scaleX(${state.progress})`;
   $('#previous').disabled=position<=.005;$('#next').disabled=position>=max-.005;
   $('.cue-left').style.opacity=position<.05?'0':'1';$('.cue-right').style.opacity=position>max-.05?'0':'1';
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
   if(event.ctrlKey||document.querySelector('dialog[open]'))return;
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
   ruler.setPointerCapture(event.pointerId);document.body.classList.add('is-cat-dragging');rulerPoint(event);
 }
 cat.addEventListener('pointerdown',event=>startRuler(event,true));
 ruler.addEventListener('pointerdown',event=>startRuler(event,false));
 ruler.addEventListener('pointermove',event=>{if(rulerPointer!==event.pointerId)return;event.preventDefault();rulerPoint(event);});
 function endRuler(){rulerPointer=null;document.body.classList.remove('is-cat-dragging');remember();}
 ruler.addEventListener('pointerup',endRuler);ruler.addEventListener('pointercancel',endRuler);ruler.addEventListener('lostpointercapture',endRuler);
 ruler.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();move(event.key==='Home'?0:event.key==='End'?max:Math.round(position)+(event.key==='ArrowRight'?1:-1));}});
 for(let i=0;i<=pages.length;i++){const tick=document.createElement('span');tick.textContent=pad(i);tick.style.left=i/pages.length*100+'%';$('#ruler-marks').append(tick);}
 for(let i=0;i<=pages.length*10;i++){const tick=document.createElement('i');tick.className=i%10===0?'major':i%5===0?'half':'minor';tick.style.left=i/(pages.length*10)*100+'%';$('#ruler-lines').append(tick);}
 document.querySelectorAll('[data-jump]').forEach(b=>b.addEventListener('click',()=>move(Number(b.dataset.jump))));
 $('#previous').addEventListener('click',()=>move(Math.ceil(position)-1));$('#next').addEventListener('click',()=>move(Math.floor(position)+1));
 $('#home-button').addEventListener('click',()=>move(0));$('#return-start').addEventListener('click',()=>move(0));
 $('#menu-open').addEventListener('click',()=>A.show($('#directory')));
 document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>window.BookNavigation.seek(1,Number(b.dataset.room)?1:.18,{smooth:true})));
 $('#room-original').addEventListener('click',()=>{const state=R.sample(cursor);A.work(state.page>1||(state.page===1&&R.scene(state).cup>.5)?2:1);});
 /* The original audio player is appended by the build step. */
  const audio=$('#music');audio.src=A.asset('Judas 与 Ambrose/作品/房间里有一把椅子.wav');audio.volume=.5;
  const time=v=>pad(Math.floor(v/60))+':'+pad(Math.floor(v%60));
  const peakMax=Math.max(...D.peaks,.001);
  D.peaks.forEach((peak,i)=>{
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    const h=Math.max(1,peak/peakMax*72),x=i/(D.peaks.length-1)*360;
    line.setAttribute('x1',x);line.setAttribute('x2',x);line.setAttribute('y1',43-h/2);line.setAttribute('y2',43+h/2);$('#wave-bars').append(line);
  });
  function soundState(){
    const on=!audio.paused&&!audio.ended,duration=Number.isFinite(audio.duration)?audio.duration:D.duration;
    document.body.classList.toggle('is-playing',on);
    $('#music-symbol').textContent=on?'Ⅱ':'▷';$('#play-music').setAttribute('aria-pressed',String(on));
    $('#play-music').setAttribute('aria-label',(on?'暂停':'播放')+'《房间里有一把椅子》');
    $('#music-label').textContent=on?'正在播放原曲':'听这段原曲';$('#music-time').textContent=time(audio.currentTime)+' / '+time(duration);
    $('#wave-needle').setAttribute('transform','translate('+G.clamp(audio.currentTime/duration)*360+',0)');
  }
  $('#play-music').addEventListener('click',async()=>{
    if(!audio.paused)audio.pause();else try{await audio.play();$('#music-status').textContent='';}catch{$('#music-status').textContent='暂时无法播放，可从目录中的作品打开原曲。';}
  });
  ['play','pause','ended','timeupdate','loadedmetadata'].forEach(event=>audio.addEventListener(event,soundState));

  document.addEventListener('visibilitychange',()=>{if(document.hidden)remember();});
  addEventListener('pagehide',remember);addEventListener('resize',()=>{measure();schedule();});
  reduced.addEventListener('change',()=>moveCursor(target,true));
  measure();paint();soundState();
})();
