export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_CANVAS_WIDTH = 2481;
export const A4_CANVAS_HEIGHT = 3508;
export const CANVAS_FONT_FAMILY = 'Noto Sans JP Invitation';
export const FONT_PATH = '/fonts/NotoSansJP-Regular.ttf';

export function mmToCanvasX(canvas: HTMLCanvasElement, mm: number) {
  return (mm / A4_WIDTH_MM) * canvas.width;
}

export function mmToCanvasY(canvas: HTMLCanvasElement, mm: number) {
  return (mm / A4_HEIGHT_MM) * canvas.height;
}

export function ptToCanvasPx(canvas: HTMLCanvasElement, pt: number) {
  const pxPerMmY = canvas.height / A4_HEIGHT_MM;
  return (pt * pxPerMmY) / (72 / 25.4);
}

export function assertCurrentA4PointConversion(canvas: HTMLCanvasElement) {
  const tenPointPx = ptToCanvasPx(canvas, 10);
  const elevenPointPx = ptToCanvasPx(canvas, 11);

  if (canvas.width === A4_CANVAS_WIDTH && canvas.height === A4_CANVAS_HEIGHT) {
    console.assert(
      Math.abs(tenPointPx - 41.7) < 0.15,
      `Expected 10pt to be approximately 41.7 canvas pixels, got ${tenPointPx.toFixed(2)}`,
    );
    console.assert(
      Math.abs(elevenPointPx - 45.8) < 0.15,
      `Expected 11pt to be approximately 45.8 canvas pixels, got ${elevenPointPx.toFixed(2)}`,
    );
  }
}
