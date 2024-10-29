const socket = io();

const canvas = document.getElementById('gameCanvas');
const context = canvas.getContext('2d');
const mapWidth = canvas.width;
const mapHeight = canvas.height;

let players = {};
let bullets = [];

const respawnButton = document.getElementById('respawnButton');

// Recebe a lista atual de jogadores
socket.on('currentPlayers', (currentPlayers) => {
  players = currentPlayers;
});

// Adiciona um novo jogador
socket.on('newPlayer', (data) => {
  players[data.playerId] = data.playerInfo;
});

// Atualiza a posição de um jogador
socket.on('playerMoved', (data) => {
  if (players[data.playerId]) {
    players[data.playerId] = data.playerInfo;
  }
});

// Remove um jogador desconectado
socket.on('disconnect', (playerId) => {
  delete players[playerId];
});

// Recebe a lista atual de balas
socket.on('currentBullets', (currentBullets) => {
  bullets = currentBullets;
});

// Adiciona uma nova bala
socket.on('newBullet', (bulletData) => {
  bullets.push(bulletData);
});

// Atualiza a saúde de um jogador atingido
socket.on('bulletHit', (data) => {
  bullets.splice(data.bulletIndex, 1); // Remove a bala atingida
  if (players[data.playerId]) {
    players[data.playerId].health = data.health; // Atualiza a saúde do jogador atingido
  }
});

// Remove um jogador que morreu
socket.on('playerDied', (playerId) => {
  if (playerId === socket.id) {
    setTimeout(() => {
      respawnButton.style.display = 'block';
    }, 3000); // Mostra o botão de renascer após 3 segundos
  }
  delete players[playerId]; // Remove o jogador morto
});

// Atualiza a lista de balas
socket.on('updateBullets', (updatedBullets) => {
  bullets = updatedBullets;
});

let moveUp
