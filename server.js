// server.js
// Simple WebSocket signalling server using `ws`
// - sends `joined` to the joining client with current count
// - notifies existing peers with `new-peer`
// - relays `signal` messages (offer/answer/candidates)
// - exposes a small HTTP landing page so visiting the URL doesn't return "Upgrade Required"

const http = require("http");
const WebSocket = require("ws");

const PORT = process.env.PORT || 8080;

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("WebSocket signalling server is running.\n");
});

const wss = new WebSocket.Server({ server });

const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    let data;
    try {
      data = JSON.parse(message);
    } catch (e) {
      console.error("Invalid JSON:", message);
      return;
    }

    const { type, roomId } = data;

    if (type === "join") {
      if (!roomId) return;

      if (!rooms[roomId]) rooms[roomId] = [];

      const peers = rooms[roomId];
      const joiningClientCount = peers.length + 1;

      // Inform the joining client how many peers are in the room now
      ws.send(JSON.stringify({ type: "joined", roomId, count: joiningClientCount }));

      // Notify existing peers that a new peer joined
      peers.forEach((peer) => {
        if (peer.readyState === WebSocket.OPEN) {
          peer.send(JSON.stringify({ type: "new-peer", roomId }));
        }
      });

      // Add the new client to the room
      rooms[roomId].push(ws);
      ws.roomId = roomId;

      console.log(`User joined room ${roomId}, count=${joiningClientCount}`);
      return;
    }

    if (type === "signal") {
      // Relay signalling messages to all peers in the room
      if (!roomId) return;
      const peers = rooms[roomId] || [];
      peers.forEach((peer) => {
        if (peer !== ws && peer.readyState === WebSocket.OPEN) {
          peer.send(JSON.stringify(data));
        }
      });
      return;
    }
  });

  ws.on("close", () => {
    const roomId = ws.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((client) => client !== ws);
      console.log(`User left room ${roomId}, remaining=${rooms[roomId].length}`);
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
