const test=require('node:test');
const assert=require('node:assert/strict');
global.window=global;
require('../layout-math.js');require('../drilling-math.js');
const D=DrillingMath,R=D.R;
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);

// Independently intersect a great-circle path with a cylindrical bore opening.
function edge(hole,other){
    const n=hole.normal,projection=dot(n,other.normal);
    const raw=other.normal.map((x,i)=>x-projection*n[i]);
    const len=Math.hypot(...raw),tangent=raw.map(x=>x/len);
    function perpendicular(angle){
        const q=n.map((x,i)=>R*(x*(Math.cos(angle)-1)+tangent[i]*Math.sin(angle)));
        return Math.sqrt(Math.max(0,dot(q,q)-dot(q,hole.axis)**2));
    }
    let a=0,b=.5;
    for(let i=0;i<60;i++){const mid=(a+b)/2;if(perpendicular(mid)<hole.radius)a=mid;else b=mid;}
    return (a+b)*R/2;
}
function gap(a,b){return R*Math.acos(Math.max(-1,Math.min(1,dot(a.normal,b.normal))))-edge(a,b)-edge(b,a);}

test('default chart is within USBC diameter/depth limits and uses inches at true scale',()=>{
    const result=D.resolve();assert.equal(result.valid,true);assert.ok(2*R>=8.5&&2*R<=8.595);
    assert.equal(result.holes.length,3);
    for(const h of result.holes){near(Math.hypot(...h.center),R);near(Math.hypot(...h.axis),1);assert.ok(h.radius*2<=1.5625);assert.ok(h.depth<=4.5);}
    near(gap(result.holes[0],result.holes[1]),.25);
    near(gap(result.holes[0],result.holes[2]),4);
    near(gap(result.holes[1],result.holes[2]),4);
});
test('the default three-finger grip has no offset and centers the thumb below the bridge',()=>{
    const result=D.resolve(),[m,r,t]=result.holes;
    near(t.center[0],0);near(result.bridgeCenter[0],0);
    near(m.center[0],-r.center[0]);near(m.center[1],r.center[1]);near(m.center[2],r.center[2]);
    near(m.axis[0],-r.axis[0]);near(m.axis[1],r.axis[1]);near(m.axis[2],r.axis[2]);
    assert.equal(result.chart.middleSpan,result.chart.ringSpan);
    const custom=D.resolve({ringSpan:4.125});
    assert.equal(custom.valid,true);near(gap(custom.holes[1],custom.holes[2]),4.125);
});
test('unequal spans, bore diameters, bridges and pitches preserve edge-to-edge measurements',()=>{
    for(const chart of [
        {middleSpan:3.75,ringSpan:4,bridge:.375,middleDiameter:.75,ringDiameter:.875,thumbDiameter:1.125},
        {middleSpan:4.25,ringSpan:4.125,bridge:.1875,middleLateral:-.5,ringLateral:.25,thumbLateral:.125,thumbForward:.125},
        {middleSpan:3.875,ringSpan:3.875,middleForward:-.5,ringForward:.25,bridge:.5}
    ]){
        const result=D.resolve(chart);assert.equal(result.valid,true,JSON.stringify(chart));
        const [m,r,t]=result.holes;
        near(gap(m,r),result.chart.bridge);near(gap(m,t),result.chart.middleSpan);near(gap(r,t),result.chart.ringSpan);
    }
});
test('thumbless uses bridge COG, omits thumb and ignores irrelevant saved span values',()=>{
    const result=D.resolve({middleSpan:NaN,thumbDiameter:NaN},'thumbless');
    assert.equal(result.valid,true);assert.equal(result.holes.length,2);
    near(result.bridgeCenter[0],0);near(result.bridgeCenter[1],0);near(result.bridgeCenter[2],1);
    near(gap(...result.holes),.25);
});
test('bad dimensions and impossible asymmetric spans are rejected, not clamped',()=>{
    for(const input of [{bridge:0},{middleDepth:4.6},{thumbDiameter:1.6},{middleLateral:2},{middleSpan:1,ringSpan:6},{bridge:NaN}]){
        assert.equal(D.resolve(input).valid,false,JSON.stringify(input));
    }
});
test('depth edits change the actual blind bore, while span positions remain fixed',()=>{
    const a=D.resolve(),b=D.resolve({middleDepth:1.5});
    assert.equal(b.holes[0].depth,1.5);assert.deepEqual(a.holes[0].center,b.holes[0].center);
    const c=D.resolve({middleSpan:4.25});assert.notDeepEqual(a.holes[2].center,c.holes[2].center);
});
