// Station/site-local XZ footprint checks against the actual rendered road triangles.
// Include foliage and lamp-arm overhang, not just the trunk/pole centre.
export function createRoadClearance(surfaces, margin=0.5) {
  const triangles=[];
  for(const mesh of surfaces){
    mesh.updateMatrix();
    const m=mesh.matrix.elements;
    const point=i=>{const x=p.getX(i),y=p.getY(i),z=p.getZ(i);return [m[0]*x+m[4]*y+m[8]*z+m[12],m[2]*x+m[6]*y+m[10]*z+m[14]];};
    const p=mesh.geometry.attributes.position,index=mesh.geometry.index;
    const count=index?index.count:p.count;
    for(let i=0;i<count;i+=3){
      const ids=[0,1,2].map(j=>index?index.getX(i+j):i+j);
      triangles.push(ids.map(point));
    }
  }
  function segmentDistanceSquared(x,z,a,b){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=dx*dx+dz*dz;
    const t=length?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/length)):0;
    return (x-a[0]-t*dx)**2+(z-a[1]-t*dz)**2;
  }
  const cross=(x,z,a,b)=>(x-b[0])*(a[1]-b[1])-(a[0]-b[0])*(z-b[1]);
  return function hasClearance(x,z,radius=0){
    if(![x,z,radius].every(Number.isFinite)||radius<0)return false;
    const limit=(radius+margin)**2;
    for(const [a,b,c] of triangles){
      const signs=[cross(x,z,a,b),cross(x,z,b,c),cross(x,z,c,a)];
      if(!(signs.some(v=>v<0)&&signs.some(v=>v>0)))return false;
      if(Math.min(segmentDistanceSquared(x,z,a,b),segmentDistanceSquared(x,z,b,c),segmentDistanceSquared(x,z,c,a))<=limit)return false;
    }
    return true;
  };
}
