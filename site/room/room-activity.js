/* The user's fox: authored room paths, varied actions and a quiet night bed. */
window.createRoomActivity=function({T,root,sphere,group,shadow,assetPromises,illustrate,groundObstacles=[],camera,random=Math.random}){
 const cat=group(-.62,.029,.96);cat.name='room-cat';cat.userData.dynamic=true;cat.userData.componentName='小狐狸';
 const contact=shadow(.53,.65,.20,cat.position.x,.0295,cat.position.z);contact.name='fox-contact';
 let model=null,body=null,head=null,torso=null,curlBody=null,tail=null,error=null,time=0,wind=0,initialized=false,distance=0,gait=0,posture='looking-around',lookingAtCamera=false;
 const limbs=[],eyes=[],lids=[],restMeshes=[],up=new T.Vector3(0,1,0);
 const clamp=T.MathUtils.clamp,smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);},range=(a,b)=>a+(b-a)*random();
 const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
 const walkRadius=.36,obstacles=groundObstacles.map(object=>{object.updateWorldMatrix(true,false);object.geometry.computeBoundingSphere();const s=object.geometry.boundingSphere.clone().applyMatrix4(object.matrixWorld);return {object,center:s.center,radius:s.radius};});
 // Directed, authored passages. Every junction shares position and heading;
 // there is no generated departure bend or in-place orientation change.
 const k=.5522847498307936,V=(x,z)=>new T.Vector3(x,.029,z);
 const cubic=(a,b,c,d)=>{const q=new T.CubicBezierCurve3(a,b,c,d);q.arcLengthDivisions=512;
  q.getTangent=(t,target=new T.Vector3())=>target.copy(b).sub(a).multiplyScalar(3*(1-t)*(1-t)).addScaledVector(c.clone().sub(b),6*(1-t)*t).addScaledVector(d.clone().sub(c),3*t*t).normalize();return q;
 };
 const north=V(-.62,.31),west=V(-1.11,.76),south=V(-.62,1.21),east=V(-.13,.76);
 const southwest=cubic(west,V(-1.11,.76+.45*k),V(-.62-.49*k,1.21),south);
 const split=.42,p0=southwest.v0,p1=southwest.v1,p2=southwest.v2,p3=southwest.v3;
 const a01=p0.clone().lerp(p1,split),a12=p1.clone().lerp(p2,split),a23=p2.clone().lerp(p3,split),b01=a01.clone().lerp(a12,split),b12=a12.clone().lerp(a23,split),bed=b01.clone().lerp(b12,split);
 const waypoints=[bed,south,east,north,west,V(1.25,1.45),V(1.25,.91),V(.17,1.06),V(.65,1.45),V(.65,.91),V(.04,1.03),V(-.26,.73)];
 const lanes=[];
 function add(from,to,curve,branch=null){lanes.push({id:lanes.length,from,to,curve,length:curve.getLength(),branch});}
 function semicircle(x){
  const path=new T.CurvePath();path.add(cubic(V(x,1.45),V(x+.27*k,1.45),V(x+.27,1.18+.27*k),V(x+.27,1.18)));
  path.add(cubic(V(x+.27,1.18),V(x+.27,1.18-.27*k),V(x+.27*k,.91),V(x,.91)));
  const lengths=path.curves.map(q=>q.getLength()),total=lengths[0]+lengths[1];
  for(const method of ['getPointAt','getTangentAt'])path[method]=u=>{const d=clamp(u,0,1)*total,i=d<=lengths[0]?0:1;return path.curves[i][method](clamp((d-(i?lengths[0]:0))/lengths[i],0,1));};
  return path;
 }
 add(0,1,cubic(bed,b12,a23,south));
 add(1,2,cubic(south,V(-.62+.49*k,1.21),V(-.13,.76+.45*k),east),'left');
 add(2,3,cubic(east,V(-.13,.76-.45*k),V(-.62+.49*k,.31),north));
 add(3,4,cubic(north,V(-.62-.49*k,.31),V(-1.11,.76-.45*k),west));
 add(4,0,cubic(west,a01,b01,bed));
 add(1,5,cubic(south,V(-.02,1.21),V(.65,1.45),waypoints[5]),'wide');
 add(5,6,semicircle(1.25));
 add(6,7,cubic(waypoints[6],V(.89,.91),V(.53,1.06),waypoints[7]));
 add(7,2,cubic(waypoints[7],V(.17-.30*k,1.06),V(-.13,.76+.30*k),east));
 add(1,8,cubic(south,V(-.20,1.21),V(.23,1.45),waypoints[8]),'middle');
 add(8,9,semicircle(.65));
 add(9,10,cubic(waypoints[9],V(.65-(.61/3),.91),V(.04+(.61/3),1.03),waypoints[10]));
 add(10,11,cubic(waypoints[10],V(.04-.30*k,1.03),V(-.26,.73+.30*k),waypoints[11]));
 add(11,3,cubic(waypoints[11],V(-.26,.73-.42*k),V(-.62+.36*k,.31),north));
 const connections=waypoints.map((_,i)=>lanes.filter(l=>l.from===i));
 const tangent=southwest.getTangent(split),sleepSpot={position:bed.clone(),yaw:Math.atan2(tangent.x,tangent.z)};
 cat.position.copy(sleepSpot.position);cat.rotation.y=sleepSpot.yaw;

 const visits=waypoints.map(()=>0),events=[],branchVisits={left:0,middle:0,wide:0};
 let node=0,plan=null,walkSpeed=0,angularSpeed=0,actionTime=0,actionDuration=range(4,7),nextNap=range(65,110),napDuration=range(7,14);
 let walkTravel=0,walkTime=0,walkBudget=range(3.4,5.6),cruise=range(.125,.155),lastBranch=null;
 let nightMode=false,nightKnown=false,focusCamera=false,scanSide=-1,scanAmount=.58,wagFrequency=2.2,glanceStart=0,glanceDuration=0;
 let headYaw=0,headPitch=0,blinkAt=range(2,5),sleep=0,settle=0,wrap=0,turning=false;
 function setAction(name,duration=0){posture=name;actionTime=0;actionDuration=duration;events.push({time,action:name,node,lane:plan?.lane?.id??null,night:nightMode,walkTravel,walkTime});if(events.length>100)events.shift();}
 function cameraYawAt(point){if(!camera)return cat.rotation.y;const p=camera.getWorldPosition(new T.Vector3());return Math.atan2(p.x-point.x,p.z-point.z);}
 function startLook(){focusCamera=!!camera&&Math.abs(angleDiff(cameraYawAt(cat.position),cat.rotation.y))<1.02;scanSide=random()<.5?-1:1;scanAmount=range(.40,.62);wagFrequency=range(1.6,2.8);setAction('looking-around',range(4.5,8));}
 function chooseLane(){
  let available=connections[node];if(available.length===1)return available[0];
  if(nightMode)return available.find(l=>l.branch==='left');
  available=available.filter(l=>l.branch!==lastBranch);
  const weights=available.map(l=>({left:.45,middle:2.4,wide:3.2}[l.branch])/(1+branchVisits[l.branch]*.07));let pick=random()*weights.reduce((a,b)=>a+b,0),i=0;while(i<weights.length-1&&pick>weights[i])pick-=weights[i++];
  const lane=available[i];lastBranch=lane.branch;branchVisits[lane.branch]++;return lane;
 }
 function arrivalChoice(to){
  if(nightMode)return to===0?'sleep':'continue';
  const lane=plan.lane,p=waypoints[to],t=lane.curve.getTangentAt(1),yaw=Math.atan2(t.x,t.z),left=lane.length-plan.progress;
  if(walkTravel+left<walkBudget||walkTime+left/cruise<22)return 'continue';
  const front=Math.abs(angleDiff(cameraYawAt(p),yaw))<1.02,value=random();
  if(value<.12&&time>=nextNap&&[0,2,3,4,11].includes(to))return 'sleep';if(value<(front?.78:.44))return 'look';
  walkBudget=walkTravel+left+range(.7,1.5);return 'continue';
 }
 function beginLane(lane){
  plan={lane,progress:0,choice:'continue',decisionMade:false,cruise};
  glanceStart=(posture==='walking'?actionTime:0)+range(1,2.5);glanceDuration=random()<.75?range(1.5,2.6):0;
  if(posture!=='walking')setAction('walking');
 }
 function nextJourney(){
  if(nightMode&&node===0){plan=null;walkSpeed=angularSpeed=0;turning=false;setAction('curling-up',3.4);return;}
  walkTravel=walkTime=0;walkBudget=range(3.4,5.6);cruise=range(.125,.155);beginLane(chooseLane());
 }
 function arrive(){
  const finished=plan;node=finished.lane.to;visits[node]++;plan=null;
  if(finished.choice==='continue'){beginLane(chooseLane());return;}
  walkSpeed=angularSpeed=0;turning=false;
  if(finished.choice==='sleep'){napDuration=range(7,14);setAction('curling-up',3.4);}else startLook();
 }
 function advancePath(dt){
  const p=plan,lane=p.lane,remaining=lane.length-p.progress;
  if(!p.decisionMade&&remaining<Math.min(.30,lane.length*.6)){p.choice=arrivalChoice(lane.to);p.decisionMade=true;}
  const u=p.progress/lane.length,t0=lane.curve.getTangentAt(u),ahead=Math.min(lane.length,p.progress+.015),t1=lane.curve.getTangentAt(ahead/lane.length),curvature=t0.angleTo(t1)/Math.max(.002,ahead-p.progress);
  let want=Math.min(p.cruise,.58/(curvature+.001));
  if(p.choice!=='continue')want=Math.min(want,Math.sqrt(Math.max(0,2*.13*remaining)));
  walkSpeed+=clamp(want-walkSpeed,-.20*dt,.14*dt);
  const advance=Math.min(remaining,walkSpeed*dt),before=cat.position.clone(),beforeYaw=cat.rotation.y;
  p.progress+=advance;cat.position.copy(lane.curve.getPointAt(p.progress/lane.length));const t=lane.curve.getTangentAt(p.progress/lane.length);cat.rotation.y=Math.atan2(t.x,t.z);
  const moved=cat.position.distanceTo(before);angularSpeed=angleDiff(cat.rotation.y,beforeYaw)/dt;distance+=moved;walkTravel+=moved;walkTime+=dt;gait+=moved/.072;
  turning=Math.abs(angularSpeed)>.13;
  if(lane.length-p.progress<1e-7)arrive();
 }
 function updateBehavior(dt){actionTime+=dt;if(posture==='walking')advancePath(dt);else{
  walkSpeed=angularSpeed=0;turning=false;
  if(posture==='curling-up'&&actionTime>=3.4)setAction('sleeping',nightMode?Infinity:napDuration);
  else if(posture==='sleeping'&&!nightMode&&actionTime>=actionDuration)setAction('waking-up',3.4);
  else if(posture==='waking-up'&&actionTime>=3.4){nextNap=time+range(65,110);if(nightMode)nextJourney();else if(random()<.7)nextJourney();else startLook();}
  else if(posture==='looking-around'&&actionTime>=actionDuration)nextJourney();
 }}
 function updateNight(night,moving){const want=nightMode?night>.55:night>=.72,changed=want!==nightMode,first=!nightKnown;nightKnown=true;if(!changed)return false;nightMode=want;
  if((first&&time===0)||!moving){plan=null;node=0;cat.position.copy(sleepSpot.position);cat.rotation.y=sleepSpot.yaw;walkSpeed=angularSpeed=0;turning=false;setAction(want?'sleeping':'looking-around',want?Infinity:range(4.5,8));return true;}
  if(want){if(posture==='sleeping'&&node===0)actionDuration=Infinity;else if(sleep>0)setAction('waking-up',3.4);else if(!plan)nextJourney();else{plan.choice=plan.lane.to===0?'sleep':'continue';plan.decisionMade=true;}}
  else{if(posture==='sleeping')setAction('waking-up',3.4);else if(plan){plan.choice='continue';plan.decisionMade=false;}}
  return true;
 }

 function aimLeg(l,goal){
  const parent=l.joint.parent;parent.updateWorldMatrix(true,false);const direction=parent.worldToLocal(goal.clone()).sub(l.joint.position).normalize();
  const turn=new T.Quaternion().setFromUnitVectors(l.restDirection,direction),angle=turn.angleTo(new T.Quaternion()),limit=.34;
  if(angle>limit)turn.slerp(new T.Quaternion(),1-limit/angle);l.joint.quaternion.copy(turn).multiply(l.restQuaternion);l.joint.scale.copy(l.restScale);l.joint.updateWorldMatrix(true,true);
 }
 function place(dt){
  if(!model)return;
  sleep=settle=wrap=0;
  if(posture==='sleeping')sleep=settle=wrap=1;
  else if(posture==='curling-up'){sleep=smooth(actionTime/3.4);settle=smooth((actionTime-.45)/2.95);wrap=smooth((actionTime-.8)/2.6);}
  else if(posture==='waking-up'){sleep=1-smooth(actionTime/3.4);settle=1-smooth(actionTime/2.8);wrap=1-smooth(actionTime/2.0);}
  const motionWeight=clamp(walkSpeed/.10+Math.abs(angularSpeed)/.30,0,1);
  torso.position.y=.156+(1-sleep)*motionWeight*.001*Math.sin(gait*Math.PI*4);torso.rotation.set(0,0,0);torso.scale.y=1;torso.position.y+=.0012*sleep*Math.sin(time*1.65);
  curlBody.position.set(0,0,0);curlBody.rotation.set(0,0,0);
  for(const mesh of restMeshes){const d=mesh.morphTargetDictionary;if(d.TailFolding!==undefined){mesh.morphTargetInfluences[d.TailFolding]=wrap<.5?wrap*2:(1-wrap)*2;mesh.morphTargetInfluences[d.Resting]=Math.max(0,wrap*2-1);}else mesh.morphTargetInfluences[d.Resting]=sleep;}
  let yaw=.04*Math.sin(time*.6),pitch=.008*Math.sin(time*.9),tilt=.012*Math.sin(time*.8);lookingAtCamera=false;
  const observing=posture==='looking-around',glancing=posture==='walking'&&actionTime>glanceStart&&actionTime<glanceStart+glanceDuration;
  if(observing){const u=clamp(actionTime/actionDuration,0,1),keys=[[0,0],[.18,scanSide*scanAmount],[.34,scanSide*scanAmount],[.60,-scanSide*scanAmount],[.74,-scanSide*scanAmount],[1,0]];
   for(let i=0;i<keys.length-1;i++)if(u>=keys[i][0]&&u<=keys[i+1][0]){yaw=T.MathUtils.lerp(keys[i][1],keys[i+1][1],smooth((u-keys[i][0])/(keys[i+1][0]-keys[i][0])));break;}
  }
  if(camera&&(observing||glancing)){
   const direction=camera.getWorldPosition(new T.Vector3()).sub(cat.getWorldPosition(new T.Vector3())).applyQuaternion(cat.getWorldQuaternion(new T.Quaternion()).invert()),camYaw=Math.atan2(direction.x,direction.z);
   const age=glancing?actionTime-glanceStart:actionTime,length=glancing?glanceDuration:actionDuration,attention=smooth(age/.9)*(1-smooth((age-length+.9)/.9));
   if(Math.abs(camYaw)<1.02){yaw=T.MathUtils.lerp(yaw,camYaw,attention);pitch=T.MathUtils.lerp(pitch,-clamp(Math.atan2(direction.y-.30,Math.hypot(direction.x,direction.z))*.65,-.12,.20),attention);tilt+=.045*attention*Math.sin(age*.8);lookingAtCamera=attention>.55;}
  }
  if(posture==='sniffing'){const a=smooth(actionTime/.65)*(1-smooth((actionTime-actionDuration+.7)/.7));pitch+=.25*a;yaw=.08*Math.sin(actionTime*1.7)*a;}
  headYaw+=clamp(yaw-headYaw,-.8*dt,.8*dt);headPitch+=clamp(pitch-headPitch,-.45*dt,.45*dt);
  head.position.set(-.070*sleep,.145-.153*sleep,.105-.050*sleep);head.rotation.set(headPitch*(1-sleep)+.30*sleep,headYaw*(1-sleep)-.55*sleep,.48*sleep+tilt*(1-sleep));
  tail.position.set(0,0,0);tail.rotation.set(.035*Math.sin(time*wagFrequency)*(1-wrap),(.075+(lookingAtCamera?.065:0))*Math.sin(time*wagFrequency*.95)*(1-wrap),.02*Math.sin(time*1.8)*(1-wrap));
  const closing=time>=blinkAt&&time<blinkAt+.24?Math.sin((time-blinkAt)/.24*Math.PI):0;if(time>=blinkAt+.24)blinkAt=time+range(2.8,6);
  eyes.forEach(eye=>{eye.scale.y=Math.max(.015,1-Math.max(closing,sleep));eye.visible=sleep<.88;});lids.forEach(lid=>{lid.visible=sleep>.72;lid.scale.setScalar(smooth((sleep-.72)/.16));});
  model.updateWorldMatrix(true,true);
  for(const l of limbs){
   const f=(gait+l.offset)%1,stance=f<.60,swing=stance?0:smooth((f-.60)/.40),lift=stance?0:Math.sin(Math.PI*swing)*motionWeight*(1-sleep);
   const sweep=stance?1-2*f/.60:-1+2*swing,stride=(turning?.023:.027)*Math.max(.55,clamp(walkSpeed/.13,0,1))*motionWeight;
   l.joint.position.copy(l.restPosition);const parent=l.joint.parent;parent.updateWorldMatrix(true,false);
   l.joint.position.add(new T.Vector3(0,lift*.010,0).applyQuaternion(parent.getWorldQuaternion(new T.Quaternion()).invert()));
   const goal=new T.Vector3(l.footX,.010+lift*.020,l.footZ+sweep*stride).applyMatrix4(cat.matrixWorld);
   aimLeg(l,goal);l.joint.quaternion.slerp(l.sleepQuaternion,sleep);l.joint.position.lerp(l.restPosition,sleep);
   l.target=goal;l.stance=sleep===0&&(motionWeight<.01||stance);l.fold=0;l.lift=lift;
  }
  // The body leans slightly; each whole leg independently slides toward a straight resting direction.
  curlBody.position.set(.025*settle,-.062*settle,-.030*settle);curlBody.rotation.set(.02*settle,0,.38*settle);
  model.updateMatrixWorld(true);const v=new T.Vector3(),floor=cat.position.y+.002;let min=Infinity;
  for(const i of body.userData.supportSamples)min=Math.min(min,body.getVertexPosition(i,v).applyMatrix4(body.matrixWorld).y);
  const correction=sleep>0?floor-min:Math.max(0,floor-min);if(Math.abs(correction)>1e-7){curlBody.position.y+=correction;for(const l of limbs)l.target.y+=correction;model.updateMatrixWorld(true);}
  model.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});contact.position.set(cat.position.x,.0295,cat.position.z);contact.rotation.z=cat.rotation.y;contact.scale.set(1+.18*sleep,1+.15*sleep,1);
 }
 const ready=new Promise(resolve=>{
  try{
   const bytes=Uint8Array.from(atob(window.ROOM_CARTOON_CAT),c=>c.charCodeAt(0));
   new window.RoomGLTF.GLTFLoader().parse(bytes.buffer,'',gltf=>{
    model=gltf.scene;model.name='user-fox';cat.add(model);const meshes=[];
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=false;if(illustrate)o.material=illustrate(o.material);meshes.push(o);}});
    // Back-face hulls follow the actual mesh, including the large ears and tail.
    const outline=new T.MeshBasicMaterial({color:'#493c43',side:T.BackSide,depthWrite:true});
    for(const mesh of meshes){if(/Eye|nose|Paw/i.test(mesh.name))continue;const g=mesh.geometry.clone(),p=g.attributes.position,n=g.attributes.normal;for(let j=0;j<p.count;j++)p.setXYZ(j,p.getX(j)+n.getX(j)*.0018,p.getY(j)+n.getY(j)*.0018,p.getZ(j)+n.getZ(j)*.0018);for(const target of (g.morphTargetsRelative?[]:g.morphAttributes.position||[])){for(let j=0;j<target.count;j++)target.setXYZ(j,target.getX(j)+n.getX(j)*.0018,target.getY(j)+n.getY(j)*.0018,target.getZ(j)+n.getZ(j)*.0018);}const hull=mesh.isSkinnedMesh?new T.SkinnedMesh(g,outline):new T.Mesh(g,outline);if(mesh.isSkinnedMesh){hull.bindMode=mesh.bindMode;hull.bind(mesh.skeleton,mesh.bindMatrix);}if(mesh.morphTargetInfluences){hull.morphTargetDictionary={...mesh.morphTargetDictionary};hull.morphTargetInfluences=mesh.morphTargetInfluences;}hull.name='fox-outline';hull.userData.outline=true;mesh.add(hull);}
    body=model.getObjectByProperty('isSkinnedMesh',true);torso=model.getObjectByName('Torso');curlBody=model.getObjectByName('CurlBody');head=model.getObjectByName('Head');tail=model.getObjectByName('Tail');eyes.push(model.getObjectByName('Eye_L'),model.getObjectByName('Eye_R'));lids.push(model.getObjectByName('SleepingEye_L'),model.getObjectByName('SleepingEye_R'));restMeshes.push(...meshes.filter(o=>o.morphTargetDictionary?.Resting!==undefined));
    const rigData={"FL":{"head":[-0.07000000029802322,-0.11100000143051147,-0.03700000047683716],"tail":[-0.07000000029802322,-0.125,-0.15000000596046448],"length":0.11386395990848541,"footX":-0.07000000029802322,"footZ":0.125},"FR":{"head":[0.07000000029802322,-0.11100000143051147,-0.03700000047683716],"tail":[0.07000000029802322,-0.125,-0.15000000596046448],"length":0.11386395990848541,"footX":0.07000000029802322,"footZ":0.125},"BL":{"head":[-0.07000000029802322,0.11699999868869781,-0.03700000047683716],"tail":[-0.07000000029802322,0.10300000011920929,-0.15000000596046448],"length":0.11386395990848541,"footX":-0.07000000029802322,"footZ":-0.10300000011920929},"BR":{"head":[0.07000000029802322,0.11699999868869781,-0.03700000047683716],"tail":[0.07000000029802322,0.10300000011920929,-0.15000000596046448],"length":0.11386395990848541,"footX":0.07000000029802322,"footZ":-0.10300000011920929}};
    for(const [key,offset]of [['FL',0],['BL',.25],['FR',.5],['BR',.75]]){
     const joint=model.getObjectByName('Leg_'+key),d=rigData[key],front=key[0]==='F',restQuaternion=joint.quaternion.clone(),restScale=joint.scale.clone(),restPosition=joint.position.clone();
     const lean=(key[1]==='L'?.80:.88)+(front?-.025:.025),spread=front?.08:-.08;
     const sleepQuaternion=new T.Quaternion().setFromEuler(new T.Euler(0,spread,lean)).multiply(restQuaternion);
     limbs.push({key,joint,length:d.length,restQuaternion,restScale,restPosition,sleepQuaternion,restDirection:up.clone().applyQuaternion(restQuaternion),footX:d.footX,footZ:d.footZ,front,offset,anchor:null,wasStance:false});
    }
    const bp=body.geometry.attributes.position;
    for(const l of limbs){const indices=[];for(let i=0;i<bp.count;i++){if(bp.getY(i)>.065)continue;const owner=limbs.reduce((a,b)=>(bp.getX(i)-a.footX)**2+(bp.getZ(i)-a.footZ)**2<(bp.getX(i)-b.footX)**2+(bp.getZ(i)-b.footZ)**2?a:b);if(owner===l)indices.push(i);}
     const selected=new Set();for(let a=0;a<16;a++)for(const tilt of [.25,.65,1.3,4]){const dx=Math.cos(a*Math.PI/8),dz=Math.sin(a*Math.PI/8);let min=Infinity,index=indices[0];for(const i of indices){const value=bp.getX(i)*dx+bp.getZ(i)*dz+bp.getY(i)*tilt;if(value<min){min=value;index=i;}}selected.add(index);}l.soleSamples=[...selected];
    }
    const supports=new Set(limbs.flatMap(l=>l.soleSamples));for(let a=0;a<24;a++){const dx=Math.sin(a*Math.PI/12),dy=-Math.cos(a*Math.PI/12);for(const dz of [-.35,0,.35])for(const trunk of [false,true]){let min=Infinity,index=0;for(let i=0;i<bp.count;i++){if(trunk&&bp.getY(i)<.075)continue;const value=dx*bp.getX(i)+dy*bp.getY(i)+dz*bp.getZ(i);if(value<min){min=value;index=i;}}supports.add(index);}}body.userData.supportSamples=[...supports];
    place(0);resolve();
   },e=>{error=String(e);console.warn('Room fox could not be decoded',e);resolve();});
  }catch(e){error=String(e);console.warn('Room fox could not be prepared',e);resolve();}
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

 function tick(dt,moving,night=0){
  const changed=updateNight(night,moving);
  if(!moving&&initialized&&!changed){if(nightMode)birds.forEach(b=>b.group.visible=false);return;}initialized=true;
  if(moving){const count=Math.max(1,Math.ceil(dt/.025)),step=dt/count;for(let i=0;i<count;i++){time+=step;if(model)updateBehavior(step);place(step);}}else place(0);
  wind=.35+.65*Math.pow(.5+.5*Math.sin(time*.52),3);
  for(const b of birds){const fly=(time+1.4-b.index*.23)%24;b.group.visible=fly<6.5&&!nightMode;
   b.group.position.set(2.12-fly*.77,3.27+b.index*.070+Math.sin(fly*.8)*.09,-2.785+b.index*.001);
   b.wings.forEach((w,i)=>{w.rotation.x=(i?1:-1)*(.12+Math.sin(time*9.2+b.index)*.86);});
  }
 }
 return {tick,cat,limbs,birds,contact,ready,lanes,waypoints,sleepSpot,obstacles,walkRadius,get model(){return model;},get head(){return head;},get state(){return {time,wind,posture,lookingAtCamera,distance,gait,node,lane:plan?.lane?.id??null,part:plan?'lane':null,actionTime,actionDuration,night:nightMode,returningToBed:nightMode&&posture!=='sleeping',sleep,settle,wrap,walkSpeed,angularSpeed,turning,focusCamera,walkTravel,walkTime,walkBudget,branchVisits:{...branchVisits},visits:[...visits],events:[...events],loaded:!!model,error};}};
};
