/* Display copies are separate from immutable originals and download links. */
(()=>{
 'use strict';
 const root=new URL("assets/web-media/",window.CatRulerRelease.root),original=new URL("archive/",window.CatRulerRelease.root);
 const manifest=window.HerMediaManifest||{};
 function key(file){try{const url=new URL(file,original);if(url.href.startsWith(original.href))return decodeURIComponent(url.href.slice(original.href.length));}catch{}return file;}
 const asset=file=>window.CatRulerRelease.remote[file]||new URL(String(file).split('/').map(encodeURIComponent).join('/'),original).href;
 function image(file,large=false){const entry=(manifest[file]||manifest[key(file)]);return entry?.small?new URL(entry[large?'large':'small'],root).href:(/^(file:|https?:)/.test(file)?file:asset(file));}
 function audio(file){const entry=(manifest[file]||manifest[key(file)]);return entry?.audio?new URL(entry.audio,root).href:asset(file);}
 function assign(node,file,large=false){node.decoding='async';node.src=image(file,large);const m=(manifest[file]||manifest[key(file)]);if(m?.width){node.width=m.width;node.height=m.height;}node.dataset.mediaReady='true';}
 function leaf(node){node.querySelectorAll('img[data-asset]:not([data-media-ready])').forEach(img=>assign(img,img.dataset.asset,true));node.dispatchEvent(new CustomEvent('media:near'));}
 function nearby(position){document.querySelectorAll('.leaf').forEach(node=>{if(Math.abs(Number(node.dataset.page)-position)<=2)leaf(node);});}
 window.HerMedia={image,audio,assign,nearby,asset,root:root.href};
})();
