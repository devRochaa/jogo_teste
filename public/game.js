function gameLoop() {
  if (players[socket.id]) {
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

    // Envia a nova posição para o servidor
    socket.emit('playerMovement', players[socket.id]);
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
