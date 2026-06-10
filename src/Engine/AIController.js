/* ==========================================================================
   FIGHTUY - AI CONTROLLER
   Controla las acciones del peleador CPU según el nivel de dificultad elegido
   ========================================================================== */

class AIController {
  constructor() {
    this.difficulty = 'medium'; // 'easy', 'medium', 'hard'
    this.decisionTimer = 0;
    this.decisionDelay = 0.2; // Tiempo en segundos entre decisiones
    this.inputs = {
      left: false,
      right: false,
      jump: false,
      block: false,
      punch: false,
      kick: false,
      special: false
    };
  }

  setDifficulty(diff) {
    this.difficulty = diff;
    // Configurar retraso de decisiones según dificultad
    if (diff === 'easy') {
      this.decisionDelay = 0.35;
    } else if (diff === 'medium') {
      this.decisionDelay = 0.18;
    } else {
      this.decisionDelay = 0.06; // Reacción casi instantánea
    }
  }

  // Genera inputs ficticios para el luchador CPU basándose en la distancia
  update(dt, cpuFighter, playerFighter) {
    if (!cpuFighter || cpuFighter.isDead || !playerFighter || playerFighter.isDead) {
      this.resetInputs();
      return this.inputs;
    }

    this.decisionTimer += dt;
    if (this.decisionTimer < this.decisionDelay) {
      // Retornar inputs actuales para mantener continuidad (ej. caminar)
      return this.inputs;
    }

    this.decisionTimer = 0;
    this.resetInputs();

    // Calcular distancia y dirección respecto al jugador
    const distance = Math.abs(cpuFighter.position.x - playerFighter.position.x);
    const isToRight = cpuFighter.position.x > playerFighter.position.x;

    // 1. COMPORTAMIENTO SEGÚN DIFICULTAD
    if (this.difficulty === 'easy') {
      this.updateEasy(distance, isToRight, cpuFighter, playerFighter);
    } else if (this.difficulty === 'medium') {
      this.updateMedium(distance, isToRight, cpuFighter, playerFighter);
    } else {
      this.updateHard(distance, isToRight, cpuFighter, playerFighter);
    }

    return this.inputs;
  }

  resetInputs() {
    this.inputs.left = false;
    this.inputs.right = false;
    this.inputs.jump = false;
    this.inputs.block = false;
    this.inputs.punch = false;
    this.inputs.kick = false;
    this.inputs.special = false;
  }

  // IA FÁCIL: Lenta, casi no bloquea, ataca poco
  updateEasy(distance, isToRight, cpu, player) {
    const roll = Math.random();

    if (distance > 3.0) {
      // Demasiado lejos: avanzar hacia el jugador
      if (roll < 0.7) {
        if (isToRight) this.inputs.left = true;
        else this.inputs.right = true;
      }
    } else if (distance > 1.2) {
      // Distancia media: caminar o quedarse quieto
      if (roll < 0.4) {
        if (isToRight) this.inputs.left = true;
        else this.inputs.right = true;
      }
    } else {
      // A corta distancia: atacar aleatoriamente (25% probabilidad)
      if (roll < 0.15) {
        this.inputs.punch = true;
      } else if (roll < 0.25) {
        this.inputs.kick = true;
      }
    }
  }

  // IA MEDIA: Balanceada, bloquea ocasionalmente, usa especiales
  updateMedium(distance, isToRight, cpu, player) {
    const roll = Math.random();

    // Reaccionar al ataque del jugador (Bloqueo)
    if (player.isAttacking && distance < 1.8 && roll < 0.45) {
      this.inputs.block = true;
      return;
    }

    // Usar especial si está lleno
    if (cpu.specialMeter >= 100 && distance < 2.2 && roll < 0.6) {
      this.inputs.special = true;
      return;
    }

    if (distance > 2.2) {
      // Avanzar hacia el jugador
      if (isToRight) this.inputs.left = true;
      else this.inputs.right = true;
      
      // Saltar de vez en cuando al avanzar
      if (roll < 0.05) {
        this.inputs.jump = true;
      }
    } else {
      // Distancia de golpe
      if (roll < 0.35) {
        this.inputs.punch = true;
      } else if (roll < 0.6) {
        this.inputs.kick = true;
      } else if (roll < 0.75) {
        // Retroceder un poco para tomar aire
        if (isToRight) this.inputs.right = true;
        else this.inputs.left = true;
      } else {
        // Bloquear preventivo
        this.inputs.block = true;
      }
    }
  }

  // IA DIFÍCIL: Muy agresiva, bloquea mucho, lee inputs
  updateHard(distance, isToRight, cpu, player) {
    const roll = Math.random();

    // Bloquear casi siempre si el jugador está atacando a rango de golpe
    if (player.isAttacking && distance < 2.0) {
      // 80% de éxito al bloquear
      if (roll < 0.8) {
        this.inputs.block = true;
        return;
      }
    }

    // Ejecutar súper ataque especial instantáneamente si está listo
    if (cpu.specialMeter >= 100 && distance < 2.4) {
      this.inputs.special = true;
      return;
    }

    if (distance > 1.8) {
      // Acercarse muy rápido
      if (isToRight) this.inputs.left = true;
      else this.inputs.right = true;

      // Esquivar proyectiles o ataques saltando
      if (player.currentState === 'SPECIAL' && roll < 0.6) {
        this.inputs.jump = true;
      }
    } else {
      // Combos a corta distancia
      if (roll < 0.45) {
        this.inputs.punch = true;
      } else if (roll < 0.8) {
        this.inputs.kick = true;
      } else {
        // Bloquear o esquivar
        this.inputs.block = true;
      }
    }
  }
}

export default new AIController();
