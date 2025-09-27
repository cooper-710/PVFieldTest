import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createTurfMaterial } from './turf.js';

let scene, camera, renderer, controls;
const clock = new THREE.Clock();

export function initScene() {
  const canvas = document.getElementById('three-canvas');

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x141517);
  scene.fog = new THREE.Fog(0x141517, 120, 900);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.12).texture;

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 2.6, -65);
  camera.lookAt(0, 2.5, 0);
  scene.add(camera);

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

  const key = new THREE.DirectionalLight(0xffe3c6, 1.8);
  key.position.set(6, 12, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 120;
  scene.add(key);

  const fill = new THREE.HemisphereLight(0x9fc2ff, 0x2a1d0d, 0.55);
  scene.add(fill);

  const plateLight = new THREE.PointLight(0xffffff, 0.75, 120);
  plateLight.position.set(0, 3.0, -60.5);
  scene.add(plateLight);
  // Stadium lights (4 tall poles with wide spots)
  const polePositions = [
    new THREE.Vector3(140, 0, -20),
    new THREE.Vector3(-140, 0, -20),
    new THREE.Vector3(160, 0, 140),
    new THREE.Vector3(-160, 0, 140)
  ];
  polePositions.forEach(p => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4,0.6,35,16), new THREE.MeshStandardMaterial({color:0x888888, metalness:0.6, roughness:0.4}));
    pole.position.set(p.x, 17.5, p.z);
    pole.castShadow = false; pole.receiveShadow = false;
    scene.add(pole);

    const spot = new THREE.SpotLight(0xffffff, 2.0, 1200, Math.PI/3.2, 0.35, 1.0);
    spot.position.set(p.x, 34, p.z);
    spot.target.position.set(0, 0, -20);
    scene.add(spot.target);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048,2048);
    spot.shadow.bias = -0.0002;
    scene.add(spot);
  });

  // Prevent context menu when panning with right click
  (renderer.domElement || canvas).addEventListener('contextmenu', e => e.preventDefault());

  
  // ======== FIELD GEOMETRY (corrected) ========
  const tl = new THREE.TextureLoader();
  const grassColor = tl.load('./textures/grass/color.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.repeat.set(24,24); });
  const grassNormal = tl.load('./textures/grass/normal.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(24,24); });
  const dirtColor  = tl.load('./textures/dirt/color.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.repeat.set(8,8); });
  const dirtNormal = tl.load('./textures/dirt/normal.jpg', t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(8,8); });

  // Big grass field
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600, 1, 1),
    new THREE.MeshStandardMaterial({ map: grassColor, normalMap: grassNormal, roughness: 0.88, metalness: 0.0 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Infield diamond (127.3 ft across corners)
  const DIAMOND = 127.3;
  const infieldDiamond = new THREE.Mesh(
    new THREE.PlaneGeometry(DIAMOND, DIAMOND, 1, 1),
    new THREE.MeshStandardMaterial({ map: dirtColor, normalMap: dirtNormal, roughness: 0.92, metalness: 0.0 })
  );
  infieldDiamond.rotation.x = -Math.PI/2;
  infieldDiamond.rotation.z = Math.PI/4;
  infieldDiamond.position.set(0, 0.006, -60.5 + 45);
  infieldDiamond.receiveShadow = true;
  scene.add(infieldDiamond);

  // Base paths
  function addPath(x1,z1,x2,z2,width=6){
    const dx=x2-x1, dz=z2-z1;
    const len=Math.hypot(dx,dz);
    const geo=new THREE.PlaneGeometry(width, len);
    const mat=new THREE.MeshStandardMaterial({ map: dirtColor, normalMap: dirtNormal, roughness:0.92, metalness:0.0 });
    const m=new THREE.Mesh(geo,mat);
    m.rotation.x = -Math.PI/2;
    const ang = Math.atan2(dx, dz);
    m.rotation.z = ang;
    m.position.set((x1+x2)/2, 0.007, (z1+z2)/2);
    m.receiveShadow=true;
    scene.add(m);
  }
  const HOME = new THREE.Vector3(0,0,-60.5);
  const B1 = new THREE.Vector3(90,0,-60.5);
  const B2 = new THREE.Vector3(0,0,29.5);
  const B3 = new THREE.Vector3(-90,0,-60.5);
  addPath(HOME.x, HOME.z, B1.x, B1.z);
  addPath(B1.x, B1.z, B2.x, B2.z);
  addPath(B2.x, B2.z, B3.x, B3.z);
  addPath(B3.x, B3.z, HOME.x, HOME.z);

  // Foul lines
  function addChalkLine(x1,z1,x2,z2,width=0.8){
    const dx = x2-x1, dz = z2-z1;
    const len = Math.sqrt(dx*dx+dz*dz);
    const geo = new THREE.PlaneGeometry(width, len);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.0 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI/2;
    const ang = Math.atan2(dx, dz);
    m.rotation.z = ang;
    m.position.set((x1+x2)/2, 0.012, (z1+z2)/2);
    m.receiveShadow = true;
    scene.add(m);
  }
  addChalkLine(HOME.x, HOME.z, HOME.x+280, HOME.z);
  addChalkLine(HOME.x, HOME.z, HOME.x-280, HOME.z);

  // Bases
  const baseTex = tl.load('./textures/misc/base_color.jpg', t => { t.colorSpace = THREE.SRGBColorSpace; });
  function addBase(x,z, size=1.5){
    const m = new THREE.Mesh(new THREE.BoxGeometry(size, 0.12, size), new THREE.MeshStandardMaterial({ map: baseTex, roughness: 0.55, metalness: 0.0 }));
    m.position.set(x, 0.06, z);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m);
  }
  addBase(B1.x, B1.z);
  addBase(B2.x, B2.z);
  addBase(B3.x, B3.z);

  // Home plate
  const plateShape = new THREE.Shape();
  shape.moveTo(-0.85,0); shape.lineTo(0.85,0); shape.lineTo(0.85,0.5);
  shape.lineTo(0,1.0);   shape.lineTo(-0.85,0.5); shape.lineTo(-0.85,0);
  const plate = new THREE.Mesh(new THREE.ShapeGeometry(plateShape),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, clearcoat: 0.2 }));
  plate.rotation.x = -Math.PI/2;
  plate.position.set(HOME.x, 0.011, HOME.z);
  plate.receiveShadow = true;
  scene.add(plate);

  // Batter's boxes
  function addBox(x,z,w=3.5,h=5){
    const box = new THREE.Mesh(new THREE.PlaneGeometry(w,h), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.65, metalness: 0.0 }));
    box.rotation.x = -Math.PI/2;
    box.position.set(x, 0.011, z);
    scene.add(box);
  }
  addBox(3.5, HOME.z + 3.5);
  addBox(-3.5, HOME.z + 3.5);

  // Outfield wall
  const wallGroup = new THREE.Group();
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x1b3b5a, roughness: 0.5, metalness: 0.1 });
  function addFence(x1,z1,x2,z2,height=12,thick=0.6){
    const dx=x2-x1, dz=z2-z1;
    const len = Math.sqrt(dx*dx+dz*dz);
    const geo = new THREE.BoxGeometry(thick, height, len);
    const m = new THREE.Mesh(geo, fenceMat);
    m.position.set((x1+x2)/2, height/2, (z1+z2)/2);
    const ang = Math.atan2(dx, dz);
    m.rotation.y = ang;
    m.castShadow = true; m.receiveShadow = true;
    wallGroup.add(m);
  }
  addFence(-200, 260, 200, 260, 12);
  addFence(200, 260, 280, 100, 12);
  addFence(-200, 260, -280, 100, 12);
  scene.add(wallGroup);
// Strike zone
  const zone = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.42, 2.0)),
    new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent:true, opacity:0.9 })
  );
  zone.position.set(0, 2.35, -60.5);
  scene.add(zone);

  // Home plate mesh
  const plateShape = new THREE.Shape();
  shape.moveTo(-0.85,0); shape.lineTo(0.85,0); shape.lineTo(0.85,0.5);
  shape.lineTo(0,1.0);   shape.lineTo(-0.85,0.5); shape.lineTo(-0.85,0);
  const plate = new THREE.Mesh(new THREE.ShapeGeometry(plateShape),
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, clearcoat: 0.2 })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(0, 0.011, -60.5);
  plate.receiveShadow = true;
  scene.add(plate);

  // Outfield wall (simple symmetric fence)
  const wallGroup = new THREE.Group();
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x1b3b5a, roughness: 0.5, metalness: 0.1 });
  function addFence(x1,z1,x2,z2,height=8,thick=0.6){
    const dx=x2-x1, dz=z2-z1;
    const len = Math.sqrt(dx*dx+dz*dz);
    const geo = new THREE.BoxGeometry(thick, height, len);
    const m = new THREE.Mesh(geo, fenceMat);
    m.position.set((x1+x2)/2, height/2, (z1+z2)/2);
    const ang = Math.atan2(dx, dz);
    m.rotation.y = ang;
    m.castShadow = true; m.receiveShadow = true;
    wallGroup.add(m);
  }
  // Straight center field wall and angled corners
  addFence(-170, 180, 170, 180, 10);     // center
  addFence(170, 180, 260, 120, 10);      // right-center to line
  addFence(-170, 180, -260, 120, 10);    // left-center to line
  scene.add(wallGroup);

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
  switch(view) {
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
