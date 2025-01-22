import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Server } from "socket.io";

dotenv.config();
const PORT = process.env.PORT;

// SERVER SETTINGS
const server = express();
server.enable("trust proxy");
const soc = server.listen(PORT, () => {
  console.log("Running on port " + PORT + " ...");
});
server.use(
  cors({
    origin: ["*"],
    methods: ["POST", "GET", "PUT", "DELETE", "HEAD", "PATCH"],
    credentials: true,
  })
);
server.use(
  bodyParser.json({
    limit: "50mb",
  })
);
server.use(
  bodyParser.urlencoded({
    limit: "50mb",
    parameterLimit: 1000000,
    extended: true,
  })
);
server.use(express.json());

server.get("/", (_, res) =>
  res.status(200).json("pew pew ( う-´)づ︻╦̵̵̿╤── (˚☐˚”)/")
);

// SOCKET SERVER
const rooms = new Map();

export const io = new Server(soc, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("JOIN_ROOM", (payload) => {
    socket.join(payload.playerId);

    let available = findRoomByPlayerId(payload.playerId);

    if (!available) {
      available = payload.friendly ? null : findAvailableRoom(payload.matchId);

      if (available) {
        available.playerB = payload.playerId;
        available.isFull = true;
        rooms.set(available.id, available);
      } else {
        const data = {
          id: payload.playerId,
          playerA: payload.playerId,
          playerB: "",
          isFull: false,
        };

        rooms.set(payload.playerId, data);
        available = data;
      }
    }

    if (available.isFull) {
      io.to([available.playerA, available.playerB]).emit(
        "MATCH_FOUND",
        available
      );
    }
  });

  socket.on("LEAVE_ROOM", (id) => {
    let match = findRoomByPlayerId(id);
    if (match) {
      io.to([match.playerA, match.playerB]).emit("OPPONENT_DISCONNECTED");
      rooms.delete(match.id);
    }
  });

  socket.on("KEY_HELD", (token) => {
    const [id, direction] = token.split("|");
    let match = findRoomByPlayerId(id);
    if (match) {
      io.to([match.playerA, match.playerB]).emit("KEY_HELD", {
        playerId: id,
        direction: direction,
      });
    }
  });
});

const findAvailableRoom = (matchId) => {
  for (const [_, data] of rooms.entries()) {
    if (matchId) {
      if (data.playerA === matchId) {
        return data;
      }
    } else if (!data.isFull) {
      return data;
    }
  }
  return null;
};

const findRoomByPlayerId = (id) => {
  for (const [_, data] of rooms.entries()) {
    if (data.playerA === id || data.playerB === id) {
      return data;
    }
  }
  return null;
};
