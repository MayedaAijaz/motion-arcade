window.Games = window.Games || {};

window.Games.balance = {
  create(mode, canvas) {
    const W = canvas.width, H = canvas.height;
    const numLanes = mode === 'duo' ? 2 : 1;
    const laneH = H / numLanes;

    function makeLane(index) {
      return {
        index,
        y0: index * laneH,
        lean: 0,        // -1 (fell left) .. 1 (fell right)
        vel: 0,
        target: 0,
        elapsed: 0,
        nextGust: 2 + Math.random() * 2,
        done: false,
        fell: false
      };
    }

    const lanes = [makeLane(0)];
    if (numLanes === 2) lanes.push(makeLane(1));

    const state = { over: false, scores: { p1: 0, p2: mode === 'solo' ? 0 : 0 } };

    function handleInput(playerIndex, type, payload) {
      const lane = mode === 'duo' ? lanes[playerIndex] : (playerIndex === 0 ? lanes[0] : null);
      if (!lane || lane.done) return;
      if (type === 'tilt') lane.target = Math.max(-1, Math.min(1, payload.value));
    }

    function update(dt) {
      lanes.forEach(lane => {
        if (lane.done) return;
        lane.elapsed += dt;

        const difficulty = 1 + lane.elapsed / 25; // gusts get stronger & more frequent over time
        const responsiveness = 8;
        const damping = 6.8; // overdamped: settles onto your tilt instead of ringing on its own

        const accel = (lane.target - lane.lean) * responsiveness - lane.vel * damping;
        lane.vel += accel * dt;
        lane.lean += lane.vel * dt;

        lane.nextGust -= dt;
        if (lane.nextGust <= 0) {
          lane.nextGust = Math.max(0.8, (2.4 - lane.elapsed / 40)) / difficulty;
          lane.vel += (Math.random() - 0.5) * 1.6 * difficulty;
        }

        if (Math.abs(lane.lean) > 1) {
          lane.lean = Math.sign(lane.lean);
          lane.fell = true;
          lane.done = true;
        }
      });

      state.scores.p1 = Math.floor(lanes[0].elapsed * 10) / 10;
      if (numLanes === 2) state.scores.p2 = Math.floor(lanes[1].elapsed * 10) / 10;
      else state.scores.p2 = 'n/a';

      if (lanes.every(l => l.done)) state.over = true;
    }

    function drawLane(ctx, lane) {
      const cx = W / 2;
      const beamY = lane.y0 + laneH * 0.62;
      const beamW = W * 0.7;
      const color = lane.index === 0 ? '#00f0ff' : '#ff2e9a';

      // sky / backdrop band
      ctx.fillStyle = '#0a0f1e';
      ctx.fillRect(0, lane.y0 + 4, W, laneH - 8);

      // beam
      ctx.strokeStyle = '#3a4568';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(cx - beamW / 2, beamY);
      ctx.lineTo(cx + beamW / 2, beamY);
      ctx.stroke();

      // tilt indicator track
      const trackY = lane.y0 + 30;
      ctx.strokeStyle = '#232c45';
      ctx.beginPath(); ctx.moveTo(cx - 120, trackY); ctx.lineTo(cx + 120, trackY); ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.arc(cx + lane.lean * 110, trackY, 7, 0, Math.PI * 2);
      ctx.fill();

      // character — a balancing figure with limbs that react to lane.lean
      const angle = lane.lean * 0.9;
      const counter = -lane.lean * 1.1; // how far the arms swing opposite the lean, to "catch" balance
      const figColor = lane.fell ? '#ff4757' : color;

      ctx.save();
      ctx.translate(cx, beamY);
      ctx.rotate(angle);

      ctx.strokeStyle = figColor;
      ctx.fillStyle = figColor;
      ctx.shadowColor = figColor;
      ctx.lineCap = 'round';

      // legs — a small stance, feet planted on the beam
      ctx.lineWidth = 5;
      ctx.shadowBlur = 6;
      ctx.beginPath(); ctx.moveTo(-3, -14); ctx.lineTo(-8, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -14); ctx.lineTo(8, 0); ctx.stroke();
      ctx.shadowBlur = 0;

      // torso
      ctx.shadowBlur = 14;
      ctx.fillRect(-8, -34, 16, 20);

      // head
      ctx.beginPath();
      ctx.arc(0, -46, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // arms — two jointed limbs (shoulder -> elbow -> hand) that swing opposite the lean
      ctx.lineWidth = 5;
      [-1, 1].forEach(side => {
        ctx.save();
        ctx.translate(0, -30); // shoulder
        ctx.rotate(side * 0.9 + counter);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(side * 16, -4); // upper arm
        ctx.lineTo(side * 30, -8); // forearm to hand
        ctx.stroke();
        ctx.restore();
      });

      ctx.restore();

      ctx.fillStyle = '#7b88a8';
      ctx.font = '12px monospace';
      ctx.fillText((lane.fell ? 'Fell! ' : 'Balancing… ') + lane.elapsed.toFixed(1) + 's', 20, lane.y0 + laneH - 14);

      if (lane.done) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, lane.y0, W, laneH); }
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, W, H);
      lanes.forEach(lane => drawLane(ctx, lane));
      if (numLanes === 2) { ctx.fillStyle = '#0b0e1a'; ctx.fillRect(0, H / 2 - 3, W, 6); }
    }

    return {
      handleInput, update, draw,
      get scores() { return state.scores; },
      get over() { return state.over; },
      winnerText() {
        if (mode === 'solo') return `You balanced for ${lanes[0].elapsed.toFixed(1)}s!`;
        return lanes[0].elapsed === lanes[1].elapsed ? "IT'S A TIE!" : (lanes[0].elapsed > lanes[1].elapsed ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!');
      }
    };
  }
};
