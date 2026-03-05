// year
document.getElementById('year').textContent = new Date().getFullYear();

// mobile nav removed (no dropdown on mobile)

// mode switch + chat swap + theme-color
(() => {
  const root = document.documentElement;
  const buttons = Array.from(document.querySelectorAll('.modeSwitch__btn'));
  const chats = Array.from(document.querySelectorAll('.chatCard[data-chat]'));
  const theme = document.querySelector('meta[name="theme-color"]');

  const KEY = 'candidate_mode_v5'; // candidate | recruiter
  const valid = new Set(['candidate', 'recruiter']);

  const apply = (mode, {animate=false} = {}) => {
    if (!valid.has(mode)) mode = 'candidate';

    root.setAttribute('data-mode', mode);

    buttons.forEach(b => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });

    chats.forEach(c => {
      c.hidden = c.dataset.chat !== mode;
    });

    if (theme) theme.setAttribute('content', mode === 'recruiter' ? '#fff1f7' : '#eef6ff');

    if (animate) {
      const active = buttons.find(b => b.dataset.mode === mode);
      if (active) {
        active.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(0.985)' }, { transform: 'scale(1)' }],
          { duration: 180, easing: 'ease-out' }
        );
      }
    }

    // update neural palette
    window.__neuralSetMode?.(mode);
  };

  const saved = localStorage.getItem(KEY);
  apply(valid.has(saved) ? saved : 'candidate');

  buttons.forEach(b => {
    b.addEventListener('click', () => {
      const mode = b.dataset.mode;
      localStorage.setItem(KEY, mode);
      apply(mode, {animate:true});
    });
  });
})();

// payment modal
(() => {
  const modal = document.getElementById('payModal');
  const openBtn = document.getElementById('openPay');
  if (!modal || !openBtn) return;

  const open = () => modal.setAttribute('aria-hidden', 'false');
  const close = () => modal.setAttribute('aria-hidden', 'true');

  openBtn.addEventListener('click', open);
  modal.addEventListener('click', (e) => {
    const el = e.target;
    if (el && el.getAttribute && el.getAttribute('data-close') === 'true') close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
})();

// reveal on scroll
(() => {
  const items = Array.from(document.querySelectorAll('.reveal'));
  if (!items.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  items.forEach(el => io.observe(el));
})();

// neural background (lightweight)
(() => {
  const canvas = document.getElementById('neural');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  const MOTION_MULT = 0.55;
const state = {
    mode: document.documentElement.getAttribute('data-mode') || 'candidate',
    dpr: Math.min(2, window.devicePixelRatio || 1),
    w: 0, h: 0,
    nodes: [],
    t: 0,
    pointer: { x: 0, y: 0, active: false, down: false, kick: 0 },
  };

  const palette = (mode) => {
    if (mode === 'recruiter') {
      return {
        base: [255, 77, 166],
        accent: [255, 125, 107],
        alt: [106, 77, 255], // a few contrasting nodes
        alpha: 0.28,
        link: 0.12,
      };
    }
    return {
      base: [47, 107, 255],
      accent: [106, 77, 255],
      alt: [255, 77, 166],
      alpha: 0.26,
      link: 0.12,
    };
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    state.w = Math.max(1, Math.floor(rect.width));
    state.h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(state.w * state.dpr);
    canvas.height = Math.floor(state.h * state.dpr);
    canvas.style.width = state.w + 'px';
    canvas.style.height = state.h + 'px';
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

    const target = Math.round((state.w * state.h) / 24000); // density
    const count = Math.max(32, Math.min(140, target));
    state.nodes = Array.from({ length: count }, () => makeNode(true));
  };

  const makeNode = (randomize = false) => {
    const p = palette(state.mode);
    const x = randomize ? Math.random() * state.w : Math.random() * state.w;
    const y = randomize ? Math.random() * state.h : Math.random() * state.h;
    const r = 1.1 + Math.random() * 2.4;
    const sp = 0.08 + Math.random() * 0.22;
    const a = (Math.random() < 0.08) ? 1 : (Math.random() < 0.20 ? 0.65 : 0.35);
    const hue = (Math.random() < 0.14) ? 'alt' : (Math.random() < 0.28 ? 'accent' : 'base');
    return {
      x, y,
      vx: (Math.random() - 0.5) * sp,
      vy: (Math.random() - 0.5) * sp,
      r,
      bright: a,
      hue,
      tw: Math.random() * Math.PI * 2,
    };
  };

  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;

  const step = () => {
    state.t += 1;
    if (state.pointer.kick > 0) {
      state.pointer.kick *= 0.90;
      if (state.pointer.kick < 0.02) state.pointer.kick = 0;
    }


    const p = palette(state.mode);
    ctx.clearRect(0, 0, state.w, state.h);

    // subtle glow wash
    const g = ctx.createRadialGradient(state.w * 0.18, state.h * 0.08, 0, state.w * 0.18, state.h * 0.08, Math.max(state.w, state.h) * 0.8);
    g.addColorStop(0, rgba(p.base, 0.09));
    g.addColorStop(1, rgba(p.base, 0.0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, state.w, state.h);

    // links
    const linkDist = Math.min(190, Math.max(120, Math.round(Math.min(state.w, state.h) * 0.22)));
    for (let i = 0; i < state.nodes.length; i++) {
      const a = state.nodes[i];
      for (let j = i + 1; j < state.nodes.length; j++) {
        const b = state.nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > linkDist * linkDist) continue;

        const d = Math.sqrt(d2);
        const strength = (1 - d / linkDist);
        const alpha = p.link * strength * strength;

        ctx.strokeStyle = rgba(p.base, alpha);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // nodes
    for (const n of state.nodes) {
      // pointer repulsion (mouse/touch)
      if (state.pointer.active) {
        const dxp = n.x - state.pointer.x;
        const dyp = n.y - state.pointer.y;
        const d2 = dxp*dxp + dyp*dyp;
        const r = 140;
        if (d2 < r*r) {
          const d = Math.sqrt(d2) || 0.0001;
          const t = 1 - (d / r);
          const power = (0.55 + (state.pointer.down ? 0.6 : 0)) * t * t;
          n.vx += (dxp / d) * power;
          n.vy += (dyp / d) * power;
        }
      }

      // click/tap burst
      if (state.pointer.kick > 0) {
        const dxk = n.x - state.pointer.x;
        const dyk = n.y - state.pointer.y;
        const d2k = dxk*dxk + dyk*dyk;
        const rr = 220;
        if (d2k < rr*rr) {
          const dk = Math.sqrt(d2k) || 0.0001;
          const amp = (1 - dk/rr) * 1.4 * state.pointer.kick;
          n.vx += (dxk/dk) * amp + (Math.random() - 0.5) * 0.1375;
          n.vy += (dyk/dk) * amp + (Math.random() - 0.5) * 0.1375;
        }
      }

      n.x += n.vx * MOTION_MULT;
      n.y += n.vy * MOTION_MULT;

      // bounce
      if (n.x < -20 || n.x > state.w + 20) n.vx *= -1;
      if (n.y < -20 || n.y > state.h + 20) n.vy *= -1;

      const wobble = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((state.t * 0.01) + n.tw));
      const r = n.r * (0.9 + 0.25 * wobble);

      const col = n.hue === 'accent' ? p.accent : (n.hue === 'alt' ? p.alt : p.base);
      const a = p.alpha * (0.6 + 0.9 * n.bright);

      // glow
      ctx.fillStyle = rgba(col, a);
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      if (n.bright > 0.8) {
        ctx.fillStyle = rgba(col, a * 0.55);
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    requestAnimationFrame(step);
  };

  window.__neuralSetMode = (mode) => { state.mode = mode; };

  window.addEventListener('resize', resize, { passive: true });
  resize();
const setPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    // IMPORTANT: keep coordinates in CSS pixels (same space as n.x/n.y),
    // because ctx is already scaled via ctx.setTransform(dpr,...)
    state.pointer.x = (e.clientX - r.left);
    state.pointer.y = (e.clientY - r.top);
    state.pointer.active = true;
  };

  // Canvas has pointer-events:none (so it can't receive events). Listen on window instead.
  window.addEventListener("pointermove", (e) => { setPointer(e); }, { passive: true });
  window.addEventListener("mousemove", (e) => { setPointer(e); }, { passive: true });
  window.addEventListener("touchmove", (e) => {
    const t = e.touches && e.touches[0];
    if (!t) return;
    setPointer({ clientX: t.clientX, clientY: t.clientY });
  }, { passive: true });

  window.addEventListener("pointerdown", (e) => {
    setPointer(e);
    state.pointer.down = true;
    state.pointer.kick = 1;
  }, { passive: true });

  window.addEventListener("pointerup", () => { state.pointer.down = false; }, { passive: true });
  window.addEventListener("blur", () => { state.pointer.active = false; }, { passive: true });

  requestAnimationFrame(step);
})();
