(() => {
 'use strict';
 const $=id=>document.getElementById(id),A=window.HerArchive,tracks=window.listeningTracks;
 const audio=$('music'),panel=$('listening-panel'),menu=$('listen-menu'),buttons=[...document.querySelectorAll('[data-listen-toggle]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const fmt=s=>Math.floor(Math.max(0,s)/60)+':'+String(Math.floor(Math.max(0,s)%60)).padStart(2,'0');
 const setText=(id,value)=>{if($(id).textContent!==value)$(id).textContent=value;};
 let renderedTrack=-1;
 const choices=tracks.map((track,i)=>{
  const b=document.createElement('button');b.className='track-choice';b.setAttribute('aria-label','播放 '+track.person+' 的《'+track.title+'》');b.setAttribute('aria-pressed','false');
  const number=document.createElement('span');number.className='track-number';number.textContent=String(i+1).padStart(2,'0');
  const name=document.createElement('strong');name.textContent=track.title;
  const author=document.createElement('small');author.textContent=track.person;
  const duration=document.createElement('time');duration.textContent=fmt(track.duration);
  b.append(number,name,author,duration);$('track-list').append(b);return b;
 });
 function changeFolio(s){
  if(renderedTrack===s.index)return;renderedTrack=s.index;const t=s.track;
  setText('music-title',t.title);setText('music-credit','音乐 / '+t.person);
  setText('music-track-number',String(s.index+1).padStart(2,'0')+' / '+String(tracks.length).padStart(2,'0'));
  setText('music-duration',String(Math.round(t.duration)));setText('music-edition',t.edition);
  setText('music-quote',t.quote);setText('music-source',t.person+(t.source?' · 创作说明 ↗':' · 留言 ↗'));
  $('music-source').onclick=()=>t.source?window.BookEcho.openSource(t.source,t.person):A.open('letters',t.person,{target:t.letter});
  $('wave-bars').replaceChildren();
  t.peaks.forEach((peak,i)=>{
   const line=document.createElementNS('http://www.w3.org/2000/svg','line'),h=Math.max(1,peak*72),x=i/(t.peaks.length-1)*360;
   line.setAttribute('x1',x);line.setAttribute('x2',x);line.setAttribute('y1',43-h/2);line.setAttribute('y2',43+h/2);$('wave-bars').append(line);
  });
  $('music-next').setAttribute('aria-label','下一首：《'+tracks[(s.index+1)%tracks.length].title+'》');
  window.BookEcho?.setMusic(t,s.index);
  if(!reduced.matches){
   ['music-title','music-edition','music-quote','wave-bars'].forEach(id=>{
    const n=$(id);if(!n.animate)return;n.getAnimations().forEach(a=>a.cancel());
    n.animate([{opacity:.15,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:520,easing:'ease-out'});
   });
  }
 }
 function render(s){
  document.body.classList.toggle('background-playing',s.playing);
  document.body.classList.toggle('is-playing',s.playing);
  document.body.classList.toggle('music-needs-gesture',s.blocked);
  const pauseAction=s.intent&&!s.blocked;
  buttons.forEach(b=>{
   b.setAttribute('aria-pressed',String(s.playing));
   b.setAttribute('data-state',pauseAction?'pause':'play');
   b.setAttribute('title',(pauseAction?'暂停':'播放')+'《'+s.track.title+'》');
   b.setAttribute('aria-label',(pauseAction?'暂停':'播放')+'《'+s.track.title+'》');
   if(b.classList.contains('modal-listen'))b.textContent=pauseAction?'暂停音乐':'听曲';
  });
  setText('listen-caption',s.blocked?'点一下，开启声音':s.track.title);
  setText('listen-byline',s.blocked?'浏览器正等待一次点击':s.track.person+' · '+fmt(s.time)+' / '+fmt(s.duration));
  menu.setAttribute('aria-label',s.blocked?'开启背景音乐；浏览器阻止了自动播放':'选择曲目与音量');
  choices.forEach((b,i)=>{b.setAttribute('aria-pressed',String(s.index===i));b.querySelector('.track-number').textContent=s.playing&&s.index===i?'♪':String(i+1).padStart(2,'0');});
  const label=s.blocked?'点击播放键，开始听曲':s.error?'暂时无法播放':s.waiting?'下一首，稍等片刻':s.loading?'正在准备音乐':s.playing?'正在播放':'已暂停';
  setText('listening-status',s.blocked?'浏览器阻止了自动播放。点一下音乐盒的播放键，之后曲目会自动接续。':s.error||label);setText('music-label',label);
  setText('music-status',s.error);
  setText('music-time',fmt(s.time)+' / '+fmt(s.duration));
  setText('listening-volume-value',Math.round(s.volume*100)+'%');
  const progress=Math.min(1,Math.max(0,s.time/(s.duration||1)));
  $('listen-progress').style.transform='scaleX('+progress+')';
  $('wave-needle').setAttribute('transform','translate('+progress*360+',0)');
  $('music-seek').max=s.duration;$('music-seek').value=s.time;
  $('music-seek').setAttribute('aria-valuetext',fmt(s.time)+'，全长 '+fmt(s.duration));
  changeFolio(s);
 }
 const transport=window.ListeningEngine.create(audio,tracks,{asset:window.HerMedia?.audio||A.asset,onChange:render});
 window.HerMusic=transport;
 function stopOtherAudio(){document.querySelectorAll('audio,video').forEach(a=>{if(a!==audio&&!a.paused)a.pause();});}
 buttons.forEach(b=>b.addEventListener('click',()=>{if(!transport.state().intent||transport.state().blocked)stopOtherAudio();transport.toggle();}));
 choices.forEach((b,i)=>b.addEventListener('click',()=>{stopOtherAudio();transport.select(i);}));
 $('music-next').addEventListener('click',()=>{stopOtherAudio();transport.select((transport.state().index+1)%tracks.length);});
 // Own the whole waveform gesture, rather than relying on a native range's
 // one-pixel invisible thumb inside the perspective-transformed paper.
 const seek=$('music-seek'),wave=seek.closest('.music-wave'),waveSvg=wave.querySelector('svg');
 let seekPointer=null,seekTrack=-1;
 function seekAt(event){
  const s=transport.state();if(s.index!==seekTrack){endSeek();return;}
  if(!Number.isFinite(s.duration)||s.duration<=0)return;
  let fraction=NaN;
  const m=waveSvg.getScreenCTM?.(),view=waveSvg.viewBox?.baseVal;
  if(m&&view?.width){
   // Invert the projected z=0 plane; this also handles a 3D CSS perspective.
   const x=event.clientX,y=event.clientY,w=m.m44??1;
   const a=m.a-x*(m.m14||0),b=m.c-x*(m.m24||0),c=m.b-y*(m.m14||0),d=m.d-y*(m.m24||0),det=a*d-b*c;
   if(Math.abs(det)>1e-9)fraction=(((x*w-m.e)*d-b*(y*w-m.f))/det-view.x)/view.width;
  }
  if(!Number.isFinite(fraction)){const r=waveSvg.getBoundingClientRect();if(r.width<=0)return;fraction=(event.clientX-r.left)/r.width;}
  transport.seek(Math.max(0,Math.min(1,fraction))*s.duration);
 }
 function endSeek(){
  const id=seekPointer;seekPointer=null;seekTrack=-1;wave.classList.remove('is-seeking');
  if(id!==null&&wave.hasPointerCapture?.(id))wave.releasePointerCapture(id);
 }
 wave.addEventListener('pointerdown',event=>{
  if(event.button!==0||event.isPrimary===false||seekPointer!==null)return;
  event.preventDefault();event.stopPropagation();seek.focus({preventScroll:true});
  seekPointer=event.pointerId;seekTrack=transport.state().index;
  wave.setPointerCapture(event.pointerId);wave.classList.add('is-seeking');seekAt(event);
 });
 wave.addEventListener('pointermove',event=>{if(event.pointerId!==seekPointer)return;event.preventDefault();event.stopPropagation();seekAt(event);});
 wave.addEventListener('pointerup',event=>{if(event.pointerId!==seekPointer)return;event.preventDefault();event.stopPropagation();seekAt(event);endSeek();});
 for(const type of ['pointercancel','lostpointercapture'])wave.addEventListener(type,event=>{if(event.pointerId===seekPointer)endSeek();});
 wave.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();});
 $('music-seek').addEventListener('input',event=>transport.seek(event.target.value));
 $('music-seek').addEventListener('keydown',event=>{
  const s=transport.state(),keys={ArrowLeft:s.time-5,ArrowDown:s.time-5,ArrowRight:s.time+5,ArrowUp:s.time+5,Home:0,End:s.duration};
  if(event.key in keys){event.preventDefault();event.stopPropagation();transport.seek(keys[event.key]);}
 });
 $('listening-volume').addEventListener('input',event=>transport.setVolume(event.target.value/100));
 function closePanel(returnFocus=false){panel.hidden=true;menu.setAttribute('aria-expanded','false');if(returnFocus)menu.focus();}
 menu.addEventListener('click',()=>{
  if(transport.state().blocked){stopOtherAudio();transport.retryAutoplay();return;}
  panel.hidden=!panel.hidden;menu.setAttribute('aria-expanded',String(!panel.hidden));
 });
 $('listen-close').addEventListener('click',()=>closePanel(true));
 document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!event.target.closest('#listening-panel,#listening-room'))closePanel();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();closePanel(true);}});
 document.addEventListener('play',event=>{if(event.target!==audio&&transport.state().intent)transport.pause(true);},{capture:true});
 document.addEventListener('click',event=>{if(event.target.closest('[data-open],[data-work],[data-letter],#menu-open'))closePanel();});
 // Respect autoplay policy. A trusted gesture retries only a blocked start;
 // a deliberate pause never gets undone by turning pages or opening a reader.
 function retry(event){
  if(!event.isTrusted||!transport.state().blocked||!transport.state().intent)return;
  if(event.type==='pointerdown'&&(event.pointerType!=='mouse'||event.button!==0))return;
  if(event.type==='pointerup'&&event.pointerType==='mouse')return;
  if(event.type==='keydown'&&(event.ctrlKey||event.altKey||event.metaKey||event.key==='Escape'||event.key==='Tab'))return;
  if(event.target.closest('[data-listen-toggle],.track-choice,#listen-menu,#music-next,#music-seek,#listening-volume,audio,video'))return;
  stopOtherAudio();transport.retryAutoplay();
 }
 document.addEventListener('click',retry);
 document.addEventListener('pointerdown',retry,{capture:true});
 document.addEventListener('pointerup',retry,{capture:true});
 document.addEventListener('keydown',retry,{capture:true});
 const lightButtons=[...document.querySelectorAll('[data-margin-light]')];
 function setLight(mode){
  document.body.dataset.marginLight=mode==='dark'?'dark':'light';
  lightButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.marginLight===document.body.dataset.marginLight)));
 }
 lightButtons.forEach(b=>b.addEventListener('click',()=>setLight(b.dataset.marginLight)));
 setLight('light');
 render(transport.state());
 transport.play();
})();
