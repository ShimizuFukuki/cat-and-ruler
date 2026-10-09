/* WebGL depth-limited, shadow-aware single-scattering approximation.
 * Low-resolution ray marching and bilateral composite; no external render library.
 * This is deliberately bounded to the room, not a full participating-media path tracer. */
window.createRoomAtmosphere=function({T,renderer,scene,camera,sun,lampLight,life,lightMode}){
 const capable=!!renderer.setRenderTarget&&!!renderer.getDrawingBufferSize&&(renderer.capabilities.isWebGL2||renderer.extensions?.has('WEBGL_depth_texture'));
 if(!capable)return {enabled:false,tick(){},setQuality(){},render:()=>renderer.render(scene,camera)};
 const float=renderer.capabilities.isWebGL2&&renderer.extensions?.has('EXT_color_buffer_float'),type=float?T.HalfFloatType:T.UnsignedByteType;
 const sceneTarget=new T.WebGLRenderTarget(1,1,{type,format:T.RGBAFormat,depthBuffer:true});
 sceneTarget.samples=renderer.capabilities.isWebGL2&&!lightMode?2:0;
 sceneTarget.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);sceneTarget.depthTexture.minFilter=T.NearestFilter;sceneTarget.depthTexture.magFilter=T.NearestFilter;
 const fogTarget=new T.WebGLRenderTarget(1,1,{type,format:T.RGBAFormat,depthBuffer:false});
 const blank=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);blank.needsUpdate=true;
 const quadScene=new T.Scene(),quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1),quad=new T.Mesh(new T.PlaneGeometry(2,2));quad.frustumCulled=false;quadScene.add(quad);
 const vertex=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`;
 const uniforms={
  tDepth:{value:sceneTarget.depthTexture},tSunShadow:{value:blank},sunShadowMatrix:{value:new T.Matrix4()},sunShadowOn:{value:0},
  cameraWorld:{value:new T.Matrix4()},inverseProjection:{value:new T.Matrix4()},eye:{value:new T.Vector3()},
  lightDirection:{value:new T.Vector3()},sunColor:{value:new T.Color()},sunPower:{value:1},
  lampPosition:{value:new T.Vector3()},lampDirection:{value:new T.Vector3()},lampPower:{value:1},
  time:{value:0},steps:{value:lightMode?10:18},night:{value:0}
 };
 const fragment=`
 precision highp float;
 varying vec2 vUv;
 uniform sampler2D tDepth,tSunShadow;
 uniform mat4 cameraWorld,inverseProjection,sunShadowMatrix;
 uniform vec3 eye,lightDirection,sunColor,lampPosition,lampDirection;
 uniform float sunPower,lampPower,time,steps,night,sunShadowOn;
 #include <packing>
 vec3 worldAt(float depth){vec4 p=inverseProjection*vec4(vUv*2.0-1.0,depth*2.0-1.0,1.0);return (cameraWorld*vec4(p.xyz/p.w,1.0)).xyz;}
 float lightVisibility(vec3 p){
  if(sunShadowOn<0.5)return 1.0;
  vec4 q=sunShadowMatrix*vec4(p,1.0);vec3 uv=q.xyz/q.w;
  if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0||uv.z>1.0)return 1.0;
  float z=unpackRGBAToDepth(texture2D(tSunShadow,uv.xy));
  return smoothstep(uv.z-0.0018,uv.z-0.0004,z);
 }
 float phaseHG(float cosine){float g=0.36;return (1.0-g*g)/pow(max(0.12,1.0+g*g-2.0*g*cosine),1.5);}
 void main(){
  float depth=texture2D(tDepth,vUv).x;vec3 finish=worldAt(depth),ray=normalize(finish-eye);
  vec3 inverseRay=1.0/(ray+vec3(0.000001));
  vec3 one=(vec3(-3.48,0.06,-2.52)-eye)*inverseRay,two=(vec3(3.48,3.79,3.42)-eye)*inverseRay;
  vec3 lo=min(one,two),hi=max(one,two);
  float start=max(0.0,max(lo.x,max(lo.y,lo.z))),end=min(length(finish-eye),min(hi.x,min(hi.y,hi.z)));
  if(end<=start){gl_FragColor=vec4(0.0);return;}
  float stride=(end-start)/steps,jitter=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453);
  vec3 sum=vec3(0.0);float transmission=1.0;
  for(int i=0;i<18;i++){
   if(float(i)>=steps)break;
   vec3 p=eye+ray*(start+(float(i)+jitter)*stride);
   float flight=(p.z+2.55)/max(0.05,lightDirection.z);vec3 aperture=p-lightDirection*flight;
   float windowMask=smoothstep(-2.56,-2.47,aperture.x)*(1.0-smoothstep(1.64,1.76,aperture.x))*smoothstep(1.65,1.75,aperture.y)*(1.0-smoothstep(3.40,3.52,aperture.y));
   windowMask*=smoothstep(0.025,0.06,abs(aperture.x+0.40))*smoothstep(0.018,0.044,abs(aperture.y-2.16));
   float air=0.78+0.22*sin(p.x*3.2+p.z*1.5+time*.20)*sin(p.y*4.0-p.z*1.2-time*.13);
   float shaft=windowMask*lightVisibility(p)*mix(sunPower,0.18,night)*air;
   vec3 delta=p-lampPosition;float along=dot(delta,lampDirection),radius=length(delta-lampDirection*along);
   float beamWidth=max(.001,along);
   float cone=smoothstep(.045,.12,along)*(1.0-smoothstep(.75,1.35,along))*(1.0-smoothstep(beamWidth*.64,beamWidth*.98,radius))*lampPower*smoothstep(1.308,1.35,p.y);
   float density=shaft*.038+cone*.027;
   float alpha=1.0-exp(-density*stride);
   vec3 light=(sunColor*shaft*phaseHG(dot(-ray,lightDirection))*.58+vec3(1.0,.73,.39)*cone*.8)/max(.001,shaft+cone);
   sum+=transmission*light*alpha;transmission*=1.0-alpha;
  }
  gl_FragColor=vec4(sum,min(.28,1.0-transmission));
 }`;
 const scatter=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,depthTest:false,depthWrite:false,toneMapped:false});
 const resolveUniforms={tColor:{value:sceneTarget.texture},tFog:{value:fogTarget.texture},tDepth:{value:sceneTarget.depthTexture},fogTexel:{value:new T.Vector2(1,1)},cameraNear:{value:camera.near},cameraFar:{value:camera.far}};
 const resolve=new T.ShaderMaterial({uniforms:resolveUniforms,vertexShader:vertex,depthTest:false,depthWrite:false,toneMapped:true,fragmentShader:`
 varying vec2 vUv;uniform sampler2D tColor,tFog,tDepth;uniform vec2 fogTexel;uniform float cameraNear,cameraFar;
 #include <packing>
 float viewDepth(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,cameraNear,cameraFar);}
 void main(){
  float d=viewDepth(vUv),weight=0.0;vec4 fog=vec4(0.0);
  for(int i=0;i<4;i++){vec2 off=vec2(i==0||i==2?-.5:.5,i<2?-.5:.5)*fogTexel;vec2 uv=clamp(vUv+off,0.0,1.0);float w=exp(-abs(viewDepth(uv)-d)*12.0)+.0001;fog+=texture2D(tFog,uv)*w;weight+=w;}
  fog/=weight;vec3 base=texture2D(tColor,vUv).rgb;gl_FragColor=vec4(base*(1.0-fog.a)+fog.rgb,1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }`});
 let enabled=true,small=lightMode,width=0,height=0,time=0;
 if(renderer.debug){const priorError=renderer.debug.onShaderError;renderer.debug.onShaderError=(gl,program,vertexShader,fragmentShader)=>{
  const source=gl.getShaderSource(fragmentShader)||'';
  if(source.includes('sunShadowOn')||source.includes('uniform vec2 fogTexel')){enabled=false;console.warn('Room atmosphere shader was rejected; using the base room renderer.',gl.getProgramInfoLog(program));}
  else if(priorError)priorError(gl,program,vertexShader,fragmentShader);else console.error('Room shader error',gl.getProgramInfoLog(program));
 };}
 const size=new T.Vector2(),source=new T.Vector3(),destination=new T.Vector3();
 function resize(){
  renderer.getDrawingBufferSize(size);const w=Math.max(1,Math.floor(size.x)),h=Math.max(1,Math.floor(size.y));
  if(w===width&&h===height)return;width=w;height=h;sceneTarget.setSize(w,h);
  const scale=small?.28:.45,fw=Math.max(1,Math.round(w*scale)),fh=Math.max(1,Math.round(h*scale));fogTarget.setSize(fw,fh);resolveUniforms.fogTexel.value.set(1/fw,1/fh);
 }
 function render(){
  if(!enabled){renderer.render(scene,camera);return;}
  const previous=renderer.getRenderTarget();
  try{
   resize();renderer.setRenderTarget(sceneTarget);renderer.render(scene,camera);
   uniforms.cameraWorld.value.copy(camera.matrixWorld);uniforms.inverseProjection.value.copy(camera.projectionMatrixInverse);uniforms.eye.value.copy(camera.position);
   sun.getWorldPosition(source);sun.target.getWorldPosition(destination);uniforms.lightDirection.value.copy(destination).sub(source).normalize();uniforms.sunColor.value.copy(sun.color);uniforms.sunPower.value=sun.intensity/1.65;
   uniforms.night.value=life?.state.night||0;uniforms.sunShadowOn.value=sun.shadow.map?1:0;uniforms.tSunShadow.value=sun.shadow.map?.texture||blank;uniforms.sunShadowMatrix.value.copy(sun.shadow.matrix);
   lampLight.getWorldPosition(uniforms.lampPosition.value);lampLight.target.getWorldPosition(destination);uniforms.lampDirection.value.copy(destination).sub(uniforms.lampPosition.value).normalize();uniforms.lampPower.value=lampLight.intensity>0?1:0;
   quad.material=scatter;renderer.setRenderTarget(fogTarget);renderer.render(quadScene,quadCamera);
   quad.material=resolve;renderer.setRenderTarget(previous);renderer.render(quadScene,quadCamera);
   if(!enabled)renderer.render(scene,camera);
  }catch(error){enabled=false;renderer.setRenderTarget(previous);renderer.render(scene,camera);console.warn('Room atmosphere disabled; base scene remains available.',error);}
 }
 return {get enabled(){return enabled;},render,tick(dt,moving){if(moving)time+=dt;uniforms.time.value=time;},setQuality(value){small=!!value;uniforms.steps.value=small?10:18;width=0;},targets:{scene:sceneTarget,fog:fogTarget},materials:{scatter,resolve},uniforms,resolveUniforms};
};
