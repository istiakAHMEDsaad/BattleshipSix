import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config({ quiet: true, path: ".env" });

const app = express();
app.use(cors());
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

const io = new Server(server, {
  cors: {
    origin: process.env.URI,
    methods: ["GET", "POST"],
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // custom room
  socket.on("create-room", ({ playerName, gridSize }) => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();

    const expirationTimer = setTimeout(() => {
      if (rooms[roomCode]) {
        io.to(roomCode).emit("room-expired");
        delete rooms[roomCode];
        console.log(`Room ${roomCode} expired.`);
      }
    }, 3600000);

    // grid size
    rooms[roomCode] = {
      players: [{ id: socket.id, name: playerName }],
      gridSize: gridSize,
      status: "waiting",
      timer: expirationTimer,
    };

    socket.join(roomCode);
    socket.emit("room-created", { roomCode, gridSize });
    console.log(`${playerName} created room: ${roomCode}`);
  });

  // existing room
  socket.on("join-room", ({ roomCode, playerName }) => {
    const room = rooms[roomCode];

    if (!room) {
      return socket.emit("error", "Room does not exist or has expired.");
    }
    if (room.players.length >= 2) {
      return socket.emit("error", "Room is currently full.");
    }

    // name
    let finalName = playerName;
    if (room.players[0].name.toLowerCase() === playerName.toLowerCase()) {
      finalName = `${playerName} 2`;
    }

    room.players.push({ id: socket.id, name: finalName });
    socket.join(roomCode);
    room.status = "playing";

    io.to(roomCode).emit("game-start", {
      players: room.players,
      gridSize: room.gridSize,
    });
    console.log(`${finalName} joined room: ${roomCode}`);
  });

  socket.on("fire", ({ roomCode, id }) => {
    socket.to(roomCode).emit("fire", id);
  });

  socket.on("fire-reply", (data) => {
    socket.to(data.roomCode).emit("fire-reply", data);
  });

  socket.on("player-ready", ({ roomCode }) => {
    socket.to(roomCode).emit("enemy-ready");
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const [roomCode, room] of Object.entries(rooms)) {
      const playerIndex = room.players.findIndex((p) => p.id === socket.id);

      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);

        socket.to(roomCode).emit("player-disconnected");

        if (room.players.length === 0) {
          clearTimeout(room.timer);
          delete rooms[roomCode];
          console.log(`Room ${roomCode} deleted (empty).`);
        }
        break;
      }
    }
  });
});

// server.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });
