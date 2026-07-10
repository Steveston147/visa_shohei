import { A4_HEIGHT_MM, CANVAS_FONT_FAMILY, FONT_PATH, mmToCanvasX, mmToCanvasY, ptToCanvasPx } from './pdfCanvasConstants';
import type { TextPlacement } from './placements';

let fontLoadPromise: Promise<void> | null = null;

export async function loadCanvasFont() {
  if (fontLoadPromise) return fontLoadPromise;

  fontLoadPromise = (async () => {
    const face = new FontFace(CANVAS_FONT_FAMILY, `url(${FONT_PATH})`);
    const loadedFace = await face.load();
    document.fonts.add(loadedFace);
    await document.fonts.ready;

    if (!document.fonts.check(`16px ${CANVAS_FONT_FAMILY}`)) {
      throw new Error('NotoSansJP-Regular.ttf could not be loaded for Canvas rendering. Rendering stopped to avoid system-font fallback.');
    }
  })();

  return fontLoadPromise;
}

function setCanvasFont(ctx: CanvasRenderingContext2D, fontPx: number) {
  ctx.font = `${fontPx}px ${CANVAS_FONT_FAMILY}`;
}

function getMetrics(ctx: CanvasRenderingContext2D, text: string, fontPx: number) {
  const metrics = ctx.measureText(text);
  return {
    width: metrics.width,
    ascent: metrics.actualBoundingBoxAscent || fontPx * 0.8,
    descent: metrics.actualBoundingBoxDescent || fontPx * 0.2,
  };
}

function tokenize(text: string) {
  return text.match(/\r\n|\r|\n|[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*|\s+|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|./gu) ?? [];
}

function splitLongToken(ctx: CanvasRenderingContext2D, token: string, maxWidthPx: number) {
  const chunks: string[] = [];
  let current = '';

  for (const character of Array.from(token)) {
    const candidate = current + character;
    if (current && ctx.measureText(candidate).width > maxWidthPx) {
      chunks.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidthPx: number) {
  const lines: string[] = [];
  let current = '';

  for (const token of tokenize(text)) {
    if (token === '\n' || token === '\r' || token === '\r\n') {
      lines.push(current.replace(/[ \t]+$/u, ''));
      current = '';
      continue;
    }

    const candidate = current + token;
    if (!current || ctx.measureText(candidate).width <= maxWidthPx) {
      current = candidate;
      continue;
    }

    if (/^[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*$/u.test(token) && ctx.measureText(token).width > maxWidthPx) {
      if (current.trim()) lines.push(current.replace(/[ \t]+$/u, ''));
      const chunks = splitLongToken(ctx, token, maxWidthPx);
      lines.push(...chunks.slice(0, -1));
      current = chunks.at(-1) ?? '';
      continue;
    }

    if (current.trim()) lines.push(current.replace(/[ \t]+$/u, ''));
    current = /^\s+$/u.test(token) ? '' : token.replace(/^[ \t]+/u, '');
  }

  if (current || !lines.length) lines.push(current.replace(/[ \t]+$/u, ''));
  return lines;
}

export function drawSingleLine(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, placement: TextPlacement, value: string) {
  const minFontSizePt = placement.minFontSizePt ?? placement.fontSizePt;
  const x = mmToCanvasX(canvas, placement.xMm);
  const y = mmToCanvasY(canvas, placement.yMm);
  const width = mmToCanvasX(canvas, placement.widthMm);
  const height = mmToCanvasY(canvas, placement.heightMm);
  let sizePt = placement.fontSizePt;
  let fontPx = ptToCanvasPx(canvas, sizePt);

  while (sizePt > minFontSizePt) {
    setCanvasFont(ctx, fontPx);
    if (ctx.measureText(value).width <= width) break;
    sizePt = Math.max(minFontSizePt, sizePt - 0.5);
    fontPx = ptToCanvasPx(canvas, sizePt);
  }

  setCanvasFont(ctx, fontPx);
  const metrics = getMetrics(ctx, value, fontPx);
  if (metrics.width > width) {
    throw new Error(`Text does not fit field ${placement.key} at minimum font size; refusing to clip or truncate.`);
  }

  const baselineY = y + (height - metrics.ascent - metrics.descent) / 2 + metrics.ascent;
  ctx.fillText(value, x, baselineY);
}

export function drawMultiline(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, placement: TextPlacement, value: string) {
  const fontPx = ptToCanvasPx(canvas, placement.fontSizePt);
  const x = mmToCanvasX(canvas, placement.xMm);
  const y = mmToCanvasY(canvas, placement.yMm);
  const width = mmToCanvasX(canvas, placement.widthMm);
  const height = mmToCanvasY(canvas, placement.heightMm);
  const lineHeightPx = fontPx * (placement.lineHeight ?? 1.25);
  const maxLinesByHeight = Math.max(1, Math.floor(height / lineHeightPx));
  const maxLines = Math.min(placement.maxLines ?? maxLinesByHeight, maxLinesByHeight);

  setCanvasFont(ctx, fontPx);
  const lines = wrapText(ctx, value, width);
  if (lines.length > maxLines) {
    throw new Error(`Text does not fit multiline field ${placement.key}; refusing to clip or truncate.`);
  }

  const metrics = getMetrics(ctx, lines[0] ?? '', fontPx);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + metrics.ascent + index * lineHeightPx);
  });
}
