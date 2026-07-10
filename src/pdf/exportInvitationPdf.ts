import { PDFDocument } from 'pdf-lib';
import { A4_HEIGHT_PT, A4_WIDTH_PT } from './constants';
import { canvasToPngBlob, InvitationRenderError } from './canvasText';
export async function exportInvitationPdf(canvas: HTMLCanvasElement) {
  try {
    const pngBlob = await canvasToPngBlob(canvas);
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([A4_WIDTH_PT, A4_HEIGHT_PT]);
    const png = await pdfDoc.embedPng(await pngBlob.arrayBuffer());
    page.drawImage(png, { x: 0, y: 0, width: A4_WIDTH_PT, height: A4_HEIGHT_PT });
    return new Blob([new Uint8Array(await pdfDoc.save({ useObjectStreams: false }))], { type: 'application/pdf' });
  } catch (e) { if (e instanceof InvitationRenderError) throw e; throw new InvitationRenderError('PDF_CREATION', 'PDF作成に失敗しました。', e); }
}
