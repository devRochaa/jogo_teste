const socket = io();

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const mapWidth = canvas.width;
const mapHeight = canvas.height;

let players = {};
let bullets = [];
const playerSpeed = 5;

const respawnButton = document.getElementById('respawnButton');

// Recebe a lista de jogadores atuais
socket.on('currentPlayers', (currentPlayers) => {
  players = currentPlayers;
});

// Recebe informações sobre um novo jogador
socket.on('newPlayer', (data) => {
  players[data.playerId] = data.playerInfo;
});

// Atualiza a posição do jogador quando recebe do servidor
socket.on('playerMoved', (data) => {
  if (data.playerId !== socket.id && players[data.playerId]) {
    players[data.playerId].x = data.playerInfo.x;
    players[data.playerId].y = data.playerInfo.y;
    players[data.playerId].health = data.playerInfo.health;
  }
});

// Remove um jogador desconectado
socket.on('disconnect', (playerId) => {
  delete players[playerId];
});

// Recebe a lista de balas atuais
socket.on('currentBullets', (currentBullets) => {
  bullets = currentBullets;
});

// Adiciona uma nova bala ao jogo
socket.on('newBullet', (bulletData) => {
  bullets.push(bulletData);
});

// Atualiza a saúde do jogador quando atingido
socket.on('bulletHit', (data) => {
  bullets.splice(data.bulletIndex, 1);
  if (players[data.playerId]) {
    players[data.playerId].health = data.health;
  }
});

// Remove um jogador que morreu
socket.on('playerDied', (playerId) => {
  if (playerId === socket.id) {
    setTimeout(() => {
      respawnButton.style.display = 'block';
    }, 3000);
  }
  delete players[playerId];
});

// Atualiza a lista de balas
socket.on('updateBullets', (updatedBullets) => {
  bullets = updatedBullets;
});

// Flags de movimento
let moveUp = false;
let moveDown = false;
let moveLeft = false;
let moveRight = false;
let lastPosition = { x: 0, y: 0 };
let mouseX = 0;
let mouseY = 0;

// Controla as teclas pressionadas
document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'w':
      moveUp = true;
      break;
    case 'a':
      moveLeft = true;
      break;
    case 's':
      moveDown = true;
      break;
    case 'd':
      moveRight = true;
      break;
  }
});

// Controla as teclas soltas
document.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'w':
      moveUp = false;
      break;
    case 'a':
      moveLeft = false;
      break;
    case 's':
      moveDown = false;
      break;
    case 'd':
      moveRight = false;
      break;
  }
});

// Atualiza a posição do mouse
document.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = event.clientX - rect.left;
  mouseY = event.clientY - rect.top;
});

// Atira uma bala quando o mouse é clicado
document.addEventListener('click', (event) => {
  if (players[socket.id]) {
    const angle = Math.atan2(mouseY - players[socket.id].y, mouseX - players[socket.id].x);
    const bullet = {
      x: players[socket.id].x,
      y: players[socket.id].y,
      angle: angle,
      speed: 10,
      ownerId: socket.id
    };
    bullets.push(bullet);
    socket.emit('shootBullet', bullet);
  }
});

// Renasce o jogador
respawnButton.addEventListener('click', () => {
  socket.emit('respawn');
  respawnButton.style.display = 'none';
});

// Desenha a seta que aponta para a posição do mouse
function drawPointer(context, player) {
  const arrowLength = 15; // Comprimento da seta
  const headLength = 5; // Comprimento da cabeça da seta
  const angle = Math.atan2(mouseY - player.y, mouseX - player.x);

  // Ponto inicial da seta
  const fromX = player.x;
  const fromY = player.y;

  // Ponto final da seta
  const toX = fromX + arrowLength * Math.cos(angle);
  const toY = fromY + arrowLength * Math.sin(angle);

  // Desenha a linha da seta
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.strokeStyle = 'blue'; // Cor da seta
  context.lineWidth = 2; // Espessura da linha
  context.stroke();

  // Cabeça da seta
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
  context.moveTo(toX, toY);
  context.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
  context.stroke();
}

// Loop principal do jogo
function gameLoop() {
  if (players[socket.id]) {
    let moved = false;

    // Atualiza a posição do jogador
    if (moveUp) {
      players[socket.id].y -= playerSpeed;
      moved = true;
    }
    if (moveDown) {
      players[socket.id].y += playerSpeed;
      moved = true;
    }
    if (moveLeft) {
      players[socket.id].x -= playerSpeed;
      moved = true;
    }
    if (moveRight) {
      players[socket.id].x += playerSpeed;
      moved = true;
    }

    // Limita o movimento dentro dos limites do mapa
    players[socket.id].x = Math.max(10, Math.min(players[socket.id].x, mapWidth - 10));
    players[socket.id].y = Math.max(10, Math.min(players[socket.id].y, mapHeight - 10));

    // Envia a nova posição para o servidor apenas se o jogador se moveu
    if (moved && (players[socket.id].x !== lastPosition.x || players[socket.id].y !== lastPosition.y)) {
      socket.emit('playerMovement', { 
        x: players[socket.id].x, 
        y: players[socket.id].y, 
        health: players[socket.id].health 
      });
      lastPosition = { x: players[socket.id].x, y: players[socket.id].y }; 
    }
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  // Renderiza os jogadores
  for (let id in players) {
    const player = players[id];
    context.fillStyle = 'black';
    context.beginPath();
    context.arc(player.x, player.y, 10, 0, 2 * Math.PI);
    context.fill();
    context.fillStyle = 'red';
    context.fillText(player.health, player.x - 10, player.y - 15); // Renderiza a saúde acima do jogador

    // Desenha a seta de direção apenas para o jogador controlado
    if (id === socket.id) {
      drawPointer(context, player);
    }
  }

  // Renderiza as balas
  bullets.forEach(bullet => {
    context.fillStyle = 'red';
    context.beginPath();
    context.arc(bullet.x, bullet.y, 5, 0, 2 * Math.PI);
    context.fill();

    // Atualiza a posição da bala em tempo real
    bullet.x += bullet.speed * Math.cos(bullet.angle);
    bullet.y += bullet.speed * Math.sin(bullet.angle);
  });

  requestAnimationFrame(gameLoop);
}

gameLoop();
