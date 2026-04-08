const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const roleEl = document.getElementById("role");
const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restartBtn");

const socket = new WebSocket(`ws://${location.host}`);

let myRole = null;
let gameState = null;

const keys = {
  up: false,
  down: false
};

function canPlay() {
  return (
    socket.readyState === WebSocket.OPEN &&
    gameState &&
    gameState.running &&
    !gameState.gameOver
  );
}

function sendInput() {
  if (!canPlay()) return;

  socket.send(JSON.stringify({
    type: "input",
    up: keys.up,
    down: keys.down
  }));
}

window.addEventListener("keydown", (e) => {
  if (myRole === "left") {
    if (e.key === "w" || e.key === "W") keys.up = true;
    if (e.key === "s" || e.key === "S") keys.down = true;
  }

  if (myRole === "right") {
    if (e.key === "ArrowUp") keys.up = true;
    if (e.key === "ArrowDown") keys.down = true;
  }

  if (["ArrowUp", "ArrowDown", " "].includes(e.key)) e.preventDefault();
  sendInput();
});

window.addEventListener("keyup", (e) => {
  if (myRole === "left") {
    if (e.key === "w" || e.key === "W") keys.up = false;
    if (e.key === "s" || e.key === "S") keys.down = false;
  }

  if (myRole === "right") {
    if (e.key === "ArrowUp") keys.up = false;
    if (e.key === "ArrowDown") keys.down = false;
  }

  sendInput();
});

restartBtn.addEventListener("click", () => {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ type: "restart" }));
});

socket.addEventListener("open", () => {
  statusEl.textContent = "Conectado ao servidor.";
});

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "init") {
    myRole = data.role;
    roleEl.textContent = myRole === "left" ? "esquerda" : "direita";
    statusEl.textContent = "Aguardando outro jogador...";
  }

  if (data.type === "info") {
    statusEl.textContent = data.message;
  }

  if (data.type === "full") {
    statusEl.textContent = "Sala cheia. Este servidor aceita só 2 jogadores.";
  }

  if (data.type === "state") {
    gameState = data.state;
    scoreEl.textContent = `${gameState.score.left} x ${gameState.score.right}`;

    if (gameState.gameOver) {
      statusEl.textContent = `Fim de jogo. Vencedor: ${gameState.winner}.`;
    } else if (!gameState.running) {
      if (gameState.playersConnected < 2) {
        statusEl.textContent = "Aguardando 2 jogadores para iniciar.";
      } else {
        statusEl.textContent = "Partida pausada.";
      }
    } else {
      statusEl.textContent = "Partida em andamento.";
    }
  }
});

socket.addEventListener("close", () => {
  statusEl.textContent = "Conexão encerrada.";
});

function drawCenterLine() {
  ctx.strokeStyle = "#334155";
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawText(text, x, y, color = "#94a3b8", size = 18) {
  ctx.fillStyle = color;
  ctx.font = `${size}px Arial`;
  ctx.fillText(text, x, y);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCenterLine();

  if (!gameState) {
    drawText("Esperando estado do servidor...", 250, 220);
    requestAnimationFrame(render);
    return;
  }

  const left = gameState.paddles.left;
  const right = gameState.paddles.right;
  const ball = gameState.ball;

  drawRect(left.x, left.y, left.w, left.h, "#22d3ee");
  drawRect(right.x, right.y, right.w, right.h, "#f59e0b");
  drawRect(ball.x, ball.y, ball.w, ball.h, "#e5e7eb");

  if (gameState.gameOver) {
    drawText(`Vencedor: ${gameState.winner}`, 320, 40, "#f8fafc", 24);
  } else if (!gameState.running) {
    drawText("Aguardando jogadores...", 290, 40, "#f8fafc", 24);
  }

  requestAnimationFrame(render);
}

render();