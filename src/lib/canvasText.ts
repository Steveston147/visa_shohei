import { A4_HEIGHT_MM, type TextPlacement } from "./placements";

export const CANVAS_FONT_FAMILY = "NotoSansJPInvitation";
const FONT_URL = "/fonts/NotoSansJP-Regular.ttf";
const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;

let fontLoadPromise: Promise<void> | null = null;

export function ptToCanvasPx(canvas: HTMLCanvasElement, pt: number) {
  const pxPerMmY = canvas.height / A4_HEIGHT_MM;
  return (pt * pxPerMmY) / (POINTS_PER_INCH / MM_PER_INCH);
}

export function assertCurrentCanvasPointConversion(canvas: HTMLCanvasElement) {
  const tenPt = ptToCanvasPx(canvas, 10);
  const elevenPt = ptToCanvasPx(canvas, 11);
  console.assert(
    Math.abs(tenPt - 41.7) < 0.2,
    `10pt should convert to about 41.7 canvas px; got ${tenPt.toFixed(2)}px.`,
  );
  console.assert(
    Math.abs(elevenPt - 45.8) < 0.2,
    `11pt should convert to about 45.8 canvas px; got ${elevenPt.toFixed(2)}px.`,
  );
}

export async function loadCanvasFont() {
  if (fontLoadPromise) return fontLoadPromise;

  fontLoadPromise = (async () => {
    const face = new FontFace(CANVAS_FONT_FAMILY, `url(${FONT_URL})`);
    const loadedFace = await face.load();
    document.fonts.add(loadedFace);
    await document.fonts.ready;
    if (!document.fonts.check(`16px ${CANVAS_FONT_FAMILY}`)) {
      throw new Error("日本語表示用フォントの読み込み確認に失敗しました。");
    }
  })();

  return fontLoadPromise;
}

function setFont(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  sizePt: number,
) {
  const fontPx = ptToCanvasPx(canvas, sizePt);
  ctx.font = `${fontPx}px ${CANVAS_FONT_FAMILY}`;
  return fontPx;
}

function measureHeight(
  ctx: CanvasRenderingContext2D,
  fontPx: number,
  text: string,
) {
  const metrics = ctx.measureText(text || "M");
  return {
    ascent: metrics.actualBoundingBoxAscent || fontPx * 0.8,
    descent: metrics.actualBoundingBoxDescent || fontPx * 0.2,
  };
}

export function drawSingleLine(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  placement: TextPlacement,
  text: string,
) {
  const value = text.trim();
  if (!value) return;

  const minFontSizePt = placement.minFontSizePt ?? placement.fontSizePt;
  let candidatePt = placement.fontSizePt;
  let fontPx = setFont(ctx, canvas, candidatePt);

  while (
    candidatePt > minFontSizePt &&
    ctx.measureText(value).width > placement.width
  ) {
    candidatePt = Math.max(minFontSizePt, candidatePt - 0.5);
    fontPx = setFont(ctx, canvas, candidatePt);
  }

  const { ascent, descent } = measureHeight(ctx, fontPx, value);
  const baseline =
    placement.y + (placement.height - ascent - descent) / 2 + ascent;
  ctx.fillText(value, placement.x, baseline);
}

type Token = {
  value: string;
  kind: "word" | "space" | "newline" | "cjk" | "other";
};

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const pattern =
    /\r\n|\n|[A-Za-z0-9'’-]+|[ \t]+|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]|./gu;
  for (const match of text.matchAll(pattern)) {
    const value = match[0];
    if (value === "\n" || value === "\r\n")
      tokens.push({ value: "\n", kind: "newline" });
    else if (/^[ \t]+$/.test(value)) tokens.push({ value, kind: "space" });
    else if (/^[A-Za-z0-9'’-]+$/.test(value))
      tokens.push({ value, kind: "word" });
    else if (
      /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]$/u.test(
        value,
      )
    )
      tokens.push({ value, kind: "cjk" });
    else tokens.push({ value, kind: "other" });
  }
  return tokens;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  const pushLine = () => {
    lines.push(line.replace(/[ \t]+$/u, ""));
    line = "";
  };

  for (const token of tokenize(text)) {
    if (token.kind === "newline") {
      pushLine();
      continue;
    }

    const candidate = line + token.value;
    if (!line || ctx.measureText(candidate).width <= width) {
      line = candidate;
      continue;
    }

    if (token.kind === "word" && ctx.measureText(token.value).width > width) {
      for (const char of token.value) {
        const charCandidate = line + char;
        if (line && ctx.measureText(charCandidate).width > width) pushLine();
        line += char;
      }
      continue;
    }

    pushLine();
    line = token.kind === "space" ? "" : token.value;
  }

  if (line) pushLine();
  return lines;
}

export function drawMultiline(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  placement: TextPlacement,
  text: string,
) {
  if (!text.trim()) return;
  const fontPx = setFont(ctx, canvas, placement.fontSizePt);
  const lineHeightPx = fontPx * (placement.lineHeight ?? 1.2);
  const maxLinesByHeight = Math.floor(placement.height / lineHeightPx);
  const maxLines = Math.max(
    0,
    Math.min(placement.maxLines ?? Number.POSITIVE_INFINITY, maxLinesByHeight),
  );
  if (maxLines === 0) return;

  const lines = wrapText(ctx, text, placement.width).slice(0, maxLines);
  const { ascent } = measureHeight(ctx, fontPx, text);
  lines.forEach((line, index) => {
    ctx.fillText(
      line,
      placement.x,
      placement.y + ascent + index * lineHeightPx,
    );
  });
}
