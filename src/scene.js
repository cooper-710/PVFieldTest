import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { createTurfMaterial } from './turf.js'; // not used anymore

let scene, camera, renderer, controls;
const clock = new THREE.Clock();

export function initScene() {
  const canvas = document.getElementById('three-canvas');

  // Renderer
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.physicallyCorrectLights = true;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141517);
  scene.fog = new THREE.Fog(0x141517, 120, 900);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.12).texture;

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 2.6, -65);
  camera.lookAt(0, 2.5, 0);
  scene.add(camera);

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement || canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableRotate = true;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.minDistance = 5;
  controls.maxDistance = 180;
  controls.mouseButtons = {
    LEFT:   THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT:  THREE.MOUSE.PAN
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };
  controls.target.set(0, 2.5, -30);
  controls.update();

  // Key/Fill/Plate lights
  const key = new THREE.DirectionalLight(0xffe3c6, 1.8);
  key.position.set(6, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 120;
  key.shadow.bias = -0.0005;
  scene.add(key);

  const fill = new THREE.HemisphereLight(0x9fc2ff, 0x2a1d0d, 0.55);
  scene.add(fill);

  const plateLight = new THREE.PointLight(0xffffff, 0.75, 120);
  plateLight.position.set(0, 3.0, -60.5);
  scene.add(plateLight);

  // Stadium lights (to see the fences)
  const polePositions = [
    new THREE.Vector3(140, 0, -20),
    new THREE.Vector3(-140, 0, -20),
    new THREE.Vector3(160, 0, 140),
    new THREE.Vector3(-160, 0, 140)
  ];
  polePositions.forEach(p => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 35, 16),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.4 })
    );
    pole.position.set(p.x, 17.5, p.z);
    pole.castShadow = false;
    scene.add(pole);

    const spot = new THREE.SpotLight(0xffffff, 2.0, 1200, Math.PI / 3.2, 0.35, 1.0);
    spot.position.set(p.x, 34, p.z);
    spot.target.position.set(0, 0, -20);
    scene.add(spot.target);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.bias = -0.0002;
    scene.add(spot);
  });

  // Prevent right-click menu while panning
  (renderer.domElement || canvas).addEventListener('contextmenu', e => e.preventDefault());

  // ======== FIELD GEOMETRY — mound @ origin, home @ (0,0,-60.5), 1 unit = 1 ft ========
  const tl = new THREE.TextureLoader();
  const grassColor = tl.load('./textures/grass/color.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.repeat.set(8, 8); });
  const grassNormal = tl.load('./textures/grass/normal.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8, 8); });
  const dirtColor  = tl.load('./textures/dirt/color.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.repeat.set(2, 2); });
  const dirtNormal = tl.load('./textures/dirt/normal.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); });

  // Grass outfield
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600, 1, 1),
    new THREE.MeshStandardMaterial({ map: grassColor, normalMap: grassNormal, roughness: 0.88, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Home and axes
  const HOME = new THREE.Vector3(0, 0, -60.5);
  const ex = new THREE.Vector3(1, 0, 0); // +X → 1B line (right field)
  const ez = new THREE.Vector3(0, 0, 1); // +Z → 3B line (left field)
  const P = (x, z, y = 0) => new THREE.Vector3(HOME.x + x, y, HOME.z + z);

  // Dimensions (ft)
  const BASE = 90;
  const BASEPATH_W = 6;

  // Bases (exact square)
  const B_HOME = P(0, 0);
  const B_1B   = P(BASE, 0);
  const B_2B   = P(BASE, BASE);
  const B_3B   = P(0, BASE);

  // Infield dirt (diamond centered between home and 2B)
  const infieldSize = BASE * Math.SQRT2;
  const infield = new THREE.Mesh(
    new THREE.PlaneGeometry(infieldSize, infieldSize, 1, 1),
    new THREE.MeshStandardMaterial({ map: dirtColor, normalMap: dirtNormal, roughness: 0.94, metalness: 0.0 })
  );
  infield.rotation.x = -Math.PI / 2;
  infield.rotation.z = Math.PI / 4;
  infield.position.set((B_HOME.x + B_2B.x) / 2, 0.006, (B_HOME.z + B_2B.z) / 2);
  infield.receiveShadow = true;
  scene.add(infield);

  // Base paths (rectangular dirt strips)
  function addPath(a, b, w = BASEPATH_W) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const geo = new THREE.PlaneGeometry(w, len);
    const mat = new THREE.MeshStandardMaterial({ map: dirtColor, normalMap: dirtNormal, roughness: 0.92, metalness: 0.0 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.atan2(dx, dz);
    m.position.set((a.x + b.x) / 2, 0.007, (a.z + b.z) / 2);
    m.receiveShadow = true;
    scene.add(m);
  }
  addPath(B_HOME, B_1B);
  addPath(B_1B, B_2B);
  addPath(B_2B, B_3B);
  addPath(B_3B, B_HOME);

  // Perpendicular foul lines from home (polygonOffset avoids z-fighting)
  function addChalkLine(a, dir, length, width = 0.85) {
    const b = a.clone().addScaledVector(dir, length);
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const geo = new THREE.PlaneGeometry(width, len);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.6, metalness: 0.0,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.atan2(dx, dz);
    m.position.set((a.x + b.x) / 2, 0.012, (a.z + b.z) / 2);
    m.receiveShadow = true;
    scene.add(m);
  }
  addChalkLine(B_HOME, ex, 330); // RF line
  addChalkLine(B_HOME, ez, 330); // LF line

  // Bases (bags)
  const baseTex = tl.load('./textures/misc/base_color.jpg', t => { t.colorSpace = THREE.SRGBColorSpace; });
  function addBase(pos, size = 1.5) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(size, 0.12, size),
      new THREE.MeshStandardMaterial({ map: baseTex, roughness: 0.55, metalness: 0.0 })
    );
    m.position.set(pos.x, 0.06, pos.z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }
  addBase(B_1B); addBase(B_2B); addBase(B_3B);

  // Home plate (single declaration)
  (function addHomePlate() {
    const plateShape = new THREE.Shape();
    plateShape.moveTo(-0.85, 0); plateShape.lineTo(0.85, 0); plateShape.lineTo(0.85, 0.5);
    plateShape.lineTo(0, 1.0);   plateShape.lineTo(-0.85, 0.5); plateShape.lineTo(-0.85, 0);
    const plate = new THREE.Mesh(
      new THREE.ShapeGeometry(plateShape),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, clearcoat: 0.2 })
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(B_HOME.x, 0.011, B_HOME.z);
    plate.receiveShadow = true;
    scene.add(plate);
  })();

  // Strike zone (unchanged)
  const zone = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.42, 2.0)),
    new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.9 })
  );
  zone.position.set(0, 2.35, -60.5);
  scene.add(zone);

  // -------- Curved, symmetrical outfield wall: 330 / 375 / 400 / 375 / 330 --------
  const wallGroup = new THREE.Group();
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x1b3b5a, roughness: 0.5, metalness: 0.1 });

  function addFence(a, b, height = 12, thick = 0.6) {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
    const geo = new THREE.BoxGeometry(thick, height, len);
    const m = new THREE.Mesh(geo, fenceMat);
    m.position.set((a.x + b.x) / 2, height / 2, (a.z + b.z) / 2);
    m.rotation.y = Math.atan2(dx, dz);
    m.castShadow = true; m.receiveShadow = true;
    wallGroup.add(m);
  }

  // Polar from HOME: angle 0° along +X (RF), 90° along +Z (LF)
  const polarFromHome = (deg, r) => {
    const rad = THREE.MathUtils.degToRad(deg);
    return P(r * Math.cos(rad), r * Math.sin(rad));
  };

  // Control radii at 0°, 22.5°, 45°, 67.5°, 90°
  const rf = 330, rcf = 375, cf = 400, lcf = 375, lf = 330;
  const controlsR = [
    { deg:   0, r: rf   },
    { deg:22.5, r: rcf  },
    { deg:  45, r: cf   },
    { deg:67.5, r: lcf  },
    { deg:  90, r: lf   }
  ];

  // Sample piecewise linearly for a smooth curve
  const curvePts = [];
  for (let i = 0; i < controlsR.length - 1; i++) {
    const a = controlsR[i], b = controlsR[i + 1];
    const steps = 10; // increase for smoother wall
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const deg = THREE.MathUtils.lerp(a.deg, b.deg, t);
      const r   = THREE.MathUtils.lerp(a.r,  b.r,  t);
      curvePts.push(polarFromHome(deg, r));
    }
  }
  curvePts.push(polarFromHome(controlsR.at(-1).deg, controlsR.at(-1).r));

  // Stitch fence segments
  for (let i = 0; i < curvePts.length - 1; i++) {
    addFence(curvePts[i], curvePts[i + 1], 12, 0.6);
  }
  scene.add(wallGroup);

  // Optional: gentle wall lights along the arc for depth
  [-180, -90, 0, 90, 180].forEach(x => {
    const s = new THREE.SpotLight(0xffffff, 0.6, 300, Math.PI / 4.5, 0.5, 1.0);
    s.position.set(x, 14, 240);
    s.target.position.set(x, 0, 200);
    scene.add(s.target);
    s.castShadow = false;
    scene.add(s);
  });

  // Resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (controls && typeof controls.update === 'function') controls.update();
  });

  return { scene, camera, renderer, controls, clock };
}

export function setCameraView(view) {
  let tgt = new THREE.Vector3(0, 2.5, 0);
  switch (view) {
    case 'catcher':  camera.position.set(0, 2.6, -65); tgt.set(0, 2.5, 0); break;
    case 'pitcher':  camera.position.set(0, 6.2, 5.5); tgt.set(0, 2.2, -60.5); break;
    case 'rhh':      camera.position.set(1.2, 4.1, -65); tgt.set(0, 1.5, 0); break;
    case 'lhh':      camera.position.set(-1.2, 4.1, -65); tgt.set(0, 1.5, 0); break;
    case '1b':       camera.position.set(50, 4.8, -30); tgt.set(0, 5, -30); break;
    case '3b':       camera.position.set(-50, 4.8, -30); tgt.set(0, 5, -30); break;
  }
  if (controls) { controls.target.copy(tgt); controls.update(); } else { camera.lookAt(tgt); }
}

export function getRefs(){ return { scene, camera, renderer, controls, clock }; }
