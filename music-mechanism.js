/* One slow clock drives the original paper score and its abstract crank. */
(()=>{
 const audio=document.getElementById('music'),arm=document.getElementById('music-crank-arm'),grip=document.getElementById('music-crank-grip'),feed=document.getElementById('music-score-feed');
 if(!audio||!arm||!grip||!feed)return;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const ax=Number(arm.dataset.axleX),ay=Number(arm.dataset.axleY),rx=Number(arm.dataset.crankX),ry=Number(arm.dataset.crankY),period=Number(arm.dataset.turnSeconds),feedTurns=Number(arm.dataset.feedTurns);
 let raf=0,last=0,angle=0,painted=0,waiting=false;
 function draw(){
  const x=ax+rx*Math.cos(angle),y=ay+ry*Math.sin(angle);
  arm.setAttribute('d',`M${ax} ${ay}L${x.toFixed(2)} ${y.toFixed(2)}`);grip.setAttribute('cx',x.toFixed(2));grip.setAttribute('cy',y.toFixed(2));
  feed.setAttribute('transform',`translate(0 ${(-((-angle/(Math.PI*2)*28/feedTurns)%28)).toFixed(3)})`);
 }
 function blocked(){return audio.paused||waiting||document.hidden||reduce.matches||!!document.querySelector('dialog[open]');}
 function tick(t){raf=0;if(blocked())return;if(last)angle-=Math.min(.08,(t-last)/1000)*Math.PI*2/period;last=t;if(t-painted>50){draw();painted=t;}raf=requestAnimationFrame(tick);}
 function sync(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;if(!blocked())raf=requestAnimationFrame(tick);}
 for(const event of ['play','pause','ended'])audio.addEventListener(event,sync);
 audio.addEventListener('waiting',()=>{waiting=true;sync();});audio.addEventListener('playing',()=>{waiting=false;sync();});audio.addEventListener('emptied',()=>{waiting=false;sync();});
 document.addEventListener('visibilitychange',sync);reduce.addEventListener('change',sync);for(const d of document.querySelectorAll('dialog'))new MutationObserver(sync).observe(d,{attributes:true,attributeFilter:['open']});draw();sync();
})();
