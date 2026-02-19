// server.js
// Socket.IO signalling server that:
// - accepts 'join' events
// - emits 'joined' to the joining client with count
// - emits 'new-peer' to existing peers
// - relays 'signal' events (offer/answer/candidates)
// - serves a small HTTP landing page

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 8080;
const app = express();

app.get('/', (req, res) => {
  res.type('text').send('Socket.IO signalling server is running.');
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const rooms = {}; // { roomId: [socketId, ...] }

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (payload) => {
    try {
      const roomId = payload?.roomId;
      if (!roomId) return;

      if (!rooms[roomId]) rooms[roomId] = [];

      const peers = rooms[roomId];
      const joiningCount = peers.length + 1;

      // Add socket to room (server-side tracking)
      rooms[roomId].push(socket.id);
      socket.join(roomId);
      socket.roomId = roomId;

      // Send joined info to the joining client
      socket.emit('joined', { roomId, count: joiningCount });
      console.log(`Socket ${socket.id} joined ${roomId} (count=${joiningCount})`);

      // Notify existing peers that a new peer joined
      socket.to(roomId).emit('new-peer', { roomId, newPeerId: socket.id });
    } catch (e) {
      console.error('join handler error', e);
    }
  });

  socket.on('signal', (payload) => {
    try {
      const roomId = payload?.roomId;
      if (!roomId) return;
      // Relay the signal to all other sockets in the room
      socket.to(roomId).emit('signal', payload);
    } catch (e) {
      console.error('signal handler error', e);
    }
  });

  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    console.log('Client disconnected:', socket.id);
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((id) => id !== socket.id);
      socket.to(roomId).emit('peer-left', { roomId, peerId: socket.id });
      if (rooms[roomId].length === 0) delete rooms[roomId];
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
});
