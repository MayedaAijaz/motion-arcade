window.Games = window.Games || {};

window.Games.bowling = {
  create(mode, canvas) {
    const W = canvas.width, H = canvas.height;
    const numLanes = mode === 'duo' ? 2 : 1;
    const laneWidth = W / numLanes;
    const BACK_Y = 110; // furthest pin row
    const START_Y = H - 70;
    const PAR = 120; // friendly CPU target for solo mode

    function pinLayout() {
      // 10 pins, apex nearest the bowler (largest y), fanning out toward the back
      return [
        { ox: 0, oy: 200 },
        { ox: -14, oy: 170 }, { ox: 14, oy: 170 },
        { ox: -28, oy: 140 }, { ox: 0, oy: 140 }, { ox: 28, oy: 140 },
        { ox: -42, oy: 110 }, { ox: -14, oy: 110 }, { ox: 14, oy: 110 }, { ox: 42, oy: 110 }
      ].map(p => ({ ...p, standing: true, phase: Math.random() * Math.PI * 2, fallTimer: 0 }));
    }

    function makeLane(index) {
      return {
        index,
        centerX: index * laneWidth + laneWidth / 2,
        aim: 0,
        ball: null, // {x,y,vx,vy,curve,power}
        pins: pinLayout(),
        frame: 0,
        rollInFrame: 0,
        total: 0,
        done: false,
        lastResultMsg: ''
      };
    }

    const lanes = [makeLane(0)];
    if (numLanes === 2) lanes.push(makeLane(1));

    const state = { over: false, scores: { p1: 0, p2: mode === 'solo' ? PAR : 0 } };

    function handleInput(playerIndex, type, payload) {
      const lane = mode === 'duo' ? lanes[playerIndex] : (playerIndex === 0 ? lanes[0] : null);
      if (!lane || lane.done) return;
      if (type === 'tilt' && !lane.ball) lane.aim = payload.value;
      if (type === 'swing' && !lane.ball) launchBall(lane, payload);
    }

    function launchBall(lane, payload) {
      const power = payload.power || 0.5;
      const angle = lane.aim * 0.42; // radians, ~24 degrees max
      const speed = 260 + power * 300;
      const curve = (Math.random() * 2 - 1) * (1 - power) * 70;
      lane.ball = {
        x: lane.centerX,
        y: START_Y,
        vx: Math.sin(angle) * speed * 0.45,
        vy: -speed,
        curve,
        power,
        gutter: false,
        spinAngle: 0,
        trail: []
      };
    }

    function resolveRoll(lane, pinsKnocked) {
      lane.total += pinsKnocked;
      if (lane.rollInFrame === 0) {
        if (pinsKnocked === 10) {
          lane.lastResultMsg = 'STRIKE!';
          lane.pins = pinLayout();
          lane.frame += 1;
          lane.rollInFrame = 0;
        } else {
          lane.lastResultMsg = pinsKnocked + ' pins';
          lane.rollInFrame = 1;
        }
      } else {
        const standingLeft = lane.pins.filter(p => p.standing).length;
        lane.lastResultMsg = standingLeft === 0 ? 'SPARE!' : (pinsKnocked + ' pins');
        lane.pins = pinLayout();
        lane.frame += 1;
        lane.rollInFrame = 0;
      }
      if (lane.frame >= 3) lane.done = true;
      lane.ball = null;
      lane.aim = 0;
    }

    function update(dt) {
      lanes.forEach(lane => {
        lane.pins.forEach(p => { if (p.fallTimer > 0) p.fallTimer = Math.max(0, p.fallTimer - dt); });

        if (!lane.ball) return;
        const b = lane.ball;
        b.vx += b.curve * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.spinAngle += (Math.hypot(b.vx, b.vy) / 30) * dt;
        b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 10) b.trail.shift();

        const halfLane = laneWidth / 2 - 18;
        if (Math.abs(b.x - lane.centerX) > halfLane) {
          b.gutter = true;
          resolveRoll(lane, 0);
          return;
        }

        if (b.y <= BACK_Y - 15) {
          const knockRadius = 20 + b.power * 32;
          let knocked = 0;
          lane.pins.forEach(p => {
            if (p.standing && Math.abs((lane.centerX + p.ox) - b.x) < knockRadius) {
              p.standing = false;
              p.fallTimer = 0.6;
              knocked++;
            }
          });
          resolveRoll(lane, knocked);
        }
      });

      state.scores.p1 = lanes[0].total;
      if (numLanes === 2) state.scores.p2 = lanes[1].total;

      if (lanes.every(l => l.done)) state.over = true;
    }

    function drawLane(ctx, lane) {
      const x0 = lane.index * laneWidth;
      const color = lane.index === 0 ? '#00f0ff' : '#ff2e9a';

      ctx.fillStyle = '#0a0f1e';
      ctx.fillRect(x0 + 20, 30, laneWidth - 40, H - 60);
      ctx.strokeStyle = '#1c2540';
      ctx.strokeRect(x0 + 20, 30, laneWidth - 40, H - 60);

      // gutters
      ctx.fillStyle = '#050710';
      ctx.fillRect(x0 + 20, 30, 14, H - 60);
      ctx.fillRect(x0 + laneWidth - 34, 30, 14, H - 60);

      // pins
      const now = performance.now() / 1000;
      lane.pins.forEach(p => {
        const px = lane.centerX + p.ox, py = p.oy;
        if (p.standing) {
          const wobble = Math.sin(now * 2 + p.phase) * 0.05;
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(wobble);
          ctx.fillStyle = '#f4f1ea';
          ctx.shadowColor = '#f4f1ea';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.ellipse(0, 0, 6, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = '#ff5d3d';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-5, -2); ctx.lineTo(5, -2);
          ctx.stroke();
          ctx.restore();
        } else if (p.fallTimer > 0) {
          const t = 1 - p.fallTimer / 0.6; // 0 -> just hit, 1 -> fully fallen
          ctx.save();
          ctx.globalAlpha = 1 - t * 0.8;
          ctx.translate(px, py);
          ctx.rotate(t * (Math.PI / 2) * (p.ox >= 0 ? 1 : -1));
          ctx.fillStyle = '#f4f1ea';
          ctx.beginPath();
          ctx.ellipse(0, t * 6, 6, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.globalAlpha = 1;
        }
      });

      // aim guide (only while no ball in flight)
      if (!lane.ball && !lane.done) {
        const angle = lane.aim * 0.42;
        const guideLen = 140;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.moveTo(lane.centerX, START_Y);
        ctx.lineTo(lane.centerX + Math.sin(angle) * guideLen, START_Y - Math.cos(angle) * guideLen);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      // ball spin-trail
      if (lane.ball && lane.ball.trail.length > 1) {
        lane.ball.trail.forEach((pt, i) => {
          const a = (i / lane.ball.trail.length) * 0.35;
          ctx.globalAlpha = a;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // ball
      const by = lane.ball ? lane.ball.y : START_Y;
      const bx = lane.ball ? lane.ball.x : lane.centerX;
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.arc(bx, by, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // spin marker — a rotating highlight so the ball visibly spins as it rolls
      if (lane.ball) {
        const spin = lane.ball.spinAngle;
        ctx.strokeStyle = 'rgba(255,255,255,0.65)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + Math.cos(spin) * 7, by + Math.sin(spin) * 7);
        ctx.lineTo(bx + Math.cos(spin + Math.PI) * 7, by + Math.sin(spin + Math.PI) * 7);
        ctx.stroke();
      }

      // frame / result readout
      ctx.fillStyle = '#7b88a8';
      ctx.font = '12px monospace';
      ctx.fillText(`Frame ${Math.min(lane.frame + 1, 3)}/3  ${lane.lastResultMsg}`, x0 + 30, H - 20);

      if (lane.done) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x0, 0, laneWidth, H);
      }
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, W, H);
      lanes.forEach(lane => drawLane(ctx, lane));
      if (numLanes === 2) {
        ctx.fillStyle = '#0b0e1a';
        ctx.fillRect(W / 2 - 3, 0, 6, H);
      }
    }

    return {
      handleInput,
      update,
      draw,
      get scores() { return state.scores; },
      get over() { return state.over; },
      winnerText() {
        if (mode === 'solo') return lanes[0].total >= PAR ? `YOU BEAT PAR! (${lanes[0].total})` : `SO CLOSE — ${lanes[0].total} vs par ${PAR}`;
        return lanes[0].total === lanes[1].total ? "IT'S A TIE!" : (lanes[0].total > lanes[1].total ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!');
      }
    };
  }
};
