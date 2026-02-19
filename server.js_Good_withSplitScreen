const WebSocket = require("ws");

const wss = new WebSocket.Server({ host: "0.0.0.0", port: 8080 });

const rooms = {};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    const { type, roomId } = data;

    if (type === "join") {
      if (!rooms[roomId]) {
        rooms[roomId] = [];
      }

      rooms[roomId].push(ws);
      ws.roomId = roomId;

      console.log(`User joined room ${roomId}`);
    }

    if (type === "signal") {
      const peers = rooms[roomId] || [];

      peers.forEach((peer) => {
        if (peer !== ws && peer.readyState === WebSocket.OPEN) {
          peer.send(JSON.stringify(data));
        }
      });
    }
  });

  ws.on("close", () => {
    const roomId = ws.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((client) => client !== ws);
    }
  });
});

console.log("Signaling server running on ws://localhost:8080");
