// Renderiza anteojos paramétricos en un canvas 2D con proyección 3D simple.
// Todas las medidas del modelo están en milímetros; la pose las lleva a píxeles.
//
// Pose: { cx, cy, scale (px/mm), roll, yaw, pitch }  (ángulos en radianes)
// Ejes del modelo: x → derecha, y → abajo, z → hacia el interior de la cabeza.

const FOCAL = 520; // mm, distancia aproximada cámara-rostro para la perspectiva
const PIVOT = 12;  // mm que el armazón queda delante de los ojos

const LENS_RATIO = {
  round: 0.92, oval: 0.7, square: 0.84, rectangle: 0.6,
  aviator: 0.86, cateye: 0.68, browline: 0.72, hexagon: 0.86,
};

const RIM = { acetate: 4.2, metal: 1.4, mixed: 1.4 };

// ---------- Formas de cristal (lente derecho; +u = lado de la patilla) ----------

function superellipse(a, b, n, steps = 72) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    pts.push([a * Math.sign(c) * Math.abs(c) ** (2 / n), b * Math.sign(s) * Math.abs(s) ** (2 / n)]);
  }
  return pts;
}

function lensShape(shape, L, H) {
  const a = L / 2, b = H / 2;
  switch (shape) {
    case 'round': return superellipse(a, b, 2);
    case 'oval': return superellipse(a, b, 2.2);
    case 'square': return superellipse(a, b, 4.2);
    case 'rectangle': return superellipse(a, b, 5);
    case 'browline': return superellipse(a, b, 3.2).map(([u, v]) => [u, v < 0 ? v * 0.9 : v * (1 + 0.12 * (-u / a))]);
    case 'hexagon': {
      const base = [[a, 0], [a * 0.52, b], [-a * 0.52, b], [-a, 0], [-a * 0.52, -b], [a * 0.52, -b]];
      return roundPolygon(base, 1.6);
    }
    case 'aviator':
      return superellipse(a, b, 2.4).map(([u, v]) => {
        if (v < 0) return [u, v * 0.78 - 0.06 * b * (u / a)];
        return [u, v * (1 + 0.22 * (-u / a)) - 0.05 * b];
      });
    case 'cateye':
      return superellipse(a, b, 2.6).map(([u, v]) => {
        const k = Math.max(0, u / a);
        const inner = Math.max(0, -u / a);
        if (v < 0) return [u + 0.1 * a * k ** 3, v * (1 - 0.15 * inner) - 0.55 * b * k ** 4];
        return [u, v * (1 - 0.3 * k ** 2)];
      });
    default: return superellipse(a, b, 3);
  }
}

function roundPolygon(pts, r) {
  // Suaviza esquinas interpolando cerca de cada vértice.
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], prev = pts[(i - 1 + pts.length) % pts.length], next = pts[(i + 1) % pts.length];
    const d1 = Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    const d2 = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const a = [p[0] + (prev[0] - p[0]) * r / d1, p[1] + (prev[1] - p[1]) * r / d1];
    const c = [p[0] + (next[0] - p[0]) * r / d2, p[1] + (next[1] - p[1]) * r / d2];
    for (let t = 0; t <= 1; t += 0.25) {
      const x = (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * p[0] + t * t * c[0];
      const y = (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * p[1] + t * t * c[1];
      out.push([x, y]);
    }
  }
  return out;
}

// ---------- Geometría completa del armazón ----------

const geoCache = new Map();

export function buildGeometry(p) {
  if (geoCache.has(p.id)) return geoCache.get(p.id);
  const L = p.eye;
  const H = L * (LENS_RATIO[p.shape] ?? 0.8);
  const B = p.bridge;
  const cxR = B / 2 + L / 2;
  const shape = lensShape(p.shape, L, H);
  const right = shape.map(([u, v]) => [cxR + u, v]);
  const left = shape.map(([u, v]) => [-(cxR + u), v]);
  const outer = B / 2 + L;
  const hingeX = outer + 5;
  const topY = Math.min(...shape.map(([, v]) => v));
  const g = { L, H, B, right, left, outer, hingeX, topY, width: hingeX * 2 };
  geoCache.set(p.id, g);
  return g;
}

// ---------- Proyección ----------

function makeProjector(pose, wrap) {
  const { cx, cy, scale, roll = 0, yaw = 0, pitch = 0 } = pose;
  const cy_ = Math.cos(yaw), sy = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cr = Math.cos(roll), sr = Math.sin(roll);
  // Devuelve coordenadas antes de aplicar el roll (útil para visibilidad).
  const local = (x, y, z) => {
    let x1 = x * cy_ + z * sy;
    let z1 = -x * sy + z * cy_;
    const y1 = y * cp - z1 * sp;
    z1 = y * sp + z1 * cp;
    const s = FOCAL / (FOCAL + z1);
    return [x1 * s, y1 * s];
  };
  const toScreen = ([x, y]) => [cx + (x * cr - y * sr) * scale, cy + (x * sr + y * cr) * scale];
  const frontZ = (x) => -PIVOT + wrap * x * x;
  return {
    local,
    toScreen,
    front: (x, y) => toScreen(local(x, y, frontZ(x))),
    at: (x, y, z) => toScreen(local(x, y, z)),
    frontZ,
  };
}

// ---------- Texturas ----------

let tortoisePattern = null;
function getTortoise(ctx) {
  if (tortoisePattern) return tortoisePattern;
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#3a1f0e';
  g.fillRect(0, 0, 96, 96);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colors = ['#8a4b1c', '#b06a26', '#5c2f12', '#c98a3a', '#2a150a'];
  for (let i = 0; i < 70; i++) {
    g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    g.globalAlpha = 0.35 + rnd() * 0.5;
    g.beginPath();
    g.ellipse(rnd() * 96, rnd() * 96, 3 + rnd() * 10, 2 + rnd() * 6, rnd() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  tortoisePattern = ctx.createPattern(c, 'repeat');
  return tortoisePattern;
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function lighten(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v + (255 - v) * amt);
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function darken(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.round(v * (1 - amt));
  return `rgba(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)},0.85)`;
}

function frameStyle(ctx, v) {
  if (v.pattern === 'tortoise') return getTortoise(ctx);
  if (v.pattern === 'transparent') return hexToRgba(v.frame, 0.62);
  return v.frame;
}

// ---------- Dibujo ----------

function pathFrom(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

function offsetPts(pts, d) {
  // Desplaza el contorno d px hacia afuera (d > 0) o hacia adentro (d < 0)
  let cx = 0, cy = 0;
  for (const [x, y] of pts) { cx += x; cy += y; }
  cx /= pts.length; cy /= pts.length;
  return pts.map(([x, y], i) => {
    const [ax, ay] = pts[(i - 1 + pts.length) % pts.length];
    const [bx, by] = pts[(i + 1) % pts.length];
    let nx = by - ay, ny = -(bx - ax);
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    if (nx * (x - cx) + ny * (y - cy) < 0) { nx = -nx; ny = -ny; }
    return [x + nx * d, y + ny * d];
  });
}

function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

function drawLens(ctx, pts, v, sun) {
  const bb = bbox(pts);
  ctx.save();
  pathFrom(ctx, pts);
  ctx.clip();
  if (sun && v.lens) {
    const a = v.lensAlpha ?? 0.8;
    if (v.gradient) {
      const gr = ctx.createLinearGradient(0, bb.y0, 0, bb.y1);
      gr.addColorStop(0, hexToRgba(v.lens, a));
      gr.addColorStop(1, hexToRgba(v.lens, a * 0.35));
      ctx.fillStyle = gr;
    } else ctx.fillStyle = hexToRgba(v.lens, a);
    ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
    if (v.mirror) {
      const gr = ctx.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1);
      gr.addColorStop(0, 'rgba(255,255,255,0.45)');
      gr.addColorStop(0.45, hexToRgba(v.lens, 0.1));
      gr.addColorStop(1, 'rgba(255,255,255,0.3)');
      ctx.fillStyle = gr;
      ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
    }
  } else {
    ctx.fillStyle = 'rgba(225,238,255,0.08)';
    ctx.fillRect(bb.x0, bb.y0, bb.x1 - bb.x0, bb.y1 - bb.y0);
  }
  // Reflejo diagonal
  const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
  ctx.globalAlpha = sun ? 0.22 : 0.16;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(bb.x0 + w * 0.15, bb.y0);
  ctx.lineTo(bb.x0 + w * 0.42, bb.y0);
  ctx.lineTo(bb.x0 + w * 0.12, bb.y1);
  ctx.lineTo(bb.x0 - w * 0.15, bb.y1);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = sun ? 0.12 : 0.08;
  ctx.beginPath();
  ctx.moveTo(bb.x0 + w * 0.5, bb.y0);
  ctx.lineTo(bb.x0 + w * 0.58, bb.y0);
  ctx.lineTo(bb.x0 + w * 0.28, bb.y1);
  ctx.lineTo(bb.x0 + w * 0.2, bb.y1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function strokeShape(ctx, pts, style, width, closed = true, highlight = null) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  if (closed) ctx.closePath();
  ctx.strokeStyle = style;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  if (highlight) {
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = highlight;
    ctx.lineWidth = Math.max(0.6, width * 0.28);
    ctx.globalAlpha = 0.55;
    ctx.translate(0, -width * 0.18);
    ctx.stroke();
    ctx.restore();
  }
}

/**
 * Dibuja el anteojo en el contexto con la pose dada.
 * opts: { shadow: boolean }
 */
export function drawGlasses(ctx, product, variant, pose, opts = {}) {
  const g = buildGeometry(product);
  const wrap = product.wrap ?? (product.material === 'metal' ? 0.0013 : 0.0016);
  const P = makeProjector(pose, wrap);
  const sun = product.type === 'sol';
  const v = variant;
  const metal = product.material === 'metal';
  const s = pose.scale;
  const rimW = (RIM[product.material] ?? 3) * s;
  const style = frameStyle(ctx, v);
  const highlight = v.pattern === 'tortoise' ? 'rgba(255,220,170,0.6)' : lighten(v.frame, 0.55);

  const right = g.right.map(([x, y]) => P.front(x, y));
  const left = g.left.map(([x, y]) => P.front(x, y));

  ctx.save();
  if (opts.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.shadowBlur = Math.max(2, 2.2 * s);
    ctx.shadowOffsetY = 1.4 * s;
  }

  // --- Patillas (solo la que se ve hacia afuera según el giro) ---
  const templeY = g.topY * 0.55;
  for (const side of [1, -1]) {
    const hx = side * g.hingeX;
    const hz = P.frontZ(hx);
    const h0 = P.local(hx, templeY, hz);
    const e0 = P.local(side * (g.hingeX + 5), templeY + 3, hz + 100);
    const outward = (e0[0] - h0[0]) * side;
    if (outward <= 0.5) continue;
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 0.1) {
      pts.push(P.at(side * (g.hingeX + 5 * t), templeY + 3 * t * t, hz + 100 * t));
    }
    ctx.save();
    ctx.globalAlpha = Math.min(1, outward / 6);
    const tw = (metal ? 1.6 : 3.4) * s * 0.9;
    strokeShape(ctx, pts, product.material === 'mixed' ? (v.rim ?? v.frame) : style, tw, false);
    ctx.restore();
  }

  // --- Cristales ---
  ctx.save();
  ctx.shadowColor = 'transparent';
  drawLens(ctx, right, v, sun);
  drawLens(ctx, left, v, sun);
  ctx.restore();

  // --- Aros ---
  if (product.shape === 'browline') {
    const rimColor = v.rim ?? '#a9adb3';
    strokeShape(ctx, right, rimColor, 1.2 * s);
    strokeShape(ctx, left, rimColor, 1.2 * s);
    // Ceja de acetato: parte superior del cristal
    for (const lens of [g.right, g.left]) {
      const top = lens.filter(([, y]) => y < g.topY * 0.25);
      top.sort((a, b) => a[0] - b[0]);
      strokeShape(ctx, top.map(([x, y]) => P.front(x, y)), style, 4.6 * s, false, highlight);
    }
  } else {
    strokeShape(ctx, right, style, rimW, true, highlight);
    strokeShape(ctx, left, style, rimW, true, highlight);
    if (v.pattern === 'transparent') {
      // Bordes más oscuros para que el acetato translúcido se lea
      ctx.save();
      ctx.shadowColor = 'transparent';
      const edge = darken(v.frame, 0.4);
      for (const lens of [right, left]) {
        for (const d of [rimW / 2, -rimW / 2]) strokeShape(ctx, offsetPts(lens, d), edge, Math.max(0.6, 0.14 * s), true);
      }
      ctx.restore();
    }
  }

  // --- Puente ---
  const by = g.topY * (product.shape === 'aviator' ? 0.55 : 0.4);
  const bx = g.B / 2 + (metal ? 0.5 : 1.5);
  const bridge = [];
  for (let t = 0; t <= 1.0001; t += 0.1) {
    const x = -bx + 2 * bx * t;
    const y = by - Math.sin(Math.PI * t) * (metal ? 2.5 : 1.8);
    bridge.push(P.front(x, y));
  }
  const bridgeStyle = product.shape === 'browline' ? (v.rim ?? '#a9adb3') : style;
  strokeShape(ctx, bridge, bridgeStyle, metal ? 1.6 * s : rimW * 1.05, false, metal ? null : highlight);
  if (product.shape === 'aviator') {
    const top = [];
    const ty = g.topY * 0.92;
    for (let t = 0; t <= 1.0001; t += 0.1) top.push(P.front(-g.B / 2 - 6 + (g.B + 12) * t, ty));
    strokeShape(ctx, top, style, 1.5 * s, false);
  }

  // --- Plaquetas (metal) ---
  if (metal || product.material === 'mixed') {
    ctx.save();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(240,240,240,0.35)';
    ctx.strokeStyle = 'rgba(120,120,120,0.45)';
    ctx.lineWidth = Math.max(0.5, 0.4 * s);
    for (const side of [1, -1]) {
      const pts = [];
      for (let i = 0; i < 16; i++) {
        const t = (i / 16) * Math.PI * 2;
        pts.push(P.front(side * (g.B / 2 + 1.5) + Math.cos(t) * 1.6, g.H * 0.08 + Math.sin(t) * 3.4));
      }
      pathFrom(ctx, pts);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Terminales hacia la bisagra ---
  for (const side of [1, -1]) {
    const pts = [];
    for (let t = 0; t <= 1.0001; t += 0.25) pts.push(P.front(side * (g.outer - 1 + (g.hingeX - g.outer + 1) * t), templeY));
    const endStyle = product.shape === 'browline' ? style : style;
    strokeShape(ctx, pts, endStyle, (metal ? 1.8 : 3.6) * s, false);
  }

  ctx.restore();
}

/** Ancho total del armazón en mm. */
export function glassesWidth(product) {
  return buildGeometry(product).width;
}

/** Dibuja una miniatura de producto (vista 3/4 por defecto). */
export function renderThumb(canvas, product, variant, { yaw = -0.32, pitch = 0.05, pad = 0.1 } = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const width = glassesWidth(product) + 24;
  const scale = (w * (1 - pad * 2)) / width;
  drawGlasses(ctx, product, variant, { cx: w / 2 + Math.sin(yaw) * 18 * scale, cy: h / 2, scale, yaw, pitch, roll: 0 }, { shadow: false });
}
