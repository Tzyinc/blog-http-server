const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const state = {
  board: Array(9).fill(""),
  currentPlayer: "X",
  gameOver: false,
  scores: {
    X: 0,
    O: 0,
    draw: 0,
  },
};

const boardElement = document.querySelector("#board");
const cells = Array.from(document.querySelectorAll(".cell"));
const statusElement = document.querySelector("#status");
const resetButton = document.querySelector("#reset-button");
const clearButton = document.querySelector("#clear-button");
const scoreXElement = document.querySelector("#score-x");
const scoreOElement = document.querySelector("#score-o");
const scoreDrawElement = document.querySelector("#score-draw");

function updateStatus(message) {
  statusElement.textContent = message;
}

function updateScores() {
  scoreXElement.textContent = String(state.scores.X);
  scoreOElement.textContent = String(state.scores.O);
  scoreDrawElement.textContent = String(state.scores.draw);
}

function renderBoard() {
  cells.forEach((cell, index) => {
    const mark = state.board[index];
    cell.textContent = mark;
    cell.dataset.mark = mark;
    cell.disabled = state.gameOver || mark !== "";
    cell.classList.remove("winning");
  });
}

function findWinner() {
  for (const line of winningLines) {
    const [a, b, c] = line;
    const mark = state.board[a];

    if (mark && mark === state.board[b] && mark === state.board[c]) {
      return { mark, line };
    }
  }

  return null;
}

function finishRound(winner) {
  state.gameOver = true;

  if (winner) {
    state.scores[winner.mark] += 1;
    updateStatus(`Player ${winner.mark} wins`);
    renderBoard();
    winner.line.forEach((index) => cells[index].classList.add("winning"));
  } else {
    state.scores.draw += 1;
    updateStatus("Draw game");
    renderBoard();
  }

  updateScores();
}

function handleMove(index) {
  if (state.gameOver || state.board[index] !== "") {
    return;
  }

  state.board[index] = state.currentPlayer;
  renderBoard();

  const winner = findWinner();

  if (winner) {
    finishRound(winner);
    return;
  }

  if (state.board.every((cell) => cell !== "")) {
    finishRound(null);
    return;
  }

  state.currentPlayer = state.currentPlayer === "X" ? "O" : "X";
  updateStatus(`Player ${state.currentPlayer}'s turn`);
}

function resetRound() {
  state.board = Array(9).fill("");
  state.currentPlayer = "X";
  state.gameOver = false;
  updateStatus("Player X starts");
  renderBoard();
}

function resetScores() {
  state.scores = { X: 0, O: 0, draw: 0 };
  updateScores();
  resetRound();
}

boardElement.addEventListener("click", (event) => {
  const cell = event.target.closest(".cell");

  if (!cell) {
    return;
  }

  handleMove(Number(cell.dataset.cellIndex));
});

resetButton.addEventListener("click", resetRound);
clearButton.addEventListener("click", resetScores);

updateScores();
renderBoard();
