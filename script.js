/* =====================================================
   Corporación de Proyectos Electromecánicos S.A.C.
   js/main.js
   ===================================================== */
(() => {
  'use strict';

  /* ---------- CONFIGURACIÓN (edita aquí) ---------- */
  const CONFIG = {
    whatsappNumber: '51991628513',          // Código de país + número, sin "+" ni espacios
    whatsappMessage: 'Hola, quisiera solicitar información y una cotización para un proyecto electromecánico.',
    slideTime: 6000,                         // Milisegundos entre diapositivas
    bubbleDelay: 4000,                       // Cuándo aparece el globo de WhatsApp
    bubbleAutoHide: 20000                    // Cuándo se oculta solo (0 = nunca)
  };

  /* ---------- Utilidades ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const waLink = (text) => `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;

  // Activa los estilos de animación del CSS
  document.documentElement.classList.add('js');

  /* =====================================================
     1. HERO / PANTALLA DINÁMICA
     ===================================================== */
  function initHero() {
    const hero = $('#inicio');
    const slides = $$('.slide', hero);
    if (!hero || !slides.length) return;

    const dotsBox = $('#heroDots');
    const bar = $('#heroBar');
    let index = 0;
    let timer = null;

    hero.style.setProperty('--slide-time', `${CONFIG.slideTime}ms`);

    // Imágenes de fondo (desde data-bg)
    slides.forEach((s) => {
      if (s.dataset.bg) s.style.backgroundImage = `url('${s.dataset.bg}')`;
    });

    // Puntos de navegación
    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hero__dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Ir a la diapositiva ${i + 1}`);
      dot.addEventListener('click', () => { goTo(i); start(); });
      dotsBox.appendChild(dot);
      return dot;
    });

    function render() {
      slides.forEach((s, i) => {
        const active = i === index;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', String(!active));
      });
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === index);
        d.setAttribute('aria-selected', String(i === index));
      });
    }

    function goTo(n) {
      index = (n + slides.length) % slides.length;
      render();
    }

    function restartBar() {
      bar.classList.remove('is-running');
      void bar.offsetWidth;            // fuerza el reinicio de la animación
      bar.classList.add('is-running');
    }

    function stop() {
      clearTimeout(timer);
      bar.classList.remove('is-running');
    }

    function start() {
      stop();
      if (reduceMotion || document.hidden) return;
      restartBar();
      timer = setTimeout(() => { goTo(index + 1); start(); }, CONFIG.slideTime);
    }

    $('#heroNext').addEventListener('click', () => { goTo(index + 1); start(); });
    $('#heroPrev').addEventListener('click', () => { goTo(index - 1); start(); });

    // Pausa al pasar el mouse o enfocar con teclado
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    hero.addEventListener('focusin', stop);
    hero.addEventListener('focusout', start);

    // Pausa si cambias de pestaña
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    // Deslizar con el dedo en móvil
    let touchX = 0;
    hero.addEventListener('touchstart', (e) => { touchX = e.changedTouches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', (e) => {
      const diff = e.changedTouches[0].clientX - touchX;
      if (Math.abs(diff) > 50) { goTo(index + (diff < 0 ? 1 : -1)); start(); }
    }, { passive: true });

    // Flechas del teclado
    hero.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { goTo(index + 1); start(); }
      if (e.key === 'ArrowLeft') { goTo(index - 1); start(); }
    });

    render();
    start();
  }

  /* =====================================================
     2. MENÚ DE NAVEGACIÓN (móvil + resaltado al hacer scroll)
     ===================================================== */
  function initNav() {
    const header = $('#header');
    const toggle = $('#navToggle');
    const nav = $('#nav');
    const links = $$('.nav__link');

    // Sombra del header al bajar
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Menú móvil
    const setOpen = (open) => {
      nav.classList.toggle('is-open', open);
      toggle.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      document.body.classList.toggle('menu-open', open);
    };
    toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 860) setOpen(false); });

    // Resalta el enlace de la sección visible
    if (!('IntersectionObserver' in window)) return;
    const map = new Map();
    links.forEach((l) => {
      const section = $(l.getAttribute('href'));
      if (section) map.set(section, l);
    });
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        map.get(entry.target)?.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, section) => spy.observe(section));
  }

  /* =====================================================
     3. ANIMACIONES AL HACER SCROLL
     ===================================================== */
  function initReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* =====================================================
     4. CONTADORES ANIMADOS
     ===================================================== */
  function initCounters() {
    const counters = $$('[data-count]');
    if (!counters.length) return;

    const animate = (el) => {
      const target = parseInt(el.dataset.count, 10) || 0;
      if (reduceMotion) { el.textContent = target; return; }
      const duration = 1800;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);         // desacelera al final
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach((el) => (el.textContent = el.dataset.count));
      return;
    }
    const io = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { animate(entry.target); obs.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => io.observe(el));
  }

  /* =====================================================
     5. FILTRO DE PROYECTOS
     ===================================================== */
  function initFilters() {
    const buttons = $$('.filter');
    const projects = $$('.project');
    if (!buttons.length) return;

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        buttons.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const filter = btn.dataset.filter;
        projects.forEach((p) => {
          const show = filter === 'all' || p.dataset.category === filter;
          p.classList.toggle('is-hidden', !show);
          if (show) p.classList.add('is-visible');
        });
      });
    });
  }

  /* =====================================================
     6. WHATSAPP (botón flotante + globo de texto)
     ===================================================== */
  function initWhatsApp() {
    const btn = $('#waBtn');
    const cta = $('#waCta');
    const bubble = $('#waBubble');
    const close = $('#waClose');
    if (!btn || !bubble) return;

    const link = waLink(CONFIG.whatsappMessage);
    btn.href = link;
    cta.href = link;

    const KEY = 'wa-bubble-dismissed';
    const wasDismissed = () => { try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; } };
    const dismiss = () => {
      bubble.classList.remove('is-visible');
      try { sessionStorage.setItem(KEY, '1'); } catch { /* sin almacenamiento */ }
    };

    if (!wasDismissed()) {
      setTimeout(() => bubble.classList.add('is-visible'), CONFIG.bubbleDelay);
      if (CONFIG.bubbleAutoHide) {
        setTimeout(() => bubble.classList.remove('is-visible'), CONFIG.bubbleDelay + CONFIG.bubbleAutoHide);
      }
    }

    close.addEventListener('click', dismiss);
    cta.addEventListener('click', dismiss);
    btn.addEventListener('click', () => bubble.classList.remove('is-visible'));
  }

  /* =====================================================
     7. FORMULARIO DE CONTACTO → WHATSAPP
     ===================================================== */
  function initForm() {
    const form = $('#contactForm');
    const status = $('#formStatus');
    if (!form) return;

    const rules = {
      nombre:   (v) => v.trim().length >= 3,
      telefono: (v) => /^[\d\s+()-]{7,20}$/.test(v.trim()),
      mensaje:  (v) => v.trim().length >= 10
    };

    const setError = (input, hasError) => {
      input.closest('.field').classList.toggle('has-error', hasError);
      input.setAttribute('aria-invalid', String(hasError));
    };

    // Limpia el error al escribir
    Object.keys(rules).forEach((name) => {
      form.elements[name].addEventListener('input', (e) => setError(e.target, false));
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.className = 'form__status';
      status.textContent = '';

      let valid = true;
      let firstInvalid = null;
      Object.entries(rules).forEach(([name, test]) => {
        const input = form.elements[name];
        const ok = test(input.value);
        setError(input, !ok);
        if (!ok) { valid = false; firstInvalid = firstInvalid || input; }
      });

      if (!valid) {
        status.textContent = 'Revisa los campos marcados: nombre, teléfono válido y un mensaje de al menos 10 caracteres.';
        status.classList.add('is-error');
        firstInvalid.focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      const text = [
        `Hola, soy ${data.nombre.trim()}${data.empresa.trim() ? ` de ${data.empresa.trim()}` : ''}.`,
        `Teléfono: ${data.telefono.trim()}`,
        data.servicio ? `Servicio de interés: ${data.servicio}` : '',
        '',
        `Mensaje: ${data.mensaje.trim()}`
      ].filter((line, i) => line !== '' || i === 4).join('\n');

      window.open(waLink(text), '_blank', 'noopener');
      status.textContent = '¡Gracias! Te estamos redirigiendo a WhatsApp para enviar tu consulta.';
      status.classList.add('is-ok');
      form.reset();
    });
  }

  /* =====================================================
     8. EXTRAS
     ===================================================== */
  function initYear() {
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ---------- Arranque ---------- */
  initHero();
  initNav();
  initReveal();
  initCounters();
  initFilters();
  initWhatsApp();
  initForm();
  initYear();
})();