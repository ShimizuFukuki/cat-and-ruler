/* Scanned surfaces at a physical scale. Every color map is sRGB; normals/roughness are data. */
window.createRoomMaterials=function(T,renderer){
 const ready=[],sets={},cache=new Map();
 for(const [name,channels] of Object.entries(window.ROOM_MATERIAL_SCANS||{})){
  const maps={};sets[name]=maps;
  for(const [channel,url]of Object.entries(channels)){
   let done;ready.push(new Promise(resolve=>done=resolve));
   const texture=new T.TextureLoader().load(url,()=>done(),undefined,()=>done());
   texture.name=name+'-'+channel;texture.wrapS=texture.wrapT=T.RepeatWrapping;
   texture.colorSpace=channel==='diffuse'?T.SRGBColorSpace:T.NoColorSpace;
   texture.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);maps[channel]=texture;
  }
 }
 function surface(kind,tone='#ffffff'){
  const key=kind+tone;if(cache.has(key))return cache.get(key);
  const family=kind==='floor'?'floor':kind==='plaster'||kind==='ceiling'?'plaster':'wood',maps=sets[family]||{};
  const plaster=family==='plaster',paint=kind==='paint',wood=family==='wood';
  const material=new T.MeshStandardMaterial({color:tone,map:maps.diffuse,normalMap:maps.nor_gl,normalScale:new T.Vector2(plaster?.12:paint?.07:.22,plaster?.12:paint?.07:.22),roughnessMap:plaster?null:maps.rough,roughness:plaster?1:paint?.92:kind==='floor'?.85:.8,metalness:0,envMapIntensity:plaster?0:.45});
  material.name='room-'+kind+'-'+tone;
  material.userData.surface=kind;material.userData.physicalTile=kind==='floor'?1.7:plaster?1.45:.95;
  // Map becomes a measured grain mask; stain and chalk colors are independent of scan exposure.
  // This keeps the photographic pores without turning the room dark red or dirty green.
  material.onBeforeCompile=shader=>{
   const treatment=plaster?
    'float grain=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722)); sampledDiffuseColor.rgb=vec3(.91+grain*.09);':
    paint?'float grain=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722)); sampledDiffuseColor.rgb=vec3(.94+grain*.12);':
    wood?'float grain=dot(sampledDiffuseColor.rgb,vec3(.2126,.7152,.0722)); sampledDiffuseColor.rgb=vec3(.58)+sampledDiffuseColor.rgb*1.55+vec3(grain*.20);':'';
   if(treatment)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',T.ShaderChunk.map_fragment.replace('diffuseColor *= sampledDiffuseColor;',treatment+'\n diffuseColor *= sampledDiffuseColor;'));
   if(plaster){
    shader.vertexShader='varying vec3 roomSurfacePoint; varying vec3 roomSurfaceNormal;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n roomSurfacePoint=(modelMatrix*vec4(transformed,1.0)).xyz; roomSurfaceNormal=normalize(mat3(modelMatrix)*normal);');
    shader.fragmentShader='varying vec3 roomSurfacePoint; varying vec3 roomSurfaceNormal;\n'+shader.fragmentShader;
    // Ambient light is locally occluded at real wall/ceiling junctions. Direct sunlight is unchanged.
    shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
     vec3 roomN=abs(normalize(roomSurfaceNormal));
     float roomX=max(0.0,3.56-abs(roomSurfacePoint.x));
     float roomZ=max(0.0,roomSurfacePoint.z+2.60);
     float roomTop=max(0.0,4.12-roomSurfacePoint.y);
     float roomCorner=roomN.y>.7?min(roomX,roomZ):(roomN.z>.7?min(roomX,roomTop):min(roomZ,roomTop));
     reflectedLight.indirectDiffuse*=1.0-.16*exp(-roomCorner*12.0);
    `);
   }
  };
  material.customProgramCacheKey=()=> 'room-scanned-'+(plaster?'chalk':paint?'paint':wood?'stain':'floor');
  cache.set(key,material);return material;
 }
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
 return {surface,geometry,ready,sets,materials:cache};
};
