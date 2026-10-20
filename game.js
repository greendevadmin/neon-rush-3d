import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9bbbd0);scene.fog=new THREE.Fog(0x9bbbd0,120,500);
const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,1200);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xeaf7ff,0x536b3b,2));const sun=new THREE.DirectionalLight(0xffedcf,3);sun.position.set(-80,140,40);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
const mat=(c,r=.85)=>new THREE.MeshStandardMaterial({color:c,roughness:r});
const road=mat(0x30343a),grass=mat(0x426c43),red=mat(0xd92d38),white=mat(0xf4f0e6),rail=mat(0x9eabb2);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(1500,1500),grass);ground.rotation.x=-Math.PI/2;ground.position.y=-.7;ground.receiveShadow=true;scene.add(ground);
// Build a centerline from exact circular arcs and straight segments.
const path=[];let cursor=new THREE.Vector3(0,0,0),heading=0;
function straight(L){let steps=Math.ceil(L/2);for(let i=1;i<=steps;i++){let d=L*i/steps;path.push(new THREE.Vector3(cursor.x+Math.sin(heading)*d,0,cursor.z+Math.cos(heading)*d));}cursor=path.at(-1).clone();}
function arc(radius,degrees){let sign=Math.sign(degrees),ang=Math.abs(degrees)*Math.PI/180,steps=Math.max(24,Math.ceil(Math.abs(degrees)*radius/2.5));let cx=cursor.x-sign*Math.cos(heading)*radius,cz=cursor.z+sign*Math.sin(heading)*radius,start=Math.atan2(cursor.z-cz,cursor.x-cx);for(let i=1;i<=steps;i++){let a=start+sign*ang*i/steps;path.push(new THREE.Vector3(cx+radius*Math.cos(a),0,cz+radius*Math.sin(a)));}cursor=path.at(-1).clone();heading+=degrees*Math.PI/180;}
straight(82);arc(34,105);straight(45);arc(23,-145);straight(58);arc(38,-90);straight(48);arc(25,155);straight(52);arc(31,90);straight(40);arc(27,-115);straight(43);arc(35,-90);straight(33);arc(28,90);
const N=path.length,W=13.5,C=1.15;
function tangent(i){return path[(i+1)%N].clone().sub(path[(i-1+N)%N]).normalize();}
function side(i){let t=tangent(i);return new THREE.Vector3(t.z,0,-t.x);}
function strip(a,b,y,material){let v=[],idx=[];for(let i=0;i<N;i++){let s=side(i),p=path[i],q=p.clone().addScaledVector(s,a),r=p.clone().addScaledVector(s,b);q.y=r.y=y;v.push(q.x,q.y,q.z,r.x,r.y,r.z);}for(let i=0;i<N;i++){let a=i*2,b=((i+1)%N)*2;idx.push(a,b,a+1,b,b+1,a+1);}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(idx);g.computeVertexNormals();let m=new THREE.Mesh(g,material);m.receiveShadow=true;scene.add(m);}
strip(-W/2-C,-W/2,.035,white);strip(W/2,W/2+C,.035,white);strip(-W/2,W/2,.025,road);
// Red/white kerb blocks are generated along the same circular/straight centerline.
for(let i=0;i<N;i+=3){let j=(i+3)%N;for(let sign of [-1,1]){let v=[],ids=[];for(let k of [i,(i+1)%N,(i+2)%N,j]){let s=side(k),p=path[k],a=p.clone().addScaledVector(s,sign*W/2),b=p.clone().addScaledVector(s,sign*(W/2+C));a.y=b.y=.065;v.push(a.x,a.y,a.z,b.x,b.y,b.z);}for(let q=0;q<3;q++){let a=q*2,b=a+2;ids.push(a,b,a+1,b,b+1,a+1);}let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setIndex(ids);g.computeVertexNormals();scene.add(new THREE.Mesh(g,Math.floor(i/3)%2?white:red));}}
const dash=mat(0xf4f0e5);for(let i=0;i<N;i+=11){let p=path[i],m=new THREE.Mesh(new THREE.PlaneGeometry(.16,3.2),dash);m.rotation.x=-Math.PI/2;m.position.set(p.x,.055,p.z);scene.add(m);}
for(let i=0;i<N;i+=6){let p=path[i],s=side(i);for(let sign of [-1,1]){let q=p.clone().addScaledVector(s,sign*(W/2+C+1.2));let post=new THREE.Mesh(new THREE.BoxGeometry(.15,1,.15),rail);post.position.set(q.x,.5,q.z);scene.add(post);}}
for(let i=0;i<80;i++){let a=i*2.4,r=125+(i%7)*13,h=12+(i*13%26);let hill=new THREE.Mesh(new THREE.ConeGeometry(10+(i%5)*2,h,7),mat(i%2?0x59754b:0x718454));hill.position.set(Math.cos(a)*r,h/2-1,Math.sin(a)*r);scene.add(hill);}
// Player car
const car=new THREE.Group(),blue=new THREE.MeshStandardMaterial({color:0x087cf0,metalness:.65,roughness:.25}),glass=mat(0x172a38,.2);
let body=new THREE.Mesh(new THREE.BoxGeometry(2.05,.62,4),blue);body.position.y=.72;body.castShadow=true;car.add(body);
let cabin=new THREE.Mesh(new THREE.BoxGeometry(1.42,.53,1.7),glass);cabin.position.set(0,1.16,-.2);car.add(cabin);
for(let x of [-1.04,1.04])for(let z of [-1.25,1.25]){let w=new THREE.Mesh(new THREE.CylinderGeometry(.37,.37,.23,16),mat(0x111419));w.rotation.z=Math.PI/2;w.position.set(x,.42,z);car.add(w);}
for(let x of [-.65,.65]){let l=new THREE.Mesh(new THREE.BoxGeometry(.48,.13,.07),new THREE.MeshBasicMaterial({color:0xff1e3f}));l.position.set(x,.75,-2.03);car.add(l);}
scene.add(car);
const rivals=[];for(let n=0;n<4;n++){let g=new THREE.Group(),b=new THREE.Mesh(new THREE.BoxGeometry(1.8,.65,3.5),mat([0xe6443c,0xf0b72f,0xeeeeee,0x2ab66a][n],.3));b.position.y=.63;g.add(b);let c=new THREE.Mesh(new THREE.BoxGeometry(1.25,.42,1.4),glass);c.position.set(0,1,-.1);g.add(c);scene.add(g);rivals.push({mesh:g,s:80+n*95,off:n%2?2.4:-2.4});}
function wrap(s){return (s%N+N)%N;}
function pose(s,off=0){let i=wrap(s),k=Math.floor(i),f=i-k,p=path[k].clone().lerp(path[(k+1)%N],f),t=tangent(k).lerp(tangent((k+1)%N),f).normalize(),sideV=new THREE.Vector3(t.z,0,-t.x);p.addScaledVector(sideV,off);return {p,t};}
let s=0,lateral=0,speed=0,nitro=100;const keys={};addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(e.key.toLowerCase()))e.preventDefault();});addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);let dt=Math.min(clock.getDelta(),.04),acc=keys.w||keys.arrowup,brake=keys.s||keys.arrowdown,steer=(keys.a||keys.arrowleft?-1:0)+(keys.d||keys.arrowright?1:0);
if(keys[' ']&&nitro>0){speed+=29*dt;nitro=Math.max(0,nitro-25*dt);}else nitro=Math.min(100,nitro+7*dt);
speed+=(acc?17:0)-(brake?26:0)-(speed>0?3.5:0);speed=THREE.MathUtils.clamp(speed,0,66);lateral=THREE.MathUtils.clamp(lateral+steer*dt*(4+speed*.11),-W*.67,W*.67);lateral*=Math.pow(.99,dt*60);s=wrap(s+speed*dt*.68);
let p=pose(s,lateral);car.position.copy(p.p);car.position.y=.03;car.rotation.y=Math.atan2(p.t.x,p.t.z)-steer*.05;
for(let r of rivals){r.s=wrap(r.s+dt*8);let q=pose(r.s,r.off);r.mesh.position.copy(q.p);r.mesh.rotation.y=Math.atan2(q.t.x,q.t.z);}
let behind=p.p.clone().addScaledVector(p.t,-10.5);behind.y=5.2;camera.position.lerp(behind,1-Math.pow(.001,dt));camera.lookAt(p.p.x,p.p.y+1.7,p.p.z);
document.getElementById('speed').textContent=Math.round(speed*3.1)+' KM/H';renderer.render(scene,camera);}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
document.getElementById('loading').style.display='none';animate();
