const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;require('../layout-math.js');const M=LayoutMath,R=M.R;
const close=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const dot=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>v.map(x=>x/Math.hypot(...v));
function position(layout,pap){
    const phi=pap.up/R,lambda=pap.over/R,a=layout.pin/R,v=layout.val*Math.PI/180;
    const p=[Math.cos(phi)*Math.sin(lambda),Math.sin(phi),Math.cos(phi)*Math.cos(lambda)];
    const north=[-Math.sin(phi)*Math.sin(lambda),Math.cos(phi),-Math.sin(phi)*Math.cos(lambda)];
    const west=[-Math.cos(lambda),0,Math.sin(lambda)];
    const pin=p.map((x,i)=>x*Math.cos(a)+(north[i]*Math.cos(v)+west[i]*Math.sin(v))*Math.sin(a));
    const toward=unit(p.map((x,i)=>x-dot(p,pin)*pin[i]));
    const tangent=cross(pin,toward),angle=-layout.drill*Math.PI/180;
    const psa=toward.map((x,i)=>x*Math.cos(angle)+tangent[i]*Math.sin(angle));
    return {pin,pap:p,psa};
}
const distance=(a,b)=>R*Math.acos(Math.max(-1,Math.min(1,dot(a,b))));
test('all six official Storm 2LS examples preserve the three specified arcs and drilling orientation',()=>{
    const presets=[[5.5,5,2],[2,6,5],[5,4,3.5],[4.5,3,4.5],[4,4,5],[3.5,4,6.5]];
    for(const up of [-1,1])for(const values of presets){
        const pap={over:5,up},layout=M.resolveLayout('2ls',values,pap);
        assert.equal(layout.valid,true,JSON.stringify({values,pap}));
        const pts=position(layout,pap);
        close(distance(pts.pin,pts.pap),values[0]);close(distance(pts.psa,pts.pap),values[1]);close(distance(pts.pin,[0,0,1]),values[2]);
        close(distance(pts.pin,pts.psa),6.75);
        // Storm's finger-facing grip orientation, not the reflected circle intersection.
        assert.ok(dot(pts.pin,cross([0,0,1],pts.pap))>=-1e-9);
        const same=M.translateLayout('2ls','2ls',values,pap);assert.equal(same.valid,true);
        [same.val1,same.val2,same.val3].forEach((v,i)=>close(v,values[i]));
    }
});
test('VAL and drilling angle inputs remain in the standard 0–90 degree range',()=>{
    for(const values of [[45,4.5,-1],[45,4.5,91],[-1,4.5,30],[91,4.5,30]])assert.equal(M.resolveLayout('dual_angle',values,{over:5,up:1}).valid,false);
    for(const val of [0,90])assert.equal(M.resolveLayout('dual_angle',[45,4.5,val],{over:5,up:1}).valid,true);
});
test('all nine system pairs preserve physical Pin and PSA when standard notation exists',()=>{
    let pairs=new Set(),count=0;
    for(const pap of [{over:5,up:1},{over:4,up:.5},{over:5.5,up:-.75}])for(const pin of [2,3.5,4.5,5.5])for(const val of [15,30,60]){
        const da=[45,pin,val],forms={dual_angle:da};
        for(const target of ['vls','2ls']){const r=M.translateLayout('dual_angle',target,da,pap);if(r.valid)forms[target]=[r.val1,r.val2,r.val3];}
        const expected=position(M.resolveLayout('dual_angle',da,pap),pap);
        for(const source of Object.keys(forms))for(const target of Object.keys(forms)){
            const r=M.translateLayout(source,target,forms[source],pap);assert.equal(r.valid,true,`${source}->${target}`);
            const actual=position(M.resolveLayout(target,[r.val1,r.val2,r.val3],pap),pap);
            actual.pin.forEach((v,i)=>close(v,expected.pin[i]));actual.psa.forEach((v,i)=>close(v,expected.psa[i]));
            pairs.add(source+'>'+target);count++;
        }
    }
    assert.equal(pairs.size,9);assert.ok(count>200);
});
test('valid 2LS placement outside standard DA/VLS orientation keeps 3D geometry without invented angles',()=>{
    for(const target of ['dual_angle','vls']){
        const result=M.translateLayout('2ls',target,[3.5,4,6.5],{over:5,up:1});
        assert.equal(result.valid,false);assert.equal(result.reason,'orientation_not_representable');assert.equal(result.layout.valid,true);assert.ok(Number.isNaN(result.val3));assert.equal(result.fallback,undefined);
    }
});
test('invalid 2LS triangles, undefined PAP reference and polar PAP are rejected',()=>{
    for(const [values,pap] of [[[2,4,3],{over:5,up:1}],[[5,4,.1],{over:1,up:0}],[[5,4,3.5],{over:0,up:0}],[[5,4,3.5],{over:5,up:6.75}]])assert.equal(M.resolveLayout('2ls',values,pap).valid,false);
});
