import { A4_HEIGHT_PT, A4_WIDTH_PT, CANVAS_FONT_FAMILY } from './constants';

const DEFAULT_RIGHT_EDGE_PT = 535;
const DEFAULT_BASELINE_FROM_TOP_PT = 72;
const MAX_WIDTH_PT = 190;
const DEFAULT_FONT_SIZE_PT = 10;
const MIN_FONT_SIZE_PT = 7;

export type DrawDocumentNumberOptions = {
  rightEdgePt?: number;
  baselineFromTopPt?: number;
};

export function drawDocumentNumber(
  canvas: HTMLCanvasElement,
  documentNumber: string,
  options: DrawDocumentNumberOptions = {},
) {
  const text = documentNumber.trim();
  if (!text) return canvas;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('公文書番号を描画するCanvasを取得できませんでした。');

  const scaleX = canvas.width / A4_WIDTH_PT;
  const scaleY = canvas.height / A4_HEIGHT_PT;
  const maxWidth = MAX_WIDTH_PT * scaleX;
  const rightEdgePt = options.rightEdgePt ?? DEFAULT_RIGHT_EDGE_PT;
  const baselineFromTopPt = options.baselineFromTopPt ?? DEFAULT_BASELINE_FROM_TOP_PT;
  let fontSize = DEFAULT_FONT_SIZE_PT;

  ctx.save();
  ctx.fillStyle = '#000';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  while (fontSize > MIN_FONT_SIZE_PT) {
    ctx.font = `${fontSize * scaleY}px "${CANVAS_FONT_FAMILY}"`;
    if (ctx.measureText(text).width <= maxWidth) break;
    fontSize -= 0.25;
  }

  ctx.font = `${fontSize * scaleY}px "${CANVAS_FONT_FAMILY}"`;
  ctx.fillText(text, rightEdgePt * scaleX, baselineFromTopPt * scaleY, maxWidth);
  ctx.restore();
  return canvas;
}
