/* ============================================================
   UTILIDADES
   ============================================================ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = window.matchMedia('(max-width: 680px)');

/* Autoplay accesible: se pausa con hover, foco, pestaña oculta, fuera de pantalla,
   movimiento reducido o por decisión del usuario (botón Pausar). */
function autoplay(root, step, ms, toggleBtn){
  let timer = null, userPaused = false, hovering = false, visible = false;
  const should = () => !reduceMotion.matches && !userPaused && !hovering && visible && !document.hidden;
  function sync(){
    clearInterval(timer); timer = null;
    if (should()) timer = setInterval(step, ms);
  }
  root.addEventListener('mouseenter', () => { hovering = true; sync(); });
  root.addEventListener('mouseleave', () => { hovering = false; sync(); });
  root.addEventListener('focusin', () => { hovering = true; sync(); });
  root.addEventListener('focusout', () => { hovering = false; sync(); });
  document.addEventListener('visibilitychange', sync);
  reduceMotion.addEventListener('change', sync);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold: 0.25}).observe(root);
  if (toggleBtn){
    if (reduceMotion.matches){ userPaused = true; }
    const paint = () => {
      toggleBtn.setAttribute('aria-pressed', String(userPaused));
      toggleBtn.textContent = userPaused ? 'Reproducir' : 'Pausar';
      toggleBtn.setAttribute('aria-label', userPaused ? 'Reanudar desplazamiento automático' : 'Pausar desplazamiento automático');
    };
    paint();
    toggleBtn.addEventListener('click', () => { userPaused = !userPaused; paint(); sync(); });
  }
  return { restart: sync };
}

/* ============================================================
   ENCABEZADO Y MENÚ MÓVIL
   ============================================================ */
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
function closeMenu(){
  navLinks.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  navToggle.textContent = 'menu';
}
navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  navToggle.textContent = isOpen ? 'close' : 'menu';
});
navLinks.querySelectorAll('a').forEach(l => l.addEventListener('click', closeMenu));
window.addEventListener('resize', () => { if (window.innerWidth > 1160) closeMenu(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && navLinks.classList.contains('open')){ closeMenu(); navToggle.focus(); }
});
document.addEventListener('click', e => {
  if (navLinks.classList.contains('open') && !e.target.closest('.nav')) closeMenu();
});

// Sombra del encabezado al desplazarse
const header = document.querySelector('header');
const paintHeader = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
window.addEventListener('scroll', paintHeader, {passive: true});
paintHeader();

// Marca en el menú la sección que se está leyendo
(function(){
  const links = Array.from(navLinks.querySelectorAll('a[href^="#"]'));
  const map = new Map(links.map(l => [l.getAttribute('href').slice(1), l]));
  // Se observan todas las secciones: en las que no figuran en el menú no se marca ninguna
  const sections = Array.from(document.querySelectorAll('main > section, main > div[id]'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(l => l.removeAttribute('aria-current'));
      const link = map.get(en.target.id);
      if (link) link.setAttribute('aria-current', 'true');
    });
  }, {rootMargin: '-45% 0px -50% 0px'});
  sections.forEach(sec => io.observe(sec));
})();

/* ============================================================
   FICHA DEL HERO
   ============================================================ */
window.addEventListener('load', () => {
  const c4 = document.getElementById('ccp4'), c5 = document.getElementById('ccp5');
  if (reduceMotion.matches){ c4.classList.add('on'); c5.classList.add('on'); return; }
  setTimeout(() => c4.classList.add('on'), 600);
  setTimeout(() => c5.classList.add('on'), 1100);
});

/* ============================================================
   CARRUSEL DE INDICADORES (infinito, elemento central escalado + contadores)
   ============================================================ */
(function(){
  const root = document.getElementById('statsCarousel');
  if (!root) return;
  const viewport = root.querySelector('.stats-viewport');
  const track = document.getElementById('statsTrack');
  const originals = Array.from(track.children);
  const n = originals.length;
  const prev = root.querySelector('.s-prev');
  const next = root.querySelector('.s-next');
  let counted = false;

  // Copias a ambos lados para que el recorrido sea continuo
  const before = originals.map(c => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); return k; });
  const after = originals.map(c => { const k = c.cloneNode(true); k.setAttribute('aria-hidden', 'true'); return k; });
  before.forEach(k => track.insertBefore(k, originals[0]));
  after.forEach(k => track.appendChild(k));
  const cards = Array.from(track.children);
  let index = n; // primer elemento real

  const fmt = v => v.toLocaleString('es-AR');

  function animateCount(card){
    const num = card.querySelector('.stat-num');
    const target = Number(card.dataset.target);
    const suffix = card.dataset.suffix || '';
    if (reduceMotion.matches){ num.textContent = fmt(target) + suffix; return; }
    const duration = 1600;
    const t0 = performance.now();
    (function tick(now){
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      num.textContent = fmt(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }

  function layout(animated){
    if (mobile.matches){ markCenter(); return; }
    const card = cards[index];
    const offset = card.offsetLeft + card.offsetWidth / 2 - viewport.clientWidth / 2;
    if (!animated){ track.style.transition = 'none'; }
    track.style.transform = 'translateX(' + (-offset) + 'px)';
    cards.forEach((c, i) => {
      const d = Math.abs(i - index);
      if (!animated){ c.style.transition = 'none'; }
      c.classList.toggle('is-active', d === 0);
      c.classList.toggle('is-near', d === 1);
    });
    if (!animated){
      void track.offsetWidth;
      track.style.transition = '';
      cards.forEach(c => { c.style.transition = ''; });
    }
  }

  // En móvil el recorrido es por scroll nativo: se destaca la tarjeta más cercana al centro
  function markCenter(){
    const box = viewport.getBoundingClientRect();
    const mid = box.left + box.width / 2;
    let best = null, bestDist = Infinity;
    originals.forEach(c => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - mid);
      if (d < bestDist){ bestDist = d; best = c; }
    });
    cards.forEach(c => { c.classList.toggle('is-active', c === best); c.classList.remove('is-near'); });
  }
  let ticking = false;
  viewport.addEventListener('scroll', () => {
    if (!mobile.matches || ticking) return;
    ticking = true;
    requestAnimationFrame(() => { markCenter(); ticking = false; });
  }, {passive: true});

  function go(i){
    if (mobile.matches) return;
    index = i; layout(true);
  }

  // Al terminar el movimiento, vuelve sin transición al tramo central equivalente
  track.addEventListener('transitionend', e => {
    if (e.target !== track) return;
    if (index >= 2 * n){ index -= n; layout(false); }
    else if (index < n){ index += n; layout(false); }
  });

  if (!reduceMotion.matches){
    cards.forEach(c => { c.querySelector('.stat-num').textContent = '0' + (c.dataset.suffix || ''); });
  }

  const ap = autoplay(root, () => go(index + 1), 3200, document.getElementById('statsToggle'));
  next.addEventListener('click', () => { go(index + 1); ap.restart(); });
  prev.addEventListener('click', () => { go(index - 1); ap.restart(); });

  // Deslizamiento táctil
  let startX = null;
  viewport.addEventListener('pointerdown', e => { startX = e.clientX; });
  viewport.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX; startX = null;
    if (Math.abs(dx) > 40){ go(index + (dx < 0 ? 1 : -1)); ap.restart(); }
  });

  // Los contadores arrancan al entrar la sección en pantalla
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting && !counted){
      counted = true;
      cards.forEach(animateCount);
      obs.disconnect();
    }
  }, {threshold: 0.3}).observe(root);

  window.addEventListener('resize', () => layout(false));
  window.addEventListener('load', () => layout(false));
  layout(false);
})();

/* ============================================================
   SERVICIOS: acordeón en móvil, bloques siempre abiertos en escritorio
   ============================================================ */
(function(){
  const blocks = Array.from(document.querySelectorAll('details.svc-block'));
  function sync(){
    blocks.forEach((b, i) => {
      b.open = !mobile.matches || i === 0;
      b.querySelector('summary').tabIndex = mobile.matches ? 0 : -1;
    });
  }
  blocks.forEach(b => b.querySelector('summary').addEventListener('click', e => {
    if (!mobile.matches) e.preventDefault();
  }));
  mobile.addEventListener('change', sync);
  sync();
})();

/* ============================================================
   CARRUSEL "ENFOQUE DE TRABAJO"
   ============================================================ */
(function(){
  const root = document.getElementById('enfoqueCarousel');
  const track = document.getElementById('enfoqueTrack');
  const dotsWrap = document.getElementById('enfoqueDots');
  const prevBtn = root.querySelector('.car-prev');
  const nextBtn = root.querySelector('.car-next');
  const cards = Array.from(track.children);
  let perView = 3, pages = 1, index = 0;

  const cardsPerView = () => window.innerWidth <= 680 ? 1 : (window.innerWidth <= 920 ? 2 : 3);

  function buildDots(){
    dotsWrap.innerHTML = '';
    pages = Math.max(1, cards.length - perView + 1);
    for (let i = 0; i < pages; i++){
      const d = document.createElement('button');
      d.className = 'car-dot' + (i === index ? ' active' : '');
      d.type = 'button';
      d.setAttribute('aria-label', 'Ir a la posición ' + (i + 1));
      d.addEventListener('click', () => { goTo(i); ap.restart(); });
      dotsWrap.appendChild(d);
    }
  }
  function update(){
    const w = cards[0].getBoundingClientRect().width;
    track.style.transform = 'translateX(-' + (index * (w + 14)) + 'px)';
    Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle('active', i === index));
  }
  function goTo(i){ index = (i + pages) % pages; update(); }

  const ap = autoplay(root, () => goTo(index + 1), 4200);
  nextBtn.addEventListener('click', () => { goTo(index + 1); ap.restart(); });
  prevBtn.addEventListener('click', () => { goTo(index - 1); ap.restart(); });
  window.addEventListener('resize', () => {
    const pv = cardsPerView();
    if (pv !== perView){ perView = pv; index = 0; buildDots(); }
    else { index = Math.min(index, pages - 1); }
    update();
  });

  perView = cardsPerView();
  buildDots();
  update();
})();

/* ============================================================
   GALERÍA
   ============================================================ */
(function(){
  const root = document.getElementById('gallery');
  const track = document.getElementById('galTrack');
  const slides = Array.from(track.children);
  const dotsWrap = document.getElementById('galDots');
  const status = document.getElementById('galStatus');
  const prev = root.querySelector('.gal-prev');
  const next = root.querySelector('.gal-next');
  let index = 0;

  slides.forEach((s, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'gal-dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', 'Ir a la imagen ' + (i + 1) + ' de ' + slides.length);
    d.addEventListener('click', () => { go(i); ap.restart(); });
    dotsWrap.appendChild(d);
    s.setAttribute('role', 'group');
    s.setAttribute('aria-roledescription', 'diapositiva');
    s.setAttribute('aria-label', (i + 1) + ' de ' + slides.length);
  });

  function go(i){
    index = (i + slides.length) % slides.length;
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
    Array.from(dotsWrap.children).forEach((d, k) => d.classList.toggle('active', k === index));
    slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== index)));
    status.textContent = 'Imagen ' + (index + 1) + ' de ' + slides.length;
  }

  const ap = autoplay(root, () => go(index + 1), 5000, document.getElementById('galToggle'));
  next.addEventListener('click', () => { go(index + 1); ap.restart(); });
  prev.addEventListener('click', () => { go(index - 1); ap.restart(); });
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight'){ go(index + 1); ap.restart(); }
    if (e.key === 'ArrowLeft'){ go(index - 1); ap.restart(); }
  });

  let startX = null;
  track.addEventListener('pointerdown', e => { startX = e.clientX; });
  track.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX; startX = null;
    if (Math.abs(dx) > 40){ go(index + (dx < 0 ? 1 : -1)); ap.restart(); }
  });

  new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    slides.forEach(s => { const img = s.querySelector('img'); if (img) img.loading = 'eager'; });
    obs.disconnect();
  }, {rootMargin: '600px 0px'}).observe(root);

  go(0);
  status.textContent = '';
})();

/* ============================================================
   FORMULARIO POR PASOS
   ============================================================ */
(function(){
  const form = document.getElementById('diagForm');
  const steps = Array.from(form.querySelectorAll('.form-step'));
  const bar = document.getElementById('formProgressBar');
  const label = document.getElementById('stepCurrent');
  let current = 0;

  function showStep(i){
    steps.forEach((s, k) => s.hidden = k !== i);
    bar.style.width = (((i + 1) / steps.length) * 100) + '%';
    label.textContent = i + 1;
    current = i;
  }
  function validateStep(i){
    for (const f of steps[i].querySelectorAll('input, select, textarea')){
      if (f.hasAttribute('required') && !f.checkValidity()){
        f.setAttribute('aria-invalid', 'true');
        f.reportValidity(); f.focus();
        return false;
      }
      f.removeAttribute('aria-invalid');
    }
    return true;
  }
  form.addEventListener('input', e => e.target.removeAttribute('aria-invalid'));
  // Enter en un paso intermedio avanza en lugar de enviar
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && current < steps.length - 1){
      e.preventDefault();
      if (validateStep(current)) showStep(current + 1);
    }
  });
  form.querySelectorAll('.step-next').forEach(b => b.addEventListener('click', () => {
    if (validateStep(current) && current < steps.length - 1) showStep(current + 1);
  }));
  form.querySelectorAll('.step-back').forEach(b => b.addEventListener('click', () => {
    if (current > 0) showStep(current - 1);
  }));
  // Los botones con data-interes preseleccionan el servicio en el formulario
  const interes = document.getElementById('interes');
  document.querySelectorAll('[data-interes]').forEach(a => a.addEventListener('click', () => {
    interes.value = a.dataset.interes;
  }));

  const submitBtn = form.querySelector('button[type="submit"]');
  const nativeSubmit = () => HTMLFormElement.prototype.submit.call(form);

  function done(){
    form.innerHTML = '<div class="form-done" role="status" tabindex="-1">' +
      '<span class="ms" aria-hidden="true">check</span>' +
      '<h3>¡Recibimos tu consulta!</h3>' +
      '<p>Te respondemos dentro de las 24 horas hábiles. Si es urgente, escribinos por WhatsApp.</p></div>';
    form.querySelector('.form-done').focus();
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    for (let i = 0; i < steps.length; i++){
      if (!validateStep(i)){ showStep(i); validateStep(i); return; }
    }
    if (form.querySelector('[name="_honey"]').value) { done(); return; }
    submitBtn.disabled = true; submitBtn.textContent = 'Enviando…';
    try {
      const res = await fetch(form.action.replace('formsubmit.co/', 'formsubmit.co/ajax/'), {
        method: 'POST', body: new FormData(form), headers: {Accept: 'application/json'}
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && String(data.success) === 'true'){ done(); return; }
      throw new Error(data.message || 'Error ' + res.status);
    } catch {
      // Si el envío en segundo plano falla, se usa el envío tradicional del formulario
      nativeSubmit();
    }
  });

  showStep(0);
})();

/* ============================================================
   TARJETA DIGITAL: GUARDAR CONTACTO (vCard)
   ============================================================ */
document.getElementById('saveContact').addEventListener('click', () => {
  const vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Ortiz;Luciano David;;;',
    'FN:Luciano David Ortiz',
    'ORG:Integra Food Solutions',
    'TITLE:Fundador y Director Técnico · Educador',
    'TEL;TYPE=CELL,VOICE:+5492478476889',
    'EMAIL;TYPE=INTERNET:luciodavid378@gmail.com',
    'URL:https://www.linkedin.com/in/ortizluciano',
    'ADR;TYPE=WORK:;;;;Buenos Aires;;Argentina',
    'END:VCARD'
  ].join('\r\n');
  const blob = new Blob([vcf], {type: 'text/vcard;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'Luciano-Ortiz-Integra-Food-Solutions.vcf';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
