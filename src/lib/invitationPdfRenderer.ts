import { PDFDocument } from "pdf-lib";
import {
  assertCurrentCanvasPointConversion,
  drawMultiline,
  drawSingleLine,
  loadCanvasFont,
} from "./canvasText";
import {
  A4_PDF_HEIGHT_PT,
  A4_PDF_WIDTH_PT,
  invitationReasonPlacements,
} from "./placements";
import type { InvitationReasonPdfFieldKey } from "./pdfFieldNames";

const BACKGROUND_URL = "/templates/shouhei-riyusho-background-300dpi.png";
const CANVAS_WIDTH = 2481;
const CANVAS_HEIGHT = 3508;

export type InvitationReasonValues = Record<
  InvitationReasonPdfFieldKey,
  string
>;

async function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function drawCheckbox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.save();
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = Math.max(3, size * 0.1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.18, y + size * 0.52);
  ctx.lineTo(x + size * 0.42, y + size * 0.76);
  ctx.lineTo(x + size * 0.84, y + size * 0.2);
  ctx.stroke();
  ctx.restore();
}

export async function renderInvitationReasonPdf(
  values: InvitationReasonValues,
) {
  await loadCanvasFont();
  const background = await loadImage(BACKGROUND_URL);
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  assertCurrentCanvasPointConversion(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D contextを作成できませんでした。");
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  ctx.textBaseline = "alphabetic";

  for (const [key, placement] of Object.entries(invitationReasonPlacements) as [
    InvitationReasonPdfFieldKey,
    (typeof invitationReasonPlacements)[InvitationReasonPdfFieldKey],
  ][]) {
    const value = values[key] ?? "";
    if (placement.type === "checkbox") {
      if (value === "checked")
        drawCheckbox(ctx, placement.x, placement.y, placement.size);
    } else if (placement.type === "multiline") {
      drawMultiline(ctx, canvas, placement, value);
    } else {
      drawSingleLine(ctx, canvas, placement, value);
    }
  }

  const pngBytes = await new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        reject(new Error("CanvasからPNGを作成できませんでした。"));
        return;
      }
      resolve(new Uint8Array(await blob.arrayBuffer()));
    }, "image/png");
  });

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([A4_PDF_WIDTH_PT, A4_PDF_HEIGHT_PT]);
  const png = await pdfDoc.embedPng(pngBytes);
  page.drawImage(png, {
    x: 0,
    y: 0,
    width: A4_PDF_WIDTH_PT,
    height: A4_PDF_HEIGHT_PT,
  });
  return pdfDoc.save();
}
