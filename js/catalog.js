// Catálogo demo de Óptica V.
// Formas y medidas inspiradas en el inventario real (calibre / puente / patilla en mm).
// Cada variante define el color del armazón, el patrón y el tinte del cristal.

const TORTOISE = { pattern: 'tortoise', frame: '#5a3418' };

export const SHAPES = {
  round: 'Redondo',
  oval: 'Ovalado',
  square: 'Cuadrado',
  rectangle: 'Rectangular',
  aviator: 'Aviador',
  cateye: 'Cat eye',
  browline: 'Browline',
  hexagon: 'Hexagonal',
};

export const PRODUCTS = [
  // ---------- LECTURA ----------
  {
    id: 'lastarria', name: 'Lastarria', type: 'lectura', shape: 'round', material: 'acetate',
    gender: 'Unisex', eye: 48, bridge: 20, temple: 145, price: 24990,
    desc: 'Redondo clásico de acetato, ligero y con bisagra flex. El favorito para leer en el café.',
    variants: [
      { name: 'Negro', frame: '#151515' },
      { name: 'Carey', ...TORTOISE },
      { name: 'Cristal rosa', frame: '#e9a6a0', pattern: 'transparent' },
    ],
  },
  {
    id: 'bellavista', name: 'Bellavista', type: 'lectura', shape: 'square', material: 'acetate',
    gender: 'Unisex', eye: 52, bridge: 18, temple: 145, price: 27990, badge: 'Más vendido',
    desc: 'Cuadrado de líneas suaves. Funciona con casi todos los rostros.',
    variants: [
      { name: 'Carey', ...TORTOISE },
      { name: 'Negro mate', frame: '#222' },
      { name: 'Azul noche', frame: '#1f2d4d' },
    ],
  },
  {
    id: 'providencia', name: 'Providencia', type: 'lectura', shape: 'rectangle', material: 'metal',
    gender: 'Hombre', eye: 54, bridge: 17, temple: 145, price: 29990,
    desc: 'Rectangular metálico ultradelgado con plaquetas de silicona. Sobrio y ejecutivo.',
    variants: [
      { name: 'Gunmetal', frame: '#55585e', pattern: 'metal' },
      { name: 'Dorado', frame: '#b8913a', pattern: 'metal' },
      { name: 'Plata', frame: '#a9adb3', pattern: 'metal' },
    ],
  },
  {
    id: 'nunoa', name: 'Ñuñoa', type: 'lectura', shape: 'cateye', material: 'acetate',
    gender: 'Mujer', eye: 51, bridge: 17, temple: 140, price: 29990, badge: 'Nuevo',
    desc: 'Cat eye sutil que levanta la mirada. Acetato italiano pulido a mano.',
    variants: [
      { name: 'Burdeo', frame: '#6d1a2a' },
      { name: 'Carey', ...TORTOISE },
      { name: 'Negro', frame: '#151515' },
    ],
  },
  {
    id: 'yungay', name: 'Yungay', type: 'lectura', shape: 'browline', material: 'mixed',
    gender: 'Unisex', eye: 51, bridge: 20, temple: 145, price: 32990,
    desc: 'Browline estilo retro: ceja de acetato y aro metálico inferior.',
    variants: [
      { name: 'Negro / plata', frame: '#141414', rim: '#a9adb3' },
      { name: 'Carey / dorado', ...TORTOISE, rim: '#b8913a' },
    ],
  },
  {
    id: 'italia', name: 'Barrio Italia', type: 'lectura', shape: 'oval', material: 'acetate',
    gender: 'Mujer', eye: 50, bridge: 18, temple: 140, price: 22990,
    desc: 'Ovalado delicado, liviano y cómodo para largas jornadas de lectura.',
    variants: [
      { name: 'Cristal', frame: '#d8d2c8', pattern: 'transparent' },
      { name: 'Verde oliva', frame: '#4f5a2e' },
      { name: 'Lila', frame: '#9b86b8', pattern: 'transparent' },
    ],
  },
  {
    id: 'recoleta', name: 'Recoleta', type: 'lectura', shape: 'hexagon', material: 'metal',
    gender: 'Unisex', eye: 50, bridge: 19, temple: 145, price: 31990,
    desc: 'Hexagonal metálico, geométrico y liviano. Diseño de autor.',
    variants: [
      { name: 'Dorado', frame: '#b8913a', pattern: 'metal' },
      { name: 'Negro', frame: '#222', pattern: 'metal' },
    ],
  },
  {
    id: 'matta', name: 'Matta', type: 'lectura', shape: 'rectangle', material: 'acetate',
    gender: 'Hombre', eye: 55, bridge: 17, temple: 145, price: 25990,
    desc: 'Rectangular de acetato grueso, presencia marcada y gran campo de visión.',
    variants: [
      { name: 'Negro', frame: '#151515' },
      { name: 'Café', frame: '#4b2e1e' },
      { name: 'Gris humo', frame: '#6c6f73', pattern: 'transparent' },
    ],
  },

  // ---------- SOL ----------
  {
    id: 'atacama', name: 'Atacama', type: 'sol', shape: 'aviator', material: 'metal',
    gender: 'Unisex', eye: 58, bridge: 14, temple: 140, price: 59990, badge: 'Más vendido', polarized: true,
    desc: 'Aviador polarizado UV400 para el sol más intenso del planeta.',
    variants: [
      { name: 'Dorado / verde G15', frame: '#b8913a', pattern: 'metal', lens: '#2f4a2c', lensAlpha: 0.82 },
      { name: 'Plata / espejo azul', frame: '#a9adb3', pattern: 'metal', lens: '#2a5fa8', lensAlpha: 0.78, mirror: true },
      { name: 'Negro / gris', frame: '#222', pattern: 'metal', lens: '#2a2a2a', lensAlpha: 0.85 },
    ],
  },
  {
    id: 'zapallar', name: 'Zapallar', type: 'sol', shape: 'square', material: 'acetate',
    gender: 'Unisex', eye: 54, bridge: 19, temple: 145, price: 49990, polarized: true,
    desc: 'Cuadrado de acetato grueso con cristal polarizado. Ícono de verano.',
    variants: [
      { name: 'Negro / gris', frame: '#121212', lens: '#1e1e1e', lensAlpha: 0.86 },
      { name: 'Carey / café', ...TORTOISE, lens: '#4a2c17', lensAlpha: 0.82, gradient: true },
      { name: 'Cristal / verde', frame: '#d8d2c8', pattern: 'transparent', lens: '#2f4a2c', lensAlpha: 0.8 },
    ],
  },
  {
    id: 'pichilemu', name: 'Pichilemu', type: 'sol', shape: 'rectangle', material: 'acetate',
    gender: 'Hombre', eye: 57, bridge: 16, temple: 145, price: 44990, wrap: 0.0035,
    desc: 'Deportivo envolvente, liviano y firme para el mar y la ruta.',
    variants: [
      { name: 'Negro / espejo fuego', frame: '#151515', lens: '#c2451e', lensAlpha: 0.8, mirror: true },
      { name: 'Azul / espejo azul', frame: '#1f2d4d', lens: '#2a5fa8', lensAlpha: 0.8, mirror: true },
    ],
  },
  {
    id: 'elqui', name: 'Elqui', type: 'sol', shape: 'round', material: 'metal',
    gender: 'Unisex', eye: 50, bridge: 21, temple: 145, price: 42990,
    desc: 'Redondo metálico de inspiración setentera con cristales de color.',
    variants: [
      { name: 'Dorado / ámbar', frame: '#b8913a', pattern: 'metal', lens: '#b4691b', lensAlpha: 0.6 },
      { name: 'Dorado / rosa', frame: '#b8913a', pattern: 'metal', lens: '#c9566e', lensAlpha: 0.55 },
      { name: 'Negro / gris', frame: '#222', pattern: 'metal', lens: '#222', lensAlpha: 0.85 },
    ],
  },
  {
    id: 'maitencillo', name: 'Maitencillo', type: 'sol', shape: 'cateye', material: 'acetate',
    gender: 'Mujer', eye: 55, bridge: 17, temple: 140, price: 54990, badge: 'Nuevo', polarized: true,
    desc: 'Cat eye oversize con degradé. Glamour de playa.',
    variants: [
      { name: 'Negro / degradé', frame: '#121212', lens: '#1b1b1b', lensAlpha: 0.88, gradient: true },
      { name: 'Carey / café', ...TORTOISE, lens: '#4a2c17', lensAlpha: 0.85, gradient: true },
      { name: 'Blanco hueso / rosa', frame: '#efe7da', lens: '#a3475a', lensAlpha: 0.7, gradient: true },
    ],
  },
  {
    id: 'chiloe', name: 'Chiloé', type: 'sol', shape: 'oval', material: 'acetate',
    gender: 'Mujer', eye: 53, bridge: 18, temple: 140, price: 39990,
    desc: 'Ovalado de acetato con cristales cafés que suavizan la luz.',
    variants: [
      { name: 'Carey / café', ...TORTOISE, lens: '#4a2c17', lensAlpha: 0.82 },
      { name: 'Verde bosque / verde', frame: '#24402f', lens: '#2f4a2c', lensAlpha: 0.82 },
    ],
  },
  {
    id: 'pucon', name: 'Pucón', type: 'sol', shape: 'browline', material: 'mixed',
    gender: 'Hombre', eye: 52, bridge: 20, temple: 145, price: 52990, polarized: true,
    desc: 'Browline polarizado con ceja de acetato. Clásico que nunca falla.',
    variants: [
      { name: 'Negro / verde G15', frame: '#141414', rim: '#a9adb3', lens: '#2f4a2c', lensAlpha: 0.85 },
      { name: 'Carey / café', ...TORTOISE, rim: '#b8913a', lens: '#4a2c17', lensAlpha: 0.85 },
    ],
  },
  {
    id: 'rapanui', name: 'Rapa Nui', type: 'sol', shape: 'hexagon', material: 'metal',
    gender: 'Unisex', eye: 53, bridge: 19, temple: 145, price: 47990,
    desc: 'Hexagonal metálico con espejo degradé. Para destacar.',
    variants: [
      { name: 'Dorado / espejo oro', frame: '#b8913a', pattern: 'metal', lens: '#a07a24', lensAlpha: 0.78, mirror: true },
      { name: 'Plata / espejo plata', frame: '#a9adb3', pattern: 'metal', lens: '#7d858f', lensAlpha: 0.82, mirror: true },
    ],
  },
  {
    id: 'frutillar', name: 'Frutillar', type: 'sol', shape: 'round', material: 'acetate',
    gender: 'Unisex', eye: 49, bridge: 21, temple: 145, price: 44990,
    desc: 'Redondo de acetato grueso, estilo intelectual bajo el sol.',
    variants: [
      { name: 'Negro / gris', frame: '#121212', lens: '#222', lensAlpha: 0.86 },
      { name: 'Miel / café', frame: '#c4842d', pattern: 'transparent', lens: '#4a2c17', lensAlpha: 0.8 },
    ],
  },
  {
    id: 'torres', name: 'Torres del Paine', type: 'sol', shape: 'aviator', material: 'metal',
    gender: 'Hombre', eye: 60, bridge: 14, temple: 140, price: 64990, polarized: true,
    desc: 'Aviador grande, polarizado y con cristal mineral. Hecho para la montaña.',
    variants: [
      { name: 'Negro / gris', frame: '#1c1c1c', pattern: 'metal', lens: '#1f1f1f', lensAlpha: 0.88 },
      { name: 'Gunmetal / espejo verde', frame: '#55585e', pattern: 'metal', lens: '#2e6b45', lensAlpha: 0.8, mirror: true },
    ],
  },
];

// Graduaciones para lectura (dioptrías positivas).
export const READING_POWERS = ['+1.00', '+1.25', '+1.50', '+1.75', '+2.00', '+2.25', '+2.50', '+2.75', '+3.00', '+3.50'];

// Recomendaciones de forma según el tipo de rostro detectado.
export const FACE_ADVICE = {
  ovalado: { label: 'Ovalado', shapes: ['square', 'rectangle', 'aviator', 'cateye', 'browline', 'round', 'hexagon'], tip: 'Rostro equilibrado: casi cualquier forma te queda bien. ¡Atrévete!' },
  redondo: { label: 'Redondo', shapes: ['square', 'rectangle', 'browline', 'hexagon'], tip: 'Formas angulares estilizan y alargan el rostro.' },
  cuadrado: { label: 'Cuadrado', shapes: ['round', 'oval', 'aviator', 'cateye'], tip: 'Formas curvas suavizan una mandíbula marcada.' },
  alargado: { label: 'Alargado', shapes: ['square', 'aviator', 'round', 'browline'], tip: 'Armazones con altura equilibran un rostro largo.' },
  corazon: { label: 'Corazón', shapes: ['oval', 'round', 'aviator', 'rectangle'], tip: 'Formas livianas abajo equilibran una frente amplia.' },
};

export const formatCLP = (n) => '$' + n.toLocaleString('es-CL');

export const frameWidth = (p) => p.eye * 2 + p.bridge + 10;

export function sizeLabel(p) {
  const w = frameWidth(p);
  if (w < 128) return 'S';
  if (w < 136) return 'M';
  return 'L';
}
