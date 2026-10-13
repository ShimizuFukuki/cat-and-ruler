// Upright, sealed hull with horizontally similar polygon sections.
// Geometry units are assumed to be metres for this fictional learning model.
(function(root){
 function volume(profile,z){
  let sum=0;
  for(let i=1;i<profile.rings.length;i++){
   const [z0,s0]=profile.rings[i-1],[z1,s1]=profile.rings[i];
   const h=Math.max(0,Math.min(z,z1)-z0),k=(s1-s0)/(z1-z0);
   sum+=profile.area*(s0*s0*h+s0*k*h*h+k*k*h*h*h/3);
  }
  return sum;
 }
 function equilibrium(profile,mass,density){
  if(!(mass>=0&&density>0))throw new Error('Invalid mass or density');
  const bottom=profile.rings[0][0],top=profile.rings.at(-1)[0];
  const capacity=volume(profile,top),target=mass/density;
  if(target>capacity)return {afloat:false,waterline:top,draft:top-bottom,volume:capacity,freeboard:0};
  let lo=bottom,hi=top;
  for(let i=0;i<55;i++){const mid=(lo+hi)/2;if(volume(profile,mid)<target)lo=mid;else hi=mid}
  const waterline=(lo+hi)/2;
  return {afloat:true,waterline,draft:waterline-bottom,volume:target,freeboard:profile.deck-waterline};
 }
 const api={volume,equilibrium};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.BoatFloat=api;
})(typeof window==='undefined'?{}:window);
