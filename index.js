import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* =================================================
    1. BASIC SETUP
================================================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0d8ef);
scene.fog = new THREE.Fog(0xa0d8ef, 10, 80);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 5, 12);
camera.lookAt(0, 0, -5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* =================================================
    2. LIGHT & ENV
================================================= */
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
sun.castShadow = true;
scene.add(sun);

// JALAN
const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 1000), new THREE.MeshPhongMaterial({ color: 0x333333 }));
road.rotation.x = -Math.PI / 2;
road.position.z = -400;
road.receiveShadow = true;
scene.add(road);

// RUMPUT
const grass = new THREE.Mesh(new THREE.PlaneGeometry(200, 1000), new THREE.MeshLambertMaterial({ color: 0x2ecc71 }));
grass.rotation.x = -Math.PI / 2;
grass.position.z = -400;
grass.position.y = -0.1;
grass.receiveShadow = true;
scene.add(grass);

// MARKA JALAN
const roadLines = [];
for (let i = 0; i < 20; i++) {
    [-1, 1].forEach(x => {
        const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        l.rotation.x = -Math.PI / 2;
        l.position.set(x, 0.02, -i * 5);
        scene.add(l);
        roadLines.push(l);
    });
}

// POHON
const trees = [];
function createTree() {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 1.5, 8), new THREE.MeshLambertMaterial({ color: 0x8b4513 }));
    trunk.position.y = 0.75; trunk.castShadow = true; g.add(trunk);
    const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 8), new THREE.MeshLambertMaterial({ color: 0x228b22 }));
    leaves.position.y = 2.5; leaves.castShadow = true; g.add(leaves);
    return g;
}
for (let i = 0; i < 40; i++) {
    const t = createTree();
    t.position.set(Math.random() > 0.5 ? -8 - Math.random() * 10 : 8 + Math.random() * 10, 0, -Math.random() * 100);
    scene.add(t);
    trees.push(t);
}

/* =================================================
    3. GAME VARIABLES
================================================= */
const loader = new GLTFLoader();
let player = null;
let enemyTemplate = null;
let giftTemplate = null;
let enemies = [];
let powerups = [];

let currentLane = 0;
let targetX = 0;
let score = 0;
let lives = 3;

// --- SETTINGAN KECEPATAN (DIPERCEPAT) ---
let baseSpeedLevel = 0.5; 
let speedBoost = 0;      
let totalSpeed = 0.5;    

let activePowerup = null;
let powerupEndTime = 0;

let isGameRunning = false;
let isPaused = false;
let isGameOver = false;

