import { A4_HEIGHT_MM, A4_WIDTH_MM, CANVAS_FONT_FAMILY } from './constants';
import type { FieldPlacement } from './placements';

export type RenderErrorCode =
  | 'TEXT_OVERFLOW'
  | 'CANVAS_CONTEXT'
  | 'IMAGE_LOAD'
  | 'IMAGE_DIMENSION'
  | 'FONT_LOAD'
  | 'CANVAS_TO_PNG'
  | 'PDF_CREATION';

export class InvitationRenderError extends Error {
  constructor(
    public code: RenderErrorCode,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export function mmToPx(canvas: HTMLCanvasElement, xMm: number, yMm: number) {
  return {
    x: (xMm * canvas.width) / A4_WIDTH_MM,
    y: (yMm * canvas.height) / A4_HEIGHT_MM,
  };
}

export function ptToCanvasPx(canvas: HTMLCanvasElement, sizePt: number) {
  const pixelsPerMillimetre = canvas.height / A4_HEIGHT_MM;
  return (sizePt * pixelsPerMillimetre) / (72 / 25.4);
}

export function assertCurrentA4PointConversion(canvas: HTMLCanvasElement) {
  if (canvas.width !== 2481 || canvas.height !== 3508) return;

  const tenPointPixels = ptToCanvasPx(canvas, 10);
  const elevenPointPixels = ptToCanvasPx(canvas, 11);

  console.assert(
    Math.abs(tenPointPixels - 41.7) < 0.15,
    `10pt should be approximately 41.7 Canvas pixels; received ${tenPointPixels.toFixed(2)}.`,
  );
  console.assert(
    Math.abs(elevenPointPixels - 45.8) < 0.15,
    `11pt should be approximately 45.8 Canvas pixels; received ${elevenPointPixels.toFixed(2)}.`,
  );
}

function setCanvasFont(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, sizePt: number) {
  const fontPixels = ptToCanvasPx(canvas, sizePt);
  ctx.font = `${fontPixels}px "${CANVAS_FONT_FAMILY}"`;
  return fontPixels;
}

function rectPx(canvas: HTMLCanvasElement, placement: FieldPlacement) {
  const origin = mmToPx(canvas, placement.xMm, placement.yMm);
  const size = mmToPx(canvas, placement.widthMm, placement.heightMm);
  const padding = mmToPx(canvas, placement.paddingMm ?? 0, placement.paddingMm ?? 0);

  return {
    x: origin.x + padding.x,
    y: origin.y + padding.y,
    width: size.x - padding.x * 2,
    height: size.y - padding.y * 2,
  };
}

function textFits(ctx: CanvasRenderingContext2D, text: string, width: number) {
  return ctx.measureText(text).width <= width;
}

function alignedX(rect: ReturnType<typeof rectPx>, placement: FieldPlacement) {
  if (placement.align === 'center') return rect.x + rect.width / 2;
  if (placement.align === 'right') return rect.x + rect.width;
  return rect.x;
}

const tokenPattern = /[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*|[ \t]+|[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]|./gu;
const latinWordPattern = /^[A-Za-z0-9]+(?:['’\-][A-Za-z0-9]+)*$/u;

function tokenizeParagraph(paragraph: string) {
  return paragraph.match(tokenPattern) ?? [];
}

function splitOverwideToken(ctx: CanvasRenderingContext2D, token: string, width: number) {
  const chunks: string[] = [];
  let current = '';

  for (const character of Array.from(token)) {
    const candidate = current + character;
    if (current && !textFits(ctx, candidate, width)) {
      chunks.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function wrapParagraph(ctx: CanvasRenderingContext2D, paragraph: string, width: number) {
  const lines: string[] = [];
  let current = '';

  for (const token of tokenizeParagraph(paragraph)) {
    const candidate = current + token;
    if (!current || textFits(ctx, candidate, width)) {
      current = candidate;
      continue;
    }

    if (latinWordPattern.test(token) && !textFits(ctx, token, width)) {
      if (current.trim()) lines.push(current.trimEnd());
      const chunks = splitOverwideToken(ctx, token, width);
      lines.push(...chunks.slice(0, -1));
      current = chunks.at(-1) ?? '';
      continue;
    }

    if (current.trim()) lines.push(current.trimEnd());
    current = /^[ \t]+$/u.test(token) ? '' : token.replace(/^[ \t]+/u, '');
  }

  lines.push(current.trimEnd());
  return lines;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  return text
    .split(/\r?\n/u)
    .flatMap((paragraph) => wrapParagraph(ctx, paragraph, width));
}

export function drawSingleLine(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  key: string,
  value: string,
  placement: FieldPlacement,
) {
  const rect = rectPx(canvas, placement);
  const minimumSizePt = placement.minFontSizePt ?? placement.fontSizePt;
  let selectedSizePt: number | null = null;
  let selectedFontPixels = 0;

  for (let sizePt = placement.fontSizePt; sizePt >= minimumSizePt; sizePt -= 0.5) {
    const fontPixels = setCanvasFont(ctx, canvas, sizePt);
    if (textFits(ctx, value, rect.width)) {
      selectedSizePt = sizePt;
      selectedFontPixels = fontPixels;
      break;
    }
  }

  if (selectedSizePt === null) {
    throw new InvitationRenderError('TEXT_OVERFLOW', `文字が枠内に収まりません: ${key}`);
  }

  setCanvasFont(ctx, canvas, selectedSizePt);
  ctx.fillStyle = '#111';
  ctx.textAlign = placement.align ?? 'left';
  ctx.textBaseline = 'alphabetic';

  const metrics = ctx.measureText(value);
  const ascent = metrics.actualBoundingBoxAscent || selectedFontPixels * 0.8;
  const descent = metrics.actualBoundingBoxDescent || selectedFontPixels * 0.2;
  const x = alignedX(rect, placement);
  const y = placement.verticalAlign === 'middle'
    ? rect.y + (rect.height + ascent - descent) / 2
    : rect.y + ascent;

  ctx.fillText(value, x, y);
}

export function drawMultiline(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  key: string,
  value: string,
  placement: FieldPlacement,
) {
  const rect = rectPx(canvas, placement);
  const minimumSizePt = placement.minFontSizePt ?? placement.fontSizePt;
  let selectedSizePt: number | null = null;
  let selectedFontPixels = 0;
  let selectedLines: string[] = [];

  for (let sizePt = placement.fontSizePt; sizePt >= minimumSizePt; sizePt -= 0.5) {
    const fontPixels = setCanvasFont(ctx, canvas, sizePt);
    const lines = wrapText(ctx, value, rect.width);
    const lineHeightPixels = fontPixels * (placement.lineHeight ?? 1.25);
    const fitsLineCount = lines.length <= (placement.maxLines ?? Number.POSITIVE_INFINITY);
    const fitsHeight = lines.length * lineHeightPixels <= rect.height;

    if (fitsLineCount && fitsHeight) {
      selectedSizePt = sizePt;
      selectedFontPixels = fontPixels;
      selectedLines = lines;
      break;
    }
  }

  if (selectedSizePt === null) {
    throw new InvitationRenderError('TEXT_OVERFLOW', `複数行テキストが枠内に収まりません: ${key}`);
  }

  setCanvasFont(ctx, canvas, selectedSizePt);
  ctx.fillStyle = '#111';
  ctx.textAlign = placement.align ?? 'left';
  ctx.textBaseline = 'top';

  const lineHeightPixels = selectedFontPixels * (placement.lineHeight ?? 1.25);
  const x = alignedX(rect, placement);
  selectedLines.forEach((line, index) => {
    ctx.fillText(line, x, rect.y + index * lineHeightPixels);
  });
}

export function drawCheckbox(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  placement: FieldPlacement,
) {
  const rect = rectPx(canvas, placement);
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(2, canvas.width / 1000);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.width * 0.18, rect.y + rect.height * 0.52);
  ctx.lineTo(rect.x + rect.width * 0.42, rect.y + rect.height * 0.75);
  ctx.lineTo(rect.x + rect.width * 0.84, rect.y + rect.height * 0.22);
  ctx.stroke();
  ctx.restore();
}

export function drawDebug(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  key: string,
  placement: FieldPlacement,
) {
  const origin = mmToPx(canvas, placement.xMm, placement.yMm);
  const size = mmToPx(canvas, placement.widthMm, placement.heightMm);

  ctx.save();
  ctx.strokeStyle = 'rgba(255,0,0,.9)';
  ctx.lineWidth = 1;
  ctx.strokeRect(origin.x, origin.y, size.x, size.y);
  ctx.fillStyle = 'rgba(255,0,0,.9)';
  ctx.font = `${ptToCanvasPx(canvas, 6)}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(key, origin.x, Math.max(0, origin.y - ptToCanvasPx(canvas, 7)));
  ctx.restore();
}

export async function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new InvitationRenderError('CANVAS_TO_PNG', 'PNG変換に失敗しました。'));
    }, 'image/png');
  });
}
