/* ==========================================================================
   FIGHTUY - COLLISION SYSTEM
   Maneja los límites del escenario, el empuje entre luchadores y la detección de golpes
   ========================================================================== */

import * as THREE from 'three';
import AudioManager from './AudioManager.js';
import UIManager from '../UI/UIManager.js';

class CollisionSystem {
  constructor() {
    this.particles = [];
    this.particleGroup = new THREE.Group();
  }

  // Agrega el grupo de partículas a la escena principal
  addToScene(scene) {
    scene.add(this.particleGroup);
  }

  // Actualiza los límites físicos, colisiones de cuerpos y ataques
  update(fighter1, fighter2, stageLimits) {
    if (!fighter1 || !fighter2) return;

    // 1. Limitar a los peleadores dentro del escenario (Lado Izquierdo / Derecho)
    this.keepInStage(fighter1, stageLimits);
    this.keepInStage(fighter2, stageLimits);

    // 2. Resolver colisiones de cuerpo (Evitar que se traspasen)
    this.resolveBodyOverlap(fighter1, fighter2);

    // 3. Evaluar detección de golpes (Hitbox contra Hurtbox)
    this.checkHit(fighter1, fighter2);
    this.checkHit(fighter2, fighter1);

    // 4. Actualizar partículas de golpes
    this.updateParticles();
  }

  // Mantiene al peleador dentro de los límites del escenario
  keepInStage(fighter, limits) {
    if (fighter.position.x < limits.minX) {
      fighter.position.x = limits.minX;
      fighter.velocity.x = 0;
    } else if (fighter.position.x > limits.maxX) {
      fighter.position.x = limits.maxX;
      fighter.velocity.x = 0;
    }
  }

  // Empuja a los peleadores si intentan traspasarse
  resolveBodyOverlap(f1, f2) {
    const depthDist = Math.abs(f1.position.z - f2.position.z);
    if (depthDist > 0.9) return;

    const dist = Math.abs(f1.position.x - f2.position.x);
    const minDistance = 1.6; // Radio del cuerpo combinado (0.8 cada uno)

    if (dist < minDistance) {
      const overlap = minDistance - dist;
      
      // Empujar en direcciones opuestas según quién esté a la izquierda
      if (f1.position.x < f2.position.x) {
        f1.position.x -= overlap * 0.5;
        f2.position.x += overlap * 0.5;
      } else {
        f1.position.x += overlap * 0.5;
        f2.position.x -= overlap * 0.5;
      }
    }
  }

  // Verifica si el ataque de un peleador golpea al oponente
  checkHit(attacker, defender) {
    // Solo puede golpear en frames activos de ataque (golpe, patada, especial)
    if (!attacker.isAttacking || attacker.hasHitThisAttack) return;
    if (attacker.isAttackActive && !attacker.isAttackActive()) return;

    // Calcular la posición absoluta del hitbox del atacante
    const attackRange = attacker.currentAttackRange || 1.8;
    const signedDistance = (defender.position.x - attacker.position.x) * attacker.facingDirection;
    if (signedDistance < 0.25 || signedDistance > attackRange + 0.35) return;

    const hitboxX = attacker.position.x + (attacker.facingDirection * attackRange);
    const hitboxY = attacker.position.y + attacker.currentAttackHeight; // Altura de golpe/patada
    const hitboxSize = 0.45;

    // Calcular límites de la caja de daño (Hurtbox) del defensor
    const hurtboxMinX = defender.position.x - 0.7;
    const hurtboxMaxX = defender.position.x + 0.7;
    const hurtboxMinY = defender.position.y;
    const hurtboxMaxY = defender.position.y + 2.0;

    // Verificar intersección (Caja 2D para simplificar el plano de pelea X-Y)
    const hitX = (hitboxX + hitboxSize > hurtboxMinX) && (hitboxX - hitboxSize < hurtboxMaxX);
    const hitY = (hitboxY + hitboxSize > hurtboxMinY) && (hitboxY - hitboxSize < hurtboxMaxY);
    const hitZ = Math.abs(attacker.position.z - defender.position.z) <= 0.85;

    if (hitX && hitY && hitZ) {
      // Registrar que este ataque ya conectó (para no hacer daño multi-hit por frame)
      attacker.hasHitThisAttack = true;

      // Calcular si el defensor está bloqueando
      // Para bloquear, el defensor debe estar en el estado BLOCK y estar mirando al atacante
      const isBlocking = defender.currentState === 'BLOCK' && 
                          (defender.facingDirection !== attacker.facingDirection);

      if (isBlocking) {
        // Impacto bloqueado: menor daño, menor retroceso, destello azul
        const damage = attacker.currentAttackDamage * 0.15; // 15% daño
        defender.takeDamage(damage, attacker.facingDirection * 1.5, true);
        const blockStop = Math.max(0.035, (attacker.currentAttackSpec?.hitStop || 0.05) * 0.7);
        if (attacker.applyHitStop) attacker.applyHitStop(blockStop);
        if (defender.applyHitStop) defender.applyHitStop(blockStop + 0.01);
        
        // Efecto visual de Bloqueo (Destello azul/blanco)
        this.spawnSparks(hitboxX, hitboxY, '#00d2ff', 12, 0.85);
        AudioManager.play('block');
      } else {
        // Impacto pleno
        const comboBeforeHit = attacker.comboCount || 0;
        const comboMultiplier = 1 + Math.min(comboBeforeHit, 7) * 0.08;
        const damage = attacker.currentAttackDamage * comboMultiplier;
        const knockback = attacker.currentAttackSpec?.knockback || (attacker.currentState === 'SPECIAL' ? 5.0 : 4.0);
        defender.takeDamage(damage, attacker.facingDirection * knockback, false);
        attacker.comboCount = comboBeforeHit + 1;
        attacker.comboTimer = Math.max(attacker.comboTimer || 0, attacker.currentState === 'SPECIAL' ? 2.8 : 2.25);
        attacker.specialMeter = Math.min(attacker.maxSpecial || 100, (attacker.specialMeter || 0) + damage * 0.18);

        const baseHitStop = attacker.currentAttackSpec?.hitStop || (attacker.currentState === 'SPECIAL' ? 0.08 : 0.055);
        const hitStop = baseHitStop + Math.min(comboBeforeHit, 5) * 0.01;
        if (attacker.applyHitStop) attacker.applyHitStop(hitStop);
        if (defender.applyHitStop) defender.applyHitStop(hitStop + 0.015);
        
        // Efecto visual de Impacto (Chispas amarillas/rojas)
        const sparkColor = attacker.currentState === 'SPECIAL' || comboBeforeHit >= 3 ? '#ffca28' : '#ff3d00';
        const particleCount = (attacker.currentState === 'SPECIAL' ? 42 : 22) + Math.min(comboBeforeHit, 6) * 6;
        this.spawnSparks(hitboxX, hitboxY, sparkColor, particleCount, 1.05 + Math.min(comboBeforeHit, 5) * 0.15);
        
        // Sacudida de cámara e impacto flash
        if (window.gameApp) {
          const isSpecial = attacker.currentState === 'SPECIAL';
          const baseShake = isSpecial ? 0.35 : 0.16;
          const comboShake = Math.min(comboBeforeHit, 6) * 0.04;
          window.gameApp.triggerCameraShake(baseShake + comboShake);
          
          // Flash de pantalla en golpes pesados o especiales
          if (isSpecial || comboBeforeHit >= 4) {
            UIManager.triggerFlash();
          }
        }

        // Reproducir sonido e ElevenLabs / Sonido de impacto
        if (attacker.currentState === 'SPECIAL') {
          if (attacker.characterType === 'orsi') AudioManager.play('special_orsi');
          else if (attacker.characterType === 'lacalle') AudioManager.play('special_lacalle');
          else if (attacker.characterType === 'humano') AudioManager.play('special_humano');
          else AudioManager.play('hit');
        } else {
          AudioManager.play(attacker.currentState === 'KICK' ? 'kick' : 'punch');
        }

        // Sonido de queja del receptor
        setTimeout(() => {
          if (defender.isDead) return; // Si murio, omitir sonido de queja ordinario
          if (defender.characterType === 'orsi') AudioManager.play('voice_orsi_hit');
          else if (defender.characterType === 'lacalle') AudioManager.play('voice_lacalle_hit');
          else if (defender.characterType === 'humano') AudioManager.play('voice_humano_hit');
          else AudioManager.play('hit');
        }, 80);
      }
    }
  }

  // Generador de partículas de chispas en 3D
  spawnSparks(x, y, color, count, scale = 1) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffffff'), // Comienzan al rojo vivo/blanco
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const geometry = new THREE.SphereGeometry(0.055 * scale, 4, 4);

    const startColor = new THREE.Color('#ffffff'); // Blanco incandescente
    const endColor = new THREE.Color(color);       // Color de enfriamiento

    // 1. Spawnear las chispas ordinarias
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.set(x, y + (Math.random() - 0.5) * 0.4, 0.5); // Posicionados al frente (Z=0.5)
      
      // Velocidad aleatoria en 3D
      const angle = Math.random() * Math.PI * 2;
      const speed = (2.2 + Math.random() * 5.5) * scale;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        (Math.sin(angle) * speed) + 2.2, // Impulso hacia arriba
        (Math.random() - 0.5) * speed * 0.5
      );

      this.particleGroup.add(mesh);
      this.particles.push({
        mesh: mesh,
        velocity: velocity,
        life: 1.0 * Math.min(1.4, scale),
        decay: (2.2 + Math.random() * 2.2) / Math.min(1.3, scale),
        isSpark: true,
        startColor: startColor.clone(),
        endColor: endColor.clone()
      });
    }

    // 2. Spawnear el anillo de choque expansivo (Shockwave Ring)
    const ringGeo = new THREE.RingGeometry(0.08, 0.12, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(x, y, 0.52); // Ligeramente por delante
    this.particleGroup.add(ringMesh);

    this.particles.push({
      mesh: ringMesh,
      isRing: true,
      life: 1.0,
      decay: 4.8, // Muere rapido (aprox 0.2s)
      maxScale: 6.8 * scale
    });
  }

  // Generador de destellos de aura de energia ascendente para intros
  spawnIntroAura(x, color) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending
    });

    const size = 0.035 + Math.random() * 0.045;
    const geometry = new THREE.SphereGeometry(size, 4, 4);
    const mesh = new THREE.Mesh(geometry, material);

    // Posicionar en forma de cilindro alrededor de los pies del personaje
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.15 + Math.random() * 0.55;
    const px = x + Math.cos(angle) * radius;
    const pz = (Math.random() - 0.5) * 0.8;
    const py = 0.0; // Desde el suelo

    mesh.position.set(px, py, pz);
    this.particleGroup.add(mesh);

    // Velocidad de ascenso y leve deriva horizontal
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      1.1 + Math.random() * 1.4, // Ascenso suave
      (Math.random() - 0.5) * 0.3
    );

    this.particles.push({
      mesh: mesh,
      velocity: velocity,
      life: 1.0,
      decay: 0.8 + Math.random() * 0.8, // Vida de 0.6s a 1.2s
      isAura: true
    });
  }

  // Actualiza y anima las partículas activas
  updateParticles() {
    const deltaTime = 1 / 60; // Asumimos pasos de 60fps aproximados

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime * p.decay;

      if (p.life <= 0) {
        // Remover de la escena y de la lista
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      } else {
        if (p.isRing) {
          // Escalar onda de choque expansiva y desvanecer
          const currentScale = (1.0 - p.life) * p.maxScale;
          p.mesh.scale.set(currentScale, currentScale, 1.0);
          p.mesh.material.opacity = p.life * 0.9;
        } else if (p.isSpark) {
          // Aplicar gravedad y mover
          p.velocity.y -= 9.8 * deltaTime; // Gravedad
          p.mesh.position.addScaledVector(p.velocity, deltaTime);
          
          // Desvanecimiento gradual
          p.mesh.material.opacity = p.life;
          
          // Escalar hacia abajo a medida que muere
          p.mesh.scale.setScalar(p.life);

          // LERP de color: De blanco encandescente a color base/brasa
          p.mesh.material.color.lerpColors(p.endColor, p.startColor, p.life);
        } else if (p.isAura) {
          // Ascenso suave sin gravedad
          p.mesh.position.addScaledVector(p.velocity, deltaTime);
          
          // Desvanecimiento gradual
          p.mesh.material.opacity = p.life * 0.65;
          p.mesh.scale.setScalar(p.life);
        }
      }
    }
  }

  // Limpia todas las partículas activas (ej. al reiniciar el combate)
  clear() {
    this.particles.forEach(p => {
      this.particleGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.particles = [];
  }
}

export default new CollisionSystem();
