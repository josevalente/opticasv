// Probador virtual: cámara + MediaPipe Face Landmarker + render de anteojos.

import { drawGlasses } from './glasses-renderer.js';

const VISION_VERSION = '0.10.14';
const VISION_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VISION_VERSION}`;
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const AVG_IPD_MM = 63; // distancia interpupilar promedio adulto

// Índices de landmarks (malla de 478 puntos)
const LM = {
  irisR: 468, irisL: 473,    // centros de iris
  eyeOutR: 33, eyeOutL: 263,
  cheekR: 234, cheekL: 454,
  noseTip: 1, forehead: 10, chin: 152,
  jawR: 172, jawL: 397,
  browR: 54, browL: 284,
  noseBridge: 168,
};

let landmarkerPromise = null;

export function loadLandmarker(onStatus = () => {}) {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    onStatus('Cargando motor de realidad aumentada…');
    const vision = await import(`${VISION_URL}/vision_bundle.mjs`);
    const fileset = await vision.FilesetResolver.forVisionTasks(`${VISION_URL}/wasm`);
    onStatus('Cargando modelo facial…');
    const make = (delegate) => vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    try {
      return await make('GPU');
    } catch (e) {
      console.warn('GPU no disponible, usando CPU', e);
      return await make('CPU');
    }
  })();
  landmarkerPromise.catch(() => { landmarkerPromise = null; });
  return landmarkerPromise;
}

// ---------- Estimación de pose ----------

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

/** Convierte landmarks normalizados a píxeles en espacio espejo. */
function toMirrorPx(lm, w, h, mirror) {
  return (i) => {
    const p = lm[i];
    return { x: (mirror ? 1 - p.x : p.x) * w, y: p.y * h, z: p.z * w };
  };
}

function dist3(a, b) { return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); }

export function estimatePose(lm, w, h, mirror) {
  const P = toMirrorPx(lm, w, h, mirror);
  const iA = P(LM.irisR), iB = P(LM.irisL);
  // En espejo, "A" queda a la izquierda de la pantalla.
  const [left, right] = iA.x < iB.x ? [iA, iB] : [iB, iA];
  const cA = P(LM.cheekR), cB = P(LM.cheekL);
  const [cl, cr] = cA.x < cB.x ? [cA, cB] : [cB, cA];
  const eA = P(LM.eyeOutR), eB = P(LM.eyeOutL);
  const [el, er] = eA.x < eB.x ? [eA, eB] : [eB, eA];

  const ipdPx = dist3(left, right);
  const scale = ipdPx / AVG_IPD_MM;
  const roll = Math.atan2(er.y - el.y, er.x - el.x);
  const yaw = Math.atan2(-(cr.z - cl.z), cr.x - cl.x);
  // La inclinación vertical se deja neutra: la profundidad de la malla es ruidosa en ese eje
  const pitch = 0;

  const cx = (left.x + right.x) / 2;
  const cy = (left.y + right.y) / 2;
  return { cx, cy, scale, roll, yaw, pitch };
}

/** Clasifica el tipo de rostro a partir de proporciones de la malla. */
export function faceMetrics(lm, w, h) {
  const P = toMirrorPx(lm, w, h, false);
  const ipd = dist3(P(LM.irisR), P(LM.irisL));
  const mm = AVG_IPD_MM / ipd;
  const length = dist3(P(LM.forehead), P(LM.chin)) * mm;
  const cheeks = dist3(P(LM.cheekR), P(LM.cheekL)) * mm;
  const jaw = dist3(P(LM.jawR), P(LM.jawL)) * mm;
  const brow = dist3(P(LM.browR), P(LM.browL)) * mm;
  return { length, cheeks, jaw, brow };
}

export function classifyFace(m) {
  const ratio = m.length / m.cheeks;
  const jawRatio = m.jaw / m.cheeks;
  const browJaw = m.brow / m.jaw;
  if (ratio > 1.42) return 'alargado';
  if (browJaw > 1.12 && jawRatio < 0.78) return 'corazon';
  if (jawRatio > 0.86 && ratio < 1.3) return 'cuadrado';
  if (ratio < 1.22) return 'redondo';
  return 'ovalado';
}

// ---------- Probador ----------

export class TryOn {
  constructor(canvas, { onFace, onNoFace, onStatus } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.video = document.createElement('video');
    this.video.playsInline = true;
    this.video.muted = true;
    this.product = null;
    this.variant = null;
    this.adjust = { size: 1, height: 0 };
    this.mirror = true;
    this.pose = null;
    this.lastSeen = 0;
    this.running = false;
    this.image = null; // modo foto
    this.metricsSamples = [];
    this.onFace = onFace || (() => {});
    this.onNoFace = onNoFace || (() => {});
    this.onStatus = onStatus || (() => {});
    this._loop = this._loop.bind(this);
  }

  setGlasses(product, variant) {
    this.product = product;
    this.variant = variant;
    if (this.image) this._renderImage();
  }

  setAdjust(adj) {
    Object.assign(this.adjust, adj);
    if (this.image) this._renderImage();
  }

  async startCamera() {
    this.image = null;
    this.mirror = true;
    this.landmarker = await loadLandmarker(this.onStatus);
    this.onStatus('Pidiendo acceso a la cámara…');
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    await this.landmarker.setOptions({ runningMode: 'VIDEO' });
    this.onStatus('');
    this.running = true;
    this.lastVideoTime = -1;
    requestAnimationFrame(this._loop);
  }

  async useImage(img) {
    this.stop();
    this.mirror = false;
    this.landmarker = await loadLandmarker(this.onStatus);
    await this.landmarker.setOptions({ runningMode: 'IMAGE' });
    this.image = img;
    const res = this.landmarker.detect(img);
    this.imageLandmarks = res.faceLandmarks?.[0] || null;
    this.pose = null;
    this.metricsSamples = [];
    this.onStatus('');
    this._renderImage();
    if (!this.imageLandmarks) this.onNoFace();
  }

  stop() {
    this.running = false;
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  }

  _fitCanvas(srcW, srcH) {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const cw = Math.round(rect.width * dpr), ch = Math.round(rect.height * dpr);
    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width = cw;
      this.canvas.height = ch;
    }
    // "cover": recorta la fuente para llenar el lienzo
    const s = Math.max(cw / srcW, ch / srcH);
    const dw = srcW * s, dh = srcH * s;
    return { cw, ch, dx: (cw - dw) / 2, dy: (ch - dh) / 2, dw, dh };
  }

  _drawSource(src, srcW, srcH) {
    const f = this._fitCanvas(srcW, srcH);
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, f.cw, f.ch);
    ctx.save();
    if (this.mirror) {
      ctx.translate(f.cw, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(src, f.dx, f.dy, f.dw, f.dh);
    ctx.restore();
    return f;
  }

  _applyLandmarks(lm, f, smooth) {
    // Pose en coordenadas del lienzo (ya espejadas)
    const raw = estimatePose(lm, f.dw, f.dh, this.mirror);
    raw.cx += this.mirror ? f.cw - f.dx - f.dw : f.dx;
    raw.cy += f.dy;
    const t = smooth ? 0.5 : 1;
    if (!this.pose || !smooth) this.pose = { ...raw };
    else {
      const p = this.pose;
      // Suavizado adaptativo: más rápido si hay movimiento grande
      const move = Math.hypot(raw.cx - p.cx, raw.cy - p.cy) / Math.max(1, raw.scale * 10);
      const k = Math.min(0.85, t + move * 0.5);
      p.cx = lerp(p.cx, raw.cx, k);
      p.cy = lerp(p.cy, raw.cy, k);
      p.scale = lerp(p.scale, raw.scale, 0.35);
      p.roll = lerpAngle(p.roll, raw.roll, 0.5);
      p.yaw = lerpAngle(p.yaw, raw.yaw, 0.45);
      p.pitch = lerpAngle(p.pitch, raw.pitch, 0.3);
    }
    // Métricas del rostro (solo de frente)
    if (Math.abs(raw.yaw) < 0.15 && this.metricsSamples.length < 40) {
      this.metricsSamples.push(faceMetrics(lm, f.dw, f.dh));
      if (this.metricsSamples.length === 12 || this.metricsSamples.length === 40) this._emitFace();
    }
  }

  _emitFace() {
    const med = (k) => {
      const arr = this.metricsSamples.map((m) => m[k]).sort((a, b) => a - b);
      return arr[Math.floor(arr.length / 2)];
    };
    const m = { length: med('length'), cheeks: med('cheeks'), jaw: med('jaw'), brow: med('brow') };
    this.onFace({ type: classifyFace(m), metrics: m });
  }

  _drawGlasses() {
    if (!this.pose || !this.product) return;
    const p = this.pose;
    const pose = {
      ...p,
      scale: p.scale * this.adjust.size,
      cy: p.cy + (2 + this.adjust.height) * p.scale * Math.cos(p.roll),
      cx: p.cx - (2 + this.adjust.height) * p.scale * Math.sin(p.roll),
    };
    drawGlasses(this.ctx, this.product, this.variant, pose, { shadow: true });
  }

  _renderImage() {
    const img = this.image;
    if (!img) return;
    const f = this._drawSource(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
    if (this.imageLandmarks) {
      this._applyLandmarks(this.imageLandmarks, f, false);
      if (this.metricsSamples.length) this._emitFace();
      this._drawGlasses();
    }
  }

  _loop() {
    if (!this.running) return;
    const v = this.video;
    if (v.readyState >= 2 && v.videoWidth) {
      const f = this._drawSource(v, v.videoWidth, v.videoHeight);
      if (v.currentTime !== this.lastVideoTime) {
        this.lastVideoTime = v.currentTime;
        const res = this.landmarker.detectForVideo(v, performance.now());
        const lm = res.faceLandmarks?.[0];
        if (lm) {
          this._applyLandmarks(lm, f, true);
          if (!this.lastSeen) this.onFace(null);
          this.lastSeen = performance.now();
        } else if (this.lastSeen && performance.now() - this.lastSeen > 600) {
          this.lastSeen = 0;
          this.pose = null;
          this.onNoFace();
        }
      }
      this._drawGlasses();
    }
    requestAnimationFrame(this._loop);
  }

  /** Captura la imagen actual como dataURL (JPEG). */
  snapshot() {
    return this.canvas.toDataURL('image/jpeg', 0.9);
  }
}
