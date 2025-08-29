const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Assign roles
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
    console.log(`Assigned white to ${socket.id}`);
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
    console.log(`Assigned black to ${socket.id}`);
  } else {
    socket.emit("spectatorRole");
    console.log(`Assigned spectator to ${socket.id}`);
  }

  // On disconnection
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
    if (players.white === socket.id) {
      delete players.white;
    } else if (players.black === socket.id) {
      delete players.black;
    }
  });

  // Handle move
  socket.on("move", (move) => {
    try {
      // Basic turn-based validation
      const turn = chess.turn();
      if ((turn === "w" && socket.id !== players.white) ||
          (turn === "b" && socket.id !== players.black)) {
        return;
      }

      // Expect move format: { from: 'e2', to: 'e4', promotion: 'q' }
      const result = chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q", // default to queen
      });

      if (result) {
        io.emit("move", result); // broadcast actual move result
        io.emit("boardState", chess.fen()); // update board for all clients
        console.log(`Move played: ${result.san}`);
      } else {
        socket.emit("invalidMove", move);
        console.log("Rejected invalid move:", move);
      }
    } catch (err) {
      console.error("Error handling move:", err.message);
      socket.emit("invalidMove", move);
    }
  });
});

const PORT=process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log("Server listening on port 3000");
});
