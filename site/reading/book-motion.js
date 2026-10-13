(function(root){'use strict';
 const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(t*(t*6-15)+10);};
 const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
 // The last part of the cover motion overlaps the first part of the flyleaf.
 // Closing traverses this exact same timeline backwards.
 function sequence(t){return {cover:smooth(t/.625),paper:smooth((t-.475)/.525)};}
 function coverTime(p){p=Math.max(0,Math.min(1,p));return .625*(.5-Math.sin(Math.asin(1-2*p)/3));}
 function cover(progress,mobile=false){const p=Math.max(0,Math.min(1,progress)),cos=Math.cos(Math.PI*p);return {progress:p,scale:cos,inside:p>=.5,frameX:mobile?0:-.25*(1-p),caseStart:mobile?0:p<.5?50:(1+cos)*50,endpaperStart:p<.5?100:(1+cos)*100,shade:.25*Math.sin(Math.PI*p)};}
 // Input conventions: a mouse pulls a physical page; a two-finger horizontal
 // wheel gesture follows the requested right=next / left=previous convention.
 function gesture(side,dx,dy,kind='mouse',mobile=false){if(Math.abs(dx)<Math.max(8,Math.abs(dy)*1.3))return 0;if(kind==='touch')return dx>0?1:-1;if(mobile)return dx<0?1:-1;return side==='right'&&dx<0?1:side==='left'&&dx>0?-1:0;}
 const api={ease,cover,gesture,sequence,coverTime};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BookMotion=api;
})(typeof window!=='undefined'?window:globalThis);
