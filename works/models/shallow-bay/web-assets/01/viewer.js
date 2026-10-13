const canvas=document.getElementById('boat'),ctx=canvas.getContext('2d');
const label=document.getElementById('angle'),cargo=document.getElementById('cargo'),wire=document.getElementById('wire');
let az=-.82,el=.50,zoom=1,drag=null,width=800,height=480;
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>{let l=Math.hypot(...a);return a.map(x=>x/l)};
const light=unit([-.5,-.9,1.6]);
function shade(hex,k){let rgb=[1,3,5].map(i=>Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)*k)));return `rgb(${rgb.join(',')})`}
function draw(){
 const eye=[Math.cos(az)*Math.cos(el),Math.sin(az)*Math.cos(el),Math.sin(el)];
 const right=unit([-Math.sin(az),Math.cos(az),0]);const up=cross(eye,right);
 const focal=Math.min(width*.10,height*.195)*zoom,dist=15;
 const project=p=>{let q=sub(p,[0,0,.62]),d=dot(q,eye);let s=dist/(dist-d);return[width*.5+dot(q,right)*focal*s,height*.52-dot(q,up)*focal*s,d]};
 ctx.clearRect(0,0,width,height);
 // Quiet ground grid gives rotations a stable frame of reference.
 ctx.strokeStyle='#ccd8ce';ctx.lineWidth=.65;
 for(let i=-5;i<=5;i++){for(const ends of [[[i,-3,-.54],[i,3,-.54]],[[-5,i*.6,-.54],[5,i*.6,-.54]]]){let[a,b]=ends.map(project);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke()}}
 // Soft, planar shadow is illustrative, not a physical light simulation.
 for(let k=16;k>0;k--){ctx.fillStyle='rgba(48,76,63,.009)';ctx.beginPath();for(let i=0;i<=64;i++){let t=i*Math.PI/32,p=project([3.35*Math.cos(t)*(1+k*.01),1.07*Math.sin(t)*(1+k*.018),-.535]);i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])}ctx.fill()}
 // Per-pixel depth avoids the incorrect intersections produced by sorting whole faces.
 const rw=Math.round(width),rh=Math.round(height),buffer=new Float32Array(rw*rh);
 const surface=document.createElement('canvas');surface.width=rw;surface.height=rh;
 const sc=surface.getContext('2d'),img=sc.createImageData(rw,rh),pixels=img.data,edges=[];
 const tri=(a,b,c,rgb)=>{
  let area=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(area)<.001)return;
  const minx=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxx=Math.min(rw-1,Math.ceil(Math.max(a[0],b[0],c[0])));
  const miny=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxy=Math.min(rh-1,Math.ceil(Math.max(a[1],b[1],c[1])));
  for(let y=miny;y<=maxy;y++)for(let x=minx;x<=maxx;x++){
   let u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/area;
   let v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/area,w=1-u-v;
   if(u<-.0001||v<-.0001||w<-.0001)continue;
   let z=u/(dist-a[2])+v/(dist-b[2])+w/(dist-c[2]),i=y*rw+x;
   if(z>buffer[i]){buffer[i]=z;pixels.set([...rgb,255],i*4)}
  }
 };
 for(const o of window.BOAT_DATA){if(!cargo.checked&&o.name.startsWith('cargo '))continue;for(const ids of o.f){
  let vs=ids.map(i=>o.v[i]),n=unit(cross(sub(vs[1],vs[0]),sub(vs[2],vs[0]))),ps=vs.map(project);
  let k=.65+.35*Math.max(0,dot(n,light)),rgb=[1,3,5].map(i=>Math.min(255,Math.round(parseInt(o.color.slice(i,i+2),16)*k)));
  for(let i=1;i<ps.length-1;i++)tri(ps[0],ps[i],ps[i+1],rgb);
  if(wire.checked)for(let i=0;i<ps.length;i++)edges.push([ps[i],ps[(i+1)%ps.length]]);
 }}
 for(const [a,b] of edges){let count=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])));for(let j=0;j<=count;j++){
  let t=j/count,x=Math.round(a[0]+t*(b[0]-a[0])),y=Math.round(a[1]+t*(b[1]-a[1]));if(x<0||x>=rw||y<0||y>=rh)continue;
  let z=(1-t)/(dist-a[2])+t/(dist-b[2]),i=y*rw+x;if(z>=buffer[i]-.00015)pixels.set([31,54,53,255],i*4);
 }}
 sc.putImageData(img,0,0);ctx.drawImage(surface,0,0,width,height);
}
function resize(){let r=canvas.getBoundingClientRect();width=r.width;height=r.height;let d=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);ctx.setTransform(d,0,0,d,0,0);draw()}
function custom(){document.querySelectorAll('[data-view]').forEach(b=>b.classList.remove('active'));label.textContent='自由查看';draw()}
canvas.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus()});
canvas.addEventListener('pointermove',e=>{if(!drag)return;az-=(e.clientX-drag.x)*.009;el=Math.max(-.25,Math.min(1.48,el+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};custom()});
canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.6,Math.min(1.6,zoom*Math.exp(-e.deltaY*.001)));draw()},{passive:false});
canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')az-=.13;if(e.key==='ArrowRight')az+=.13;if(e.key==='ArrowUp')el=Math.min(1.48,el+.10);if(e.key==='ArrowDown')el=Math.max(-.25,el-.10);if(['+','='].includes(e.key))zoom=Math.min(1.6,zoom+.08);if(e.key==='-')zoom=Math.max(.6,zoom-.08);if(e.key==='Home'){az=-.82;el=.5;zoom=1}custom()});
const views={front:[-.82,.50],side:[-Math.PI/2,.10],top:[-Math.PI/2,1.48],stern:[-2.45,.50]};
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{[az,el]=views[b.dataset.view];zoom=1;document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));label.textContent=b.textContent;draw()}));
cargo.addEventListener('change',draw);wire.addEventListener('change',draw);
new ResizeObserver(resize).observe(canvas);resize();
