/** Company artwork is either a small maker recipe or a drawing flattened to PNG. */
export const LOGO_SIZE = 128;
export const LOGO_MAX_BYTES = 200 * 1024;
export const LOGO_SHAPES = ['circle', 'shield', 'hexagon'] as const;
export const LOGO_ICONS = ['star', 'planet', 'rocket'] as const;

export interface MadeLogo {
  kind: 'maker';
  shape: (typeof LOGO_SHAPES)[number];
  icon: (typeof LOGO_ICONS)[number];
  background: string;
  ink: string;
}

export type CompanyLogo = MadeLogo | { kind: 'upload'; png: string };

/** An original preset; no real organisation's emblem. */
export const DEFAULT_LOGO: MadeLogo = { kind: 'maker', shape: 'hexagon', icon: 'star', background: '#1d3b6e', ink: '#f2c14e' };

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
  c.fillStyle = logo.background;
  c.beginPath();
  if (logo.shape === 'circle') c.arc(64, 64, 60, 0, Math.PI * 2);
  else {
    const points = logo.shape === 'shield'
      ? [[12, 12], [116, 12], [108, 80], [64, 120], [20, 80]]
      : [[64, 4], [116, 34], [116, 94], [64, 124], [12, 94], [12, 34]];
    points.forEach(([x, y], i) => i ? c.lineTo(x!, y!) : c.moveTo(x!, y!));
    c.closePath();
  }
  c.fill();
  c.fillStyle = c.strokeStyle = logo.ink;
  c.lineWidth = 5;
  c.lineCap = c.lineJoin = 'round';
  c.beginPath();
  if (logo.icon === 'star') {
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
