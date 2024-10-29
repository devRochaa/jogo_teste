const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve arquivos estáticos da pasta 'public'
app.use(express.static('public'));

const players = {};
let bullets = [];
const bulletSpeed = 10;
const bulletLifetime = 100; // Número de frames que a bala dura
const playerRadius = 10;
const bulletRadius = 5;

const mapWidth = 800;  // Largura do mapa
const mapHeight = 600; // Altura do mapa

io.on('connection', (socket) => {
  console.log(`Novo jogador conectado: ${socket.id}`);

  // Adiciona novo jogador
  function addNewPlayer() {
    players[socket.id] = {
      x: Math.random() * mapWidth,
      y: Math.random() * mapHeight,
      angle: 0,
      health: 100
    };
  }

  addNewPlayer();

  // Envia os jogadores e balas atuais para o novo jogador
  socket.emit('currentPlayers', players);
  socket.emit('currentBullets', bullets);
  
  // Informa aos outros jogadores sobre o novo jogador
  socket.broadcast.emit('newPlayer', { playerId: socket.id, playerInfo: players[socket.id] });

  // Movimento do jogador
  socket.on('playerMovement', (movementData) => {
    if (players[socket.id]) { // Verifica se o jogador ainda existe
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      players[socket.id].angle = movementData.angle; // Mantenha o ângulo se necessário
      io.emit('playerMoved', { playerId: socket.id, playerInfo: players[socket.id] });
    }
  });

  // Disparo de projétil
  socket.on('shootBullet', (bulletData) => {
    bullets.push({
      ...bulletData,
      ownerId: socket.id,
      lifetime: bulletLifetime
    });
    io.emit('newBullet', bulletData);
  });

  // Desconectar
  socket.on('disconnect', () => {
    console.log(`Jogador desconectado: ${socket.id}`);
    delete players[socket.id];
    io.emit('disconnect', socket.id);
  });

  // Renascer jogador
  socket.on('respawn', () => {
    addNewPlayer();
    io.emit('newPlayer', { playerId: socket.id, playerInfo: players[socket.id] });
  });
});

// Função principal do jogo
function gameLoop() {
  // Atualiza a posição das balas
  bullets.forEach(bullet => {
    bullet.x += bulletSpeed * Math.cos(bullet.angle);
    bullet.y += bulletSpeed * Math.sin(bullet.angle);
    bullet.lifetime--;
  });

  // Verifica colisões entre balas e jogadores
  bullets.forEach((bullet, bulletIndex) => {
    for (let playerId in players) {
      if (bullet.ownerId === playerId) continue; // Ignora colisão com o jogador que disparou

      const player = players[playerId];
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < playerRadius + bulletRadius) {
        player.health -= 20; // Reduz a saúde do jogador atingido
        bullets.splice(bulletIndex, 1); // Remove a bala após a colisão
        io.emit('bulletHit', { bulletIndex, playerId, health: player.health });

        if (player.health <= 0) {
          io.emit('playerDied', playerId);
          delete players[playerId];
        }

        break; // Saia do loop assim que a colisão for detectada
      }
    }
  });

  // Remove balas que estão fora da tela ou atingiram o tempo de vida
  bullets = bullets.filter(bullet =>
    bullet.x >= 0 && bullet.x <= mapWidth &&
    bullet.y >= 0 && bullet.y <= mapHeight &&
    bullet.lifetime > 0
  );

  // Atualiza a lista de balas no cliente
  io.emit('updateBullets', bullets);
}

// Configura o loop do jogo para rodar a 60 FPS
setInterval(gameLoop, 1000 / 60); 

// Usa a variável de ambiente PORT se estiver disponível, caso contrário, usa 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor ouvindo na porta ${PORT}`);
});
