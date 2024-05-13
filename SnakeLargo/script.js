// Selección del elemento con el id "replay" y asignación a la variable dom_replay
let dom_replay = document.querySelector("#replay");
// Selección del elemento con el id "score" y asignación a la variable dom_score
let dom_score = document.querySelector("#score");
// Creación de un elemento canvas y asignación a la variable dom_canvas, que luego se agrega como hijo al elemento con el id "canvas"
let dom_canvas = document.createElement("canvas");
document.querySelector("#canvas").appendChild(dom_canvas);
// Obtiene el contexto 2D del canvas y lo asigna a la variable CTX
let CTX = dom_canvas.getContext("2d");

// Definición de constantes W (ancho) y H (alto) con el tamaño del canvas
const W = (dom_canvas.width = 400);
const H = (dom_canvas.height = 400);

// Declaración de variables y asignación de valores iniciales
let snake,
  food,
  currentHue,
  cells = 20,
  cellSize,
  isGameOver = false,
  tails = [],
  score = 0,
  maxScore = window.localStorage.getItem("maxScore") || undefined,
  particles = [],
  splashingParticleCount = 20,
  cellsCount,
  requestID;

  // Declaración de la clase Vec para manipulación de vectores
let helpers = {
  Vec: class {
    constructor(x, y) {
      this.x = x;
      this.y = y;
    }
    // Método para sumar vectores
    add(v) {
      this.x += v.x;
      this.y += v.y;
      return this;
    }
     // Método para multiplicar vectores
    mult(v) {
      if (v instanceof helpers.Vec) {
        this.x *= v.x;
        this.y *= v.y;
        return this;
      } else {
        this.x *= v;
        this.y *= v;
        return this;
      }
    }
  },
  // Función para verificar si dos vectores son iguales
  isCollision(v1, v2) {
    return v1.x == v2.x && v1.y == v2.y;
  },
  // Función para eliminar partículas cuyo tamaño sea menor o igual a cero
  garbageCollector() {
    for (let i = 0; i < particles.length; i++) {
      if (particles[i].size <= 0) {
        particles.splice(i, 1);
      }
    }
  },
   // Función para dibujar una cuadrícula en el canvas
  drawGrid() {
    CTX.lineWidth = 1.1;
    CTX.strokeStyle = "#232332";
    CTX.shadowBlur = 0;
    for (let i = 1; i < cells; i++) {
      let f = (W / cells) * i;
      CTX.beginPath();
      CTX.moveTo(f, 0);
      CTX.lineTo(f, H);
      CTX.stroke();
      CTX.beginPath();
      CTX.moveTo(0, f);
      CTX.lineTo(W, f);
      CTX.stroke();
      CTX.closePath();
    }
  },
    // Función para generar un valor aleatorio para el componente de color 'hue'
  randHue() {
    return ~~(Math.random() * 360);
  },
  // Función para convertir un color HSL a RGB
  hsl2rgb(hue, saturation, lightness) {
     // Implementación de la conversión de HSL a RGB
    if (hue == undefined) {
      return [0, 0, 0];
    }
    var chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    var huePrime = hue / 60;
    var secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));

    huePrime = ~~huePrime;
    var red;
    var green;
    var blue;

    if (huePrime === 0) {
      red = chroma;
      green = secondComponent;
      blue = 0;
    } else if (huePrime === 1) {
      red = secondComponent;
      green = chroma;
      blue = 0;
    } else if (huePrime === 2) {
      red = 0;
      green = chroma;
      blue = secondComponent;
    } else if (huePrime === 3) {
      red = 0;
      green = secondComponent;
      blue = chroma;
    } else if (huePrime === 4) {
      red = secondComponent;
      green = 0;
      blue = chroma;
    } else if (huePrime === 5) {
      red = chroma;
      green = 0;
      blue = secondComponent;
    }

    var lightnessAdjustment = lightness - chroma / 2;
    red += lightnessAdjustment;
    green += lightnessAdjustment;
    blue += lightnessAdjustment;

    return [
      Math.round(red * 255),
      Math.round(green * 255),
      Math.round(blue * 255)
    ];
  },
   // Función para interpolar entre dos valores
  lerp(start, end, t) {
    return start * (1 - t) + end * t;
  }
};

// Objeto KEY que almacena el estado de las teclas de dirección
let KEY = {
  ArrowUp: false,
  ArrowRight: false,
  ArrowDown: false,
  ArrowLeft: false,
  // Método para restablecer el estado de todas las teclas de dirección
  resetState() {
    this.ArrowUp = false;
    this.ArrowRight = false;
    this.ArrowDown = false;
    this.ArrowLeft = false;
  },
  // Método para escuchar eventos de teclado y actualizar el estado de las teclas
  listen() {
    // Agrega un evento de escucha para el evento 'keydown'
    addEventListener(
      "keydown",
      // Verifica si se presionó una tecla de dirección y actualiza el estado de las teclas en consecuencia
        // Evita el movimiento en la dirección opuesta
        // Restablece el estado de las demás teclas de dirección
      (e) => {
        if (e.key === "ArrowUp" && this.ArrowDown) return;
        if (e.key === "ArrowDown" && this.ArrowUp) return;
        if (e.key === "ArrowLeft" && this.ArrowRight) return;
        if (e.key === "ArrowRight" && this.ArrowLeft) return;
        this[e.key] = true;
        Object.keys(this)
          .filter((f) => f !== e.key && f !== "listen" && f !== "resetState")
          .forEach((k) => {
            this[k] = false;
          });
      },
      false
    );
  }
};

// Definición de la clase Snake para representar la serpiente en el juego
class Snake {
  constructor(i, type) {
    // Inicialización de la posición y dirección de la serpiente, y otros atributos
    this.pos = new helpers.Vec(W / 2, H / 2);
    this.dir = new helpers.Vec(0, 0);
    this.type = type;
    this.index = i;
    this.delay = 5;
    this.size = W / cells;
    this.color = "white";
    this.history = [];
    this.total = 1;
  }
  // Método para dibujar la serpiente en el canvas
  draw() {
    // Dibuja la cabeza de la serpiente y sus segmentos, si los tiene
    let { x, y } = this.pos;
    CTX.fillStyle = this.color;
    CTX.shadowBlur = 20;
    CTX.shadowColor = "rgba(255,255,255,.3 )";
    CTX.fillRect(x, y, this.size, this.size);
    CTX.shadowBlur = 0;
    if (this.total >= 2) {
      for (let i = 0; i < this.history.length - 1; i++) {
        let { x, y } = this.history[i];
        CTX.lineWidth = 1;
        CTX.fillStyle = "rgba(225,225,225,1)";
        CTX.fillRect(x, y, this.size, this.size);
      }
    }
  }
  // Método para controlar los límites del canvas y el rebote de la serpiente
  walls() {
    // Verifica y ajusta la posición de la serpiente si alcanza los límites del canvas
    let { x, y } = this.pos;
    if (x + cellSize > W) {
      this.pos.x = 0;
    }
    if (y + cellSize > W) {
      this.pos.y = 0;
    }
    if (y < 0) {
      this.pos.y = H - cellSize;
    }
    if (x < 0) {
      this.pos.x = W - cellSize;
    }
  }
  // Método para controlar el movimiento de la serpiente según las teclas de dirección presionadas
  controlls() {
    // Actualiza la dirección de la serpiente según las teclas presionadas
    let dir = this.size;
    if (KEY.ArrowUp) {
      this.dir = new helpers.Vec(0, -dir);
    }
    if (KEY.ArrowDown) {
      this.dir = new helpers.Vec(0, dir);
    }
    if (KEY.ArrowLeft) {
      this.dir = new helpers.Vec(-dir, 0);
    }
    if (KEY.ArrowRight) {
      this.dir = new helpers.Vec(dir, 0);
    }
  }
  // Método para detectar la colisión de la serpiente consigo misma
  selfCollision() {
    // Verifica si la cabeza de la serpiente colisiona con alguno de sus segmentos
    for (let i = 0; i < this.history.length; i++) {
      let p = this.history[i];
      if (helpers.isCollision(this.pos, p)) {
        isGameOver = true;
      }
    }
  }
  // Método para actualizar el estado de la serpiente en cada fotograma
  update() {
    // Actualiza la posición y dirección de la serpiente, y verifica colisiones
    this.walls();
    this.draw();
    this.controlls();
    if (!this.delay--) {
      if (helpers.isCollision(this.pos, food.pos)) {
        incrementScore();
        particleSplash();
        food.spawn();
        this.total++;
      }
      this.history[this.total - 1] = new helpers.Vec(this.pos.x, this.pos.y);
      for (let i = 0; i < this.total - 1; i++) {
        this.history[i] = this.history[i + 1];
      }
      this.pos.add(this.dir);
      this.delay = 5;
      this.total > 3 ? this.selfCollision() : null;
    }
  }
}

// Definición de la clase Food para representar la comida en el juego
class Food {
  constructor() {
     // Inicialización de la posición y color de la comida
    this.pos = new helpers.Vec(
      ~~(Math.random() * cells) * cellSize,
      ~~(Math.random() * cells) * cellSize
    );
    this.color = currentHue = `hsl(${~~(Math.random() * 360)},100%,50%)`;
    this.size = cellSize;
  }
  // Método para dibujar la comida en el canvas
  draw() {
    // Dibuja la comida en el canvas
    let { x, y } = this.pos;
    CTX.globalCompositeOperation = "lighter";
    CTX.shadowBlur = 20;
    CTX.shadowColor = this.color;
    CTX.fillStyle = this.color;
    CTX.fillRect(x, y, this.size, this.size);
    CTX.globalCompositeOperation = "source-over";
    CTX.shadowBlur = 0;
  }
  // Método para generar una nueva posición aleatoria para la comida
  spawn() {
     // Genera una nueva posición aleatoria para la comida
    let randX = ~~(Math.random() * cells) * this.size;
    let randY = ~~(Math.random() * cells) * this.size;
    for (let path of snake.history) {
      if (helpers.isCollision(new helpers.Vec(randX, randY), path)) {
        return this.spawn();
      }
    }
    this.color = currentHue = `hsl(${helpers.randHue()}, 100%, 50%)`;
    this.pos = new helpers.Vec(randX, randY);
  }
}

// Definición de la clase Particle para representar partículas de efecto visual
class Particle {
    // Inicialización de la posición, color, tamaño y velocidad de las partículas
  constructor(pos, color, size, vel) {
    this.pos = pos;
    this.color = color;
    this.size = Math.abs(size / 2);
    this.ttl = 0;
    this.gravity = -0.2;
    this.vel = vel;
  }
        // Método para dibujar las partículas en el canvas
  draw() {
    // Dibuja las partículas en el canvas
    let { x, y } = this.pos;
    let hsl = this.color
      .split("")
      .filter((l) => l.match(/[^hsl()$% ]/g))
      .join("")
      .split(",")
      .map((n) => +n);
    let [r, g, b] = helpers.hsl2rgb(hsl[0], hsl[1] / 100, hsl[2] / 100);
    CTX.shadowColor = `rgb(${r},${g},${b},${1})`;
    CTX.shadowBlur = 0;
    CTX.globalCompositeOperation = "lighter";
    CTX.fillStyle = `rgb(${r},${g},${b},${1})`;
    CTX.fillRect(x, y, this.size, this.size);
    CTX.globalCompositeOperation = "source-over";
  }
  // Método para actualizar el estado de las partículas en cada fotograma
  update() {
    // Actualiza el estado de las partículas en cada fotograma
    this.draw();
    this.size -= 0.3;
    this.ttl += 1;
    this.pos.add(this.vel);
    this.vel.y -= this.gravity;
  }
}

// Función para incrementar la puntuación del jugador
function incrementScore() {
    // Incrementa la puntuación y actualiza el marcador en la interfaz
  score++;
  dom_score.innerText = score.toString().padStart(2, "0");
}

// Función para generar un efecto visual al obtener la comida
function particleSplash() {
    // Genera partículas en la posición de la comida para crear un efecto visual
  for (let i = 0; i < splashingParticleCount; i++) {
    let vel = new helpers.Vec(Math.random() * 6 - 3, Math.random() * 6 - 3);
    let position = new helpers.Vec(food.pos.x, food.pos.y);
    particles.push(new Particle(position, currentHue, food.size, vel));
  }
}
// Función para borrar el canvas en cada fotograma
function clear() {
  CTX.clearRect(0, 0, W, H);
    // Limpia el canvas
}
// Función de inicialización del juego
function initialize() {
    // Configura el canvas y los controles de teclado, crea la serpiente y la comida, y comienza el bucle principal del juego
  CTX.imageSmoothingEnabled = false;
  KEY.listen();
  cellsCount = cells * cells;
  cellSize = W / cells;
  snake = new Snake();
  food = new Food();
  dom_replay.addEventListener("click", reset, false);
  loop();
}
// Función para ejecutar el bucle principal del juego
function loop() {
    // Limpia el canvas, actualiza los elementos del juego y dibuja en el canvas
  clear();
  if (!isGameOver) {
    requestID = setTimeout(loop, 1000 / 60);
    helpers.drawGrid();
    snake.update();
    food.draw();
    for (let p of particles) {
      p.update();
    }
    helpers.garbageCollector();
  } else {
    clear();
    gameOver();
  }
}
// Función para mostrar la pantalla de fin de juego
function gameOver() {
    // Muestra la puntuación final y la puntuación máxima alcanzada
  maxScore ? null : (maxScore = score);
  score > maxScore ? (maxScore = score) : null;
  window.localStorage.setItem("maxScore", maxScore);
  CTX.fillStyle = "#4cffd7";
  CTX.textAlign = "center";
  CTX.font = "bold 30px Poppins, sans-serif";
  CTX.fillText("GAME OVER", W / 2, H / 2);
  CTX.font = "15px Poppins, sans-serif";
  CTX.fillText(`SCORE   ${score}`, W / 2, H / 2 + 60);
  CTX.fillText(`MAXSCORE   ${maxScore}`, W / 2, H / 2 + 80);
}
// Función para reiniciar el juego
function reset() {
     // Reinicia el juego y comienza un nuevo juego
  dom_score.innerText = "00";
  score = "00";
  snake = new Snake();
  food.spawn();
  KEY.resetState();
  isGameOver = false;
  clearTimeout(requestID);
  loop();
}
// Inicializa el juego al cargar la página
initialize();