/* ==========================================================================
   FIGHTUY - GAME LOOP
   Gestiona el bucle de actualización física y renderizado a 60 FPS estables
   ========================================================================== */

class GameLoop {
  constructor() {
    this.isActive = false;
    this.isPaused = false;
    this.lastTime = 0;
    this.accumulatedTime = 0;
    this.timeStep = 1 / 60; // Físicas fijas a 60 hz

    this.onUpdate = null; // Callback para lógicas
    this.onRender = null; // Callback para dibujar
  }

  start(onUpdate, onRender) {
    this.onUpdate = onUpdate;
    this.onRender = onRender;
    this.isActive = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulatedTime = 0;
    
    requestAnimationFrame((timestamp) => this.tick(timestamp));
    console.log('GameLoop iniciado.');
  }

  stop() {
    this.isActive = false;
    console.log('GameLoop detenido.');
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (this.isPaused) {
      this.isPaused = false;
      this.lastTime = performance.now();
    }
  }

  tick(timestamp) {
    if (!this.isActive) return;

    // Calcular el tiempo transcurrido en segundos
    const elapsed = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    if (!this.isPaused) {
      // Limitar el paso de tiempo máximo para evitar "espirales de la muerte" por lag
      const frameTime = Math.min(elapsed, 0.1);
      this.accumulatedTime += frameTime;

      // Ejecutar actualizaciones en pasos fijos (físicas estables)
      while (this.accumulatedTime >= this.timeStep) {
        if (this.onUpdate) {
          this.onUpdate(this.timeStep);
        }
        this.accumulatedTime -= this.timeStep;
      }

      // Renderizar el cuadro final interpolado
      if (this.onRender) {
        this.onRender();
      }
    }

    requestAnimationFrame((t) => this.tick(t));
  }
}

export default new GameLoop();
