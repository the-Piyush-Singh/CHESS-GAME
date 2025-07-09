const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let isFlipped = false;

const getPieceUnicode = (piece) => {
  const pieces = {
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔",
  };
  if (!piece) return "";
  const symbol = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
  return pieces[symbol] || "";
};

const renderBoard = () => {
  if (!playerRole) return;

  const board = chess.board();
  boardElement.innerHTML = "";

  const rows = isFlipped ? [...board].reverse() : board;

  rows.forEach((row, rowIndex) => {
    const actualRow = isFlipped ? 7 - rowIndex : rowIndex;
    const cols = isFlipped ? [...row].reverse() : row;

    cols.forEach((square, colIndex) => {
      const actualCol = isFlipped ? 7 - colIndex : colIndex;

      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (actualRow + actualCol) % 2 === 0 ? "light" : "dark"
      );
      squareElement.dataset.row = actualRow;
      squareElement.dataset.col = actualCol;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );
        pieceElement.innerText = getPieceUnicode(square);

        // ✅ Only allow dragging your own color
        pieceElement.draggable = square.color === playerRole?.toLowerCase();

        pieceElement.addEventListener("dragstart", (e) => {
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: actualRow, col: actualCol };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => e.preventDefault());

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (draggedPiece) {
          const targetSquare = {
            row: parseInt(squareElement.dataset.row),
            col: parseInt(squareElement.dataset.col),
          };
          handleMove(sourceSquare, targetSquare);
        }
      });

      boardElement.appendChild(squareElement);
    });
  });
};

const handleMove = (source, target) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const sourceSquare = files[source.col] + (8 - source.row);
  const targetSquare = files[target.col] + (8 - target.row);

  const move = chess.move({
    from: sourceSquare,
    to: targetSquare,
    promotion: "q" // always promote to queen
  });

  if (move) {
    socket.emit("move", {
      from: sourceSquare,
      to: targetSquare,
      promotion: "q"
    });
    renderBoard();
  } else {
    console.log("Illegal move");
  }
};

// Socket.IO Events

socket.on("playerRole", (role) => {
  playerRole = role.toLowerCase();
  isFlipped = playerRole === "b";
  console.log("You are:", role === "w" ? "White" : "Black");
  renderBoard();
});

socket.on("spectatorRole", () => {
  playerRole = null;
  console.log("You are a spectator");
  renderBoard();
});

socket.on("move", (move) => {
  chess.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion || "q"
  });
  renderBoard();
});

socket.on("boardState", (fen) => {
  chess.load(fen);
  renderBoard();
});

socket.on("invalidMove", (move) => {
  console.log("Invalid move attempted:", move);
});

renderBoard(); // initial render (will wait if role not assigned)
