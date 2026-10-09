(() => {
  'use strict';
  const canvas=document.getElementById('atelier-light'),root=document.documentElement;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),A=window.HerArchive,works=window.herEdition.works;
  const images=[document.getElementById('ambient-a'),document.getElementById('ambient-b')];
  let travel=Number(document.getElementById('book-position').value)/15||0,mouse=[.5,.5],smoothMouse=[.5,.5];
  let raf=0,lastFrame=-1000,slot=0,currentArt=-1,loadVersion=0,gl=null,program=null,uniforms=null,failed=false;
  const vertex=`attribute vec2 a_position;varying vec2 uv;void main(){uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;
  const fragment=`precision mediump float;
  varying vec2 uv;uniform float u_time;uniform float u_turn;uniform vec2 u_mouse;uniform float u_aspect;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
  void main(){
    vec2 p=uv;float t=u_time*.055;
    vec2 drift=vec2(t*.21,-t*.16)+vec2(u_turn*.4,0.);
    float cloud=noise(p*3.2+drift)*.66+noise(p*7.5-drift*.7)*.34;
    float diagonal=p.x*.88+p.y*.46+cloud*.08+sin(t*.3)*.025;
    float bands=pow(max(0.,sin(diagonal*16.-t*.08)),18.);
    float edge=1.-smoothstep(.1,.49,abs(p.y-.5));
    float reflection=exp(-pow((p.y-.10-cloud*.035)*11.,2.))*exp(-pow((p.x-.52-u_mouse.x*.04)*1.5,2.));
    vec2 d=(p-u_mouse)*vec2(u_aspect,1.);float lamplight=exp(-dot(d,d)*5.5);
    float veil=bands*.035*cloud+reflection*.07+lamplight*.025;
    float dust=step(.998,hash(floor((p+vec2(t*.001,t*.002))*vec2(730.,420.))))*.025;
    vec3 warm=vec3(.84,.64,.32),cool=vec3(.33,.59,.48);
    vec3 color=mix(cool,warm,clamp(reflection+lamplight,0.,1.));
    gl_FragColor=vec4(color,clamp(veil+dust,0.,.19));
  }`;
  function staticFallback(){failed=true;canvas.hidden=true;root.dataset.light='static';if(raf)cancelAnimationFrame(raf);raf=0;}
  function init(){
    try{
      gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,powerPreference:'low-power'});
      if(!gl){staticFallback();return;}
      const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('shader unavailable')}return s;};
      const v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);
      program=gl.createProgram();gl.attachShader(program,v);gl.attachShader(program,f);gl.linkProgram(program);
      gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('program unavailable');
      gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const a=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
      uniforms=Object.fromEntries(['time','turn','mouse','aspect'].map(n=>[n,gl.getUniformLocation(program,'u_'+n)]));
      root.dataset.light='webgl';resize();
    }catch{staticFallback();}
  }
  function resize(){
    if(failed||!gl)return;
    const ratio=Math.min(1,devicePixelRatio||1)*.75;
    canvas.width=Math.max(1,Math.round(innerWidth*ratio));canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    gl.viewport(0,0,canvas.width,canvas.height);wake();
  }
  function blocked(){return document.hidden||Boolean(document.querySelector('dialog[open]'));}
  function draw(now){
    raf=0;if(failed||blocked())return;
    if(now-lastFrame>=32||reduced.matches){
      lastFrame=now;smoothMouse=smoothMouse.map((n,i)=>n+(mouse[i]-n)*.065);
      gl.uniform1f(uniforms.time,reduced.matches?0:now/1000);gl.uniform1f(uniforms.turn,travel);
      gl.uniform2f(uniforms.mouse,smoothMouse[0],smoothMouse[1]);gl.uniform1f(uniforms.aspect,canvas.width/canvas.height);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    if(!reduced.matches)raf=requestAnimationFrame(draw);
  }
  function wake(){if(!raf&&!failed&&!blocked())raf=requestAnimationFrame(draw);}
  function backdrop(value){
    const p=Math.round(value*15);const map=[10,1,2,2,2,8,1,3,6,6,5,0,2,2,10,10],id=map[p]??10;
    if(id===currentArt)return;currentArt=id;const version=++loadVersion,next=1-slot,w=works[id];
    const image=images[next];image.onload=()=>{if(version!==loadVersion)return;images[slot].classList.remove('visible');image.classList.add('visible');slot=next;};
    image.onerror=()=>{image.classList.remove('visible')};image.src=A.asset(w.image||w.file);
  }
  window.BookAtmosphere={setPosition(value){travel=Math.max(0,Math.min(1,value));backdrop(travel);wake();}};
  addEventListener('pointermove',event=>{
    if(event.pointerType==='touch'||reduced.matches||blocked())return;
    mouse=[event.clientX/Math.max(1,innerWidth),1-event.clientY/Math.max(1,innerHeight)];
    root.style.setProperty('--light-x',(mouse[0]*100).toFixed(2)+'%');root.style.setProperty('--light-y',((1-mouse[1])*100).toFixed(2)+'%');
    wake();
  },{passive:true});
  function visibility(){if(blocked()){if(raf)cancelAnimationFrame(raf);raf=0;}else wake();}
  document.addEventListener('visibilitychange',visibility);
  new MutationObserver(visibility).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
  reduced.addEventListener('change',()=>{if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=-1000;mouse=smoothMouse=[.5,.5];wake();});
  addEventListener('resize',resize);addEventListener('pagehide',()=>{if(raf)cancelAnimationFrame(raf);raf=0;});
  addEventListener('pageshow',visibility);
  canvas.addEventListener('webglcontextlost',staticFallback);
  backdrop(travel);init();
})();
