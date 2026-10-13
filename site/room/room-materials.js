/* Painted room surfaces: deliberate marks, three diffuse tones, no scanned PBR channels. */
window.createRoomMaterials=function(T,renderer){
 const ready=[],sets={},cache=new Map(),converted=new WeakMap();
 const gradient=new T.DataTexture(new Uint8Array([78,78,78,255,167,167,167,255,248,248,248,255]),3,1,T.RGBAFormat);
 gradient.name='painted-three-tone-ramp';gradient.minFilter=gradient.magFilter=T.NearestFilter;gradient.generateMipmaps=false;gradient.needsUpdate=true;
 function ink(params={}){
  const values={gradientMap:gradient};
  for(const key of ['color','map','alphaMap','alphaTest','transparent','opacity','side','depthWrite','depthTest','emissive','emissiveMap','emissiveIntensity','vertexColors','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','name','toneMapped'])if(params[key]!==undefined)values[key]=params[key];
  const material=new T.MeshToonMaterial(values);material.userData.illustrated=true;return material;
 }
 function fromMaterial(source){
  if(Array.isArray(source))return source.map(fromMaterial);
  if(!source?.isMeshStandardMaterial&&!source?.isMeshPhongMaterial&&!source?.isMeshLambertMaterial)return source;
  if(converted.has(source))return converted.get(source);
  const material=ink(source);material.name=source.name;material.userData={...source.userData,illustrated:true};converted.set(source,material);return material;
 }
 function painted(kind){
  if(sets[kind])return sets[kind].diffuse;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
  c.fillStyle='#ffffff';c.fillRect(0,0,512,512);
  if(kind==='floor'){
   // Broad staggered boards, a few quiet strokes; the seams tile at the boundary.
   const tones=['#f1ebdf','#e9e0d2','#f6eee1','#e9dfd0'];
   for(let row=0;row<4;row++){
    const y=row*128,join=row%2?320:128;c.fillStyle=tones[row];c.fillRect(0,y,512,128);
    c.fillStyle='#b7a693';c.fillRect(0,y,512,1.5);c.fillRect(join,y,1.3,128);
    c.strokeStyle='#b3a18b26';c.lineWidth=1.25;
    for(let line=0;line<2;line++){const gy=y+27+line*48;c.beginPath();c.moveTo(0,gy);c.bezierCurveTo(140,gy-6,360,gy+6,512,gy);c.stroke();}
   }
  }else{
   c.fillStyle='#f5f1e7';c.fillRect(0,0,512,512);
   c.strokeStyle=kind==='paint'?'#ac9e8b0c':'#987d6033';c.lineWidth=1.8;
   for(let line=0;line<5;line++){const x=30+line*110;c.beginPath();c.moveTo(x,0);c.bezierCurveTo(x+8,160,x-8,352,x,512);c.stroke();}
  }
  const texture=new T.CanvasTexture(canvas);texture.name='painted-'+kind;texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),4);
  sets[kind]={diffuse:texture};return texture;
 }
 function surface(kind,tone='#ffffff'){
  const key=kind+tone;if(cache.has(key))return cache.get(key);
  const plaster=kind==='plaster'||kind==='ceiling';
  const material=ink({color:tone,map:plaster?null:painted(kind)});
  material.name='illustrated-'+kind+'-'+tone;
  material.userData.surface=kind;material.userData.physicalTile=kind==='floor'?2.4:plaster?1.45:.95;
  if(plaster){
   material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 roomSurfacePoint; varying vec3 roomSurfaceNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n roomSurfacePoint=(modelMatrix*vec4(transformed,1.0)).xyz; roomSurfaceNormal=normalize(mat3(modelMatrix)*normal);');
    shader.fragmentShader='varying vec3 roomSurfacePoint; varying vec3 roomSurfaceNormal;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
     vec3 roomN=abs(normalize(roomSurfaceNormal));
     float roomX=max(0.0,3.56-abs(roomSurfacePoint.x));
     float roomZ=max(0.0,roomSurfacePoint.z+2.60);
     float roomTop=max(0.0,4.12-roomSurfacePoint.y);
     float roomCorner=roomN.y>.7?min(roomX,roomZ):(roomN.z>.7?min(roomX,roomTop):min(roomZ,roomTop));
     reflectedLight.indirectDiffuse*=1.0-.10*exp(-roomCorner*10.0);
    `);
   };
   material.customProgramCacheKey=()=> 'illustrated-chalk-corners-v1';
  }
  cache.set(key,material);return material;
 }
 // The existing measured bevel/UV geometry is appended by apply.py.
 function geometry(w,h,d,material,x=0,y=0,z=0){
  const kind=material.userData.surface;if(!kind)return null;
  const plaster=kind==='plaster'||kind==='ceiling',floor=kind==='floor';
  const bevel=!plaster&&!floor&&Math.min(w,h,d)>.028&&Math.max(w,h,d)>.18;
  const g=bevel?new window.RoomRounded.RoundedBoxGeometry(w,h,d,1,Math.min(.008,Math.min(w,h,d)*.15)):new T.BoxGeometry(w,h,d);
  const pos=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv,tile=material.userData.physicalTile;
  const longest=w>=h&&w>=d?'x':h>=d?'y':'z';
  for(let i=0;i<pos.count;i++){
   const p={x:pos.getX(i),y:pos.getY(i),z:pos.getZ(i)},a={x:Math.abs(n.getX(i)),y:Math.abs(n.getY(i)),z:Math.abs(n.getZ(i))};
   const face=a.x>=a.y&&a.x>=a.z?'x':a.y>=a.z?'y':'z';let u,v;
   if(plaster||floor){const q={x:p.x+x,y:p.y+y,z:p.z+z};[u,v]=face==='y'?[q.x,-q.z]:face==='x'?[q.z,q.y]:[q.x,q.y];}
   else {const along=face===longest?(face==='x'?'y':'x'):longest;const across=['x','y','z'].find(axis=>axis!==face&&axis!==along);u=p[across]+(x*1.371+z*.823);v=p[along]+y*.791+x*.431;}
   uv.setXY(i,u/tile,v/tile);
  }
  // Preserve the box helper's public scale contract and its existing placement measurements.
  g.scale(1/w,1/h,1/d);g.userData={surface:kind,bevel:bevel?.008:0};return g;
 }
 return {surface,geometry,ready,sets,materials:cache,ink,fromMaterial,gradient,style:"illustrated"};
};
