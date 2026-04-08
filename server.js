const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;
const WIDTH = 800;
const HEIGHT = 450;
const WIN_SCORE = 5;

const players = new Map();

const state = {
  width: WIDTH,
  height: HEIGHT,
  score: { left: 0, right: 0 },
  paddles: {
    left: { x: 20, y: 175, w: 14, h: 100, speed: 320 },
    right: { x: WIDTH - 34, y: 175, w: 14, h: 100, speed: 320 }
  },
  ball: {
    x: WIDTH / 2 - 8,
    y: HEIGHT / 2 - 8,
    w: 16,
    h: 16,
    vx: 260,
    vy: 170
  },
  gameOver: false,
  winner: null,
  seq: 0,
  running: false,
  playersConnected: 0
};

const inputs = {
  left: { up: false, down: false },
  right: { up: false, down: false }
};

function resetInputs() {
  inputs.left.up = false;
  inputs.left.down = false;
  inputs.right.up = false;
  inputs.right.down = false;
}

function resetBall(direction = 1) {
  state.ball.x = WIDTH / 2 - 8;
  state.ball.y = HEIGHT / 2 - 8;
  state.ball.vx = 260 * direction;
  state.ball.vy = (Math.random() > 0.5 ? 1 : -1) * (140 + Math.random() * 80);
}

function resetMatch() {
  state.score.left = 0;
  state.score.right = 0;
  state.paddles.left.y = 175;
  state.paddles.right.y = 175;
  state.gameOver = false;
  state.winner = null;
  resetInputs();
  resetBall(Math.random() > 0.5 ? 1 : -1);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function updatePaddles(dt) {
  if (inputs.left.up) state.paddles.left.y -= state.paddles.left.speed * dt;
  if (inputs.left.down) state.paddles.left.y += state.paddles.left.speed * dt;
  if (inputs.right.up) state.paddles.right.y -= state.paddles.right.speed * dt;
  if (inputs.right.down) state.paddles.right.y += state.paddles.right.speed * dt;

  state.paddles.left.y = clamp(state.paddles.left.y, 0, HEIGHT - state.paddles.left.h);
  state.paddles.right.y = clamp(state.paddles.right.y, 0, HEIGHT - state.paddles.right.h);
}

function updateBall(dt) {
  const ball = state.ball;
  const left = state.paddles.left;
  const right = state.paddles.right;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy *= -1;
  }

  if (ball.y + ball.h >= HEIGHT) {
    ball.y = HEIGHT - ball.h;
    ball.vy *= -1;
  }

  if (rectsOverlap(ball, left) && ball.vx < 0) {
    ball.x = left.x + left.w;
    ball.vx *= -1.04;
    const offset = (ball.y + ball.h / 2) - (left.y + left.h / 2);
    ball.vy = offset * 5;
  }

  if (rectsOverlap(ball, right) && ball.vx > 0) {
    ball.x = right.x - ball.w;
    ball.vx *= -1.04;
    const offset = (ball.y + ball.h / 2) - (right.y + right.h / 2);
    ball.vy = offset * 5;
  }

  if (ball.x + ball.w < 0) {
    state.score.right += 1;
    if (state.score.right >= WIN_SCORE) {
      state.gameOver = true;
      state.running = false;
      state.winner = "Direita";
    } else {
      resetBall(1);
    }
  }

  if (ball.x > WIDTH) {
    state.score.left += 1;
    if (state.score.left >= WIN_SCORE) {
      state.gameOver = true;
      state.running = false;
      state.winner = "Esquerda";
    } else {
      resetBall(-1);
    }
  }
}

function syncMeta() {
  state.playersConnected = players.size;
}

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const ws of players.keys()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function maybeStartGame() {
  syncMeta();

  if (players.size === 2) {
    resetMatch();
    state.running = true;
    broadcast({
      type: "info",
      message: "Dois jogadores conectados. Partida iniciada."
    });
  } else {
    state.running = false;
    resetInputs();
  }
}

wss.on("connection", (ws) => {
  let role = null;

  if (![...players.values()].includes("left")) {
    role = "left";
  } else if (![...players.values()].includes("right")) {
    role = "right";
  } else {
    ws.send(JSON.stringify({ type: "full" }));
    ws.close();
    return;
  }

  players.set(ws, role);
  syncMeta();

  ws.send(JSON.stringify({
    type: "init",
    role,
    width: WIDTH,
    height: HEIGHT
  }));

  broadcast({
    type: "info",
    message: `Jogador ${role} conectado`
  });

  maybeStartGame();

  ws.on("message", (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === "input" && state.running && (role === "left" || role === "right")) {
        inputs[role].up = !!data.up;
        inputs[role].down = !!data.down;
      }

      if (data.type === "restart" && players.size === 2) {
        resetMatch();
        state.running = true;
        broadcast({
          type: "info",
          message: "Partida reiniciada."
        });
      }
    } catch (e) {}
  });

  ws.on("close", () => {
    if (role) {
      inputs[role].up = false;
      inputs[role].down = false;
    }

    players.delete(ws);
    syncMeta();
    state.running = false;
    resetInputs();

    broadcast({
      type: "info",
      message: `Jogador ${role} desconectado`
    });
  });
});

let last = Date.now();

setInterval(() => {
  const now = Date.now();
  const dt = Math.min((now - last) / 1000, 0.03);
  last = now;

  if (state.running && !state.gameOver) {
    updatePaddles(dt);
    updateBall(dt);
  }

  state.seq += 1;
  syncMeta();

  broadcast({
    type: "state",
    state
  });
}, 1000 / 60);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor em http://localhost:${PORT}`);
  resetMatch();
  syncMeta();
});