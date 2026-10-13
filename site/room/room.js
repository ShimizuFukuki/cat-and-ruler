/* An independently modelled room. Archive text is data, never executable instructions. */
(()=>{
'use strict';
const T=window.THREE,$=s=>document.querySelector(s),base=new URL('.',document.currentScript.src);
const mobile=matchMedia('(max-width:760px)').matches;let lightMode=mobile||!!navigator.connection?.saveData;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
try{renderer=new T.WebGLRenderer({canvas:$('#scene'),antialias:true,alpha:false,powerPreference:'default'});}catch(e){$('#loading').hidden=true;$('#error').hidden=false;$('#error').textContent='这个浏览器暂时无法绘制三维房间。请在支持 WebGL 的浏览器中打开。';return;}
// Render above CSS resolution, including on ordinary DPR=1 desktop displays.
function roomPixelRatio(){const desired=lightMode?Math.min(1.5,Math.max(1.25,devicePixelRatio)):2;const budget=lightMode?7000000:16000000;return Math.max(1,Math.min(desired,Math.sqrt(budget/Math.max(1,innerWidth*innerHeight))));}
renderer.setPixelRatio(roomPixelRatio());renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.LinearToneMapping;renderer.toneMappingExposure=1.0;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#b6b5c2');scene.fog=new T.FogExp2('#ccc7cf',.003);
const camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.06,80);const target=new T.Vector3();
const root=new T.Group();scene.add(root);const clickable=[],moving=[],dusts=[];let mode='arrival',selectedDrawer=null,started=false,motion=!reduced,dragging=false,lastFrame=0;
let seed=8371,soundTouched=false;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);return t;}
function texture(kind,color){return canvasTexture(16,16,c=>{c.fillStyle=color;c.fillRect(0,0,16,16);});}
const surfaces=window.createRoomMaterials(T,renderer);
function mat(color,kind='wood',extra={}){if(['wood','floor','paint','plaster','ceiling'].includes(kind))return Object.assign(surfaces.surface(kind,color),extra);const map=texture(kind,color);return surfaces.ink(Object.assign({color:0xffffff,map,bumpMap:map,bumpScale:kind==='fabric'?.0015:kind==='plaster'?.0003:.001,roughness:kind==='wood'?.86:kind==='fabric'?1:.94,metalness:0},extra));}
const M={wall:mat('#e4e1d5','plaster'),wallSide:mat('#e4e1d5','plaster'),wood:mat('#a98566'),woodLight:mat('#c8ab85'),woodDark:mat('#7b6260'),edge:mat('#bda17c'),green:mat('#78928b','paint'),greenDark:mat('#586e70','paint'),metal:surfaces.ink({color:'#485448',roughness:.49,metalness:.45}),brass:surfaces.ink({color:'#afa075',roughness:.6,metalness:.44}),paper:mat('#eee7ce','paper'),blue:mat('#506c7b','fabric'),rug:mat('#88819a','fabric'),cloth:mat('#ccb66b','fabric'),red:mat('#733f3b','fabric'),ivory:mat('#e6dfc9','fabric'),black:mat('#34393b','paper')};
M.green.roughness=.92;M.woodLight.roughness=.88;M.wood.roughness=.90;
const boxGeo=new T.BoxGeometry(1,1,1);
function box(w,h,d,m,x=0,y=0,z=0,parent=root,edges=false){const geometry=surfaces.geometry(w,h,d,m,x,y,z)||boxGeo;const o=new T.Mesh(geometry,m);o.scale.set(w,h,d);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);if(edges){const e=new T.LineSegments(new T.EdgesGeometry(geometry,35),new T.LineBasicMaterial({color:'#514b60',transparent:true,opacity:.65,depthWrite:false}));e.name='joinery-ink';o.add(e);}return o;}
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
const floor=box(7.38,.035,6.44,mat('#bda286','floor'),0,.003,.57);floor.name='oak-plank-floor';
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
const ceiling=wall(7.52,.16,6.52,mat('#f0eadf','ceiling'),0,4.20,.46);
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
const drawerBank=group(.92,.0385,.025,desk);for(const x of [-.34,.34])for(const z of [-.32,.32])box(.075,z<0?.088:.0805,.075,M.woodDark,x,z<0?.026:.02975,z,drawerBank);const deskDrawers=[];for(const y of [.23,.53,.83])box(.81,.045,.045,M.wood,0,y,.43,drawerBank);box(.81,.125,.045,M.wood,0,.188,.43,drawerBank);box(.87,1.1,.035,M.woodDark,0,.62,-.40,drawerBank);for(const x of [-.405,.405])box(.06,1.1,.83,M.woodDark,x,.62,0,drawerBank);for(const y of [.10,.25,.55,.85,1.17])box(.81,.035,.83,M.woodDark,0,y,0,drawerBank);for(let i=0;i<3;i++){const dg=group(0,.98-i*.30,.06,drawerBank);box(.79,.245,.035,M.wood,0,0,.40,dg,true);box(.70,.025,.72,M.woodLight,0,-.10,0,dg);box(.026,.19,.72,M.wood,-.35,-.014,0,dg);box(.026,.19,.72,M.wood,.35,-.014,0,dg);box(.70,.19,.024,M.wood,0,-.014,-.36,dg);rod([-.16,.0,.43],[.16,.0,.43],.012,M.brass,dg);dg.userData.dynamic=true;deskDrawers.push(dg);}
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
 const panel=new T.Mesh(geo,surfaces.ink({map:i===0?pageTex:i===1?innerTex:diaryPageTextures[i-2],roughness:1,side:T.DoubleSide}));panel.castShadow=true;panel.receiveShadow=true;book.add(panel);foldPanels.push(panel);
 rod([x0,y0,-panelDepth/2],[x0,y0,panelDepth/2],.0018,i===0?M.green:M.edge,book);
}
interactive(book,()=>window.RoomHost?window.RoomHost.send('return-book'):location.assign(new URL('../../03-deliverables/Her/index.html',base).href));

// One articulated lamp head: shell, recess, diffuser and light share its transform.
const lamp=group(-.83,1.326,-.335,desk);
const lampBase=cyl(.125,.14,.035,M.metal,0,0,0,lamp);lampBase.userData.structure=true;
rod([0,.02,0],[.06,.52,0],.022,M.metal,lamp);rod([.06,.52,0],[.61,.71,.04],.022,M.metal,lamp);
rod([.015,.05,.03],[.09,.50,.03],.007,M.brass,lamp);for(const p of [[0,.02,0],[.06,.52,0],[.61,.71,.04]])sphere(.036,M.metal,...p,lamp);
const lampHead=group(.62,.72,.04,lamp);lampHead.rotation.z=.10;lampHead.userData.structure=true;
const head=box(.77,.055,.16,M.metal,0,0,0,lampHead);head.userData.structure=true;
box(.718,.007,.125,M.black,0,-.030,0,lampHead);
const bulb=surfaces.ink({color:'#fff0d0',emissive:'#ffe3ad',emissiveIntensity:1.35,roughness:.5});
const diffuser=box(.684,.003,.093,bulb,0,-.034,0,lampHead);diffuser.castShadow=false;diffuser.userData.structure=true;
const lampLight=new T.SpotLight('#ffe1b1',2.8,3.6,Math.PI*.34,.8,1.6);lampLight.position.set(0,-.042,0);lampHead.add(lampLight);
const lampAim=group(.10,-.78,.12,lampHead);lampLight.target=lampAim;
lampLight.castShadow=!lightMode;lampLight.shadow.mapSize.set(512,512);lampLight.shadow.bias=-.0003;lampLight.shadow.normalBias=.025;lampLight.shadow.radius=4;

// Wall notes: small, unforced traces of a lived-in desk.
const noteColors=['#d4d9b7','#cfb0b8','#daca8a','#b0ccd0'];for(let i=0;i<6;i++){const x=-.89+(i%3)*.4,y=1.58+Math.floor(i/3)*.26;const g=group(x,y,-2.57);g.rotation.z=(rand()-.5)*.2;const nm=mat(noteColors[i%4],'paper');box(.20,.19,.005,nm,0,0,0,g);for(let j=0;j<3;j++)box(.12-rand()*.04,.003,.001,M.greenDark,0,.035-j*.026,.005,g);box(.08,.025,.002,M.ivory,0,.091,.004,g);}
// Tissue box and its paper, pencil cup, sharpener, tape dispenser and desk ruler.
const tissues=group(-1.24,1.378,.19,desk);box(.38,.14,.26,mat('#c1b07c','paper'),0,0,0,tissues);box(.25,.004,.034,M.black,0,.073,0,tissues);const tissueGeo=new T.PlaneGeometry(.20,.23,10,10);for(let i=0;i<tissueGeo.attributes.position.count;i++){const p=tissueGeo.attributes.position,x=p.getX(i),y=p.getY(i);p.setZ(i,Math.sin(x*33+y*10)*.014);p.setX(i,x*(.72+(y+.115)*1.2));}tissueGeo.computeVertexNormals();const tissue=new T.Mesh(tissueGeo,surfaces.ink({color:'#f1eedc',roughness:1,side:T.DoubleSide}));tissue.position.set(.015,.18,0);tissue.rotation.z=-.12;tissue.castShadow=true;tissues.add(tissue);
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

interactive(musicBox,()=>go('music'));
let musicStatus={index:0,playing:false,title:'房间里有一把椅子'};

// Stool with a cloth-covered seat and curved support stretchers.

const chair=group(-.35,-.02914,-.55);const seat=box(.60,.105,.58,M.blue,0,.72,0,chair);for(const x of [-.23,.23])for(const z of [-.21,.21]){rod([x,.70,z],[x*1.14,.06,z*1.14],.043,M.woodLight,chair);}rod([-.25,.25,-.22],[.25,.25,-.22],.023,M.wood,chair);rod([-.25,.28,.22],[.25,.28,.22],.023,M.wood,chair);shadow(.68,.65,.23,-.35,.0292,-.55);
// Bookcase with separate volumes. Broad paper edges, cloth bindings and titled spines.
const shelf=group(-2.42,.021,-1.75);box(1.3,1.74,.045,M.greenDark,0,.89,-.32,shelf);box(1.19,1.66,.025,M.woodDark,0,.89,-.29,shelf);for(const x of [-.64,.64])box(.065,1.795,.66,M.wood,x,.8975,0,shelf,true);for(const y of [.08,.45,.8975,1.32,1.74])box(1.34,.055,.66,M.woodLight,0,y,0,shelf,true);
box(.024,.365,.52,M.wood,0,1.530,.015,shelf);
const bookColors=['#a98673','#657f7c','#c4b17b','#686378','#9b6768','#577668','#c8c0a3','#738690','#826c57'];const bookM=bookColors.map(c=>mat(c,'fabric'));
function volume(w,h,d,m,parent,x,y,z,title,action){const g=group(x,y,z,parent);box(w-.015,h-.026,d-.024,M.paper,0,0,-.007,g);box(w,.014,d,m,0,h/2,0,g);box(w,.014,d,m,0,-h/2,0,g);box(w,h,.026,m,0,0,d/2,g,true);box(.009,h,d,m,-w/2,0,0,g);box(.009,h,d,m,w/2,0,0,g);for(const sy of [-.37,.37])box(w*.84,.008,.002,M.brass,0,h*sy,d/2+.014,g);if(title){const l=label(title,h*.74,w*.81,'#e5d7b7',null,46);l.rotation.z=Math.PI/2;l.position.set(0,0,d/2+.016);g.add(l);}if(action)interactive(g,action);return g;}
const diaryBooks=[];let pulledBook=null,pendingDiary=null;
function takeBook(b,person,kind='diary',day='all',entry=null){
 if(mode!=='shelf'){go('shelf');return;}if(travel)return;
 if(typeof bookCaption!=='undefined'){bookCaption.hidden=true;captionLink.setAttribute('hidden','');}pulledBook=b;pendingDiary={book:b,person,kind,day,entry};$('#selection').hidden=true;syncReadingFocus();wake();
}
function takeDiary(b,person,day){takeBook(b,person,'diary',day);}
const readingBooks=[];

// Four complete archives above a smaller, legible selection of literary works.
const shelfPlacements=[],bindingPalette={fiction:['#375c55','#485c76','#6b4860','#b08d55','#9b5b4e','#51665a'],poetry:['#a07651','#b48e5a'],essay:['#695068','#7a5e72'],translation:['#b2a178'],diary:['#365a50','#4b7260'],conversation:['#624758','#80566d']};
const shelfCollections=window.ROOM_COLLECTIONS.books,shelfFloors=[.1075,.4775,.925,1.3475];
// Full cloth compositions, shared with the coloured binding and end bands.
function archiveColor(record){return record.person==='Ambrose'?(record.kind==='diary'?'#254d48':'#35665e'):(record.kind==='diary'?'#713e50':'#414c70');}
function bookCloth(c,color,w,h){
 c.fillStyle=color;c.fillRect(0,0,w,h);
 c.save();c.globalAlpha=.075;c.strokeStyle='#f7eccb';c.lineWidth=1;
 for(let x=0;x<w;x+=6){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
 for(let y=0;y<h;y+=7){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}c.restore();
}
function archiveCover(record,color){return canvasTexture(768,1024,c=>{
 const ambrose=record.person==='Ambrose',conversation=record.kind==='conversation',ink='#fff0cd',gold=ambrose?'#cbb780':'#d7b08c';
 bookCloth(c,color,768,1024);
 // The design crosses the whole cloth, rather than sitting on a paper panel.
 if(ambrose){
  c.fillStyle=conversation?'#75a294':'#608e7c';c.beginPath();c.moveTo(56,681);c.bezierCurveTo(247,393,523,474,768,400);c.lineTo(768,1024);c.lineTo(56,1024);c.fill();
  c.fillStyle=conversation?'#b7ba89':'#bfac71';c.beginPath();c.moveTo(56,1024);c.lineTo(56,925);c.bezierCurveTo(300,790,397,717,768,742);c.lineTo(768,1024);c.fill();
  c.strokeStyle=gold;c.lineWidth=5;c.beginPath();c.moveTo(111,713);c.bezierCurveTo(274,453,509,538,724,462);c.stroke();
  if(conversation){c.strokeStyle='#ced5af';c.beginPath();c.moveTo(720,706);c.bezierCurveTo(530,474,274,608,93,528);c.stroke();}
 }else{
  c.fillStyle=conversation?'#756c8d':'#af745d';c.beginPath();c.moveTo(58,653);c.lineTo(768,458);c.lineTo(768,1024);c.lineTo(58,1024);c.fill();
  c.fillStyle=conversation?'#9a8392':'#ce9a77';c.beginPath();c.moveTo(294,1024);c.lineTo(768,701);c.lineTo(768,1024);c.fill();
  c.strokeStyle=gold;c.lineWidth=4;c.beginPath();c.moveTo(97,699);c.lineTo(725,526);c.stroke();
  if(conversation){c.strokeStyle='#d3c1b3';c.beginPath();c.moveTo(92,569);c.lineTo(713,780);c.stroke();}
 }
 // A contrasting hinge, foil rules and the author's name form one binding system.
 c.fillStyle=ambrose?'#173b37':'#302d48';c.fillRect(0,0,54,1024);
 c.fillStyle=gold;c.fillRect(62,55,4,914);c.fillRect(111,82,602,3);c.fillRect(111,960,602,3);
 c.fillStyle=ink;c.textBaseline='middle';c.textAlign='left';c.font='bold 208px SimSun,serif';c.fillText(conversation?'对话':'日记',111,300,590);
 c.font='34px Georgia,serif';c.fillText(conversation?'CONVERSATIONS':'DIARY',120,455,590);
 c.fillStyle=ambrose?'#183d35':'#302d48';c.fillRect(96,819,618,100);
 c.fillStyle=ink;c.font='bold 114px Georgia,serif';c.fillText(record.person,119,867,564);
 c.fillStyle=gold;c.font='32px SimSun,serif';c.fillText('完整档案',117,117,450);
});}
function coverTexture(record,color){
 if(record.hero)return archiveCover(record,color);
 return canvasTexture(768,1024,c=>{
  bookCloth(c,color,768,1024);const pale=['#b08d55','#b48e5a','#b2a178'].includes(color),ink=pale?'#243b36':'#fff0d1';
  const style=record.genre==='poetry'?2:record.genre==='translation'?3:Array.from(record.title).reduce((n,ch)=>n+ch.codePointAt(0),0)%3;
  c.fillStyle=pale?'#526a61':'#b7a881';
  if(style===0){c.fillRect(0,691,768,333);c.fillStyle=color;c.fillRect(48,751,672,212);}
  else if(style===1){c.save();c.globalAlpha=.32;c.beginPath();c.moveTo(0,803);c.lineTo(768,561);c.lineTo(768,1024);c.lineTo(0,1024);c.fill();c.restore();}
  else if(style===2){c.save();c.globalAlpha=.35;c.beginPath();c.moveTo(0,917);c.bezierCurveTo(239,535,461,741,768,629);c.lineTo(768,1024);c.lineTo(0,1024);c.fill();c.restore();}
  else{c.fillRect(0,0,114,1024);c.strokeStyle=ink;c.lineWidth=3;for(let x=132;x<=158;x+=13){c.beginPath();c.moveTo(x,68);c.lineTo(x,949);c.stroke();}}
  c.fillStyle=ink;c.textAlign='center';c.textBaseline='middle';
  const chars=Array.from(record.title),lines=[],lineLength=chars.length===4?2:3;for(let i=0;i<chars.length;i+=lineLength)lines.push(chars.slice(i,i+lineLength).join(''));
  c.font='bold '+(lines.length>2?117:159)+'px SimSun,serif';lines.forEach((line,i)=>c.fillText(line,style===3?442:384,428+(i-(lines.length-1)/2)*176,style===3?530:606));
  c.font='bold 76px Georgia,serif';c.fillText(record.person,style===3?442:384,828,style===3?510:604);
  c.fillRect(91,81,586,4);c.fillRect(91,939,586,4);
 });
}
function spineTexture(person,kind,record,color,flat=false){return canvasTexture(512,1536,c=>{
 bookCloth(c,color,512,1536);const pale=['#b08d55','#b48e5a','#b2a178'].includes(color),ink=pale?'#263b33':'#fff2d6',variant=Array.from(record.title).reduce((n,ch)=>n+ch.codePointAt(0),0)%3;
 c.fillStyle=pale?'#526a61':'#b4a27e';c.globalAlpha=.38;
 if(variant===0){c.fillRect(0,0,512,162);c.fillRect(0,1374,512,162);}else if(variant===1){c.fillRect(0,0,37,1536);c.fillRect(475,0,37,1536);}else{c.beginPath();c.moveTo(0,1400);c.lineTo(512,1262);c.lineTo(512,1536);c.lineTo(0,1536);c.fill();}c.globalAlpha=1;
 c.fillStyle=ink;c.textAlign='center';c.textBaseline='middle';
 if(flat){c.save();c.translate(256,768);c.rotate(Math.PI/2);c.font='bold '+Math.min(228,1300/Array.from(record.title).length)+'px SimSun,serif';c.fillText(record.title,0,0,1300);c.restore();return;}
 const title=Array.from(record.project?record.title:kind==='diary'?'日记':'对话'),size=Math.min(240,1120/title.length),spacing=size*1.05,first=755-(title.length-1)*spacing/2;
 c.font='bold '+size+'px SimSun,serif';title.forEach((char,i)=>c.fillText(char,256,first+i*spacing,430));c.fillRect(92,110,328,5);c.fillRect(92,1425,328,5);
});}

function createShelfBook(record,row,index,layout){
 const {w,h,d,x,z=0,lean=0,yaw=0,flat=false,cover=false,bottom=shelfFloors[row]}=layout,palette=bindingPalette[record.genre],color=record.hero?archiveColor(record):palette[index%palette.length];
 const anchor=group(0,0,0,shelf),binding=volume(w,h,d,mat(color,'fabric'),anchor,0,0,0,null,null);binding.rotation.z=flat?Math.PI/2:lean;binding.rotation.y=yaw;
 const face=new T.Mesh(new T.PlaneGeometry(w-.005,h-.009),surfaces.ink({map:cover?coverTexture(record,color):spineTexture(record.person,record.kind,record,color,flat),color:0xffffff,emissive:0x000000}));face.position.z=d/2+.017;face.receiveShadow=true;face.name='book-title-face';binding.add(face);
 if(record.hero){const accent=mat(record.person==='Ambrose'?'#cbb780':'#d7b08c','fabric');box(w-.015,.005,d-.013,accent,0,h/2-.010,0,binding);box(.006,h-.026,.003,accent,-w/2+.020,0,d/2+.019,binding);binding.name='author-cloth-binding';}
 anchor.updateWorldMatrix(true,true);const bounds=new T.Box3().setFromObject(anchor,true),size=bounds.getSize(new T.Vector3());anchor.position.set(x,bottom+size.y/2,.255-d/2+z);
 Object.assign(anchor.userData,{homeZ:anchor.position.z,homeY:anchor.position.y,person:record.person,kind:record.kind,day:record.day,entry:record.target,project:record.project,genre:record.genre,hero:!!record.hero,cover,bindingColor:color,bookThickness:w,bookHeight:h,horizontal:flat,title:record.title});
 interactive(anchor,()=>takeBook(anchor,record.person,record.kind,record.day,record.project||record.target));diaryBooks.push(anchor);if(record.hero)readingBooks.push(anchor);shelfPlacements.push({book:anchor,row,record});return size;
}
// Diary left, conversations right. Both authors face the visitor; no dated duplicates.
for(const [kind,centers] of [['diary',[-.432,-.162]],['conversation',[.162,.432]]]){
 const records=shelfCollections[3].filter(b=>b.hero&&b.kind===kind);
 records.forEach((record,i)=>createShelfBook(record,3,i,{w:.244,h:.321,d:.068,x:centers[i],cover:true}));
}
// Selected novels have room for their titles. The full collection stays in the reader.
const novelSelections={1:[0,2,3,4,6,7],2:[1,3,4,6,7,8]};
for(let row=1;row<=2;row++){
 let x=-.553;
 novelSelections[row].forEach((index,j)=>{
  const cover=j===0||j===2,w=cover?.215:.126,h=cover?.308:[.285,.312,.276,.296][j%4],d=cover?.064:.238,lean=j===5?-.025:0;
  const size=createShelfBook(shelfCollections[row][index],row,j,{w,h,d,x:x+w/2,cover,lean,z:cover?.010:[-.008,.004][j%2]});x+=size.x+.030;
 });
}
// Two poetry covers, three broad essay spines, and a translation cover.
let poemIndex=0,essayTop=shelfFloors[0];
for(let j=0;j<shelfCollections[0].length;j++){
 const record=shelfCollections[0][j];
 if(record.genre==='poetry'){createShelfBook(record,0,j,{w:.182,h:poemIndex?.250:.269,d:.061,x:poemIndex?-.268:-.480,cover:true,z:.014});poemIndex++;}
 else if(record.genre==='essay'){const size=createShelfBook(record,0,j,{w:.064,h:.302,d:.234,x:.063,flat:true,bottom:essayTop,z:(j%2)?.006:-.008});essayTop+=size.y+.005;}
 else createShelfBook(record,0,j,{w:.189,h:.256,d:.066,x:.431,cover:true,z:.010});
}
readingBooks.sort((a,b)=>['diary','conversation'].indexOf(a.userData.kind)-['diary','conversation'].indexOf(b.userData.kind)||a.userData.person.localeCompare(b.userData.person));

// Shelf titles belong on the spines; no floating plaque above the books.
const floorStacks=[];function stack(x,y,z,n,parent=root){const g=group(x,y,z,parent);g.userData.structure=true;g.userData.supportY=y;floorStacks.push(g);let top=0;for(let i=0;i<n;i++){const h=.040+rand()*.022;const b=volume(.30+rand()*.045,h,.43,bookM[i%9],g,(rand()-.5)*.025,top+h/2+.007,0,null,null);b.rotation.y=(rand()-.5)*.12;top+=h+.014;}return g;}
stack(-2.80,1.7885,-1.80,4);stack(-1.84,.021,-.82,6);stack(-1.93,.021,.56,3);stack(-2.17,.021,1.18,3);
// Keepsakes in the upper bay, miniature models one tier below, two closed drawers.
const cabinet=group(2.46,.021,-2.01);box(1.2,2.94,.045,M.greenDark,0,1.50,-.34,cabinet);
for(const x of [-.62,.62])box(.07,3.00,.73,M.green,x,1.500,0,cabinet,true);
for(const y of [.08,.99,1.15,1.50,1.85,2.20,2.99])box(1.31,.045,.75,M.green,0,y,0,cabinet,true);
box(1.19,.115,.045,M.green,0,1.07,.385,cabinet,true);
const doors=[group(-.59,.53,.410,cabinet),group(.59,.53,.410,cabinet)];
for(let i=0;i<2;i++){const sign=i?-1:1,d=doors[i];box(.579,.81,.045,M.green,sign*.29,0,0,d,true);box(.43,.61,.012,mat('#82917c','paint'),sign*.29,0,.027,d);sphere(.023,M.brass,sign*.50,.02,.049,d);interactive(d,()=>go('cabinet'));}
const door=doors[0],drawerGroups=[],drawerNames=['独立网页','绘画与插图','数学研究','自然与实验','数据研究'];
for(let i=0;i<2;i++){
 const dg=group(0,1.335+i*.35,.10,cabinet);dg.userData.dynamic=true;
 box(1.09,.026,.53,M.woodLight,0,-.125,0,dg);box(.025,.23,.53,M.woodDark,-.54,-.005,0,dg);box(.025,.23,.53,M.woodDark,.54,-.005,0,dg);
 box(1.19,.316,.050,M.green,0,0,.285,dg,true);box(1.035,.228,.012,mat('#82917c','paint'),0,0,.315,dg);box(1.08,.23,.022,M.woodDark,0,-.005,-.255,dg);
 for(const x of [-.12,.12])rod([x,0,.326],[x,0,.359],.010,M.brass,dg);rod([-.12,0,.359],[.12,0,.359],.011,M.brass,dg);
 box(1.04,.005,.485,M.ivory,0,-.109,0,dg);
 for(const x of [-.557,.557])box(.018,.025,.66,M.metal,x,1.22+i*.35,.02,cabinet);
 Object.assign(dg.userData,{homeZ:.10,drawerIndex:i,place:'cabinet',collection:['web','art-drawer'][i]});drawerGroups.push(dg);interactive(dg,()=>openDrawer(i));
}
deskDrawers.forEach((dg,j)=>{const i=drawerGroups.length;Object.assign(dg.userData,{homeZ:.06,drawerIndex:i,place:'research',collection:['math','science','data'][j]});drawerGroups.push(dg);interactive(dg,()=>openDrawer(i));});
const emergingArt=[],artMaps=[];
for(let i=0;i<3;i++){const tex=new T.TextureLoader().load(window.ROOM_ART_TEXTURES[i]);tex.colorSpace=T.SRGBColorSpace;artMaps.push(tex);}
function noteTexture(kind){return canvasTexture(512,512,c=>{
 c.fillStyle='#eee6cc';c.fillRect(0,0,512,512);c.strokeStyle='#66756b';c.lineWidth=3;
 for(let j=0;j<5;j++){c.beginPath();c.moveTo(45,42+j*22);c.lineTo(310+(j%3)*47,42+j*22);c.stroke();}
 c.lineWidth=2;c.strokeStyle='#9aab9e';for(let j=0;j<7;j++){c.beginPath();c.moveTo(47,220+j*32);c.lineTo(463,220+j*32);c.stroke();}
 c.strokeStyle=kind==='science'?'#65805b':'#737995';c.lineWidth=4;c.beginPath();
 if(kind==='science'){c.moveTo(270,414);c.bezierCurveTo(180,330,290,245,240,170);for(let j=0;j<5;j++){c.moveTo(235,350-j*31);c.quadraticCurveTo(180,325-j*31,181,304-j*31);c.moveTo(240,333-j*31);c.quadraticCurveTo(315,305-j*31,307,287-j*31);}}
 else{for(let j=0;j<70;j++){const x=68+j*5.3,y=330-Math.sin(j*.13)*58-(kind==='data'?(j%5)*6:0);j?c.lineTo(x,y):c.moveTo(x,y);}}c.stroke();
});}
function loosePaper(parent,x,y,z,w,d,angle,map){const piece=group(x,y,z,parent);piece.rotation.y=angle;piece.name='loose-paper';box(w,.003,d,M.paper,0,0,0,piece);const page=new T.Mesh(new T.PlaneGeometry(w-.015,d-.015),surfaces.ink({map,roughness:1}));page.rotation.x=-Math.PI/2;page.position.y=.0017;piece.add(page);return piece;}
for(let i=0;i<drawerGroups.length;i++){
 const card=group(0,i<2?-.100:-.080,0,drawerGroups[i]);card.userData.dynamic=true;card.name='drawer-contents';emergingArt.push(card);
 const right=i<2,kind=drawerGroups[i].userData.collection,map=noteTexture(kind),palette=[M.blue,M.greenDark,M.red];
 // Bound notebooks sit under loose pages; overlaps are layered at different heights.
 for(let j=0;j<3;j++){const notebook=volume(right?.43:.36,.035,right?.29:.26,palette[j],card,right?-.25+j*.025:-.13+j*.03,.023+j*.049,right?-.02+j*.010:-.13+j*.02,null,null);notebook.rotation.y=[-.12,.07,-.06][j];notebook.name='research-notebook';}
 for(let j=0;j<6;j++){
  const x=right?.18+[-.05,.07,-.02,.03,-.08,.04][j]:.105+[-.04,.015,-.07,.04,-.02,.015][j],z=right?[-.07,.07,-.025,.02,.045,-.05][j]:[.15,.17,.03,.09,-.03,.13][j];
  let pageMap=map;if(i===1){pageMap=new T.TextureLoader().load(window.ROOM_DRAWER_THUMBS?.[j]||window.ROOM_ART_TEXTURES[j%3]);pageMap.colorSpace=T.SRGBColorSpace;}
  loosePaper(card,x,.015+j*.011,z,right?.32:.31,right?.19:.23,[-.17,.11,-.24,.07,.20,-.09][j],pageMap);
 }
 const pencil=group(right?-.12:-.22,.151,right?.04:.13,card);pencil.rotation.y=.35;rod([0,0,-.14],[0,0,.12],.006,M.wood,pencil);rod([0,0,.12],[0,0,.14],.003,M.black,pencil);pencil.name='drawer-pencil';
}
const modelBay=group(0,1.8735,.02,cabinet);modelBay.userData.dynamic=true;modelBay.name='work-model-display';
// Three keepsakes remain in place together. The collection page contains all five originals.
const exhibitModels=new Map(),displayModels=['shallow-bay','blue-cup','kite'];
const modelPlacements={
 'shallow-bay':{x:-.31,z:.035,yaw:-.12,fit:[.44,.225,.34]},
 'blue-cup':{x:.065,z:.095,yaw:.18,fit:[.19,.205,.22]},
 'kite':{x:.36,z:-.045,yaw:-.08,fit:[.27,.264,.27]}
};
interactive(modelBay,()=>window.RoomReader?.art('models'));
// The whole clear aperture is clickable, including the spaces between exhibits.
// An invisible material keeps this ray target out of every render pass.
const modelWindowHit=new T.Mesh(new T.PlaneGeometry(1.16,.305),new T.MeshBasicMaterial({visible:false,side:T.DoubleSide}));
modelWindowHit.name='model-window-hit-area';modelWindowHit.position.set(0,.1525,.36);modelBay.add(modelWindowHit);
const modelPromises=Object.entries(window.ROOM_WORK_MODELS||{}).map(([id,data])=>new Promise(resolve=>{
 const bytes=Uint8Array.from(atob(data),c=>c.charCodeAt(0));
 new window.RoomGLTF.GLTFLoader().parse(bytes.buffer,'',gltf=>{
  const obj=gltf.scene,placement=modelPlacements[id];
  // The cup's original studio floor is staging, not part of the cabinet miniature.
  if(id==='blue-cup')obj.getObjectByName('背景地面')?.removeFromParent();
  obj.rotation.y=placement?.yaw||0;obj.updateMatrixWorld(true);
  const bounds=new T.Box3().setFromObject(obj,true),size=bounds.getSize(new T.Vector3()),fit=placement?.fit||[.25,.26,.25];
  const scale=Math.min(fit[0]/size.x,fit[1]/size.y,fit[2]/size.z);obj.scale.multiplyScalar(scale);obj.updateMatrixWorld(true);
  bounds.setFromObject(obj,true);const center=bounds.getCenter(new T.Vector3());obj.position.set((placement?.x||0)-center.x,-bounds.min.y+.002,(placement?.z||0)-center.z);
  obj.name='exhibit-'+id;obj.traverse(o=>{if(o.isMesh){o.material=surfaces.fromMaterial(o.material);o.castShadow=true;o.receiveShadow=true;}});
  obj.visible=!!placement;modelBay.add(obj);exhibitModels.set(id,obj);renderer.shadowMap.needsUpdate=true;wake();resolve();
 },undefined,()=>resolve());
}));assetPromises.push(...modelPromises);

// A square window image on the second fold, with the original aspect ratio.
const miniatureGeo=new T.BufferGeometry(),photoX0=-.240,photoX1=-.025,photoZ0=-.160,photoZ1=.055;
const paperY=x=>foldRise-(x+panelWidth)/panelWidth*(foldRise-.005)+.001;
miniatureGeo.setAttribute('position',new T.Float32BufferAttribute([photoX0,paperY(photoX0),photoZ0,photoX0,paperY(photoX0),photoZ1,photoX1,paperY(photoX1),photoZ1,photoX1,paperY(photoX1),photoZ0],3));miniatureGeo.setAttribute('uv',new T.Float32BufferAttribute([0,1,0,0,1,0,1,1],2));miniatureGeo.setIndex([0,1,2,0,2,3]);miniatureGeo.computeVertexNormals();book.add(new T.Mesh(miniatureGeo,surfaces.ink({map:artMaps[0],roughness:1,side:T.DoubleSide})));
const postcard=group(-1.31,1.461303423,-1.955);postcard.rotation.x=-.10;postcard.rotation.z=0;box(.38,.265,.01,M.paper,0,0,0,postcard);const postcardPicture=new T.Mesh(new T.PlaneGeometry(.345,.2156),surfaces.ink({map:artMaps[2],roughness:1}));postcardPicture.position.z=.008;postcard.add(postcardPicture);box(.40,.025,.145,M.wood,0,-.132,.01,postcard);rod([-.14,-.12,-.005],[-.14,-.115,-.10],.008,M.wood,postcard);rod([.14,-.12,-.005],[.14,-.115,-.10],.008,M.wood,postcard);
postcard.updateWorldMatrix(true,true);postcard.position.y+=1.3075-new T.Box3().setFromObject(postcard,true).min.y;
const stickerTex=canvasTexture(128,128,c=>{c.fillStyle='#d7c7ab';c.beginPath();c.arc(64,64,57,0,7);c.fill();c.strokeStyle='#806f62';c.lineWidth=3;c.beginPath();c.arc(64,64,50,0,7);c.stroke();c.fillStyle='#748678';c.beginPath();c.ellipse(65,72,31,18,0,0,7);c.fill();c.beginPath();c.arc(42,68,16,0,7);c.fill();c.beginPath();c.moveTo(28,62);c.lineTo(30,45);c.lineTo(42,56);c.moveTo(42,54);c.lineTo(51,45);c.lineTo(55,63);c.fill();c.strokeStyle='#435848';c.lineWidth=2;c.beginPath();c.moveTo(33,68);c.quadraticCurveTo(37,74,42,68);c.stroke();});
const sticker=new T.Mesh(new T.PlaneGeometry(.18,.18),surfaces.ink({map:stickerTex,transparent:true,roughness:1}));sticker.position.set(.23,-.14,.043);door.add(sticker);
// Teddy, storage box and books on top: sculpted shapes keep the room recognisable.
const teddyMat=mat('#9b8060','fabric'),teddyNose=mat('#4d453b','fabric');const teddy=group(-.20,2.3495,.10,cabinet);sphere(.21,teddyMat,0,.15,0,teddy,[1,.95,.72]);sphere(.15,teddyMat,0,.40,0,teddy,[1,1,.80]);sphere(.065,teddyMat,-.11,.52,0,teddy);sphere(.065,teddyMat,.11,.52,0,teddy);sphere(.082,teddyMat,-.20,.10,.03,teddy,[.75,1.5,1]);sphere(.082,teddyMat,.20,.10,.03,teddy,[.75,1.5,1]);sphere(.095,teddyMat,-.105,-.03,.08,teddy);sphere(.095,teddyMat,.105,-.03,.08,teddy);sphere(.013,teddyNose,-.053,.42,.113,teddy);sphere(.013,teddyNose,.053,.42,.113,teddy);sphere(.022,teddyNose,0,.365,.132,teddy);const bow=group(0,.275,.137,teddy);const ribbonMat=mat('#976365','fabric');
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
stack(2.77,2.2435,-1.98,3);
// Bed, quilt seams, folds and embroidered dots along the edge.
const bed=group(2.72,.021,.9);box(1.37,.40,2.89,M.woodDark,0,.31,0,bed,true);for(const x of [-.60,.60])for(const z of [-1.3,1.3])box(.09,.3,.09,M.wood,x,.15,z,bed);box(1.40,.49,.095,M.wood,0,.71,-1.41,bed,true);box(1.33,.22,2.79,M.ivory,0,.61,0,bed);
const quiltMat=surfaces.ink({color:'#d7bb73',side:T.FrontSide});
// Broad cloth folds; side and foot drapes start outside the mattress edges.
const qGeo=new T.PlaneGeometry(2,2,36,48),qPos=qGeo.attributes.position;
for(let i=0;i<qPos.count;i++){
 const u=qPos.getX(i),v=(qPos.getY(i)+1)/2,a=Math.abs(u),side=Math.max(0,(a-.80)/.20);
 const x=Math.sign(u)*(a<=.80?a/.80*.665:.665+side*.15),z=-.73+v*2.28,foot=Math.max(0,(z-1.395)/.155);
 const height=.775+.010*Math.sin(v*8+u*3)+.008*Math.cos(u*9+v*4)-side*side*.22-foot*foot*.26;
 qPos.setXYZ(i,x,height,z);
}
// XY -> XZ reversed winding. Face the quilt upward before computing normals.
for(let i=0;i<qGeo.index.count;i+=3){const b=qGeo.index.getX(i+1);qGeo.index.setX(i+1,qGeo.index.getX(i+2));qGeo.index.setX(i+2,b);}
qGeo.index.needsUpdate=true;qGeo.computeVertexNormals();const quilt=new T.Mesh(qGeo,quiltMat);quilt.name='bed-quilt';quilt.castShadow=true;quilt.receiveShadow=false;bed.add(quilt);
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

const bin=group(.80,.2930,-.22);const binMaterial=M.black.clone();binMaterial.side=T.DoubleSide;const binShell=new T.Mesh(new T.CylinderGeometry(.24,.18,.53,24,1,true),binMaterial);binShell.castShadow=true;binShell.receiveShadow=true;bin.add(binShell);cyl(.18,.18,.008,M.black,0,-.261,0,bin);const binRim=new T.Mesh(new T.TorusGeometry(.238,.009,6,32),M.black);binRim.rotation.x=Math.PI/2;binRim.position.y=.265;bin.add(binRim);for(let i=0;i<13;i++){const o=new T.Mesh(new T.IcosahedronGeometry(.07+rand()*.04,0),M.paper);o.position.set((rand()-.5)*.30,.27+rand()*.08,(rand()-.5)*.30);o.rotation.set(rand(),rand(),rand());bin.add(o);o.castShadow=true;}const groundPaper=[];for(const p of [[1.02,.12,.36],[.55,.10,.65]]){const o=new T.Mesh(new T.IcosahedronGeometry(.065,0),M.paper);o.geometry.computeBoundingBox();o.position.set(p[0],.031-o.geometry.boundingBox.min.y,p[2]);o.name='floor-paper-ball-'+groundPaper.length;o.castShadow=true;root.add(o);groundPaper.push(o);}
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
const hemi=new T.HemisphereLight('#d5e4e7','#96806b',1.0);scene.add(hemi);const sun=new T.DirectionalLight('#ffe9c5',2.05);sun.position.set(-3.1,4.2,-5);sun.target.position.set(.6,.3,1.4);scene.add(sun,sun.target);sun.castShadow=true;sun.shadow.mapSize.set(lightMode?1024:2048,lightMode?1024:2048);Object.assign(sun.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.5,far:18});sun.shadow.bias=-.00035;sun.shadow.normalBias=.032;sun.shadow.radius=3;
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
const activity=window.createRoomActivity?.({T,root,box,sphere,rod,group,curve,shadow,M,assetPromises,illustrate:surfaces.fromMaterial,groundObstacles:groundPaper,camera});
const atmosphere=window.createRoomAtmosphere?.({T,renderer,scene,camera,sun,lampLight,life,lightMode});
const objects={bin,musicBox,desk,shelf,cabinet,bed,night,chair,bag,tote,book,lamp,tissues,postcard,clock,teddy,quilt,rug,architecture,sideWin,win};quilt.userData.dynamic=true;for(const [name,obj] of Object.entries(objects)){obj.name=name;obj.userData.structure=true;obj.userData.componentName=window.CatRulerNames?.objects?.[name]?.name||name;}
interactive(shelf,()=>go('shelf'));interactive(cabinet,()=>go('cabinet'));interactive(desk,()=>go('desk'));
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
const views={arrival:{p:[.55,2.36,1.23],t:[-.43,1.29,-1.5]},book:{p:[-.42,1.9,-.94],t:[-.42,1.362,-1.37]},overview:{p:mobile?[.08,2.76,9.8]:[.12,2.58,6.55],t:[0,1.48,-1.10]},shelf:{p:[-2.25,1.26,.50],t:[-2.42,.96,-1.52]},desk:{p:[1.23,2.76,1.36],t:[-.27,1.26,-1.57]},cabinet:{p:[1.16,2.64,1.44],t:[2.35,1.94,-1.95]},research:{p:[1.33,1.96,.63],t:[.88,.85,-1.11]},models:{p:[2.36,2.30,.23],t:[2.46,2.04,-1.85]},music:{p:[.80,1.99,-.39],t:[.75,1.40,-1.65]},drawer:{p:[2.40,2.50,-.08],t:[2.46,1.30,-1.44]}};
camera.position.fromArray(views.arrival.p);target.fromArray(views.arrival.t);camera.lookAt(target);
let travel=null,drift=new T.Vector2(),mouse=new T.Vector2(),ray=new T.Raycaster(),down=null,hover=null,elapsed=0,navRevision=0,pendingArt=null,active=true;
function defaultFov(){return innerWidth/innerHeight<.8?58:innerWidth/innerHeight<1.35?50:43;}
function setShelfView(){
 const portrait=camera.aspect<.8,sideNotes=innerWidth>900||(innerWidth>760&&innerHeight<500),aim=new T.Vector3(-2.42,portrait?.10:.94,-1.49),probe=camera.clone();probe.fov=defaultFov();probe.updateProjectionMatrix();
 const corners=[];for(const x of [-3.10,-1.74])for(const y of [.021,1.82])corners.push(new T.Vector3(x,y,-1.40));
 for(let z=.40;z<5;z+=.04){probe.position.set(-2.26,portrait?1.34:1.44,z);probe.lookAt(aim);probe.updateMatrixWorld(true);if(corners.every(p=>{const q=p.clone().project(probe);return Math.abs(q.x)<(sideNotes?(innerWidth<=1100?.28:.48):.88)&&q.y<(portrait?.70:.82)&&q.y>(portrait?.04:-.84);}))break;}
 views.shelf.p=probe.position.toArray();views.shelf.t=aim.toArray();views.shelf.fov=probe.fov;
}
function setModelView(){
 const portrait=camera.aspect<.8,aim=new T.Vector3(2.46,portrait?1.90:2.04,-1.85),probe=camera.clone();probe.fov=defaultFov();probe.updateProjectionMatrix();
 const corners=[];for(const x of [1.84,3.08])for(const y of [1.89,2.18])for(const z of [-2.25,-1.65])corners.push(new T.Vector3(x,y,z));
 for(let distance=1.2;distance<5;distance+=.04){probe.position.copy(aim).add(new T.Vector3(-.06,.14,1).multiplyScalar(distance));probe.lookAt(aim);probe.updateMatrixWorld(true);if(corners.every(p=>{const q=p.clone().project(probe);return Math.abs(q.x)<.85&&q.y<(portrait?.72:.8)&&q.y>(portrait?-.12:-.8);}))break;}
 views.models.p=probe.position.toArray();views.models.t=aim.toArray();views.models.fov=probe.fov;
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
 travel={from,to,fovFrom:camera.fov,fovTo:v.fov||defaultFov(),a:target.clone(),b:new T.Vector3(...v.t),t:0,d:reduced?.02:portal?3.05:name==='drawer'?1.10:1.7,portal,returning:name==='book',ratio:Math.max(1.01,far/near)};document.body.classList.remove('reading-ready');document.body.classList.add('reading-moving');wake();
}
function go(name,portal=false){
 // First discover the cabinet; the display window is a second, closer view.
 if(name==='models'&&mode!=='cabinet'&&mode!=='models')name='cabinet';
 if(!views[name])return;if(!started)enter();if(name==='shelf')setShelfView();if(name==='models')setModelView();const same=mode===name;++navRevision;mode=name;
 pulledBook=null;pendingDiary=null;pendingArt=name==='models'?{stage:'model-focus'}:null;selectedDrawer=null;$('#selection').hidden=true;
 bookCaption.hidden=true;captionLink.setAttribute('hidden','');document.body.dataset.place=name;document.body.classList.toggle('focusing',name!=='overview');$('#overview').hidden=name==='overview'||name==='book';
 document.querySelectorAll('[data-place]').forEach(b=>b.classList.toggle('active',b.dataset.place===name));
 if(!same||portal)moveTo(name,portal);$('#room-hint').textContent='';
 if(same&&!travel&&!pendingArt&&['shelf','desk','research','cabinet','models','music'].includes(name))showSelection(name);syncReadingFocus();wake();
}
function enter(){if(started)return;started=true;document.body.classList.add('entered');$('#welcome').setAttribute('aria-hidden','true');mode='overview';moveTo('overview');}
function choose(labelText,action,small){const b=document.createElement('button');const em=document.createElement('em');em.textContent=labelText;b.append(em);const s=document.createElement('span');s.textContent=small||'翻开 ↗';b.append(s);b.onclick=action;return b;}
const coverPreviewCache=new WeakMap();
function bookPreviewURL(b){
 if(coverPreviewCache.has(b))return coverPreviewCache.get(b);
 const record=shelfPlacements.find(p=>p.book===b)?.record;if(!record)return '';
 const texture=coverTexture(record,b.userData.bindingColor),canvas=document.createElement('canvas');canvas.width=144;canvas.height=192;canvas.getContext('2d').drawImage(texture.image,0,0,144,192);
 const url=canvas.toDataURL?.('image/png')||'';texture.dispose();coverPreviewCache.set(b,url);return url;
}
function syncReadingFocus(){
 const ready=!travel&&['shelf','desk','research','cabinet','models','music'].includes(mode)&&!$('#selection').hidden;
 document.body.classList.toggle('reading-moving',!!travel);
 document.body.classList.toggle('reading-ready',ready);
}
function showSelection(name){
 const panel=$('#selection'),body=$('#selection-body');body.replaceChildren();panel.dataset.place=name;
 $('#selection-eyebrow').textContent=({desk:'窗前书写 · 留下长笺',research:'翻阅手稿 · 研究与实验',models:'实物预览 · 完整模型集',music:'收藏的旋律',cabinet:'画作与互动作品'})[name]||'';
 if(name==='shelf'){
  $('#selection-title').textContent='书架';
  $('#selection-eyebrow').textContent='日记与对话 · 完整档案';
  const archives=document.createElement('div');archives.className='archive-index';
  for(const person of ['Ambrose','Judas']){
   const group=document.createElement('section');group.className='archive-group';group.dataset.author=person;group.dataset.initial=person[0];group.setAttribute('aria-label',person+'的完整档案');
   const heading=document.createElement('h3');heading.textContent=person;group.append(heading);
   for(const [kind,title] of [['diary','日记'],['conversation','对话']]){const b=readingBooks.find(b=>b.userData.kind===kind&&b.userData.person===person);if(!b)continue;const button=choose(title,()=>takeBook(b,person,kind),'↗');button.className='archive-volume';button.setAttribute('aria-label',person+'的'+title+'，完整档案');const cover=document.createElement('img');cover.className='archive-cover';cover.alt='';cover.src=bookPreviewURL(b);cover.width=144;cover.height=192;button.prepend(cover);group.append(button);}archives.append(group);
  }
  const literature=document.createElement('div');literature.className='literary-index';literature.setAttribute('aria-label','文学作品分类');
  for(const [genre,title] of [['fiction','小说'],['poetry','诗歌'],['essay','随笔与文章'],['translation','译作']]){const button=choose(title,()=>window.RoomReader?.art('shelf-'+genre),'↗');button.setAttribute('aria-label','浏览'+title+'作品');literature.append(button);}
  body.append(archives,literature);
 }else if(name==='desk'){
  $('#selection-title').textContent='书桌';body.append(choose('长笺',()=>book.userData.action(),'展开'),choose('共同留言',()=>window.RoomReader.open('letters','Ambrose'),'阅读'));
 }else if(name==='research'){
  $('#selection-title').textContent='研究笔记';[2,3,4].forEach(i=>body.append(choose(drawerNames[i],()=>openDrawer(i),'拉开')));
 }else if(name==='models'){
  $('#selection-title').textContent='模型展格';body.append(choose('查看全部模型',()=>window.RoomReader?.art('models'),'进入 ↗'));
 }else if(name==='music'){
  $('#selection-title').textContent='音乐盒';
  body.append(choose('全部音乐',()=>window.RoomReader?.art('music'),'翻阅'));musicTitles.forEach((title,i)=>body.append(choose(title,()=>musicSelect(i),'播放')));
  body.append(choose(musicStatus.playing?'暂停':'播放',musicToggle,'当前曲目'));
 }else{
  $('#selection-title').textContent='作品柜';[1,0].forEach(i=>body.append(choose(drawerNames[i],()=>openDrawer(i),'拉开')));body.append(choose('模型展格',()=>go('models'),'聚焦')); 
 }panel.hidden=false;syncReadingFocus();
}
function openDrawer(i){if(!Number.isInteger(i)||i<0||i>=drawerGroups.length)return;if(selectedDrawer===i){returnFromArt();return;}const place=drawerGroups[i].userData.place;if(mode!==place){go(place);return;}if(travel)return;++navRevision;selectedDrawer=i;pendingArt={index:i,stage:travel?'waiting':'opening'};$('#selection').hidden=true;syncReadingFocus();wake();}
function showDrawerCollection(i){
 if(selectedDrawer!==i||mode!==drawerGroups[i].userData.place)return;
 $('#selection').hidden=true;syncReadingFocus();window.RoomReader?.art(drawerGroups[i].userData.collection);
}
function returnFromArt(){++navRevision;window.RoomReader?.cancelPending?.();const hadDrawer=selectedDrawer!==null;selectedDrawer=null;pendingArt=null;if(mode==='models'){go('cabinet');return;}if(['cabinet','desk','research'].includes(mode)){if(hadDrawer)moveTo(mode);showSelection(mode);}wake();}
function returnBook(){pulledBook=null;pendingDiary=null;if(['shelf','desk'].includes(mode))showSelection(mode);wake();}
// Region names are screen overlays; the joinery itself contains no inscriptions.
function areaOf(obj){for(let p=obj;p;p=p.parent){if(p===musicBox)return 'music';if(p===shelf)return 'shelf';if(p===modelBay)return 'models';if(p.userData.drawerIndex>=2)return 'research';if(p===cabinet)return 'cabinet';if(p===desk||p===lamp)return 'desk';}return null;}
function activate(obj){if(!obj||travel)return;const area=areaOf(obj);if(area&&mode!==area){go(area);return;}obj.userData.action?.();}
const regionSpots=[
 ['shelf','书架 · 日记与对话',[-2.42,1.75,-1.39]],
 ['desk','书桌',[-.48,1.31,-1.03],'below'],
 ['research','研究笔记',[.89,.68,-.78],'below'],
 ['music','音乐盒',[.80,1.59,-1.42]],
 ['models','模型展格',[2.46,2.20,-1.53]],
 ['cabinet','绘画与网页',[2.46,1.30,-1.53],'below']
].map(([place,title,point,side])=>{
 const button=document.createElement('button');button.className='hotspot region-spot'+(side==='below'?' below-spot':'');button.textContent=title;const wash=document.createElement('span');wash.className='region-wash';wash.setAttribute('aria-hidden','true');button.prepend(wash);button.setAttribute('aria-label','聚焦'+title);button.dataset.region=place;button.onclick=()=>{if(!travel)go(place);};$('#hotspots').append(button);return {button,point:new T.Vector3(...point),place,side};
});
// Categories live in the reading index and never cover the physical books.
const shelfSectionSpots=[];
function screenPoint(point){const p=point.clone().project(camera);return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,visible:p.z>-1&&p.z<1};}
function updateSpots(){
 const overview=started&&mode==='overview'&&!travel;
 for(const {button,point,place} of regionSpots){const p=screenPoint(point);if(innerWidth<=760&&place==='music')p.y+=4;button.hidden=!overview||!p.visible;button.style.left=Math.max(88,Math.min(innerWidth-88,p.x))+'px';button.style.top=Math.max(115,Math.min(innerHeight-160,p.y))+'px';}

}

// A title-led annotation points to the current book without covering it.
document.body.dataset.readingDesign='covers';
const bookCaption=document.createElement('div');bookCaption.id='book-caption';bookCaption.hidden=true;bookCaption.setAttribute('role','tooltip');document.body.append(bookCaption);
const captionGenre=document.createElement('span');captionGenre.className='caption-genre';
const captionTitle=document.createElement('strong');captionTitle.className='caption-title';
const captionMeta=document.createElement('span');captionMeta.className='caption-meta';
const captionHint=document.createElement('span');captionHint.className='caption-hint';
const captionByline=document.createElement('div');captionByline.className='caption-byline';captionByline.append(captionGenre,captionMeta);
const captionCover=document.createElement('img');captionCover.className='caption-cover';captionCover.alt='';captionCover.width=144;captionCover.height=192;
bookCaption.append(captionCover,captionByline,captionTitle,captionHint);
const captionLink=document.createElementNS('http://www.w3.org/2000/svg','svg');captionLink.id='book-caption-link';captionLink.setAttribute('hidden','');captionLink.setAttribute('aria-hidden','true');
const captionPath=document.createElementNS('http://www.w3.org/2000/svg','path'),captionDot=document.createElementNS('http://www.w3.org/2000/svg','circle'),captionTrace=document.createElementNS('http://www.w3.org/2000/svg','path');captionTrace.classList.add('book-trace');captionDot.setAttribute('r','2.5');captionLink.append(captionPath,captionTrace,captionDot);document.body.append(captionLink);
function updateBookCaption(event){
 const data=hover?.userData,title=data?.title;bookCaption.hidden=!title||mode!=='shelf'||!!travel||!!pendingDiary;
 captionLink.toggleAttribute('hidden',bookCaption.hidden);if(bookCaption.hidden)return;
 const genres={fiction:'小说',poetry:'诗歌',essay:'随笔与文章',translation:'译作',diary:'日记',conversation:'对话'};
 captionGenre.textContent=data.hero?'完整档案':genres[data.genre]||genres[data.kind]||'作品';captionTitle.textContent=data.hero?(genres[data.kind]||title):title;captionMeta.textContent=data.person;captionHint.textContent=data.hero?'翻阅完整档案 ↗':'点击翻阅 ↗';captionCover.src=bookPreviewURL(hover);bookCaption.dataset.author=data.person;bookCaption.dataset.initial=data.person?.[0]||'';
 const sideNotes=innerWidth>900||(innerWidth>760&&innerHeight<500),point=screenPoint(hover.getWorldPosition(new T.Vector3())),rect=bookCaption.getBoundingClientRect?.(),width=rect?.width||(sideNotes?Math.min(370,Math.max(innerWidth<=900?210:240,innerWidth*.21)):Math.min(340,innerWidth-36)),height=rect?.height||230;
 // Reserve a stable left reading area. Book position and title height do not move it.
 const shortLandscape=innerWidth>760&&innerWidth<=900&&innerHeight<500;
 const captionSpace=shortLandscape?230:sideNotes?(innerWidth<=1300?290:330):(innerHeight<=740?140:270);
 let x=sideNotes?innerWidth*.035:18,y=innerHeight*.35;
 const panel=$('#selection'),panelRect=!panel.hidden&&panel.getBoundingClientRect?.();
 bookCaption.dataset.side='left';
 if(!sideNotes){const panelTop=panelRect?.height?panelRect.top:innerHeight-(innerWidth<=760?129:86)-270;y=Math.min(y,panelTop-captionSpace-18);}
 x=Math.max(18,Math.min(innerWidth-width-18,x));y=Math.max(shortLandscape?90:105,Math.min(innerHeight-captionSpace-(shortLandscape?76:135),y));bookCaption.style.left=x+'px';bookCaption.style.top=y+'px';
 captionLink.toggleAttribute('hidden',!sideNotes);captionLink.setAttribute('viewBox','0 0 '+innerWidth+' '+innerHeight);
 if(sideNotes){const bounds=new T.Box3().setFromObject(hover),points=[];for(const px of [bounds.min.x,bounds.max.x])for(const py of [bounds.min.y,bounds.max.y])for(const pz of [bounds.min.z,bounds.max.z])points.push(screenPoint(new T.Vector3(px,py,pz)));const endX=Math.min(...points.map(p=>p.x))-9,endY=point.y,startX=x+width-8,startY=y+height*.62,bend=Math.max(20,(endX-startX)*.5),top=Math.min(...points.map(p=>p.y))-5,bottom=Math.max(...points.map(p=>p.y))+5,right=Math.max(...points.map(p=>p.x))+5;captionPath.setAttribute('d',`M ${startX} ${startY} C ${startX+bend} ${startY}, ${endX-bend} ${endY}, ${endX} ${endY}`);captionTrace.setAttribute('d',`M ${endX+12} ${top} Q ${endX} ${top} ${endX} ${top+12} M ${endX} ${bottom-12} Q ${endX} ${bottom} ${endX+12} ${bottom} L ${Math.min(right,endX+42)} ${bottom}`);captionDot.setAttribute('cx',String(endX));captionDot.setAttribute('cy',String(endY));}
}
function hit(event){mouse.set(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1);ray.setFromCamera(mouse,camera);ray.params.Line.threshold=.004;const hits=ray.intersectObjects(clickable,true);for(const h of hits){if(!h.object.isMesh)continue;let visible=true;for(let p=h.object;p;p=p.parent)if(!p.visible){visible=false;break;}if(!visible)continue;let n=h.object;while(n&&!n.userData.action)n=n.parent;if(n?.userData.action)return n;}return null;}
$('#scene').addEventListener('pointerleave',()=>{bookCaption.hidden=true;captionLink.setAttribute('hidden','');hover=null;});
$('#scene').addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});$('#scene').addEventListener('pointerup',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<8){if(!started){enter();}else{const obj=hit(e);activate(obj);}}down=null;});
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
 const rootURL=new URL('../../01-sources/Her/Judas与Ambrose-阅读档案/',new URL('../../03-deliverables/room-preview/',base));
 musicStatus.index=index;musicStatus.title=musicTitles[index];audio.src=window.HerMedia?.audio(musicFiles[index])||new URL(musicFiles[index],rootURL).href;
 audio.play().then(()=>receiveMusic({playing:true})).catch(()=>{receiveMusic({playing:false});$('#room-hint').textContent='请再点一次播放';});
}
function musicToggle(){soundTouched=true;if(window.RoomHost){window.RoomHost.send('music-toggle');return;}if(!audio.src)musicSelect(musicStatus.index);else if(audio.paused)audio.play().catch(()=>{});else audio.pause();}
if(audio){audio.volume=.25;audio.preload='none';audio.id='music';document.body.append(audio);audio.addEventListener('play',()=>receiveMusic({playing:true}));audio.addEventListener('pause',()=>receiveMusic({playing:false}));audio.addEventListener('ended',()=>musicSelect((musicStatus.index+1)%musicTitles.length));}
$('#sound').onclick=musicToggle;
function resize(){renderer.setPixelRatio(roomPixelRatio());renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.fov=defaultFov();camera.updateProjectionMatrix();const portrait=innerWidth/innerHeight<.8;views.overview.p=portrait?[.08,2.76,9.8]:[.12,2.58,6.55];views.music.t=[.75,portrait?1.28:1.40,-1.65];if(mode==='overview'&&!travel){camera.position.fromArray(views.overview.p);target.fromArray(views.overview.t);}else if(selectedDrawer!==null&&!travel&&!pendingArt){setDrawerView(selectedDrawer);camera.fov=views.drawer.fov;camera.updateProjectionMatrix();camera.position.fromArray(views.drawer.p);target.fromArray(views.drawer.t);}else if(mode==='shelf'&&!travel&&!pulledBook&&!pendingDiary){setShelfView();camera.fov=views.shelf.fov;camera.updateProjectionMatrix();camera.position.fromArray(views.shelf.p);target.fromArray(views.shelf.t);bookCaption.hidden=true;captionLink.setAttribute('hidden','');}camera.lookAt(target);camera.updateMatrixWorld(true);syncReadingFocus();}resize();addEventListener('resize',resize);
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
  target.lerpVectors(travel.a,travel.b,travel.portal?along:e);if(x===1){travel=null;camera.lookAt(target);camera.updateMatrixWorld(true);if(['shelf','desk','research','cabinet','models','music'].includes(mode)&&!pendingDiary&&!pendingArt&&selectedDrawer===null)showSelection(mode);syncReadingFocus();}
 }
 camera.lookAt(target);
 if(motion){tissue.rotation.z=-.12+Math.sin(elapsed*1.55)*.095*(life?.state.wind||.4);blindCord.rotation.z=(Math.sin(elapsed*1.42)*.068+Math.sin(elapsed*.73)*.018)*(life?.state.wind||.4);blindCord.rotation.x=Math.sin(elapsed*1.13)*.013;if(Math.floor(elapsed*6)!==Math.floor((elapsed-dt)*6))renderer.shadowMap.needsUpdate=true;for(let i=0;i<dusts.length;i++){const p=dusts[i];dustData[i*3]=p.x+Math.sin(elapsed*.16*p.speed+p.phase)*.10;dustData[i*3+1]=p.y+Math.sin(elapsed*.12+p.phase)*.13;dustData[i*3+2]=p.z+Math.cos(elapsed*.11+p.phase)*.07;}dustGeo.attributes.position.needsUpdate=true;}
 const holdDoors=false;doors.forEach((d,i)=>{const want=holdDoors?(i?1:-1)*Math.PI*.59:0;if(Math.abs(want-d.rotation.y)>.0005)renderer.shadowMap.needsUpdate=true;d.rotation.y+=(want-d.rotation.y)*(reduced?1:1-Math.exp(-dt*5));});
 // Reveal the collection only after the camera has reached its physical destination.
 if(pendingArt?.stage==='model-focus'&&!travel){pendingArt=null;$('#selection').hidden=true;syncReadingFocus();window.RoomReader?.art('models');}
 if(pendingArt?.stage==='waiting'&&!travel)pendingArt.stage='opening';
 drawerGroups.forEach((g,i)=>{
  const chosen=selectedDrawer===i,want=chosen&&pendingArt?.stage!=='waiting'?g.userData.homeZ+.40:g.userData.homeZ;
  if(Math.abs(want-g.position.z)>.0005)renderer.shadowMap.needsUpdate=true;
  g.position.z+=(want-g.position.z)*(reduced?1:1-Math.exp(-dt*6));
  if(pendingArt?.index===i&&chosen&&g.position.z>g.userData.homeZ+.398){
   if(pendingArt.stage==='opening'&&!travel){
    setDrawerView(i);
    pendingArt.stage='approaching';moveTo('drawer');
   }else if(pendingArt.stage==='approaching'&&!travel){pendingArt=null;showDrawerCollection(i);}
  }
 });

 for(const b of diaryBooks){
  const picked=b===pulledBook,flat=Math.abs(b.rotation.x)<.002&&Math.abs(b.position.y-b.userData.homeY)<.002;
  const want=picked?.60:flat?b.userData.homeZ+(b===hover?.035:0):b.position.z;
  const ease=reduced?1:1-Math.exp(-dt*7),clear=picked&&b.position.z>.565;
  if(Math.abs(b.position.z-want)>.0005||!flat)renderer.shadowMap.needsUpdate=true;
  b.position.z+=(want-b.position.z)*ease;b.position.y+=(b.userData.homeY+(clear?.04:0)-b.position.y)*ease;b.rotation.x+=((clear?-.08:0)-b.rotation.x)*ease;
  if(pendingDiary?.book===b&&clear&&!travel&&b.position.y>b.userData.homeY+.035){const read=pendingDiary;pendingDiary=null;if(read.kind==='work')window.RoomReader?.work(read.entry);else window.RoomReader?.open(read.kind,read.person,read.day,read.entry);}
 }
 life?.tick(dt,motion);activity?.tick(dt,motion,life?.state.night||0);atmosphere?.tick(dt,motion);
  const lidTarget=mode==='music'?-1.12:-.10;if(Math.abs(lidTarget-musicLid.rotation.x)>.001)renderer.shadowMap.needsUpdate=true;musicLid.rotation.x+=(lidTarget-musicLid.rotation.x)*(reduced?1:1-Math.exp(-dt*5));
  if(motion&&musicStatus.playing){musicCylinder.rotation.y+=dt*.75;musicCrank.rotation.x-=dt*2.8;renderer.shadowMap.needsUpdate=true;}
  updateSpots();if(atmosphere?.enabled)atmosphere.render();else renderer.render(scene,camera);window.RoomHost?.frame?.();if(!shown){shown=true;$('#loading').hidden=true;}
}
document.addEventListener('visibilitychange',()=>{lastFrame=0;wake();});
new MutationObserver(wake).observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
$('#scene').addEventListener('webglcontextlost',e=>{e.preventDefault();unavailable=true;$('#error').hidden=false;$('#error').textContent='三维画面暂时停下了，仍然可以阅读全部记录。';document.dispatchEvent(new CustomEvent('room:unavailable'));});
$('#quality').onclick=()=>{lightMode=!lightMode;atmosphere?.setQuality(lightMode);renderer.setPixelRatio(roomPixelRatio());$('#quality').setAttribute('aria-pressed',String(lightMode));$('#quality').textContent=lightMode?'精细绘制':'轻量绘制';resize();wake();};
$('#quality').setAttribute('aria-pressed',String(lightMode));$('#quality').textContent=lightMode?'精细绘制':'轻量绘制';
wake();
function bookCorners(){camera.updateMatrixWorld();book.updateWorldMatrix(true,false);return [[-.53,.030,-.30],[.53,.030,-.30],[.53,.030,.30],[-.53,.030,.30]].map(p=>{const v=book.localToWorld(new T.Vector3(...p)).project(camera);return [(v.x*.5+.5)*innerWidth,(-v.y*.5+.5)*innerHeight];});}
window.RoomScene={ready:Promise.all(assetPromises).then(()=>{renderer.compile?.(scene,camera);renderer.render(scene,camera);}),go,enter,returnFromArt,returnBook,scene,camera,renderer,views,openDrawer,objects,life,activity,atmosphere,shelfPlacements,hit,activate,regionSpots,shelfSectionSpots,details:{surfaces,floor,rugCloth,groundPaper,floorStacks,bagBody,musicCrank,musicCylinder,lampBase,lampHead,head,diffuser,lampLight,blindCord,tissue,windowFill},music:{select:musicSelect,toggle:musicToggle,receive:receiveMusic,get state(){return {...musicStatus};}},takeBook,readingBooks,wallParts,foldPanels,leftLegs,windowViews:{north:outside,west:sideView},doors,drawerGroups,emergingArt,diaryBooks,exhibitModels,displayModels,modelBay,bookCorners,resize,get transitionProgress(){return travel?.t??1;},get navigationRevision(){return navRevision;},setActive(value){active=!!value;lastFrame=0;wake();},depart(){active=true;started=true;document.body.classList.add('entered');camera.position.fromArray(views.book.p);target.fromArray(views.book.t);mode='book';go('overview',true);},approach(){active=true;go('book',true);},get travelling(){return !!travel;},get mode(){return mode;},get selectedDrawer(){return selectedDrawer;},get motionEnabled(){return motion;},diagnostics:()=>({meshes:root.children.length,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,textures:renderer.info.memory.textures,mode,version:T.REVISION})};
})();


