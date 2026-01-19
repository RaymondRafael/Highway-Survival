import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* =================================================
   1. BASIC SETUP (ENVIRONMENT 3D)
================================================= */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0d8ef);
scene.fog = new THREE.Fog(0xa0d8ef, 20, 90); // Kabut agar environment menyatu

// Kamera Awal (Posisi Showroom)
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 2, 7); 
camera.lookAt(0, 0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* =================================================
   2. LIGHTING (HIGH QUALITY)
================================================= */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(20, 50, 20);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.left = -50;
sunLight.shadow.camera.right = 50;
sunLight.shadow.camera.top = 50;
sunLight.shadow.camera.bottom = -50;
scene.add(sunLight);

/* =================================================
   3. GAME VARIABLES & CAR DATA
================================================= */
const loader = new GLTFLoader();
let gameState = 'MENU'; 

// --- DATA STATISTIK MOBIL ---
const carList = [
    { 
        file: 'mobil.glb', 
        name: 'LAMBORGHINI', 
        stats: 'Speed: ⭐⭐⭐⭐⭐ | Handling: ⭐⭐⭐',
        speedMult: 1.3,  // Sangat Cepat
        handlingVal: 0.1 // Berat/Stabil
    },
    { 
        file: 'mobil2.glb', 
        name: 'MAZDA RX-7', 
        stats: 'Speed: ⭐⭐⭐⭐ | Handling: ⭐⭐⭐⭐⭐',
        speedMult: 1.1,  // Cukup Cepat
        handlingVal: 0.2 // Responsif
    },
    { 
        file: 'mobil3.glb', 
        name: 'TRUENO AE86', 
        stats: 'Drift: ⭐⭐⭐⭐⭐⭐ | Speed: ⭐⭐⭐',
        speedMult: 0.9,  // Pelan
        handlingVal: 0.3 // Sangat Licin/Lincah
    }
];
let currentCarIndex = 0;

// Stats Aktif
let activeSpeedMult = 1.0;
let activeHandling = 0.15;

// Environment Variables
let mapTemplate, forestTemplate;
let activeMapSegments = [];
const MAP_LENGTH = 30; 
const NUM_SEGMENTS = 7; 
const LANE_WIDTH = 1.4; 

// Game Objects
let player = null;
let enemyTemplate = null;
let giftTemplate = null;
let enemies = [];
let powerups = [];

let currentLane = 0;
let targetX = 0;
let score = 0;
let lives = 3;

// Logika Speed
let baseSpeedLevel = 0.4; 
let speedBoost = 0;      
let totalSpeed = 0.4;    
let currentLevel = 0;

let activePowerup = null;
let powerupEndTime = 0;

let isGameRunning = false;
let isPaused = false;
let isGameOver = false;

/* =================================================
   4. UI & INTERACTION
================================================= */
const elNyawa = document.getElementById("nyawa");
const elSkor = document.getElementById("skor");
const elCountdown = document.getElementById("countdown");
const elGameOver = document.getElementById("game-over");
const elPause = document.getElementById("pause-menu");
const elHud = document.getElementById("hud");
const elMainMenu = document.getElementById("main-menu");
const elCarName = document.getElementById("car-name-display");
const elCarStats = document.getElementById("car-stats-display");

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

// Mouse Interaction (Rotate di Showroom)
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
document.addEventListener('mousedown', () => { isDragging = true; });
document.addEventListener('mouseup', () => { isDragging = false; });
document.addEventListener('mousemove', (e) => {
    if (isDragging && gameState === 'MENU' && player) {
        const deltaMove = { x: e.offsetX - previousMousePosition.x };
        player.rotation.y += deltaMove.x * 0.01;
    }
    previousMousePosition = { x: e.offsetX, y: e.offsetY };
});

// ELEMEN INFORMASI KONTROL (PAKAI AI)
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
        <strong style="font-size:16px">🎮 KONTROL:</strong><br><br>
        ⬅️ ➡️ : Pindah Jalur<br>
        🅿️ : Pause Game
    `;
    document.body.appendChild(elInfo);
}

/* =================================================
   5. MENU & GAME FUNCTIONS
================================================= */

// Load mobil pertama
loadPlayer(carList[currentCarIndex].file);

window.changeCar = (direction) => {
    currentCarIndex += direction;
    if (currentCarIndex < 0) currentCarIndex = carList.length - 1;
    if (currentCarIndex >= carList.length) currentCarIndex = 0;

    elCarName.innerText = carList[currentCarIndex].name;
    elCarStats.innerText = carList[currentCarIndex].stats;

    if(player) scene.remove(player);
    loadPlayer(carList[currentCarIndex].file);
};

window.startGame = () => {
    // Terapkan Stats Mobil
    activeSpeedMult = carList[currentCarIndex].speedMult;
    activeHandling = carList[currentCarIndex].handlingVal;

    gameState = 'PLAYING';
    elMainMenu.style.display = 'none';
    elHud.style.display = 'block';

    if(player) {
        player.rotation.y = Math.PI; 
        player.position.set(0, 0.6, 0);
    }

    // Pindah Kamera ke mode balapan
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, -5);

    resetGame();
};

function resetGame() {
    enemies.forEach(e => scene.remove(e)); enemies = [];
    powerups.forEach(p => scene.remove(p)); powerups = [];
    
    // Reset Segmen Map (Bersihkan lalu buat ulang agar rapi)
    activeMapSegments.forEach(s => scene.remove(s));
    activeMapSegments = [];
    // Regenerate Map jika template sudah ada
    if (mapTemplate && forestTemplate) {
        // Kita butuh lebar jalan, kita ambil dari skala template
        const box = new THREE.Box3().setFromObject(mapTemplate);
        const size = new THREE.Vector3(); box.getSize(size);
        // Kita simpan parameter generate di variable global/closure atau panggil ulang logic load
        // Agar simpel: kita panggil fungsi helper generate yang sama
        // Asumsi lebar hutan dan jalan konstan sesuai template terakhir
        const forestBox = new THREE.Box3().setFromObject(forestTemplate);
        const forestSize = new THREE.Vector3(); forestBox.getSize(forestSize);
        generateMapSegments(size.x, forestSize.x);
    }

    score = 0;
    lives = 3;
    currentLane = 0;
    targetX = 0;
    
    baseSpeedLevel = 0.4;
    speedBoost = 0;
    currentLevel = 0;
    updateTotalSpeed();

    activePowerup = null;
    isGameRunning = false;
    isPaused = false;
    isGameOver = false;

    elSkor.innerText = "0";
    elNyawa.innerText = "❤️❤️❤️";
    elGameOver.style.display = "none";
    
    startCountdown();
}

function updateTotalSpeed() {
    totalSpeed = (baseSpeedLevel * activeSpeedMult) + speedBoost;
}

function showNotif(text, color) {
    elPowerupNotif.innerText = text;
    elPowerupNotif.style.color = color;
    elPowerupNotif.style.opacity = 1;
    setTimeout(() => { elPowerupNotif.style.opacity = 0; }, 2000);
}

function scaleModel(obj, targetSize) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(); box.getSize(size);
    const maxAxis = Math.max(size.x, size.y, size.z);
    const scale = targetSize / maxAxis;
    obj.scale.set(scale, scale, scale);
}

function enableShadow(obj) {
    obj.traverse(node => {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
        }
    });
}

/* =================================================
   6. LOADING ASSETS (CHAINING)
================================================= */

// A. Load Player
function loadPlayer(file) {
    loader.load(`/img/${file}`, gltf => {
        player = gltf.scene;
        scaleModel(player, 2.0); 
        
        // Posisi default
        player.position.set(0, 0.6, 0);
        player.rotation.y = Math.PI + 0.5; // Miring dikit di showroom

        enableShadow(player);
        scene.add(player);
        
        // Jika Map belum ada, load Map. Jika sudah, load Enemy.
        if (!mapTemplate) {
            loadMainMap();
        } else if (!enemyTemplate) {
            loadEnemyTemplate();
        }
    });
}

// B. Load Main Map
function loadMainMap() {
    loader.load('/img/map.glb', (gltf) => {
        mapTemplate = gltf.scene;
        enableShadow(mapTemplate);

        const box = new THREE.Box3().setFromObject(mapTemplate);
        const size = new THREE.Vector3(); box.getSize(size);
        const scaleZ = MAP_LENGTH / size.z;
        mapTemplate.scale.set(scaleZ, scaleZ, scaleZ);

        loadForestMap(size.x * scaleZ); 
    });
}

// C. Load Forest
function loadForestMap(roadWidth) {
    loader.load('/img/hutan.glb', (gltf) => {
        forestTemplate = gltf.scene;
        enableShadow(forestTemplate);

        const box = new THREE.Box3().setFromObject(forestTemplate);
        const size = new THREE.Vector3(); box.getSize(size);
        const scaleZ = MAP_LENGTH / size.z;
        forestTemplate.scale.set(scaleZ, scaleZ, scaleZ);

        // Generate Map Pertama Kali
        generateMapSegments(roadWidth, size.x * scaleZ);
        
        loadEnemyTemplate();
    });
}

function generateMapSegments(roadWidth, forestWidth) {
    const FOREST_Y = -0.5; 
    const OVERLAP_KIRI = 2.9;   
    const OVERLAP_KANAN = -2.0; 

    const offsetLeft = (roadWidth / 2) + (forestWidth / 2) - OVERLAP_KIRI;
    const offsetRight = (roadWidth / 2) + (forestWidth / 2) - OVERLAP_KANAN;

    for (let i = 0; i < NUM_SEGMENTS; i++) {
        const zPos = -(i * MAP_LENGTH);

        // Jalan
        const road = mapTemplate.clone();
        road.position.set(0, 0, zPos);
        scene.add(road);
        activeMapSegments.push(road);

        // Hutan Kiri
        const leftForest = forestTemplate.clone();
        leftForest.position.set(-offsetLeft, FOREST_Y, zPos); 
        scene.add(leftForest);
        activeMapSegments.push(leftForest);

        // Hutan Kanan
        const rightForest = forestTemplate.clone();
        rightForest.position.set(offsetRight, FOREST_Y, zPos); 
        scene.add(rightForest);
        activeMapSegments.push(rightForest);
        
        // Hutan Lapis 2 (Optional, biar tebal)
        const farOffsetLeft = offsetLeft + forestWidth - 1.0;
        const farLeft = forestTemplate.clone();
        farLeft.position.set(-farOffsetLeft, FOREST_Y, zPos);
        scene.add(farLeft);
        activeMapSegments.push(farLeft);

        const farOffsetRight = offsetRight + forestWidth - 1.0;
        const farRight = forestTemplate.clone();
        farRight.position.set(farOffsetRight, FOREST_Y, zPos);
        scene.add(farRight);
        activeMapSegments.push(farRight);
    }
}

// D. Load Enemy & Gift
function loadEnemyTemplate() {
    loader.load("/img/musuh.glb", gltf => {
        enemyTemplate = gltf.scene;
        scaleModel(enemyTemplate, 2.0);
        enableShadow(enemyTemplate);
        loadGiftTemplate();
    });
}

function loadGiftTemplate() {
    loader.load("/img/gift.glb", gltf => {
        giftTemplate = gltf.scene;
        scaleModel(giftTemplate, 1.5);
        enableShadow(giftTemplate);
    }, undefined, (err) => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
        giftTemplate = new THREE.Mesh(geometry, material);
    });
}

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

setInterval(() => {
    if (!isGameRunning || isPaused || isGameOver || !enemyTemplate) return;
    const e = enemyTemplate.clone();
    const randomLane = Math.floor(Math.random() * 3) - 1;
    e.position.set(randomLane * LANE_WIDTH, 0.6, -80); // Y = 0.6
    e.rotation.y = 0; 
    e.hasPassed = false; 
    scene.add(e);
    enemies.push(e);
}, 1300 / activeSpeedMult); // Spawn rate menyesuaikan kecepatan mobil

setInterval(() => {
    if (!isGameRunning || isPaused || isGameOver || !giftTemplate) return;
    const p = giftTemplate.clone();
    const randomLane = Math.floor(Math.random() * 3) - 1;
    p.position.set(randomLane * LANE_WIDTH, 1, -100);
    scene.add(p);
    powerups.push(p);
}, 10000); 

/* =================================================
   8. INPUT
================================================= */
document.addEventListener("keydown", e => {
    if (gameState !== 'PLAYING') return; 

    if (e.key.toLowerCase() === "p" && isGameRunning) {
        isPaused = !isPaused;
        if(elPause) elPause.style.display = isPaused ? "block" : "none";
    }
    if (!isPaused && isGameRunning) {
        if (e.key === "ArrowLeft" && currentLane > -1) currentLane--;
        if (e.key === "ArrowRight" && currentLane < 1) currentLane++;
        targetX = currentLane * LANE_WIDTH;
    }
});

/* =================================================
   9. MAIN LOOP
================================================= */
function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    // MODE SHOWROOM
    if (gameState === 'MENU') {
        if (player && !isDragging) {
            player.rotation.y += 0.005; 
        }
        return;
    }

    if (!isGameRunning || isPaused || isGameOver) return;

    // --- ANIMASI ENVIRONMENT (MAP GLB) ---
    if (activeMapSegments.length > 0) {
        activeMapSegments.forEach(segment => {
            segment.position.z += totalSpeed;
            if (segment.position.z > MAP_LENGTH) {
                 segment.position.z -= NUM_SEGMENTS * MAP_LENGTH; 
            }
        });
    }

    // --- ANIMASI PLAYER (HANDLING STATS) ---
    if (player) {
        const deltaX = targetX - player.position.x;
        
        // Pindah jalur dipengaruhi stats handling
        player.position.x += deltaX * activeHandling; 
        
        player.rotation.y = Math.PI - (deltaX * activeHandling); 
        player.rotation.z = (deltaX * (activeHandling * 0.5));
        
        player.position.y = 0.6 + Math.sin(Date.now() * 0.01) * 0.02;
        camera.position.x += (player.position.x * 0.3 - camera.position.x) * 0.05;
        camera.rotation.z = 0; 
    }

    // --- POWERUP ---
    powerups.forEach((p, index) => {
        p.position.z += totalSpeed;
        p.rotation.y += 0.05; 
        p.position.y = 1 + Math.sin(Date.now() * 0.005) * 0.2;

        if (player && Math.abs(p.position.z - player.position.z) < 3.0 && Math.abs(p.position.x - player.position.x) < 1.0) {
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
        else if (p.position.z > 20) { 
            scene.remove(p);
            powerups.splice(index, 1);
        }
    });

    if (activePowerup && Date.now() > powerupEndTime) {
        activePowerup = null;
        speedBoost = 0; 
        updateTotalSpeed();
    }

    // --- ENEMY ---
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        e.position.z += totalSpeed;
        e.position.y = 0.6 + Math.sin(Date.now() * 0.01 + i) * 0.02;

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
        
        else if (e.position.z > player.position.z + 2 && !e.hasPassed) {
            score += 10;
            if(elSkor) elSkor.innerText = score;
            e.hasPassed = true;

            const calculatedLevel = Math.floor(score / 50);
            if (calculatedLevel > currentLevel) {
                currentLevel = calculatedLevel; 
                if (baseSpeedLevel < 1.5) { 
                    baseSpeedLevel += 0.05; 
                    updateTotalSpeed();
                    showNotif("🚀 SPEED UP!", "#ff0000"); 
                }
            }
        }

        if (e.position.z > 20) { 
            scene.remove(e);
            enemies.splice(i, 1);
        }
    }
}

animate();