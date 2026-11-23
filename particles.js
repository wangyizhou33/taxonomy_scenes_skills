(function () {
  'use strict';

  window.mountAtlasParticles = function (canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const hero = canvas.parentElement;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const turn = Math.PI * 2;
    let highlight;
    let secondary;
    let glowColor;
    let lastTime = 0;
    let width = 0;
    let height = 0;
    let visible = false;
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let offsetX = 0;
    let offsetY = 0;

    const stars = Array.from({ length: 88 }, (_, i) => ({
      x: ((i * 0.618033) % 1),
      y: ((i * 0.417217) % 1),
      size: i % 13 === 0 ? 1.8 : .65 + (i % 5) * .17
    }));

    function dot(x, y, radius, color, opacity) {
      ctx.fillStyle = `rgba(${color}, ${opacity})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, turn);
      ctx.fill();
    }

    function paint(time) {
      lastTime = time;
      ctx.clearRect(0, 0, width, height);
      if (!width || !height) return;
      offsetX += (pointerX - offsetX) * .06;
      offsetY += (pointerY - offsetY) * .06;

      const cx = width * .76 + offsetX * 14;
      const cy = height * .51 + offsetY * 11;
      const radius = Math.min(width * .19, height * .63);
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius * 1.8);
      glow.addColorStop(0, `rgba(${glowColor}, .16)`);
      glow.addColorStop(.53, `rgba(${glowColor}, .08)`);
      glow.addColorStop(1, `rgba(${glowColor}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      for (const [i, star] of stars.entries()) {
        const opacity = (.18 + .25 * (1 + Math.sin(time * 1.2 + i)) / 2) * star.x;
        dot(width * (.41 + .59 * star.x), height * star.y, star.size, i % 3 ? secondary : highlight, opacity);
      }

      for (let ring = 0; ring < 4; ring++) {
        const tilt = -.59 + ring * .42;
        const major = radius * (1 + ring * .15);
        const minor = radius * (.39 + ring * .055);
        ctx.strokeStyle = `rgba(${ring === 1 ? highlight : secondary}, ${ring === 1 ? '.34' : '.24'})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, major, minor, tilt, 0, turn);
        ctx.stroke();
        for (let i = 0; i < 5; i++) {
          const angle = i * 1.43 + ring * 2 + time * (.23 + ring * .04);
          const x = Math.cos(angle) * major;
          const y = Math.sin(angle) * minor;
          const px = cx + x * Math.cos(tilt) - y * Math.sin(tilt);
          const py = cy + x * Math.sin(tilt) + y * Math.cos(tilt);
          const color = i % 2 ? secondary : highlight;
          if (i === 0) dot(px, py, 7, color, .14);
          dot(px, py, i === 0 ? 2.8 : 1.5, color, i === 0 ? .94 : .55);
        }
      }

      for (let i = 0; i < 78; i++) {
        const y = 1 - (2 * i + 1) / 78;
        const slice = Math.sqrt(1 - y * y);
        const angle = i * 2.399963 + time * .23;
        const x = Math.cos(angle) * slice;
        const z = Math.sin(angle) * slice;
        const size = radius * .51;
        dot(cx + (x + y * .13) * size, cy + (y - x * .13) * size, 1.05 + (z + 1) * .25, z > .18 ? highlight : secondary, .22 + (z + 1) * .31);
      }
    }

    function tick(time) {
      paint(time / 1000);
      frame = window.requestAnimationFrame(tick);
    }

    function syncMotion() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (visible && !reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(tick);
      else paint(0);
    }

    function resize() {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      if (!frame) paint(0);
    }

    function refreshPalette() {
      const bright = document.documentElement.dataset.theme === 'bright';
      highlight = bright ? '75, 77, 85' : '248, 248, 250';
      secondary = bright ? '109, 114, 128' : '172, 172, 176';
      glowColor = bright ? '136, 145, 163' : '221, 221, 224';
      paint(lastTime);
    }

    refreshPalette();
    hero.addEventListener('pointermove', event => {
      if (reducedMotion.matches) return;
      const bounds = hero.getBoundingClientRect();
      pointerX = (event.clientX - bounds.left) / bounds.width - .5;
      pointerY = (event.clientY - bounds.top) / bounds.height - .5;
    });
    hero.addEventListener('pointerleave', () => { pointerX = pointerY = 0; });
    reducedMotion.addEventListener('change', () => {
      pointerX = pointerY = offsetX = offsetY = 0;
      syncMotion();
    });
    document.addEventListener('visibilitychange', syncMotion);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(resize).observe(hero);
    else window.addEventListener('resize', resize);
    if (typeof IntersectionObserver !== 'undefined') {
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        syncMotion();
      }).observe(hero);
    } else {
      visible = true;
      syncMotion();
    }
    resize();
    return refreshPalette;
  };
})();
