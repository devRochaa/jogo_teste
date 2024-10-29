const socket = io();

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const mapWidth = canvas.width;
const mapHeight = canvas.height;

let players = {};
let bullets = [];
const playerSpeed = 5;

const respawnButton = document.getElementById('respawnButton');

socket.on('currentPlayers', (currentPlayers) => {
  players = currentPlayers;
});

socket.on('newPlayer', (data) => {
  players[data.playerId] = data.playerInfo;
});

socket.on('playerMoved', (data) => {
  if (players[data.playerId]) {
    players[data.playerId].x = data.playerInfo.x;
    players[data.playerId].y = data.playerInfo.y;
    players[data.playerId].health = data.playerInfo.health;
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
  bullets.splice(data.bulletIndex, 1);
  if (players[data.playerId]) {
    players[data.playerId].health = data.health;
  }
});

socket.on('playerDied', (playerId) => {
  if (playerId === socket.id) {
    setTimeout(() => {
      respawnButton.style.display = 'block';
    }, 3000);
  }
  delete players[playerId];
});

socket.on('updateBullets', (updatedBullets) => {
  bullets = updatedBullets;
});

let moveUp = false;
let moveDown = false;
let moveLeft = false;
let moveRight = false;
let lastPosition = { x: 0, y: 0 };

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

function gameLoop() {
  if (players[socket.id]) {
    let moved = false; // Flag para verificar se o jogador se moveu

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
      socket.emit('playerMovement', players[socket.id]);
      lastPosition = { x: players[socket.id].x, y: players[socket.id].y }; // Atualiza a última posição
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
  }

  // Renderiza as balas
  bullets.forEach(bullet => {
    context.fillStyle = 'red';
    context.beginPath();
    context.arc(bullet.x, bullet.y, 5, 0, 2 * Math.PI);
    context.fill();
  });

  requestAnimationFrame(gameLoop);
}

gameLoop();
