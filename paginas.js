/* =====================================================
   paginas.js  ->  catálogo con cotizador (productos.html)
   y ventana de detalle (proyectos.html).
   Se carga DESPUÉS de script.js
   ===================================================== */
(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const money = (n) => 'S/ ' + n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // El número de WhatsApp se toma de script.js (CONFIG.whatsappNumber), así solo lo cambias en un lugar
  const waNumber = () => {
    const btn = $('#waBtn');
    const m = btn ? btn.href.match(/wa\.me\/(\d+)/) : null;
    return m ? m[1] : '51999999999';
  };
  const waLink = (text) => `https://wa.me/${waNumber()}?text=${encodeURIComponent(text)}`;

  /* ---------- Aviso emergente ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-visible'), 2200);
  }

  /* =====================================================
     CATÁLOGO: buscar, filtrar y ordenar
     ===================================================== */
  function initCatalog() {
    const grid = $('#productGrid');
    if (!grid) return;

    const items = $$('.product', grid);
    const search = $('#searchInput');
    const sort = $('#sortSelect');
    const none = $('#noResults');
    const count = $('#resultCount');
    let category = 'all';

    items.forEach((el, i) => { el.dataset.order = i; });

    const price = (el, asc) => {
      const v = Number(el.dataset.price);
      return v > 0 ? v : (asc ? Infinity : -1);   // "Consultar" va al final
    };
    const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

    function apply() {
      const q = search.value.trim().toLowerCase();
      let shown = 0;

      items.forEach((el) => {
        const text = `${el.dataset.name} ${el.dataset.keywords || ''}`.toLowerCase();
        const ok = (category === 'all' || el.dataset.category === category) && text.includes(q);
        el.classList.toggle('is-hidden', !ok);
        if (ok) { shown++; el.classList.add('is-visible'); }
      });

      const mode = sort.value;
      items.slice().sort((a, b) => {
        if (mode === 'price-asc')  return cmp(price(a, true), price(b, true));
        if (mode === 'price-desc') return cmp(price(b, false), price(a, false));
        if (mode === 'name')       return a.dataset.name.localeCompare(b.dataset.name, 'es');
        return cmp(Number(a.dataset.order), Number(b.dataset.order));
      }).forEach((el) => grid.appendChild(el));

      count.textContent = `${shown} producto${shown === 1 ? '' : 's'}`;
      none.hidden = shown > 0;
    }

    $$('.filter').forEach((btn) => {
      btn.addEventListener('click', () => { category = btn.dataset.filter; apply(); });
    });
    search.addEventListener('input', apply);
    sort.addEventListener('change', apply);
    apply();
  }

  /* =====================================================
     COTIZADOR: lista de productos → WhatsApp
     ===================================================== */
  function initQuote() {
    const panel = $('#quotePanel');
    if (!panel) return;

    const overlay = $('#quoteOverlay');
    const list = $('#quoteList');
    const KEY = 'cpe-cotizacion';
    let cart = [];

    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(saved)) {
        cart = saved.filter((i) => i && typeof i.id === 'string' && typeof i.name === 'string' && Number.isFinite(i.price) && i.qty > 0);
      }
    } catch { cart = []; }

    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* sin almacenamiento */ } };

    const el = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text !== undefined) n.textContent = text;
      return n;
    };

    function render() {
      list.textContent = '';
      let total = 0;
      let units = 0;

      cart.forEach((item) => {
        units += item.qty;
        if (item.price > 0) total += item.price * item.qty;

        const li = el('li', 'quote-item');
        const info = el('div');
        info.append(
          el('p', 'quote-item__name', item.name),
          el('p', 'quote-item__price', item.price > 0 ? `${money(item.price)} c/u` : 'Precio por consultar')
        );
        const sub = el('p', 'quote-item__sub', item.price > 0 ? money(item.price * item.qty) : '—');

        const ctrl = el('div', 'quote-item__ctrl');
        const qty = el('div', 'qty');
        [['dec', '−', 'Quitar una unidad'], ['inc', '+', 'Agregar una unidad']].forEach(([act, label, aria]) => {
          const b = el('button', '', label);
          b.type = 'button';
          b.dataset.act = act;
          b.dataset.id = item.id;
          b.setAttribute('aria-label', aria);
          if (act === 'dec') qty.append(b, el('span', '', String(item.qty)));
          else qty.append(b);
        });
        const del = el('button', 'quote-item__del', 'Eliminar');
        del.type = 'button';
        del.dataset.act = 'del';
        del.dataset.id = item.id;
        ctrl.append(qty, del);

        li.append(info, sub, ctrl);
        list.append(li);
      });

      $('#quoteCount').textContent = units;
      $('#quoteTotal').textContent = money(total);
      save();
    }

    function add(card) {
      const d = card.dataset;
      const found = cart.find((i) => i.id === d.id);
      if (found) found.qty += 1;
      else cart.push({ id: d.id, name: d.name, price: Number(d.price) || 0, qty: 1 });
      render();
      toast(`Agregado: ${d.name}`);
    }

    // Abrir / cerrar el panel
    function setOpen(open) {
      panel.classList.toggle('is-open', open);
      overlay.classList.toggle('is-open', open);
      panel.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) $('#quoteClose').focus();
    }
    $('#quoteOpen').addEventListener('click', () => setOpen(true));
    $('#quoteClose').addEventListener('click', () => setOpen(false));
    overlay.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });

    // Botones "Agregar" del catálogo
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.js-add');
      if (btn) add(btn.closest('.product'));
    });

    // Cantidades y eliminar
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-act]');
      if (!btn) return;
      const item = cart.find((i) => i.id === btn.dataset.id);
      if (!item) return;
      if (btn.dataset.act === 'inc') item.qty += 1;
      if (btn.dataset.act === 'dec') item.qty -= 1;
      if (btn.dataset.act === 'del' || item.qty <= 0) cart = cart.filter((i) => i.id !== item.id);
      render();
    });

    $('#quoteClear').addEventListener('click', () => { cart = []; render(); });

    // Enviar por WhatsApp
    $('#quoteSend').addEventListener('click', () => {
      if (!cart.length) { toast('Agrega al menos un producto a tu cotización'); return; }
      let total = 0;
      const lines = cart.map((i) => {
        if (i.price > 0) total += i.price * i.qty;
        const detail = i.price > 0 ? `${money(i.price)} c/u` : 'precio por consultar';
        return `• ${i.qty} x ${i.name} (${detail})`;
      });
      const text = [
        'Hola, quisiera cotizar los siguientes productos:',
        '',
        ...lines,
        '',
        `Total referencial (sin IGV): ${money(total)}`,
        'Quedo atento a su confirmación de disponibilidad y precio final.'
      ].join('\n');
      window.open(waLink(text), '_blank', 'noopener');
    });

    render();
  }

  /* =====================================================
     PROYECTOS: ventana con el detalle
     ===================================================== */
  function initProjects() {
    const modal = $('#projectModal');
    if (!modal || typeof modal.showModal !== 'function') return;

    const cards = $$('.project[data-title]');

    function open(card) {
      const d = card.dataset;
      const img = $('img', card);
      const photo = $('#modalImg');
      photo.src = img.currentSrc || img.src;
      photo.alt = img.alt;
      $('#modalCat').textContent = d.label || '';
      $('#modalTitle').textContent = d.title;
      $('#modalDesc').textContent = d.desc || '';
      $('#modalClient').textContent = d.client || '—';
      $('#modalYear').textContent = d.year || '—';
      $('#modalPlace').textContent = d.place || '—';
      $('#modalScope').textContent = d.scope || '—';
      $('#modalCta').href = waLink(`Hola, vi el proyecto "${d.title}" en su web y me interesa uno similar. ¿Pueden asesorarme?`);
      modal.showModal();
    }

    cards.forEach((card) => {
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Ver detalles: ${card.dataset.title}`);
      card.addEventListener('click', () => open(card));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); }
      });
    });

    $('#modalClose').addEventListener('click', () => modal.close());
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.close(); });   // clic fuera
  }

  initCatalog();
  initQuote();
  initProjects();
})();