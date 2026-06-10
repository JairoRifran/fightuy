/* ==========================================================================
   FIGHTUY - FIGHTER CLASS (Peleador 3D Procedimental)
   Construye las mallas articuladas y controla las fÃ­sicas, estados y animaciones
   ========================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import AudioManager from './AudioManager.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

let sharedGLTFLoader = null;
let sharedKTX2Loader = null;

function getSharedGLTFLoader(renderer) {
  console.warn("[GLB] getSharedGLTFLoader invocado con renderer =", renderer ? "DEFINIDO" : "NO DEFINIDO");
  if (sharedGLTFLoader) return sharedGLTFLoader;

  sharedGLTFLoader = new GLTFLoader();
  sharedGLTFLoader.setMeshoptDecoder(MeshoptDecoder);

  if (renderer) {
    try {
      console.warn("[GLB] Configurando KTX2Loader con path /assets/basis/ ...");
      sharedKTX2Loader = new KTX2Loader();
      sharedKTX2Loader.setTranscoderPath('/assets/basis/');
      sharedKTX2Loader.detectSupport(renderer);
      sharedGLTFLoader.setKTX2Loader(sharedKTX2Loader);
      console.warn("[GLB] KTX2Loader y GLTFLoader compartidos inicializados con éxito.");
    } catch (e) {
      console.error("[GLB] Error inicializando KTX2Loader compartido:", e);
    }
  } else {
    console.warn("[GLB] Alerta: getSharedGLTFLoader invocado SIN renderer. KTX2Loader omitido.");
  }

  return sharedGLTFLoader;
}

const CHARACTER_CONFIGS = {
  orsi: {
    paths: {
      idle: '/assets/models/Yama/mantener-posicion.glb',
      walkFwd: '/assets/models/Yama/caminar-adelante.glb',
      walkBwd: '/assets/models/Yama/caminar-atras.glb',
      kick: '/assets/models/Yama/patada.glb',
      circular: '/assets/models/Yama/Patada-circular.glb',
      spartan: '/assets/models/Yama/Patada-espartana.glb',
      hitReact: '/assets/models/Yama/reaccion-golpe.glb',
      introMate: '/assets/models/Yama/animacion%20yama.glb',
      introMateAlt: '/assets/models/Yama/animacion%20yama%202.glb'
    },
    hitReactKey: 'hitReact',
    introKeys: ['introMate', 'introMateAlt'],
    attacks: {
      punch: {
        animationKey: 'circular',
        targetDuration: 0.98,
        fallbackDuration: 0.98,
        activeStart: 0.3,
        activeEnd: 0.64,
        lungeStart: 0.22,
        lungeEnd: 0.5,
        lungeSpeed: 0.75,
        damage: 11,
        range: 1.72,
        height: 1.1,
        knockback: 3.2,
        hitStop: 0.065
      },
      kick: {
        animationKey: 'kick',
        targetDuration: 0.78,
        fallbackDuration: 0.78,
        activeStart: 0.24,
        activeEnd: 0.56,
        lungeStart: 0.16,
        lungeEnd: 0.5,
        lungeSpeed: 1.45,
        damage: 13,
        range: 1.92,
        height: 0.75,
        knockback: 3.8,
        hitStop: 0.068
      },
      special: {
        animationKey: 'spartan',
        targetDuration: 1.08,
        fallbackDuration: 1.08,
        activeStart: 0.24,
        activeEnd: 0.72,
        lungeStart: 0.16,
        lungeEnd: 0.68,
        lungeSpeed: 3.1,
        damage: 31,
        range: 2.65,
        height: 1.0,
        knockback: 5.4,
        hitStop: 0.1
      }
    }
  },
  lacalle: {
    paths: {
      idle: '/assets/models/Luis/en-guardia.glb',
      walkFwd: '/assets/models/Luis/caminar%20hacia%20adelante.glb',
      walkBwd: '/assets/models/Luis/recular%20atras.glb',
      block: '/assets/models/Luis/bloqueo.glb',
      kick: '/assets/models/Luis/patada-de-barrido.glb',
      circular: '/assets/models/Luis/circular-patada.glb',
      spartan: '/assets/models/Luis/patada-giratoria.glb',
      punchJumping: '/assets/models/Luis/puno%20saltarin.glb',
      introKick: '/assets/models/Luis/patada%20presentacion.glb',
      introHandstand: '/assets/models/Luis/para%20de%20manos%20presentacion.glb'
    },
    hitReactKey: 'idle',
    blockKey: 'block',
    introKeys: ['introKick', 'introHandstand'],
    attacks: {
      punch: {
        animationKey: 'punchJumping',
        targetDuration: 0.76,
        fallbackDuration: 0.76,
        activeStart: 0.32,
        activeEnd: 0.7,
        lungeStart: 0.18,
        lungeEnd: 0.46,
        lungeSpeed: 1.1,
        damage: 10,
        range: 1.65,
        height: 1.25,
        knockback: 3.0,
        hitStop: 0.064
      },
      kick: {
        animationKey: 'kick',
        targetDuration: 0.78,
        fallbackDuration: 0.78,
        activeStart: 0.34,
        activeEnd: 0.72,
        lungeStart: 0.22,
        lungeEnd: 0.62,
        lungeSpeed: 1.2,
        damage: 12,
        range: 1.88,
        height: 0.35,
        knockback: 3.5,
        hitStop: 0.066
      },
      kickCircular: {
        animationKey: 'circular',
        targetDuration: 0.8,
        fallbackDuration: 0.8,
        activeStart: 0.3,
        activeEnd: 0.72,
        lungeStart: 0.18,
        lungeEnd: 0.55,
        lungeSpeed: 1.3,
        damage: 13,
        range: 1.9,
        height: 0.8,
        knockback: 3.6,
        hitStop: 0.07
      },
      special: {
        animationKey: 'spartan',
        targetDuration: 0.92,
        fallbackDuration: 0.92,
        activeStart: 0.24,
        activeEnd: 0.74,
        lungeStart: 0.16,
        lungeEnd: 0.7,
        lungeSpeed: 3.0,
        damage: 29,
        range: 2.52,
        height: 0.95,
        knockback: 5.1,
        hitStop: 0.096
      }
    }
  },
  humano: {
    paths: {
      idle: '/assets/models/humano/en-guardia.glb',
      walkFwd: '/assets/models/humano/el-humano-caminando-adelante.glb',
      crawlIntro: '/assets/models/humano/el-humano-gateando.glb',
      punchCombo: '/assets/models/humano/combo-pinas.glb',
      elbow: '/assets/models/humano/golpe%20de%20codo.glb',
      kick: '/assets/models/humano/patada-el-humano.glb',
      introHumano: '/assets/models/humano/intro-el-humano.glb'
    },
    hitReactKey: 'idle',
    introKeys: ['introHumano', 'crawlIntro'],
    attacks: {
      punch: {
        animationKey: 'punchCombo',
        targetDuration: 1.08,
        fallbackDuration: 1.08,
        activeStart: 0.2,
        activeEnd: 0.86,
        lungeStart: 0.14,
        lungeEnd: 0.58,
        lungeSpeed: 1.35,
        damage: 15,
        range: 1.78,
        height: 1.1,
        knockback: 3.25,
        hitStop: 0.076
      },
      kick: {
        animationKey: 'kick',
        targetDuration: 0.86,
        fallbackDuration: 0.86,
        activeStart: 0.28,
        activeEnd: 0.62,
        lungeStart: 0.16,
        lungeEnd: 0.5,
        lungeSpeed: 1.45,
        damage: 13,
        range: 1.95,
        height: 0.78,
        knockback: 3.8,
        hitStop: 0.068
      },
      special: {
        animationKey: 'elbow',
        targetDuration: 0.96,
        fallbackDuration: 0.96,
        activeStart: 0.24,
        activeEnd: 0.72,
        lungeStart: 0.12,
        lungeEnd: 0.56,
        lungeSpeed: 2.85,
        damage: 28,
        range: 2.25,
        height: 1.25,
        knockback: 5.0,
        hitStop: 0.1
      }
    }
  }
};

class Fighter {
  static getAssetCount(characterType) {
    return Object.keys(CHARACTER_CONFIGS[characterType]?.paths || {}).length;
  }

  static isOneShotAnimation(key) {
    return key === 'kick' ||
      key === 'circular' ||
      key === 'spartan' ||
      key === 'hitReact' ||
      key === 'punchJumping' ||
      key === 'punchCombo' ||
      key === 'elbow' ||
      key === 'introMate' ||
      key === 'introMateAlt' ||
      key === 'introKick' ||
      key === 'introHandstand' ||
      key === 'introHumano' ||
      key === 'crawlIntro';
  }

  constructor(characterType, positionX, facingDirection, scene, renderer, onAssetLoaded) {
    this.characterType = characterType; // 'orsi' o 'lacalle'
    this.config = CHARACTER_CONFIGS[this.characterType] || null;
    this.facingDirection = facingDirection; // 1 (mira a la derecha), -1 (mira a la izquierda)
    this.scene = scene;
    this.renderer = renderer; // Guardar referencia para KTX2Loader
    this.onAssetLoaded = onAssetLoaded;

    // Atributos del peleador
    this.health = 100;
    this.maxHealth = 100;
    this.specialMeter = 0;
    this.maxSpecial = 100;
    this.isDead = false;
    this.canReceiveDamage = true;

    // FÃ­sicas
    this.position = new THREE.Vector3(positionX, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.isGrounded = true;
    this.gravity = 38;
    this.fallGravity = 52;
    this.jumpForce = 12.5;
    this.speed = 4.9;
    this.backSpeed = 3.4;
    this.airControl = 0.28;
    this.groundAcceleration = 46;
    this.groundDeceleration = 58;
    this.moveDirection = 0;
    this.depthDirection = 0;
    this.depthSpeed = 2.1;
    this.depthAcceleration = 24;
    this.depthDeceleration = 34;
    this.minDepth = -0.6;
    this.maxDepth = 2.8;

    // MÃ¡quina de estados
    // Estados: IDLE, WALK, JUMPING, FALLING, BLOCK, HIT, PUNCH, KICK, SPECIAL, DEFEAT, VICTORY
    this.currentState = 'IDLE';
    this.stateTimer = 0;
    this.hitStunTimer = 0;
    this.hitStopTimer = 0;
    this.landingLockTimer = 0;

    // Ataques
    this.isAttacking = false;
    this.hasHitThisAttack = false;
    this.currentAttackDamage = 0;
    this.currentAttackRange = 0;
    this.currentAttackHeight = 0;
    this.currentAttackSpec = null;
    this.currentAttackDirection = this.facingDirection;
    this.introAnimationKey = null;
    this.hitReactTargetDuration = 0.95;
    this.queuedAction = null;
    this.actionBufferTimer = 0;
    this.actionBufferWindow = 0.14;
    
    // Combos y puntuaciÃ³n
    this.comboCount = 0;
    this.comboTimer = 0;

    // Control de carga GLB
    this.hasLoadedGLB = false;
    this.usesGLB = false;
    this.characterModels = {};
    this.mixers = {};
    this.actions = {};
    this.activeAnimationKey = null;

    // Fundido cruzado (Cross-fade) entre modelos GLB
    this.crossFadeSource = null;
    this.crossFadeTarget = null;
    this.crossFadeTimer = 0.0;

    // ConstrucciÃ³n visual del modelo articulado 3D
    this.mesh = new THREE.Group();
    this.mesh.visible = false; // Ocultar por defecto hasta que todo estÃ© cargado
    this.bones = {}; // AlmacenarÃ¡ partes del cuerpo para rotaciones
    this.createProceduralModel();
    this.scene.add(this.mesh);

    // Cargar modelos GLB especÃ­ficos si aplica
    this.loadGLBModels();

    // Sincronizar posiciÃ³n inicial
    this.mesh.position.copy(this.position);
    this.updateFacingDirection();
  }

  // Crea un luchador articulado usando geometrÃ­as bÃ¡sicas de Three.js (Procedural fallback)
  createProceduralModel() {
    const isOrsi = this.characterType === 'orsi';
    const isLacalle = this.characterType === 'lacalle';
    this.proceduralGroup = new THREE.Group();
    if (isOrsi || isLacalle) {
      this.proceduralGroup.visible = false; // Deshabilitar el placeholder visual
    }
    this.mesh.add(this.proceduralGroup);
    
    // Materiales del traje/ropa
    const suitColor = isOrsi ? 0xd32f2f : 0x1976d2; // FA (Rojo) vs PN (Azul)
    const suitMaterial = new THREE.MeshStandardMaterial({ color: suitColor, roughness: 0.5 });
    const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xffd1a4, roughness: 0.6 });
    const hairMaterial = new THREE.MeshStandardMaterial({ color: isOrsi ? 0xdcdcdc : 0xffeb3b, roughness: 0.8 }); // Canoso vs Rubio
    const pantMaterial = new THREE.MeshStandardMaterial({ color: isOrsi ? 0x212121 : 0x37474f, roughness: 0.7 }); // Negro vs Gris oscuro
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0xb0bec5, metalness: 0.8, roughness: 0.2 }); // Termo / Mate
    
    // 1. Torso (Pecho)
    const torsoGeo = new THREE.BoxGeometry(0.8, 0.9, 0.45);
    const torso = new THREE.Mesh(torsoGeo, suitMaterial);
    torso.position.y = 1.15;
    this.proceduralGroup.add(torso);
    this.bones.torso = torso;

    // 2. Cabeza
    const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMaterial);
    head.position.y = 0.7;
    torso.add(head);
    this.bones.head = head;

    // Pelo
    let hairGeo;
    if (isOrsi) {
      // Pelo corto canoso
      hairGeo = new THREE.BoxGeometry(0.32, 0.15, 0.32);
    } else {
      // Pelo mÃ¡s voluminoso/surfista rubio
      hairGeo = new THREE.BoxGeometry(0.34, 0.22, 0.36);
    }
    const hair = new THREE.Mesh(hairGeo, hairMaterial);
    hair.position.y = 0.2;
    head.add(hair);

    // Ojos/Lentes (Detalles)
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8);
    
    const eyeL = new THREE.Mesh(eyeGeo, eyeMaterial);
    eyeL.position.set(0.1, 0.05, 0.22);
    head.add(eyeL);

    const eyeR = new THREE.Mesh(eyeGeo, eyeMaterial);
    eyeR.position.set(-0.1, 0.05, 0.22);
    head.add(eyeR);

    // 3. BRAZO DERECHO (Golpes principales)
    const shoulderR = new THREE.Group();
    shoulderR.position.set(-0.5, 0.35, 0);
    torso.add(shoulderR);
    this.bones.shoulderR = shoulderR;

    const armUpperRGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.45);
    const armUpperR = new THREE.Mesh(armUpperRGeo, suitMaterial);
    armUpperR.position.y = -0.2;
    shoulderR.add(armUpperR);

    const elbowR = new THREE.Group();
    elbowR.position.y = -0.4;
    shoulderR.add(elbowR);
    this.bones.elbowR = elbowR;

    const armLowerRGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    const armLowerR = new THREE.Mesh(armLowerRGeo, skinMaterial);
    armLowerR.position.y = -0.2;
    elbowR.add(armLowerR);

    // Mano Derecha (PuÃ±o)
    const handRGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const handR = new THREE.Mesh(handRGeo, skinMaterial);
    handR.position.y = -0.42;
    elbowR.add(handR);

    // 4. BRAZO IZQUIERDO (Sostiene termo/mate para Orsi, libre para Lacalle)
    const shoulderL = new THREE.Group();
    shoulderL.position.set(0.5, 0.35, 0);
    torso.add(shoulderL);
    this.bones.shoulderL = shoulderL;

    const armUpperLGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.45);
    const armUpperL = new THREE.Mesh(armUpperLGeo, suitMaterial);
    armUpperL.position.y = -0.2;
    shoulderL.add(armUpperL);

    const elbowL = new THREE.Group();
    elbowL.position.y = -0.4;
    shoulderL.add(elbowL);
    this.bones.elbowL = elbowL;

    const armLowerLGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.4);
    const armLowerL = new THREE.Mesh(armLowerLGeo, skinMaterial);
    armLowerL.position.y = -0.2;
    elbowL.add(armLowerL);

    // Mano Izquierda
    const handLGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const handL = new THREE.Mesh(handLGeo, skinMaterial);
    handL.position.y = -0.42;
    elbowL.add(handL);

    // Accesorios especÃ­ficos: Mate y Termo para YamandÃº Orsi
    if (isOrsi) {
      // Termo de cuero bajo el brazo izquierdo
      const termoGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.4);
      const termo = new THREE.Mesh(termoGeo, new THREE.MeshStandardMaterial({ color: 0x3e2723 })); 
      termo.position.set(0.12, -0.1, 0.05);
      termo.rotation.z = 0.3;
      armUpperL.add(termo);

      // Mate de calabaza en la mano izquierda
      const mateGeo = new THREE.SphereGeometry(0.065, 8, 8);
      const mate = new THREE.Mesh(mateGeo, new THREE.MeshStandardMaterial({ color: 0x4e342e }));
      mate.position.y = -0.05;
      handL.add(mate);
      
      // Bombilla
      const bombillaGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.1);
      const bombilla = new THREE.Mesh(bombillaGeo, metalMaterial);
      bombilla.position.set(-0.02, 0.06, 0.02);
      bombilla.rotation.x = -0.4;
      mate.add(bombilla);
    }

    // 5. PIERNA DERECHA
    const hipR = new THREE.Group();
    hipR.position.set(-0.25, -0.45, 0);
    torso.add(hipR);
    this.bones.hipR = hipR;

    const legUpperRGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.55);
    const legUpperR = new THREE.Mesh(legUpperRGeo, pantMaterial);
    legUpperR.position.y = -0.25;
    hipR.add(legUpperR);

    const kneeR = new THREE.Group();
    kneeR.position.y = -0.5;
    hipR.add(kneeR);
    this.bones.kneeR = kneeR;

    const legLowerRGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.5);
    const legLowerR = new THREE.Mesh(legLowerRGeo, pantMaterial);
    legLowerR.position.y = -0.25;
    kneeR.add(legLowerR);

    // Pie Derecho
    const footRGeo = new THREE.BoxGeometry(0.14, 0.08, 0.26);
    const footR = new THREE.Mesh(footRGeo, isOrsi ? pantMaterial : skinMaterial); 
    footR.position.set(0, -0.52, 0.06);
    kneeR.add(footR);

    // 6. PIERNA IZQUIERDA
    const hipL = new THREE.Group();
    hipL.position.set(0.25, -0.45, 0);
    torso.add(hipL);
    this.bones.hipL = hipL;

    const legUpperLGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.55);
    const legUpperL = new THREE.Mesh(legUpperLGeo, pantMaterial);
    legUpperL.position.y = -0.25;
    hipL.add(legUpperL);

    const kneeL = new THREE.Group();
    kneeL.position.y = -0.5;
    hipL.add(kneeL);
    this.bones.kneeL = kneeL;

    const legLowerLGeo = new THREE.CylinderGeometry(0.09, 0.07, 0.5);
    const legLowerL = new THREE.Mesh(legLowerLGeo, pantMaterial);
    legLowerL.position.y = -0.25;
    kneeL.add(legLowerL);

    // Pie Izquierdo
    const footLGeo = new THREE.BoxGeometry(0.14, 0.08, 0.26);
    const footL = new THREE.Mesh(footLGeo, isOrsi ? pantMaterial : skinMaterial);
    footL.position.set(0, -0.52, 0.06);
    kneeL.add(footL);

    // Habilitar sombras
    this.proceduralGroup.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
  }

  // Carga secuencial de los modelos GLB para el personaje
  loadGLBModels() {
    if (!this.config) {
      console.error(`[GLB] No se encontró config para personaje: ${this.characterType}`);
      return;
    }

    console.warn(`[GLB] Iniciando carga secuencial de modelos para ${this.characterType}. Paths:`, Object.keys(this.config.paths).join(', '));

    this.modelContainer = new THREE.Group();
    this.mesh.add(this.modelContainer);

    this.characterModels = {};
    this.mixers = {};
    this.actions = {};

    const paths = this.config.paths;
    const loader = getSharedGLTFLoader(this.renderer);

    let loadedCount = 0;
    const keys = Object.keys(paths);
    let keyIndex = 0;

    const markFinished = () => {
      this.hasLoadedGLB = true;

      if (loadedCount > 0) {
        if (this.proceduralGroup) this.proceduralGroup.visible = false;
        this.usesGLB = true;
        this.setGLBAnimation('idle', true);
        console.log(`Modelos GLB disponibles para ${this.characterType}:`, Object.keys(this.characterModels));
      } else {
        if (this.proceduralGroup) this.proceduralGroup.visible = true;
        this.usesGLB = false;
        console.warn(`No se pudo cargar ningún GLB de ${this.characterType}. Usando modelo procedural.`);
      }
    };

    const loadNext = () => {
      if (keyIndex >= keys.length) {
        markFinished();
        return;
      }

      const key = keys[keyIndex];
      console.warn(`[GLB] [${this.characterType}] Iniciando carga secuencial de [${key}] (${keyIndex + 1}/${keys.length}) desde: ${paths[key]}`);

      let settled = false;
      const loadTimeout = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        console.warn(`Timeout cargando modelo GLB de ${this.characterType} [${key}].`);
        if (this.onAssetLoaded) {
          this.onAssetLoaded(`${this.characterType}_${key}_timeout`);
        }
        keyIndex++;
        loadNext();
      }, 15000);

      const finishLoad = () => {
        if (settled) return false;
        settled = true;
        window.clearTimeout(loadTimeout);
        return true;
      };

      try {
        loader.load(
          paths[key],
          (gltf) => {
            try {
              if (!finishLoad()) return;

              const model = gltf.scene;
              model.traverse((node) => {
                if (node.isMesh) {
                  node.castShadow = true;
                  node.receiveShadow = true;
                }
              });

              model.scale.setScalar(1.05);
              model.position.set(0, 0, 0);
              model.rotation.y = 0;

              this.modelContainer.add(model);
              this.characterModels[key] = model;
              model.visible = false;

              if (gltf.animations && gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                const clip = this.sanitizeClipRootMotion(gltf.animations[0]);
                const action = mixer.clipAction(clip);
                
                if (Fighter.isOneShotAnimation(key)) {
                  action.setLoop(THREE.LoopOnce);
                  action.clampWhenFinished = true;
                } else {
                  action.play();
                }

                this.mixers[key] = mixer;
                this.actions[key] = action;
              }

              loadedCount++;
              if (this.onAssetLoaded) {
                this.onAssetLoaded(`${this.characterType}_${key}`);
              }
              keyIndex++;
              loadNext();
            } catch (err) {
              console.error(`Error procesando modelo GLB de ${this.characterType} [${key}]:`, err);
              if (this.onAssetLoaded) {
                this.onAssetLoaded(`${this.characterType}_${key}_error`);
              }
              keyIndex++;
              loadNext();
            }
          },
          undefined,
          (err) => {
            if (!finishLoad()) return;
            console.error(`Error cargando modelo GLB de ${this.characterType} [${key}]:`, err);
            if (this.onAssetLoaded) {
              this.onAssetLoaded(`${this.characterType}_${key}_fallback`);
            }
            keyIndex++;
            loadNext();
          }
        );
      } catch (err) {
        if (finishLoad()) {
          console.error(`Excepción síncrona cargando modelo GLB de ${this.characterType} [${key}]:`, err);
          if (this.onAssetLoaded) {
            this.onAssetLoaded(`${this.characterType}_${key}_error`);
          }
          keyIndex++;
          loadNext();
        }
      }
    };

    loadNext();
  }

  // Helper para establecer la opacidad de todos los materiales de un modelo
  setModelOpacity(model, opacity) {
    if (!model) return;
    model.traverse((node) => {
      if (node.isMesh) {
        const makeTransparent = opacity < 1.0;
        if (Array.isArray(node.material)) {
          node.material.forEach(mat => {
            mat.transparent = makeTransparent;
            mat.opacity = opacity;
            mat.depthWrite = true; // Ensure depth write is true to avoid self-sorting transparency artifacts
          });
        } else if (node.material) {
          node.material.transparent = makeTransparent;
          node.material.opacity = opacity;
          node.material.depthWrite = true;
        }
      }
    });
  }

  setGLBAnimation(key, forceRestart = false, duration = null) {
    if (!this.usesGLB || !this.characterModels[key]) return;

    if (this.activeAnimationKey === key && !forceRestart) return;

    const oldKey = this.activeAnimationKey;
    this.activeAnimationKey = key;

    // Solo realizamos fundido de opacidad (cross-fade) si se especifica una duración explícita (para transiciones de intros)
    if (duration !== null && oldKey && oldKey !== key && this.characterModels[oldKey]) {
      this.crossFadeSource = oldKey;
      this.crossFadeTarget = key;
      this.crossFadeTimer = 0.0;
      this.crossFadeDuration = duration;

      // Ocultar y restablecer opacidad de cualquier otra malla de animación previa para evitar "ghosting"
      Object.keys(this.characterModels).forEach(modelKey => {
        if (modelKey !== oldKey && modelKey !== key) {
          const m = this.characterModels[modelKey];
          if (m) {
            m.visible = false;
            this.setModelOpacity(m, 1.0);
          }
        }
      });

      this.characterModels[oldKey].visible = true;
      this.characterModels[key].visible = true;

      this.setModelOpacity(this.characterModels[oldKey], 1.0);
      this.setModelOpacity(this.characterModels[key], 0.0);
    } else {
      // Sin fundido de opacidad (para combate y cambios rápidos), activar directamente la malla destino y apagar el resto
      Object.keys(this.characterModels).forEach(modelKey => {
        const model = this.characterModels[modelKey];
        if (model) {
          model.visible = modelKey === key;
          this.setModelOpacity(model, 1.0);
        }
      });
      this.crossFadeSource = null;
      this.crossFadeTarget = null;
    }

    const action = this.actions[key];
    if (action) {
      if (Fighter.isOneShotAnimation(key)) {
        action.reset();
      }
      action.play();
    }
  }

  getGLBClipDuration(key, fallback) {
    const action = this.actions[key];
    const clip = action ? action.getClip() : null;
    return clip ? Math.max(0.1, clip.duration) : fallback;
  }

  getMoveDuration(spec) {
    if (!spec) return 0.4;
    if (this.usesGLB && spec.animationKey) {
      return this.getGLBClipDuration(spec.animationKey, spec.fallbackDuration || 0.4);
    }
    return spec.targetDuration || spec.fallbackDuration || 0.4;
  }

  sanitizeClipRootMotion(clip) {
    if (!clip || !clip.tracks) return clip;

    try {
      const sanitizedTracks = clip.tracks.map(track => {
        if (!track || !track.name || typeof track.name !== 'string') return track;
        if (!track.name.includes('Hips.position')) return track;

        try {
          const clonedTrack = track.clone();
          const values = clonedTrack.values;
          if (!values) return clonedTrack;

          const startX = values[0] || 0;
          const startZ = values[2] || 0;

          for (let i = 0; i < values.length; i += 3) {
            values[i] = startX;
            values[i + 2] = startZ;
          }

          return clonedTrack;
        } catch (e) {
          console.warn(`No se pudo limpiar el root motion de la pista:`, track, e);
          return track;
        }
      });

      return new THREE.AnimationClip(clip.name, clip.duration, sanitizedTracks);
    } catch (err) {
      console.error(`Error sanitizando clip ${clip.name}:`, err);
      return clip;
    }
  }

  // Actualizador de visibilidad y mezclador de animaciones GLB
  updateGLBAnimation(dt) {
    if (!this.usesGLB) return;

    // Actualizar progreso del cross-fade si está activo
    if (this.crossFadeSource && this.crossFadeTarget) {
      this.crossFadeTimer += dt;
      const duration = this.crossFadeDuration || 0.24;
      const progress = Math.min(1, this.crossFadeTimer / duration);

      const sourceModel = this.characterModels[this.crossFadeSource];
      const targetModel = this.characterModels[this.crossFadeTarget];

      this.setModelOpacity(sourceModel, 1.0 - progress);
      this.setModelOpacity(targetModel, progress);

      if (progress >= 1.0) {
        if (sourceModel) {
          sourceModel.visible = false;
          this.setModelOpacity(sourceModel, 1.0); // Restaurar opacidad por defecto
        }
        this.crossFadeSource = null;
        this.crossFadeTarget = null;
      }
    }

    let activeKey = 'idle';

    switch (this.currentState) {
      case 'IDLE':
        activeKey = 'idle';
        break;
      case 'INTRO':
        activeKey = this.introAnimationKey || 'idle';
        break;
      case 'BLOCK':
        activeKey = this.config?.blockKey || 'idle';
        break;
      case 'HIT':
        activeKey = this.config?.hitReactKey || 'idle';
        break;
      case 'DEFEAT':
        // Acostar el cuerpo rotando el grupo principal de Yamandú
        this.modelContainer.rotation.z = THREE.MathUtils.lerp(this.modelContainer.rotation.z, this.facingDirection * Math.PI / 2, 8 * dt);
        this.modelContainer.position.y = THREE.MathUtils.lerp(this.modelContainer.position.y, 0.2, 8 * dt);
        activeKey = 'idle';
        break;
      case 'VICTORY':
        activeKey = 'idle'; 
        break;
      case 'WALK':
        // Verificar si avanza o retrocede
        if (Math.abs(this.velocity.x) < 0.2) {
          activeKey = 'idle';
        } else {
          const isMovingFwd = (this.velocity.x > 0 && this.facingDirection === 1) || (this.velocity.x < 0 && this.facingDirection === -1);
          activeKey = isMovingFwd ? 'walkFwd' : 'walkBwd';
        }
        break;
      case 'PUNCH':
        activeKey = this.currentAttackSpec?.animationKey || this.config?.attacks.punch.animationKey || 'circular';
        break;
      case 'KICK':
        activeKey = this.currentAttackSpec?.animationKey || this.config?.attacks.kick.animationKey || 'kick';
        break;
      case 'SPECIAL':
        activeKey = this.currentAttackSpec?.animationKey || this.config?.attacks.special.animationKey || 'spartan';
        break;
      default:
        activeKey = 'idle';
        break;
    }

    if (!this.characterModels[activeKey]) activeKey = 'idle';
    this.setGLBAnimation(activeKey);

    // Actualizar mezclador de animación
    const activeMixer = this.mixers[activeKey];
    const activeAction = this.actions[activeKey];
    if (activeAction) {
      if (activeKey === 'walkFwd' || activeKey === 'walkBwd') {
        const baseSpeed = activeKey === 'walkFwd' ? this.speed : this.backSpeed;
        activeAction.timeScale = THREE.MathUtils.clamp(Math.abs(this.velocity.x) / baseSpeed, 0.72, 1.25);
      } else if (this.currentAttackSpec?.animationKey === activeKey) {
        const clip = activeAction.getClip();
        const targetDuration = this.getMoveDuration(this.currentAttackSpec);
        activeAction.timeScale = clip ? THREE.MathUtils.clamp(clip.duration / targetDuration, 0.6, 5) : 1;
      } else if (activeKey === 'hitReact') {
        const clip = activeAction.getClip();
        activeAction.timeScale = clip ? THREE.MathUtils.clamp(clip.duration / this.hitReactTargetDuration, 1, 4) : 1;
      } else {
        activeAction.timeScale = 1;
      }
    }

    // Actualizar mezclador del modelo en salida (source) para que siga moviéndose durante la transición
    if (this.crossFadeSource) {
      const sourceMixer = this.mixers[this.crossFadeSource];
      if (sourceMixer) {
        sourceMixer.update(dt);
      }
    }

    if (activeMixer) {
      activeMixer.update(dt);
    }
  }

  // LÃ³gica de Inputs y fÃ­sica del luchador
  update(dt, opponentPositionX) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      this.moveDirection = 0;
      this.depthDirection = 0;
      return;
    }

    this.stateTimer += dt;
    if (this.actionBufferTimer > 0) {
      this.actionBufferTimer = Math.max(0, this.actionBufferTimer - dt);
      if (this.actionBufferTimer === 0) this.queuedAction = null;
    }
    if (this.landingLockTimer > 0) {
      this.landingLockTimer = Math.max(0, this.landingLockTimer - dt);
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // 1. Sincronizar facing direction (Siempre mirar hacia el oponente, a menos que estÃ© en hit stun pesado o derrotado)
    if (!this.isAttacking && this.currentState !== 'DEFEAT' && this.currentState !== 'VICTORY' && this.currentState !== 'HIT') {
      if (opponentPositionX !== null && opponentPositionX !== undefined) {
        const dir = opponentPositionX > this.position.x ? 1 : -1;
        if (dir !== this.facingDirection) {
          this.facingDirection = dir;
          this.updateFacingDirection();
        }
      }
    }

    // 2. Procesar estados de stun y temporizadores de ataque
    if (this.currentState === 'HIT') {
      this.hitStunTimer -= dt;
      if (this.hitStunTimer <= 0) {
        this.changeState('IDLE');
      }
    }

    if (this.isAttacking) {
      const attackDuration = this.getMoveDuration(this.currentAttackSpec);

      if (this.currentAttackSpec && this.currentAttackSpec.lungeSpeed) {
        const progress = Math.min(1, this.stateTimer / attackDuration);
        const inLunge = progress >= this.currentAttackSpec.lungeStart && progress <= this.currentAttackSpec.lungeEnd;
        const targetLunge = inLunge ? this.currentAttackDirection * this.currentAttackSpec.lungeSpeed : 0;
        this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetLunge, 18 * dt);
      }

      if (this.stateTimer >= attackDuration) {
        this.isAttacking = false;
        this.currentAttackSpec = null;
        this.currentAttackDirection = this.facingDirection;
        this.changeState('IDLE');
        this.executeQueuedAction();
      }
    }

    // 3. Aplicar Gravedad
    if (!this.isGrounded) {
      const activeGravity = this.velocity.y > 0 ? this.gravity : this.fallGravity;
      this.velocity.y -= activeGravity * dt;
      this.position.y += this.velocity.y * dt;
      if (this.velocity.y < 0 && this.currentState === 'JUMPING') {
        this.changeState('FALLING');
      }

      // ColisiÃ³n con el piso
      if (this.position.y <= 0) {
        this.position.y = 0;
        this.velocity.y = 0;
        this.isGrounded = true;
        this.landingLockTimer = 0.06;
        if (this.currentState === 'FALLING' || this.currentState === 'JUMPING') {
          this.changeState('IDLE');
          this.executeQueuedAction();
        }
      }
    }

    // 4. Aplicar movimiento horizontal controlado
    const canMove = !this.isAttacking && this.landingLockTimer <= 0 && this.currentState !== 'HIT' && this.currentState !== 'DEFEAT' && this.currentState !== 'VICTORY' && this.currentState !== 'BLOCK';
    if (canMove) {
      const movingForward = this.moveDirection !== 0 && this.moveDirection === this.facingDirection;
      const targetSpeed = movingForward ? this.speed : this.backSpeed;
      const targetVelocityX = this.moveDirection * targetSpeed * (this.isGrounded ? 1 : this.airControl);
      const rate = Math.abs(targetVelocityX) > 0.01 ? this.groundAcceleration : this.groundDeceleration;
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVelocityX, Math.min(1, rate * dt));

      if (this.isGrounded) {
        const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
        if (planarSpeed > 0.15) this.changeState('WALK');
        else if (this.currentState === 'WALK') this.changeState('IDLE');
      }
    } else if (!this.isAttacking) {
      const rate = this.isGrounded ? this.groundDeceleration : 3;
      this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, 0, Math.min(1, rate * dt));
    }

    const canMoveDepth = canMove && opponentPositionX === null;
    if (canMoveDepth) {
      const targetVelocityZ = this.depthDirection * this.depthSpeed;
      const depthRate = Math.abs(targetVelocityZ) > 0.01 ? this.depthAcceleration : this.depthDeceleration;
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVelocityZ, Math.min(1, depthRate * dt));
    } else {
      this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, 0, Math.min(1, this.depthDeceleration * dt));
    }
    
    // Mover por velocidad
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.z = THREE.MathUtils.clamp(this.position.z, this.minDepth, this.maxDepth);

    // Sincronizar posiciÃ³n de malla
    this.mesh.position.copy(this.position);

    // 5. Aplicar animación (GLB o procedural)
    if (this.usesGLB) {
      this.updateGLBAnimation(dt);
      this.updateModelContainerPose(dt);
    } else {
      this.animateBones(dt);
    }

    this.moveDirection = 0;
    this.depthDirection = 0;
  }

  // Rotaciones de malla segÃºn facing direction
  updateFacingDirection() {
    this.mesh.rotation.y = this.facingDirection === 1 ? Math.PI / 2 : -Math.PI / 2;
  }

  updateModelContainerPose(dt) {
    if (!this.modelContainer || this.currentState === 'DEFEAT') return;

    let targetX = 0;
    let targetY = 0;
    let targetRotZ = 0;

    if (this.currentState === 'HIT') {
      const duration = Math.max(0.1, this.hitStunTimer + this.stateTimer);
      const progress = THREE.MathUtils.clamp(this.stateTimer / duration, 0, 1);
      const recoil = Math.sin(progress * Math.PI);
      targetX = -this.facingDirection * recoil * 0.16;
      targetRotZ = -this.facingDirection * recoil * 0.16;
    } else if (this.isAttacking && this.currentAttackSpec) {
      const duration = this.getMoveDuration(this.currentAttackSpec);
      const progress = THREE.MathUtils.clamp(this.stateTimer / duration, 0, 1);
      targetX = this.currentAttackDirection * Math.sin(progress * Math.PI) * 0.05;
    }

    const blend = Math.min(1, 18 * dt);
    this.modelContainer.position.x = THREE.MathUtils.lerp(this.modelContainer.position.x, targetX, blend);
    this.modelContainer.position.y = THREE.MathUtils.lerp(this.modelContainer.position.y, targetY, blend);
    this.modelContainer.rotation.z = THREE.MathUtils.lerp(this.modelContainer.rotation.z, targetRotZ, blend);
  }

  // Acciones / Movimientos
  move(dir) {
    if (this.currentState === 'HIT' || this.currentState === 'DEFEAT' || this.currentState === 'VICTORY' || this.isAttacking) return;

    if (this.currentState === 'BLOCK') return;

    this.moveDirection = Math.sign(dir);
  }

  moveDepth(dir) {
    if (this.currentState === 'HIT' || this.currentState === 'DEFEAT' || this.currentState === 'VICTORY' || this.isAttacking || this.landingLockTimer > 0) return;
    if (this.currentState === 'BLOCK') return;

    this.depthDirection = Math.sign(dir);
  }

  canStartAction() {
    return this.currentState !== 'HIT' &&
      this.currentState !== 'DEFEAT' &&
      this.currentState !== 'VICTORY' &&
      !this.isAttacking &&
      this.landingLockTimer <= 0;
  }

  bufferAction(actionName) {
    if (this.currentState === 'HIT' || this.currentState === 'DEFEAT' || this.currentState === 'VICTORY') return;
    this.queuedAction = actionName;
    this.actionBufferTimer = this.actionBufferWindow;
  }

  executeQueuedAction() {
    if (!this.queuedAction || this.actionBufferTimer <= 0 || !this.canStartAction()) return;

    const action = this.queuedAction;
    this.queuedAction = null;
    this.actionBufferTimer = 0;

    if (action === 'punch') this.punch();
    else if (action === 'kick') this.kick();
    else if (action === 'special') this.special();
  }

  applyHitStop(duration) {
    this.hitStopTimer = Math.max(this.hitStopTimer, duration);
  }

  playIntroAnimation(animKeyOrSeed = 0, fadeDuration = null) {
    const introKeys = this.config?.introKeys || [];
    const availableKeys = introKeys.filter(key => this.characterModels[key]);
    if (!this.usesGLB || availableKeys.length === 0) {
      this.introAnimationKey = null;
      this.changeState('IDLE');
      return 0;
    }

    if (typeof animKeyOrSeed === 'string') {
      this.introAnimationKey = animKeyOrSeed;
    } else {
      const index = Math.abs(animKeyOrSeed) % availableKeys.length;
      this.introAnimationKey = availableKeys[index];
    }
    this.velocity.set(0, 0, 0);
    this.isAttacking = false;
    this.currentAttackSpec = null;
    this.changeState('INTRO');
    this.setGLBAnimation(this.introAnimationKey, true, fadeDuration);
    return this.getGLBClipDuration(this.introAnimationKey, 1.6);
  }

  finishIntroAnimation() {
    if (this.currentState !== 'INTRO') return;
    this.introAnimationKey = null;
    this.changeState('IDLE');
  }

  jump() {
    if (!this.isGrounded || !this.canStartAction()) return;
    
    this.velocity.y = this.jumpForce;
    this.isGrounded = false;
    this.changeState('JUMPING');
  }

  block(active) {
    if (this.currentState === 'HIT' || this.currentState === 'DEFEAT' || this.currentState === 'VICTORY' || this.isAttacking || !this.isGrounded) return;

    if (active) {
      this.changeState('BLOCK');
      this.velocity.x = 0;
    } else if (this.currentState === 'BLOCK') {
      this.changeState('IDLE');
    }
  }

  // Ataques
  punch() {
    if (!this.canStartAction()) {
      this.bufferAction('punch');
      return;
    }
    this.startAttack('punch', 'PUNCH');
  }

  kick() {
    if (!this.canStartAction()) {
      this.bufferAction('kick');
      return;
    }
    // Si es Lacalle y avanza o está neutral, usar patada circular. Si retrocede, usar barrido.
    if (this.characterType === 'lacalle') {
      const isMovingBack = (this.moveDirection !== 0 && this.moveDirection !== this.facingDirection);
      if (!isMovingBack) {
        this.startAttack('kickCircular', 'KICK');
        return;
      }
    }
    this.startAttack('kick', 'KICK');
  }

  special() {
    if (this.specialMeter < 100) return;
    if (!this.canStartAction()) {
      this.bufferAction('special');
      return;
    }
    this.startAttack('special', 'SPECIAL');
    this.specialMeter = 0;
  }

  startAttack(moveName, stateName) {
    const baseSpec = this.config?.attacks?.[moveName];
    if (!baseSpec) return;

    this.currentAttackSpec = { ...baseSpec };
    this.currentAttackDamage = this.currentAttackSpec.damage;
    this.currentAttackRange = this.currentAttackSpec.range;
    this.currentAttackHeight = this.currentAttackSpec.height;
    this.currentAttackDirection = this.facingDirection;
    this.changeState(stateName);
    this.isAttacking = true;
    this.hasHitThisAttack = false;

    if (stateName === 'SPECIAL') AudioManager.play('special_charge');
    else if (stateName === 'KICK') AudioManager.play('kick_swing');
    else AudioManager.play('punch_swing');
  }

  isAttackActive() {
    if (!this.isAttacking || !this.currentAttackSpec) return this.isAttacking;

    const duration = this.getMoveDuration(this.currentAttackSpec);
    const progress = Math.min(1, this.stateTimer / duration);
    return progress >= this.currentAttackSpec.activeStart && progress <= this.currentAttackSpec.activeEnd;
  }

  // Recibir DaÃ±o
  takeDamage(amount, knockbackX, isBlocked) {
    if (!this.canReceiveDamage) return;
    if (this.isDead) return;
    if (this.currentState === 'HIT') return;

    if (isBlocked) {
      this.health -= amount;
      this.velocity.x = knockbackX;
      if (window.gameApp) {
        window.gameApp.triggerCameraShake(0.04); // Pequeño temblor al bloquear
      }
    } else {
      this.health -= amount;
      
      this.specialMeter = Math.min(this.maxSpecial, this.specialMeter + amount * 0.4);

      this.changeState('HIT');
      const hitReactDuration = this.usesGLB ? this.getGLBClipDuration(this.config?.hitReactKey || 'idle', 0.55) : 0.55;
      this.hitStunTimer = this.usesGLB ? Math.min(hitReactDuration, this.hitReactTargetDuration) : (amount > 15 ? 0.55 : 0.35); 
      this.velocity.x = knockbackX;
      this.isAttacking = false;
      this.currentAttackSpec = null;
      this.currentAttackDirection = this.facingDirection;

      if (window.gameApp) {
        const shakeIntensity = amount > 20 ? 0.28 : 0.12; // Temblor pesado para golpes especiales/fuertes, medio para normales
        window.gameApp.triggerCameraShake(shakeIntensity);
      }
    }

    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  die() {
    this.isDead = true;
    this.changeState('DEFEAT');
    this.velocity.set(0, 0, 0);
  }

  // Administrador de Cambio de Estado
  changeState(newState) {
    if (this.currentState === newState) return;
    
    if (this.currentState === 'DEFEAT') return;

    this.currentState = newState;
    this.stateTimer = 0;

    // Ejecutar animaciones de un solo golpe si el GLB esta cargado
    if (this.usesGLB) {
      if (newState === 'PUNCH' || newState === 'KICK' || newState === 'SPECIAL') {
        const animKey = this.currentAttackSpec?.animationKey;
        if (animKey) this.setGLBAnimation(animKey, true);
      } else if (newState === 'INTRO') {
        if (this.introAnimationKey) this.setGLBAnimation(this.introAnimationKey, true);
      } else if (newState === 'HIT') {
        this.setGLBAnimation(this.config?.hitReactKey || 'idle', true);
      } else if (newState === 'BLOCK') {
        this.setGLBAnimation(this.config?.blockKey || 'idle', true);
      }
    }
  }

  // LÃ³gica de Medidor Especial
  addSpecial(amount) {
    this.specialMeter = Math.min(this.maxSpecial, this.specialMeter + amount);
  }

  // Restablecer atributos
  reset(positionX, facingDirection) {
    this.health = this.maxHealth;
    this.specialMeter = 0;
    this.isDead = false;
    this.currentState = 'IDLE';
    this.position.set(positionX, 0, 0);
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.isAttacking = false;
    this.hasHitThisAttack = false;
    this.currentAttackSpec = null;
    this.currentAttackDirection = this.facingDirection;
    this.introAnimationKey = null;
    this.moveDirection = 0;
    this.depthDirection = 0;
    this.facingDirection = facingDirection;
    this.mesh.position.copy(this.position);
    this.updateFacingDirection();
    this.resetBoneRotations();

    // Limpiar estados de cross-fade
    this.crossFadeSource = null;
    this.crossFadeTarget = null;
    this.crossFadeTimer = 0.0;

    // Restablecer posición/rotación del contenedor GLB si cargó
    if (this.usesGLB) {
      if (this.modelContainer) {
        this.modelContainer.rotation.set(0, 0, 0);
        this.modelContainer.position.set(0, 0, 0);
      }
      Object.keys(this.actions).forEach(key => {
        const action = this.actions[key];
        if (action) {
          action.stop();
          if (key === 'idle' || key === 'walkFwd' || key === 'walkBwd') {
            action.play();
          }
        }
      });
      // Restaurar opacidades de todos los modelos a 1.0
      Object.keys(this.characterModels).forEach(k => {
        this.setModelOpacity(this.characterModels[k], 1.0);
      });
      this.setGLBAnimation('idle', true);
    }
  }

  // Restablece rotaciones a la pose de referencia (Pose T bÃ¡sica)
  resetBoneRotations() {
    if (!this.bones.torso) return;
    this.bones.torso.rotation.set(0, 0, 0);
    this.bones.head.rotation.set(0, 0, 0);
    this.bones.shoulderR.rotation.set(0, 0, 0);
    this.bones.elbowR.rotation.set(0, 0, 0);
    this.bones.shoulderL.rotation.set(0, 0, 0);
    this.bones.elbowL.rotation.set(0, 0, 0);
    this.bones.hipR.rotation.set(0, 0, 0);
    this.bones.kneeR.rotation.set(0, 0, 0);
    this.bones.hipL.rotation.set(0, 0, 0);
    this.bones.kneeL.rotation.set(0, 0, 0);
  }

  // ANIMACIÃ“N PROCEDURAL DE HUESOS (Motor cinemÃ¡tico por tiempo)
  animateBones(dt) {
    if (!this.bones.torso) return;

    const time = performance.now() * 0.001;
    const isOrsi = this.characterType === 'orsi';
    
    // Restablecer por defecto si es necesario e ir interpolando
    this.resetBoneRotations();

    switch (this.currentState) {
      case 'IDLE':
        // RespiraciÃ³n suave (sube y baja el torso)
        this.bones.torso.position.y = 1.15 + Math.sin(time * 3) * 0.03;
        // Cabeza asiente levemente
        this.bones.head.rotation.x = Math.sin(time * 3) * 0.02;
        
        // Brazos en posiciÃ³n de guardia relajada
        this.bones.shoulderR.rotation.z = -0.4;
        this.bones.shoulderR.rotation.x = 0.3 + Math.sin(time * 3) * 0.03;
        this.bones.elbowR.rotation.x = -1.2;

        if (isOrsi) {
          // Orsi sostiene mate: brazo izquierdo pegado al cuerpo con Ã¡ngulo
          this.bones.shoulderL.rotation.z = 0.1;
          this.bones.shoulderL.rotation.x = 0.5;
          this.bones.elbowL.rotation.x = -1.5; // Dobla para tomar mate
        } else {
          // Guardia surfista/atlÃ©tica de Lacalle
          this.bones.shoulderL.rotation.z = 0.4;
          this.bones.shoulderL.rotation.x = 0.2 + Math.cos(time * 3) * 0.03;
          this.bones.elbowL.rotation.x = -1.0;
        }

        // Piernas ligeramente flectadas
        this.bones.hipR.rotation.x = 0.1;
        this.bones.kneeR.rotation.x = -0.15;
        this.bones.hipL.rotation.x = 0.1;
        this.bones.kneeL.rotation.x = -0.15;
        break;

      case 'WALK':
        // OscilaciÃ³n rÃ¡pida del torso
        this.bones.torso.position.y = 1.15 + Math.abs(Math.sin(time * 8)) * 0.05;
        
        // Movimiento de caminata: Piernas oscilando alternadamente
        const legCycle = Math.sin(time * 8);
        this.bones.hipR.rotation.x = legCycle * 0.6;
        this.bones.kneeR.rotation.x = legCycle > 0 ? -legCycle * 0.4 : 0;
        this.bones.hipL.rotation.x = -legCycle * 0.6;
        this.bones.kneeL.rotation.x = legCycle < 0 ? legCycle * 0.4 : 0;

        // Brazos balanceÃ¡ndose
        this.bones.shoulderR.rotation.x = 0.3 - legCycle * 0.4;
        this.bones.elbowR.rotation.x = -1.0;
        
        if (isOrsi) {
          // Orsi mantiene el mate estable frente al pecho
          this.bones.shoulderL.rotation.x = 0.5;
          this.bones.elbowL.rotation.x = -1.4;
        } else {
          this.bones.shoulderL.rotation.x = 0.3 + legCycle * 0.4;
          this.bones.elbowL.rotation.x = -1.0;
        }
        break;

      case 'JUMPING':
        // Cuerpo estirado hacia arriba
        this.bones.torso.position.y = 1.25;
        this.bones.shoulderR.rotation.z = -1.2; // Brazos arriba
        this.bones.shoulderL.rotation.z = 1.2;
        this.bones.hipR.rotation.x = -0.2;
        this.bones.hipL.rotation.x = -0.2;
        break;

      case 'BLOCK':
        // Cruzar los brazos al frente del pecho
        this.bones.torso.position.y = 1.1;
        this.bones.torso.rotation.y = 0.3; // Gira de costado
        
        this.bones.shoulderR.rotation.set(-0.8, 0, -0.6);
        this.bones.elbowR.rotation.x = -1.8;
        
        this.bones.shoulderL.rotation.set(-0.8, 0, 0.6);
        this.bones.elbowL.rotation.x = -1.8;
        
        // Piernas muy agachadas
        this.bones.hipR.rotation.x = 0.4;
        this.bones.kneeR.rotation.x = -0.5;
        this.bones.hipL.rotation.x = 0.4;
        this.bones.kneeL.rotation.x = -0.5;
        break;

      case 'PUNCH':
        // AnimaciÃ³n rÃ¡pida de golpe con el brazo derecho
        const punchProgress = this.stateTimer / 0.4; // 0.0 a 1.0
        let punchAngle = 0;
        if (punchProgress < 0.3) {
          // Cargar puÃ±o hacia atrÃ¡s
          punchAngle = THREE.MathUtils.lerp(0.3, -0.5, punchProgress / 0.3);
        } else if (punchProgress < 0.6) {
          // Estirar puÃ±o hacia adelante
          punchAngle = THREE.MathUtils.lerp(-0.5, 1.8, (punchProgress - 0.3) / 0.3);
          this.bones.torso.rotation.y = -0.4; // TorsiÃ³n
        } else {
          // Volver a posiciÃ³n
          punchAngle = THREE.MathUtils.lerp(1.8, 0.3, (punchProgress - 0.6) / 0.4);
        }
        
        this.bones.shoulderR.rotation.x = punchAngle;
        this.bones.elbowR.rotation.x = punchProgress > 0.3 && punchProgress < 0.7 ? -0.2 : -1.2;
        
        // Brazo izquierdo se mantiene en guardia
        this.bones.shoulderL.rotation.z = isOrsi ? 0.1 : 0.4;
        this.bones.elbowL.rotation.x = isOrsi ? -1.5 : -1.0;
        break;

      case 'KICK':
        // Patada con la pierna derecha
        const kickProgress = this.stateTimer / 0.4;
        let kickAngle = 0;
        let kneeAngle = 0;
        
        if (kickProgress < 0.3) {
          // Cargar pierna hacia arriba
          kickAngle = THREE.MathUtils.lerp(0.1, 0.8, kickProgress / 0.3);
          kneeAngle = THREE.MathUtils.lerp(-0.15, -1.2, kickProgress / 0.3);
        } else if (kickProgress < 0.6) {
          // Estirar patada (Knee se extiende a 0)
          kickAngle = THREE.MathUtils.lerp(0.8, 1.6, (kickProgress - 0.3) / 0.3);
          kneeAngle = THREE.MathUtils.lerp(-1.2, -0.1, (kickProgress - 0.3) / 0.3);
          this.bones.torso.rotation.x = -0.2; // Inclina torso atrÃ¡s
        } else {
          // Volver a tierra
          kickAngle = THREE.MathUtils.lerp(1.6, 0.1, (kickProgress - 0.6) / 0.4);
          kneeAngle = THREE.MathUtils.lerp(-0.1, -0.15, (kickProgress - 0.6) / 0.4);
        }

        this.bones.hipR.rotation.x = kickAngle;
        this.bones.kneeR.rotation.x = kneeAngle;
        
        // Pierna izquierda apoya firme
        this.bones.hipL.rotation.x = 0.2;
        this.bones.kneeL.rotation.x = -0.25;
        break;

      case 'SPECIAL':
        // SÃºper Ataque
        const specProgress = this.stateTimer / 0.9;
        
        if (isOrsi) {
          // MATE LANZALLAMAS (Orsi levanta su mano izquierda con el mate hacia el frente y dispara)
          if (specProgress < 0.35) {
            // Cargar: echa el torso atrÃ¡s, levanta el mate
            this.bones.torso.rotation.x = -0.3;
            this.bones.shoulderL.rotation.x = -0.5;
            this.bones.shoulderL.rotation.z = 0.5;
            this.bones.elbowL.rotation.x = -0.8;
          } else if (specProgress < 0.7) {
            // Ataque: Lanza el brazo izquierdo al frente de golpe y saca agua/mate
            this.bones.torso.rotation.x = 0.35;
            this.bones.shoulderL.rotation.x = 1.6; // Apunta directo al frente
            this.bones.shoulderL.rotation.z = 0.1;
            this.bones.elbowL.rotation.x = -0.1;
            
            // AnimaciÃ³n de mate hirviendo (se simula balanceando la cabeza)
            this.bones.head.rotation.x = 0.4;
          } else {
            // RecuperaciÃ³n
            this.bones.shoulderL.rotation.x = THREE.MathUtils.lerp(1.6, 0.5, (specProgress - 0.7) / 0.3);
          }
        } else {
          // COMBINACIÃ“N SURFISTA / FLEXIONES DE BRAZO (Luis se lanza de cabeza al frente girando)
          if (specProgress < 0.35) {
            // Agacharse cargando
            this.bones.torso.position.y = 0.8;
            this.bones.hipR.rotation.x = 0.8;
            this.bones.hipL.rotation.x = 0.8;
          } else if (specProgress < 0.75) {
            // Giros: Se lanza rotando el torso completo horizontalmente
            this.bones.torso.position.y = 1.0;
            this.bones.torso.rotation.z = specProgress * Math.PI * 4; // Â¡Giro de 360 grados de costado!
            this.bones.shoulderR.rotation.z = -1.5;
            this.bones.shoulderL.rotation.z = 1.5;
          } else {
            // CaÃ­da de pie
            this.bones.torso.rotation.z = 0;
          }
        }
        break;

      case 'HIT':
        // Torso inclinado hacia atrÃ¡s violentamente
        this.bones.torso.rotation.x = -0.5;
        this.bones.torso.position.y = 1.1;
        this.bones.head.rotation.x = -0.3;
        
        // Brazos salen volando descontrolados
        this.bones.shoulderR.rotation.set(0.6, 0, -0.8);
        this.bones.shoulderL.rotation.set(0.6, 0, 0.8);
        break;

      case 'DEFEAT':
        // De rodillas y desplomado en el suelo
        const defProgress = Math.min(1.0, this.stateTimer / 1.0); // CaÃ­da en 1 segundo
        
        this.bones.torso.position.y = THREE.MathUtils.lerp(1.15, 0.35, defProgress);
        this.bones.torso.rotation.x = THREE.MathUtils.lerp(0, 1.2, defProgress);
        
        this.bones.head.rotation.x = THREE.MathUtils.lerp(0, 0.5, defProgress); // Cabeza gacha
        
        // Brazos en el suelo
        this.bones.shoulderR.rotation.x = THREE.MathUtils.lerp(0.3, -1.0, defProgress);
        this.bones.shoulderL.rotation.x = THREE.MathUtils.lerp(0.3, -1.0, defProgress);
        
        // Piernas totalmente dobladas
        this.bones.hipR.rotation.x = THREE.MathUtils.lerp(0.1, 1.4, defProgress);
        this.bones.kneeR.rotation.x = THREE.MathUtils.lerp(-0.15, -1.6, defProgress);
        this.bones.hipL.rotation.x = THREE.MathUtils.lerp(0.1, 1.4, defProgress);
        this.bones.kneeL.rotation.x = THREE.MathUtils.lerp(-0.15, -1.6, defProgress);
        break;

      case 'VICTORY':
        // Pose triunfal
        this.bones.torso.position.y = 1.25;
        this.bones.head.rotation.x = -0.2; // Mirar al cielo
        
        if (isOrsi) {
          // Levanta el mate con el brazo izquierdo en seÃ±al de victoria, brazo derecho en jarra
          this.bones.shoulderL.rotation.set(2.0, 0, 0.2); // Levanta el mate bien alto
          this.bones.elbowL.rotation.x = -0.4;
          
          this.bones.shoulderR.rotation.set(0.3, 0, -0.6); // Mano a la cintura
          this.bones.elbowR.rotation.x = -1.4;
        } else {
          // Lacalle hace flexiones de brazo o pose atlÃ©tica de surf (brazos extendidos horizontales)
          const surfCycle = Math.sin(time * 6) * 0.15;
          this.bones.torso.rotation.y = 0.8; // PosiciÃ³n de costado
          this.bones.shoulderR.rotation.set(0, 0, -1.4 + surfCycle); // Brazo derecho extendido
          this.bones.elbowR.rotation.x = 0;
          this.bones.shoulderL.rotation.set(0, 0, 1.4 - surfCycle); // Brazo izquierdo extendido
          this.bones.elbowL.rotation.x = 0;
          
          // Flexiona piernas como si estuviese en la tabla
          this.bones.hipR.rotation.x = 0.5;
          this.bones.kneeR.rotation.x = -0.7;
          this.bones.hipL.rotation.x = 0.5;
          this.bones.kneeL.rotation.x = -0.7;
        }
        break;
        
      default:
        break;
    }
  }

  // Elimina la malla de la escena para liberar recursos
  destroy() {
    this.scene.remove(this.mesh);
    this.mesh.traverse((node) => {
      if (node.isMesh) {
        node.geometry.dispose();
        node.material.dispose();
      }
    });
  }
}

export default Fighter;

