/* Original seated cartoon cat and distant birds. No archive content is changed. */
window.createRoomActivity=function({T,root,sphere,group,shadow,assetPromises}){
 const cat=group(1.20,.02895,1.13);cat.name='room-cat';cat.userData.dynamic=true;cat.scale.setScalar(.90);cat.rotation.y=-.18;
 const contact=shadow(.57,.49,.24,1.20,.0294,1.13);contact.name='cat-contact';
 let model=null,mixer=null,head=null,clip=null,error=null;const limbs=[];
 const ready=new Promise(resolve=>{
  try{
   const bytes=Uint8Array.from(atob(window.ROOM_CARTOON_CAT),c=>c.charCodeAt(0));
   new window.RoomGLTF.GLTFLoader().parse(bytes.buffer,'',gltf=>{
    model=gltf.scene;model.name='sculpted-cartoon-cat';cat.add(model);
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.material.metalness=0;o.material.envMapIntensity=.25;if(o.name.startsWith('Cream_paw'))limbs.push({paw:o});}});
    head=model.getObjectByName('Head');mixer=new T.AnimationMixer(model);
    const tracks=gltf.animations.flatMap(a=>a.tracks.map(t=>t.clone())),start=Math.min(...tracks.map(t=>t.times[0]));
    tracks.forEach(t=>t.shift(-start));clip=new T.AnimationClip('Quiet presence',-1,tracks);
    if(clip)mixer.clipAction(clip).play();mixer.update(0);resolve();
   },e=>{error=String(e);console.warn('Room cat could not be decoded',e);resolve();});
  }catch(e){error=String(e);console.warn('Room cat could not be prepared',e);resolve();}
 });assetPromises.push(ready);
 const birds=[];const birdInk=new T.MeshBasicMaterial({color:'#435866',side:T.DoubleSide});
 for(let i=0;i<3;i++){
  const bird=group(2.0,3.35,-2.79);bird.userData.dynamic=true;bird.visible=false;
  sphere(.014,birdInk,0,0,0,bird,[1.55,.55,.68]);
  const wings=[];for(const side of [-1,1]){
   const wing=group(.006,0,side*.003,bird),shape=new T.Shape();shape.moveTo(-.012,0);shape.quadraticCurveTo(.007,.044*side,.047,.092*side);shape.lineTo(.010,.066*side);shape.lineTo(-.021,.018*side);shape.closePath();
   const mesh=new T.Mesh(new T.ShapeGeometry(shape,8),birdInk);wing.add(mesh);wings.push(wing);
  }birds.push({group:bird,wings,index:i});
 }

 let time=0,wind=0,initialized=false;
 function tick(dt,moving,night=0){
  if(!moving&&initialized){if(night>=.72)birds.forEach(b=>b.group.visible=false);return;}initialized=true;
  if(moving){time+=dt;mixer?.update(dt);}
  wind=.35+.65*Math.pow(.5+.5*Math.sin(time*.52),3);
  for(const b of birds){const fly=(time+1.4-b.index*.23)%24;b.group.visible=fly<6.5&&night<.72;
   b.group.position.set(2.12-fly*.77,3.27+b.index*.070+Math.sin(fly*.8)*.09,-2.785+b.index*.001);
   b.wings.forEach((w,i)=>{w.rotation.x=(i?1:-1)*(.12+Math.sin(time*9.2+b.index)*.86);});
  }
 }
 tick(0,false);
 return {tick,cat,limbs,birds,contact,ready,get model(){return model;},get head(){return head;},get mixer(){return mixer;},get clip(){return clip;},get state(){return {time,wind,posture:'seated',loaded:!!model,error};}};
};

