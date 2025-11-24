const boardElement = document.getElementById('board');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best');
const messageElement = document.getElementById('message');
const newGameButton = document.getElementById('new-game');

const GRID_SIZE = 4;
const START_TILES = 2;
const STORAGE_KEY = 'cybergrid-best-score';

let cells = [];
let tiles = [];
let score = 0;
let best = Number(localStorage.getItem(STORAGE_KEY)) || 0;

bestElement.textContent = best;

function setupBoard() {
  boardElement.innerHTML = '';
  cells = [];
  boardElement.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
  boardElement.style.gridTemplateRows = `repeat(${GRID_SIZE}, 1fr)`;

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cells.push(cell);
    boardElement.appendChild(cell);
  }
}

function randomEmptyCell() {
  const emptyCells = cells
    .map((_, index) => index)
    .filter((index) => !tiles.find((tile) => tile.position === index));
  if (emptyCells.length === 0) return null;
  return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function addTile(value = Math.random() < 0.9 ? 2 : 4) {
  const position = randomEmptyCell();
  if (position === null) return false;

  const tile = { value, position, mergedFrom: null };
  tiles.push(tile);
  drawTiles();
  return true;
}

function positionToCoords(position) {
  const x = position % GRID_SIZE;
  const y = Math.floor(position / GRID_SIZE);
  return { x, y };
}

function coordsToPosition(x, y) {
  return y * GRID_SIZE + x;
}

function getTileAt(x, y) {
  return tiles.find((tile) => tile.position === coordsToPosition(x, y));
}

function canMove() {
  if (tiles.length < GRID_SIZE * GRID_SIZE) return true;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const tile = getTileAt(x, y);
      const right = getTileAt(x + 1, y);
      const down = getTileAt(x, y + 1);
      if (right && right.value === tile.value) return true;
      if (down && down.value === tile.value) return true;
    }
  }
  return false;
}

function slide(direction) {
  let moved = false;
  const vector = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  }[direction];

  const traversals = {
    x: [...Array(GRID_SIZE).keys()],
    y: [...Array(GRID_SIZE).keys()],
  };

  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  tiles = tiles.map((tile) => ({ ...tile, mergedFrom: null }));

  traversals.x.forEach((x) => {
    traversals.y.forEach((y) => {
      const tile = getTileAt(x, y);
      if (!tile) return;

      let nextX = x;
      let nextY = y;

      while (true) {
        const candidateX = nextX + vector.x;
        const candidateY = nextY + vector.y;

        if (
          candidateX < 0 ||
          candidateX >= GRID_SIZE ||
          candidateY < 0 ||
          candidateY >= GRID_SIZE
        ) {
          break;
        }

        const candidate = getTileAt(candidateX, candidateY);
        if (candidate) {
          if (candidate.value === tile.value && !candidate.mergedFrom && !tile.mergedFrom) {
            candidate.value *= 2;
            candidate.mergedFrom = tile;
            tile.position = coordsToPosition(candidateX, candidateY);
            score += candidate.value;
            moved = true;
            tiles = tiles.filter((t) => t !== tile);
          }
          break;
        }

        nextX = candidateX;
        nextY = candidateY;
      }

      if (tile.position !== coordsToPosition(nextX, nextY)) {
        tile.position = coordsToPosition(nextX, nextY);
        moved = true;
      }
    });
  });

  if (moved) {
    addTile();
    updateScore();
    drawTiles();
    checkGameState();
  }
}

function drawTiles() {
  cells.forEach((cell) => (cell.innerHTML = ''));
  tiles.forEach((tile) => {
    const cell = cells[tile.position];
    const tileElement = document.createElement('div');
    tileElement.className = 'tile';
    tileElement.textContent = tile.value;
    tileElement.style.background = tileColor(tile.value);
    tileElement.classList.toggle('merged', !!tile.mergedFrom);
    tileElement.classList.toggle('new', tile.justAdded);
    tile.justAdded = false;
    cell.appendChild(tileElement);
  });
}

function tileColor(value) {
  const palette = {
    2: '#00ffd1',
    4: '#34d2ff',
    8: '#8c5bff',
    16: '#ff00e6',
    32: '#ff3d7f',
    64: '#ffb04d',
    128: '#afff00',
    256: '#00f0ff',
    512: '#ff9cff',
    1024: '#00ffa3',
    2048: '#ffd300',
  };
  return palette[value] || '#ffffff';
}

function updateScore() {
  scoreElement.textContent = score;
  if (score > best) {
    best = score;
    localStorage.setItem(STORAGE_KEY, best);
    bestElement.textContent = best;
  }
}

function resetGame() {
  score = 0;
  tiles = [];
  updateScore();
  messageElement.classList.add('hidden');
  for (let i = 0; i < START_TILES; i++) {
    addTile();
    tiles[tiles.length - 1].justAdded = true;
  }
  drawTiles();
}

function checkGameState() {
  if (tiles.some((tile) => tile.value >= 2048)) {
    showMessage('You reached 2048! Continue to chase neon glory.');
  } else if (!canMove()) {
    showMessage('Grid locked. Jack out and try again.');
  }
}

function showMessage(text) {
  messageElement.textContent = text;
  messageElement.classList.remove('hidden');
}

function handleInput(event) {
  const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (!validKeys.includes(event.key)) return;
  event.preventDefault();
  slide(event.key);
}

let touchStart = null;

function handleTouchStart(event) {
  const touch = event.touches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}

function handleTouchEnd(event) {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStart.x;
  const deltaY = touch.clientY - touchStart.y;
  const absX = Math.abs(deltaX);
  const absY = Math.abs(deltaY);

  if (Math.max(absX, absY) < 20) return;

  if (absX > absY) {
    slide(deltaX > 0 ? 'ArrowRight' : 'ArrowLeft');
  } else {
    slide(deltaY > 0 ? 'ArrowDown' : 'ArrowUp');
  }
  touchStart = null;
}

function init() {
  setupBoard();
  resetGame();
  window.addEventListener('keydown', handleInput, { passive: false });
  boardElement.addEventListener('touchstart', handleTouchStart, { passive: true });
  boardElement.addEventListener('touchend', handleTouchEnd, { passive: true });
  newGameButton.addEventListener('click', resetGame);
}

init();
