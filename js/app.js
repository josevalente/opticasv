import { PRODUCTS, SHAPES, READING_POWERS, FACE_ADVICE, formatCLP, frameWidth, sizeLabel } from './catalog.js';
import { renderThumb, drawGlasses, glassesWidth } from './glasses-renderer.js';
import { TryOn, loadLandmarker } from './tryon.js';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const BLUE_FILTER_PRICE = 5000;
const SHIPPING_PRICE = 3990;
const STORES = ['Providencia · Av. Providencia 1234', 'Las Condes · Av. Apoquindo 4500', 'Viña del Mar · Av. Libertad 900'];

// ---------- Estado ----------
const state = {
  type: 'all',
  shape: 'all',
  sort: 'featured',
  recoOnly: false,
  face: null,
  selectedVariant: Object.fromEntries(PRODUCTS.map((p) => [p.id, 0])),
  bag: load('opv-bag', []),
  snaps: [],
  current: PRODUCTS[0],
  tray: 'all',
};

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* almacenamiento no disponible */ }
}

const byId = (id) => PRODUCTS.find((p) => p.id === id);
const variantOf = (p) => p.variants[state.selectedVariant[p.id] ?? 0];
const typeLabel = (p) => (p.type === 'sol' ? 'Anteojos de sol' : 'Anteojos de lectura');
const isReco = (p) => state.face && FACE_ADVICE[state.face].shapes.includes(p.shape);

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2200);
}

function swatchEl(v, active, onClick) {
  const b = document.createElement('button');
  b.className = 'swatch' + (active ? ' active' : '') + (v.pattern === 'tortoise' ? ' tortoise' : '');
  b.title = v.name;
  b.setAttribute('aria-label', v.name);
  if (v.pattern !== 'tortoise') {
    const lens = v.lens ? `, ${v.lens} 50%` : '';
    b.style.background = v.lens ? `linear-gradient(135deg, ${v.frame} 50%${lens})` : v.frame;
  }
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  return b;
}

// ---------- Hero animado ----------
function startHero() {
  const canvas = $('#heroCanvas');
  const tag = $('#heroTag');
  const showcase = ['atacama', 'bellavista', 'maitencillo', 'yungay', 'elqui', 'nunoa'].map(byId);
  let i = 0, t0 = performance.now();
  const frame = (now) => {
    const t = (now - t0) / 1000;
    if (t > 3.2) { i = (i + 1) % showcase.length; t0 = now; }
    const p = showcase[i];
    const yaw = Math.sin(((now - t0) / 3200) * Math.PI * 2) * 0.45;
    renderThumb(canvas, p, p.variants[0], { yaw, pad: 0.14 });
    if (tag.dataset.id !== p.id) {
      tag.dataset.id = p.id;
      tag.innerHTML = `<strong>${p.name}</strong>${typeLabel(p)} · ${formatCLP(p.price)}`;
    }
    if (!document.hidden) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) requestAnimationFrame(frame); });
}

// ---------- Vitrina ----------
function renderShapeChips() {
  const box = $('#shapeChips');
  const used = [...new Set(PRODUCTS.map((p) => p.shape))];
  box.innerHTML = '';
  const mk = (key, label, cls = '') => {
    const b = document.createElement('button');
    b.className = `chip ${cls}` + (state.shape === key && !(key === 'reco') ? ' active' : '');
    b.textContent = label;
    b.addEventListener('click', () => {
      if (key === 'reco') { state.recoOnly = !state.recoOnly; }
      else { state.shape = key; }
      renderShapeChips();
      renderGrid();
    });
    return b;
  };
  if (state.face) {
    const r = mk('reco', '★ Para tu rostro', 'reco');
    if (state.recoOnly) r.classList.add('active');
    box.append(r);
  }
  box.append(mk('all', 'Todas las formas'));
  used.forEach((s) => box.append(mk(s, SHAPES[s])));
}

function filteredProducts(type = state.type) {
  let list = PRODUCTS.filter((p) => (type === 'all' || p.type === type));
  if (state.shape !== 'all') list = list.filter((p) => p.shape === state.shape);
  if (state.recoOnly && state.face) list = list.filter(isReco);
  if (state.sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
  if (state.sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
  return list;
}

function renderGrid() {
  const grid = $('#productGrid');
  grid.innerHTML = '';
  const list = filteredProducts();
  if (!list.length) {
    grid.innerHTML = '<p class="empty">No hay modelos con esos filtros.</p>';
    return;
  }
  for (const p of list) {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-visual">
        <canvas></canvas>
        ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
        ${isReco(p) ? '<span class="badge reco">★ Para tu rostro</span>' : ''}
      </div>
      <div class="card-body">
        <div class="card-title"><h3>${p.name}</h3><span class="price">${formatCLP(p.price)}</span></div>
        <p class="card-meta">${p.type === 'sol' ? 'Sol' : 'Lectura'} · ${SHAPES[p.shape]} · Talla ${sizeLabel(p)}${p.polarized ? ' · Polarizado' : ''}</p>
        <div class="swatches"></div>
        <div class="card-actions">
          <button class="btn btn-ghost" data-act="try">Probar</button>
          <button class="btn btn-primary" data-act="view">Ver</button>
        </div>
      </div>`;
    const canvas = $('canvas', card);
    const sw = $('.swatches', card);
    const paint = () => {
      renderThumb(canvas, p, variantOf(p));
      sw.innerHTML = '';
      p.variants.forEach((v, i) => sw.append(swatchEl(v, i === state.selectedVariant[p.id], () => {
        state.selectedVariant[p.id] = i;
        paint();
      })));
    };
    grid.append(card);
    paint();
    $('.card-visual', card).addEventListener('click', () => openProduct(p));
    $('[data-act=view]', card).addEventListener('click', () => openProduct(p));
    $('[data-act=try]', card).addEventListener('click', () => openMirror(p));
  }
}

function setType(type) {
  state.type = type;
  $$('#typeChips .chip').forEach((c) => c.classList.toggle('active', c.dataset.type === type));
  renderGrid();
}

// ---------- Ficha de producto ----------
let pmProduct = null;
function openProduct(p) {
  pmProduct = p;
  const modal = $('#productModal');
  $('#pmType').textContent = typeLabel(p) + (p.polarized ? ' · Polarizado UV400' : p.type === 'sol' ? ' · UV400' : '');
  $('#pmName').textContent = p.name;
  $('#pmPrice').textContent = formatCLP(p.price);
  $('#pmDesc').textContent = p.desc;
  $('#pmSpecs').innerHTML = [
    ['Calibre', `${p.eye} mm`], ['Puente', `${p.bridge} mm`], ['Patilla', `${p.temple} mm`], ['Ancho', `${frameWidth(p)} mm`],
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const reading = p.type === 'lectura';
  $('#pmPowerField').hidden = !reading;
  $('#pmBlueField').hidden = !reading;
  if (reading) {
    $('#pmPower').innerHTML = READING_POWERS.map((r) => `<option ${r === '+1.50' ? 'selected' : ''}>${r}</option>`).join('');
    $('#pmBlue').checked = false;
  }
  modal.hidden = false;
  document.body.classList.add('lock');
  paintProduct();
}

function paintProduct() {
  const p = pmProduct;
  const v = variantOf(p);
  const yaw = (+$('#pmRotate').value * Math.PI) / 180;
  renderThumb($('#pmCanvas'), p, v, { yaw, pad: 0.08 });
  $('#pmVariant').textContent = v.name;
  const sw = $('#pmSwatches');
  sw.innerHTML = '';
  p.variants.forEach((vv, i) => sw.append(swatchEl(vv, i === state.selectedVariant[p.id], () => {
    state.selectedVariant[p.id] = i;
    paintProduct();
    renderGrid();
  })));
}

function closeModal(el) {
  el.hidden = true;
  if (!$$('.modal, .drawer').some((m) => !m.hidden) && $('#mirrorRoom').hidden) document.body.classList.remove('lock');
}

// ---------- Bolsa ----------
function addToBag(p, opts = {}) {
  const v = variantOf(p);
  const item = {
    key: [p.id, state.selectedVariant[p.id], opts.power || '', opts.blue ? 'b' : ''].join('|'),
    id: p.id, variant: state.selectedVariant[p.id], power: opts.power || null, blue: !!opts.blue, qty: 1,
  };
  const existing = state.bag.find((i) => i.key === item.key);
  if (existing) existing.qty++;
  else state.bag.push(item);
  save('opv-bag', state.bag);
  renderBag();
  toast(`${p.name} · ${v.name} agregado a tu bolsa`);
}

const itemPrice = (i) => byId(i.id).price + (i.blue ? BLUE_FILTER_PRICE : 0);
const bagTotal = () => state.bag.reduce((s, i) => s + itemPrice(i) * i.qty, 0);

function renderBag() {
  const count = state.bag.reduce((s, i) => s + i.qty, 0);
  $$('.bag-count').forEach((el) => { el.textContent = count; el.classList.toggle('zero', !count); });
  const box = $('#bagItems');
  box.innerHTML = '';
  if (!state.bag.length) {
    box.innerHTML = '<p class="empty">Tu bolsa está vacía.<br>Pruébate algo en el espejo 😉</p>';
  }
  for (const i of state.bag) {
    const p = byId(i.id);
    const v = p.variants[i.variant];
    const row = document.createElement('div');
    row.className = 'bag-item';
    row.innerHTML = `
      <canvas></canvas>
      <div>
        <h4>${p.name}</h4>
        <p>${v.name}${i.power ? ` · ${i.power}` : ''}${i.blue ? ' · Filtro azul' : ''}</p>
        <div class="qty"><button data-q="-1" aria-label="Quitar uno">−</button><span>${i.qty}</span><button data-q="1" aria-label="Agregar uno">+</button></div>
      </div>
      <div class="right"><strong>${formatCLP(itemPrice(i) * i.qty)}</strong><button class="link-btn small" data-rm>Quitar</button></div>`;
    box.append(row);
    renderThumb($('canvas', row), p, v, { yaw: -0.2, pad: 0.06 });
    $$('[data-q]', row).forEach((b) => b.addEventListener('click', () => {
      i.qty += +b.dataset.q;
      if (i.qty <= 0) state.bag.splice(state.bag.indexOf(i), 1);
      save('opv-bag', state.bag);
      renderBag();
    }));
    $('[data-rm]', row).addEventListener('click', () => {
      state.bag.splice(state.bag.indexOf(i), 1);
      save('opv-bag', state.bag);
      renderBag();
    });
  }
  $('#bagSubtotal').textContent = formatCLP(bagTotal());
  $('#checkoutBtn').disabled = !state.bag.length;
}

function openBag() {
  $('#bagDrawer').hidden = false;
  document.body.classList.add('lock');
}

// ---------- Caja (simulada) ----------
const checkout = { step: 0, delivery: 'store', store: 0, comuna: '', pay: 'card' };

function openCheckout() {
  closeModal($('#bagDrawer'));
  Object.assign(checkout, { step: 0 });
  $('#checkoutModal').hidden = false;
  document.body.classList.add('lock');
  renderCheckout();
}

function summaryHTML() {
  const sub = bagTotal();
  const ship = checkout.delivery === 'ship' ? SHIPPING_PRICE : 0;
  return `<div class="co-summary">
    <div class="row"><span>Productos (${state.bag.reduce((s, i) => s + i.qty, 0)})</span><span>${formatCLP(sub)}</span></div>
    <div class="row"><span>${checkout.delivery === 'ship' ? 'Despacho' : 'Retiro en tienda'}</span><span>${ship ? formatCLP(ship) : 'Gratis'}</span></div>
    <div class="row total"><span>Total</span><span>${formatCLP(sub + ship)}</span></div>
  </div>`;
}

function renderCheckout() {
  const body = $('#coBody');
  $$('#coSteps li').forEach((li, i) => {
    li.classList.toggle('active', i === checkout.step);
    li.classList.toggle('done', i < checkout.step);
  });
  if (checkout.step === 0) {
    body.innerHTML = `
      <div class="options">
        <label class="option"><input type="radio" name="dl" value="store" ${checkout.delivery === 'store' ? 'checked' : ''}/>
          <div><strong>Retiro en tienda</strong><span>Listo en 24 h. Te ajustamos el armazón al retirarlo.</span></div><span class="extra">Gratis</span></label>
        <label class="option"><input type="radio" name="dl" value="ship" ${checkout.delivery === 'ship' ? 'checked' : ''}/>
          <div><strong>Despacho a domicilio</strong><span>2 a 4 días hábiles a todo Chile.</span></div><span class="extra">${formatCLP(SHIPPING_PRICE)}</span></label>
      </div>
      <div class="field" id="storeField">
        <label for="coStore">Tienda</label>
        <select id="coStore">${STORES.map((s, i) => `<option value="${i}" ${i === checkout.store ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </div>
      <div class="field" id="comunaField">
        <label for="coComuna">Comuna (para simular el despacho)</label>
        <input id="coComuna" placeholder="Ej: Ñuñoa" value="${checkout.comuna}" />
      </div>
      ${summaryHTML()}
      <div class="co-nav"><button class="btn btn-ghost" data-back>Volver a la bolsa</button><button class="btn btn-primary" data-next>Continuar al pago</button></div>`;
    const sync = () => {
      checkout.delivery = $('input[name=dl]:checked', body).value;
      $('#storeField', body).hidden = checkout.delivery !== 'store';
      $('#comunaField', body).hidden = checkout.delivery !== 'ship';
      $('.co-summary', body).outerHTML = summaryHTML();
    };
    $$('input[name=dl]', body).forEach((r) => r.addEventListener('change', sync));
    $('#coStore', body).addEventListener('change', (e) => { checkout.store = +e.target.value; });
    $('#coComuna', body).addEventListener('input', (e) => { checkout.comuna = e.target.value; });
    sync();
    $('[data-back]', body).addEventListener('click', () => { closeModal($('#checkoutModal')); openBag(); });
    $('[data-next]', body).addEventListener('click', () => { checkout.step = 1; renderCheckout(); });
  } else if (checkout.step === 1) {
    const opts = [
      ['card', 'Tarjeta de débito o crédito', 'Simulación de pasarela: no se piden datos de tarjeta.'],
      ['transfer', 'Transferencia', 'Simula el pago con transferencia bancaria.'],
      ['store', 'Pagar en tienda', 'Reserva tus anteojos y paga al retirarlos.'],
    ];
    body.innerHTML = `
      <div class="options">${opts.map(([v, t, d]) => `
        <label class="option"><input type="radio" name="pay" value="${v}" ${checkout.pay === v ? 'checked' : ''}/>
          <div><strong>${t}</strong><span>${d}</span></div></label>`).join('')}
      </div>
      ${summaryHTML()}
      <div class="co-nav"><button class="btn btn-ghost" data-back>Atrás</button><button class="btn btn-primary" data-next>Pagar (simulado)</button></div>`;
    $$('input[name=pay]', body).forEach((r) => r.addEventListener('change', (e) => { checkout.pay = e.target.value; }));
    $('[data-back]', body).addEventListener('click', () => { checkout.step = 0; renderCheckout(); });
    $('[data-next]', body).addEventListener('click', () => {
      body.innerHTML = '<div class="paying"><div class="spinner"></div><p>Procesando pago simulado…</p></div>';
      setTimeout(() => { checkout.step = 2; renderCheckout(); }, 1400);
    });
  } else {
    const order = {
      n: 'OV-' + Date.now().toString().slice(-7),
      date: new Date().toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }),
      items: state.bag.map((i) => ({ ...i })),
      ship: checkout.delivery === 'ship' ? SHIPPING_PRICE : 0,
      total: bagTotal() + (checkout.delivery === 'ship' ? SHIPPING_PRICE : 0),
    };
    const orders = load('opv-orders', []);
    orders.push(order);
    save('opv-orders', orders);
    const payLabel = { card: 'Tarjeta (simulado)', transfer: 'Transferencia (simulado)', store: 'Pago en tienda' }[checkout.pay];
    const where = checkout.delivery === 'store' ? `Retiro: ${STORES[checkout.store]}` : `Despacho a ${checkout.comuna || 'tu comuna'}`;
    body.innerHTML = `
      <div class="receipt">
        <h4>óptica V</h4>
        <p class="center">COMPROBANTE DE DEMOSTRACIÓN<br>Sin validez tributaria</p>
        <hr>
        <div class="row"><span>Pedido</span><span>${order.n}</span></div>
        <div class="row"><span>Fecha</span><span>${order.date}</span></div>
        <hr>
        ${order.items.map((i) => {
          const p = byId(i.id);
          return `<div class="row"><span>${i.qty}× ${p.name} ${p.variants[i.variant].name}${i.power ? ' ' + i.power : ''}${i.blue ? ' +azul' : ''}</span><span>${formatCLP(itemPrice(i) * i.qty)}</span></div>`;
        }).join('')}
        ${order.ship ? `<div class="row"><span>Despacho</span><span>${formatCLP(order.ship)}</span></div>` : ''}
        <hr>
        <div class="row big"><span>TOTAL</span><span>${formatCLP(order.total)}</span></div>
        <div class="row"><span>Pago</span><span>${payLabel}</span></div>
        <hr>
        <p class="center">${where}</p>
        <div class="barcode"></div>
        <p class="center">¡Gracias por preferirnos!</p>
      </div>
      <div class="co-nav"><span></span><button class="btn btn-primary" data-done>Seguir mirando</button></div>`;
    state.bag = [];
    save('opv-bag', state.bag);
    renderBag();
    $('[data-done]', body).addEventListener('click', () => closeModal($('#checkoutModal')));
  }
}

// ---------- Probador ----------
let tryon = null;

function ensureTryOn() {
  if (tryon) return tryon;
  tryon = new TryOn($('#mirrorCanvas'), {
    onStatus: (msg) => {
      const s = $('#mirrorStatus');
      s.textContent = msg;
      s.classList.toggle('loading', !!msg);
    },
    onFace: (info) => {
      $('#mirrorHint').classList.add('hidden');
      if (info) setFace(info.type);
    },
    onNoFace: () => {
      const h = $('#mirrorHint');
      h.textContent = 'No te veo… acércate y mira de frente al espejo';
      h.classList.remove('hidden');
    },
  });
  return tryon;
}

function setFace(type) {
  const first = state.face !== type;
  state.face = type;
  const adv = FACE_ADVICE[type];
  const box = $('#faceAdvice');
  box.classList.remove('hidden');
  box.innerHTML = `Tu rostro parece <strong>${adv.label.toLowerCase()}</strong>. ${adv.tip}
    <br><button class="link-btn light" id="showReco">Ver modelos recomendados →</button>`;
  $('#showReco').addEventListener('click', () => setTray('reco'));
  $('#trayReco').classList.remove('hidden');
  const pill = $('#facePill');
  pill.classList.remove('hidden');
  pill.innerHTML = `Rostro detectado: <b>${adv.label}</b>`;
  if (first) {
    renderShapeChips();
    renderGrid();
    renderTray();
  }
}

function openMirror(p = state.current) {
  state.current = p;
  $$('.modal').forEach((m) => (m.hidden = true));
  $('#mirrorRoom').hidden = false;
  document.body.classList.add('lock');
  renderTray();
  selectInMirror(p);
  // Precarga el motor mientras la persona lee la tarjeta de inicio
  loadLandmarker(() => {}).catch(() => {});
}

function closeMirror() {
  if (tryon) tryon.stop();
  $('#mirrorRoom').hidden = true;
  $('#mirrorStart').classList.remove('hidden');
  $('#adjustPanel').classList.add('hidden');
  document.body.classList.remove('lock');
}

function selectInMirror(p) {
  state.current = p;
  const v = variantOf(p);
  ensureTryOn().setGlasses(p, v);
  $('#mpType').textContent = typeLabel(p);
  $('#mpName').textContent = p.name;
  $('#mpMeta').textContent = `${SHAPES[p.shape]} · ${frameWidth(p)} mm · Talla ${sizeLabel(p)}${p.polarized ? ' · Polarizado' : ''}`;
  $('#mpPrice').textContent = formatCLP(p.price);
  $('#mpVariant').textContent = v.name;
  const sw = $('#mpSwatches');
  sw.innerHTML = '';
  p.variants.forEach((vv, i) => sw.append(swatchEl(vv, i === state.selectedVariant[p.id], () => {
    state.selectedVariant[p.id] = i;
    selectInMirror(p);
    renderTray();
  })));
  $$('.tray-item').forEach((el) => el.classList.toggle('active', el.dataset.id === p.id));
}

function setTray(key) {
  state.tray = key;
  $$('#trayTabs .chip').forEach((c) => c.classList.toggle('active', c.dataset.tray === key));
  renderTray();
}

function renderTray() {
  const box = $('#trayItems');
  box.innerHTML = '';
  let list = PRODUCTS;
  if (state.tray === 'lectura' || state.tray === 'sol') list = PRODUCTS.filter((p) => p.type === state.tray);
  if (state.tray === 'reco') list = PRODUCTS.filter(isReco);
  for (const p of list) {
    const b = document.createElement('button');
    b.className = 'tray-item' + (p.id === state.current.id ? ' active' : '');
    b.dataset.id = p.id;
    b.innerHTML = `<canvas></canvas>${p.name}<small>${formatCLP(p.price)}</small>`;
    box.append(b);
    renderThumb($('canvas', b), p, variantOf(p), { yaw: 0, pad: 0.08 });
    b.addEventListener('click', () => selectInMirror(p));
  }
}

function stepProduct(dir) {
  const items = $$('.tray-item');
  const idx = items.findIndex((el) => el.dataset.id === state.current.id);
  const next = items[(idx + dir + items.length) % items.length];
  if (next) {
    selectInMirror(byId(next.dataset.id));
    next.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
}

async function startCamera() {
  const btn = $('#startCamera');
  btn.disabled = true;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocam');
    await ensureTryOn().startCamera();
    $('#mirrorStart').classList.add('hidden');
  } catch (e) {
    console.error(e);
    const s = $('#mirrorStatus');
    s.classList.remove('loading');
    s.textContent = e.name === 'NotAllowedError'
      ? 'No diste permiso a la cámara. Puedes habilitarlo en tu navegador o usar una foto.'
      : e.message === 'nocam' ? 'Tu navegador no permite usar la cámara aquí (requiere HTTPS). Prueba con una foto.'
      : 'No pudimos iniciar la cámara. Prueba con una foto.';
  } finally {
    btn.disabled = false;
  }
}

function usePhoto(file) {
  if (!file) return;
  const img = new Image();
  img.onload = async () => {
    try {
      await ensureTryOn().useImage(img);
      $('#mirrorStart').classList.add('hidden');
    } catch (e) {
      console.error(e);
      $('#mirrorStatus').textContent = 'No pudimos procesar la foto.';
    }
  };
  img.src = URL.createObjectURL(file);
}

function snap() {
  if (!tryon || !$('#mirrorStart').classList.contains('hidden')) {
    toast('Primero activa la cámara o sube una foto');
    return;
  }
  const f = $('#flash');
  f.classList.remove('on');
  void f.offsetWidth;
  f.classList.add('on');
  state.snaps.unshift({ img: tryon.snapshot(), id: state.current.id, variant: state.selectedVariant[state.current.id] });
  state.snaps = state.snaps.slice(0, 8);
  $('#snapCount').textContent = state.snaps.length;
  toast('Foto guardada para comparar');
}

function openCompare() {
  const grid = $('#compareGrid');
  grid.innerHTML = '';
  if (!state.snaps.length) grid.innerHTML = '<p class="empty">Aún no tienes fotos. Usa el botón «Foto» del espejo con cada modelo que te guste.</p>';
  state.snaps.forEach((s, idx) => {
    const p = byId(s.id);
    const v = p.variants[s.variant];
    const el = document.createElement('div');
    el.className = 'compare-item';
    el.innerHTML = `<img alt="${p.name} ${v.name}" src="${s.img}">
      <button class="icon-btn remove" aria-label="Eliminar foto">✕</button>
      <div class="ci-info"><strong>${p.name}</strong><span class="muted small">${v.name} · ${formatCLP(p.price)}</span>
      <div class="ci-actions"><a class="btn btn-ghost" download="optica-v-${p.id}.jpg" href="${s.img}">Descargar</a><button class="btn btn-primary" data-add>Agregar</button></div></div>`;
    $('.remove', el).addEventListener('click', () => { state.snaps.splice(idx, 1); $('#snapCount').textContent = state.snaps.length; openCompare(); });
    $('[data-add]', el).addEventListener('click', () => {
      state.selectedVariant[p.id] = s.variant;
      if (p.type === 'lectura') { closeModal($('#compareModal')); openProduct(p); }
      else addToBag(p);
    });
    grid.append(el);
  });
  $('#compareModal').hidden = false;
}

// ---------- Eventos ----------
function bind() {
  $$('[data-open-mirror]').forEach((b) => b.addEventListener('click', () => openMirror()));
  $$('[data-filter-type]').forEach((a) => a.addEventListener('click', () => setType(a.dataset.filterType)));
  $$('#typeChips .chip').forEach((c) => c.addEventListener('click', () => setType(c.dataset.type)));
  $('#sortSelect').addEventListener('change', (e) => { state.sort = e.target.value; renderGrid(); });

  $$('.modal, .drawer').forEach((m) => $$('[data-close]', m).forEach((b) => b.addEventListener('click', () => closeModal(m))));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const open = $$('.modal, .drawer').filter((m) => !m.hidden).pop();
      if (open) closeModal(open);
      else if (!$('#mirrorRoom').hidden) closeMirror();
    }
    if (!$('#mirrorRoom').hidden && !$$('.modal, .drawer').some((m) => !m.hidden)) {
      if (e.key === 'ArrowRight') stepProduct(1);
      if (e.key === 'ArrowLeft') stepProduct(-1);
    }
  });

  $('#pmRotate').addEventListener('input', paintProduct);
  $('#pmTry').addEventListener('click', () => { closeModal($('#productModal')); openMirror(pmProduct); });
  $('#pmAdd').addEventListener('click', () => {
    const reading = pmProduct.type === 'lectura';
    addToBag(pmProduct, reading ? { power: $('#pmPower').value, blue: $('#pmBlue').checked } : {});
    closeModal($('#productModal'));
  });

  $('#bagBtn').addEventListener('click', openBag);
  $$('[data-open-bag]').forEach((b) => b.addEventListener('click', openBag));
  $('#checkoutBtn').addEventListener('click', openCheckout);

  $('#mirrorClose').addEventListener('click', closeMirror);
  $('#startCamera').addEventListener('click', startCamera);
  $('#photoInput').addEventListener('change', (e) => usePhoto(e.target.files[0]));
  $('#snapBtn').addEventListener('click', snap);
  $('#compareBtn').addEventListener('click', openCompare);
  $('#adjustBtn').addEventListener('click', () => $('#adjustPanel').classList.toggle('hidden'));
  const adj = () => ensureTryOn().setAdjust({ size: +$('#adjSize').value, height: +$('#adjHeight').value });
  $('#adjSize').addEventListener('input', adj);
  $('#adjHeight').addEventListener('input', adj);
  $('#adjReset').addEventListener('click', () => { $('#adjSize').value = 1; $('#adjHeight').value = 0; adj(); });
  $$('#trayTabs .chip').forEach((c) => c.addEventListener('click', () => setTray(c.dataset.tray)));
  $('#mpAdd').addEventListener('click', () => {
    const p = state.current;
    if (p.type === 'lectura') openProduct(p); // elegir graduación
    else addToBag(p);
  });
  $('#mpDetails').addEventListener('click', () => openProduct(state.current));

  // Deslizar sobre el espejo para cambiar de modelo (móvil)
  let sx = null;
  const mirror = $('.mirror');
  mirror.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  mirror.addEventListener('touchend', (e) => {
    if (sx == null) return;
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 60) stepProduct(dx < 0 ? 1 : -1);
    sx = null;
  });
}

// ---------- Inicio ----------
renderShapeChips();
renderGrid();
renderBag();
bind();
startHero();

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { renderGrid(); renderTray(); }, 200);
});

// Exponer para depuración en consola
window.opticaV = { state, PRODUCTS, drawGlasses, glassesWidth };
