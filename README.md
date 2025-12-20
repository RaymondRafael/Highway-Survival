# Highway-Survival
Anggota Kelompok:
1. 2372025 - Raymond Rafael Anthony
2. 2372031 - Jethro Andersson Apriliano Ofe
3. 2372034 - Exalt Winata Gunawan
4. 2372040 - Kaisar Naufal Naratama

# Deskripsi
Highway Survival adalah sebuah game simulasi berkendara 3D bergenre Endless Runner yang dikembangkan menggunakan JavaScript dan pustaka grafis Three.js. Pemain ditantang untuk mengendalikan mobil di jalan raya tanpa batas, menghindari lalu lintas yang semakin padat, dan bertahan hidup selama mungkin.

Fitur:
1. Progressive Difficulty: Tempo permainan meningkat secara otomatis (semakin cepat) seiring bertambahnya skor pemain.
2. Dynamic Camera: Kamera bergerak secara halus mengikuti manuver mobil (lerping) untuk efek sinematik.
3. 3D Asset Integration: Menggunakan GLTFLoader untuk merender model eksternal (mobil, pohon, jalan) berformat .glb dengan sistem bayangan (shadow mapping).
4. Dynamic Physics Animation: Implementasi animasi body roll (kemiringan mobil) dan suspensi saat berpindah jalur untuk memberikan feedback visual yang realistis.
5. Infinite Procedural Terrain: Lingkungan (jalan dan hutan) yang digenerate secara terus-menerus menggunakan teknik Object Pooling dan Modular Tiling, menciptakan ilusi dunia tanpa batas tanpa membebani memori.

Teknologi:
1. HTML & CSS (UI Overlay)
2. JavaScript (Logika Game)
3. Three.js (Rendering Engine 3D)
4. Vite (Build Tool & Local Server)
