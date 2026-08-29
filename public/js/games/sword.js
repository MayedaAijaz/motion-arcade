window.Games = window.Games || {};

window.Games.sword = {
  create(mode, canvas) {
    const W = canvas.width, H = canvas.height;
    const GROUND_Y = H - 90;

    const fighters = [
      { x: W * 0.28, health: 100, guarding: false, hitFlash: 0, attackFlash: 0, color: '#00f0ff' },
      { x: W * 0.72, health: 100, guarding: false, hitFlash: 0, attackFlash: 0, color: '#ff2e9a' }
    ];

    const state = { over: false, scores: { p1: 100, p2: 100 }, shake: 0 };

    // CPU state machine for solo mode
    const cpu = { state: 'idle', timer: randRange(0.9, 1.8) };

    function randRange(a, b) { return a + Math.random() * (b - a); }

    function handleInput(playerIndex, type, payload) {
      if (type === 'tilt' && playerIndex === 0) {
        fighters[0].guarding = !!payload.guard;
      }
      if (type === 'tilt' && playerIndex === 1 && mode === 'duo') {
        fighters[1].guarding = !!payload.guard;
      }
      if (type === 'swing') {
        if (playerIndex === 0) attack(0, 1, payload);
        if (playerIndex === 1 && mode === 'duo') attack(1, 0, payload);
      }
    }

    function attack(attackerIdx, defenderIdx, payload) {
      if (state.over) return;
      const attacker = fighters[attackerIdx];
      const defender = fighters[defenderIdx];
      attacker.attackFlash = 0.18;

      let damage = 12 + (payload?.power || 0.5) * 18;

      if (defenderIdx === 1 && mode === 'solo') {
        // CPU has a chance to parry if it's not mid-telegraph/attack
        if (cpu.state === 'idle' && Math.random() < 0.25) damage *= 0.15;
      } else if (defender.guarding) {
        damage *= 0.2;
      }

      defender.health = Math.max(0, defender.health - damage);
      defender.hitFlash = 0.35;
      state.shake = Math.min(18, state.shake + damage * 0.5);

      if (defender.health <= 0) state.over = true;
    }

    function updateCpu(dt) {
      if (state.over) return;
      cpu.timer -= dt;
      if (cpu.state === 'idle' && cpu.timer <= 0) {
        cpu.state = 'telegraph';
        cpu.timer = 0.55;
      } else if (cpu.state === 'telegraph' && cpu.timer <= 0) {
        cpu.state = 'attack';
        cpu.timer = 0.15;
        // Executes the hit — player should be guarding (tilted back) right now
        const dmg = fighters[0].guarding ? 3 : randRange(10, 18);
        fighters[0].health = Math.max(0, fighters[0].health - dmg);
        fighters[0].hitFlash = 0.35;
        state.shake = Math.min(18, state.shake + dmg * 0.5);
        fighters[1].attackFlash = 0.18;
        if (fighters[0].health <= 0) state.over = true;
      } else if (cpu.state === 'attack' && cpu.timer <= 0) {
        cpu.state = 'idle';
        cpu.timer = randRange(1.0, 2.0);
      }
    }

    function update(dt) {
      fighters.forEach(f => {
        f.hitFlash = Math.max(0, f.hitFlash - dt);
        f.attackFlash = Math.max(0, f.attackFlash - dt);
      });
      state.shake = Math.max(0, state.shake - dt * 40);
      state.scores.p1 = Math.round(fighters[0].health);
      state.scores.p2 = Math.round(fighters[1].health);
      if (mode === 'solo' && !state.over) updateCpu(dt);
    }

    function drawFighter(ctx, f, facing, telegraph) {
      const shakeX = (Math.random() - 0.5) * state.shake;
      const x = f.x + shakeX;
      const bodyColor = f.hitFlash > 0 ? '#ffffff' : f.color;

      ctx.save();
      ctx.translate(x, GROUND_Y);

      // guard shield glow
      if (f.guarding) {
        ctx.beginPath();
        ctx.arc(0, -70, 60, 0, Math.PI * 2);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // telegraph glow (CPU winding up)
      if (telegraph) {
        ctx.beginPath();
        ctx.arc(0, -70, 46, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffb800';
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // body
      ctx.fillStyle = bodyColor;
      ctx.shadowColor = bodyColor;
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, -128, 20, 0, Math.PI * 2); // head
      ctx.fill();
      ctx.fillRect(-16, -108, 32, 70); // torso

      // weapon arm — extends on attack
      const reach = f.attackFlash > 0 ? 46 : 14;
      ctx.fillRect(facing * 10, -100, facing * (reach), 10);

      ctx.shadowBlur = 0;
      ctx.restore();
    }

    function drawHealthBar(ctx, x, health, color, alignRight) {
      const w = 260, h = 16;
      const bx = alignRight ? x - w : x;
      ctx.fillStyle = '#0e1424';
      ctx.fillRect(bx, 24, w, h);
      ctx.fillStyle = color;
      const fillW = (health / 100) * w;
      ctx.fillRect(alignRight ? bx + (w - fillW) : bx, 24, fillW, h);
      ctx.strokeStyle = '#232c45';
      ctx.strokeRect(bx, 24, w, h);

      // numeric readout so a landed hit is unmistakable, not just a thin bar shift
      ctx.fillStyle = '#eaf2ff';
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = alignRight ? 'right' : 'left';
      ctx.fillText(Math.round(health) + ' HP', alignRight ? bx + w : bx, 55);
      ctx.textAlign = 'left';
    }

    function draw(ctx) {
      ctx.clearRect(0, 0, W, H);

      // arena floor
      ctx.strokeStyle = '#1c2540';
      ctx.beginPath(); ctx.moveTo(0, GROUND_Y + 4); ctx.lineTo(W, GROUND_Y + 4); ctx.stroke();

      drawHealthBar(ctx, 20, fighters[0].health, '#00f0ff', false);
      drawHealthBar(ctx, W - 20, fighters[1].health, '#ff2e9a', true);

      drawFighter(ctx, fighters[0], 1, false);
      drawFighter(ctx, fighters[1], -1, mode === 'solo' && cpu.state === 'telegraph');

      if (mode === 'solo' && cpu.state === 'telegraph') {
        ctx.fillStyle = '#ffb800';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ffb800';
        ctx.shadowBlur = 10;
        ctx.fillText('INCOMING — GUARD!', W / 2, 70);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
      }
    }

    return {
      handleInput,
      update,
      draw,
      get scores() { return state.scores; },
      get over() { return state.over; },
      winnerText() {
        if (mode === 'solo') return fighters[0].health > fighters[1].health ? 'YOU WIN THE DUEL!' : 'CPU WINS THE DUEL';
        return fighters[0].health > fighters[1].health ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!';
      }
    };
  }
};
