/* The room stays mounted. No page navigation, duplicate soundtrack, or lost page. */
(()=>{
 'use strict';
 const channel='cat-and-ruler:room',body=document.body,menu=document.getElementById('menu-open');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const world=document.createElement('div');world.id='fold-world';world.style.background=getComputedStyle(body).background;
 const nodes=[...body.children].filter(n=>!['SCRIPT','STYLE','LINK','AUDIO','DIALOG'].includes(n.tagName)&&!n.classList.contains('archive-load-status'));
 body.prepend(world);nodes.forEach(n=>world.append(n));body.dataset.space='book';
 const status=document.createElement('p');status.id='room-portal-status';status.setAttribute('role','status');status.hidden=true;body.append(status);
 menu.setAttribute('aria-label','从折册抬头，进入房间目录');menu.removeAttribute('aria-haspopup');menu.setAttribute('aria-controls','room-space');menu.setAttribute('aria-expanded','false');
 let frame=null,ready=false,pending=null,resolveReady=null,rejectReady=null,loadTimer=0,transition=0,state='book';
 const send=(type,detail={})=>frame?.contentWindow?.postMessage({channel,type,...detail},'*');
 const clamp=x=>Math.max(0,Math.min(1,x));const ease=x=>{x=clamp(x);return x*x*(3-2*x);};
 function setState(s){state=s;body.dataset.space=s;menu.setAttribute('aria-expanded',String(s!=='book'));}
 // Leave the page at its actual size. Hand attention to the desk close-up;
 // all spatial movement belongs to the camera, never to a skewed UI rectangle.
 function paint(progress){
  if(!Number.isFinite(progress))return;
  const p=clamp(progress),leaving=state==='opening';
  const dissolve=leaving?ease((p-.035)/.20):ease((p-.76)/.22);
  world.style.opacity=String(leaving?1-dissolve:dissolve);
  world.style.setProperty('--portal-controls',String(leaving?1-ease(p/.095):ease((p-.90)/.10)));
  world.style.filter='blur('+(leaving?Math.sin(Math.PI*dissolve)*2.2:(1-dissolve)*2.2).toFixed(3)+'px)';
 }
 function musicState(){const s=window.HerMusic?.state();if(s)send('music-state',{playing:s.playing,title:s.track.title,index:s.index});}
 function ensure(){
  if(ready)return Promise.resolve();if(pending)return pending;
  pending=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  frame=document.createElement('iframe');frame.id='room-space';frame.title='窗前的房间：日记、对话与作品';frame.tabIndex=-1;frame.setAttribute('aria-hidden','true');
  frame.src=new URL('room/index.html?embedded=1',window.CatRulerRelease.root).href;body.append(frame);
  loadTimer=setTimeout(()=>{if(ready)return;rejectReady?.(new Error('room-timeout'));pending=null;resolveReady=rejectReady=null;frame.remove();frame=null;},45000);
  return pending;
 }
 async function open(){
  if(state!=='book'||document.querySelector('dialog[open]'))return;
  menu.disabled=true;status.hidden=true;
  const hintTimer=setTimeout(()=>{if(!ready){status.textContent='正在打开房间…';status.hidden=false;}},650);
  document.getElementById('listen-close')?.click();
  try{await ensure();status.hidden=true;transition++;world.inert=true;setState('opening');paint(0);frame.removeAttribute('aria-hidden');send('depart',{id:transition});musicState();}
  catch{status.hidden=false;status.textContent='房间暂时未能打开，请再点一次目录。';}
  finally{clearTimeout(hintTimer);menu.disabled=false;}
 }
 function back(){if(state!=='room')return;transition++;setState('closing');world.inert=true;paint(0);send('approach',{id:transition});}
 function settled(){
  if(state==='opening'){setState('room');world.style.opacity='0';world.style.filter='none';frame.tabIndex=0;frame.focus();send('interactive');}
  else if(state==='closing'){setState('book');world.style.opacity='1';world.style.filter='none';world.style.removeProperty('--portal-controls');world.inert=false;frame.setAttribute('aria-hidden','true');frame.tabIndex=-1;send('rest');menu.focus({preventScroll:true});}
 }
 addEventListener('message',event=>{
  if(!frame||event.source!==frame.contentWindow||event.data?.channel!==channel)return;
  const d=event.data;
  if(d.type==='ready'){ready=true;clearTimeout(loadTimer);resolveReady?.();resolveReady=rejectReady=null;musicState();}
  else if(d.type==='frame'&&d.id===transition&&['opening','closing'].includes(state)){paint(reduced.matches?1:d.progress);if(d.done)settled();}
  else if(d.type==='settled'&&d.id===transition)settled();
  else if(d.type==='return-book')back();
  else if(d.type==='music-toggle'){window.HerMusic?.toggle();}
  else if(d.type==='music-select'&&Number.isInteger(d.index)&&d.index>=0&&d.index<(window.listeningTracks?.length||3)){window.HerMusic?.select(d.index);musicState();}
  else if(d.type==='music-pause'){window.HerMusic?.pause(true);}
 });
 menu.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open();},true);
 document.addEventListener('click',e=>{const a=e.target.closest?.('a[href*="room-preview"]');if(a){e.preventDefault();e.stopPropagation();open();}},true);
 for(const event of ['play','pause','loadedmetadata','ended'])document.getElementById('music')?.addEventListener(event,musicState);
 // Share the pause state even when the transport changes intent before audio events.
 new MutationObserver(musicState).observe(body,{attributes:true,attributeFilter:['class']});
 // Warm the room after the cover has painted. Save-data users load on intent.
 // The ready signal waits for both window textures and one compiled scene.
 const warm=()=>{if(state==='book')ensure().catch(()=>{});};
 menu.addEventListener('pointerenter',warm,{once:true});
 menu.addEventListener('focus',warm,{once:true});
 if(!navigator.connection?.saveData){
  const schedule=()=>setTimeout(()=>{if(document.hidden)return;if(window.requestIdleCallback)requestIdleCallback(warm,{timeout:12000});else warm();},4500);
  if(document.readyState==='complete')schedule();else addEventListener('load',schedule,{once:true});
 }
 window.RoomPortal={open,back,get state(){return state;}};
})();
