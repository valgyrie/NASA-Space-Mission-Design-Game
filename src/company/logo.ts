/** Company artwork is either a small maker recipe or a drawing flattened to PNG. */
export const LOGO_SIZE = 128;
export const LOGO_MAX_BYTES = 200 * 1024;
export const LOGO_SHAPES = ['banner', 'circle', 'shield', 'hexagon', 'square', 'diamond', 'octagon'] as const;
export const LOGO_ICONS = ['cedar', 'star', 'planet', 'rocket', 'moon', 'satellite', 'comet', 'telescope'] as const;

export interface MadeLogo {
  kind: 'maker';
  shape: (typeof LOGO_SHAPES)[number];
  icon: (typeof LOGO_ICONS)[number];
  background: string;
  ink: string;
}

export type CompanyLogo = MadeLogo | { kind: 'upload'; png: string };

/** An original preset (a Lebanese cedar on a white banner); no real organisation's emblem. */
export const DEFAULT_LOGO: MadeLogo = { kind: 'maker', shape: 'banner', icon: 'cedar', background: '#ffffff', ink: '#00a651' };

const SHAPE_POINTS: Partial<Record<MadeLogo['shape'], number[][]>> = {
  shield: [[12, 12], [116, 12], [108, 80], [64, 120], [20, 80]],
  hexagon: [[64, 4], [116, 34], [116, 94], [64, 124], [12, 94], [12, 34]],
  diamond: [[64, 4], [124, 64], [64, 124], [4, 64]],
  octagon: [[40, 6], [88, 6], [122, 40], [122, 88], [88, 122], [40, 122], [6, 88], [6, 40]],
  // A hanging banner with a swallowtail end.
  banner: [[22, 10], [106, 10], [106, 124], [64, 110], [22, 124]],
};

export function isCompanyLogo(value: unknown): value is CompanyLogo {
  const v = value as Partial<MadeLogo> & { png?: unknown } | null;
  if (!v || typeof v !== 'object') return false;
  if (v.kind === 'maker') {
    return LOGO_SHAPES.includes(v.shape!) && LOGO_ICONS.includes(v.icon!) &&
      typeof v.background === 'string' && /^#[0-9a-f]{6}$/i.test(v.background) &&
      typeof v.ink === 'string' && /^#[0-9a-f]{6}$/i.test(v.ink);
  }
  return (value as { kind?: unknown }).kind === 'upload' && typeof v.png === 'string' &&
    v.png.length <= Math.ceil(LOGO_MAX_BYTES / 3) * 4 + 22 && /^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/.test(v.png);
}

/** Draw every maker option in the same 128 × 128 space used by uploads and textures. */
export function drawLogo(c: CanvasRenderingContext2D, logo: MadeLogo): void {
  c.clearRect(0, 0, LOGO_SIZE, LOGO_SIZE);
  c.save();
  c.fillStyle = logo.background;
  c.beginPath();
  if (logo.shape === 'circle') c.arc(64, 64, 60, 0, Math.PI * 2);
  else if (logo.shape === 'square') {
    const [a, b, r] = [8, 120, 18];
    c.moveTo(a + r, a);
    c.arcTo(b, a, b, b, r); c.arcTo(b, b, a, b, r); c.arcTo(a, b, a, a, r); c.arcTo(a, a, b, a, r);
    c.closePath();
  } else {
    SHAPE_POINTS[logo.shape]!.forEach(([x, y], i) => i ? c.lineTo(x!, y!) : c.moveTo(x!, y!));
    c.closePath();
  }
  c.fill();
  c.fillStyle = c.strokeStyle = logo.ink;
  c.lineWidth = 5;
  c.lineCap = c.lineJoin = 'round';
  if (logo.shape === 'banner') {
    // Edge and hanging rod, so a pale banner still reads on a pale rocket.
    c.lineWidth = 3;
    c.stroke();
    c.lineWidth = 6;
    c.beginPath(); c.moveTo(12, 8); c.lineTo(116, 8); c.stroke();
    c.lineWidth = 5;
    c.translate(0, -3);
  }
  c.beginPath();
  if (logo.icon === 'cedar') {
    // Cedrus libani: wide, flat tiers of branches on a short trunk.
    c.fillRect(59, 76, 10, 22);
    for (let i = 0; i < 5; i++) {
      const top = 22 + i * 11;
      const bottom = top + 14;
      const w = 16 + i * 6.5;
      const shelf = i ? w * 0.35 : 0;
      c.moveTo(64 - shelf, top);
      c.lineTo(64 + shelf, top);
      c.lineTo(64 + w, bottom);
      c.quadraticCurveTo(64 + w / 2, bottom - 5, 64, bottom - 2);
      c.quadraticCurveTo(64 - w / 2, bottom - 5, 64 - w, bottom);
      c.closePath();
    }
    c.fill();
  } else if (logo.icon === 'moon') {
    c.arc(60, 64, 32, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = logo.background;
    c.beginPath(); c.arc(76, 54, 28, 0, Math.PI * 2); c.fill();
    c.fillStyle = logo.ink;
    for (const [x, y, r] of [[92, 84, 4], [100, 32, 3]] as const) {
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
  } else if (logo.icon === 'satellite') {
    c.save();
    c.translate(64, 64);
    c.rotate(-Math.PI / 6);
    c.fillRect(-48, -10, 30, 20);
    c.fillRect(18, -10, 30, 20);
    c.fillRect(-12, -15, 24, 30);
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(-18, 0); c.lineTo(18, 0); c.moveTo(0, -15); c.lineTo(0, -26); c.stroke();
    c.beginPath(); c.arc(0, -30, 7, Math.PI, 0); c.fill();
    c.strokeStyle = logo.background;
    c.lineWidth = 2;
    c.beginPath();
    for (const x of [-38, -28, 28, 38]) { c.moveTo(x, -10); c.lineTo(x, 10); }
    c.stroke();
    c.restore();
  } else if (logo.icon === 'comet') {
    c.arc(84, 44, 14, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.moveTo(73, 35); c.lineTo(22, 104); c.lineTo(93, 55);
    c.closePath();
    c.fill();
    c.lineWidth = 4;
    c.beginPath(); c.moveTo(66, 30); c.lineTo(36, 58); c.moveTo(98, 62); c.lineTo(70, 92); c.stroke();
  } else if (logo.icon === 'telescope') {
    c.save();
    c.translate(64, 56);
    c.rotate(-Math.PI / 6);
    c.fillRect(-34, -9, 56, 18);
    c.fillRect(22, -13, 10, 26);
    c.fillRect(-44, -5, 10, 10);
    c.restore();
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(62, 64); c.lineTo(44, 98);
    c.moveTo(62, 64); c.lineTo(80, 98);
    c.moveTo(62, 64); c.lineTo(62, 96);
    c.stroke();
  } else if (logo.icon === 'star') {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 ? 16 : 36;
      const x = 64 + Math.cos(a) * r;
      const y = 61 + Math.sin(a) * r;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath();
    c.fill();
    for (const x of [47, 64, 81]) {
      c.beginPath(); c.arc(x, 105, 3, 0, Math.PI * 2); c.fill();
    }
  } else if (logo.icon === 'planet') {
    c.arc(64, 64, 24, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(64, 64, 43, 12, -0.45, 0, Math.PI * 2);
    c.stroke();
  } else {
    c.moveTo(64, 24); c.bezierCurveTo(45, 42, 45, 64, 49, 79);
    c.lineTo(38, 94); c.lineTo(53, 90); c.lineTo(64, 98);
    c.lineTo(75, 90); c.lineTo(90, 94); c.lineTo(79, 79);
    c.bezierCurveTo(83, 64, 83, 42, 64, 24); c.fill();
    c.fillStyle = logo.background;
    c.beginPath(); c.arc(64, 56, 7, 0, Math.PI * 2); c.fill();
    c.strokeStyle = logo.ink;
    c.beginPath(); c.moveTo(64, 104); c.lineTo(64, 114); c.stroke();
  }
  c.restore();
}

export function logoUrl(logo: CompanyLogo): string {
  if (logo.kind === 'upload') return logo.png;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = LOGO_SIZE;
  drawLogo(canvas.getContext('2d')!, logo);
  return canvas.toDataURL('image/png');
}

export type UploadProblem = 'tooLarge' | 'type' | 'unreadable';

/** Only drawings in common raster formats. Never keep the original file or its metadata. */
export async function uploadLogo(file: File): Promise<CompanyLogo | UploadProblem> {
  if (file.size > LOGO_MAX_BYTES) return 'tooLarge';
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return 'type';
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = LOGO_SIZE;
    const c = canvas.getContext('2d')!;
    const scale = LOGO_SIZE / Math.max(image.naturalWidth, image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    c.drawImage(image, (LOGO_SIZE - w) / 2, (LOGO_SIZE - h) / 2, w, h);
    const png = canvas.toDataURL('image/png');
    return isCompanyLogo({ kind: 'upload', png }) ? { kind: 'upload', png } : 'tooLarge';
  } catch {
    return 'unreadable';
  } finally {
    URL.revokeObjectURL(url);
  }
}
