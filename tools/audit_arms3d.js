// v26 arm audit: node tools/audit_arms3d.js [ids|all] [bad]  - forearm roll per 1/240-rep step (ROLL > 6°), upper-arm vs forearm twist (TWIST > 70°),
// elbow centre closer than 13 units to the torso axis (THRU), plus shoulder (scapula) step size
global.window=global;global.localStorage={getItem(){},setItem(){}};global.document={querySelectorAll:()=>[]};
require(__dirname + '/../js/exercises.js');require(__dirname + '/../js/mannequin.js');require(__dirname + '/../js/anatomy.js');
const W=window.WO,A=W.ANATOMY;const S=(a,b)=>a.map((v,i)=>v-b[i]),D=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),L=a=>Math.hypot(...a),N=a=>a.map(v=>v/L(a)),K=(a,k)=>a.map(v=>v*k);
const deg=x=>Math.acos(Math.max(-1,Math.min(1,x)))*180/Math.PI;const orth=(v,a)=>N(S(v,K(a,D(v,a))));
const ids=process.argv[2]==='all'?W.EXERCISES.map(e=>e.id):process.argv[2].split(',');const n=240;
ids.forEach(id=>{const r=A.rigOf(W.EX_BY_ID[id]);let roll=0,rt=0,tw=0,tt=0,gap=999,gt=0,shs=0;let prev=null;
for(let i=0;i<=n;i++){const t=i/n,o=A._prims(r,t),sk=o.sk;['n','f'].forEach(s=>{const U=sk['UAf'+s],F=sk['FAf'+s];
 const twist=deg(D(orth(U.ou,F.a),F.ou));if(twist>tw){tw=twist;tt=t;}
 if(prev){const P=prev['FAf'+s];const d=deg(D(orth(P.ou,F.a),F.ou));if(d>roll){roll=d;rt=t;} shs=Math.max(shs,L(S(sk['S'+s],prev['S'+s])));}
 const E=sk['E'+s],ax=N(S(sk.Sc,sk.Hc)),q=S(E,sk.Hc),pr=D(q,ax);if(pr>0&&pr<L(S(sk.Sc,sk.Hc))){const g=L(S(q,K(ax,pr)));if(g<gap){gap=g;gt=t;}}});
 prev={FAfn:sk.FAfn,FAff:sk.FAff,Sn:sk.Sn,Sf:sk.Sf};}
const flag=(roll>6?'ROLL ':'')+(tw>70?'TWIST ':'')+(gap<13?'THRU ':'');
if(process.argv[3]!=='bad'||flag)console.log(id.padEnd(22),'maxRollStep',roll.toFixed(1).padStart(5),'@'+rt.toFixed(2),'| uaVsFaTwist',tw.toFixed(0).padStart(3),'@'+tt.toFixed(2),'| elbowTorsoGap',gap.toFixed(1),'@'+gt.toFixed(2),'| shStep',shs.toFixed(2),flag);});
