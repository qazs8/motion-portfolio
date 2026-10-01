/* =========================================================
   黄帅帅 Sean · Motion Portfolio —— 交互与动效
   ========================================================= */
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => matchMedia('(max-width: 1199px)').matches;

  /* ---------- 弹簧曲线：用阻尼弹簧方程生成 CSS linear() ---------- */
  function springEasing(zeta, samples = 72) {
    const w = 6.5 / zeta;
    const wd = w * Math.sqrt(1 - zeta * zeta);
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const v = 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + (zeta * w / wd) * Math.sin(wd * t));
      pts.push(i === samples ? 1 : +v.toFixed(4));
    }
    return `linear(${pts.join(', ')})`;
  }
  const EASE = {
    spring: 'cubic-bezier(.34, 1.56, .64, 1)',
    soft: 'cubic-bezier(.22, 1.2, .36, 1)',
    snappy: 'cubic-bezier(.3, 1.35, .5, 1)',
    inOut: 'cubic-bezier(.65, 0, .35, 1)',
  };
  if (window.CSS && CSS.supports('transition-timing-function', 'linear(0, 1)')) {
    EASE.spring = springEasing(0.52);
    EASE.soft = springEasing(0.75);
    EASE.snappy = springEasing(0.64);
    root.style.setProperty('--spring', EASE.spring);
    root.style.setProperty('--spring-soft', EASE.soft);
    root.style.setProperty('--spring-snappy', EASE.snappy);
  }
  const animate = (el, frames, opts) => (reduceMotion ? null : el.animate(frames, opts));

  /* ---------- 提示气泡 ---------- */
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('show');
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const ok = await copyText(btn.dataset.copy);
    showToast(ok ? `已复制：${btn.dataset.copy}` : btn.dataset.copy);
  }));
  $$('[data-toast]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); showToast(el.dataset.toast); }));

  /* ---------- 导航：悬浮 + 当前板块高亮 ---------- */
  const nav = $('#nav');
  const navBtns = $$('.nav-btn', nav);
  const sections = navBtns.map(b => document.getElementById(b.dataset.target));
  let current = 'resume';
  let lockSpy = false;

  function setActive(id, fromClick = false) {
    if (id === current) return;
    current = id;
    navBtns.forEach(b => {
      const on = b.dataset.target === id;
      b.classList.toggle('is-active', on);
      if (on) {
        b.setAttribute('aria-current', 'true');
        animate(b, [{ transform: 'scale(.9)' }, { transform: 'scale(1)' }], { duration: 750, easing: EASE.spring });
      } else b.removeAttribute('aria-current');
    });
    if (fromClick) lockSpy = true;
  }

  function spy() {
    if (lockSpy) return;
    const line = innerHeight * 0.4;
    let id = sections[0].id;
    for (const s of sections) if (s.getBoundingClientRect().top <= line) id = s.id;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) id = sections[sections.length - 1].id;
    setActive(id);
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      nav.classList.toggle('is-floating', scrollY > 12);
      spy();
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true });

  function scrollToSection(id) {
    const el = document.getElementById(id);
    const offset = isMobile() ? 76 : 28;
    const top = id === 'resume' ? 0 : el.getBoundingClientRect().top + scrollY - offset;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    const release = () => { lockSpy = false; spy(); };
    if ('onscrollend' in window) addEventListener('scrollend', release, { once: true });
    else setTimeout(release, 900);
    setTimeout(() => { if (lockSpy) release(); }, 1600);
  }
  navBtns.forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    setActive(b.dataset.target, true);
    scrollToSection(b.dataset.target);
  }));
  $$('.chip[href^="#"], .tab-title').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (id === 'top') { window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); return; }
    const top = el.getBoundingClientRect().top + scrollY - (isMobile() ? 76 : 100);
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }));

  /* ---------- 滚动入场 + 数字滚动 ---------- */
  function countUp(el) {
    const end = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    if (reduceMotion) { el.textContent = end + suffix; return; }
    const dur = 1400, t0 = performance.now();
    const step = now => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(end * (p === 1 ? 1 : e)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = 0 + suffix;
    requestAnimationFrame(step);
  }
  const io = new IntersectionObserver(entries => {
    let i = 0;
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.style.setProperty('--d', `${Math.min(i++, 5) * 80}ms`);
      el.classList.add('in');
      $$('[data-count]', el).forEach(countUp);
      io.unobserve(el);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* ---------- 作品筛选：滑动指示块 + FLIP 重排 ---------- */
  const filters = $('.filters');
  const indicator = $('.filter-indicator', filters);
  const projectsWrap = $('.projects');
  const projects = $$('.project', projectsWrap);

  function moveIndicator(btn, instant) {
    if (instant) indicator.style.transition = 'none';
    indicator.style.width = `${btn.offsetWidth}px`;
    indicator.style.height = `${btn.offsetHeight}px`;
    indicator.style.transform = `translate(${btn.offsetLeft}px, ${btn.offsetTop}px)`;
    if (instant) { void indicator.offsetWidth; indicator.style.transition = ''; }
  }
  const activeFilter = () => $('.filter.is-active', filters);
  moveIndicator(activeFilter(), true);
  addEventListener('resize', () => moveIndicator(activeFilter(), true));
  if (document.fonts) document.fonts.ready.then(() => moveIndicator(activeFilter(), true));

  let filtering = Promise.resolve();
  function applyFilter(cat) {
    filtering = filtering.then(async () => {
      const match = p => cat === 'all' || p.dataset.cat === cat;
      const visible = projects.filter(p => !p.hidden);
      const first = new Map(visible.map(p => [p, p.getBoundingClientRect()]));
      const leaving = visible.filter(p => !match(p));
      if (!reduceMotion) {
        await Promise.all(leaving.map(p => p.animate(
          [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }],
          { duration: 220, easing: 'ease-in', fill: 'forwards' }).finished));
      }
      leaving.forEach(p => { p.hidden = true; p.getAnimations().forEach(a => a.cancel()); });
      const entering = projects.filter(p => p.hidden && match(p) && !leaving.includes(p));
      entering.forEach(p => { p.hidden = false; p.classList.add('in'); });
      if (reduceMotion) return;
      projects.filter(p => !p.hidden && first.has(p)).forEach(p => {
        const a = first.get(p), b = p.getBoundingClientRect();
        const dy = a.top - b.top;
        if (Math.abs(dy) > 1) p.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 900, easing: EASE.soft });
      });
      entering.forEach((p, i) => p.animate(
        [{ opacity: 0, transform: 'translateY(48px) scale(.95)' }, { opacity: 1, transform: 'none' }],
        { duration: 1000, delay: 60 + i * 110, easing: EASE.soft, fill: 'backwards' }));
    });
  }
  $$('.filter', filters).forEach(btn => btn.addEventListener('click', () => {
    if (btn.classList.contains('is-active')) return;
    $$('.filter', filters).forEach(b => { b.classList.toggle('is-active', b === btn); b.setAttribute('aria-selected', b === btn); });
    moveIndicator(btn);
    animate(indicator, [{ scale: '1 1' }, { scale: '1.06 .9' }, { scale: '1 1' }], { duration: 600, easing: 'ease-out' });
    applyFilter(btn.dataset.filter);
  }));

  /* ---------- 作品图集：圆形扩散切换（支持视频） ---------- */
  function makeMedia(thumb, alt) {
    if (thumb.dataset.kind === 'video') {
      const v = document.createElement('video');
      Object.assign(v, { src: thumb.dataset.src, poster: thumb.dataset.poster || '', muted: true, loop: true, playsInline: true, autoplay: true, controls: true });
      return v;
    }
    const img = new Image();
    img.src = thumb.dataset.src; img.alt = alt;
    return img;
  }
  $$('.project').forEach(project => {
    const main = $('.media-main', project);
    const thumbs = $$('.thumb', project);
    thumbs.forEach(thumb => thumb.addEventListener('click', () => {
      if (thumb.classList.contains('is-active')) return;
      thumbs.forEach(t => t.classList.toggle('is-active', t === thumb));
      const prev = main.lastElementChild;
      const next = makeMedia(thumb, prev ? prev.alt || '' : '');
      main.appendChild(next);
      main._latest = next;
      if (reduceMotion) { [...main.children].forEach(c => c !== next && c.remove()); return; }
      const mr = main.getBoundingClientRect(), tr = thumb.getBoundingClientRect();
      const x = ((tr.left + tr.width / 2 - mr.left) / mr.width) * 100;
      const y = ((tr.top + tr.height / 2 - mr.top) / mr.height) * 100;
      const anim = next.animate(
        [{ clipPath: `circle(0% at ${x}% ${y}%)` }, { clipPath: `circle(175% at ${x}% ${y}%)` }],
        { duration: 950, easing: EASE.inOut });
      if (prev) prev.animate([{ transform: 'scale(1)', filter: 'brightness(1)' }, { transform: 'scale(1.08)', filter: 'brightness(.7)' }], { duration: 950, easing: EASE.inOut, fill: 'forwards' });
      anim.finished.then(() => {
        if (main._latest !== next) return;
        [...main.children].forEach(c => c !== next && c.remove());
      });
    }));
  });

  /* ---------- 年度混剪：磁吸播放按钮 + 播放状态 ---------- */
  const reel = $('.reel');
  const play = $('.play', reel);
  const cover = $('.reel-cover', reel);
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine && !reduceMotion) {
    const pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    let raf = null;
    const loop = () => {
      // 半隐式欧拉弹簧：刚度 0.12、阻尼 0.72 —— 跟手但带一点回弹
      for (const k of ['x', 'y']) {
        vel[k] = (vel[k] + (target[k] - pos[k]) * 0.12) * 0.72;
        pos[k] += vel[k];
      }
      play.style.translate = `${pos.x.toFixed(2)}px ${pos.y.toFixed(2)}px`;
      cover.style.translate = `${(-pos.x * 0.12).toFixed(2)}px ${(-pos.y * 0.12).toFixed(2)}px`;
      const still = Math.abs(target.x - pos.x) < 0.05 && Math.abs(target.y - pos.y) < 0.05 && Math.abs(vel.x) < 0.05 && Math.abs(vel.y) < 0.05;
      raf = still ? null : requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    reel.addEventListener('pointermove', e => {
      const r = reel.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const max = Math.min(r.width, r.height) * 0.12;
      target.x = Math.max(-max, Math.min(max, dx * 0.22));
      target.y = Math.max(-max, Math.min(max, dy * 0.22));
      kick();
    });
    reel.addEventListener('pointerleave', () => { target.x = 0; target.y = 0; kick(); });
  }

  const timeEl = $('.reel-time b', reel);
  const TOTAL = 105; // 01:45
  let playing = false, elapsed = 0, last = 0, progRaf = null;
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  function tick(now) {
    elapsed = Math.min(TOTAL, elapsed + (now - last) / 1000); last = now;
    reel.style.setProperty('--prog', (elapsed / TOTAL).toFixed(4));
    timeEl.textContent = fmt(elapsed);
    if (elapsed >= TOTAL) { togglePlay(false); elapsed = 0; return; }
    progRaf = requestAnimationFrame(tick);
  }
  function togglePlay(force) {
    playing = typeof force === 'boolean' ? force : !playing;
    reel.classList.toggle('is-playing', playing);
    play.setAttribute('aria-label', playing ? '暂停' : '播放年度作品混剪');
    cancelAnimationFrame(progRaf);
    if (playing) { last = performance.now(); progRaf = requestAnimationFrame(tick); }
  }
  play.addEventListener('click', () => {
    const src = reel.dataset.video;
    if (src) {
      // 有真实视频时：替换封面为可控制的 <video>
      let v = $('video', reel);
      if (!v) {
        v = Object.assign(document.createElement('video'), { src, playsInline: true, controls: false });
        v.addEventListener('timeupdate', () => {
          reel.style.setProperty('--prog', (v.currentTime / (v.duration || 1)).toFixed(4));
          timeEl.textContent = fmt(v.currentTime);
        });
        v.addEventListener('ended', () => reel.classList.remove('is-playing'));
        cover.after(v);
      }
      if (v.paused) { v.play(); reel.classList.add('is-playing'); } else { v.pause(); reel.classList.remove('is-playing'); }
      return;
    }
    togglePlay();
    showToast(playing ? '示例播放中 · 替换 data-video 即可播放真实视频' : '已暂停');
  });

  /* ---------- 按下时的果冻回弹（卡片类元素） ---------- */
  if (!reduceMotion) {
    $$('.job, .duo-card, .edu-card').forEach(el => {
      el.addEventListener('pointerdown', () => animate(el, [{ transform: 'scale(1)' }, { transform: 'scale(.97)' }, { transform: 'scale(1)' }], { duration: 650, easing: EASE.spring }));
    });
  }

  onScroll();
})();
