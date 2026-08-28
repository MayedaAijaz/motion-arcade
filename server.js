const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// roomCode -> { game, displaySocketId, players: [socketId, socketId] }
const rooms = {};

function makeRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms[code]);
  return code;
}

io.on('connection', (socket) => {
  // Display (the laptop/TV) creates a room for a chosen game
  socket.on('create-room', ({ game }) => {
    const code = makeRoomCode();
    rooms[code] = { game, displaySocketId: socket.id, players: [] };
    socket.join(code);
    socket.data.role = 'display';
    socket.data.code = code;
    socket.emit('room-created', { code, game });
  });

  // Phone controller joins an existing room by code
  socket.on('join-room', ({ code }) => {
    code = (code || '').toUpperCase().trim();
    const room = rooms[code];
    if (!room) {
      socket.emit('join-error', { message: 'Room not found. Check the code on the big screen.' });
      return;
    }
    if (room.players.length >= 2) {
      socket.emit('join-error', { message: 'This room already has 2 players.' });
      return;
    }
    const playerIndex = room.players.length;
    room.players.push(socket.id);
    socket.join(code);
    socket.data.role = 'controller';
    socket.data.code = code;
    socket.data.playerIndex = playerIndex;

    socket.emit('joined', { playerIndex, game: room.game });
    io.to(room.displaySocketId).emit('player-joined', { playerIndex, count: room.players.length });
  });

  // Controller sends sensor data / gestures -> relay to the display only
  socket.on('controller-input', ({ type, payload }) => {
    const code = socket.data.code;
    const playerIndex = socket.data.playerIndex;
    const room = rooms[code];
    if (!room || playerIndex === undefined) return;
    io.to(room.displaySocketId).emit('input', { playerIndex, type, payload });
  });

  // Display can restart / change state and controllers may want to know (e.g. rumble/flash)
  socket.on('display-event', ({ event, payload }) => {
    const code = socket.data.code;
    if (!code) return;
    socket.to(code).emit('display-event', { event, payload });
  });

  socket.on('disconnect', () => {
    const code = socket.data.code;
    if (!code || !rooms[code]) return;
    const room = rooms[code];

    if (socket.data.role === 'display') {
      io.to(code).emit('display-closed');
      delete rooms[code];
    } else if (socket.data.role === 'controller') {
      room.players = room.players.filter((id) => id !== socket.id);
      io.to(room.displaySocketId).emit('player-left', { playerIndex: socket.data.playerIndex });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Motion Arcade running: http://localhost:${PORT}`);
});
