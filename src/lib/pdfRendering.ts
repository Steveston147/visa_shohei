import { PDFDocument, PDFForm, PDFPage, PDFFont, rgb } from 'pdf-lib';
import type { InvitationReasonPdfFieldKey } from './pdfFieldNames';

type PdfDocumentPrototype = PDFDocument & {
  __invitationReasonSaveCompatPatched?: true;
  save: (...args: unknown[]) => Promise<Uint8Array>;
};

type PdfFormPrototype = PDFForm & {
  __invitationReasonFlattenCompatPatched?: true;
  flatten: (...args: unknown[]) => void;
};

function objectOption(value: unknown) {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function installPdfSaveCompatibilityDefaults() {
  const prototype = PDFDocument.prototype as unknown as PdfDocumentPrototype;
  if (prototype.__invitationReasonSaveCompatPatched) return;

  const originalSave = prototype.save;

  // Adobe Acrobat / HP Sure Click can be strict with compressed object streams.
  // Keep saved visa PDFs conservative while leaving font embedding/subsetting to pdf-lib.
  prototype.save = function saveWithCompatibleDefaults(this: PDFDocument, options?: unknown) {
    return originalSave.call(this, { useObjectStreams: false, ...objectOption(options) });
  };

  prototype.__invitationReasonSaveCompatPatched = true;
}

function installPdfFormFlattenCompatibilityDefaults() {
  const prototype = PDFForm.prototype as unknown as PdfFormPrototype;
  if (prototype.__invitationReasonFlattenCompatPatched) return;

  // The source template contains AcroForm widgets. pdf-lib flattening those widgets produced
  // malformed XObjects in Acrobat / HP Sure Click. Visible text is now drawn directly onto
  // the page, and checkboxes remain as normal AcroForm widgets, so skip flattening here.
  prototype.flatten = function skipFlattenForInvitationReasonPdf() {
    return undefined;
  };

  prototype.__invitationReasonFlattenCompatPatched = true;
}

installPdfSaveCompatibilityDefaults();
installPdfFormFlattenCompatibilityDefaults();

type TextFieldKey = Exclude<InvitationReasonPdfFieldKey, 'applicantGenderMale' | 'applicantGenderFemale'>;

type TextPlacement = {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  xPadding: number;
  yPadding: number;
  multiline?: boolean;
  lineHeight?: number;
};

const normalFontSize = 9.5;
const narrativeFontSize = 10.5;

// Coordinates are the confirmed AcroForm widget rectangles from docs/pdf-field-inspection.md.
// Text is drawn directly onto the page after flattening so pdf-lib AcroForm appearances do not control rendering.
export const invitationReasonTextPlacements: Record<TextFieldKey, TextPlacement> = {
  documentDateYear: { pageIndex: 0, x: 409.29, y: 740.57, width: 29.06, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  documentDateMonth: { pageIndex: 0, x: 451.18, y: 740.57, width: 29.06, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  documentDateDay: { pageIndex: 0, x: 492.42, y: 740.57, width: 29.06, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  diplomaticMission: { pageIndex: 0, x: 102.24, y: 713.24, width: 87.97, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  inviterPostalCodeFirst3: { pageIndex: 0, x: 207.98, y: 631.59, width: 49.35, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  inviterPostalCodeLast4: { pageIndex: 0, x: 269.8, y: 631.96, width: 44.77, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  inviterAddress: { pageIndex: 0, x: 189.48, y: 608.48, width: 297.84, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  inviterName: { pageIndex: 0, x: 189.48, y: 585.32, width: 297.84, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  inviterPhone: { pageIndex: 0, x: 189.03, y: 567.39, width: 188.77, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  inviterExtension: { pageIndex: 0, x: 418.96, y: 567.19, width: 68.99, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  organisationName: { pageIndex: 0, x: 189.48, y: 513.56, width: 297.84, height: 15.72, fontSize: normalFontSize, xPadding: 2, yPadding: 3.6 },
  contactPersonName: { pageIndex: 0, x: 189.48, y: 494.12, width: 297.84, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  contactExtension: { pageIndex: 0, x: 417.58, y: 477.28, width: 70.95, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  contactPhone: { pageIndex: 0, x: 188.85, y: 477.23, width: 188.77, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  applicantNationality: { pageIndex: 0, x: 189.48, y: 353.6, width: 248.76, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  applicantOccupation: { pageIndex: 0, x: 189.48, y: 336.08, width: 248.76, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  applicantPassportName: { pageIndex: 0, x: 189.43, y: 318.63, width: 189.43, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  additionalApplicantsCount: { pageIndex: 0, x: 488.2, y: 317.34, width: 29.06, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  applicantDateOfBirthYear: { pageIndex: 0, x: 226.2, y: 300.16, width: 49.32, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  applicantDateOfBirthMonth: { pageIndex: 0, x: 296.4, y: 300.16, width: 21.84, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  applicantDateOfBirthDay: { pageIndex: 0, x: 343.2, y: 300.16, width: 22.08, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  applicantAge: { pageIndex: 0, x: 398.76, y: 300.16, width: 32.4, height: 16.8, fontSize: normalFontSize, xPadding: 2, yPadding: 4.2 },
  invitationPurpose: { pageIndex: 0, x: 108, y: 190.68, width: 395.28, height: 38.4, fontSize: narrativeFontSize, xPadding: 4, yPadding: 4, multiline: true, lineHeight: 13 },
  invitationBackground: { pageIndex: 0, x: 108, y: 136.44, width: 395.28, height: 37.09, fontSize: narrativeFontSize, xPadding: 4, yPadding: 4, multiline: true, lineHeight: 13 },
  relationshipToApplicant: { pageIndex: 0, x: 108, y: 82.08, width: 395.28, height: 36.44, fontSize: narrativeFontSize, xPadding: 4, yPadding: 4, multiline: true, lineHeight: 13 },
};

function wrapText(value: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of value.split(/\r?\n/)) {
    let line = '';
    for (const char of Array.from(paragraph)) {
      const next = `${line}${char}`;
      if (line && font.widthOfTextAtSize(next, fontSize) > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}

function drawSingleLine(page: PDFPage, value: string, font: PDFFont, placement: TextPlacement) {
  page.drawText(value, {
    x: placement.x + placement.xPadding,
    y: placement.y + placement.yPadding,
    font,
    size: placement.fontSize,
    color: rgb(0, 0, 0),
  });
}

function drawMultiline(page: PDFPage, value: string, font: PDFFont, placement: TextPlacement) {
  const maxWidth = placement.width - placement.xPadding * 2;
  const lineHeight = placement.lineHeight ?? placement.fontSize * 1.25;
  const maxLines = Math.max(1, Math.floor((placement.height - placement.yPadding * 2) / lineHeight) + 1);
  const lines = wrapText(value, font, placement.fontSize, maxWidth).slice(0, maxLines);
  const startY = placement.y + placement.height - placement.yPadding - placement.fontSize;
  lines.forEach((line, index) => {
    page.drawText(line, {
      x: placement.x + placement.xPadding,
      y: startY - index * lineHeight,
      font,
      size: placement.fontSize,
      color: rgb(0, 0, 0),
    });
  });
}

export function drawInvitationReasonText(pages: PDFPage[], values: Record<InvitationReasonPdfFieldKey, string>, font: PDFFont) {
  (Object.keys(invitationReasonTextPlacements) as TextFieldKey[]).forEach((key) => {
    const value = values[key];
    if (!value) return;
    const placement = invitationReasonTextPlacements[key];
    const page = pages[placement.pageIndex];
    if (!page) throw new Error(`PDF page not found for field: ${key}`);
    if (placement.multiline) drawMultiline(page, value, font, placement);
    else drawSingleLine(page, value, font, placement);
  });
}
