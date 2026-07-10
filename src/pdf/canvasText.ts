import { A4_HEIGHT_MM, A4_WIDTH_MM, CANVAS_FONT_FAMILY } from './constants';
import type { FieldPlacement } from './placements';

export type RenderErrorCode = 'TEXT_OVERFLOW' | 'CANVAS_CONTEXT' | 'IMAGE_LOAD' | 'IMAGE_DIMENSION' | 'FONT_LOAD' | 'CANVAS_TO_PNG' | 'PDF_CREATION';
export class InvitationRenderError extends Error { constructor(public code: RenderErrorCode, message: string, public details?: unknown) { super(message); } }
export function mmToPx(canvas: HTMLCanvasElement, xMm: number, yMm: number) { return { x: xMm * canvas.width / A4_WIDTH_MM, y: yMm * canvas.height / A4_HEIGHT_MM }; }
function font(sizePt: number) { return `${sizePt}pt ${CANVAS_FONT_FAMILY}`; }
function rectPx(canvas: HTMLCanvasElement, p: FieldPlacement) { const a = mmToPx(canvas, p.xMm, p.yMm); const b = mmToPx(canvas, p.widthMm, p.heightMm); const pad = mmToPx(canvas, p.paddingMm ?? 0, p.paddingMm ?? 0); return { x: a.x + pad.x, y: a.y + pad.y, w: b.x - pad.x * 2, h: b.y - pad.y * 2 }; }
function fits(ctx: CanvasRenderingContext2D, text: string, width: number) { return ctx.measureText(text).width <= width; }
export function drawSingleLine(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, key: string, value: string, p: FieldPlacement) {
  const r = rectPx(canvas, p); const min = p.minFontSizePt ?? p.fontSizePt; let size = p.fontSizePt;
  for (; size >= min; size -= 0.5) { ctx.font = font(size); if (fits(ctx, value, r.w)) break; }
  if (size < min) throw new InvitationRenderError('TEXT_OVERFLOW', `文字が枠内に収まりません: ${key}`);
  ctx.font = font(size); ctx.fillStyle = '#111'; ctx.textAlign = p.align ?? 'left'; ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(value); const ascent = m.actualBoundingBoxAscent || size * 1.1; const descent = m.actualBoundingBoxDescent || size * 0.25;
  const x = p.align === 'center' ? r.x + r.w / 2 : p.align === 'right' ? r.x + r.w : r.x;
  const y = p.verticalAlign === 'middle' ? r.y + (r.h + ascent - descent) / 2 : r.y + ascent;
  ctx.fillText(value, x, y);
}
function tokenize(line: string) { return line.split(/(\s+)/).flatMap((part) => /\s+/.test(part) ? [part] : Array.from(part)); }
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    let line = '';
    for (const token of tokenize(raw)) {
      const next = line + token;
      if (line && !fits(ctx, next, width)) { out.push(line.trimEnd()); line = token.trimStart(); } else line = next;
    }
    out.push(line);
  }
  return out;
}
export function drawMultiline(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, key: string, value: string, p: FieldPlacement) {
  const r = rectPx(canvas, p); const min = p.minFontSizePt ?? p.fontSizePt; let chosen = 0; let chosenLines: string[] = [];
  for (let size = p.fontSizePt; size >= min; size -= 0.5) {
    ctx.font = font(size); const lines = wrap(ctx, value, r.w); const linePx = size * (p.lineHeight ?? 1.25) * canvas.height / A4_HEIGHT_MM / (72 / 25.4);
    if (lines.length <= (p.maxLines ?? Infinity) && lines.length * linePx <= r.h) { chosen = size; chosenLines = lines; break; }
  }
  if (!chosen) throw new InvitationRenderError('TEXT_OVERFLOW', `複数行テキストが枠内に収まりません: ${key}`);
  ctx.font = font(chosen); ctx.fillStyle = '#111'; ctx.textAlign = p.align ?? 'left'; ctx.textBaseline = 'top';
  const linePx = chosen * (p.lineHeight ?? 1.25) * canvas.height / A4_HEIGHT_MM / (72 / 25.4);
  const x = p.align === 'center' ? r.x + r.w / 2 : p.align === 'right' ? r.x + r.w : r.x;
  chosenLines.forEach((line, i) => ctx.fillText(line, x, r.y + i * linePx));
}
export function drawCheckbox(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, p: FieldPlacement) {
  const r = rectPx(canvas, p); ctx.strokeStyle = '#111'; ctx.lineWidth = Math.max(2, canvas.width / 1000); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(r.x + r.w * 0.18, r.y + r.h * 0.52); ctx.lineTo(r.x + r.w * 0.42, r.y + r.h * 0.75); ctx.lineTo(r.x + r.w * 0.84, r.y + r.h * 0.22); ctx.stroke();
}
export function drawDebug(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, key: string, p: FieldPlacement) {
  const a = mmToPx(canvas, p.xMm, p.yMm); const b = mmToPx(canvas, p.widthMm, p.heightMm); ctx.strokeStyle = 'rgba(255,0,0,.9)'; ctx.lineWidth = 1; ctx.strokeRect(a.x, a.y, b.x, b.y); ctx.fillStyle = 'rgba(255,0,0,.9)'; ctx.font = '8pt sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(key, a.x, Math.max(0, a.y - 12));
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new InvitationRenderError('CANVAS_TO_PNG', 'PNG変換に失敗しました。')), 'image/png'));
}
