window.Games = window.Games || {};

window.Games.tennis = {
  create(mode, canvas) {
    const W = canvas.width, H = canvas.height;
    const PADDLE_W = 120, PADDLE_H = 16, BALL_R = 10;
    const WIN_SCORE = 7;

    const state = {
      mode,
      scores: { p1: 0, p2: 0 },
      over: false,
      p1: { x: W / 2, targetX: W / 2 },
      p2: { x: W / 2, targetX: W / 2 },
      ball: { x: W / 2, y: H / 2, vx: 180, vy: 260 },
      lastSwing: [0, 0],
      swingPayload: [null, null],
      particles: [],
      flashUntil: [0, 0]
    };

    function resetBall(directionTowards) {
      state.ball.x = W / 2;
      state.ball.y = H / 2;
      const speed = 260;
      state.ball.vx = (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 80);
      state.ball.vy = directionTowards === 'p1' ? speed : -speed;
    }

    function spawnParticles(x, y, color) {
      for (let i = 0; i < 14; i++) {
        state.particles.push({
          x, y,
          vx: (Math.random() - 0.5) * 260,
          vy: (Math.random() - 0.5) * 260,
          life: 0.4,
          color
        });
      }
    }

    function handleInput(playerIndex, type, payload) {
      if (playerIndex === 0 && type === 'tilt') {
        state.p1.targetX = W / 2 + payload.value * (W / 2 - PADDLE_W / 2);
      }
      if (playerIndex === 1 && mode === 'duo' && type === 'tilt') {
        state.p2.targetX = W / 2 + payload.value * (W / 2 - PADDLE_W / 2);
      }
      if (type === 'swing' && (playerIndex === 0 || (playerIndex === 1 && mode === 'duo'))) {
        state.lastSwing[playerIndex] = performance.now();
        state.swingPayload[playerIndex] = payload;
      }
    }

    function update(dt) {
      if (state.over) return;

      state.p1.x += (state.p1.targetX - state.p1.x) * Math.min(1, dt * 10);

      if (mode === 'duo') {
        state.p2.x += (state.p2.targetX - state.p2.x) * Math.min(1, dt * 10);
      } else {
        // CPU: tracks ball with imperfect speed, so power hits can beat it
        const cpuSpeed = 190;
        const dx = state.ball.x - state.p2.x;
        state.p2.x += Math.max(-cpuSpeed * dt, Math.min(cpuSpeed * dt, dx));
      }

      const b = state.ball;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx *= -1; }
      if (b.x + BALL_R > W) { b.x = W - BALL_R; b.vx *= -1; }

      // Paddle 1 (bottom) collision
      const p1Y = H - 36;
      if (b.vy > 0 && b.y + BALL_R >= p1Y - PADDLE_H / 2 && b.y < p1Y + 30 && Math.abs(b.x - state.p1.x) < PADDLE_W / 2) {
        bounceOffPaddle(0, state.p1.x, p1Y);
      }
      // Paddle 2 (top) collision
      const p2Y = 36;
      if (b.vy < 0 && b.y - BALL_R <= p2Y + PADDLE_H / 2 && b.y > p2Y - 30 && Math.abs(b.x - state.p2.x) < PADDLE_W / 2) {
        bounceOffPaddle(1, state.p2.x, p2Y);
      }

      if (b.y > H + 30) { state.scores.p2 += 1; spawnParticles(b.x, H, '#ff2e9a'); resetBall('p2'); }
      if (b.y < -30) { state.scores.p1 += 1; spawnParticles(b.x, 0, '#00f0ff'); resetBall('p1'); }

      state.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; });
      state.particles = state.particles.filter(p => p.life > 0);

      if (state.scores.p1 >= WIN_SCORE || state.scores.p2 >= WIN_SCORE) state.over = true;
    }

    function bounceOffPaddle(playerIndex, paddleX, paddleY) {
      const b = state.ball;
      const offset = (b.x - paddleX) / (PADDLE_W / 2); // -1..1
      const now = performance.now();
      const recentSwing = now - state.lastSwing[playerIndex] < 260;

      let speed = Math.hypot(b.vx, b.vy);
      let color = playerIndex === 0 ? '#00f0ff' : '#ff2e9a';

      if (recentSwing) {
        const power = state.swingPayload[playerIndex]?.power || 0.5;
        speed = Math.min(760, speed * (1.25 + power));
        spawnParticles(b.x, b.y, color);
        state.flashUntil[playerIndex] = now + 150;
      } else {
        speed = Math.max(220, speed * 0.9);
      }

      const angle = offset * 0.9; // steer angle
      const dirY = playerIndex === 0 ? -1 : 1;
      b.vx = Math.sin(angle) * speed;
      b.vy = dirY * Math.cos(angle) * speed;
      b.y = playerIndex === 0 ? paddleY - PADDLE_H / 2 - BALL_R - 1 : paddleY + PADDLE_H / 2 + BALL_R + 1;
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, W, H);
      // court
      ctx.strokeStyle = '#1c2540';
      ctx.setLineDash([8, 10]);
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
      ctx.setLineDash([]);

      // paddles
      drawPaddle(ctx, state.p1.x, H - 36, performance.now() < state.flashUntil[0] ? '#ffffff' : '#00f0ff');
      drawPaddle(ctx, state.p2.x, 36, performance.now() < state.flashUntil[1] ? '#ffffff' : '#ff2e9a');

      // ball
      ctx.beginPath();
      ctx.fillStyle = '#c8ff00';
      ctx.shadowColor = '#c8ff00';
      ctx.shadowBlur = 16;
      ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // particles
      state.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / 0.4);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function drawPaddle(ctx, x, y, color) {
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.fillRect(x - PADDLE_W / 2, y - PADDLE_H / 2, PADDLE_W, PADDLE_H);
      ctx.shadowBlur = 0;
    }

    return {
      handleInput,
      update,
      draw,
      get scores() { return state.scores; },
      get over() { return state.over; },
      winnerText() {
        if (mode === 'solo') return state.scores.p1 > state.scores.p2 ? 'YOU WIN!' : 'CPU WINS';
        return state.scores.p1 > state.scores.p2 ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!';
      }
    };
  }
};
