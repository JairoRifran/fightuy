/* ==========================================================================
   FIGHTUY - STAGE MANAGER
   Modelado procedural en 3D de escenarios típicos de Uruguay con iluminación
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

class StageManager {
  constructor() {
    this.currentStageGroup = new THREE.Group();
    this.lights = [];
    this.limits = { minX: -12, maxX: 12 };
  }

  // Carga un escenario específico en la escena de Three.js
  loadStage(stageId, scene, renderer, onAssetLoaded) {
    this.cleanup(scene);
    this.renderer = renderer; // Guardar referencia para KTX2Loader
    this.onAssetLoaded = onAssetLoaded;
    
    this.currentStageGroup = new THREE.Group();
    scene.add(this.currentStageGroup);

    // Ajustar límites de combate por defecto
    this.limits = { minX: -13, maxX: 13 };
    this.hasLoadedStage = false;

    switch (stageId) {
      case 'rambla':
        this.buildRambla(scene);
        this.hasLoadedStage = true;
        break;
      case 'plaza':
        this.buildPlaza(scene);
        this.hasLoadedStage = true;
        break;
      case 'estadio':
        this.buildEstadio(scene);
        this.hasLoadedStage = true;
        break;
      case 'torre':
        this.buildTorre(scene);
        break;
      default:
        this.buildRambla(scene);
        this.hasLoadedStage = true;
        break;
    }

    // Ajustar el color de fondo de la escena y la neblina para que coincidan con la iluminación del escenario
    if (scene.fog) {
      if (stageId === 'torre') {
        scene.background = new THREE.Color(0xb8d7e8);
        scene.fog.color.setHex(0xb8d7e8);
        scene.fog.density = 0.003; // Neblina diurna casi imperceptible
      } else if (stageId === 'rambla') {
        scene.background = new THREE.Color(0xe65100);
        scene.fog.color.setHex(0xe65100);
        scene.fog.density = 0.008; // Atardecer suave
      } else if (stageId === 'plaza') {
        scene.background = new THREE.Color(0x050b1e);
        scene.fog.color.setHex(0x050b1e);
        scene.fog.density = 0.012; // Noche de plaza
      } else if (stageId === 'estadio') {
        scene.background = new THREE.Color(0x070d19);
        scene.fog.color.setHex(0x070d19);
        scene.fog.density = 0.010; // Estadio nocturno con focos
      }
    }

    console.log(`Escenario cargado: ${stageId}`);
  }

  // Limpia el escenario anterior y sus luces
  cleanup(scene) {
    // Remover luces
    this.lights.forEach(light => scene.remove(light));
    this.lights = [];

    // Limpiar mallas del grupo
    if (this.currentStageGroup) {
      scene.remove(this.currentStageGroup);
      this.currentStageGroup.traverse(node => {
        if (node.isMesh) {
          node.geometry.dispose();
          if (Array.isArray(node.material)) {
            node.material.forEach(mat => mat.dispose());
          } else {
            node.material.dispose();
          }
        }
      });
    }
  }

  // ESCENARIO 1: LA RAMBLA DE MONTEVIDEO
  buildRambla(scene) {
    const group = this.currentStageGroup;

    // 1. Iluminación Atardecer (Cálido y dramático)
    const ambientLight = new THREE.AmbientLight(0xffab91, 0.4); // Tinte rojizo
    scene.add(ambientLight);
    this.lights.push(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffd54f, 1.2); // Luz de sol dorada
    sunLight.position.set(15, 8, -10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);
    this.lights.push(sunLight);

    // 2. Fondo Atardecer (Skybox plano de fondo) - Ampliado de 60 a 120 de ancho para close-ups
    const skyGeo = new THREE.PlaneGeometry(120, 40);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0xe65100, // Naranja rojizo profundo
      side: THREE.DoubleSide
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(0, 8, -18);
    group.add(sky);

    // Gradiente de sol en el cielo (Esfera brillante detrás)
    const sunSphereGeo = new THREE.SphereGeometry(4, 32, 32);
    const sunSphereMat = new THREE.MeshBasicMaterial({ color: 0xfff9c4 });
    const sunSphere = new THREE.Mesh(sunSphereGeo, sunSphereMat);
    sunSphere.position.set(10, 5, -17.5);
    group.add(sunSphere);

    // 3. Suelo de la Rambla (Baldosas típicas de granito gris) - Ampliado de 40 a 90 de ancho
    const floorGeo = new THREE.BoxGeometry(90, 2, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x9e9e9e, roughness: 0.6 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -1;
    floor.receiveShadow = true;
    group.add(floor);

    // 4. El Río de la Plata (Mar en el fondo con ondas) - Ampliado de 40 a 90 de ancho
    const waterGeo = new THREE.PlaneGeometry(90, 10);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x006064, // Verde azulado oscuro típico
      roughness: 0.2,
      metalness: 0.1
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.set(0, -0.4, -6);
    water.rotation.x = -Math.PI / 2;
    group.add(water);

    // Muro de contención de piedra de la Rambla - Ampliado de 40 a 90 de ancho
    const wallGeo = new THREE.BoxGeometry(90, 0.8, 0.6);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.8 });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 0.4, -2.5);
    wall.castShadow = true;
    wall.receiveShadow = true;
    group.add(wall);

    // Columna de farolas tradicionales (Alumbrado público)
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 3.5);
    const lampHeadGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b }); // Foco amarillo

    [-10, 10].forEach(x => {
      const lampGroup = new THREE.Group();
      lampGroup.position.set(x, 1.75, -2.2);

      const pole = new THREE.Mesh(poleGeo, metalMat);
      pole.castShadow = true;
      lampGroup.add(pole);

      // Brazo de la farola
      const armGeo = new THREE.BoxGeometry(0.5, 0.06, 0.06);
      const arm = new THREE.Mesh(armGeo, metalMat);
      arm.position.set(0.25, 1.6, 0);
      lampGroup.add(arm);

      const lampHead = new THREE.Mesh(lampHeadGeo, lightMat);
      lampHead.position.set(0.4, 1.45, 0);
      lampGroup.add(lampHead);

      // Luz puntual local de farola
      const pointLight = new THREE.PointLight(0xffca28, 0.8, 8);
      pointLight.position.set(0.4, 1.4, 0);
      lampGroup.add(pointLight);

      group.add(lampGroup);
    });

    // 5. Letras de "MONTEVIDEO" estilizadas en 3D
    const lettersGroup = new THREE.Group();
    lettersGroup.position.set(-5, 0.6, -2.0); // Encima del muro
    lettersGroup.scale.setScalar(0.7);

    // Estructuras de cajas simulando letras M-T-V-D
    const letterMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    
    // Letra M (dos postes y un centro)
    const letterM = new THREE.Group();
    letterM.position.x = 0;
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), letterMaterial);
    leg1.position.x = -0.4;
    const leg2 = leg1.clone();
    leg2.position.x = 0.4;
    const topM = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.2), letterMaterial);
    topM.position.y = 0.5;
    letterM.add(leg1, leg2, topM);
    lettersGroup.add(letterM);

    // Letra V
    const letterV = new THREE.Group();
    letterV.position.x = 1.2;
    const v1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), letterMaterial);
    v1.rotation.z = -0.25;
    v1.position.x = -0.2;
    const v2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), letterMaterial);
    v2.rotation.z = 0.25;
    v2.position.x = 0.2;
    letterV.add(v1, v2);
    lettersGroup.add(letterV);

    // Letra D
    const letterD = new THREE.Group();
    letterD.position.x = 2.4;
    const dBar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), letterMaterial);
    dBar.position.x = -0.3;
    const dTop = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.2), letterMaterial);
    dTop.position.set(-0.05, 0.5, 0);
    const dBottom = dTop.clone();
    dBottom.position.y = -0.5;
    const dRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.8, 0.2), letterMaterial);
    dRight.position.x = 0.2;
    letterD.add(dBar, dTop, dBottom, dRight);
    lettersGroup.add(letterD);

    // Sol de la bandera estilizado en el muro
    const sunIconGroup = new THREE.Group();
    sunIconGroup.position.set(4, 1.2, -2.1);
    const sunCenter = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffca28 }));
    sunIconGroup.add(sunCenter);
    // Rayos
    for (let r = 0; r < 8; r++) {
      const ray = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.6, 0.05), new THREE.MeshBasicMaterial({ color: 0xffca28 }));
      const angle = (r / 8) * Math.PI * 2;
      ray.position.set(Math.cos(angle) * 0.6, Math.sin(angle) * 0.6, 0);
      ray.rotation.z = angle;
      sunIconGroup.add(ray);
    }
    lettersGroup.add(sunIconGroup);

    group.add(lettersGroup);
  }

  // ESCENARIO 2: PLAZA INDEPENDENCIA
  buildPlaza(scene) {
    const group = this.currentStageGroup;

    // 1. Iluminación Nocturna de Ciudad (Azules y Amarillos)
    const ambientLight = new THREE.AmbientLight(0x1a237e, 0.35); // Luz ambiental azul oscuro
    scene.add(ambientLight);
    this.lights.push(ambientLight);

    const cityLight = new THREE.DirectionalLight(0x0288d1, 0.8); // Luz de luna azul claro
    cityLight.position.set(-10, 15, -5);
    cityLight.castShadow = true;
    cityLight.shadow.mapSize.width = 1024;
    cityLight.shadow.mapSize.height = 1024;
    scene.add(cityLight);
    this.lights.push(cityLight);

    // 2. Fondo de Noche (Cielo Estrellado) - Ampliado de 60 a 120 de ancho
    const skyGeo = new THREE.PlaneGeometry(120, 40);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x050b1e }); // Azul noche muy oscuro
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(0, 8, -18);
    group.add(sky);

    // Pequeñas esferas emisoras simulando estrellas o luces lejanas de la ciudad
    for (let s = 0; s < 15; s++) {
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.05, 4, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      star.position.set((Math.random() - 0.5) * 40, 5 + Math.random() * 10, -17);
      group.add(star);
    }

    // 3. Suelo de Adoquines Grises - Ampliado de 40 a 90 de ancho
    const floorGeo = new THREE.BoxGeometry(90, 2, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x424242, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -1;
    floor.receiveShadow = true;
    group.add(floor);

    // 4. Palmeras de la Plaza Independencia (Procedimentales)
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.7 });

    [-11, -8, 8, 11].forEach(x => {
      const palmGroup = new THREE.Group();
      palmGroup.position.set(x, 0, -2.5);

      // Tronco curvado levemente
      const segments = 6;
      let prevSegment = null;
      for (let s = 0; s < segments; s++) {
        const segGeo = new THREE.CylinderGeometry(0.08 - s * 0.005, 0.1 - s * 0.005, 0.7);
        const seg = new THREE.Mesh(segGeo, trunkMaterial);
        seg.castShadow = true;
        
        if (s === 0) {
          seg.position.y = 0.35;
          palmGroup.add(seg);
        } else {
          seg.position.y = 0.65;
          seg.rotation.z = 0.08 * Math.sin(s);
          prevSegment.add(seg);
        }
        prevSegment = seg;
      }

      // Hojas/Frondas en la copa
      const crown = new THREE.Group();
      crown.position.y = 0.4;
      prevSegment.add(crown);

      for (let l = 0; l < 8; l++) {
        const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.04), leafMaterial);
        const angle = (l / 8) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.5, -0.2, Math.sin(angle) * 0.5);
        leaf.rotation.set(0.4, 0, angle);
        crown.add(leaf);
      }

      group.add(palmGroup);
    });

    // 5. Silueta Distante del Palacio Salvo (Cajas apiladas complejas en el fondo centro)
    const salvoGroup = new THREE.Group();
    salvoGroup.position.set(-3.5, 0, -12);
    salvoGroup.scale.setScalar(1.2);

    const salvoMat = new THREE.MeshStandardMaterial({ color: 0x1f293d, roughness: 0.8 }); // Malla oscura de fondo

    // Base del palacio
    const salvoBase = new THREE.Mesh(new THREE.BoxGeometry(3.5, 4.0, 2.0), salvoMat);
    salvoBase.position.y = 2.0;
    salvoGroup.add(salvoBase);

    // Torre del Palacio Salvo
    const salvoTorre = new THREE.Mesh(new THREE.BoxGeometry(1.2, 5.0, 1.2), salvoMat);
    salvoTorre.position.set(0.6, 5.5, 0.2);
    salvoGroup.add(salvoTorre);

    // Cúpula icónica
    const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 16), salvoMat);
    cupula.position.set(0.6, 8.2, 0.2);
    salvoGroup.add(cupula);
    
    // Antena
    const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.5), salvoMat);
    antena.position.set(0.6, 9.3, 0.2);
    salvoGroup.add(antena);

    group.add(salvoGroup);

    // 6. Monumento Ecuestre del Gral. José Artigas (Cajas en el fondo centro)
    const monumentGroup = new THREE.Group();
    monumentGroup.position.set(0, 0, -4.5);

    const grayStone = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 }); // Granito oscuro / Bronce
    const baseMonument = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 1.4), grayStone);
    baseMonument.position.y = 0.6;
    baseMonument.castShadow = true;
    baseMonument.receiveShadow = true;
    monumentGroup.add(baseMonument);

    // Estatua del Caballo (Cajas estilizadas simples representando a Artigas)
    const horseTorso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.25), grayStone);
    horseTorso.position.set(0, 1.35, 0);
    horseTorso.castShadow = true;
    monumentGroup.add(horseTorso);

    const horseNeck = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.2), grayStone);
    horseNeck.position.set(0.35, 1.6, 0);
    horseNeck.rotation.z = -0.4;
    monumentGroup.add(horseNeck);

    const rider = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.2), grayStone);
    rider.position.set(0, 1.7, 0); // Artigas montado
    rider.castShadow = true;
    monumentGroup.add(rider);

    group.add(monumentGroup);
  }

  // ESCENARIO 3: ESTADIO CENTENARIO
  buildEstadio(scene) {
    const group = this.currentStageGroup;

    // 1. Iluminación de Focos / Reflectores Gigantes
    const ambientLight = new THREE.AmbientLight(0x78909c, 0.3); // Luz ambiental tenue
    scene.add(ambientLight);
    this.lights.push(ambientLight);

    // Iluminación direccional blanca potente simulando reflectores de cancha
    const floodLight1 = new THREE.DirectionalLight(0xffffff, 1.1);
    floodLight1.position.set(-15, 14, 2);
    floodLight1.castShadow = true;
    floodLight1.shadow.mapSize.width = 1024;
    floodLight1.shadow.mapSize.height = 1024;
    scene.add(floodLight1);
    this.lights.push(floodLight1);

    const floodLight2 = new THREE.DirectionalLight(0xe0f7fa, 0.8);
    floodLight2.position.set(15, 14, 2);
    scene.add(floodLight2);
    this.lights.push(floodLight2);

    // 2. Fondo de Estadio (Cielo nocturno e iluminación difusa de tribunas) - Ampliado de 60 a 120 de ancho
    const skyGeo = new THREE.PlaneGeometry(120, 40);
    const skyMat = new THREE.MeshBasicMaterial({ color: 0x070d19 });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.position.set(0, 8, -18);
    group.add(sky);

    // Muro de tribunas en degradado gris al fondo - Ampliado de 40 a 90 de ancho
    const standGeo = new THREE.BoxGeometry(90, 6, 2);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.9 });
    const stands = new THREE.Mesh(standGeo, standMat);
    stands.position.set(0, 2.5, -7.5);
    group.add(stands);

    // 3. Suelo de Césped (Verde brillante con líneas blancas de cancha) - Ampliado de 40 a 90 de ancho
    const floorGeo = new THREE.BoxGeometry(90, 2, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 }); // Césped
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -1;
    floor.receiveShadow = true;
    group.add(floor);

    // Líneas blancas de cancha sobre el césped
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lineCenter = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 10), lineMat);
    lineCenter.position.set(0, 0.01, -1);
    lineCenter.rotation.x = -Math.PI / 2;
    group.add(lineCenter);

    const lineHorizontal = new THREE.Mesh(new THREE.PlaneGeometry(88, 0.12), lineMat);
    lineHorizontal.position.set(0, 0.01, 2.5);
    lineHorizontal.rotation.x = -Math.PI / 2;
    group.add(lineHorizontal);

    // 4. Arco de fútbol de fondo (Simulación simplificada de postes blancos)
    const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
    const goalGroup = new THREE.Group();
    goalGroup.position.set(0, 0, -5.5);

    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.0), postMat);
    postL.position.set(-3.5, 1.0, 0);
    const postR = postL.clone();
    postR.position.x = 3.5;
    
    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 7.0), postMat);
    crossbar.position.set(0, 2.0, 0);
    crossbar.rotation.z = Math.PI / 2;
    
    goalGroup.add(postL, postR, crossbar);
    group.add(goalGroup);

    // Red del arco simplificada (malla translúcida en la parte trasera)
    const netGeo = new THREE.BoxGeometry(7.0, 2.0, 1.5);
    const netMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.15
    });
    const net = new THREE.Mesh(netGeo, netMat);
    net.position.set(0, 1.0, -6.2);
    group.add(net);

    // 5. Carteles Publicitarios Icónicos y Humorísticos
    // Banners con colores típicos y logos de parodia locales
    const adBillboardGeo = new THREE.BoxGeometry(4.5, 1.1, 0.15);
    
    // Anuncio 1: Mate Canarias
    const adCanariasMat = new THREE.MeshStandardMaterial({ color: 0xffeb3b, roughness: 0.6 }); // Amarillo Canarias
    const adCanarias = new THREE.Mesh(adBillboardGeo, adCanariasMat);
    adCanarias.position.set(-8.5, 0.65, -4.5);
    adCanarias.rotation.y = 0.25;
    group.add(adCanarias);
    // Texto / Caja verde simulando la yerba en el anuncio
    const canSymbol = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.2), new THREE.MeshBasicMaterial({ color: 0x1b5e20 }));
    canSymbol.position.set(-0.8, 0, 0.05);
    adCanarias.add(canSymbol);

    // Anuncio 2: Paso de los Toros parodia
    const adTorosMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.6 }); // Negro y Verde
    const adToros = new THREE.Mesh(adBillboardGeo, adTorosMat);
    adToros.position.set(8.5, 0.65, -4.5);
    adToros.rotation.y = -0.25;
    group.add(adToros);
    // Símbolo verde fluorescente
    const torosSymbol = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.4, 0.2), new THREE.MeshBasicMaterial({ color: 0x76ff03 }));
    torosSymbol.position.set(0.6, 0, 0.05);
    adToros.add(torosSymbol);

    // 6. Focos / Torres de Luces Gigantes (Detalle en los extremos)
    const towerGeo = new THREE.CylinderGeometry(0.12, 0.25, 12);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x455a64, roughness: 0.5, metalness: 0.3 });
    const floodlightPanelGeo = new THREE.BoxGeometry(1.8, 1.2, 0.3);

    [-18, 18].forEach(x => {
      const towerGroup = new THREE.Group();
      towerGroup.position.set(x, 5.0, -10.0);

      const pole = new THREE.Mesh(towerGeo, towerMat);
      towerGroup.add(pole);

      const panel = new THREE.Mesh(floodlightPanelGeo, towerMat);
      panel.position.set(x < 0 ? 0.6 : -0.6, 6.0, 0.5);
      panel.rotation.y = x < 0 ? 0.4 : -0.4;
      towerGroup.add(panel);

      // Bombillas brillantes en el panel
      for (let ly = -0.3; ly <= 0.3; ly += 0.3) {
        for (let lx = -0.6; lx <= 0.6; lx += 0.4) {
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
          bulb.position.set(lx, ly, 0.2);
          panel.add(bulb);
        }
      }

      group.add(towerGroup);
    });
  }

  // ESCENARIO 4: TORRE EJECUTIVA (Foto de Fondo de Plaza Independencia)
  buildTorre(scene) {
    const group = this.currentStageGroup;
    this.limits = { minX: -12, maxX: 12 };
    scene.background = new THREE.Color(0xb8d7e8);

    // 1. Iluminación Natural Diurna (Alineada al sol de la foto)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65); 
    scene.add(ambientLight);
    this.lights.push(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8e1, 1.3); // Luz dorada suave
    sunLight.position.set(2, 18, 5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    this.lights.push(sunLight);

    // 2. Cargar Foto de Plaza Independencia como fondo (Billboard)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      '/assets/images/plaza_bg.jpg',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.set(3, 1);
        // Cilindro curvado de fondo alejado para dar una perspectiva envolvente realista y evitar baches celestes
        const bgGeo = new THREE.CylinderGeometry(18, 18, 36, 32, 1, true, Math.PI * 0.4, Math.PI * 1.2);
        const bgMat = new THREE.MeshBasicMaterial({ 
          map: texture, 
          side: THREE.DoubleSide,
          depthWrite: false 
        });
        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        
        // Y = 4.3 alinea el horizonte de la foto exactamente con el nivel del suelo (Y=0)
        // Centrado en el origen (0, 4.3, 0) para que el cilindro envuelva la escena a una distancia de 18 unidades
        bgMesh.position.set(0, 4.3, 0); 
        group.add(bgMesh);
        console.log('Fondo de Plaza Independencia cargado con éxito.');
        this.hasLoadedStage = true;
        if (this.onAssetLoaded) this.onAssetLoaded('stage_torre_bg');
      },
      undefined,
      (err) => {
        console.error('Error cargando la textura de fondo:', err);
        // Fallback: Celeste básico curvo
        const skyGeo = new THREE.CylinderGeometry(18, 18, 36, 32, 1, true, Math.PI * 0.4, Math.PI * 1.2);
        const sky = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ color: 0x81d4fa, side: THREE.DoubleSide }));
        sky.position.set(0, 4.3, 0);
        group.add(sky);
        this.hasLoadedStage = true;
        if (this.onAssetLoaded) this.onAssetLoaded('stage_torre_bg_fallback');
      }
    );

    // 3. Suelo transparente invisible (Para que los peleadores proyecten sombras sobre la plaza)
    const shadowFloorGeo = new THREE.PlaneGeometry(132, 18);
    const shadowFloorMat = new THREE.ShadowMaterial({ opacity: 0.4 });
    const shadowFloor = new THREE.Mesh(shadowFloorGeo, shadowFloorMat);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = 0.01;
    shadowFloor.receiveShadow = true;
    group.add(shadowFloor);
  }
}

export default new StageManager();
