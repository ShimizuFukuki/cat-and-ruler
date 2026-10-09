// Convex-hull clipping and static buoyancy. No dynamics or flooding.
(function(root){
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const rotate=(p,t)=>[p[0],p[1]*Math.cos(t)-p[2]*Math.sin(t),p[1]*Math.sin(t)+p[2]*Math.cos(t)];
function hullFaces(outline,rings){
 const ring=rings.map(([z,s])=>outline.map(([x,y])=>[x*s,y*s,z]));
 const faces=[ring[0].slice().reverse(),ring.at(-1).slice()];
 for(let j=1;j<ring.length;j++)for(let i=0;i<outline.length;i++){
  const k=(i+1)%outline.length;
  faces.push([ring[j-1][i],ring[j-1][k],ring[j][k],ring[j][i]]);
 }
 return {faces,deck:ring.at(-1)};
}
function clipBelow(faces,h){
 const clipped=[],cut=[];
 for(const face of faces){
  const result=[];
  for(let i=0;i<face.length;i++){
   const a=face[i],b=face[(i+1)%face.length],ina=a[2]<=h,inb=b[2]<=h;
   if(ina)result.push(a);
   if(ina!==inb){const t=(h-a[2])/(b[2]-a[2]);const p=a.map((v,j)=>v+t*(b[j]-v));result.push(p);cut.push(p)}
  }
  if(result.length>=3)clipped.push(result);
 }
 const unique=[];
 for(const p of cut)if(!unique.some(q=>Math.hypot(...p.map((v,i)=>v-q[i]))<1e-8))unique.push(p);
 if(unique.length>=3){
  const c=[0,1].map(i=>unique.reduce((s,p)=>s+p[i],0)/unique.length);
  unique.sort((a,b)=>Math.atan2(a[1]-c[1],a[0]-c[0])-Math.atan2(b[1]-c[1],b[0]-c[0]));
  clipped.push(unique); // outward cap normal +z
 }
 return clipped;
}
function volumeCentroid(faces){
 let V=0,Q=[0,0,0];
 for(const face of faces)for(let i=1;i<face.length-1;i++){
  const a=face[0],b=face[i],c=face[i+1],v=dot(a,cross(b,c))/6;
  V+=v;for(let k=0;k<3;k++)Q[k]+=v*(a[k]+b[k]+c[k])/4;
 }
 return {volume:V,centroid:Math.abs(V)>1e-14?Q.map(q=>q/V):[0,0,0]};
}
function displaced(body,theta,target){
 const faces=body.faces.map(face=>face.map(p=>rotate(p,theta)));
 const zs=faces.flat().map(p=>p[2]);let lo=Math.min(...zs),hi=Math.max(...zs);
 if(target>volumeCentroid(faces).volume+1e-9)throw new Error('Displacement exceeds closed hull volume');
 for(let i=0;i<48;i++){
  const h=(lo+hi)/2,V=volumeCentroid(clipBelow(faces,h)).volume;
  if(V<target)lo=h;else hi=h;
 }
 const h=(lo+hi)/2,answer=volumeCentroid(clipBelow(faces,h));
 return {...answer,waterline:h,minHullZ:Math.min(...zs),deckClearance:Math.min(...body.deck.map(p=>rotate(p,theta)[2]))-h};
}
function state(body,theta,mass,zG,density=1000){
 const b=displaced(body,theta,mass/density),g=rotate([0,0,zG],theta);
 const arm=g[1]-b.centroid[1];
 return {...b,gravityCenter:g,rightingArm:arm,torqueX:-mass*9.81*arm};
}

const api={rotate,hullFaces,clipBelow,volumeCentroid,displaced,state};
if(typeof module!=="undefined"&&module.exports)module.exports=api;else root.BoatHull=api;
})(typeof window==="undefined"?{}:window);
