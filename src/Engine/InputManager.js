/* ==========================================================================
   FIGHTUY - INPUT MANAGER
   Captura los eventos del teclado para controlar el movimiento y ataques de los peleadores
   ========================================================================== */

class InputManager {
  constructor() {
    this.keys = {};
    
    // Mapeo por defecto de teclas
    this.bindings = {
      p1: {
        left: 'KeyA',
        right: 'KeyD',
        jump: 'KeyE',
        block: 'KeyS',
        punch: 'KeyF',
        kick: 'KeyG',
        special: 'KeyV'
      },
      p2: {
        left: 'ArrowLeft',
        right: 'ArrowRight',
        jump: 'ArrowUp',
        block: 'ArrowDown',
        punch: 'KeyJ',
        kick: 'KeyK',
        special: 'KeyN'
      }
    };

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    // Resetear teclas cuando el navegador pierde el foco para evitar que se queden trabadas
    window.addEventListener('blur', () => {
      this.keys = {};
    });
  }

  // Verifica si una tecla está presionada
  isPressed(code) {
    return !!this.keys[code];
  }

  // Verifica inputs específicos de un jugador
  getPlayerInput(player) {
    const map = this.bindings[player];
    return {
      left: this.isPressed(map.left),
      right: this.isPressed(map.right),
      jump: this.isPressed(map.jump),
      block: this.isPressed(map.block),
      punch: this.isPressed(map.punch),
      kick: this.isPressed(map.kick),
      special: this.isPressed(map.special)
    };
  }

  // Permite verificar una pulsación única para navegar menús (evita repetición descontrolada)
  isTriggered(code) {
    if (this.keys[code]) {
      this.keys[code] = false; // Consumir el evento inmediatamente
      return true;
    }
    return false;
  }
}

export default new InputManager();
