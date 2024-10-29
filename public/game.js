const socket = io();

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const mapWidth = canvas.width;
const mapHeight = canvas.height;

let players = {};
let bullets = [];

const respawnButton = document.getElementById('respawnButton');

socket.on('currentPlayers', (currentPlayers) => {
  players = currentPlayers;
  console.log('Current Players:', players); // Log dos jogadores atuais
});

socket.on('newPlayer', (data) => {
  players[data.playerId] = data.playerInfo;
  console.log('New Player:', data); // Log de novo jogador
});

socket.on('playerMoved', (data) => {
  if (players[data.playerId]) {
    players[data.playerId] = data.playerInfo;
    console.log('Player Moved:', data); // Log de movimento de jogador
  }
});

socket.on('disconnect', (playerId) => {
  delete players[playerId];
  console.log('Player Disconnected:', playerId); // Log de desconexão
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

let lastPosition = { x: 0, y: 0 }; // Armazena a última posição do jogador

function gameLoop() {
  if (players[socket.id]) { // Verifica se o jogador existe antes de movimentar
    // Atualiza a posição do jogador com base nas teclas pressionadas
    if (moveUp) {
      players[socket.id].y -= 5;
    }
    if (moveDown) {
      players[socket.id].y += 5;
    }
    if (moveLeft) {
      players[socket.id].x -= 5;
    }
    if (moveRight) {
      players[socket.id].x += 5;
    }

    // Limita o movimento dentro dos limites do mapa
    players[socket.id].x = Math.max(10, Math.min(players[socket.id].x, mapWidth - 10)); // Ajusta o limite
    players[socket.id].y = Math.max(10, Math.min(players[socket.id].y, mapHeight - 10)); // Ajusta o limite

    // Envia a nova posição para o servidor apenas se ela mudar
    if (players[socket.id].x !== lastPosition.x || players[socket.id].y !== lastPosition.y) {
      socket.emit('playerMovement', players[socket.id]);
      console.log('Player Movement Sent:', players[socket.id]); // Log de movimento enviado
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
