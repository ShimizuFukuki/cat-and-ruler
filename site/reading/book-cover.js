(function(root){'use strict';
 function point(x,y,w,h,p){const angle=Math.PI*Math.max(0,Math.min(1,p)),lift=Math.sin(angle),z=x*lift,projection=1/(1-z/(w*5.5));return {x:x*Math.cos(angle)*projection,y:(y-h*.5)*projection+h*.5,z};}
 function triangle(c,image,s,d){const [a,b,k]=s,[u,v,q]=d,det=(b.x-a.x)*(k.y-a.y)-(k.x-a.x)*(b.y-a.y);if(Math.abs(det)<1e-9)return;const A=((v.x-u.x)*(k.y-a.y)-(q.x-u.x)*(b.y-a.y))/det,B=((v.y-u.y)*(k.y-a.y)-(q.y-u.y)*(b.y-a.y))/det,C=((q.x-u.x)*(b.x-a.x)-(v.x-u.x)*(k.x-a.x))/det,D=((q.y-u.y)*(b.x-a.x)-(v.y-u.y)*(k.x-a.x))/det;c.save();c.beginPath();c.moveTo(u.x,u.y);c.lineTo(v.x,v.y);c.lineTo(q.x,q.y);c.closePath();c.clip();c.transform(A,B,C,D,u.x-A*a.x-C*a.y,u.y-B*a.x-D*a.y);c.drawImage(image,0,0);c.restore();}
 function render(c,front,back,w,h,p){const inside=p>=.5,image=inside?back:front;if(!image)return;const corners=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>point(x,y,w,h,p));
  c.save();c.beginPath();corners.forEach((v,i)=>i?c.lineTo(v.x+5*Math.sin(Math.PI*p),v.y+8*Math.sin(Math.PI*p)):c.moveTo(v.x,v.y));c.closePath();c.shadowColor='#26352b55';c.shadowBlur=6+22*Math.sin(Math.PI*p);c.shadowOffsetY=8;c.fillStyle='#26352b35';c.fill();c.restore();
  if(Math.abs(Math.cos(Math.PI*p))<.018){c.strokeStyle='#536257';c.lineWidth=2;c.beginPath();c.moveTo(0,corners[1].y);c.lineTo(0,corners[2].y);c.stroke();return;}
  const cols=16,rows=5;for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const xy=[[i/cols,j/rows],[(i+1)/cols,j/rows],[(i+1)/cols,(j+1)/rows],[i/cols,(j+1)/rows]],d=xy.map(([x,y])=>point(x*w,y*h,w,h,p)),s=xy.map(([x,y])=>({x:(inside?1-x:x)*image.width,y:y*image.height}));triangle(c,image,[s[0],s[1],s[2]],[d[0],d[1],d[2]]);triangle(c,image,[s[0],s[2],s[3]],[d[0],d[2],d[3]]);}
  c.save();c.beginPath();corners.forEach((v,i)=>i?c.lineTo(v.x,v.y):c.moveTo(v.x,v.y));c.closePath();const g=c.createLinearGradient(0,0,corners[1].x||1,0);g.addColorStop(0,'#172a2420');g.addColorStop(.35,'#fff5cb0c');g.addColorStop(1,'#172a24'+Math.round(38*Math.sin(Math.PI*p)).toString(16).padStart(2,'0'));c.fillStyle=g;c.fill();c.strokeStyle='#d2c39b40';c.lineWidth=.8;c.stroke();c.restore();
 }
 // A single projected plane. No nested perspective or backface stacking.
 function cssFrame(w,p){const a=Math.PI*Math.max(0,Math.min(1,p)),m=[Math.cos(a),0,0,-Math.sin(a)/(w*5.5),0,1,0,0,0,0,1,0,0,0,0,1];return {matrix:m,transform:'matrix3d('+m.join(',')+')',inside:p>=.5};}
 const api={point,render,cssFrame};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BookCover=api;
})(typeof window!=='undefined'?window:globalThis);
