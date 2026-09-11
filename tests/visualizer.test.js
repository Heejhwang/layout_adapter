const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const Three=require('../vendor/three.min.js');
function harness(){
 const frames=new Map(),listeners=new Map();let next=0;
 const on=(type,fn)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type).add(fn);};
 const off=(type,fn)=>listeners.get(type)?.delete(fn);
 const canvas={classList:{add(){}},setAttribute(){},removeAttribute(){},addEventListener:on};
 class Renderer{constructor(){this.domElement=canvas;this.renderCount=0;}setPixelRatio(v){this.pixelRatio=v;}setSize(){}render(){this.renderCount++;}dispose(){this.disposed=true;}}
 class Controls{addEventListener(){}removeEventListener(){}update(){}dispose(){this.disposed=true;}}
 const document={hidden:false,addEventListener:on,removeEventListener:off,getElementById(){return null;},querySelectorAll(){return[];}};
 const window={document,devicePixelRatio:3,addEventListener:on,removeEventListener:off,requestAnimationFrame(fn){frames.set(++next,fn);return next;},cancelAnimationFrame(id){frames.delete(id);}};
 const context=vm.createContext({window,document,console,THREE:{...Three,WebGLRenderer:Renderer,OrbitControls:Controls}});
 for(const f of ['layout-math.js','drilling-math.js','visualizer.js'])vm.runInContext(fs.readFileSync(require('node:path').resolve(__dirname,'..',f),'utf8'),context);
 return {window,document,frames,flush(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());},fire(type){listeners.get(type)?.forEach(fn=>fn());},create:()=>new window.BowlingVisualizer(null)};
}
const close=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const data={system:'dual_angle',p1:45,p2:4.5,p3:30,pap:{over:5,up:1}};
function watchDispose(resource){let count=0;resource.addEventListener('dispose',()=>count++);return()=>count;}

test('great-circle interpolation handles coincident and antipodal points at true radius',()=>{
 const h=harness(),V=h.window.BowlingVisualizer;
 for(const end of [new Three.Vector3(0,0,4),new Three.Vector3(0,0,-4),new Three.Vector3(4,0,0)])for(let i=0;i<=16;i++){
  const p=V.interpolateGreatCircle(new Three.Vector3(0,0,4),end,i/16);close(p.length(),4);assert.ok(p.toArray().every(Number.isFinite));
 }
});
test('drilled geometry has real diameter, blind-hole depth and correct grip count',()=>{
 const h=harness(),v=h.create();assert.equal(v.failureKey,null);assert.equal(v.renderer.pixelRatio,2);
 close(v.ballMesh.geometry.parameters.radius,h.window.LayoutMath.R);
 for(const hole of Object.values(v.holes)){
  const c=new Three.Vector3(...hole.userData.center),axis=new Three.Vector3(...hole.userData.axis),p=hole.geometry.attributes.position;
  let far=-Infinity;
  for(let i=0;i<p.count;i++){
   const q=new Three.Vector3().fromBufferAttribute(p,i).sub(c),depth=q.dot(axis);far=Math.max(far,depth);
   const radial=q.clone().sub(axis.clone().multiplyScalar(depth)).length();assert.ok(radial<=hole.userData.radius+1e-6);
  }
  close(far,hole.userData.depth,1e-6);
 }
 assert.equal(Object.keys(v.holes).length,3);
 v.setGripType('thumbless');assert.equal(Object.keys(v.holes).length,2);assert.equal(v.holes.thumb,undefined);
 close(v.holes.leftFinger.userData.center[1],0);close(v.holes.rightFinger.userData.center[1],0);
 v.setGripType('3finger');assert.equal(Object.keys(v.holes).length,3);v.dispose();
});
test('all 2LS presets and both hands render identical measured arcs with opposite handedness',()=>{
 const h=harness(),v=h.create(),R=h.window.LayoutMath.R;
 const distance=(a,b)=>R*Math.acos(Math.max(-1,Math.min(1,a.clone().normalize().dot(b.clone().normalize()))));
 for(const values of [[5.5,5,2],[2,6,5],[5,4,3.5],[4.5,3,4.5],[4,4,5],[3.5,4,6.5]]){
  assert.equal(v.updateLayout({system:'2ls',p1:values[0],p2:values[1],p3:values[2],pap:{over:5,up:1}}),true);
  close(distance(v.markerPin.position,v.markerPap.position),values[0]);close(distance(v.markerPsa.position,v.markerPap.position),values[1]);close(distance(v.markerPin.position,v.markerCog.position),values[2]);
  const original=v.markerPin.position.clone();v.setHand('left');v.group.updateMatrixWorld(true);const left=v.markerPin.getWorldPosition(new Three.Vector3());close(left.x,-original.x);close(left.y,original.y);close(left.z,original.z);v.setHand('right');
 }
 v.dispose();
});
test('chart and layout updates dispose replaced resources and hide invalid geometry',()=>{
 const h=harness(),v=h.create();v.updateLayout(data);
 const oldHole=v.holes.leftFinger,oldLine=v.lines[0];const holeDisposed=watchDispose(oldHole.geometry),lineDisposed=watchDispose(oldLine.geometry);
 v.setDrillingChart(h.window.DrillingMath.resolve({middleSpan:4.25}));assert.equal(holeDisposed(),1);assert.notDeepEqual(v.holes.leftFinger.userData.center,oldHole.userData.center);
 v.updateLayout(data);assert.equal(lineDisposed(),1);
 v.setDrillingChart({valid:false});assert.equal(v.group.visible,false);assert.equal(v.updateLayout(data),false);
 v.setDrillingChart(h.window.DrillingMath.resolve());assert.equal(v.updateLayout(data),true);assert.equal(v.group.visible,true);
 const counts=v.lines.map(line=>watchDispose(line.geometry));v.dispose();counts.forEach(count=>assert.equal(count(),1));assert.equal(v.controls.disposed,true);assert.equal(v.renderer.disposed,true);assert.equal(h.frames.size,0);
});
test('on-demand rendering coalesces input changes and pauses while the document is hidden',()=>{
 const h=harness(),v=h.create();assert.equal(h.frames.size,1);h.flush();const start=v.renderer.renderCount;
 v.requestRender();v.requestRender();assert.equal(h.frames.size,1);h.flush();assert.equal(v.renderer.renderCount,start+1);
 h.document.hidden=true;v.requestRender();assert.equal(h.frames.size,0);h.document.hidden=false;h.fire('visibilitychange');assert.equal(h.frames.size,1);v.dispose();
});
