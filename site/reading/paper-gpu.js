(function(root){'use strict';
 // A short-lived GPU surface for the single moving sheet; reading remains DOM.
 function create(canvas,front,back,w,h){let gl;try{gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true});if(!gl||!gl.createShader)return null;
  const vertex=`attribute vec2 uv;uniform vec2 size;uniform vec2 axis;uniform float start;uniform float radius;uniform float progress;uniform vec2 jitter;uniform float shadow;varying vec2 tex;varying float angle;varying float lift;
  void main(){vec2 p=uv*size;float u=dot(p,axis)-start;float z=0.0;angle=0.0;float along=u;
   if(progress<0.00001){}else if(progress>0.99999){p.x=-p.x;angle=3.14159265;}
   else if(u>0.0){angle=min(3.14159265,u/max(radius,0.0001));if(angle<3.14159265){along=radius*sin(angle);z=radius*(1.0-cos(angle));}else{along=3.14159265*radius-u;z=2.0*radius;}p+=axis*(along-u);p+=vec2(.055,-.16)*z;}
   lift=z;if(shadow>.5)p+=vec2(.14,.25)*z+jitter;vec2 screen=vec2(p.x/size.x,(p.y+size.y*.2)/(size.y*1.2));gl_Position=vec4(screen.x,1.0-2.0*screen.y,shadow>.5?0.5:-z/size.y,1.0);tex=uv;
  }`;
  const fragment=`precision highp float;uniform sampler2D frontPage;uniform sampler2D backPage;uniform float shadow;uniform float strength;uniform float radius;varying vec2 tex;varying float angle;varying float lift;
  void main(){if(shadow>.5){float opacity=.045*strength*smoothstep(0.0,max(radius,1.0)*.8,lift);gl_FragColor=vec4(.19,.16,.115,opacity);return;}
   bool back=angle>1.5707963;vec4 paper=back?texture2D(backPage,vec2(1.0-tex.x,tex.y)):texture2D(frontPage,tex);float side=sin(angle);float darkness=.36*side*side*strength;
   paper.rgb=mix(paper.rgb,vec3(.267,.22,.149),darkness);float highlight=.026*exp(-pow((angle-.75)/.37,2.0))*strength;paper.rgb+=highlight;gl_FragColor=vec4(paper.rgb,paper.a);
  }`;
  const shaders=[];function compile(type,code){const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));shaders.push(s);return s;}
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  const cols=64,rows=Math.round(cols*h/w),uv=[],indices=[];for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)uv.push(x/cols,y/rows);for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const k=y*(cols+1)+x;indices.push(k,k+1,k+cols+2,k,k+cols+2,k+cols+1);}
  const vertices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(uv),gl.STATIC_DRAW);const at=gl.getAttribLocation(program,'uv');gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,2,gl.FLOAT,false,0,0);
  const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);const textures=[];
  [front,back].forEach((image,i)=>{const texture=gl.createTexture();textures.push(texture);gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);});
  const U={};['size','axis','start','radius','progress','jitter','shadow','strength','frontPage','backPage'].forEach(n=>U[n]=gl.getUniformLocation(program,n));gl.uniform1i(U.frontPage,0);gl.uniform1i(U.backPage,1);gl.uniform2f(U.size,w,h);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.clearColor(0,0,0,0);
  return {render(t){if(gl.isContextLost())return false;const s=PaperSurface.surface(w,h,t);gl.viewport(0,0,canvas.width,canvas.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform2f(U.axis,s.n.x,s.n.y);gl.uniform1f(U.start,s.a);gl.uniform1f(U.radius,s.r);gl.uniform1f(U.progress,t);gl.uniform1f(U.strength,Math.sin(Math.PI*t));
    gl.disable(gl.DEPTH_TEST);gl.uniform1f(U.shadow,1);const blur=2+s.r*.25;for(const [x,y] of [[0,0],[-1,0],[1,0],[0,-1],[0,1],[-.7,-.7],[.7,.7],[-.7,.7],[.7,-.7]]){gl.uniform2f(U.jitter,x*blur,y*blur);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);}
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.uniform1f(U.shadow,0);gl.uniform2f(U.jitter,0,0);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);return true;
   },dispose(){textures.forEach(x=>gl.deleteTexture(x));gl.deleteBuffer(vertices);gl.deleteBuffer(index);shaders.forEach(x=>gl.deleteShader(x));gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
 }catch{gl?.getExtension?.('WEBGL_lose_context')?.loseContext();return null;}}
 root.PaperGPU={create};
})(window);
