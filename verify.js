const fs=require('fs');
let src=fs.readFileSync('all.js','utf8');
src=src.split('/* =================== SETTINGS ===================')[0];
src+='\nmodule.exports={TYPES,TYPE_LIST,silhouette,tierOf,makeFlight,state,FLEET_POOL,AIRPORTS,AIRPORT_LIST,OPERATORS,OPERATOR_LIST,COUNTRY_LIST,MAX_SPAN,distKm,bearing,elevation,cameraBasis,lookAngles,dirOf,dot,sunAltitude,skyPhase,nearby,CLASSES,toDeg,toRad};';
fs.writeFileSync('vm.js',src);
const stub={innerHTML:'',textContent:'',style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},
  addEventListener(){},setAttribute(){},getAttribute(){},querySelectorAll:()=>[],appendChild(){},remove(){},
  getContext:()=>({clearRect(){},beginPath(){},arc(){},fill(){}}),firstChild:null,lastChild:null};
global.window={storage:{get:async()=>null,set:async()=>null},addEventListener(){}};
global.document={getElementById:()=>stub,querySelector:()=>stub,querySelectorAll:()=>[],
  addEventListener(){},documentElement:{style:{setProperty(){}}},createElement:()=>stub};
global.navigator={};global.screen={};global.performance={now:()=>0};
global.setTimeout=()=>0;global.setInterval=()=>0;global.clearTimeout=()=>{};global.clearInterval=()=>{};
global.addEventListener=()=>{};global.innerWidth=390;global.innerHeight=844;global.scrollTo=()=>{};
global.requestAnimationFrame=()=>0;global.cancelAnimationFrame=()=>{};
const M=require('./vm.js');
let fails=0;
const ok=(name,cond,extra='')=>{if(!cond)fails++;console.log((cond?'  PASS  ':'* FAIL *')+' '+name+(extra?'  '+extra:''));};
const near=(a,b,tol)=>Math.abs(a-b)<=tol;

console.log('\n=== 1. DEVICE ORIENTATION (the bug: planes appeared underground) ===');
function setPhone(alpha,beta,gamma){M.state.hasCompass=true;M.state.alpha=alpha;M.state.beta=beta;M.state.gamma=gamma;M.state.screenAngle=0;}

setPhone(0,90,0);   // upright portrait, top of phone north, camera pointing at the horizon
let L=M.lookAngles();
ok('upright portrait facing N -> look elevation 0deg', near(L.elev,0,0.5), `got ${L.elev.toFixed(2)}`);
ok('upright portrait facing N -> heading 000',        near(L.hdg,0,0.5),  `got ${L.hdg.toFixed(2)}`);

setPhone(0,120,0);  // tilted 30deg further back = looking 30deg up
L=M.lookAngles();
ok('tilt back 30deg -> look elevation +30deg', near(L.elev,30,0.5), `got ${L.elev.toFixed(2)}`);

setPhone(0,60,0);   // tilted forward = looking 30deg DOWN
L=M.lookAngles();
ok('tilt forward 30deg -> look elevation -30deg', near(L.elev,-30,0.5), `got ${L.elev.toFixed(2)}`);

setPhone(0,180,0);  // lying back flat, camera at the zenith
L=M.lookAngles();
ok('flat on back -> looking straight up (+90)', near(L.elev,90,0.5), `got ${L.elev.toFixed(2)}`);

setPhone(0,0,0);    // flat on a table, camera at the ground
L=M.lookAngles();
ok('flat on table -> looking straight down (-90)', near(L.elev,-90,0.5), `got ${L.elev.toFixed(2)}`);

setPhone(90,90,0);  // alpha 90 = top of phone points west
L=M.lookAngles();
ok('alpha 90 -> heading 270 (west)', near(L.hdg,270,0.5), `got ${L.hdg.toFixed(2)}`);
setPhone(270,90,0);
L=M.lookAngles();
ok('alpha 270 -> heading 090 (east)', near(L.hdg,90,0.5), `got ${L.hdg.toFixed(2)}`);

console.log('\n=== 2. SCREEN PROJECTION (does a plane land where you are looking?) ===');
function project(brg,elev){
  const {f,r,u}=M.cameraBasis();
  const d=M.dirOf(brg,elev);
  const z=M.dot(d,f); if(z<=0)return null;
  const W=390,H=844;
  const fLong=64*Math.PI/180, fShort=2*Math.atan(Math.tan(fLong/2)*W/H);
  const th=Math.tan(fShort/2), tv=Math.tan(fLong/2);
  return {x:W/2+(M.dot(d,r)/z/th)*(W/2), y:H/2-(M.dot(d,u)/z/tv)*(H/2)};
}
setPhone(0,90,0);   // looking north, level
let p=project(0,0);
ok('plane dead ahead lands at screen centre', near(p.x,195,1)&&near(p.y,422,1), `x=${p.x.toFixed(0)} y=${p.y.toFixed(0)}`);
p=project(0,20);
ok('plane 20deg ABOVE horizon renders in the UPPER half', p.y<422, `y=${p.y.toFixed(0)} of 844`);
p=project(0,-20);
ok('plane 20deg BELOW horizon renders in the LOWER half', p.y>422, `y=${p.y.toFixed(0)}`);
p=project(15,0);
ok('plane to the RIGHT renders right of centre', p.x>195, `x=${p.x.toFixed(0)}`);
p=project(345,0);
ok('plane to the LEFT renders left of centre', p.x<195, `x=${p.x.toFixed(0)}`);
setPhone(0,120,0);  // now looking 30deg UP
p=project(0,30);
ok('looking up 30deg, a plane at 30deg elev centres', near(p.y,422,2), `y=${p.y.toFixed(0)}`);
p=project(0,0);
ok('looking up 30deg, the horizon drops below centre', p.y>422, `y=${p.y.toFixed(0)}`);
ok('a plane BEHIND you is culled', project(180,10)===null);

console.log('\n=== 3. SOLAR POSITION ===');
// Denver 39.7392N 104.9903W. Solar noon is ~13:00 MDT = 19:00 UTC in August.
let a=M.sunAltitude(39.7392,-104.9903,new Date(Date.UTC(2026,7,5,19,0)));
ok('Denver Aug 5, solar noon -> sun high (60-72deg)', a>60&&a<72, `${a.toFixed(1)}deg`);
a=M.sunAltitude(39.7392,-104.9903,new Date(Date.UTC(2026,7,6,8,0)));
ok('Denver Aug 5, 02:00 local -> deep night (below -18)', a< -18, `${a.toFixed(1)}deg`);
a=M.sunAltitude(0,0,new Date(Date.UTC(2026,2,20,12,0)));
ok('equator at equinox noon -> sun near zenith (>85)', a>85, `${a.toFixed(1)}deg`);
a=M.sunAltitude(-33.94,151.18,new Date(Date.UTC(2026,11,21,1,0)));
ok('Sydney Dec 21 01:00 UTC -> 74.4deg (53min before solar noon)', near(a,74.4,0.5), `${a.toFixed(1)}deg`);
a=M.sunAltitude(78,15,new Date(Date.UTC(2026,5,21,0,0)));
ok('Svalbard midsummer midnight -> sun still up', a>0, `${a.toFixed(1)}deg`);
a=M.sunAltitude(78,15,new Date(Date.UTC(2026,11,21,12,0)));
ok('Svalbard midwinter noon -> polar night', a<0, `${a.toFixed(1)}deg`);
ok('phase naming', M.skyPhase(45)==='DAYLIGHT'&&M.skyPhase(-3)==='CIVIL TWILIGHT'&&M.skyPhase(-25)==='NIGHT');

console.log('\n=== 4. GEODESY ===');
const dDENJFK=M.distKm(39.86,-104.67,40.64,-73.78);
ok('DEN->JFK great circle ~2620 km', near(dDENJFK,2620,60), `${dDENJFK.toFixed(0)} km`);
const bDENJFK=M.bearing(39.86,-104.67,40.64,-73.78);
ok('DEN->JFK initial bearing 78.0deg', near(bDENJFK,78.0,0.3), `${bDENJFK.toFixed(1)}deg`);
ok('due north bearing = 000', near(M.bearing(0,0,10,0),0,0.01));
ok('due east bearing = 090',  near(M.bearing(0,0,0,10),90,0.01));
// elevation: a plane at 35,000ft directly overhead vs 20nm away
ok('overhead -> ~90deg elevation', M.elevation(0.005,35000)>85);
const e20=M.elevation(37,35000);   // 20nm out, 35000ft
ok('35,000ft at 20nm -> ~16deg up', near(e20,16,2), `${e20.toFixed(1)}deg`);
const e5=M.elevation(9.26,35000);  // 5nm out
ok('35,000ft at 5nm -> ~49deg up', near(e5,49,3), `${e5.toFixed(1)}deg`);
ok('30,000ft visible out to 150nm, over horizon past 190nm', [1,5,20,50,100,150].every(nm=>M.elevation(nm*1.852,30000)>0) && M.elevation(200*1.852,30000)<0);

console.log('\n=== 5. DATA INTEGRITY ===');
ok('223 aircraft types', M.TYPE_LIST.length===223, `${M.TYPE_LIST.length}`);
ok('every spawn code exists in the DB', [...new Set(M.FLEET_POOL)].every(c=>M.TYPES[c]));
ok('every type has a note over 20 chars', M.TYPE_LIST.every(t=>t.note&&t.note.length>20));
ok('every type renders without NaN', M.TYPE_LIST.every(t=>!M.silhouette(t).includes('NaN')));
ok('every type is in at least one filter', M.TYPE_LIST.every(t=>Object.values(M.CLASSES).some(f=>f(t))));
ok('166 airports, 94 airlines, 114 flags',
   M.AIRPORT_LIST.length===166&&M.OPERATOR_LIST.length===94&&M.COUNTRY_LIST.length===114);
ok('no aircraft spawns above its own ceiling',
   Array.from({length:2000},()=>M.makeFlight()).every(f=>f.alt<=f.type.ceil));
ok('all spawns land inside scope range',
   Array.from({length:2000},()=>M.makeFlight()).every(f=>M.distKm(M.state.lat,M.state.lon,f.lat,f.lon)/1.852<=M.state.rangeNm));

console.log('\n=== 6. PERFORMANCE ===');
let t0=Date.now(); for(let i=0;i<3000;i++)M.silhouette(M.TYPES['B738'],{fill:'#fff'});
console.log(`  3000 cached silhouette lookups: ${Date.now()-t0} ms`);
t0=Date.now(); M.state.traffic=Array.from({length:60},()=>M.makeFlight());
for(let i=0;i<600;i++){ // one full projection pass per frame, 60 aircraft, 10 seconds of frames
  const {f,r,u}=M.cameraBasis();
  for(const a of M.state.traffic){const d=M.dirOf(a.track,20);M.dot(d,f);M.dot(d,r);M.dot(d,u);}
}
console.log(`  600 frames x 60 aircraft projection: ${Date.now()-t0} ms`);

console.log('\n'+(fails?`### ${fails} FAILURE(S)`:'### ALL CHECKS PASSED'));
process.exit(fails?1:0);
