/* Browser previews and original downloads share one canonical file map. */
(()=>{
 'use strict';
 const repo=window.CatRulerRelease,manifest=window.HerMediaManifest||{};
 const entry=file=>manifest[file]||manifest[repo.key(file)];
 const asset=repo.asset;
 function image(file,large=false){const m=entry(file);return m?.small?repo.url(m[large?'large':'small']):asset(file);}
 function audio(file){const m=entry(file);return m?.audio?repo.url(m.audio):asset(file);}
 function assign(node,file,large=false){node.decoding='async';node.src=image(file,large);const m=entry(file);if(m?.width){node.width=m.width;node.height=m.height;}node.dataset.mediaReady='true';}
 function leaf(node){node.querySelectorAll('img[data-asset]:not([data-media-ready])').forEach(img=>assign(img,img.dataset.asset,true));node.dispatchEvent(new CustomEvent('media:near'));}
 function nearby(position){document.querySelectorAll('.leaf').forEach(node=>{if(Math.abs(Number(node.dataset.page)-position)<=2)leaf(node);});}
 window.HerMedia={image,audio,assign,nearby,asset,root:repo.root};
})();
