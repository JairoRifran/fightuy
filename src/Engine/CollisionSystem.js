/* ==========================================================================
   FIGHTUY - COLLISION SYSTEM
   Maneja los límites del escenario, el empuje entre luchadores y la detección de golpes
   ========================================================================== */

import * as THREE from 'three';
import AudioManager from './AudioManager.js';

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
        // Impacto bloqueado: menor daño, menor retroceso
        const damage = attacker.currentAttackDamage * 0.15; // 15% daño
        defender.takeDamage(damage, attacker.facingDirection * 1.5, true);
        const blockStop = Math.max(0.03, (attacker.currentAttackSpec?.hitStop || 0.05) * 0.65);
        if (attacker.applyHitStop) attacker.applyHitStop(blockStop);
        if (defender.applyHitStop) defender.applyHitStop(blockStop + 0.01);
        
        // Efecto visual de Bloqueo (Destello azul/blanco)
        this.spawnSparks(hitboxX, hitboxY, '#00d2ff', 10);
        AudioManager.play('block');
      } else {
        // Impacto pleno
        const damage = attacker.currentAttackDamage;
        const knockback = attacker.currentAttackSpec?.knockback || (attacker.currentState === 'SPECIAL' ? 5.0 : 4.0);
        defender.takeDamage(damage, attacker.facingDirection * knockback, false);
        const hitStop = attacker.currentAttackSpec?.hitStop || (attacker.currentState === 'SPECIAL' ? 0.075 : 0.055);
        if (attacker.applyHitStop) attacker.applyHitStop(hitStop);
        if (defender.applyHitStop) defender.applyHitStop(hitStop + 0.015);
        
        // Efecto visual de Impacto (Chispas amarillas/rojas)
        const sparkColor = attacker.currentState === 'SPECIAL' ? '#ffca28' : '#ff3d00';
        const particleCount = attacker.currentState === 'SPECIAL' ? 35 : 18;
        this.spawnSparks(hitboxX, hitboxY, sparkColor, particleCount);
        
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
          if (defender.characterType === 'orsi') AudioManager.play('voice_orsi_hit');
          else if (defender.characterType === 'lacalle') AudioManager.play('voice_lacalle_hit');
          else if (defender.characterType === 'humano') AudioManager.play('voice_humano_hit');
          else AudioManager.play('hit');
        }, 100);
      }
    }
  }

  // Generador de partículas de chispas en 3D
  spawnSparks(x, y, color, count) {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending
    });

    const geometry = new THREE.SphereGeometry(0.06, 4, 4);

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.set(x, y + (Math.random() - 0.5) * 0.5, 0.5); // Posicionados ligeramente al frente (Z=0.5)
      
      // Velocidad aleatoria en 3D
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 5.0;
      const velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        (Math.sin(angle) * speed) + 2.0, // Impulso hacia arriba
        (Math.random() - 0.5) * speed * 0.5
      );

      this.particleGroup.add(mesh);
      this.particles.push({
        mesh: mesh,
        velocity: velocity,
        life: 1.0, // Vida en segundos
        decay: 2.0 + Math.random() * 2.0 // Velocidad de desaparición
      });
    }
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
        // Aplicar gravedad y mover
        p.velocity.y -= 9.8 * deltaTime; // Gravedad
        p.mesh.position.addScaledVector(p.velocity, deltaTime);
        
        // Desvanecimiento gradual
        p.mesh.material.opacity = p.life;
        
        // Escalar hacia abajo a medida que muere
        p.mesh.scale.setScalar(p.life);
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
