/* WebGL depth-limited, shadow-aware single-scattering approximation.
 * Low-resolution ray marching and bilateral composite; no external render library.
 * This is deliberately bounded to the room, not a full participating-media path tracer. */
window.createRoomAtmosphere=function({T,renderer,scene,camera,sun,lampLight,life,lightMode}){
 const capable=!!renderer.setRenderTarget&&!!renderer.getDrawingBufferSize&&(renderer.capabilities.isWebGL2||renderer.extensions?.has('WEBGL_depth_texture'));
 if(!capable)return {enabled:false,tick(){},setQuality(){},render:()=>renderer.render(scene,camera)};
 const float=renderer.capabilities.isWebGL2&&renderer.extensions?.has('EXT_color_buffer_float'),type=float?T.HalfFloatType:T.UnsignedByteType;
 const sceneTarget=new T.WebGLRenderTarget(1,1,{type,format:T.RGBAFormat,depthBuffer:true});
 sceneTarget.samples=renderer.capabilities.isWebGL2?(lightMode?2:4):0;
 sceneTarget.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);sceneTarget.depthTexture.minFilter=T.NearestFilter;sceneTarget.depthTexture.magFilter=T.NearestFilter;
 const fogTarget=new T.WebGLRenderTarget(1,1,{type,format:T.RGBAFormat,depthBuffer:false});
 const compositeTarget=new T.WebGLRenderTarget(1,1,{type:T.UnsignedByteType,format:T.RGBAFormat,depthBuffer:false});
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
   float density=shaft*.021+cone*.014;
   float alpha=1.0-exp(-density*stride);
   vec3 light=(sunColor*shaft*phaseHG(dot(-ray,lightDirection))*.58+vec3(1.0,.73,.39)*cone*.8)/max(.001,shaft+cone);
   sum+=transmission*light*alpha;transmission*=1.0-alpha;
  }
  gl_FragColor=vec4(sum,min(.16,1.0-transmission));
 }`;
 const scatter=new T.ShaderMaterial({uniforms,vertexShader:vertex,fragmentShader:fragment,depthTest:false,depthWrite:false,toneMapped:false});
 const resolveUniforms={tColor:{value:sceneTarget.texture},tFog:{value:fogTarget.texture},tDepth:{value:sceneTarget.depthTexture},fogTexel:{value:new T.Vector2(1,1)},sceneTexel:{value:new T.Vector2(1,1)},inkRadius:{value:1},inkStrength:{value:.90},cameraNear:{value:camera.near},cameraFar:{value:camera.far}};
 const resolve=new T.ShaderMaterial({uniforms:resolveUniforms,vertexShader:vertex,depthTest:false,depthWrite:false,toneMapped:false,fragmentShader:`
 varying vec2 vUv;uniform sampler2D tColor,tFog,tDepth;uniform vec2 fogTexel,sceneTexel;uniform float cameraNear,cameraFar,inkStrength,inkRadius;
 #include <packing>
 float viewDepth(vec2 uv){return -perspectiveDepthToViewZ(texture2D(tDepth,uv).x,cameraNear,cameraFar);}
 void main(){
  float d=viewDepth(vUv),weight=0.0;vec4 fog=vec4(0.0);
  for(int i=0;i<4;i++){vec2 off=vec2(i==0||i==2?-.5:.5,i<2?-.5:.5)*fogTexel;vec2 uv=clamp(vUv+off,0.0,1.0);float w=exp(-abs(viewDepth(uv)-d)*12.0)+.0001;fog+=texture2D(tFog,uv)*w;weight+=w;}
  fog/=weight;vec3 base=texture2D(tColor,vUv).rgb;
  // Depth-only outlines leave picture textures and book lettering untraced.
  float dl=viewDepth(clamp(vUv-vec2(sceneTexel.x*inkRadius,0.0),0.0,1.0));
  float dr=viewDepth(clamp(vUv+vec2(sceneTexel.x*inkRadius,0.0),0.0,1.0));
  float du=viewDepth(clamp(vUv+vec2(0.0,sceneTexel.y*inkRadius),0.0,1.0));
  float dd=viewDepth(clamp(vUv-vec2(0.0,sceneTexel.y*inkRadius),0.0,1.0));
  float silhouette=max(max(dl-d,dr-d),max(du-d,dd-d))/max(d,.5);
  // Only real depth jumps: do not outline small depth curvature on broad surfaces.
  float ink=smoothstep(.008,.035,silhouette)*smoothstep(.018,.035,max(max(dl-d,dr-d),max(du-d,dd-d)));
  ink*=1.0-step(cameraFar*.95,d);
  base=mix(base,base*vec3(.39,.36,.49),ink*inkStrength);
  gl_FragColor=vec4(base*(1.0-fog.a)+fog.rgb,1.0);
 }`});
 // Edge AA follows the finished depth outlines; flat areas exit unchanged.
 const antialiasUniforms={tDiffuse:{value:compositeTarget.texture},resolution:{value:new T.Vector2(1,1)}};
 const antialias=new T.ShaderMaterial({uniforms:antialiasUniforms,vertexShader:vertex,depthTest:false,depthWrite:false,toneMapped:true,fragmentShader:`
		precision highp float;

		uniform sampler2D tDiffuse;

		uniform vec2 resolution;

		varying vec2 vUv;

		// FXAA 3.11 implementation by NVIDIA, ported to WebGL by Agost Biro (biro@archilogic.com)
		//----------------------------------------------------------------------------------
		// File:        es3-kepler\FXAA\assets\shaders/FXAA_DefaultES.frag
		// SDK Version: v3.00
		// Email:       gameworks@nvidia.com
		// Site:        http://developer.nvidia.com/
		//
		// Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.
		//
		// Redistribution and use in source and binary forms, with or without
		// modification, are permitted provided that the following conditions
		// are met:
		//  * Redistributions of source code must retain the above copyright
		//    notice, this list of conditions and the following disclaimer.
		//  * Redistributions in binary form must reproduce the above copyright
		//    notice, this list of conditions and the following disclaimer in the
		//    documentation and/or other materials provided with the distribution.
		//  * Neither the name of NVIDIA CORPORATION nor the names of its
		//    contributors may be used to endorse or promote products derived
		//    from this software without specific prior written permission.
		//
		// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ''AS IS'' AND ANY
		// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
		// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
		// PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
		// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
		// EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
		// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
		// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
		// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
		// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
		// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
		//
		//----------------------------------------------------------------------------------
		#ifndef FXAA_DISCARD
			//
			// Only valid for PC OpenGL currently.
			// Probably will not work when FXAA_GREEN_AS_LUMA = 1.
			//
			// 1 = Use discard on pixels which don't need AA.
			//     For APIs which enable concurrent TEX+ROP from same surface.
			// 0 = Return unchanged color on pixels which don't need AA.
			//
			#define FXAA_DISCARD 0
		#endif
		/*--------------------------------------------------------------------------*/
		#define FxaaTexTop(t, p) texture2D(t, p, -100.0)
		#define FxaaTexOff(t, p, o, r) texture2D(t, p + (o * r), -100.0)
		/*--------------------------------------------------------------------------*/

		#define NUM_SAMPLES 5
		// assumes colors have premultipliedAlpha, so that the calculated color contrast is scaled by alpha
		float contrast( vec4 a, vec4 b ) {
			vec4 diff = abs( a - b );
			return max( max( max( diff.r, diff.g ), diff.b ), diff.a );
		}

		/*============================================================================

									FXAA3 QUALITY - PC

		============================================================================*/
		/*--------------------------------------------------------------------------*/
		vec4 FxaaPixelShader(
			vec2 posM,
			sampler2D tex,
			vec2 fxaaQualityRcpFrame,
			float fxaaQualityEdgeThreshold,
			float fxaaQualityinvEdgeThreshold
		) {
			vec4 rgbaM = FxaaTexTop(tex, posM);
			vec4 rgbaS = FxaaTexOff(tex, posM, vec2( 0.0, 1.0), fxaaQualityRcpFrame.xy);
			vec4 rgbaE = FxaaTexOff(tex, posM, vec2( 1.0, 0.0), fxaaQualityRcpFrame.xy);
			vec4 rgbaN = FxaaTexOff(tex, posM, vec2( 0.0,-1.0), fxaaQualityRcpFrame.xy);
			vec4 rgbaW = FxaaTexOff(tex, posM, vec2(-1.0, 0.0), fxaaQualityRcpFrame.xy);
			// . S .
			// W M E
			// . N .
			bool earlyExit = max( max( max(
					contrast( rgbaM, rgbaN ),
					contrast( rgbaM, rgbaS ) ),
					contrast( rgbaM, rgbaE ) ),
					contrast( rgbaM, rgbaW ) )
					< fxaaQualityEdgeThreshold;
			// . 0 .
			// 0 0 0
			// . 0 .

			#if (FXAA_DISCARD == 1)
				if(earlyExit) FxaaDiscard;
			#else
				if(earlyExit) return rgbaM;
			#endif
			float contrastN = contrast( rgbaM, rgbaN );
			float contrastS = contrast( rgbaM, rgbaS );
			float contrastE = contrast( rgbaM, rgbaE );
			float contrastW = contrast( rgbaM, rgbaW );

			float relativeVContrast = ( contrastN + contrastS ) - ( contrastE + contrastW );
			relativeVContrast *= fxaaQualityinvEdgeThreshold;

			bool horzSpan = relativeVContrast > 0.;
			// . 1 .
			// 0 0 0
			// . 1 .
			// 45 deg edge detection and corners of objects, aka V/H contrast is too similar
			if( abs( relativeVContrast ) < .3 ) {
				// locate the edge
				vec2 dirToEdge;
				dirToEdge.x = contrastE > contrastW ? 1. : -1.;
				dirToEdge.y = contrastS > contrastN ? 1. : -1.;
				// . 2 .      . 1 .
				// 1 0 2  ~=  0 0 1
				// . 1 .      . 0 .

				// tap 2 pixels and see which ones are "outside" the edge, to
				// determine if the edge is vertical or horizontal
				vec4 rgbaAlongH = FxaaTexOff(tex, posM, vec2( dirToEdge.x, -dirToEdge.y ), fxaaQualityRcpFrame.xy);
				float matchAlongH = contrast( rgbaM, rgbaAlongH );
				// . 1 .
				// 0 0 1
				// . 0 H

				vec4 rgbaAlongV = FxaaTexOff(tex, posM, vec2( -dirToEdge.x, dirToEdge.y ), fxaaQualityRcpFrame.xy);
				float matchAlongV = contrast( rgbaM, rgbaAlongV );
				// V 1 .
				// 0 0 1
				// . 0 .

				relativeVContrast = matchAlongV - matchAlongH;
				relativeVContrast *= fxaaQualityinvEdgeThreshold;
				if( abs( relativeVContrast ) < .3 ) { // 45 deg edge
					// 1 1 .
					// 0 0 1
					// . 0 1

					// do a simple blur
					return mix(
						rgbaM,
						(rgbaN + rgbaS + rgbaE + rgbaW) * .25,
						.4
					);
				}

				horzSpan = relativeVContrast > 0.;
			}

			if(!horzSpan) rgbaN = rgbaW;
			if(!horzSpan) rgbaS = rgbaE;
			// . 0 .      1
			// 1 0 1  ->  0
			// . 0 .      1

			bool pairN = contrast( rgbaM, rgbaN ) > contrast( rgbaM, rgbaS );
			if(!pairN) rgbaN = rgbaS;
			vec2 offNP;
			offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;
			offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;

			bool doneN = false;
			bool doneP = false;

			float nDist = 0.;
			float pDist = 0.;

			vec2 posN = posM;
			vec2 posP = posM;

			int iterationsUsed = 0;
			int iterationsUsedN = 0;
			int iterationsUsedP = 0;
			for( int i = 0; i < NUM_SAMPLES; i++ ) {
				iterationsUsed = i;

				float increment = float(i + 1);
				if(!doneN) {
					nDist += increment;
					posN = posM + offNP * nDist;
					vec4 rgbaEndN = FxaaTexTop(tex, posN.xy);
					doneN = contrast( rgbaEndN, rgbaM ) > contrast( rgbaEndN, rgbaN );
					iterationsUsedN = i;
				}

				if(!doneP) {
					pDist += increment;
					posP = posM - offNP * pDist;
					vec4 rgbaEndP = FxaaTexTop(tex, posP.xy);
					doneP = contrast( rgbaEndP, rgbaM ) > contrast( rgbaEndP, rgbaN );
					iterationsUsedP = i;
				}

				if(doneN || doneP) break;
			}

			if ( !doneP && !doneN ) return rgbaM; // failed to find end of edge

			float dist = min(
				doneN ? float( iterationsUsedN ) / float( NUM_SAMPLES - 1 ) : 1.,
				doneP ? float( iterationsUsedP ) / float( NUM_SAMPLES - 1 ) : 1.
			);

			// hacky way of reduces blurriness of mostly diagonal edges
			// but reduces AA quality
			dist = pow(dist, .5);

			dist = 1. - dist;

			return mix(
				rgbaM,
				rgbaN,
				dist * .5
			);
		}
		void main() {
			const float edgeDetectionQuality = .055;
			const float invEdgeDetectionQuality = 1. / edgeDetectionQuality;

			gl_FragColor = FxaaPixelShader(
				vUv,
				tDiffuse,
				resolution,
				edgeDetectionQuality, // [0,1] contrast needed, otherwise early discard
				invEdgeDetectionQuality
			);

		
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}
	`});
 let enabled=true,small=lightMode,width=0,height=0,time=0;
 if(renderer.debug){const priorError=renderer.debug.onShaderError;renderer.debug.onShaderError=(gl,program,vertexShader,fragmentShader)=>{
  const source=gl.getShaderSource(fragmentShader)||'';
  if(source.includes('sunShadowOn')||source.includes('uniform vec2 fogTexel')||source.includes('FxaaPixelShader')){enabled=false;console.warn('Room atmosphere shader was rejected; using the base room renderer.',gl.getProgramInfoLog(program));}
  else if(priorError)priorError(gl,program,vertexShader,fragmentShader);else console.error('Room shader error',gl.getProgramInfoLog(program));
 };}
 const size=new T.Vector2(),source=new T.Vector3(),destination=new T.Vector3();
 function resize(){
  renderer.getDrawingBufferSize(size);const w=Math.max(1,Math.floor(size.x)),h=Math.max(1,Math.floor(size.y));
  if(w===width&&h===height)return;width=w;height=h;sceneTarget.setSize(w,h);compositeTarget.setSize(w,h);antialiasUniforms.resolution.value.set(1/w,1/h);resolveUniforms.sceneTexel.value.set(1/w,1/h);resolveUniforms.inkRadius.value=Math.max(1,(renderer.getPixelRatio?.()||1)*1.10);
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
   quad.material=resolve;renderer.setRenderTarget(compositeTarget);renderer.render(quadScene,quadCamera);
   quad.material=antialias;renderer.setRenderTarget(previous);renderer.render(quadScene,quadCamera);
   if(!enabled)renderer.render(scene,camera);
  }catch(error){enabled=false;renderer.setRenderTarget(previous);renderer.render(scene,camera);console.warn('Room atmosphere disabled; base scene remains available.',error);}
 }
 return {get enabled(){return enabled;},render,tick(dt,moving){if(moving)time+=dt;uniforms.time.value=time;},setQuality(value){small=!!value;uniforms.steps.value=small?10:18;const samples=renderer.capabilities.isWebGL2?(small?2:4):0;if(sceneTarget.samples!==samples){sceneTarget.samples=samples;sceneTarget.dispose();}width=0;},targets:{scene:sceneTarget,fog:fogTarget,composite:compositeTarget},materials:{scatter,resolve,antialias},uniforms,resolveUniforms,antialiasUniforms};
};
