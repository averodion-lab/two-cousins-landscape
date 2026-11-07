/* Set this to the URL that receives the estimate form as JSON, e.g. a Formspree
   form. Until it's set the form says so instead of pretending to send. */
const FORM_ENDPOINT = '';

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Header turns solid once the page has scrolled */
const nav = $('#nav');
new IntersectionObserver(([entry]) => {
  nav.classList.toggle('is-solid', !entry.isIntersecting);
  $('#totop').classList.toggle('is-on', !entry.isIntersecting);
}, { rootMargin: '60px 0px 0px 0px' }).observe($('#top'));

/* Mobile menu */
const burger = $('#burger');
const menu = $('#menu');
function setMenu(open) {
  menu.hidden = !open;
  nav.classList.toggle('menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.style.overflow = open ? 'hidden' : '';
}
burger.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
});
matchMedia('(min-width: 1181px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* Rise-in reveals: headings move as words, everything else as blocks */
const revealer = new IntersectionObserver((entries) => {
  entries.filter((e) => e.isIntersecting).forEach((e) => {
    e.target.classList.add('is-in');
    revealer.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -8% 0px' });
$$('.reveal, .words').forEach((el) => revealer.observe(el));

/* Process timeline: the line fills with scroll and lights each step it reaches */
$$('.steps').forEach((steps) => {
  const items = $$('.step', steps);
  let queued = false;
  const paint = () => {
    queued = false;
    const box = steps.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (innerHeight * 0.68 - box.top) / box.height));
    steps.style.setProperty('--p', progress.toFixed(4));
    items.forEach((item) => {
      const dot = item.offsetTop / steps.offsetHeight;
      item.classList.toggle('is-on', progress >= dot || progress === 1);
    });
  };
  const request = () => {
    if (!queued) { queued = true; requestAnimationFrame(paint); }
  };
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      addEventListener('scroll', request, { passive: true });
      addEventListener('resize', request);
      request();
    } else {
      removeEventListener('scroll', request);
      removeEventListener('resize', request);
      request();
    }
  }).observe(steps);
  paint();
});

/* Autoplaying video: silent and inline so phones allow it, paused off screen to
   save battery. If a phone still blocks it (iOS Low Power Mode), it starts on the
   next touch, and the play button is always there. */
const stage = $('#film');
if (stage) {
  const video = $('video', stage);
  const playBtn = $('[data-play]', stage);
  const soundBtn = $('[data-sound]', stage);
  let userPaused = reducedMotion;
  let inView = false;
  video.muted = true;
  if (userPaused) video.removeAttribute('autoplay');

  const sync = () => {
    stage.classList.toggle('is-paused', video.paused);
    playBtn.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
    stage.classList.toggle('has-sound', !video.muted);
    soundBtn.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
  };
  const start = () => { if (inView && !userPaused && video.paused) video.play().catch(sync); };
  ['play', 'pause', 'volumechange'].forEach((ev) => video.addEventListener(ev, sync));
  video.addEventListener('canplay', start);
  playBtn.addEventListener('click', () => {
    userPaused = !video.paused;
    if (video.paused) video.play().catch(sync);
    else video.pause();
  });
  soundBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    if (!video.muted) { userPaused = false; video.play().catch(sync); }
  });
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) {
      // The file only downloads as the video gets close, which keeps first load light.
      if (!video.src) { video.src = video.dataset.src; video.load(); }
      start();
    } else if (video.src) {
      video.pause();
    }
  }, { rootMargin: '300px 0px' }).observe(stage);
  ['touchstart', 'pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, start, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  sync();
}

/* Before / after sliders: drag anywhere on the image. The hidden range input
   stays for keyboard users. Vertical swipes still scroll the page. */
$$('.compare').forEach((compare) => {
  const input = $('input', compare);
  const setPos = (value) => {
    input.value = value;
    compare.style.setProperty('--pos', input.value + '%');
  };
  const fromPointer = (e) => {
    const box = compare.getBoundingClientRect();
    setPos(((e.clientX - box.left) / box.width) * 100);
  };
  let start = null;
  let sliding = false;
  compare.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY };
    compare.setPointerCapture(e.pointerId);
    // A mouse moves the slider at once. A touch might be a scroll, so wait to see.
    sliding = e.pointerType === 'mouse';
    if (sliding) fromPointer(e);
  });
  compare.addEventListener('pointermove', (e) => {
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    if (!sliding && dx > 6 && dx > dy) sliding = true;
    if (sliding) fromPointer(e);
  });
  compare.addEventListener('pointerup', (e) => {
    if (!start) return;
    const tapped = Math.abs(e.clientX - start.x) < 6 && Math.abs(e.clientY - start.y) < 6;
    if (sliding || tapped) fromPointer(e);
    start = null;
  });
  compare.addEventListener('pointercancel', () => { start = null; });
  input.addEventListener('input', () => setPos(input.value));
});

/* Work page: gallery filters and full-size view */
const gallery = $('#gallery');
if (gallery) {
  const tiles = $$('button', gallery);
  const filters = $$('#filters button');
  filters.forEach((btn) => btn.addEventListener('click', () => {
    filters.forEach((other) => other.setAttribute('aria-pressed', String(other === btn)));
    tiles.forEach((tile) => {
      tile.hidden = btn.dataset.f !== 'all' && !tile.dataset.c.split(' ').includes(btn.dataset.f);
    });
  }));
  tiles.forEach((tile) => tile.addEventListener('click', () => {
    const box = document.createElement('button');
    box.className = 'lightbox';
    box.type = 'button';
    box.setAttribute('aria-label', 'Close photo');
    const thumb = $('img', tile);
    const full = new Image();
    full.src = thumb.getAttribute('src');
    full.alt = thumb.alt;
    box.append(full);
    const close = () => {
      box.remove();
      removeEventListener('keydown', onKey);
      tile.focus();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    box.addEventListener('click', close);
    addEventListener('keydown', onKey);
    document.body.append(box);
    box.focus();
  }));
}

/* Contact page: estimate form, with the project pre-selected from service links */
const form = $('#estimate');
if (form) {
  const wanted = new URLSearchParams(location.search).get('project');
  if (wanted) form.elements.service.value = wanted;

  const statusEl = $('#formStatus');
  const rules = {
    name: (v) => (v.trim() ? '' : 'Please enter your name.'),
    phone: (v) => (v.replace(/\D/g, '').length >= 10 ? '' : 'Please enter a 10-digit phone number so we can call you back.'),
    email: (v) => (!v.trim() || /^\S+@\S+\.\S+$/.test(v.trim()) ? '' : 'That email looks incomplete. Check it, or leave it blank.'),
  };
  const validate = (input) => {
    const message = rules[input.name](input.value);
    $('#e-' + input.name).textContent = message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !message;
  };
  Object.keys(rules).forEach((name) => {
    const input = form.elements[name];
    input.addEventListener('blur', () => { if (input.value) validate(input); });
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) validate(input); });
  });
  const setStatus = (message, ok) => {
    statusEl.textContent = message;
    statusEl.className = 'form-status ' + (ok ? 'is-ok' : 'is-bad');
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = Object.keys(rules).map((n) => form.elements[n]).filter((i) => !validate(i));
    if (invalid.length) { invalid[0].focus(); return; }

    if (!FORM_ENDPOINT) {
      setStatus('This form is not connected yet, so your request was not sent. Please call 470-469-9943.', false);
      return;
    }
    const button = $('button[type="submit"]', form);
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending...';
    statusEl.textContent = '';
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      if (!res.ok) throw new Error(res.status);
      form.reset();
      setStatus('Thanks, your request was sent.', true);
    } catch {
      setStatus('Your request did not go through. Try again, or call 470-469-9943.', false);
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });
}

/* Hide the sticky mobile buttons where they'd repeat what's already on screen */
const mobileCta = $('#mobileCta');
const inViewNow = new Set();
const ctaWatcher = new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? inViewNow.add(e.target) : inViewNow.delete(e.target)));
  mobileCta.classList.toggle('is-hidden', inViewNow.size > 0);
}, { threshold: 0.1 });
$$('.hero, #estimate').forEach((el) => ctaWatcher.observe(el));

$('#year').textContent = new Date().getFullYear();
