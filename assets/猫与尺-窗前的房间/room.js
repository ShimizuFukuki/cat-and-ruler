/* An independently modelled room. Archive text is data, never executable instructions. */
(()=>{
'use strict';
const T=window.THREE,$=s=>document.querySelector(s),base=new URL('.',document.currentScript.src);
const mobile=matchMedia('(max-width:760px)').matches;let lightMode=mobile||!!navigator.connection?.saveData;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try{renderer=new T.WebGLRenderer({canvas:$('#scene'),antialias:true,alpha:false,powerPreference:'default'});}catch(e){$('#loading').hidden=true;$('#error').hidden=false;$('#error').textContent='这个浏览器暂时无法绘制三维房间。请在支持 WebGL 的浏览器中打开。';return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,lightMode?1.15:1.65));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#aaa89c');scene.fog=new T.FogExp2('#cbc5b4',.005);
const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.06,80);const target=new T.Vector3();
const root=new T.Group();scene.add(root);const clickable=[],moving=[],dusts=[];let mode='arrival',selectedDrawer=null,started=false,motion=!reduced,dragging=false,lastFrame=0;
let seed=8371,soundTouched=false;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t;}
function texture(kind,color){const res=mobile?256:512;return canvasTexture(res,res,(c,w,h)=>{c.fillStyle=color;c.fillRect(0,0,w,h);for(let i=0;i<2400;i++){const a=.006+rand()*.018;c.fillStyle=rand()>.5?'rgba(255,244,208,'+a+')':'rgba(26,39,31,'+a+')';const x=rand()*w,y=rand()*h;c.fillRect(x,y,kind==='wood'?1+rand()*70:1+rand()*3,kind==='wood'?.5:1+rand()*2);}if(kind==='wood'){for(let i=0;i<38;i++){const y=rand()*h;c.strokeStyle='rgba(26,28,21,'+(.018+rand()*.035)+')';c.lineWidth=.4+rand();c.beginPath();c.moveTo(0,y);for(let x=0;x<=w;x+=16)c.lineTo(x,y+Math.sin(x/90+i)*2.5+Math.sin(x/35)*.6);c.stroke();}for(let i=0;i<7;i++){let x=rand()*w,y=rand()*h;c.strokeStyle='#5e4a3833';for(let j=0;j<3;j++){c.beginPath();c.ellipse(x,y,10+j*8,2+j*3,0,0,Math.PI*2);c.stroke();}}}if(kind==='fabric'){for(let x=0;x<w;x+=3){c.strokeStyle='#d5d0b00f';c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let y=0;y<h;y+=4){c.fillStyle='#30293615';c.fillRect(0,y,w,.8);}}});}
const surfaces=window.createRoomMaterials(T,renderer);
function mat(color,kind='wood',extra={}){if(['wood','floor','paint','plaster','ceiling'].includes(kind))return Object.assign(surfaces.surface(kind,color),extra);const map=texture(kind,color);return new T.MeshStandardMaterial(Object.assign({color:0xffffff,map,bumpMap:map,bumpScale:kind==='fabric'?.0015:kind==='plaster'?.0003:.001,roughness:kind==='wood'?.86:kind==='fabric'?1:.94,metalness:0},extra));}
const M={wall:mat('#c5c3b8','plaster'),wallSide:mat('#c5c3b8','plaster'),wood:mat('#967049'),woodLight:mat('#b28b60'),woodDark:mat('#654934'),edge:mat('#bda17c'),green:mat('#627465','paint'),greenDark:mat('#47584d','paint'),metal:new T.MeshStandardMaterial({color:'#485448',roughness:.49,metalness:.45}),brass:new T.MeshStandardMaterial({color:'#afa075',roughness:.6,metalness:.44}),paper:mat('#eee7ce','paper'),blue:mat('#506c7b','fabric'),rug:mat('#8a7b95','fabric'),cloth:mat('#ccb66b','fabric'),red:mat('#733f3b','fabric'),ivory:mat('#e6dfc9','fabric'),black:mat('#34393b','paper')};
M.green.roughness=.92;M.woodLight.roughness=.88;M.wood.roughness=.90;
const boxGeo=new T.BoxGeometry(1,1,1);
function box(w,h,d,m,x=0,y=0,z=0,parent=root,edges=false){const geometry=surfaces.geometry(w,h,d,m,x,y,z)||boxGeo;const o=new T.Mesh(geometry,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);if(edges&&!geometry.userData.surface){const e=new T.LineSegments(new T.EdgesGeometry(boxGeo),new T.LineBasicMaterial({color:'#303b31',transparent:true,opacity:.24}));o.add(e);}return o;}
function group(x=0,y=0,z=0,parent=root){const g=new T.Group();g.position.set(x,y,z);parent.add(g);return g;}
function sphere(r,m,x,y,z,parent=root,scale=[1,1,1]){const o=new T.Mesh(new T.SphereGeometry(r,18,12),m);o.position.set(x,y,z);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cyl(rt,rb,h,m,x,y,z,parent=root,n=20){const o=new T.Mesh(new T.CylinderGeometry(rt,rb,h,n),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function rod(a,b,r,m,parent=root){const av=new T.Vector3(...a),bv=new T.Vector3(...b),v=bv.clone().sub(av);const o=cyl(r,r,v.length(),m,...av.clone().add(bv).multiplyScalar(.5).toArray(),parent,10);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function curve(points,r,m,parent=root){const path=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const o=new T.Mesh(new T.TubeGeometry(path,26,r,6,false),m);parent.add(o);return o;}
function label(text,w,h,color='#e7ddbd',bg=null,size=64){const tex=canvasTexture(512,256,(c)=>{if(bg){c.fillStyle=bg;c.fillRect(0,0,512,256);}c.fillStyle=color;c.font=size+'px Georgia, SimSun, serif';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,128,470);});const m=new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide,depthWrite:false});const mesh=new T.Mesh(new T.PlaneGeometry(w,h),m);return mesh;}
function placeLabel(text,w,h,x,y,z,parent=root,color,bg,size){const o=label(text,w,h,color,bg,size);o.position.set(x,y,z);parent.add(o);return o;}
function interactive(obj,action){obj.userData.action=action;clickable.push(obj);return obj;}
function frame(w,h,d,x,y,z,parent=root,m=M.green){box(w+.13,.09,d,m,x,y+h/2,z,parent);box(w+.13,.09,d,m,x,y-h/2,z,parent);box(.09,h,d,m,x-w/2,y,z,parent);box(.09,h,d,m,x+w/2,y,z,parent);}
function shadow(w,h,opacity,x,y,z,parent=root){const tex=canvasTexture(128,128,c=>{const g=c.createRadialGradient(64,64,4,64,64,64);g.addColorStop(0,'rgba(20,25,18,'+opacity+')');g.addColorStop(1,'rgba(20,25,18,0)');c.fillStyle=g;c.fillRect(0,0,128,128);});const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));o.rotation.x=-Math.PI/2;o.position.set(x,y,z);parent.add(o);return o;}
// Four continuous wall sections surround each real opening. No image lies on a solid wall.
const architecture=group();architecture.userData.structure=true;architecture.name='architecture';
const wallParts=[];function wall(w,h,d,m,x,y,z){const o=box(w,h,d,m,x,y,z,architecture);wallParts.push(o);return o;}
box(7.4,.22,6.5,M.woodDark,0,-.13,.55);
const floor=box(7.38,.035,6.44,mat('#e3d0b3','floor'),0,.003,.57);floor.name='oak-plank-floor';
// North opening: x [-2.57, 1.77], y [1.60, 3.68]. All walls end at y=4.12.
wall(7.5,1.6,.20,M.wall,0,.8,-2.70);
wall(7.5,.44,.20,M.wall,0,3.90,-2.70);
wall(1.18,2.08,.20,M.wall,-3.16,2.64,-2.70);
wall(1.98,2.08,.20,M.wall,2.76,2.64,-2.70);
// West opening: z [-1.85, -.27], y [1.645, 3.615].
wall(.20,1.645,6.35,M.wallSide,-3.66,.8225,.425);
wall(.20,.505,6.35,M.wallSide,-3.66,3.8675,.425);
wall(.20,1.97,.90,M.wallSide,-3.66,2.63,-2.30);
wall(.20,1.97,3.87,M.wallSide,-3.66,2.63,1.665);
wall(.20,4.12,6.35,M.wall,3.66,2.06,.425);
const ceiling=wall(7.52,.16,6.52,mat('#d9d7cb','ceiling'),0,4.20,.46);
// Thin plaster coving makes the corners read as one room, not three cutout cards.
box(7.26,.055,.07,M.wall,0,4.082,-2.565,architecture);
for(const x of [-3.525,3.525])box(.07,.055,6.18,M.wall,x,4.082,.49,architecture);
box(7.3,.14,.12,M.greenDark,0,.1,-2.57);box(.12,.14,6.4,M.greenDark,-3.54,.1,.48);box(.12,.14,6.4,M.greenDark,3.54,.1,.48);
const assetPromises=[...surfaces.ready];
function windowTexture(direction,aspect){let done;assetPromises.push(new Promise(resolve=>{done=resolve;}));const t=new T.TextureLoader().load(window.ROOM_WINDOW_VIEWS?.[direction]||window.ROOM_LANDSCAPE,tex=>{const ratio=tex.image.width/tex.image.height;if(ratio>aspect){tex.repeat.x=aspect/ratio;tex.offset.x=(1-tex.repeat.x)/2;}else{tex.repeat.y=ratio/aspect;tex.offset.y=(1-tex.repeat.y)/2;}tex.needsUpdate=true;done();},undefined,()=>done());t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
const landscape=windowTexture('north',4.50/2.22),sideLandscape=windowTexture('west',1.70/2.10);
const outside=new T.Mesh(new T.PlaneGeometry(4.50,2.22),new T.MeshBasicMaterial({map:landscape,color:'#f0f0e5',toneMapped:false}));outside.position.set(-.4,2.64,-2.83);root.add(outside);
const win=group(-.4,2.64,-2.55);frame(4.34,2.08,.23,0,0,-.04,win,M.green);
box(.065,2.04,.12,M.green,0,0,.025,win);box(4.34,.045,.10,M.green,0,-.48,.065,win);
box(4.55,.11,.38,M.woodLight,0,-1.1,.055,win);box(4.55,.065,.18,M.edge,0,1.1,0,win);
for(const x of [-2.02,.07]){box(.018,.32,.038,M.brass,x,-.15,.12,win);box(.052,.017,.055,M.brass,x,-.31,.1,win);}
for(let i=0;i<12;i++){const slat=box(4.52,.022,.105,M.woodDark,0,1.08-i*.025,.10,win);slat.rotation.x=-.20;}
for(const x of [-1.74,1.63]){rod([x,1.12,.15],[x,.78,.15],.005,M.black,win);rod([x,1.12,.15],[x,-.3,.15],.003,M.woodLight,win);}
const sideWin=group(-3.54,2.63,-1.06);sideWin.rotation.y=Math.PI/2;
const sideView=new T.Mesh(new T.PlaneGeometry(1.70,2.10),new T.MeshBasicMaterial({map:sideLandscape,color:'#e9eee2',toneMapped:false}));sideView.position.z=-.255;sideWin.add(sideView);
frame(1.58,1.97,.25,0,0,-.08,sideWin);
box(.045,1.96,.10,M.green,.10,0,.075,sideWin);box(1.78,.08,.28,M.woodLight,0,-1.05,.035,sideWin);
for(let i=0;i<12;i++){const slat=box(1.73,.022,.105,M.woodDark,0,1.04-i*.025,.1,sideWin);slat.rotation.x=-.20;}

// Desk, with tapered legs, inset drawer fronts, lower rails and real moving boxes.
const desk=group(-.12,0,-1.55);box(3.02,.115,1.04,M.woodLight,0,1.25,0,desk,true);box(2.98,.065,1.03,M.wood,0,1.18,0,desk);box(2.83,.22,.10,M.wood,0,1.06,-.39,desk);const leftLegs=[box(.10,1.1195,.1,M.wood,-1.35,.58775,.38,desk),box(.10,1.127,.1,M.wood,-1.35,.584,-.4,desk)];box(.07,.1,.86,M.woodDark,-1.35,.24,0,desk);box(1.85,.07,.07,M.woodDark,-.43,.26,-.39,desk);
const drawerBank=group(.92,.0385,.025,desk);for(const x of [-.34,.34])for(const z of [-.32,.32])box(.075,z<0?.088:.0805,.075,M.woodDark,x,z<0?.026:.02975,z,drawerBank);box(.87,1.1,.83,M.woodDark,0,.62,0,drawerBank);for(let i=0;i<3;i++){const dg=group(0,.98-i*.30,.06,drawerBank);box(.79,.245,.035,M.wood,0,0,.40,dg,true);box(.70,.025,.72,M.woodLight,0,-.10,0,dg);box(.026,.19,.72,M.wood,-.35,-.014,0,dg);box(.026,.19,.72,M.wood,.35,-.014,0,dg);box(.70,.19,.024,M.wood,0,-.014,-.36,dg);rod([-.16,.0,.43],[.16,.0,.43],.012,M.brass,dg);interactive(dg,()=>go('desk'));}
// Four physically joined accordion panels, lying open on the desk.
const book=group(-.30,1.3043,.18,desk);book.rotation.y=-.08;
const foldPanels=[],panelWidth=.265,panelDepth=.60,foldRise=.030;
const pageTex=canvasTexture(512,1024,(c,w,h)=>{
 c.fillStyle='#50604b';c.fillRect(0,0,w,h);c.strokeStyle='#a5af8b';c.lineWidth=1;c.strokeRect(18,18,w-36,h-36);
 c.fillStyle='#e7e6bc';c.font='italic 28px Georgia';c.fillText('Ambrose / Judas',42,86);
 c.font='150px SimSun, serif';c.fillText('猫',44,310);c.fillText('尺',270,490);c.font='44px SimSun, serif';c.fillText('与',221,375);
 c.fillStyle='#91a384';c.beginPath();c.ellipse(260,625,112,53,0,0,Math.PI*2);c.fill();c.beginPath();c.arc(158,645,43,0,Math.PI*2);c.fill();c.beginPath();c.moveTo(127,617);c.lineTo(128,584);c.lineTo(150,614);c.moveTo(170,613);c.lineTo(194,588);c.lineTo(193,639);c.fill();c.strokeStyle='#91a384';c.lineWidth=14;c.beginPath();c.moveTo(355,641);c.quadraticCurveTo(390,683,420,681);c.stroke();
 c.fillStyle='#c5b788';c.fillRect(91,689,340,14);c.fillStyle='#e7e6bc';c.font='24px SimSun, serif';['他慢慢抽走尺子。','尾巴落到桌上。','猫没有醒。'].forEach((line,i)=>c.fillText(line,45,800+i*51));
});
const innerTex=canvasTexture(512,1024,(c,w,h)=>{c.fillStyle='#ebe5cf';c.fillRect(0,0,w,h);c.fillStyle='#52604e';c.font='58px SimSun, serif';c.fillText('窗边',48,155);c.strokeStyle='#b9b19a';c.beginPath();c.moveTo(45,195);c.lineTo(465,195);c.stroke();c.font='20px Georgia';c.fillText('Ambrose / Judas',45,890);for(let i=0;i<6;i++)c.fillRect(48,720+i*20,310-i%3*36,1);});
const diaryPageTextures=['Ambrose','Judas'].map((name,i)=>canvasTexture(512,1024,(c,w,h)=>{
 c.fillStyle=i?'#d6d5bd':'#ebe5cf';c.fillRect(0,0,w,h);c.fillStyle='#52604e';c.font='20px SimSun, serif';c.fillText('日记',44,66);c.font='italic 78px Georgia';c.fillText(name,40,247,432);
 c.globalAlpha=.10;c.font='460px Georgia';c.fillText(i?'J':'A',210,680);c.globalAlpha=1;c.fillStyle='#656b58';c.font='27px SimSun, serif';const lines=i?['我顾着把东西放好，','竟然没把地址交过去。','他还在那边等。']:['你在这局进行的时候告诉我，','我叫 Ambrose。','我把名字记了下来。'];lines.forEach((line,j)=>c.fillText(line,45,620+j*56,425));c.fillRect(44,825,424,1);c.font='23px SimSun, serif';c.fillText('读日记  ↗',45,870);
}));
for(let i=0;i<4;i++){
 const low=i%2===0,geo=new T.BufferGeometry(),x0=-panelWidth*2+i*panelWidth,x1=x0+panelWidth,y0=low?.005:foldRise,y1=low?foldRise:.005;
 geo.setAttribute('position',new T.Float32BufferAttribute([x0,y0,-panelDepth/2,x0,y0,panelDepth/2,x1,y1,panelDepth/2,x1,y1,-panelDepth/2],3));
 geo.setAttribute('uv',new T.Float32BufferAttribute([0,1,0,0,1,0,1,1],2));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();
 const panel=new T.Mesh(geo,new T.MeshStandardMaterial({map:i===0?pageTex:i===1?innerTex:diaryPageTextures[i-2],roughness:1,side:T.DoubleSide}));panel.castShadow=true;panel.receiveShadow=true;book.add(panel);foldPanels.push(panel);
 rod([x0,y0,-panelDepth/2],[x0,y0,panelDepth/2],.0018,i===0?M.green:M.edge,book);
}
interactive(book,()=>window.RoomHost?window.RoomHost.send('return-book'):location.assign(new URL('../../index.html',base).href));

// One articulated lamp head: shell, recess, diffuser and light share its transform.
const lamp=group(-.83,1.326,-.335,desk);
const lampBase=cyl(.125,.14,.035,M.metal,0,0,0,lamp);lampBase.userData.structure=true;
rod([0,.02,0],[.06,.52,0],.022,M.metal,lamp);rod([.06,.52,0],[.61,.71,.04],.022,M.metal,lamp);
rod([.015,.05,.03],[.09,.50,.03],.007,M.brass,lamp);for(const p of [[0,.02,0],[.06,.52,0],[.61,.71,.04]])sphere(.036,M.metal,...p,lamp);
const lampHead=group(.62,.72,.04,lamp);lampHead.rotation.z=.10;lampHead.userData.structure=true;
const head=box(.77,.055,.16,M.metal,0,0,0,lampHead);head.userData.structure=true;
box(.718,.007,.125,M.black,0,-.030,0,lampHead);
const bulb=new T.MeshStandardMaterial({color:'#fff0d0',emissive:'#ffe3ad',emissiveIntensity:1.35,roughness:.5});
const diffuser=box(.684,.003,.093,bulb,0,-.034,0,lampHead);diffuser.castShadow=false;diffuser.userData.structure=true;
const lampLight=new T.SpotLight('#ffe1b1',2.8,3.6,Math.PI*.34,.8,1.6);lampLight.position.set(0,-.042,0);lampHead.add(lampLight);
const lampAim=group(.10,-.78,.12,lampHead);lampLight.target=lampAim;
lampLight.castShadow=!lightMode;lampLight.shadow.mapSize.set(512,512);lampLight.shadow.bias=-.0003;lampLight.shadow.normalBias=.006;lampLight.shadow.radius=4;

// Wall notes: small, unforced traces of a lived-in desk.
const noteColors=['#d4d9b7','#cfb0b8','#daca8a','#b0ccd0'];for(let i=0;i<6;i++){const x=-.89+(i%3)*.4,y=1.58+Math.floor(i/3)*.26;const g=group(x,y,-2.57);g.rotation.z=(rand()-.5)*.2;const nm=mat(noteColors[i%4],'paper');box(.20,.19,.005,nm,0,0,0,g);for(let j=0;j<3;j++)box(.12-rand()*.04,.003,.001,M.greenDark,0,.035-j*.026,.005,g);box(.08,.025,.002,M.ivory,0,.091,.004,g);}
// Tissue box and its paper, pencil cup, sharpener, tape dispenser and desk ruler.
const tissues=group(-1.24,1.378,.19,desk);box(.38,.14,.26,mat('#c1b07c','paper'),0,0,0,tissues);box(.25,.004,.034,M.black,0,.073,0,tissues);const tissueGeo=new T.PlaneGeometry(.20,.23,10,10);for(let i=0;i<tissueGeo.attributes.position.count;i++){const p=tissueGeo.attributes.position,x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin(x*33+y*10)*.014);p.setX(i,x*(.72+(y+.115)*1.2));}tissueGeo.computeVertexNormals();const tissue=new T.Mesh(tissueGeo,new T.MeshStandardMaterial({color:'#f1eedc',roughness:1,side:T.DoubleSide}));tissue.position.set(.015,.18,0);tissue.rotation.z=-.12;tissue.castShadow=true;tissues.add(tissue);
// The writing area stays clear: no duplicate notebook, pen cup or unrecognisable blue blocks.

// Small hinged walnut music box, on the clear right-hand side of the desk.
const musicBox=group(.87,1.3920,-.10,desk);musicBox.userData.structure=true;
const musicWood=mat('#695141'),musicInner=mat('#b6a77d');
roundedBox(.48,.16,.32,.018,musicWood,musicBox);
box(.42,.015,.27,musicInner,0,.084,0,musicBox);
const musicLid=group(0,.089,-.16,musicBox);musicLid.userData.dynamic=true;
roundedBox(.48,.024,.32,.008,musicWood,musicLid,0,0,.16);
const cylinderFrame=group(-.045,.125,0,musicBox);cylinderFrame.rotation.z=Math.PI/2;
const musicCylinder=group(0,0,0,cylinderFrame);musicCylinder.userData.dynamic=true;
cyl(.049,.049,.235,M.brass,0,0,0,musicCylinder,24);
for(let i=0;i<24;i++){const angle=i*2.4;box(.009,.011,.009,M.brass,Math.cos(angle)*.049,(i%8-3.5)*.027,Math.sin(angle)*.049,musicCylinder);}
for(let i=0;i<13;i++)box(.012,.007,.069,M.metal,-.185+i*.022,.124,.080,musicBox);
for(const x of [-.18,.10])box(.015,.076,.08,M.brass,x,.12,0,musicBox);
const musicCrank=group(.24,0,0,musicBox);musicCrank.userData.dynamic=true;rod([0,0,0],[.045,0,0],.012,M.brass,musicCrank);rod([.045,0,0],[.045,.068,0],.009,M.brass,musicCrank);cyl(.018,.018,.054,M.woodDark,.074,.068,0,musicCrank).rotation.z=Math.PI/2;
const musicMark=placeLabel('音 乐',.19,.067,0,-.006,.166,musicBox,'#decda1',null,60);
interactive(musicBox,()=>go('music'));
let musicStatus={index:0,playing:false,title:'房间里有一把椅子'};

// Stool with a cloth-covered seat and curved support stretchers.

const chair=group(-.35,-.02914,-.55);const seat=box(.60,.105,.58,M.blue,0,.72,0,chair);for(const x of [-.23,.23])for(const z of [-.21,.21]){rod([x,.70,z],[x*1.14,.06,z*1.14],.043,M.woodLight,chair);}rod([-.25,.25,-.22],[.25,.25,-.22],.023,M.wood,chair);rod([-.25,.28,.22],[.25,.28,.22],.023,M.wood,chair);shadow(.68,.65,.23,-.35,.0292,-.55);
// Bookcase with separate volumes. Broad paper edges, cloth bindings and titled spines.
const shelf=group(-2.42,.021,-1.75);box(1.3,1.62,.045,M.greenDark,0,.82,-.32,shelf);box(1.19,1.48,.025,M.woodDark,0,.85,-.29,shelf);for(const x of [-.64,.64])box(.065,1.7,.66,M.wood,x,.85,0,shelf,true);for(let i=0;i<5;i++)box(1.34,.055,.66,M.woodLight,0,.08+i*.405,0,shelf,true);
const bookColors=['#a98673','#657f7c','#c4b17b','#686378','#9b6768','#577668','#c8c0a3','#738690','#826c57'];const bookM=bookColors.map(c=>mat(c,'fabric'));
function volume(w,h,d,m,parent,x,y,z,title,action){const g=group(x,y,z,parent);box(w-.015,h-.026,d-.024,M.paper,0,0,-.007,g);box(w,.014,d,m,0,h/2,0,g);box(w,.014,d,m,0,-h/2,0,g);box(w,h,.026,m,0,0,d/2,g,true);box(.009,h,d,m,-w/2,0,0,g);box(.009,h,d,m,w/2,0,0,g);for(const sy of [-.37,.37])box(w*.84,.008,.002,M.brass,0,h*sy,d/2+.014,g);if(title){const l=label(title,h*.74,w*.81,'#e5d7b7',null,46);l.rotation.z=Math.PI/2;l.position.set(0,0,d/2+.016);g.add(l);}if(action)interactive(g,action);return g;}
const diaryBooks=[];let pulledBook=null,pendingDiary=null;
function takeBook(b,person,kind='diary',day='all',entry=null){
 if(mode!=='shelf')go('shelf');
 if(typeof bookCaption!=='undefined')bookCaption.hidden=true;pulledBook=b;pendingDiary={book:b,person,kind,day,entry};$('#selection').hidden=true;wake();
}
function takeDiary(b,person,day){takeBook(b,person,'diary',day);}
const readingBooks=[];

// A lived-in bookcase: hardbacks, pocket notebooks and horizontal bundles.
// Fifty-two dated bookmarks come from actual records; four full volumes keep every entry accessible.
const shelfPlacements=[],bindingPalette=['#7c534f','#697e88','#dfd2b2','#53665a','#b59c63','#86758e','#577c79','#9e7d68','#414f61','#c1b594','#8c6269'];
const shelfCollections=window.ROOM_BOOK_CATALOG;
function spineTexture(person,kind,record,color,variant){
 return canvasTexture(192,1024,c=>{
  c.fillStyle=color;c.fillRect(0,0,192,1024);const pale=['#dfd2b2','#b59c63','#c1b594'].includes(color),ink=pale?'#293a32':'#fff4d7';
  if(variant%3===1){c.fillStyle=pale?'#6d7c64':'#e7dcbb';c.fillRect(7,40,178,248);}
  c.textAlign='center';c.textBaseline='middle';c.fillStyle=variant%3===1?(pale?'#f7edcf':'#304335'):ink;c.font='bold 112px SimSun,serif';
  const title=kind==='diary'?'日记':'对话';c.fillText(title[0],96,112);c.fillText(title[1],96,233);
  c.save();c.translate(96,530);c.rotate(-Math.PI/2);c.fillStyle=ink;c.font='bold 96px Georgia';c.fillText(person,0,0,430);c.restore();
  c.fillStyle=ink;c.fillRect(33,781,126,4);c.font='bold 67px Georgia,SimSun,serif';c.fillText(record.day==='all'?'全册':record.day.slice(5).replace('-','.'),96,858,172);
  if(record.part){c.font='48px Georgia';c.fillText(record.part+' / '+record.parts,96,948);}
 });
}
for(let row=0;row<4;row++){
 const {person,kind,volumes}=shelfCollections[row],records=[{day:'all',target:null},...volumes],floor=.1075+row*.405;let x=-.565,stackTop=floor;
 for(let j=0;j<records.length;j++){
  const record=records[j],horizontal=j>=11,w=j===0?.092:horizontal?.038+(j%3)*.007:[.046,.063,.040,.073,.055,.069,.044,.074,.051,.059][(j-1)%10];
  const h=horizontal?.268:.270+(j%4)*.016,d=.235+(j%3)*.024,lean=j===10?-.035:0,color=bindingPalette[(j+row*3)%bindingPalette.length];
  const anchor=group(0,0,0,shelf),binding=volume(w,h,d,mat(color,j%3===0?'fabric':'paper'),anchor,0,0,0,null,null);binding.rotation.z=horizontal?Math.PI/2:lean;
  const face=new T.Mesh(new T.PlaneGeometry(w-.007,h-.012),new T.MeshBasicMaterial({map:spineTexture(person,kind,record,color,j),toneMapped:false}));face.position.z=d/2+.017;binding.add(face);
  anchor.position.z=.294-d/2;anchor.updateWorldMatrix(true,true);const localBounds=new T.Box3().setFromObject(anchor,true),size=localBounds.getSize(new T.Vector3());
  anchor.position.x=horizontal?.422:x+size.x/2;anchor.position.y=(horizontal?stackTop:floor)+size.y/2;
  if(horizontal){stackTop+=size.y+.003;anchor.rotation.y=(j-12)*.045;}else x+=size.x+.006;
  Object.assign(anchor.userData,{homeZ:anchor.position.z,homeY:anchor.position.y,person,kind,day:record.day,entry:record.target,bookThickness:w,bookHeight:h,horizontal,title:person+' · '+(kind==='diary'?'日记':'对话')+(record.day==='all'?' · 全册':' · '+record.day.slice(5).replace('-','月')+'日 · '+record.part+'/'+record.parts)});
  interactive(anchor,()=>takeBook(anchor,person,kind,record.day,record.target));diaryBooks.push(anchor);if(j===0)readingBooks.push(anchor);shelfPlacements.push({book:anchor,row,record});
 }
 // A real paper shelf label makes the full collection readable without thickening any book.
 const tag=canvasTexture(1536,128,c=>{c.fillStyle='#ded8c0';c.fillRect(0,0,1536,128);c.fillStyle='#273b30';c.textAlign='center';c.textBaseline='middle';c.font='bold 92px Georgia,SimSun,serif';c.fillText(person+'　'+(kind==='diary'?'日记':'对话'),768,69);});
 const tagMesh=new T.Mesh(new T.PlaneGeometry(.80,.047),new T.MeshBasicMaterial({map:tag,toneMapped:false}));tagMesh.position.set(0,.080+row*.405,.342);shelf.add(tagMesh);
}
readingBooks.sort((a,b)=>a.userData.person.localeCompare(b.userData.person)||(['diary','conversation'].indexOf(a.userData.kind)-['diary','conversation'].indexOf(b.userData.kind)));

// Shelf titles belong on the spines; no floating plaque above the books.
const floorStacks=[];function stack(x,y,z,n,parent=root){const g=group(x,y,z,parent);g.userData.structure=true;g.userData.supportY=y;floorStacks.push(g);let top=0;for(let i=0;i<n;i++){const h=.040+rand()*.022;const b=volume(.30+rand()*.045,h,.43,bookM[i%9],g,(rand()-.5)*.025,top+h/2+.007,0,null,null);b.rotation.y=(rand()-.5)*.12;top+=h+.014;}return g;}
stack(-2.54,1.749,-1.80,4);stack(-2.6,.021,-.96,6);stack(-1.93,.021,.56,3);stack(-2.17,.021,1.18,3);
// Raised display drawers remain above the bed and nightstand; storage stays below.
const cabinet=group(2.46,.021,-2.01);box(1.2,2.94,.045,M.greenDark,0,1.50,-.34,cabinet);
for(const x of [-.62,.62])box(.07,3.00,.73,M.green,x,1.500,0,cabinet,true);
for(const y of [.08,.99,1.15,1.50,1.85,2.20,2.99])box(1.31,.045,.75,M.green,0,y,0,cabinet,true);
const doors=[group(-.59,.53,.410,cabinet),group(.59,.53,.410,cabinet)];
for(let i=0;i<2;i++){const sign=i?-1:1,d=doors[i];box(.579,.81,.045,M.green,sign*.29,0,0,d,true);box(.43,.61,.012,mat('#82917c','paint'),sign*.29,0,.027,d);sphere(.023,M.brass,sign*.50,.02,.049,d);interactive(d,()=>go('cabinet'));}
const door=doors[0],drawerGroups=[],drawerNames=['下层','中层','上层'];
for(let i=0;i<3;i++){
 const dg=group(0,1.335+i*.35,.10,cabinet);dg.userData.dynamic=true;
 box(1.05,.026,.53,M.woodLight,0,-.084,0,dg);box(.025,.17,.53,M.woodDark,-.52,-.009,0,dg);box(.025,.17,.53,M.woodDark,.52,-.009,0,dg);
 box(1.09,.208,.035,M.wood,0,0,.285,dg,true);box(1.03,.16,.02,M.woodDark,0,-.012,-.255,dg);
 for(const x of [-.12,.12])rod([x,0,.31],[x,0,.346],.009,M.brass,dg);rod([-.12,0,.346],[.12,0,.346],.010,M.brass,dg);
 box(.99,.005,.485,M.ivory,0,-.068,0,dg);
 // Fixed rails support the rear of the drawer throughout its 40 cm travel.
 for(const x of [-.557,.557])box(.018,.025,.66,M.metal,x,1.27+i*.35,.02,cabinet);
 dg.userData.homeZ=.10;dg.userData.drawerIndex=i;drawerGroups.push(dg);interactive(dg,()=>openDrawer(i));
}

const emergingArt=[],artMaps=[];
for(let i=0;i<3;i++){
 const tex=new T.TextureLoader().load(window.ROOM_ART_TEXTURES[i]);tex.colorSpace=T.SRGBColorSpace;artMaps.push(tex);
 const card=group(0,-.058,0,drawerGroups[i]);card.userData.dynamic=true;emergingArt.push(card);
 for(let j=0;j<6;j++){
  const x=-.31+(j%3)*.31,z=-.112+Math.floor(j/3)*.218;
  box(.277,.010,.190,M.paper,x,0,z,card);
  if(i===0){const map=new T.TextureLoader().load(window.ROOM_DRAWER_THUMBS?.[j]||window.ROOM_ART_TEXTURES[j%3]);map.colorSpace=T.SRGBColorSpace;
   const img=new T.Mesh(new T.PlaneGeometry(.248,.156),new T.MeshStandardMaterial({map,roughness:1}));img.rotation.x=-Math.PI/2;img.position.set(x,.006,z);card.add(img);
  }else{
   const tag=label(i===1?['修伞铺','你先忙','五号桌','几行','合写','诗'][j]:['窗外经过','灯下的杯子','房间里有一把椅子','浅湾号','歪风筝','习作'][j],.22,.13,'#586351',null,44);tag.rotation.x=-Math.PI/2;tag.position.set(x,.006,z);card.add(tag);
  }
 }
 const tag=placeLabel(drawerNames[i],.16,.050,-.36,.012,.305,drawerGroups[i],'#eee2bd',null,52);
}
// A square window image on the second fold, with the original aspect ratio.
const miniatureGeo=new T.BufferGeometry(),photoX0=-.240,photoX1=-.025,photoZ0=-.160,photoZ1=.055;
const paperY=x=>foldRise-(x+panelWidth)/panelWidth*(foldRise-.005)+.001;
miniatureGeo.setAttribute('position',new T.Float32BufferAttribute([photoX0,paperY(photoX0),photoZ0,photoX0,paperY(photoX0),photoZ1,photoX1,paperY(photoX1),photoZ1,photoX1,paperY(photoX1),photoZ0],3));miniatureGeo.setAttribute('uv',new T.Float32BufferAttribute([0,1,0,0,1,0,1,1],2));miniatureGeo.setIndex([0,1,2,0,2,3]);miniatureGeo.computeVertexNormals();book.add(new T.Mesh(miniatureGeo,new T.MeshStandardMaterial({map:artMaps[0],roughness:1,side:T.DoubleSide})));
const postcard=group(-1.31,1.461303423,-1.955);postcard.rotation.x=-.10;postcard.rotation.z=0;box(.38,.265,.01,M.paper,0,0,0,postcard);const postcardPicture=new T.Mesh(new T.PlaneGeometry(.345,.2156),new T.MeshStandardMaterial({map:artMaps[2],roughness:1}));postcardPicture.position.z=.008;postcard.add(postcardPicture);box(.40,.025,.145,M.wood,0,-.132,.01,postcard);rod([-.14,-.12,-.005],[-.14,-.115,-.10],.008,M.wood,postcard);rod([.14,-.12,-.005],[.14,-.115,-.10],.008,M.wood,postcard);
postcard.updateWorldMatrix(true,true);postcard.position.y+=1.3075-new T.Box3().setFromObject(postcard,true).min.y;
const stickerTex=canvasTexture(128,128,c=>{c.fillStyle='#d7c7ab';c.beginPath();c.arc(64,64,57,0,7);c.fill();c.strokeStyle='#806f62';c.lineWidth=3;c.beginPath();c.arc(64,64,50,0,7);c.stroke();c.fillStyle='#748678';c.beginPath();c.ellipse(65,72,31,18,0,0,7);c.fill();c.beginPath();c.arc(42,68,16,0,7);c.fill();c.beginPath();c.moveTo(28,62);c.lineTo(30,45);c.lineTo(42,56);c.moveTo(42,54);c.lineTo(51,45);c.lineTo(55,63);c.fill();c.strokeStyle='#435848';c.lineWidth=2;c.beginPath();c.moveTo(33,68);c.quadraticCurveTo(37,74,42,68);c.stroke();});
const sticker=new T.Mesh(new T.PlaneGeometry(.18,.18),new T.MeshStandardMaterial({map:stickerTex,transparent:true,roughness:1}));sticker.position.set(.23,-.14,.043);door.add(sticker);
// Teddy, storage box and books on top: sculpted shapes keep the room recognisable.
const teddyMat=mat('#9b8060','fabric'),teddyNose=mat('#4d453b','fabric');const teddy=group(-.15,2.35,.02,cabinet);sphere(.21,teddyMat,0,.15,0,teddy,[1,.95,.72]);sphere(.15,teddyMat,0,.40,0,teddy,[1,1,.80]);sphere(.065,teddyMat,-.11,.52,0,teddy);sphere(.065,teddyMat,.11,.52,0,teddy);sphere(.082,teddyMat,-.20,.10,.03,teddy,[.75,1.5,1]);sphere(.082,teddyMat,.20,.10,.03,teddy,[.75,1.5,1]);sphere(.095,teddyMat,-.105,-.03,.08,teddy);sphere(.095,teddyMat,.105,-.03,.08,teddy);sphere(.013,teddyNose,-.053,.42,.113,teddy);sphere(.013,teddyNose,.053,.42,.113,teddy);sphere(.022,teddyNose,0,.365,.132,teddy);const bow=group(0,.275,.137,teddy);const ribbonMat=mat('#976365','fabric');
// Thin folded ribbon surfaces, with notched tails and a small gathered knot.
ribbonMat.side=T.DoubleSide;
for(const side of [-1,1]){
 const shape=new T.Shape();shape.moveTo(.008,0);shape.bezierCurveTo(.035,.020,.076,.055,.101,.030);shape.bezierCurveTo(.120,.010,.093,-.039,.078,-.029);shape.quadraticCurveTo(.035,-.015,.008,0);
 const geo=new T.ShapeGeometry(shape,14),p=geo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);p.setXYZ(i,x*side,y,.007+Math.sin(x/.11*Math.PI)*.017);}geo.computeVertexNormals();
 const wing=new T.Mesh(geo,ribbonMat);wing.castShadow=true;wing.receiveShadow=true;bow.add(wing);
 const tail=new T.Shape();tail.moveTo(.006,-.009);tail.lineTo(.031,-.011);tail.lineTo(.057,-.094);tail.lineTo(.037,-.083);tail.lineTo(.026,-.101);tail.closePath();
 const tg=new T.ShapeGeometry(tail),tp=tg.attributes.position;for(let i=0;i<tp.count;i++){tp.setX(i,tp.getX(i)*side);tp.setZ(i,-.004+Math.sin(tp.getY(i)*25)*.009);}tg.computeVertexNormals();const tm=new T.Mesh(tg,ribbonMat);tm.castShadow=true;bow.add(tm);
}
sphere(.021,M.red,0,0,.017,bow,[.63,1,.60]);
const violet=mat('#98839e','fabric');box(.56,.37,.46,violet,-.24,3.205,-.04,cabinet,true);box(.59,.042,.48,violet,-.24,3.411,-.04,cabinet);box(.13,.065,.005,M.metal,-.24,3.27,.196,cabinet);box(.09,.025,.005,M.ivory,-.24,3.27,.201,cabinet);
// Small keepsakes share the upper open compartment with the bear.
box(.31,.21,.33,M.woodLight,.37,2.333,-.07,cabinet);box(.34,.025,.35,M.paper,.37,2.451,-.07,cabinet);box(.08,.035,.008,M.ivory,.37,2.34,.10,cabinet);
for(let i=0;i<4;i++){const h=.41+i*.015,a=.09,y=3.016+(h/2+.007)*Math.cos(a)+.0325*Math.sin(a);const b=volume(.060,h,.27,bookM[i],cabinet,.15+i*.085,y,0,null,()=>go('cabinet'));b.rotation.z=a;}

// Bed, quilt seams, folds and embroidered dots along the edge.
const bed=group(2.72,.021,.9);box(1.37,.40,2.89,M.woodDark,0,.31,0,bed,true);for(const x of [-.60,.60])for(const z of [-1.3,1.3])box(.09,.3,.09,M.wood,x,.15,z,bed);box(1.40,.49,.095,M.wood,0,.71,-1.41,bed,true);box(1.33,.22,2.79,M.ivory,0,.61,0,bed);
const quiltTex=canvasTexture(512,512,(c)=>{c.fillStyle='#cbbb7d';c.fillRect(0,0,512,512);for(let i=0;i<55;i++){c.fillStyle=i%3===0?'#e8ddaf':'#b5a165';const x=rand()*512,y=rand()*512;c.beginPath();c.ellipse(x,y,3+rand()*3,2+rand()*2,rand()*6,0,7);c.fill();}for(let i=0;i<512;i++){c.fillStyle='rgba(80,65,30,'+(Math.sin(i/17)*.018+.02)+')';c.fillRect(i,0,1,512);}});
const quiltMat=new T.MeshStandardMaterial({map:quiltTex,roughness:1,color:'#e0cd93',side:T.DoubleSide});
// Broad cloth folds; side and foot drapes start outside the mattress edges.
const qGeo=new T.PlaneGeometry(2,2,36,48),qPos=qGeo.attributes.position;
for(let i=0;i<qPos.count;i++){
 const u=qPos.getX(i),v=(qPos.getY(i)+1)/2,a=Math.abs(u),side=Math.max(0,(a-.80)/.20);
 const x=Math.sign(u)*(a<=.80?a/.80*.665:.665+side*.15),z=-.73+v*2.28,foot=Math.max(0,(z-1.395)/.155);
 const height=.775+.010*Math.sin(v*8+u*3)+.008*Math.cos(u*9+v*4)-side*side*.22-foot*foot*.26;
 qPos.setXYZ(i,x,height,z);
}
qGeo.computeVertexNormals();const quilt=new T.Mesh(qGeo,quiltMat);quilt.castShadow=true;quilt.receiveShadow=true;bed.add(quilt);
sphere(.5,M.ivory,0,.80,-1.065,bed,[1.10,.16,.49]);
const cuff=box(1.29,.025,.095,M.cloth,0,.789,-.707,bed);cuff.rotation.x=.05;

// Alarm clock on the small nightstand beside the bed.
const night=group(1.62,.0075,-.39);for(const x of [-.28,.28])for(const z of [-.21,.21])box(.06,.0095,.06,M.woodDark,x,.02525,z,night);box(.69,.74,.56,M.woodDark,0,.4,0,night);box(.73,.057,.62,M.woodLight,0,.805,0,night);box(.6,.38,.03,M.wood,0,.53,.30,night,true);sphere(.029,M.brass,0,.6,.34,night);box(.59,.22,.026,M.wood,0,.18,.301,night,true);
const clock=group(0,1.003,0,night);cyl(.132,.132,.074,M.red,0,0,0,clock).rotation.x=Math.PI/2;cyl(.113,.113,.005,M.ivory,0,0,.041,clock).rotation.x=Math.PI/2;for(let i=0;i<12;i++){const a=i*Math.PI/6;const line=box(.005,.012,.005,M.woodDark,Math.sin(a)*.093,Math.cos(a)*.093,.047,clock);line.rotation.z=-a;}for(const x of [-.075,.075]){sphere(.046,M.red,x,.125,0,clock,[1,.55,1]);rod([x*.7,-.09,0],[x,-.16,.01],.008,M.metal,clock);}
// Rug with a bound edge; paper scraps and bag are independent objects.
// A thin cloth rug, ending before the foreground bag, with exposed wood on all sides.
const rug=group(.20,0,.12),rugDepth=2.88,rugWidth=3.72;
box(rugWidth,.006,rugDepth,mat('#665870','fabric'),0,.0235,0,rug);
const rugGeo=new T.PlaneGeometry(rugWidth-.012,rugDepth-.012,36,28),rugPos=rugGeo.attributes.position;
for(let i=0;i<rugPos.count;i++){const x=rugPos.getX(i),z=-rugPos.getY(i);rugPos.setXYZ(i,x,.0277+Math.sin(x*19+z*11)*.00045,z);}
rugGeo.computeVertexNormals();const rugCloth=new T.Mesh(rugGeo,M.rug);rugCloth.receiveShadow=true;rug.add(rugCloth);
const rugBinding=mat('#84738d','fabric');for(const x of [-1.850,1.850])box(.014,.0015,2.867,rugBinding,x,.0282,0,rug);for(const z of [-1.430,1.430])box(3.701,.0015,.014,rugBinding,0,.0282,z,rug);

const bin=group(.80,.2930,-.22);const binMaterial=M.black.clone();binMaterial.side=T.DoubleSide;const binShell=new T.Mesh(new T.CylinderGeometry(.24,.18,.53,24,1,true),binMaterial);binShell.castShadow=true;binShell.receiveShadow=true;bin.add(binShell);cyl(.18,.18,.008,M.black,0,-.261,0,bin);const binRim=new T.Mesh(new T.TorusGeometry(.238,.009,6,32),M.black);binRim.rotation.x=Math.PI/2;binRim.position.y=.265;bin.add(binRim);for(let i=0;i<13;i++){const o=new T.Mesh(new T.IcosahedronGeometry(.07+rand()*.04,0),M.paper);o.position.set((rand()-.5)*.30,.27+rand()*.08,(rand()-.5)*.30);o.rotation.set(rand(),rand(),rand());bin.add(o);o.castShadow=true;}for(const p of [[1.02,.12,.36],[.55,.10,.65]]){const o=new T.Mesh(new T.IcosahedronGeometry(.065,0),M.paper);o.position.set(...p);o.castShadow=true;root.add(o);}
// Softly bevelled randoseru: shaped flap, gussets, stitching and two shoulder straps.
function roundedBox(w,h,d,r,m,parent,x=0,y=0,z=0){
 const a=-w/2,b=-h/2,shape=new T.Shape();shape.moveTo(a+r,b);shape.lineTo(a+w-r,b);shape.quadraticCurveTo(a+w,b,a+w,b+r);shape.lineTo(a+w,b+h-r);shape.quadraticCurveTo(a+w,b+h,a+w-r,b+h);shape.lineTo(a+r,b+h);shape.quadraticCurveTo(a,b+h,a,b+h-r);shape.lineTo(a,b+r);shape.quadraticCurveTo(a,b,a+r,b);
 const g=new T.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:r*.25,bevelThickness:r,curveSegments:5});g.translate(0,0,-d/2+r);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
const bag=group(-2.62,0,2.28);bag.rotation.set(-Math.PI/2,-.28,0,'YXZ');
const leather=mat('#874b47','fabric'),leatherEdge=mat('#a9655a','fabric');
const bagBody=roundedBox(.71,.70,.36,.065,leather,bag);bagBody.userData.structure=true;roundedBox(.75,.60,.043,.07,leatherEdge,bag,0,.06,.194);
roundedBox(.56,.25,.07,.035,M.red,bag,0,-.18,.234);
for(const side of [-1,1]){curve([[side*.325,-.24,.225],[side*.325,.22,.225],[side*.25,.334,.225],[0,.343,.225]],.004,M.edge,bag);curve([[side*.24,.30,-.14],[side*.44,.17,-.153],[side*.47,-.36,-.153],[side*.20,-.28,-.14]],.024,leather,bag);roundedBox(.052,.12,.025,.010,M.brass,bag,side*.19,-.265,.287);box(.029,.080,.028,leather,side*.19,-.263,.300,bag);}
curve([[-.16,.345,0],[-.12,.43,-.01],[.12,.43,-.01],[.16,.345,0]],.022,leather,bag);
// Collapsed cotton tote: two softly folded cloth faces, a gusset and fallen handles.
const tote=group(-3.03,0,-.56);tote.rotation.set(0,-.15,-.14);
const canvasMat=mat('#d8d0ab','fabric');canvasMat.side=T.DoubleSide;
for(const side of [-1,1]){
 const g=new T.PlaneGeometry(.49,.49,16,20),p=g.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),height=(y+.245)/.49;
  p.setXYZ(i,x*(.88+.12*Math.sin(height*Math.PI)),y+.013*Math.cos(x*14)*height,side*(.030+.036*Math.sin(height*Math.PI))+.012*Math.sin(x*26+height*7));}
 g.computeVertexNormals();const cloth=new T.Mesh(g,canvasMat);cloth.castShadow=true;cloth.receiveShadow=true;tote.add(cloth);
 curve([[-.14,.23,side*.03],[-.14,.35,.01],[-.05,.39,-.02],[.12,.29,side*.02],[.15,.225,side*.03]],.012,canvasMat,tote);
}
curve([[-.211,.20,.001],[-.22,-.18,.00],[0,-.246,.00],[.22,-.18,.00],[.211,.20,.001]],.008,canvasMat,tote);
// Set each soft bag down after its rotation; no hidden corner enters the floor.
for(const prop of [bag,tote]){prop.updateWorldMatrix(true,true);const bounds=new T.Box3().setFromObject(prop===bag?bagBody:prop,true);prop.position.y+=.0210-bounds.min.y;}

stack(1.70,.0205,3.04,1);const loose=box(.24,.002,.36,M.paper,.93,.0290,1.28);loose.rotation.y=.3;for(let i=0;i<3;i++){const line=box(.17,.002,.002,M.greenDark,.93,.0305,1.19+i*.04);line.rotation.y=.3;}
shadow(3.10,1.45,.18,-.12,.0214,-1.50);shadow(1.45,.77,.30,-2.42,.0214,-1.75);shadow(1.42,.87,.30,2.46,.0214,-2.01);shadow(.83,.79,.47,-2.62,.0216,2.28);shadow(1.02,.94,.13,-2.62,.0215,2.28);
// Light is part of the room: bright window, cool fill and warm paper under the lamp.
const hemi=new T.HemisphereLight('#d5e4e7','#96806b',1.0);scene.add(hemi);const sun=new T.DirectionalLight('#ffe9c5',2.05);sun.position.set(-3.1,4.2,-5);sun.target.position.set(.6,.3,1.4);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(lightMode?1024:2048,lightMode?1024:2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:18});sun.shadow.bias=-.0002;sun.shadow.normalBias=.006;sun.shadow.radius=3;
const frontLight=new T.DirectionalLight('#c8d9df',.60);frontLight.position.set(0,3,6);scene.add(frontLight);
// Window shadows come from the real frame, not a painted branch decal.
const windowFill=new T.PointLight('#d2e3ef',.45,6.3,1.3);windowFill.position.set(-1.55,2.70,-2.25);scene.add(windowFill);

// Window light patches, feathered at the edges, always lie on surfaces.
const lightTex=canvasTexture(128,128,c=>{const g=c.createRadialGradient(64,64,8,64,64,65);g.addColorStop(0,'#fff2bc66');g.addColorStop(1,'#fff2bc00');c.fillStyle=g;c.fillRect(0,0,128,128);});const lightPatch=new T.Mesh(new T.PlaneGeometry(4,2.5),new T.MeshBasicMaterial({map:lightTex,transparent:true,depthWrite:false,blending:T.AdditiveBlending,opacity:.32}));lightPatch.rotation.x=-Math.PI/2;lightPatch.rotation.z=-.3;lightPatch.position.set(.15,.064,.52);lightPatch.visible=false;
lightPatch.userData.dynamic=true;
const moteTex=canvasTexture(32,32,c=>{const g=c.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'#fff5d2bb');g.addColorStop(.18,'#fff1bd55');g.addColorStop(1,'#fff1bd00');c.fillStyle=g;c.fillRect(0,0,32,32);});const dustGeo=new T.BufferGeometry();const dustData=new Float32Array(48*3);for(let i=0;i<48;i++){dusts.push({x:-1.85+rand()*2.5,y:.9+rand()*2.1,z:-2.05+rand()*1.9,phase:rand()*6.3,speed:.6+rand()});dustData.set([dusts[i].x,dusts[i].y,dusts[i].z],i*3);}dustGeo.setAttribute('position',new T.BufferAttribute(dustData,3));const dust=new T.Points(dustGeo,new T.PointsMaterial({map:moteTex,color:'#fff0c7',size:.025,transparent:true,opacity:.50,depthWrite:false,sizeAttenuation:true}));root.add(dust);
// A real hanging blind cord reacts gently to the air near the window.
const blindCord=group(1.68,.76,.205,win);blindCord.userData.dynamic=true;
rod([0,0,0],[0,-.73,0],.004,M.ivory,blindCord);sphere(.023,M.woodLight,0,-.755,0,blindCord,[.70,1.5,.70]);

const deskPool=new T.Mesh(new T.PlaneGeometry(1.50,.80),new T.MeshBasicMaterial({map:lightTex,color:'#f8d8a0',transparent:true,opacity:.18,depthWrite:false,blending:T.AdditiveBlending}));deskPool.rotation.x=-Math.PI/2;deskPool.position.set(-.28,1.314,-1.55);root.add(deskPool);deskPool.userData.dynamic=true;
let lampOn=true;interactive(lamp,()=>{lampOn=!lampOn;lampLight.intensity=lampOn?2.8:0;bulb.emissiveIntensity=lampOn?1.35:.03;deskPool.visible=lampOn;renderer.shadowMap.needsUpdate=true;$('#room-hint').textContent=lampOn?'台灯已开启':'台灯已关闭';});
const life=window.createRoomLife?.({T,scene,root,renderer,canvasTexture,windowTexture,assetPromises,outside,sideView,sun,hemi,frontLight,windowFill,lightPatch,dust,clock,rod,M});
const activity=window.createRoomActivity?.({T,root,box,sphere,rod,group,curve,shadow,M,assetPromises});
const atmosphere=window.createRoomAtmosphere?.({T,renderer,scene,camera,sun,lampLight,life,lightMode});
const objects={bin,musicBox,desk,shelf,cabinet,bed,night,chair,bag,tote,book,lamp,tissues,postcard,clock,teddy,quilt,rug,architecture,sideWin,win};quilt.userData.dynamic=true;for(const [name,obj] of Object.entries(objects)){obj.name=name;obj.userData.structure=true;}
// Batch immutable geometry by material. Clickable books and moving drawers retain
// their own coordinate systems, so no ray targets or opening hinges are lost.
function batch(parent){
 parent.updateWorldMatrix(true,true);const inverse=parent.matrixWorld.clone().invert(),buckets=new Map();
 function walk(node){if(node.userData.dynamic)return;if(node!==parent&&(node.userData.action||node.userData.structure)){if(node.isGroup)batch(node);return;}if(node.isMesh&&!node.children.length&&!Array.isArray(node.material)){
  const key=node.material.uuid+':'+node.castShadow+':'+node.receiveShadow;let bucket=buckets.get(key);if(!bucket){bucket={nodes:[],material:node.material,cast:node.castShadow,receive:node.receiveShadow};buckets.set(key,bucket);}bucket.nodes.push(node);return;
 }node.children.slice().forEach(walk);}
 walk(parent);
 for(const b of buckets.values()){if(b.nodes.length<2)continue;const pos=[],normal=[],uv=[],indices=[];let offset=0;
  for(const n of b.nodes){const g=n.geometry.clone();g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,n.matrixWorld));const p=g.attributes.position,no=g.attributes.normal,u=g.attributes.uv;for(let i=0;i<p.count;i++){pos.push(p.getX(i),p.getY(i),p.getZ(i));normal.push(no?.getX(i)||0,no?.getY(i)||0,no?.getZ(i)||0);uv.push(u?.getX(i)||0,u?.getY(i)||0);}if(g.index){for(let i=0;i<g.index.count;i++)indices.push(g.index.getX(i)+offset);}else for(let i=0;i<p.count;i++)indices.push(i+offset);offset+=p.count;g.dispose();n.parent.remove(n);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(normal,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeBoundingSphere();const mesh=new T.Mesh(g,b.material);mesh.castShadow=b.cast;mesh.receiveShadow=b.receive;parent.add(mesh);
 }
}
tissue.userData.dynamic=true;outside.userData.dynamic=true;sideWin.userData.structure=true;win.userData.structure=true;batch(root);renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
// Spatial camera choreography. Opening is close to the booklet, then retreats into the room.
const views={arrival:{p:[.55,2.36,1.23],t:[-.43,1.29,-1.5]},book:{p:[-.42,1.9,-.94],t:[-.42,1.362,-1.37]},overview:{p:mobile?[.08,2.76,9.8]:[.12,2.58,6.55],t:[0,1.48,-1.10]},shelf:{p:[-2.25,1.26,.50],t:[-2.42,.96,-1.52]},desk:{p:[1.23,2.76,1.36],t:[-.27,1.26,-1.57]},cabinet:{p:[1.16,2.64,1.44],t:[2.35,1.94,-1.95]},music:{p:[.80,1.99,-.39],t:[.75,1.40,-1.65]},drawer:{p:[2.40,2.50,-.08],t:[2.46,1.30,-1.44]}};
camera.position.fromArray(views.arrival.p);target.fromArray(views.arrival.t);camera.lookAt(target);
let travel=null,drift=new T.Vector2(),mouse=new T.Vector2(),ray=new T.Raycaster(),down=null,hover=null,elapsed=0,navRevision=0,pendingArt=null,active=true;
function defaultFov(){return innerWidth/innerHeight<.8?58:innerWidth/innerHeight<1.35?50:43;}
function setShelfView(){
 const portrait=camera.aspect<.8,aim=new T.Vector3(-2.42,portrait?.58:.94,-1.49),probe=camera.clone();probe.fov=defaultFov();probe.updateProjectionMatrix();
 const corners=[];for(const x of [-3.10,-1.74])for(const y of [.021,1.749])corners.push(new T.Vector3(x,y,-1.40));
 for(let z=.40;z<4;z+=.04){probe.position.set(-2.26,portrait?1.34:1.44,z);probe.lookAt(aim);probe.updateMatrixWorld(true);if(corners.every(p=>{const q=p.clone().project(probe);return Math.abs(q.x)<.88&&q.y<(portrait?.70:.82)&&q.y>(portrait?-.34:-.84);}))break;}
 views.shelf.p=probe.position.toArray();views.shelf.t=aim.toArray();views.shelf.fov=probe.fov;
}
function setDrawerView(i){
 const g=drawerGroups[i],center=g.getWorldPosition(new T.Vector3()),portrait=camera.aspect<.8,fov=portrait?72:defaultFov(),aim=new T.Vector3(center.x,center.y-.028,center.z+.03);
 const probe=camera.clone();probe.fov=fov;probe.aspect=camera.aspect;probe.updateProjectionMatrix();
 const corners=[];for(const x of [-.565,.565])for(const y of [-.11,.11])for(const z of [-.265,.36])corners.push(g.localToWorld(new T.Vector3(x,y,z)));
 let distance=.65;for(let i=0;i<95;i++,distance+=.04){probe.position.copy(aim).add(new T.Vector3(-.025,portrait?.69:.82,portrait?.724:.572).multiplyScalar(distance));probe.lookAt(aim);probe.updateMatrixWorld(true);if(corners.every(p=>{const q=p.clone().project(probe);return Math.abs(q.x)<.89&&Math.abs(q.y)<.82&&q.z<1;}))break;}
 views.drawer.fov=fov;views.drawer.t=aim.toArray();views.drawer.p=probe.position.toArray();
}

function moveTo(name,portal=false){
 const v=views[name],from=camera.position.clone(),to=new T.Vector3(...v.p),focus=new T.Vector3(...views.book.t);
 const near=Math.max(.35,Math.min(from.distanceTo(focus),to.distanceTo(focus))),far=Math.max(from.distanceTo(focus),to.distanceTo(focus));
 travel={from,to,fovFrom:camera.fov,fovTo:v.fov||defaultFov(),a:target.clone(),b:new T.Vector3(...v.t),t:0,d:reduced?.02:portal?3.05:name==='drawer'?1.10:1.7,portal,returning:name==='book',ratio:Math.max(1.01,far/near)};wake();
}
function go(name,portal=false){
 if(!views[name])return;if(!started)enter();if(name==='shelf')setShelfView();const same=mode===name;const token=++navRevision;mode=name;
 pulledBook=null;pendingDiary=null;pendingArt=null;selectedDrawer=null;$('#selection').hidden=true;
 bookCaption.hidden=true;document.body.dataset.place=name;document.body.classList.toggle('focusing',name!=='overview');$('#overview').hidden=name==='overview'||name==='book';
 document.querySelectorAll('[data-place]').forEach(b=>b.classList.toggle('active',b.dataset.place===name));
 if(!same||portal)moveTo(name,portal);$('#room-hint').textContent='';
 if(['shelf','desk','cabinet','music'].includes(name)){if(same)showSelection(name);else window.setTimeout(()=>{if(token===navRevision&&mode===name&&!pendingDiary&&!pendingArt&&selectedDrawer===null)showSelection(name);},reduced?0:1710);}wake();
}
function enter(){if(started)return;started=true;document.body.classList.add('entered');$('#welcome').setAttribute('aria-hidden','true');mode='overview';moveTo('overview');}
function choose(labelText,action,small){const b=document.createElement('button');const em=document.createElement('em');em.textContent=labelText;b.append(em);const s=document.createElement('span');s.textContent=small||'翻开 ↗';b.append(s);b.onclick=action;return b;}
function showSelection(name){
 const panel=$('#selection'),body=$('#selection-body');body.replaceChildren();panel.dataset.place=name;
 $('#selection-eyebrow').textContent='';
 if(name==='shelf'){
  $('#selection-title').textContent='书柜';
  for(const b of readingBooks){const {person,kind}=b.userData;body.append(choose(person,()=>takeBook(b,person,kind),kind==='diary'?'日记':'对话'));}
 }else if(name==='desk'){
  $('#selection-title').textContent='书桌';body.append(choose('猫与尺',()=>book.userData.action(),'打开折册'),choose('音乐盒',()=>go('music'),'选曲'),choose('共同留言',()=>window.RoomReader.open('letters','Ambrose'),'阅读'));
 }else if(name==='music'){
  $('#selection-title').textContent='音乐盒';
  musicTitles.forEach((title,i)=>{const b=choose(title,()=>musicSelect(i),musicStatus.index===i?(musicStatus.playing?'正在播放':'已选'):'播放');b.setAttribute('aria-pressed',String(musicStatus.index===i));body.append(b);});
  body.append(choose(musicStatus.playing?'暂停':'播放',musicToggle,'当前曲目'));
 }else{
  $('#selection-title').textContent='作品柜';[2,1,0].forEach(i=>body.append(choose(drawerNames[i]+'抽屉',()=>openDrawer(i),'拉开')));
 }panel.hidden=false;
}
function openDrawer(i){if(!Number.isInteger(i)||i<0||i>=drawerGroups.length)return;if(selectedDrawer===i){returnFromArt();return;}if(mode!=='cabinet')go('cabinet');++navRevision;selectedDrawer=i;pendingArt={index:i,stage:travel?'waiting':'opening',hold:0};$('#selection').hidden=true;wake();}
function showOpenDrawer(i){
 if(selectedDrawer!==i||mode!=='cabinet')return;
 const panel=$('#selection'),body=$('#selection-body');panel.dataset.place='open-drawer';$('#selection-title').textContent=drawerNames[i]+'抽屉';$('#selection-eyebrow').textContent='';body.replaceChildren();
 body.append(choose('查看作品',()=>window.RoomReader?.art(i),'翻阅 ↗'),choose('收回抽屉',returnFromArt,'返回'));panel.hidden=false;
}
function returnFromArt(){++navRevision;window.RoomReader?.cancelPending?.();const hadDrawer=selectedDrawer!==null;selectedDrawer=null;pendingArt=null;if(mode==='cabinet'){if(hadDrawer)moveTo('cabinet');showSelection('cabinet');}wake();}
function returnBook(){pulledBook=null;pendingDiary=null;if(['shelf','desk'].includes(mode))showSelection(mode);wake();}
const spots=[{name:'shelf',title:'书柜 · 日记与对话',point:new T.Vector3(-2.43,1.34,-1.35)},{name:'desk',title:'折册',point:new T.Vector3(-.47,1.34,-1.25)},{name:'cabinet',title:'作品',point:new T.Vector3(2.43,2.32,-1.59)},{name:'music',title:'音乐盒',point:new T.Vector3(.75,1.55,-1.65)}];
for(const s of spots){const b=document.createElement('button');b.className='hotspot';b.textContent=s.title;b.onclick=()=>go(s.name);$('#hotspots').append(b);s.el=b;}
function updateSpots(){for(const s of spots){const p=s.point.clone().project(camera);s.el.style.left=((p.x*.5+.5)*innerWidth)+'px';s.el.style.top=((-p.y*.5+.5)*innerHeight)+'px';s.el.textContent=innerWidth<760&&s.name==='shelf'?'书柜':s.title;s.el.style.visibility=p.z>1||(innerWidth<760&&s.name==='music')?'hidden':'visible';}}
const bookCaption=document.createElement('div');bookCaption.id='book-caption';bookCaption.hidden=true;bookCaption.setAttribute('role','tooltip');document.body.append(bookCaption);
function updateBookCaption(event){
 const title=hover?.userData.title;bookCaption.hidden=!title||mode!=='shelf'||!!travel||!!pendingDiary;
 if(!bookCaption.hidden){bookCaption.textContent=title;bookCaption.style.left=Math.max(12,Math.min(innerWidth-260,event.clientX+16))+'px';bookCaption.style.top=Math.max(85,Math.min(innerHeight-120,event.clientY-38))+'px';}
}
function hit(event){mouse.set(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1);ray.setFromCamera(mouse,camera);ray.params.Line.threshold=.004;const hits=ray.intersectObjects(clickable,true);for(const h of hits){if(!h.object.isMesh)continue;let n=h.object;while(n&&!n.userData.action)n=n.parent;if(n?.userData.action)return n;}return null;}
$('#scene').addEventListener('pointerleave',()=>{bookCaption.hidden=true;hover=null;});
$('#scene').addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});$('#scene').addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<8){if(!started){enter();}else{const obj=hit(e);obj?.userData.action?.();}}down=null;});
$('#scene').addEventListener('pointercancel',()=>{down=null;});
$('#scene').addEventListener('pointerleave',()=>{drift.set(0,0);hover=null;});
$('#scene').addEventListener('pointermove',e=>{drift.set((e.clientX/innerWidth-.5)*2,(e.clientY/innerHeight-.5)*2);const obj=hit(e);$('#scene').style.cursor=!started||obj?'pointer':'default';if(obj!==hover)hover=obj;updateBookCaption(e);});
$('#enter').onclick=enter;$('#overview').onclick=()=>go('overview');document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>go(b.dataset.place));
function syncMotion(){const b=$('#motion');b.textContent=motion?'动效：开':'动效：关';b.setAttribute('aria-pressed',String(motion));b.setAttribute('aria-label',motion?'暂停环境动效':'开启环境动效');}$('#motion').onclick=()=>{motion=!motion;syncMotion();wake();};syncMotion();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]')&&mode!=='overview')go('overview');});
const musicTitles=['房间里有一把椅子','灯下的杯子','窗外经过'];
const musicFiles=['Judas 与 Ambrose/作品/房间里有一把椅子.wav','Ambrose/作品/灯下的杯子-长篇.wav','Judas 与 Ambrose/作品/窗外经过.wav'];
const audio=window.RoomHost?null:new Audio();
function receiveMusic(state){
 musicStatus={...musicStatus,...state};const button=$('#sound');button.classList.toggle('playing',musicStatus.playing);
 button.setAttribute('aria-label',(musicStatus.playing?'暂停':'播放')+'《'+musicStatus.title+'》');$('#sound-label').textContent=musicStatus.playing?'暂停':'听曲';
 if(mode==='music')showSelection('music');wake();
}
function musicSelect(index){
 if(!Number.isInteger(index)||index<0||index>=musicTitles.length)return;soundTouched=true;
 if(window.RoomHost){window.RoomHost.send('music-select',{index});return;}
 const rootURL=new URL('archive/',window.CatRulerRelease.root);
 musicStatus.index=index;musicStatus.title=musicTitles[index];audio.src=window.HerMedia?.audio(musicFiles[index])||new URL(musicFiles[index],rootURL).href;
 audio.play().then(()=>receiveMusic({playing:true})).catch(()=>{receiveMusic({playing:false});$('#room-hint').textContent='请再点一次播放';});
}
function musicToggle(){soundTouched=true;if(window.RoomHost){window.RoomHost.send('music-toggle');return;}if(!audio.src)musicSelect(musicStatus.index);else if(audio.paused)audio.play().catch(()=>{});else audio.pause();}
if(audio){audio.volume=.25;audio.preload='none';audio.id='music';document.body.append(audio);audio.addEventListener('play',()=>receiveMusic({playing:true}));audio.addEventListener('pause',()=>receiveMusic({playing:false}));audio.addEventListener('ended',()=>musicSelect((musicStatus.index+1)%musicTitles.length));}
$('#sound').onclick=musicToggle;
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=defaultFov();camera.updateProjectionMatrix();const portrait=innerWidth/innerHeight<.8;views.overview.p=portrait?[.08,2.76,9.8]:[.12,2.58,6.55];views.music.t=[.75,portrait?1.28:1.40,-1.65];if(mode==='overview'&&!travel){camera.position.fromArray(views.overview.p);target.fromArray(views.overview.t);}else if(selectedDrawer!==null&&!travel&&!pendingArt){setDrawerView(selectedDrawer);camera.fov=views.drawer.fov;camera.updateProjectionMatrix();camera.position.fromArray(views.drawer.p);target.fromArray(views.drawer.t);}}resize();addEventListener('resize',resize);
let shown=false,frameId=0,lastDraw=0,unavailable=false;
function wake(){if(!frameId&&active&&!document.hidden&&!unavailable&&!document.querySelector('dialog[open]'))frameId=requestAnimationFrame(render);}
function render(now){frameId=0;if(!active||document.hidden||unavailable||document.querySelector('dialog[open]'))return;wake();if(now-lastDraw<(travel?15:lightMode?40:32))return;lastDraw=now;const dt=Math.min(.04,(now-lastFrame)/1000||.016);lastFrame=now;if(motion)elapsed+=dt;
 if(travel){
  travel.t=Math.min(1,travel.t+dt/travel.d);const x=travel.t;
  // Ease visual distance rather than metres: a near book must not collapse
  // into a thumbnail in the first half-second of a long dolly backwards.
  const q=travel.portal?Math.max(0,Math.min(1,travel.returning?x/.90:(x-.065)/.935)):x;
  const e=q*q*q*(q*(q*6-15)+10),r=travel.ratio;
  const along=travel.portal?(travel.returning?(r-Math.pow(r,1-e))/(r-1):(Math.pow(r,e)-1)/(r-1)):e;
  camera.position.lerpVectors(travel.from,travel.to,along);camera.fov=travel.fovFrom+(travel.fovTo-travel.fovFrom)*e;camera.updateProjectionMatrix();
  if(travel.portal)camera.position.y+=Math.sin(Math.PI*e)*.10;
  target.lerpVectors(travel.a,travel.b,travel.portal?along:e);if(x===1)travel=null;
 }
 camera.lookAt(target);
 if(motion){tissue.rotation.z=-.12+Math.sin(elapsed*1.55)*.095*(life?.state.wind||.4);blindCord.rotation.z=(Math.sin(elapsed*1.42)*.068+Math.sin(elapsed*.73)*.018)*(life?.state.wind||.4);blindCord.rotation.x=Math.sin(elapsed*1.13)*.013;if(Math.floor(elapsed*6)!==Math.floor((elapsed-dt)*6))renderer.shadowMap.needsUpdate=true;for(let i=0;i<dusts.length;i++){const p=dusts[i];dustData[i*3]=p.x+Math.sin(elapsed*.16*p.speed+p.phase)*.10;dustData[i*3+1]=p.y+Math.sin(elapsed*.12+p.phase)*.13;dustData[i*3+2]=p.z+Math.cos(elapsed*.11+p.phase)*.07;}dustGeo.attributes.position.needsUpdate=true;}
 const holdDoors=false;doors.forEach((d,i)=>{const want=holdDoors?(i?1:-1)*Math.PI*.59:0;if(Math.abs(want-d.rotation.y)>.0005)renderer.shadowMap.needsUpdate=true;d.rotation.y+=(want-d.rotation.y)*(reduced?1:1-Math.exp(-dt*5));});
 if(pendingArt?.stage==='waiting'&&!travel)pendingArt.stage='opening';
 drawerGroups.forEach((g,i)=>{
  const chosen=selectedDrawer===i,want=chosen&&pendingArt?.stage!=='waiting'?.50:g.userData.homeZ;
  if(Math.abs(want-g.position.z)>.0005)renderer.shadowMap.needsUpdate=true;
  g.position.z+=(want-g.position.z)*(reduced?1:1-Math.exp(-dt*6));
  if(pendingArt?.index===i&&chosen&&g.position.z>.498){
   if(pendingArt.stage==='opening'&&!travel){
    setDrawerView(i);
    pendingArt.stage='approaching';moveTo('drawer');
   }else if(pendingArt.stage==='approaching'&&!travel){pendingArt.hold+=dt;if(pendingArt.hold>(reduced?.02:.40)){pendingArt=null;window.RoomReader?.art(i);}}
  }
 });

 for(const b of diaryBooks){
  const picked=b===pulledBook,flat=Math.abs(b.rotation.x)<.002&&Math.abs(b.position.y-b.userData.homeY)<.002;
  const want=picked?.60:flat?b.userData.homeZ+(b===hover?.035:0):b.position.z;
  const ease=reduced?1:1-Math.exp(-dt*7),clear=picked&&b.position.z>.565;
  if(Math.abs(b.position.z-want)>.0005||!flat)renderer.shadowMap.needsUpdate=true;
  b.position.z+=(want-b.position.z)*ease;b.position.y+=(b.userData.homeY+(clear?.04:0)-b.position.y)*ease;b.rotation.x+=((clear?-.08:0)-b.rotation.x)*ease;
  if(pendingDiary?.book===b&&clear&&!travel&&b.position.y>b.userData.homeY+.035){const read=pendingDiary;pendingDiary=null;window.RoomReader?.open(read.kind,read.person,read.day,read.entry);}
 }
 life?.tick(dt,motion);activity?.tick(dt,motion,life?.state.night||0);atmosphere?.tick(dt,motion);
  const lidTarget=mode==='music'?-1.12:-.10;if(Math.abs(lidTarget-musicLid.rotation.x)>.001)renderer.shadowMap.needsUpdate=true;musicLid.rotation.x+=(lidTarget-musicLid.rotation.x)*(reduced?1:1-Math.exp(-dt*5));
  if(motion&&musicStatus.playing){musicCylinder.rotation.y+=dt*.75;musicCrank.rotation.x-=dt*2.8;renderer.shadowMap.needsUpdate=true;}
  updateSpots();if(atmosphere?.enabled)atmosphere.render();else renderer.render(scene,camera);window.RoomHost?.frame?.();if(!shown){shown=true;$('#loading').hidden=true;}
}
document.addEventListener('visibilitychange',()=>{lastFrame=0;wake();});
new MutationObserver(wake).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
$('#scene').addEventListener('webglcontextlost',e=>{e.preventDefault();unavailable=true;$('#error').hidden=false;$('#error').textContent='三维画面暂时停下了，仍然可以阅读全部记录。';document.dispatchEvent(new CustomEvent('room:unavailable'));});
$('#quality').onclick=()=>{lightMode=!lightMode;atmosphere?.setQuality(lightMode);renderer.setPixelRatio(Math.min(devicePixelRatio,lightMode?1.15:1.65));$('#quality').setAttribute('aria-pressed',String(lightMode));$('#quality').textContent=lightMode?'精细绘制':'轻量绘制';resize();wake();};
$('#quality').setAttribute('aria-pressed',String(lightMode));$('#quality').textContent=lightMode?'精细绘制':'轻量绘制';
wake();
function bookCorners(){camera.updateMatrixWorld();book.updateWorldMatrix(true,false);return [[-.53,.030,-.30],[.53,.030,-.30],[.53,.030,.30],[-.53,.030,.30]].map(p=>{const v=book.localToWorld(new T.Vector3(...p)).project(camera);return [(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight];});}
window.RoomScene={ready:Promise.all(assetPromises).then(()=>{renderer.compile?.(scene,camera);renderer.render(scene,camera);}),go,enter,returnFromArt,returnBook,scene,camera,renderer,views,openDrawer,objects,life,activity,atmosphere,shelfPlacements,hit,details:{surfaces,floor,rugCloth,floorStacks,bagBody,musicCrank,musicCylinder,lampBase,lampHead,head,diffuser,lampLight,blindCord,tissue,windowFill},music:{select:musicSelect,toggle:musicToggle,receive:receiveMusic,get state(){return {...musicStatus};}},takeBook,readingBooks,wallParts,foldPanels,leftLegs,windowViews:{north:outside,west:sideView},doors,drawerGroups,emergingArt,diaryBooks,bookCorners,resize,get transitionProgress(){return travel?.t??1;},get navigationRevision(){return navRevision;},setActive(value){active=!!value;lastFrame=0;wake();},depart(){active=true;started=true;document.body.classList.add('entered');camera.position.fromArray(views.book.p);target.fromArray(views.book.t);mode='book';go('overview',true);},approach(){active=true;go('book',true);},get travelling(){return !!travel;},get mode(){return mode;},get selectedDrawer(){return selectedDrawer;},get motionEnabled(){return motion;},diagnostics:()=>({meshes:root.children.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,mode,version:T.REVISION})};
})();


