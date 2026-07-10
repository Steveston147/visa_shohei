import { PDFDocument } from 'pdf-lib';
import { A4_CANVAS_HEIGHT, A4_CANVAS_WIDTH, assertCurrentA4PointConversion, mmToCanvasX, mmToCanvasY } from './pdfCanvasConstants';
import { drawMultiline, drawSingleLine, loadCanvasFont } from './canvasText';
import { checkPlacements, textPlacements } from './placements';

const backgroundPath = '/templates/shouhei-riyusho-background-300dpi.png';

export type InvitationRenderValues = Record<string, string>;

async function loadImage(src: string) {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  await image.decode();
  return image;
}

function createCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = A4_CANVAS_WIDTH;
  canvas.height = A4_CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context is unavailable.');
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#111';
  return { canvas, ctx };
}


function drawChecks(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, values: InvitationRenderValues) {
  ctx.save();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = Math.max(2, canvas.width / 1000);

  for (const placement of checkPlacements) {
    if (values[placement.key] !== 'checked') continue;

    const x = mmToCanvasX(canvas, placement.xMm);
    const y = mmToCanvasY(canvas, placement.yMm);
    const size = mmToCanvasY(canvas, placement.sizeMm);

    ctx.beginPath();
    ctx.moveTo(x, y + size * 0.55);
    ctx.lineTo(x + size * 0.35, y + size);
    ctx.lineTo(x + size, y);
    ctx.stroke();
  }

  ctx.restore();
}

async function canvasToPngBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Canvas PNG generation failed.');
  return new Uint8Array(await blob.arrayBuffer());
}

export async function renderInvitationPdf(values: InvitationRenderValues) {
  await loadCanvasFont();

  const { canvas, ctx } = createCanvas();
  assertCurrentA4PointConversion(canvas);

  const background = await loadImage(backgroundPath);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  for (const placement of textPlacements) {
    const value = values[placement.key] ?? '';
    if (!value) continue;

    if (placement.multiline) {
      drawMultiline(ctx, canvas, placement, value);
    } else {
      drawSingleLine(ctx, canvas, placement, value);
    }
  }

  drawChecks(ctx, canvas, values);

  const pngBytes = await canvasToPngBytes(canvas);
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const png = await pdfDoc.embedPng(pngBytes);
  page.drawImage(png, { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() });
  return pdfDoc.save();
}
