import type { InvitationReasonPdfFieldKey } from "./pdfFieldNames";

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_PDF_WIDTH_PT = 595.28;
export const A4_PDF_HEIGHT_PT = 841.89;

export type TextPlacement = {
  type: "single" | "multiline";
  x: number;
  y: number;
  width: number;
  height: number;
  fontSizePt: number;
  minFontSizePt?: number;
  lineHeight?: number;
  maxLines?: number;
};

export type CheckboxPlacement = {
  type: "checkbox";
  x: number;
  y: number;
  size: number;
};

export type Placement = TextPlacement | CheckboxPlacement;

function pdfRectToCanvas(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): Pick<TextPlacement, "x" | "y" | "width" | "height"> {
  const scaleX = 2481 / A4_PDF_WIDTH_PT;
  const scaleY = 3508 / A4_PDF_HEIGHT_PT;
  return {
    x: rect.x * scaleX,
    y: (A4_PDF_HEIGHT_PT - rect.y - rect.height) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

function single(
  rect: { x: number; y: number; width: number; height: number },
  fontSizePt = 10,
): TextPlacement {
  return {
    type: "single",
    ...pdfRectToCanvas(rect),
    fontSizePt,
    minFontSizePt: 7,
  };
}

function multiline(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): TextPlacement {
  return {
    type: "multiline",
    ...pdfRectToCanvas(rect),
    fontSizePt: 11,
    minFontSizePt: 8,
    lineHeight: 1.2,
  };
}

function checkbox(rect: {
  x: number;
  y: number;
  width: number;
  height: number;
}): CheckboxPlacement {
  const converted = pdfRectToCanvas(rect);
  return {
    type: "checkbox",
    x: converted.x,
    y: converted.y,
    size: Math.min(converted.width, converted.height),
  };
}

export const invitationReasonPlacements: Record<
  InvitationReasonPdfFieldKey,
  Placement
> = {
  documentDateYear: single({
    x: 409.29,
    y: 740.57,
    width: 29.06,
    height: 16.8,
  }),
  documentDateMonth: single({
    x: 451.18,
    y: 740.57,
    width: 29.06,
    height: 16.8,
  }),
  documentDateDay: single({ x: 492.42, y: 740.57, width: 29.06, height: 16.8 }),
  diplomaticMission: single({
    x: 102.24,
    y: 713.24,
    width: 87.97,
    height: 16.8,
  }),
  inviterPostalCodeFirst3: single({
    x: 207.98,
    y: 631.59,
    width: 49.35,
    height: 16.8,
  }),
  inviterPostalCodeLast4: single({
    x: 269.8,
    y: 631.96,
    width: 44.77,
    height: 16.8,
  }),
  inviterAddress: single({ x: 189.48, y: 608.48, width: 297.84, height: 16.8 }),
  inviterName: single({ x: 189.48, y: 585.32, width: 297.84, height: 16.8 }),
  inviterPhone: single({ x: 189.03, y: 567.39, width: 188.77, height: 16.8 }),
  inviterExtension: single({
    x: 418.96,
    y: 567.19,
    width: 68.99,
    height: 16.8,
  }),
  organisationName: single({
    x: 189.48,
    y: 513.56,
    width: 297.84,
    height: 15.72,
  }),
  contactPersonName: single({
    x: 189.48,
    y: 494.12,
    width: 297.84,
    height: 16.8,
  }),
  contactPhone: single({ x: 188.85, y: 477.23, width: 188.77, height: 16.8 }),
  contactExtension: single({
    x: 417.58,
    y: 477.28,
    width: 70.95,
    height: 16.8,
  }),
  applicantNationality: single({
    x: 189.48,
    y: 353.6,
    width: 248.76,
    height: 16.8,
  }),
  applicantOccupation: single({
    x: 189.48,
    y: 336.08,
    width: 248.76,
    height: 16.8,
  }),
  applicantPassportName: single({
    x: 189.43,
    y: 318.63,
    width: 189.43,
    height: 16.8,
  }),
  applicantGenderMale: checkbox({
    x: 403.44,
    y: 320.52,
    width: 12,
    height: 12,
  }),
  applicantGenderFemale: checkbox({
    x: 427.56,
    y: 320.52,
    width: 12,
    height: 12,
  }),
  additionalApplicantsCount: single({
    x: 488.2,
    y: 317.34,
    width: 29.06,
    height: 16.8,
  }),
  applicantDateOfBirthYear: single({
    x: 226.2,
    y: 300.16,
    width: 49.32,
    height: 16.8,
  }),
  applicantDateOfBirthMonth: single({
    x: 296.4,
    y: 300.16,
    width: 21.84,
    height: 16.8,
  }),
  applicantDateOfBirthDay: single({
    x: 343.2,
    y: 300.16,
    width: 22.08,
    height: 16.8,
  }),
  applicantAge: single({ x: 398.76, y: 300.16, width: 32.4, height: 16.8 }),
  invitationPurpose: multiline({
    x: 108,
    y: 190.68,
    width: 395.28,
    height: 38.4,
  }),
  invitationBackground: multiline({
    x: 108,
    y: 136.44,
    width: 395.28,
    height: 37.09,
  }),
  relationshipToApplicant: multiline({
    x: 108,
    y: 82.08,
    width: 395.28,
    height: 36.44,
  }),
};
