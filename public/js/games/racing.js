window.Games = window.Games || {};

window.Games.racing = {
  create(mode, canvas) {
    const W = canvas.width, H = canvas.height;
    const numLanes = mode === 'duo' ? 2 : 1;
    const laneWidth = W / numLanes;
    const CAR_W = 46, CAR_H = 74;

    function makeLane(index) {
      return {
        index,
        carX: 0, // -1..1 within lane
        tilt: 0,
        obstacles: [],
        distance: 0,
        speed: 260,
        spawnTimer: 0,
        crashed: false,
        flash: 0
      };
    }

    const lanes = [makeLane(0)];
    if (numLanes === 2) lanes.push(makeLane(1));

    const state = { over: false, scores: { p1: 0, p2: 0 } };

    function handleInput(playerIndex, type) {} // placeholder to keep shape consistent
    function handleInputReal(playerIndex, type, payload) {
      if (type === 'tilt') {
        const lane = mode === 'duo' ? lanes[playerIndex] : (playerIndex === 0 ? lanes[0] : null);
        if (lane) lane.tilt = payload.value;
      }
    }

    function laneRoadX(lane) {
      return lane.index * laneWidth;
    }

    function update(dt) {
      if (state.over) return;
      let allCrashed = true;

      lanes.forEach(lane => {
        if (lane.crashed) {
          lane.flash = Math.max(0, lane.flash - dt);
          return;
        }
        allCrashed = false;

        lane.speed = Math.min(620, 260 + lane.distance * 0.6);
        lane.distance += lane.speed * dt * 0.05;
        lane.carX += lane.tilt * dt * 3.2;
        lane.carX = Math.max(-0.92, Math.min(0.92, lane.carX));

        lane.spawnTimer -= dt;
        const spawnInterval = Math.max(0.45, 1.3 - lane.distance / 400);
        if (lane.spawnTimer <= 0) {
          lane.spawnTimer = spawnInterval;
          lane.obstacles.push({
            x: (Math.random() * 1.6 - 0.8),
            y: -60,
            w: 50 + Math.random() * 30
          });
        }

        lane.obstacles.forEach(o => { o.y += lane.speed * dt; });
        lane.obstacles = lane.obstacles.filter(o => o.y < H + 80);

        const roadX0 = laneRoadX(lane);
        const carScreenX = roadX0 + laneWidth / 2 + lane.carX * (laneWidth / 2 - CAR_W / 2 - 10);
        const carTop = H - 110, carBottom = H - 110 + CAR_H;

        for (const o of lane.obstacles) {
          const oScreenX = roadX0 + laneWidth / 2 + o.x * (laneWidth / 2 - 10);
          const oTop = o.y, oBottom = o.y + 40;
          const overlapX = Math.abs(oScreenX - carScreenX) < (o.w / 2 + CAR_W / 2 - 8);
          const overlapY = oBottom > carTop && oTop < carBottom;
          if (overlapX && overlapY) {
            lane.crashed = true;
            lane.flash = 0.6;
          }
        }
      });

      const s0 = Math.floor(lanes[0].distance);
      const s1 = numLanes === 2 ? Math.floor(lanes[1].distance) : Math.floor((lanes[0].distance) * 0.0); // CPU shows 0 (no CPU racer)
      state.scores.p1 = s0;
      state.scores.p2 = numLanes === 2 ? s1 : '—';

      if (numLanes === 1 && lanes[0].crashed) state.over = true;
      if (numLanes === 2 && lanes.every(l => l.crashed)) state.over = true;
    }

    function drawLane(ctx, lane) {
      const roadX0 = laneRoadX(lane);
      const color = lane.index === 0 ? '#00f0ff' : '#ff2e9a';

      // road
      ctx.fillStyle = '#0a0f1e';
      ctx.fillRect(roadX0 + 10, 0, laneWidth - 20, H);
      ctx.strokeStyle = '#1c2540';
      ctx.lineWidth = 2;
      ctx.strokeRect(roadX0 + 10, 0, laneWidth - 20, H);

      // lane markings scroll
      ctx.strokeStyle = '#233055';
      ctx.setLineDash([20, 18]);
      ctx.lineDashOffset = -(lane.distance * 4) % 38;
      ctx.beginPath();
      ctx.moveTo(roadX0 + laneWidth / 2, 0);
      ctx.lineTo(roadX0 + laneWidth / 2, H);
      ctx.stroke();
      ctx.setLineDash([]);

      // obstacles
      lane.obstacles.forEach(o => {
        const oScreenX = roadX0 + laneWidth / 2 + o.x * (laneWidth / 2 - 10);
        ctx.fillStyle = '#ffb800';
        ctx.shadowColor = '#ffb800';
        ctx.shadowBlur = 10;
        ctx.fillRect(oScreenX - o.w / 2, o.y, o.w, 26);
        ctx.shadowBlur = 0;
      });

      // rider
      const carScreenX = roadX0 + laneWidth / 2 + lane.carX * (laneWidth / 2 - CAR_W / 2 - 10);
      const carTop = H - 110;
      const riderColor = lane.flash > 0 ? '#ff4757' : color;
      const lean = Math.max(-0.35, Math.min(0.35, lane.tilt * 0.3));
      drawRider(ctx, carScreenX, carTop + CAR_H, CAR_H, CAR_W, riderColor, lean);

      if (lane.crashed) {
        ctx.fillStyle = 'rgba(255,71,87,0.15)';
        ctx.fillRect(roadX0, 0, laneWidth, H);
      }
    }

    function drawRider(ctx, x, yBottom, height, width, color, lean) {
      ctx.save();
      ctx.translate(x, yBottom);
      ctx.rotate(lean);

      const wheelR = width * 0.2;
      const rearX = -width * 0.3, frontX = width * 0.3;
      const seatY = -height * 0.42;

      // wheels
      ctx.fillStyle = '#0e1424';
      [rearX, frontX].forEach(wx => {
        ctx.beginPath();
        ctx.arc(wx, -wheelR, wheelR, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      [rearX, frontX].forEach(wx => {
        ctx.beginPath();
        ctx.arc(wx, -wheelR, wheelR, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // frame connecting wheels up to the seat
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(rearX, -wheelR * 2);
      ctx.lineTo(0, seatY);
      ctx.lineTo(frontX, -wheelR * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // rider torso, leaning forward over the handlebars
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.save();
      ctx.translate(0, seatY);
      ctx.rotate(-0.35);
      ctx.fillRect(-6, -height * 0.32, 12, height * 0.32);
      ctx.restore();

      // head
      const headX = width * 0.08, headY = seatY - height * 0.36;
      ctx.beginPath();
      ctx.arc(headX, headY, width * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // arm reaching to the handlebar
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(headX, headY + width * 0.22);
      ctx.lineTo(frontX * 0.9, -wheelR * 2.4);
      ctx.stroke();

      ctx.restore();
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
      handleInput: handleInputReal,
      update,
      draw,
      get scores() { return state.scores; },
      get over() { return state.over; },
      winnerText() {
        if (mode === 'solo') return 'CRASHED — Distance: ' + Math.floor(lanes[0].distance);
        return lanes[0].distance === lanes[1].distance
          ? "IT'S A TIE!"
          : (lanes[0].distance > lanes[1].distance ? 'PLAYER 1 WINS!': 'PLAYER 2 WINS!');
      }
    };
  }
};
