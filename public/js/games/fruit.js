window.Games = window.Games || {};

window.Games.fruit = {
  create(mode, canvas) {
    const W = canvas.width, H = canvas.height;
    const numLanes = mode === 'duo' ? 2 : 1;
    const laneWidth = W / numLanes;
    const TARGET = 150; // friendly solo-mode benchmark
    const FRUIT_COLORS = ['#ff5d3d', '#c8ff00', '#ffb800', '#ff2e9a', '#00f0ff'];

    function makeLane(index) {
      return {
        index,
        centerX: index * laneWidth + laneWidth / 2,
        bladeX: index * laneWidth + laneWidth / 2,
        targetBladeX: index * laneWidth + laneWidth / 2,
        items: [],
        lives: 3,
        score: 0,
        spawnTimer: 0.6,
        elapsed: 0,
        done: false,
        flash: 0,
        particles: []
      };
    }

    const lanes = [makeLane(0)];
    if (numLanes === 2) lanes.push(makeLane(1));

    const state = { over: false, scores: { p1: 0, p2: mode === 'solo' ? TARGET : 0 } };

    function handleInput(playerIndex, type, payload) {
      const lane = mode === 'duo' ? lanes[playerIndex] : (playerIndex === 0 ? lanes[0] : null);
      if (!lane || lane.done) return;
      if (type === 'tilt') {
        const half = laneWidth / 2 - 30;
        lane.targetBladeX = lane.centerX + payload.value * half;
      }
      if (type === 'swing') slice(lane, payload);
    }

    function slice(lane, payload) {
      const radius = 65 + (payload.power || 0.5) * 45;
      let hitBomb = false;
      lane.items.forEach(it => {
        if (it.sliced) return;
        const dx = it.x - lane.bladeX;
        const dy = it.y - H * 0.55; // blade sweeps through the mid-lower playfield
        if (Math.hypot(dx, dy) < radius) {
          it.sliced = true;
          if (it.type === 'bomb') {
            hitBomb = true;
          } else {
            lane.score += 10;
            spawnParticles(lane, it.x, it.y, it.color);
          }
        }
      });
      lane.flash = 0.12;
      if (hitBomb) {
        lane.lives = 0;
        spawnParticles(lane, lane.bladeX, H * 0.5, '#ff4757');
      }
    }

    function spawnParticles(lane, x, y, color) {
      for (let i = 0; i < 10; i++) {
        lane.particles.push({ x, y, vx: (Math.random() - 0.5) * 240, vy: (Math.random() - 0.5) * 240, life: 0.35, color });
      }
    }

    function spawnItem(lane) {
      const isBomb = Math.random() < 0.15;
      const x = lane.centerX + (Math.random() * 2 - 1) * (laneWidth / 2 - 60);
      const vy = -(420 + Math.random() * 120);
      lane.items.push({
        x, y: H + 30, vy,
        vx: (Math.random() - 0.5) * 60,
        type: isBomb ? 'bomb' : 'fruit',
        color: isBomb ? '#2b2f3d' : FRUIT_COLORS[Math.floor(Math.random() * FRUIT_COLORS.length)],
        sliced: false,
        radius: isBomb ? 20 : 17
      });
    }

    function update(dt) {
      lanes.forEach(lane => {
        if (lane.done) return;
        lane.elapsed += dt;
        lane.bladeX += (lane.targetBladeX - lane.bladeX) * Math.min(1, dt * 14);

        lane.spawnTimer -= dt;
        const interval = Math.max(0.35, 1.1 - lane.elapsed / 45);
        if (lane.spawnTimer <= 0) { lane.spawnTimer = interval; spawnItem(lane); }

        const gravity = 620;
        lane.items.forEach(it => {
          it.vy += gravity * dt;
          it.x += it.vx * dt;
          it.y += it.vy * dt;
        });
        lane.items = lane.items.filter(it => {
          if (it.sliced) return false;
          if (it.y > H + 60) {
            if (it.type === 'fruit') lane.lives -= 1;
            return false;
          }
          return true;
        });

        lane.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
        lane.particles = lane.particles.filter(p => p.life > 0);
        lane.flash = Math.max(0, lane.flash - dt);

        if (lane.lives <= 0) { lane.lives = 0; lane.done = true; }
      });

      state.scores.p1 = lanes[0].score;
      if (numLanes === 2) state.scores.p2 = lanes[1].score;

      if (lanes.every(l => l.done)) state.over = true;
    }

    function drawLane(ctx, lane) {
      const x0 = lane.index * laneWidth;
      const color = lane.index === 0 ? '#00f0ff' : '#ff2e9a';

      ctx.fillStyle = lane.flash > 0 ? 'rgba(255,93,61,0.08)' : '#05070f';
      ctx.fillRect(x0, 0, laneWidth, H);

      lane.items.forEach(it => {
        ctx.beginPath();
        ctx.fillStyle = it.color;
        ctx.shadowColor = it.color;
        ctx.shadowBlur = it.type === 'bomb' ? 6 : 14;
        ctx.arc(it.x, it.y, it.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        if (it.type === 'bomb') {
          ctx.strokeStyle = '#ffb800';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(it.x, it.y - it.radius);
          ctx.lineTo(it.x + 6, it.y - it.radius - 10);
          ctx.stroke();
        }
      });

      lane.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / 0.35);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // blade
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(lane.bladeX, H * 0.3);
      ctx.lineTo(lane.bladeX, H * 0.8);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // lives
      ctx.fillStyle = '#7b88a8';
      ctx.font = '12px monospace';
      ctx.fillText('Lives: ' + '❤'.repeat(Math.max(0, lane.lives)), x0 + 16, 24);

      if (lane.done) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x0, 0, laneWidth, H); }
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, W, H);
      lanes.forEach(lane => drawLane(ctx, lane));
      if (numLanes === 2) { ctx.fillStyle = '#0b0e1a'; ctx.fillRect(W / 2 - 3, 0, 6, H); }
    }

    return {
      handleInput, update, draw,
      get scores() { return state.scores; },
      get over() { return state.over; },
      winnerText() {
        if (mode === 'solo') return lanes[0].score >= TARGET ? `JUICY! You scored ${lanes[0].score}` : `Sliced up: ${lanes[0].score} (target ${TARGET})`;
        return lanes[0].score === lanes[1].score ? "IT'S A TIE!" : (lanes[0].score > lanes[1].score ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!');
      }
    };
  }
};
