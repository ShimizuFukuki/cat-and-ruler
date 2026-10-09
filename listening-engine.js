/* One transport for the masthead, the music folio, and the reader. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ListeningEngine=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 function create(audio,tracks,options={}){
  const later=options.setTimeout||setTimeout,cancel=options.clearTimeout||clearTimeout;
  const now=options.now||(()=>Date.now()),asset=options.asset||(p=>p),notify=options.onChange||(()=>{});
  let index=0,volume=.2,intent=false,waiting=false,loading=false,blocked=false,error='',revision=0,fadeTimer=null,nextTimer=null;
  const duration=()=>Number.isFinite(audio.duration)&&audio.duration>0?audio.duration:tracks[index].duration;
  const state=()=>({index,volume,intent,waiting,loading,blocked,error,playing:!audio.paused&&!audio.ended&&!loading&&!blocked,track:tracks[index],time:audio.currentTime||0,duration:duration()});
  const emit=()=>notify(state());
  function clear(){revision++;cancel(fadeTimer);cancel(nextTimer);fadeTimer=nextTimer=null;waiting=false;return revision;}
  function fade(value,duration,ticket,done){
   cancel(fadeTimer);const begin=now(),from=audio.volume;
   const tick=()=>{if(ticket!==revision)return;const t=Math.min(1,(now()-begin)/duration);audio.volume=from+(value-from)*(t*t*(3-2*t));if(t<1)fadeTimer=later(tick,30);else{fadeTimer=null;done?.();}};
   tick();
  }
  async function play(next=index,restart=false){
   const ticket=clear();intent=true;loading=true;blocked=false;error='';
   const nextIndex=Math.max(0,Math.min(tracks.length-1,Math.trunc(Number(next))||0)),changed=nextIndex!==index;index=nextIndex;
   const source=asset(tracks[index].file);
   if(changed||audio.getAttribute('src')!==source){audio.pause();audio.src=source;audio.currentTime=0;}
   else if(restart||(audio.ended&&audio.currentTime>=duration()))audio.currentTime=0;
   // Keep the request audible so autoplay permission is respected, then fade in.
   audio.volume=Math.min(volume,.015);emit();
   try{await audio.play();if(ticket!==revision){if(!intent)audio.pause();return;}loading=false;fade(volume,650,ticket);emit();}
   catch(e){if(ticket!==revision)return;loading=false;if(e.name==='NotAllowedError'){blocked=true;error='';}else{intent=false;error='这首暂时没有读到，可以重试或换一首。';}emit();}
  }
  function pause(immediate=false){
   const ticket=clear();intent=false;loading=false;blocked=false;
   if(immediate||audio.paused){audio.pause();audio.volume=volume;}else fade(0,180,ticket,()=>{audio.pause();audio.volume=volume;emit();});
   emit();
  }
  function setVolume(value){
   volume=Math.max(0,Math.min(.6,Number(value)||0));
   // A volume gesture must not cancel the completion of a fading pause.
   if(intent||audio.paused){cancel(fadeTimer);fadeTimer=null;audio.volume=volume;}emit();
  }
  function seek(seconds){
   if(!Number.isFinite(Number(seconds))||!Number.isFinite(duration()))return;
   const wasWaiting=waiting;if(wasWaiting)clear();
   audio.currentTime=Math.max(0,Math.min(duration(),Number(seconds)));emit();
   if(wasWaiting&&intent)play();
  }
  audio.addEventListener('ended',()=>{
   if(!intent)return;const ticket=clear();loading=false;waiting=true;emit();
   nextTimer=later(()=>{if(ticket===revision&&intent)play((index+1)%tracks.length,true);},1200);
  });
  audio.addEventListener('error',()=>{clear();intent=false;loading=false;blocked=false;error='这首暂时没有读到，可以重试或换一首。';emit();});
  audio.addEventListener('pause',()=>{
   if(audio.paused&&!audio.ended&&!loading&&!waiting&&intent&&!blocked){clear();intent=false;}emit();
  });
  ['playing','timeupdate','loadedmetadata','durationchange','seeked'].forEach(event=>audio.addEventListener(event,emit));
  audio.volume=volume;
  return {state,play,pause,seek,setVolume,toggle:()=>intent&&!blocked?pause():play(),select:i=>play(i,true),retryAutoplay:()=>blocked&&intent?play():Promise.resolve()};
 }
 return {create};
});
