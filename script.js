(function () {
  const SEGMENTS = [
    { label: "SPIN\nAGAIN! 🎉",           color: ["#B5338A","#E040A0"],  textColor: "#FFF" },
    { label: "3 FREE\nVIDEO GAMES",      color: ["#1A5276","#2471A3"],  textColor: "#FFF" },
    { label: "SLICED\nBREAD",            color: ["#C47A1E","#E59B30"],  textColor: "#1a0800" },
    { label: "BETTER LUCK\nNEXT TIME",   color: ["#424242","#616161"],  textColor: "#FFD166" },
    { label: "A CAKE\nDESSERT",          color: ["#AD1457","#E91E8C"],  textColor: "#FFF" },
    { label: "BUY YOURSELF\nA DRINK",    color: ["#1B5E20","#2E7D32"],  textColor: "#FFF" },
    { label: "COLD\nMALT",               color: ["#0D47A1","#1565C0"],  textColor: "#FFF" },
    { label: "SPIN\nAGAIN! 🎉",          color: ["#7D0D0D","#C0392B"],  textColor: "#FFD166" },
    { label: "A PET\nCOKE",              color: ["#4A148C","#7B1FA2"],  textColor: "#FFD166" },
  ];

  const SEG_COUNT = SEGMENTS.length;
  const ANGLE_PER = 360 / SEG_COUNT;
  const PTR_ANG   = 270;

  let bag = [];
  let cycleCount = 0;

  function fisherYatesShuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function refillBag() {
    bag = fisherYatesShuffle(Array.from({ length: SEG_COUNT }, (_, i) => i));
    cycleCount++;
  }

  function drawFromBag() {
    if (bag.length === 0) refillBag();
    return bag.pop();
  }

  refillBag();

  let currentRot  = 0;
  let spinning    = false;
  let animFrame   = null;
  let lastTickSeg = -1;

  const canvas      = document.getElementById('wheelCanvas');
  const ctx         = canvas.getContext('2d');
  const spinBtn     = document.getElementById('spinButton');
  const prizeEl     = document.getElementById('prizeDisplay');
  const statusEl    = document.getElementById('statusMsg');
  const wheel3d     = document.getElementById('wheel3d');
  const particlesEl = document.getElementById('particles');

  (function () {
    const bg = document.getElementById('confettiBg');
    const cs = ['#FFD166','#06D6A0','#EF476F','#118AB2','#A855F7','#FB923C','#FFF'];
    for (let i = 0; i < 32; i++) {
      const s = document.createElement('span');
      const isCircle = Math.random() > .5;
      s.style.cssText = `
        left:${Math.random()*100}%;
        background:${cs[i % cs.length]};
        width:${5+Math.random()*7}px; height:${5+Math.random()*7}px;
        border-radius:${isCircle?'50%':'2px'};
        animation-duration:${8+Math.random()*14}s;
        animation-delay:${-Math.random()*14}s;
      `;
      bg.appendChild(s);
    }
  })();

  let audioCtx = null;
  function initAudio() {
    if (audioCtx) return;
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  function tone(f, dur, type='sine', vol=0.18, delay=0) {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime + delay;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.frequency.value = f;
      o.type = type;
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.start(now);
      o.stop(now + dur);
    } catch (e) {}
  }
  function playSpinStart() {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      o.frequency.setValueAtTime(320, now);
      o.frequency.exponentialRampToValueAtTime(1400, now + 0.38);
      g.gain.setValueAtTime(0.2, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      o.type = 'sawtooth';
      o.start(now);
      o.stop(now + 0.5);
    } catch (e) {}
  }
  function playTick() { tone(1200, .04, 'square', .06); }
  function playWin() {
    tone(1046, .22, 'sine', .18, 0);
    tone(1318, .25, 'sine', .16, .1);
    tone(1568, .3, 'sine', .14, .22);
    tone(2093, .35, 'sine', .12, .38);
    tone(2637, .4, 'sine', .10, .56);
  }

  const norm    = d => { d = d % 360; return d < 0 ? d + 360 : d; };
  const segIdx  = r => Math.floor(norm(PTR_ANG - r) / ANGLE_PER) % SEG_COUNT;
  const rotSeg  = i => norm(PTR_ANG - (i * ANGLE_PER + ANGLE_PER / 2));

  function drawWheel() {
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const R = W * .45;
    const rr = currentRot * Math.PI / 180;
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < SEG_COUNT; i++) {
      const sR = i * ANGLE_PER * Math.PI / 180 + rr;
      const eR = sR + ANGLE_PER * Math.PI / 180;
      const mR = sR + ANGLE_PER * Math.PI / 360;

      const grd = ctx.createLinearGradient(
        cx + Math.cos(sR) * R * .3, cy + Math.sin(sR) * R * .3,
        cx + Math.cos(sR) * R, cy + Math.sin(sR) * R
      );
      grd.addColorStop(0, SEGMENTS[i].color[0]);
      grd.addColorStop(1, SEGMENTS[i].color[1]);

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, sR, eR);
      ctx.closePath();
      ctx.fillStyle = grd;
      ctx.fill();

      const sh = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      sh.addColorStop(0, 'rgba(255,255,255,0.16)');
      sh.addColorStop(.5, 'rgba(255,255,255,0.04)');
      sh.addColorStop(1, 'rgba(0,0,0,0.14)');
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, sR, eR);
      ctx.closePath();
      ctx.fillStyle = sh;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sR) * R, cy + Math.sin(sR) * R);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(mR);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fs = Math.min(16, Math.max(10, R * .086));
      ctx.font = `700 ${fs}px 'Outfit',sans-serif`;
      const lines = SEGMENTS[i].label.split('\n');
      const lh = fs * 1.3;
      const tH = (lines.length - 1) * lh;
      const tR = R * .64;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      lines.forEach((l, j) => ctx.fillText(l, tR + 1, -tH / 2 + j * lh + 1));
      ctx.fillStyle = SEGMENTS[i].textColor;
      lines.forEach((l, j) => ctx.fillText(l, tR, -tH / 2 + j * lh));
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, R + 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,200,80,0.35)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const hub = ctx.createRadialGradient(cx - R * .03, cy - R * .03, R * .01, cx, cy, R * .13);
    hub.addColorStop(0, '#FFF5CC');
    hub.addColorStop(.4, '#FFD166');
    hub.addColorStop(.8, '#B8860B');
    hub.addColorStop(1, '#5C3D00');
    ctx.beginPath();
    ctx.arc(cx, cy, R * .13, 0, Math.PI * 2);
    ctx.fillStyle = hub;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, R * .13, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R * .07, 0, Math.PI * 2);
    ctx.fillStyle = '#7A4A00';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx - R * .03, cy - R * .03, R * .025, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.font = `${Math.round(R * .1)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('❤', 0, 0);
    ctx.restore();
  }

  function burst(x, y) {
    const cs = ['#FFD166','#06D6A0','#EF476F','#118AB2','#fff','#FB923C'];
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const sz = 6 + Math.random() * 11;
      const a = Math.random() * Math.PI * 2;
      const d = 90 + Math.random() * 180;
      p.style.cssText = `left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;` +
        `background:${cs[Math.floor(Math.random() * cs.length)]};` +
        `--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d - 70}px;` +
        `animation-duration:${.8 + Math.random() * .7}s;animation-delay:${Math.random() * .12}s;`;
      particlesEl.appendChild(p);
      setTimeout(() => p.remove(), 2000);
    }
  }

  function addRipple() {
    const r = document.createElement('div');
    r.className = 'wheel-ripple';
    wheel3d.appendChild(r);
    setTimeout(() => r.remove(), 1000);
  }

  function easePos(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const a = .38;
    if (t <= a) return (t * t) / a;
    const F = u => (2 / (1 - a)) * (u - u * u / 2);
    return a + F(t) - F(a);
  }

  function startSpin() {
    if (spinning) return;
    initAudio();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().then(doSpin);
      return;
    }
    doSpin();
  }

  function doSpin() {
    playSpinStart();
    addRipple();
    const ti = drawFromBag();
    const tRot = rotSeg(ti);
    const sRot = norm(currentRot);
    let delta = tRot - sRot;
    if (delta < 0) delta += 360;
    const total = delta + (9 + Math.floor(Math.random() * 6)) * 360;
    const r0 = currentRot;
    const t0 = performance.now();
    const DUR = 4200 + Math.random() * 1200;

    spinning = true;
    spinBtn.disabled = true;
    wheel3d.classList.add('spinning');
    statusEl.className = 'status active';
    statusEl.textContent = '🎊 Spinning... fingers crossed!';
    prizeEl.className = 'prize-value';
    lastTickSeg = segIdx(currentRot);

    function frame(now) {
      const t = Math.min(1, (now - t0) / DUR);
      currentRot = r0 + total * easePos(t);
      drawWheel();
      const cs = segIdx(currentRot);
      if (cs !== lastTickSeg) { playTick(); lastTickSeg = cs; }
      if (t < 1) {
        animFrame = requestAnimationFrame(frame);
      } else {
        currentRot = norm(tRot);
        drawWheel();
        wheel3d.classList.remove('spinning');
        spinning = false;
        animFrame = null;
        spinBtn.disabled = false;
        const prize = SEGMENTS[ti].label.replace(/\n/g, ' ');
        prizeEl.textContent = prize;
        prizeEl.className = 'prize-value revealed';
        statusEl.className = 'status done';

        if (prize.includes('SPIN AGAIN')) {
          statusEl.textContent = '🔄 Lucky you — spinning again!';
          setTimeout(startSpin, 1300);
        } else {
          spinAllowed = false;
          markSpun(prize);
          if (prize.includes('BETTER LUCK')) {
            statusEl.textContent = "😊 Don't worry — thanks for spinning!";
            playWin();
          } else {
            statusEl.textContent = '🎉 Congrats! Please collect your reward at the counter.';
            playWin();
            const rc = canvas.getBoundingClientRect();
            const bx = rc.left + rc.width / 2;
            const by = rc.top + rc.height / 2;
            burst(bx, by);
            setTimeout(() => burst(bx - 50, by - 30), 220);
            setTimeout(() => burst(bx + 50, by - 30), 420);
          }
          setTimeout(() => {
            spinBtn.disabled = true;
            spinBtn.textContent = '🔒  Already Claimed';
            spinBtn.style.cssText += ';background:linear-gradient(135deg,#333,#1a1a1a)!important;box-shadow:none;color:rgba(255,255,255,0.35);cursor:not-allowed;';
          }, 1800);
        }
      }
    }
    animFrame = requestAnimationFrame(frame);
  }

  const STORAGE_PERIOD = 'cad_spin_period';
const STORAGE_PRIZE   = 'cad_spin_prize';

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function hasSpun() {
  try { return localStorage.getItem(STORAGE_PERIOD) === currentPeriod(); } catch (e) { return false; }
}

function markSpun(prize) {
  try {
    localStorage.setItem(STORAGE_PERIOD, currentPeriod());
    localStorage.setItem(STORAGE_PRIZE, prize);
  } catch (e) {}
}

  function showLockedState(prize) {
    spinBtn.disabled = true;
    spinBtn.textContent = '🔒  Already Claimed';
    spinBtn.style.cssText += ';background:linear-gradient(135deg,#333,#1a1a1a)!important;box-shadow:none;color:rgba(255,255,255,0.35);cursor:not-allowed;';
    prizeEl.textContent = prize || '—';
    prizeEl.className = 'prize-value revealed';
    statusEl.className = 'status done';
    statusEl.textContent = '✅ You have already claimed your gift on this device.';
  }

  let spinAllowed = !hasSpun();

  spinBtn.addEventListener('click', e => {
    e.preventDefault();
    if (!spinAllowed) return;
    startSpin();
  });

  canvas.addEventListener('click', () => {
    if (!spinning && spinAllowed) startSpin();
  });

  window.addEventListener('load', () => {
    currentRot = Math.random() * 360;
    drawWheel();
    if (hasSpun()) {
      const saved = (() => { try { return localStorage.getItem(STORAGE_PRIZE); } catch (e) { return null; } })();
      showLockedState(saved);
    }
  });
  window.addEventListener('resize', drawWheel);
})();
