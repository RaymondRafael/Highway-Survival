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

/* =================================================
   4. UI ELEMENTS
================================================= */
const elNyawa = document.getElementById("nyawa");
const elSkor = document.getElementById("skor");
const elCountdown = document.getElementById("countdown");
const elGameOver = document.getElementById("game-over");
const elPause = document.getElementById("pause-menu");
const elCarSelect = document.getElementById("car-select");

// ELEMEN NOTIFIKASI POWERUP
let elPowerupNotif = document.getElementById("powerup-notif");
if (!elPowerupNotif) {
    elPowerupNotif = document.createElement("div");
    elPowerupNotif.style.position = "absolute";
    elPowerupNotif.style.top = "30%";
    elPowerupNotif.style.width = "100%";
    elPowerupNotif.style.textAlign = "center";
    elPowerupNotif.style.color = "yellow";
    elPowerupNotif.style.fontSize = "40px";
    elPowerupNotif.style.fontWeight = "bold";
    elPowerupNotif.style.textShadow = "3px 3px 6px #000";
    elPowerupNotif.style.fontFamily = "sans-serif";
    elPowerupNotif.style.opacity = "0";
    elPowerupNotif.style.transition = "opacity 0.5s";
    elPowerupNotif.style.zIndex = "15";
    document.body.appendChild(elPowerupNotif);
}

// ELEMEN INFORMASI KONTROL
let elInfo = document.getElementById("game-info");
if (!elInfo) {
    elInfo = document.createElement("div");
    elInfo.style.position = "absolute";
    elInfo.style.bottom = "20px";
    elInfo.style.left = "20px";
    elInfo.style.color = "white";
    elInfo.style.fontFamily = "sans-serif";
    elInfo.style.fontSize = "14px";
    elInfo.style.backgroundColor = "rgba(0,0,0,0.5)";
    elInfo.style.padding = "15px";
    elInfo.style.borderRadius = "8px";
    elInfo.style.zIndex = "5";
    elInfo.innerHTML = `
        <strong style="font-size:16px">🎮 KONTROL</strong><br>
        ⬅️ ➡️ : Pindah Jalur<br>
        🅿️ : Pause Game
    `;
    document.body.appendChild(elInfo);
}

/* =================================================
   5. RESET & SELECT CAR
================================================= */
window.selectCar = (file) => {
    if(elCarSelect) elCarSelect.style.display = "none";
    resetGame();
    loadPlayer(file);
};

function resetGame() {
    enemies.forEach(e => scene.remove(e)); enemies = [];
    powerups.forEach(p => scene.remove(p)); powerups = [];
    if (player) { scene.remove(player); player = null; }

    score = 0;
    lives = 3;
    currentLane = 0;
    targetX = 0;
    
    // Reset Speed
    baseSpeedLevel = 0.5;
    speedBoost = 0;
    updateTotalSpeed();

    activePowerup = null;
    isGameRunning = false;
    isPaused = false;
    isGameOver = false;

    if(elSkor) elSkor.innerText = "0";
    if(elNyawa) elNyawa.innerText = "❤️❤️❤️";
    if(elGameOver) elGameOver.style.display = "none";
    
    // Reset Kamera
    camera.position.set(0, 5, 12);
    camera.rotation.z = 0; 
}

function updateTotalSpeed() {
    totalSpeed = baseSpeedLevel + speedBoost;
}

function showNotif(text, color) {
    elPowerupNotif.innerText = text;
    elPowerupNotif.style.color = color;
    elPowerupNotif.style.opacity = 1;
    setTimeout(() => { elPowerupNotif.style.opacity = 0; }, 2000);
}

/* =================================================
   6. LOAD ASSETS
================================================= */
function loadPlayer(file) {
    loader.load(`/img/${file}`, gltf => {
        player = gltf.scene;
        const box = new THREE.Box3().setFromObject(player);
        const size = new THREE.Vector3(); box.getSize(size);
        player.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
        player.position.set(0, 0, 0);
        player.rotation.y = Math.PI;
        player.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }});
        scene.add(player);
        checkReady();
    });
}

function loadEnemyTemplate() {
    loader.load("/img/musuh.glb", gltf => {
        enemyTemplate = gltf.scene;
        const box = new THREE.Box3().setFromObject(enemyTemplate);
        const size = new THREE.Vector3(); box.getSize(size);
        enemyTemplate.scale.setScalar(2 / Math.max(size.x, size.y, size.z));
        enemyTemplate.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }});
        checkReady();
    });
}

function loadGiftTemplate() {
    loader.load("/img/gift.glb", gltf => {
        giftTemplate = gltf.scene;
        const box = new THREE.Box3().setFromObject(giftTemplate);
        const size = new THREE.Vector3(); box.getSize(size);
        giftTemplate.scale.setScalar(1.5 / Math.max(size.x, size.y, size.z));
        giftTemplate.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }});
        checkReady();
    }, undefined, (err) => {
        console.error("Gagal load gift.glb", err);
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        giftTemplate = new THREE.Mesh(geometry, material);
        checkReady();
    });
}

function checkReady() {
    if (player && enemyTemplate && giftTemplate) startCountdown();
}

loadEnemyTemplate();
loadGiftTemplate();

/* =================================================
   7. GAME LOGIC
================================================= */
function startCountdown() {
    let c = 3;
    if(elCountdown) { 
        elCountdown.style.display = "block"; 
        elCountdown.style.color = "yellow"; 
        elCountdown.innerText = c; 
    }
    const t = setInterval(() => {
        c--;
        if (c > 0) {
            elCountdown.innerText = c;
        } 
        else if (c === 0) {
            elCountdown.innerText = "GO!";
            elCountdown.style.color = "#00ff00"; 
        } 
        else { 
            clearInterval(t); 
            elCountdown.style.display = "none"; 
            isGameRunning = true; 
        }
    }, 1000);
}

// SPAWN ENEMY
setInterval(() => {
    if (!isGameRunning || isPaused || isGameOver || !enemyTemplate) return;
    const e = enemyTemplate.clone();
    e.position.set((Math.floor(Math.random() * 3) - 1) * 2, 0.5, -80);
    e.rotation.y = 0; 
    
    // Properti untuk menandai apakah sudah dilewati (untuk skor)
    e.hasPassed = false; 

    scene.add(e);
    enemies.push(e);
}, 1300); 

// SPAWN POWERUP
setInterval(() => {
    if (!isGameRunning || isPaused || isGameOver || !giftTemplate) return;
    const p = giftTemplate.clone();
    p.position.set((Math.floor(Math.random() * 3) - 1) * 2, 1, -100);
    scene.add(p);
    powerups.push(p);
}, 10000); 

/* =================================================
   8. INPUT
================================================= */
document.addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "p" && isGameRunning) {
        isPaused = !isPaused;
        if(elPause) elPause.style.display = isPaused ? "block" : "none";
    }
    if (!isPaused && isGameRunning) {
        if (e.key === "ArrowLeft" && currentLane > -1) currentLane--;
        if (e.key === "ArrowRight" && currentLane < 1) currentLane++;
        targetX = currentLane * 2;
    }
});

/* =================================================
   9. MAIN LOOP (PAKAI AI)
================================================= */
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    if (!isGameRunning || isPaused || isGameOver) return;

    // --- LINGKUNGAN ---
    roadLines.forEach(l => { l.position.z += totalSpeed; if (l.position.z > 10) l.position.z = -90; });
    trees.forEach(t => {
        t.position.z += totalSpeed;
        if (t.position.z > 20) {
            t.position.z = -80 - Math.random() * 20;
            t.position.x = Math.random() > 0.5 ? -8 - Math.random() * 10 : 8 + Math.random() * 10;
        }
    });

    // --- PLAYER ANIMATION (KEMBALI KE STANDAR) ---
    if (player) {
        const deltaX = targetX - player.position.x;
        
        // Gerakan
        player.position.x += deltaX * 0.15; 

        // Rotasi Belok (Subtle / Tidak Dramatis)
        player.rotation.y = Math.PI - (deltaX * 0.1); 
        
        // Body Roll (Sedikit saja)
        player.rotation.z = (deltaX * 0.05);

        // Getaran Mesin
        player.position.y = Math.sin(Date.now() * 0.01) * 0.02;

        // Kamera Dinamis (Follow) - Tanpa rotasi miring
        camera.position.x += (player.position.x * 0.3 - camera.position.x) * 0.05;
        camera.rotation.z = 0; // Pastikan kamera tegak
    }

    // --- POWERUP LOGIC ---
    powerups.forEach((p, index) => {
        p.position.z += totalSpeed;
        p.rotation.y += 0.05; 
        p.position.y = 1 + Math.sin(Date.now() * 0.005) * 0.2;

        if (player && Math.abs(p.position.z - player.position.z) < 3.0 && Math.abs(p.position.x - player.position.x) < 1.2) {
            if (Math.random() > 0.5) {
                activePowerup = 'speed';
                speedBoost = 0.6; 
                showNotif("⚡ SPEED BOOST! (5s)", "#ffff00"); 
                powerupEndTime = Date.now() + 5000; 
            } else {
                activePowerup = 'shield';
                showNotif("🛡️ SHIELD ACTIVE! (10s)", "#00ffff"); 
                powerupEndTime = Date.now() + 10000; 
            }
            updateTotalSpeed();
            scene.remove(p);
            powerups.splice(index, 1);
        } 
        else if (p.position.z > 20) { // Hilang di belakang layar
            scene.remove(p);
            powerups.splice(index, 1);
        }
    });

    if (activePowerup && Date.now() > powerupEndTime) {
        activePowerup = null;
        speedBoost = 0; 
        updateTotalSpeed();
    }

    // --- ENEMY LOGIC (PERBAIKAN: TIDAK HILANG SAAT LEWAT) ---
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.position.z += totalSpeed;
        e.position.y = 0.5 + Math.sin(Date.now() * 0.01 + i) * 0.02;

        // 1. CEK TABRAKAN
        if (player && Math.abs(e.position.z - player.position.z) < 2.5 && Math.abs(e.position.x - player.position.x) < 0.8) {
            
            if (activePowerup === 'shield') {
                scene.remove(e);
                enemies.splice(i, 1);
                showNotif("🛡️ BLOCKED!", "#00ffff");
                camera.position.y = 5.5; 
                setTimeout(() => { camera.position.y = 5; }, 50);
                continue;
            }

            lives--;
            if(elNyawa) elNyawa.innerText = "❤️".repeat(Math.max(0, lives));
            
            camera.position.x = (Math.random() - 0.5) * 3.0;
            camera.position.y = 5 + (Math.random() - 0.5) * 1.5;
            setTimeout(() => { camera.position.x = 0; camera.position.y = 5; }, 80);

            scene.remove(e);
            enemies.splice(i, 1);

            if (lives <= 0) {
                isGameOver = true;
                if(elGameOver) elGameOver.style.display = "block";
            }
        } 
        
        // 2. CEK SKOR (Hanya tambah skor, JANGAN HAPUS MOBIL)
        // Gunakan flag 'hasPassed' agar skor tidak bertambah berkali-kali
        else if (e.position.z > player.position.z + 2 && !e.hasPassed) {
            score += 10;
            if(elSkor) elSkor.innerText = score;
            
            // Tandai sudah lewat
            e.hasPassed = true;

            // Leveling
            const newLevel = Math.floor(score / 50);
            if (baseSpeedLevel < 1.5) { 
                baseSpeedLevel += 0.012; 
                updateTotalSpeed();
            }
        }

        // 3. HAPUS MOBIL JIKA SUDAH JAUH DI BELAKANG
        if (e.position.z > 20) { // Angka 20 artinya sudah jauh di belakang kamera
            scene.remove(e);
            enemies.splice(i, 1);
        }
    }
}
animate();