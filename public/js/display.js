const socket = io();
const params = new URLSearchParams(window.location.search);
const game = params.get('game') || 'tennis';

const titles = {
  tennis: 'SWING TENNIS',
  racing: 'TILT RACER',
  sword: 'DUEL ARENA',
  bowling: 'SWING BOWL',
  fruit: 'FRUIT SLICE',
  airhockey: 'AIR HOCKEY',
  balance: 'BALANCE BEAM'
};
document.getElementById('gameTitle').textContent = titles[game] || 'MOTION ARCADE';
document.getElementById('gameLabel').textContent = titles[game] || '';
document.getElementById('joinUrl').textContent = window.location.origin + '/';

const roomCodeEl = document.getElementById('roomCode');
const p1dot = document.getElementById('p1dot');
const p2dot = document.getElementById('p2dot');
const p1status = document.getElementById('p1status');
const p2status = document.getElementById('p2status');
const startSoloBtn = document.getElementById('startSoloBtn');
const startDuoBtn = document.getElementById('startDuoBtn');
const lobby = document.getElementById('lobby');
const gameStage = document.getElementById('gameStage');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlaySub = document.getElementById('overlaySub');
const restartBtn = document.getElementById('restartBtn');
const score1El = document.getElementById('score1');
const score2El = document.getElementById('score2');

let playerCount = 0;
let activeGame = null;
let mode = null;
let running = false;
let lastTime = 0;

socket.emit('create-room', { game });

socket.on('room-created', ({ code }) => {
  roomCodeEl.textContent = code;
});

socket.on('player-joined', ({ playerIndex, count }) => {
  playerCount = count;
  if (playerIndex === 0) { p1dot.classList.add('on'); p1status.textContent = 'connected'; }
  if (playerIndex === 1) { p2dot.classList.add('on'); p2status.textContent = 'connected'; }
  startSoloBtn.disabled = playerCount < 1;
  startDuoBtn.disabled = playerCount < 2;
});

socket.on('player-left', ({ playerIndex }) => {
  if (playerIndex === 0) { p1dot.classList.remove('on'); p1status.textContent = 'waiting…'; }
  if (playerIndex === 1) { p2dot.classList.remove('on'); p2status.textContent = 'optional'; }
});

socket.on('input', ({ playerIndex, type, payload }) => {
  if (activeGame && activeGame.handleInput) activeGame.handleInput(playerIndex, type, payload);
});

function startGame(selectedMode) {
  mode = selectedMode;
  const factory = window.Games && window.Games[game];
  if (!factory) { alert('Game module not found: ' + game); return; }
  activeGame = factory.create(mode, canvas);
  lobby.style.display = 'none';
  gameStage.style.display = 'block';
  overlay.style.display = 'none';
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

startSoloBtn.addEventListener('click', () => startGame('solo'));
startDuoBtn.addEventListener('click', () => startGame('duo'));

restartBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  startGame(mode);
});

function loop(t) {
  if (!running) return;
  const dt = Math.min(0.05, (t - lastTime) / 1000);
  lastTime = t;

  activeGame.update(dt);
  activeGame.draw(ctx, canvas);

  const s = activeGame.scores || { p1: 0, p2: 0 };
  score1El.textContent = 'P1: ' + s.p1;
  score2El.textContent = mode === 'duo' ? 'P2: ' + s.p2 : 'CPU: ' + s.p2;

  if (activeGame.over) {
    running = false;
    overlay.style.display = 'flex';
    overlayTitle.textContent = activeGame.winnerText ? activeGame.winnerText() : 'Game Over';
    overlaySub.textContent = 'Final score — P1: ' + s.p1 + (mode === 'duo' ? '  |  P2: ' + s.p2 : '  |  CPU: ' + s.p2);
    return;
  }

  requestAnimationFrame(loop);
}
