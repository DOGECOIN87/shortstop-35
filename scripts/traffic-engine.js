export const SIGNAL_CYCLE=72;
export function signalState(t,group){
  t=((t%72)+72)%72;
  if(group==='sh46') return t<30?'green':t<33?'yellow':'red';
  return t>=39&&t<60?'green':t>=60&&t<63?'yellow':'red';
}
export function makeRoute(points){
  const distances=[0];
  for(let i=1;i<points.length;i++) distances.push(distances[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  return {points,distances,length:distances.at(-1)};
}
export function sampleRoute(route,s){
  s=Math.max(0,Math.min(route.length,s));
  let lo=0,hi=route.points.length-1;
  while(hi-lo>1){const m=(lo+hi)>>1;if(route.distances[m]>s)hi=m;else lo=m;}
  const a=route.points[lo],b=route.points[hi],d=route.distances[hi]-route.distances[lo],u=d?(s-route.distances[lo])/d:0;
  const dx=b[0]-a[0],dy=b[1]-a[1],n=Math.hypot(dx,dy)||1;
  return {x:a[0]+u*dx,y:a[1]+u*dy,z:a[2]+u*(b[2]-a[2]),dx:dx/n,dy:dy/n};
}
export function overlap(a,b,margin=.3){
  if(Math.abs(a.p.z-b.p.z)>2)return false;
  const delta=[b.p.x-a.p.x,b.p.y-a.p.y];
  const ax=[[a.p.dx,a.p.dy],[-a.p.dy,a.p.dx]],bx=[[b.p.dx,b.p.dy],[-b.p.dy,b.p.dx]];
  for(const n of [...ax,...bx]){
    const ra=Math.abs(n[0]*ax[0][0]+n[1]*ax[0][1])*a.length/2+Math.abs(n[0]*ax[1][0]+n[1]*ax[1][1])*a.width/2;
    const rb=Math.abs(n[0]*bx[0][0]+n[1]*bx[0][1])*b.length/2+Math.abs(n[0]*bx[1][0]+n[1]*bx[1][1])*b.width/2;
    if(Math.abs(delta[0]*n[0]+delta[1]*n[1])>ra+rb+margin)return false;
  }
  return true;
}
export function createSimulation(lanes,metadata){
  const routes=Object.fromEntries(Object.entries(lanes).map(([n,p])=>[n,makeRoute(p)]));
  const cars=[];const colors=[0xc0c4c9,0x2f4a68,0x8c2f2f,0xe3e5e8,0x2c4437,0xc8ad34];
  for(const [lane,route] of Object.entries(routes)){
    const count=Math.max(1,Math.min(4,Math.floor(route.length/70)));
    for(let i=0;i<count;i++){
      let s=(i+.3)*route.length/count;
      const car={lane,route,s,speed:0,length:6.0,width:2.0,color:colors[cars.length%colors.length],maxSpeed:lane.startsWith('i35')?20:lane.includes('Ramp')?8:10};
      let accepted=false;
      for(let attempt=0;attempt<60;attempt++){
        car.p=sampleRoute(route,s);
        if(!cars.some(other=>overlap(car,other,.8))){accepted=true;break;}
        s=(s+7)%route.length;
      }
      if(accepted){car.s=s;cars.push(car);}
    }
  }
  let time=0;
  function step(dt){
    const order=cars.map((c,i)=>i).sort((a,b)=>cars[b].s-cars[a].s);
    for(const i of order){
      const c=cars[i],meta=metadata[c.lane]||{};
      let speed=Math.min(c.maxSpeed,c.speed+1.6*dt),advance=speed*dt;
      const leaders=cars.filter(v=>v!==c&&v.lane===c.lane);
      for(const lead of leaders){
        const gap=(lead.s-c.s+c.route.length)%c.route.length;
        advance=Math.min(advance,Math.max(0,gap-(c.length+lead.length)/2-2.5));
      }
      if(meta.group&&meta.stopS!=null&&c.s<=meta.stopS&&signalState(time,meta.group)!=='green'){
        const gap=meta.stopS-c.s;
        speed=Math.min(speed,Math.sqrt(2*2.5*Math.max(0,gap)));
        advance=Math.min(advance,speed*dt,Math.max(0,gap));
      }
      const s=(c.s+advance)%c.route.length,p=sampleRoute(c.route,s),candidate={...c,s,p};
      if(cars.some((other,j)=>j!==i&&overlap(candidate,other,.45))){c.speed=0;continue;}
      c.s=s;c.p=p;c.speed=dt?advance/dt:0;
    }
    time+=dt;
  }
  return {cars,routes,step,get time(){return time;}};
}
