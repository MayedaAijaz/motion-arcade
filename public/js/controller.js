const socket = io();

const params = new URLSearchParams(window.location.search);
const prefillCode = params.get('code');

const joinView = document.getElementById('joinView');
const permissionView = document.getElementById('permissionView');
const playView = document.getElementById('playView');

const codeInput = document.getElementById('codeInput');
const joinBtn = document.getElementById('joinBtn');
const joinError = document.getElementById('joinError');
const enableBtn = document.getElementById('enableBtn');

const connDot = document.getElementById('connDot');
const connLabel = document.getElementById('connLabel');
const playerLabel = document.getElementById('playerLabel');
const tiltDot = document.getElementById('tiltDot');
const tiltLabel = document.getElementById('tiltLabel');
const swingZone = document.getElementById('swingZone');
const powerFill = document.getElementById('powerFill');
const gameHint = document.getElementById('gameHint');
const tiltUI = document.getElementById('tiltUI');
const swingUI = document.getElementById('swingUI');

let currentGame = null;
let roomCode = null;

if (prefillCode) codeInput.value = prefillCode.toUpperCase();

function showView(view) {
  [joinView, permissionView, playView].forEach(v => v.style.display = 'none');
  view.style.display = 'flex';
}

joinBtn.addEventListener('click', () => {
  const code = codeInput.value.trim().toUpperCase();
  if (code.length < 4) { joinError.textContent = 'Enter the 4-character code.'; return; }
  roomCode = code;
  socket.emit('join-room', { code });
});

socket.on('join-error', ({ message }) => { joinError.textContent = message; });

socket.on('joined', ({ playerIndex, game }) => {
  currentGame = game;
  playerLabel.textContent = `Player ${playerIndex + 1}`;
  configureUIForGame(game);
  showView(permissionView);
});

function configureUIForGame(game) {
  const hints = {
    tennis: 'Tilt phone left/right to move your paddle. Swing sharply forward when the ball is near to hit it back.',
    racing: 'Tilt phone left/right to steer. Keep tilting to stay on the track and dodge obstacles.',
    sword: 'Swing your phone to attack. Tilt the phone back and hold to guard against incoming hits.',
    bowling: 'Tilt phone left/right to aim down the lane. Swing forward to release the ball — a harder swing means more power.',
    fruit: 'Tilt phone left/right to move the blade. Swing sharply when fruit is near to slice it — avoid the bombs!',
    airhockey: 'Tilt phone left/right to move sideways. Lean the phone forward/back to move your paddle up and down your half.',
    balance: 'Tilt phone left/right to lean your character and stay balanced. Random gusts get stronger over time — survive as long as you can!'
  };
  gameHint.textContent = hints[game] || '';
  if (game === 'racing' || game === 'airhockey' || game === 'balance') {
    tiltLabel.textContent = game === 'airhockey' ? 'Steering + lean' : (game === 'balance' ? 'Lean left / right' : 'Steering');
    swingUI.style.display = 'none';
  } else if (game === 'sword') {
    tiltLabel.textContent = 'Guard tilt (lean back to block)';
    swingUI.style.display = 'flex';
  } else {
    tiltLabel.textContent = 'Tilt left / right';
    swingUI.style.display = 'flex';
  }
}

enableBtn.addEventListener('click', async () => {
  try {
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      const motionPerm = await DeviceMotionEvent.requestPermission();
      if (motionPerm !== 'granted') throw new Error('Motion permission denied');
    }
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      const orientPerm = await DeviceOrientationEvent.requestPermission();
      if (orientPerm !== 'granted') throw new Error('Orientation permission denied');
    }
    startSensors();
    showView(playView);
    connDot.classList.add('on');
    connLabel.textContent = 'sensors live';
  } catch (err) {
    alert('Could not enable sensors: ' + err.message + '\nMake sure you opened this page over HTTPS (or localhost) and tap Allow when prompted.');
  }
});

// ---- Sensor handling ----
let lastTiltSend = 0;
const TILT_SEND_INTERVAL = 45; // ms

// Swing detection state machine
let swingState = 'idle'; // idle -> rising -> cooling
let peakMag = 0;
let peakGamma = 0;
let peakBeta = 0;
const GRAVITY = 9.81;
const RISE_THRESHOLD = 14;   // magnitude above which we consider a swing starting
const RESET_THRESHOLD = 11;  // magnitude must drop back below this to arm again
const MAX_EXPECTED = 30;     // magnitude that counts as a "full power" swing
let lastGamma = 0;
let lastBeta = 0;

function startSensors() {
  window.addEventListener('deviceorientation', onOrientation);
  window.addEventListener('devicemotion', onMotion);
}

function onOrientation(e) {
  const gamma = e.gamma || 0; // left-right tilt, -90..90
  const beta = e.beta || 0;   // front-back tilt, -180..180
  lastGamma = gamma;
  lastBeta = beta;

  // Update visual tilt dot
  const clamped = Math.max(-45, Math.min(45, gamma));
  const pct = (clamped + 45) / 90; // 0..1
  const trackWidth = tiltDot.parentElement.clientWidth - 40;
  tiltDot.style.left = (pct * trackWidth) + 'px';

  const now = Date.now();
  if (now - lastTiltSend > TILT_SEND_INTERVAL && roomCode) {
    lastTiltSend = now;
    const normalized = Math.max(-1, Math.min(1, gamma / 45)); // -1..1
    const guard = currentGame === 'sword' && beta < -25;
    if (guard) swingZone.style.setProperty('--accent', '#00f0ff');
    socket.emit('controller-input', { type: 'tilt', payload: { value: normalized, beta, guard } });
  }
}

function onMotion(e) {
  const a = e.accelerationIncludingGravity || e.acceleration;
  if (!a) return;
  const mag = Math.sqrt((a.x || 0) ** 2 + (a.y || 0) ** 2 + (a.z || 0) ** 2);
  const delta = Math.abs(mag - GRAVITY);

  powerFill.style.width = Math.min(100, (delta / MAX_EXPECTED) * 100) + '%';

  if (swingState === 'idle' && delta > RISE_THRESHOLD) {
    swingState = 'rising';
    peakMag = delta;
    peakGamma = lastGamma;
    peakBeta = lastBeta;
    flashSwingZone();
  } else if (swingState === 'rising') {
    if (delta > peakMag) { peakMag = delta; peakGamma = lastGamma; peakBeta = lastBeta; }
    if (delta < RESET_THRESHOLD) {
      // Swing completed — fire it
      const power = Math.max(0.15, Math.min(1, peakMag / MAX_EXPECTED));
      const direction = Math.abs(peakBeta) > Math.abs(peakGamma) ? (peakBeta < 0 ? 'up' : 'down') : (peakGamma < 0 ? 'left' : 'right');
      if (roomCode) {
        socket.emit('controller-input', { type: 'swing', payload: { power, direction, gamma: peakGamma / 45, beta: peakBeta } });
      }
      swingState = 'cooling';
      setTimeout(() => { swingState = 'idle'; }, 220);
    }
  }
}

function flashSwingZone() {
  swingZone.classList.add('flash');
  setTimeout(() => swingZone.classList.remove('flash'), 150);
}

socket.on('disconnect', () => {
  connDot.classList.remove('on');
  connDot.classList.add('off');
  connLabel.textContent = 'disconnected';
});

socket.on('display-closed', () => {
  alert('The game screen closed this room.');
  window.location.href = 'index.html';
});
