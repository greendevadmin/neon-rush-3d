import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf2b487);
scene.fog = new THREE.Fog(0xe8b28b, 180, 620);

const camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 1800);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe9f6ff, 0x536043, 2.1));
const sun = new THREE.DirectionalLight(0xffdfb0, 3.2);
sun.position.set(-100, 150, 75);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -180;
sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180;
sun.shadow.camera.bottom = -180;
scene.add(sun);

const mat = (color, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const asphalt = mat(0x30343a, 0.94);
const grass = mat(0x405c38);
const white = mat(0xf5f0e6);
const railMat = mat(0x9caeb5, 0.48, 0.48);
const darkGlass = mat(0x071c2c, 0.19, 0.15);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(1800, 1800), grass);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.85;
ground.receiveShadow = true;
scene.add(ground);

// The centerline is a single CLOSED spline. This prevents the end-to-start
// connector from cutting across the track and producing overlapping road strips.
const controlPoints = [
  [0, 0, 112], [42, 0, 112], [79, 0, 97], [106, 0, 72],
  [116, 0, 39], [108, 0, 8], [80, 0, -13], [96, 0, -43],
  [87, 0, -75], [60, 0, -97], [22, 0, -105], [-20, 0, -101],
  [-57, 0, -82], [-77, 0, -54], [-75, 0, -25], [-96, 0, 0],
  [-111, 0, 32], [-105, 0, 65], [-82, 0, 91], [-47, 0, 106]
].map(p => new THREE.Vector3(p[0], p[1], p[2]));
const centerCurve = new THREE.CatmullRomCurve3(controlPoints, true, 'centripetal', 0.5);
const trackLength = centerCurve.getLength();
const path = centerCurve.getSpacedPoints(1000).slice(0, -1)
  .map(p => new THREE.Vector3(p.x, 0, p.z));
const N = path.length;
const spacing = trackLength / N;
const ROAD_WIDTH = 14;
const KERB_WIDTH = 1.05;

function wrap(s) { return (s % N + N) % N; }
function tangent(i) {
  const before = path[(i - 1 + N) % N];
  const after = path[(i + 1) % N];
  return after.clone().sub(before).normalize();
}
function side(i) {
  const t = tangent(i);
  return new THREE.Vector3(t.z, 0, -t.x);
}
function ribbon(innerOffset, outerOffset, y, material) {
  const vertices = [];
  const indices = [];
  for (let i = 0; i < N; i++) {
    const p = path[i], s = side(i);
    const a = p.clone().addScaledVector(s, innerOffset);
    const b = p.clone().addScaledVector(s, outerOffset);
    a.y = y; b.y = y;
    vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  for (let i = 0; i < N; i++) {
    const a = i * 2, b = ((i + 1) % N) * 2;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  material.side = THREE.DoubleSide;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
function coloredKerbs() {
  const vertices = [], colors = [], indices = [];
  const redColor = new THREE.Color(0xe33a3e);
  const whiteColor = new THREE.Color(0xf6f1e8);
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const isRed = Math.floor(i / 5) % 2 === 0;
    const color = isRed ? redColor : whiteColor;
    const addPoint = (p, offset) => {
      const q = p.clone().addScaledVector(side(i), offset);
      q.y = 0.075;
      vertices.push(q.x, q.y, q.z);
      colors.push(color.r, color.g, color.b);
    };
    // Duplicate each segment's vertices so every kerb block has one clean color.
    addPoint(path[i], -ROAD_WIDTH / 2);
    addPoint(path[i], -ROAD_WIDTH / 2 - KERB_WIDTH);
    const leftEnd = path[j].clone().addScaledVector(side(j), -ROAD_WIDTH / 2);
    const outerEnd = path[j].clone().addScaledVector(side(j), -ROAD_WIDTH / 2 - KERB_WIDTH);
    leftEnd.y = outerEnd.y = 0.075;
    vertices.push(leftEnd.x, leftEnd.y, leftEnd.z, outerEnd.x, outerEnd.y, outerEnd.z);
    for (let k = 0; k < 4; k++) colors.push(color.r, color.g, color.b);
    const b = i * 8;
    indices.push(b, b + 2, b + 1, b + 2, b + 3, b + 1);
    // Matching kerb on the opposite edge.
    const base = vertices.length / 3;
    const makeRight = (p, offset, idx) => {
      const q = p.clone().addScaledVector(side(idx), offset);
      q.y = 0.075;
      vertices.push(q.x, q.y, q.z);
      colors.push(color.r, color.g, color.b);
    };
    makeRight(path[i], ROAD_WIDTH / 2, i);
    makeRight(path[i], ROAD_WIDTH / 2 + KERB_WIDTH, i);
    makeRight(path[j], ROAD_WIDTH / 2, j);
    makeRight(path[j], ROAD_WIDTH / 2 + KERB_WIDTH, j);
    indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.88, side: THREE.DoubleSide
  }));
  mesh.receiveShadow = true;
  scene.add(mesh);
}

ribbon(-ROAD_WIDTH / 2 - KERB_WIDTH, -ROAD_WIDTH / 2, 0.035, white);
ribbon(ROAD_WIDTH / 2, ROAD_WIDTH / 2 + KERB_WIDTH, 0.035, white);
ribbon(-ROAD_WIDTH / 2, ROAD_WIDTH / 2, 0.025, asphalt);
coloredKerbs();

// Checkered start/finish line, aligned with the track at the first checkpoint.
{
  const start = path[0];
  const t = tangent(0);
  const line = new THREE.Group();
  line.position.copy(start);
  line.position.y = 0.105;
  line.rotation.y = Math.atan2(t.x, t.z);
  const tiles = 12;
  const tileWidth = ROAD_WIDTH / tiles;
  const blackTile = mat(0x10151b, 0.8);
  const whiteTile = mat(0xf6f1e8, 0.8);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < tiles; col++) {
      const tile = new THREE.Mesh(
        new THREE.BoxGeometry(tileWidth, 0.035, 0.42),
        (row + col) % 2 ? whiteTile : blackTile
      );
      tile.position.set((col - (tiles - 1) / 2) * tileWidth, 0, (row - 0.5) * 0.42);
      line.add(tile);
    }
  }
  scene.add(line);
}

// Center dashes are rotated to follow each section of the road.
const dashMat = new THREE.MeshStandardMaterial({ color: 0xf6f0e5, roughness: 0.8 });
for (let i = 0; i < N; i += 21) {
  const p = path[i], t = tangent(i);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 3.5), dashMat);
  dash.position.set(p.x, 0.065, p.z);
  dash.rotation.y = Math.atan2(t.x, t.z);
  scene.add(dash);
}

// Guardrail posts and short rail sections follow the same closed centerline.
const postGeo = new THREE.BoxGeometry(0.16, 1.0, 0.16);
const railGeo = new THREE.BoxGeometry(1, 0.24, 0.2);
for (let i = 0; i < N; i += 8) {
  const j = (i + 8) % N;
  for (const sign of [-1, 1]) {
    const p = path[i], q = path[j];
    const a = p.clone().addScaledVector(side(i), sign * (ROAD_WIDTH / 2 + KERB_WIDTH + 1.2));
    const b = q.clone().addScaledVector(side(j), sign * (ROAD_WIDTH / 2 + KERB_WIDTH + 1.2));
    const post = new THREE.Mesh(postGeo, railMat);
    post.position.set(a.x, 0.5, a.z);
    post.castShadow = true;
    scene.add(post);
    const mid = a.clone().lerp(b, 0.5);
    const d = b.clone().sub(a);
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.scale.x = Math.max(0.1, Math.sqrt(d.x * d.x + d.z * d.z));
    rail.position.set(mid.x, 0.91, mid.z);
    rail.rotation.y = Math.atan2(-d.z, d.x);
    scene.add(rail);
  }
}

// Low-poly mountain silhouettes outside the circuit.
for (let i = 0; i < 52; i++) {
  const angle = i * 2.399;
  const radius = 165 + (i % 6) * 23;
  const height = 24 + (i * 17 % 48);
  const size = 14 + (i % 5) * 4;
  const mountain = new THREE.Mesh(
    new THREE.ConeGeometry(size, height, 6),
    mat(i % 3 === 0 ? 0x536f48 : (i % 2 ? 0x718556 : 0x8a9a61))
  );
  mountain.position.set(Math.cos(angle) * radius, height / 2 - 2, Math.sin(angle) * radius);
  mountain.rotation.y = angle * 0.37;
  mountain.receiveShadow = true;
  scene.add(mountain);
}

// Ocean along the eastern coastline, below the road level.
const oceanMat = new THREE.MeshStandardMaterial({
  color: 0x247fa0, roughness: 0.28, metalness: 0.16
});
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1500), oceanMat);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(830, -3.1, 0);
scene.add(ocean);
const coastCliffs = mat(0x655c4d, 1);
for (let i = 0; i < 22; i++) {
  const rock = new THREE.Mesh(
    new THREE.ConeGeometry(11 + (i % 4) * 3, 18 + (i % 5) * 5, 7),
    coastCliffs
  );
  rock.position.set(120 + (i % 4) * 7, -3 + (i % 3), -150 + i * 14);
  rock.rotation.z = (i % 2 ? 0.18 : -0.12);
  scene.add(rock);
}

// A distant waterfall adds a landmark to the coastal course.
const cliffRock = mat(0x7a7564, 1);
const cliff = new THREE.Mesh(new THREE.BoxGeometry(34, 20, 20), cliffRock);
cliff.position.set(-130, 4, 10);
scene.add(cliff);
const waterfallMat = new THREE.MeshStandardMaterial({
  color: 0x82d6ee, emissive: 0x1a6d91, emissiveIntensity: 0.28,
  transparent: true, opacity: 0.82, roughness: 0.22, side: THREE.DoubleSide
});
const waterfall = new THREE.Mesh(new THREE.PlaneGeometry(8, 23), waterfallMat);
waterfall.position.set(-119, 0, 13);
waterfall.rotation.y = -0.18;
scene.add(waterfall);

// Detailed compact sports cars built from simple meshes.
const bluePaint = new THREE.MeshStandardMaterial({
  color: 0x067af2, metalness: 0.72, roughness: 0.24
});
const wheelMat = mat(0x101419, 0.72);
const rimMat = mat(0x8595a2, 0.35, 0.65);
function makeCar(color, police = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.56, roughness: 0.28 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.56, 4.15), paint);
  body.position.y = 0.69;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.2, 1.28), paint);
  hood.position.set(0, 0.98, 1.1);
  group.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.43, 0.56, 1.78), darkGlass);
  cabin.position.set(0, 1.18, -0.12);
  cabin.castShadow = true;
  group.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.08, 1.2), paint);
  roof.position.set(0, 1.48, -0.1);
  group.add(roof);
  for (const x of [-1.07, 1.07]) {
    for (const z of [-1.25, 1.25]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.24, 18), wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.4, z);
      wheel.castShadow = true;
      group.add(wheel);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.255, 14), rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(x * 1.01, 0.4, z);
      group.add(rim);
    }
  }
  for (const x of [-0.69, 0.69]) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.13, 0.07),
      new THREE.MeshBasicMaterial({ color: police ? 0xff263f : 0xff193d })
    );
    light.position.set(x, 0.74, -2.1);
    group.add(light);
    const headlight = new THREE.Mesh(
      new THREE.BoxGeometry(0.37, 0.12, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xfff1c9 })
    );
    headlight.position.set(x, 0.75, 2.1);
    group.add(headlight);
  }
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.13, 0.28), mat(0x1d2937, 0.35));
    bar.position.set(0, 1.54, 0.0);
    group.add(bar);
    for (const x of [-0.31, 0.31]) {
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.14, 0.24),
        new THREE.MeshBasicMaterial({ color: x < 0 ? 0xff153b : 0x1a7dff })
      );
      lamp.position.set(x, 1.63, 0);
      group.add(lamp);
    }
  }
  if (!police) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.09, 0.23), paint);
    wing.position.set(0, 1.12, -1.82);
    group.add(wing);
    for (const x of [-0.61, 0.61]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.1), paint);
      support.position.set(x, 0.99, -1.78);
      group.add(support);
    }
  }
  return group;
}

const car = makeCar(0x087cf0);
scene.add(car);
const rivals = [];
const rivalColors = [0xf1f1eb, 0xe53f3f, 0xf0b82e, 0x2ab66a, 0x752fea];
for (let i = 0; i < 5; i++) {
  // Five regular competitors line up just behind the player's start position.
  const mesh = makeCar(rivalColors[i]);
  scene.add(mesh);
  const startProgress = -(i + 1) * 22;
  rivals.push({
    mesh,
    progress: startProgress,
    s: wrap(startProgress),
    off: i % 2 ? 2.7 : -2.6,
    pace: 24 + i * 1.4
  });
}

function pose(s, offset = 0) {
  const u = wrap(s);
  const i = Math.floor(u);
  const f = u - i;
  const p = path[i].clone().lerp(path[(i + 1) % N], f);
  const t = tangent(i).lerp(tangent((i + 1) % N), f).normalize();
  const lateral = new THREE.Vector3(t.z, 0, -t.x);
  p.addScaledVector(lateral, offset);
  return { p, t };
}

// Collectibles are placed on the road itself and use the same track coordinates.
const coins = [];
const coinGold = new THREE.MeshStandardMaterial({
  color: 0xffc51b, emissive: 0x8d4d00, emissiveIntensity: 0.42,
  metalness: 0.65, roughness: 0.23
});
for (let s = 35; s < N; s += 82) {
  const off = (Math.floor(s / 82) % 2 ? -2.8 : 2.8);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.16, 10, 20), coinGold);
  ring.position.set(0, 1.3, 0);
  const q = pose(s, off);
  ring.position.copy(q.p).add(new THREE.Vector3(0, 1.32, 0));
  ring.rotation.y = Math.atan2(q.t.x, q.t.z);
  ring.castShadow = true;
  scene.add(ring);
  coins.push({ mesh: ring, s, off, collected: false });
}
const boosts = [];
for (let s = 120; s < N; s += 245) {
  const q = pose(s, 0);
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.8, 0),
    new THREE.MeshStandardMaterial({
      color: 0x13dfff, emissive: 0x0079ff, emissiveIntensity: 1.5,
      metalness: 0.32, roughness: 0.18
    })
  );
  crystal.position.copy(q.p).add(new THREE.Vector3(0, 1.45, 0));
  scene.add(crystal);
  boosts.push({ mesh: crystal, s, off: 0, collected: false });
}

// A real minimap path follows the repaired track.
const mapPath = document.getElementById('maptrack');
const playerMarker = document.getElementById('player-marker');
const minX = Math.min(...path.map(p => p.x));
const maxX = Math.max(...path.map(p => p.x));
const minZ = Math.min(...path.map(p => p.z));
const maxZ = Math.max(...path.map(p => p.z));
function mapXY(p) {
  const size = 154;
  const scale = Math.min(size / (maxX - minX), size / (maxZ - minZ));
  return {
    x: 100 + (p.x - (minX + maxX) / 2) * scale,
    y: 100 + (p.z - (minZ + maxZ) / 2) * scale
  };
}
mapPath.setAttribute('d', path.map((p, i) => {
  const q = mapXY(p);
  return (i ? 'L' : 'M') + q.x.toFixed(1) + ' ' + q.y.toFixed(1);
}).join(' ') + ' Z');

const TOTAL_LAPS = 3;
let playerProgress = 0;
let s = 0;
let currentLap = 1;
let raceTime = 0;
let raceFinished = false;
let lateral = 0;
let speed = 0;
let nitro = 100;
let points = 0;
let coinCount = 0;
let paused = false;
const keys = {};
addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  keys[key] = true;
  if (key === ' ' || key.startsWith('arrow')) e.preventDefault();
  if (key === 'escape') togglePause();
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function togglePause() {
  if (raceFinished) return;
  paused = !paused;
  document.getElementById('pause-overlay').classList.toggle('visible', paused);
  document.getElementById('pause-button').textContent = paused ? '▶' : 'Ⅱ';
}
document.getElementById('pause-button').addEventListener('click', togglePause);
document.getElementById('resume-button').addEventListener('click', togglePause);

function formatRaceTime(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remaining = (seconds % 60).toFixed(1).padStart(4, '0');
  return minutes + ':' + remaining;
}
function finishRace() {
  raceFinished = true;
  speed = 0;
  paused = false;
  const place = 1 + rivals.filter(r => r.progress > playerProgress).length;
  document.getElementById('finish-position').textContent = place + 'º LUGAR';
  document.getElementById('finish-stats').textContent =
    'Tempo: ' + formatRaceTime(raceTime) + ' · ' +
    points.toLocaleString('pt-BR') + ' pontos · ' + coinCount + ' moedas';
  document.getElementById('finish-overlay').classList.add('visible');
  document.getElementById('pause-overlay').classList.remove('visible');
}
function restartRace() {
  playerProgress = 0;
  s = 0;
  currentLap = 1;
  raceTime = 0;
  raceFinished = false;
  lateral = 0;
  speed = 0;
  nitro = 100;
  points = 0;
  coinCount = 0;
  paused = false;
  for (const key in keys) keys[key] = false;
  rivals.forEach((r, i) => {
    r.progress = -(i + 1) * 22;
    r.s = wrap(r.progress);
  });
  [...coins, ...boosts].forEach(item => {
    item.collected = false;
    item.mesh.visible = true;
  });
  document.getElementById('finish-overlay').classList.remove('visible');
  document.getElementById('pause-overlay').classList.remove('visible');
  document.getElementById('pause-button').textContent = 'Ⅱ';
  document.getElementById('lap').textContent = '1/' + TOTAL_LAPS;
  document.getElementById('race-time').textContent = '00:00.0';
  document.getElementById('points').textContent = '0';
  document.getElementById('coins').textContent = '0';
  document.getElementById('nitro-fill').style.width = '100%';
  document.getElementById('position').textContent = '1/6';
}
document.getElementById('restart-button').addEventListener('click', restartRace);

const clock = new THREE.Clock();
function circularDifference(a, b) {
  let d = wrap(a) - wrap(b);
  if (d > N / 2) d -= N;
  if (d < -N / 2) d += N;
  return d;
}
function updatePickups(items, dt, type) {
  for (const item of items) {
    if (item.collected) continue;
    item.mesh.rotation.y += dt * (type === 'coin' ? 1.8 : 1.1);
    item.mesh.position.y = (type === 'coin' ? 1.32 : 1.45) + Math.sin(clock.elapsedTime * 2.5 + item.s) * 0.12;
    const along = Math.abs(circularDifference(item.s, s)) * spacing;
    if (along < 3.1 && Math.abs(lateral - item.off) < 2.05) {
      item.collected = true;
      item.mesh.visible = false;
      if (type === 'coin') {
        points += 100;
        coinCount++;
      } else {
        nitro = Math.min(100, nitro + 42);
      }
    }
  }
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.04);
  if (!paused && !raceFinished) {
    raceTime += dt;
    document.getElementById('race-time').textContent = formatRaceTime(raceTime);
    const accelerating = keys.w || keys.arrowup;
    const braking = keys.s || keys.arrowdown;
    const steering = (keys.a || keys.arrowleft ? -1 : 0) + (keys.d || keys.arrowright ? 1 : 0);
    const usingNitro = (keys[' '] || keys.shift) && nitro > 0 && speed > 3;
    if (usingNitro) {
      speed += 27 * dt;
      nitro = Math.max(0, nitro - 26 * dt);
    } else {
      nitro = Math.min(100, nitro + 5.5 * dt);
    }
    speed += (accelerating ? 17 : 0) - (braking ? 28 : 0) - (speed > 0 ? 3.2 : 0);
    speed = THREE.MathUtils.clamp(speed, 0, usingNitro ? 64 : 49);

    lateral += steering * dt * (2.5 + speed * 0.105);
    const edge = ROAD_WIDTH / 2 - 1.05;
    if (Math.abs(lateral) > edge) {
      lateral = THREE.MathUtils.clamp(lateral, -edge, edge);
      speed *= 0.9;
    }
    lateral *= Math.pow(0.989, dt * 60);
    playerProgress += speed * dt / spacing;
    s = wrap(playerProgress);
    currentLap = Math.min(TOTAL_LAPS, Math.floor(playerProgress / N) + 1);
    document.getElementById('lap').textContent = currentLap + '/' + TOTAL_LAPS;
    if (playerProgress >= TOTAL_LAPS * N) finishRace();

    const player = pose(s, lateral);
    car.position.copy(player.p);
    car.position.y = 0;
    car.rotation.y = Math.atan2(player.t.x, player.t.z) - steering * 0.035;

    for (const rival of rivals) {
      rival.progress += rival.pace * dt / spacing;
      rival.s = wrap(rival.progress);
      const q = pose(rival.s, rival.off);
      rival.mesh.position.copy(q.p);
      rival.mesh.position.y = 0;
      rival.mesh.rotation.y = Math.atan2(q.t.x, q.t.z);
    }

    updatePickups(coins, dt, 'coin');
    updatePickups(boosts, dt, 'boost');

    const behind = player.p.clone().addScaledVector(player.t, -10.8);
    behind.y += 5.2;
    camera.position.lerp(behind, 1 - Math.pow(0.001, dt));
    const look = player.p.clone().addScaledVector(player.t, 7.5);
    look.y += 1.25;
    camera.lookAt(look);

    const kmh = Math.round(speed * 3.0);
    document.getElementById('speed').textContent = kmh;
    document.getElementById('points').textContent = points.toLocaleString('pt-BR');
    document.getElementById('coins').textContent = coinCount;
    document.getElementById('nitro-fill').style.width = nitro + '%';

    const ahead = rivals.filter(r => r.progress > playerProgress).length;
    document.getElementById('position').textContent = (ahead + 1) + '/6';

    const marker = mapXY(player.p);
    playerMarker.setAttribute('points', (marker.x) + ',' + (marker.y - 6) + ' ' +
      (marker.x - 5) + ',' + (marker.y + 5) + ' ' + (marker.x + 5) + ',' + (marker.y + 5));
    playerMarker.setAttribute('transform', 'rotate(' +
      (-Math.atan2(player.t.x, player.t.z) * 180 / Math.PI) + ' ' + marker.x + ' ' + marker.y + ')');

    const hint = document.getElementById('hint');
    if (coins.some(c => !c.collected) && Math.floor(clock.elapsedTime) % 18 < 6) {
      hint.textContent = 'PEGUE AS MOEDAS • ESPAÇO PARA USAR O NITRO';
    } else {
      hint.textContent = 'WASD / SETAS PARA DIRIGIR • ESC PARA PAUSAR';
    }
  } else {
    camera.lookAt(car.position.x, car.position.y + 1, car.position.z);
  }
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
document.getElementById('loading').style.display = 'none';
animate();
