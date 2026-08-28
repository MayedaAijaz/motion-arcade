window.Games = window.Games || {};

window.Games.airhockey = {
  create(mode, canvas) {
    const W = canvas.width, H = canvas.height;
    const MID_Y = H / 2;
    const GOAL_HALF = 90;
    const PADDLE_R = 30;
    const PUCK_R = 14;
    const WIN_GOALS = 5;

    const state = {
      over: false,
      scores: { p1: 0, p2: 0 },
      puck: { x: W / 2, y: MID_Y, vx: 0, vy: 220 },
      p1: { x: W / 2, y: H - 90, targetX: W / 2, targetY: H - 90, betaBase: null, prevX: W / 2, prevY: H - 90 },
      p2: { x: W / 2, y: 90, targetX: W / 2, targetY: 90, betaBase: null, prevX: W / 2, prevY: 90 },
      flashUntil: 0
    };

    function resetPuck(towardTop) {
      state.puck.x = W / 2;
      state.puck.y = MID_Y;
      const speed = 230;
      state.puck.vx = (Math.random() - 0.5) * 140;
      state.puck.vy = towardTop ? -speed : speed;
    }

    function handleInput(playerIndex, type, payload) {
      if (type !== 'tilt') return;
      const paddle = playerIndex === 0 ? state.p1 : (mode === 'duo' ? state.p2 : null);
      if (!paddle) return;
      if (paddle.betaBase === null) paddle.betaBase = payload.beta;

      const half = W / 2 - PADDLE_R - 20;
      paddle.targetX = W / 2 + payload.value * half;

      const relBeta = (payload.beta - paddle.betaBase); // roughly -40..40 useful range
      const norm = Math.max(-1, Math.min(1, relBeta / 35));
      if (playerIndex === 0) {
        paddle.targetY = (H - 60) - norm * (H / 2 - 90); // stays within bottom half
        paddle.targetY = Math.max(MID_Y + 30, Math.min(H - 40, paddle.targetY));
      } else {
        paddle.targetY = 60 + norm * (H / 2 - 90);
        paddle.targetY = Math.max(40, Math.min(MID_Y - 30, paddle.targetY));
      }
    }

    function updatePaddle(p, dt) {
      p.prevX = p.x; p.prevY = p.y;
      p.x += (p.targetX - p.x) * Math.min(1, dt * 12);
      p.y += (p.targetY - p.y) * Math.min(1, dt * 12);
    }

    function updateCpu(dt) {
      const puck = state.puck;
      const cpu = state.p2;
      const followX = puck.y < MID_Y ? puck.x : W / 2;
      const followY = puck.y < MID_Y ? Math.max(50, Math.min(MID_Y - 40, puck.y)) : 90;
      cpu.prevX = cpu.x; cpu.prevY = cpu.y;
      const speed = 210;
      cpu.x += Math.max(-speed * dt, Math.min(speed * dt, followX - cpu.x));
      cpu.y += Math.max(-speed * dt, Math.min(speed * dt, followY - cpu.y));
    }

    function collide(paddle) {
      const puck = state.puck;
      const dx = puck.x - paddle.x, dy = puck.y - paddle.y;
      const dist = Math.hypot(dx, dy);
      const minDist = PADDLE_R + PUCK_R;
      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist, ny = dy / dist;
        puck.x = paddle.x + nx * minDist;
        puck.y = paddle.y + ny * minDist;
        const paddleVx = (paddle.x - paddle.prevX) / (1 / 60);
        const paddleVy = (paddle.y - paddle.prevY) / (1 / 60);
        const speed = Math.hypot(puck.vx, puck.vy);
        const kick = 1.4;
        puck.vx = nx * Math.max(260, speed) + paddleVx * kick;
        puck.vy = ny * Math.max(260, speed) + paddleVy * kick;
        state.flashUntil = performance.now() + 120;
      }
    }

    function update(dt) {
      if (state.over) return;
      updatePaddle(state.p1, dt);
      if (mode === 'duo') updatePaddle(state.p2, dt); else updateCpu(dt);

      const puck = state.puck;
      puck.vx *= 0.999;
      puck.vy *= 0.999;
      puck.x += puck.vx * dt;
      puck.y += puck.vy * dt;

      if (puck.x - PUCK_R < 20) { puck.x = 20 + PUCK_R; puck.vx *= -1; }
      if (puck.x + PUCK_R > W - 20) { puck.x = W - 20 - PUCK_R; puck.vx *= -1; }

      const inGoalX = Math.abs(puck.x - W / 2) < GOAL_HALF;

      if (puck.y - PUCK_R < 20) {
        if (inGoalX) { state.scores.p1 += 1; resetPuck(false); }
        else { puck.y = 20 + PUCK_R; puck.vy *= -1; }
      }
      if (puck.y + PUCK_R > H - 20) {
        if (inGoalX) { state.scores.p2 += 1; resetPuck(true); }
        else { puck.y = H - 20 - PUCK_R; puck.vy *= -1; }
      }

      collide(state.p1);
      collide(state.p2);

      if (state.scores.p1 >= WIN_GOALS || state.scores.p2 >= WIN_GOALS) state.over = true;
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0a0f1e';
      ctx.fillRect(20, 20, W - 40, H - 40);
      ctx.strokeStyle = '#1c2540';
      ctx.strokeRect(20, 20, W - 40, H - 40);

      ctx.strokeStyle = '#1c2540';
      ctx.setLineDash([8, 10]);
      ctx.beginPath(); ctx.moveTo(20, MID_Y); ctx.lineTo(W - 20, MID_Y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(W / 2, MID_Y, 60, 0, Math.PI * 2); ctx.stroke();

      // goal mouths
      ctx.strokeStyle = '#c8ff00';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(W / 2 - GOAL_HALF, 20); ctx.lineTo(W / 2 + GOAL_HALF, 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W / 2 - GOAL_HALF, H - 20); ctx.lineTo(W / 2 + GOAL_HALF, H - 20); ctx.stroke();
      ctx.lineWidth = 1;

      drawPaddle(ctx, state.p1, '#00f0ff');
      drawPaddle(ctx, state.p2, '#ff2e9a');

      const flashing = performance.now() < state.flashUntil;
      ctx.beginPath();
      ctx.fillStyle = flashing ? '#ffffff' : '#ffb800';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 16;
      ctx.arc(state.puck.x, state.puck.y, PUCK_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawPaddle(ctx, p, color) {
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.arc(p.x, p.y, PADDLE_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.fillStyle = '#05070f';
      ctx.arc(p.x, p.y, PADDLE_R * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }

    return {
      handleInput, update, draw,
      get scores() { return state.scores; },
      get over() { return state.over; },
      winnerText() {
        if (mode === 'solo') return state.scores.p1 > state.scores.p2 ? 'YOU WIN!' : 'CPU WINS';
        return state.scores.p1 > state.scores.p2 ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!';
      }
    };
  }
};
