/* ---------------------------------------------------------------
   BUSINESS DETAILS: fill these in before going live.
   phone         shown in the header, contact section and footer
                 (nothing is shown while it's empty), e.g. "(555) 123-4567"
   formEndpoint  URL that receives the estimate form as JSON, e.g. a
                 Formspree form. Until it's set the form says so
                 instead of pretending to send.
---------------------------------------------------------------- */
const SITE = {
  phone: '',
  formEndpoint: '',
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Phone number */
if (SITE.phone) {
  const tel = 'tel:' + SITE.phone.replace(/[^\d+]/g, '');
  $$('[data-phone]').forEach((a) => {
    a.textContent = SITE.phone;
    a.href = tel;
    a.hidden = false;
  });
  const band = $('[data-phone-band]');
  band.href = tel;
  $('[data-phone-text]').textContent = SITE.phone;
}

/* Mobile menu */
const burger = $('#burger');
const menu = $('#menu');
function setMenu(open) {
  menu.hidden = !open;
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.style.overflow = open ? 'hidden' : '';
}
burger.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
});
matchMedia('(min-width: 1241px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

/* Scroll reveal, staggered within each batch */
const revealer = new IntersectionObserver((entries) => {
  entries.filter((e) => e.isIntersecting).forEach((e, i) => {
    e.target.style.transitionDelay = `${i * 60}ms`;
    e.target.classList.add('is-in');
    revealer.unobserve(e.target);
  });
}, { rootMargin: '0px 0px -6% 0px' });
$$('.reveal').forEach((el) => revealer.observe(el));

/* Highlight the current section in the nav */
const navLinks = $$('.nav-links a');
const spy = new IntersectionObserver((entries) => {
  entries.filter((e) => e.isIntersecting).forEach((e) => {
    navLinks.forEach((a) => a.classList.toggle('is-active', a.hash === '#' + e.target.id));
  });
}, { rootMargin: '-45% 0px -50% 0px' });
navLinks.forEach((a) => { const t = $(a.hash); if (t) spy.observe(t); });

/* Video players: play in view, pause out of view, one with sound at a time */
const players = $$('.vid').map((root) => {
  const video = $('video', root);
  const play = $('[data-play]', root);
  const sound = $('[data-sound]', root);
  const player = { root, video, userPaused: reducedMotion };

  const sync = () => {
    root.classList.toggle('is-paused', video.paused);
    play.setAttribute('aria-label', video.paused ? 'Play video' : 'Pause video');
    root.classList.toggle('has-sound', !video.muted);
    sound.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
  };
  ['play', 'pause', 'volumechange'].forEach((ev) => video.addEventListener(ev, sync));

  play.addEventListener('click', () => {
    player.userPaused = !video.paused;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  });
  sound.addEventListener('click', () => {
    const on = video.muted;
    players.forEach((p) => { p.video.muted = true; });
    video.muted = !on;
    if (on) {
      player.userPaused = false;
      video.play().catch(() => {});
    }
  });

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !player.userPaused) video.play().catch(sync);
    else if (!entry.isIntersecting) video.pause();
  }, { threshold: 0.3 }).observe(root);

  sync();
  return player;
});

/* Chapters for the film section */
const film = players.find((p) => p.root.dataset.vid === 'film');
const chapterBtns = $$('#chapters button');
function paintChapters() {
  const t = film.video.currentTime;
  chapterBtns.forEach((btn) => {
    const start = +btn.dataset.t;
    const end = +btn.dataset.end;
    const active = t >= start && t < end;
    btn.toggleAttribute('aria-current', active);
    if (active) btn.setAttribute('aria-current', 'true');
    btn.style.setProperty('--p', active ? (t - start) / (end - start) : t >= end ? 1 : 0);
  });
}
let raf = 0;
function tick() { paintChapters(); raf = requestAnimationFrame(tick); }
film.video.addEventListener('play', () => { cancelAnimationFrame(raf); tick(); });
film.video.addEventListener('pause', () => cancelAnimationFrame(raf));
film.video.addEventListener('seeked', paintChapters);
chapterBtns.forEach((btn) => btn.addEventListener('click', () => {
  film.video.currentTime = +btn.dataset.t + 0.05;
  film.userPaused = false;
  film.video.play().catch(() => {});
  if (matchMedia('(max-width: 860px)').matches) {
    film.root.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}));
paintChapters();

/* Before / after slider */
const compare = $('#compare');
$('input', compare).addEventListener('input', (e) => {
  compare.style.setProperty('--pos', e.target.value + '%');
});

/* Service links and the hero card fill in the estimate form */
const form = $('#estimate');
const setOption = (select, value) => {
  if ([...select.options].some((o) => o.value === value)) select.value = value;
};
$$('[data-service]').forEach((a) => a.addEventListener('click', () => {
  setOption($('#f-service'), a.dataset.service);
}));
$('#quickQuote').addEventListener('submit', (e) => {
  e.preventDefault();
  setOption($('#f-service'), $('#q-service').value);
  $('#f-zip').value = $('#q-zip').value.trim();
  $('#contact').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  $('#f-name').focus({ preventScroll: true });
});

/* Estimate form */
const statusEl = $('#formStatus');
const rules = {
  name: (v) => (v.trim() ? '' : 'Please enter your name.'),
  phone: (v) => (v.replace(/\D/g, '').length >= 10 ? '' : 'Please enter a 10-digit phone number so we can call you back.'),
  email: (v) => (!v.trim() || /^\S+@\S+\.\S+$/.test(v.trim()) ? '' : 'That email looks incomplete. Check it, or leave it blank.'),
};
function validate(input) {
  const message = rules[input.name](input.value);
  const err = $('#e-' + input.name);
  err.textContent = message;
  input.toggleAttribute('aria-invalid', !!message);
  if (message) input.setAttribute('aria-invalid', 'true');
  return !message;
}
Object.keys(rules).forEach((name) => {
  const input = form.elements[name];
  input.addEventListener('blur', () => { if (input.value) validate(input); });
  input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) validate(input); });
});
function setStatus(message, ok) {
  statusEl.textContent = message;
  statusEl.className = 'form-status ' + (ok ? 'is-ok' : 'is-bad');
}
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const invalid = Object.keys(rules).map((n) => form.elements[n]).filter((i) => !validate(i));
  if (invalid.length) { invalid[0].focus(); return; }

  if (!SITE.formEndpoint) {
    setStatus('This form is not connected yet, so your request was not sent.', false);
    return;
  }

  const button = $('button[type="submit"]', form);
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Sending...';
  statusEl.textContent = '';
  try {
    const res = await fetch(SITE.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    if (!res.ok) throw new Error(res.status);
    form.reset();
    setStatus('Thanks, your request was sent.', true);
  } catch {
    setStatus('Your request did not go through. Check your connection and try again.', false);
  } finally {
    button.disabled = false;
    button.textContent = label;
  }
});

/* Hide the sticky mobile button while either form is on screen */
const mobileCta = $('#mobileCta');
const formsInView = new Set();
const ctaWatcher = new IntersectionObserver((entries) => {
  entries.forEach((e) => (e.isIntersecting ? formsInView.add(e.target) : formsInView.delete(e.target)));
  mobileCta.classList.toggle('is-hidden', formsInView.size > 0);
}, { threshold: 0.1 });
[$('#quickQuote'), $('#contact')].forEach((el) => ctaWatcher.observe(el));

$('#year').textContent = new Date().getFullYear();
