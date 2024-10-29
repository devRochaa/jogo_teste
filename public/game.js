const socket = io();

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const mapWidth = canvas.width;
const mapHeight = canvas.height;

let players = {};
let bullets = [];
const smoothing = 0.1; // Fator de suavização para a interpolação

const respawnButton = document.getElementById('respawnButton');

socket.on('currentPlayers', (currentPlayers) => {
  players = currentPlayers;
});

socket.on('newPlayer', (data) => {
  players[data.playerId] = { ...data.playerInfo, target: { ...data.playerInfo } };
});

socket.on('playerMoved', (data) => {
  if (players[data.playerId]) {
    players[data.playerId].target = { ...data.playerInfo }; // Atualiza a posição alvo
  }
});

socket.on('disconnect', (playerId) => {
  delete players[playerId];
});

socket.on('currentBullets', (currentBullets) => {
  bullets = currentBullets;
});

socket.on('newBullet', (bulletData) => {
  bullets.push(bulletData);
});

socket.on('bulletHit', (data) => {
  bullets.splice(data.bulletIndex, 1); // Remove a bala atingida
  if (players[data.playerId]) {
    players[data.playerId].health = data.health; // Atualiza a saúde do jogador atingido
  }
});

socket.on('playerDied', (playerId) => {
  if (playerId === socket.id) {
    setTimeout(() => {
      respawnButton.style.display = 'block';
    }, 3000); // Mostra o botão de renascer após 3 segundos
  }
  delete players[playerId]; // Remove o jogador morto
});

socket.on('updateBullets', (updatedBullets) => {
  bullets = updatedBullets;
});

let moveUp = false;
let moveDown = false;
let moveLeft = false;
let moveRight = false;

// Captura de teclas para movimentação
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

document.addEventListener('click', (event) => {
  if (players[socket.id]) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
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

respawnButton.addEventListener('click', () => {
  socket.emit('respawn');
  respawnButton.style.display = 'none';
});

// Função principal do jogo
function gameLoop() {
  if (players[socket.id]) { // Verifica se o jogador existe antes de movimentar
    const player = players[socket.id];

    // Movimentação local do jogador
    if (moveUp) {
      player.target.y -= 5;
    }
    if (moveDown) {
      player.target.y += 5;
    }
    if (moveLeft) {
      player.target.x -= 5;
    }
    if (moveRight) {
      player.target.x += 5;
    }

    // Limita o movimento dentro dos limites do mapa
    player.target.x = Math.max(10, Math.min(player.target.x, mapWidth - 10));
    player.target.y = Math.max(10, Math.min(player.target.y, mapHeight - 10));

    // Atualiza a posição do jogador com interpolação
    player.x += (player.target.x - player.x) * smoothing;
    player.y += (player.target.y - player.y) * smoothing;

    socket.emit('playerMovement', player); // Envia a posição atualizada para o servidor
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
  }

  // Atualiza e renderiza as balas
  bullets.forEach(bullet => {
    bullet.x += bullet.speed * Math.cos(bullet.angle);
    bullet.y += bullet.speed * Math.sin(bullet.angle);
    
    context.fillStyle = 'red';
    context.beginPath();
    context.arc(bullet.x, bullet.y, 5, 0, 2 * Math.PI);
    context.fill();
  });

  requestAnimationFrame(gameLoop);
}

gameLoop();
