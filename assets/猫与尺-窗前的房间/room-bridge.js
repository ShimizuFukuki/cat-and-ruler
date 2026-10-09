/* Embedded room protocol. File URLs may have opaque origins; verify the sender. */
(()=>{
 'use strict';if(new URL(location.href).searchParams.get('embedded')!=='1'||parent===window)return;
 const channel='cat-and-ruler:room';let id=0,projecting=false;
 const send=(type,detail={})=>parent.postMessage({channel,type,...detail},'*');
 document.body.classList.add('room-embedded');
 function lock(value){document.body.classList.toggle('room-travelling',value);for(const s of ['.masthead','#hotspots','.room-footer','#selection']){const n=document.querySelector(s);if(n)n.inert=value;}}
 window.RoomHost={send,frame(){if(!projecting)return;const room=window.RoomScene;if(!room)return;const done=!room.travelling;send('frame',{id,progress:room.transitionProgress,done});if(done)projecting=false;},ready(){
  document.querySelector('.home').addEventListener('click',e=>{e.preventDefault();send('return-book');});
  document.querySelector('.home i').textContent='返回折册';document.querySelector('.home').setAttribute('aria-label','回到桌上，继续读折册');
  window.RoomScene?.setActive(false);send('ready');
 }};
 addEventListener('message',event=>{
  if(event.source!==parent||event.data?.channel!==channel)return;const d=event.data,room=window.RoomScene;
  if(d.type==='depart'||d.type==='approach'){
   id=d.id;projecting=true;lock(true);
   if(!room||document.body.classList.contains('room-fallback')){projecting=false;lock(false);send('settled',{id});return;}
   room.resize();if(d.type==='depart')room.depart();else room.approach();
  }else if(d.type==='interactive')lock(false);
  else if(d.type==='rest'){projecting=false;room?.setActive(false);lock(true);}
  else if(d.type==='music-state'){room?.music?.receive({index:d.index,playing:!!d.playing,title:d.title});const button=document.getElementById('sound');button.classList.toggle('playing',!!d.playing);button.setAttribute('aria-label',(d.playing?'暂停':'播放')+'《'+d.title+'》');button.setAttribute('title',(d.playing?'暂停':'播放')+'《'+d.title+'》');document.getElementById('sound-label').textContent=d.playing?'暂停':'听曲';}
 });
 document.addEventListener('play',e=>{if(['AUDIO','VIDEO'].includes(e.target.tagName))send('music-pause');},true);
 document.addEventListener('room:unavailable',()=>{if(projecting){projecting=false;lock(false);send('settled',{id});}});
})();
