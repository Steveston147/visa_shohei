import { A4_HEIGHT_PT } from './constants';

export type TextPlacementKey =
  | 'documentDateYear' | 'documentDateMonth' | 'documentDateDay' | 'diplomaticMission'
  | 'inviterPostalCodeFirst3' | 'inviterPostalCodeLast4' | 'inviterAddress' | 'inviterName'
  | 'inviterPhone' | 'inviterExtension' | 'organisationName' | 'contactPersonName'
  | 'contactPhone' | 'contactExtension' | 'applicantNationality' | 'applicantOccupation'
  | 'applicantPassportName' | 'additionalApplicantsCount' | 'applicantDateOfBirthYear'
  | 'applicantDateOfBirthMonth' | 'applicantDateOfBirthDay' | 'applicantAge'
  | 'invitationPurpose' | 'invitationBackground' | 'relationshipToApplicant';
export type CheckboxPlacementKey = 'applicantGenderMale' | 'applicantGenderFemale';
export type FieldPlacement = {
  xMm: number; yMm: number; widthMm: number; heightMm: number; fontSizePt: number; minFontSizePt?: number;
  align?: 'left' | 'center' | 'right'; verticalAlign?: 'top' | 'middle'; multiline?: boolean; maxLines?: number; lineHeight?: number; paddingMm?: number;
};
type PdfRect = { xPt: number; yPt: number; widthPt: number; heightPt: number };
type PlacementOffset = { xMm?: number; yMm?: number };

function rect({ xPt, yPt, widthPt, heightPt }: PdfRect, extras: Omit<FieldPlacement, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'>): FieldPlacement {
  return { xMm: xPt * 25.4 / 72, yMm: (A4_HEIGHT_PT - (yPt + heightPt)) * 25.4 / 72, widthMm: widthPt * 25.4 / 72, heightMm: heightPt * 25.4 / 72, ...extras };
}

function calibrate(placement: FieldPlacement, { xMm = 0, yMm = 0 }: PlacementOffset): FieldPlacement {
  return { ...placement, xMm: placement.xMm + xMm, yMm: placement.yMm + yMm };
}

const single = { fontSizePt: 10, minFontSizePt: 7, verticalAlign: 'middle' as const, paddingMm: 1 };
const center = { ...single, align: 'center' as const };
const narrative = { fontSizePt: 11, minFontSizePt: 8, verticalAlign: 'top' as const, multiline: true, maxLines: 2, lineHeight: 1.28, paddingMm: 1.8 };

// Base coordinates come from docs/pdf-field-inspection.md (PDF points, bottom-left origin).
// Small millimetre offsets below are visual calibration against the 300dpi background and are kept
// here, rather than hidden in the drawing code, so later print calibration remains easy to review.
export const textPlacements: Record<TextPlacementKey, FieldPlacement> = {
  documentDateYear: rect({ xPt: 409.29, yPt: 740.57, widthPt: 29.06, heightPt: 16.80 }, center),
  documentDateMonth: rect({ xPt: 451.18, yPt: 740.57, widthPt: 29.06, heightPt: 16.80 }, center),
  documentDateDay: rect({ xPt: 492.42, yPt: 740.57, widthPt: 29.06, heightPt: 16.80 }, center),
  diplomaticMission: rect({ xPt: 102.24, yPt: 713.24, widthPt: 87.97, heightPt: 16.80 }, { ...center, fontSizePt: 12 }),
  inviterPostalCodeFirst3: rect({ xPt: 207.98, yPt: 631.59, widthPt: 49.35, heightPt: 16.80 }, center),
  inviterPostalCodeLast4: rect({ xPt: 269.80, yPt: 631.96, widthPt: 44.77, heightPt: 16.80 }, center),
  inviterAddress: calibrate(rect({ xPt: 189.48, yPt: 608.48, widthPt: 297.84, heightPt: 16.80 }, single), { yMm: -0.45 }),
  inviterName: calibrate(rect({ xPt: 189.48, yPt: 585.32, widthPt: 297.84, heightPt: 16.80 }, single), { yMm: -0.45 }),
  inviterPhone: calibrate(rect({ xPt: 189.03, yPt: 567.39, widthPt: 188.77, heightPt: 16.80 }, center), { yMm: -0.35 }),
  inviterExtension: calibrate(rect({ xPt: 418.96, yPt: 567.19, widthPt: 68.99, heightPt: 16.80 }, center), { yMm: -0.35 }),
  organisationName: calibrate(rect({ xPt: 189.48, yPt: 513.56, widthPt: 297.84, heightPt: 15.72 }, single), { yMm: -0.45 }),
  contactPersonName: calibrate(rect({ xPt: 189.48, yPt: 494.12, widthPt: 297.84, heightPt: 16.80 }, single), { yMm: -0.45 }),
  contactPhone: calibrate(rect({ xPt: 188.85, yPt: 477.23, widthPt: 188.77, heightPt: 16.80 }, center), { yMm: -0.35 }),
  contactExtension: calibrate(rect({ xPt: 417.58, yPt: 477.28, widthPt: 70.95, heightPt: 16.80 }, center), { yMm: -0.35 }),
  applicantNationality: calibrate(rect({ xPt: 189.48, yPt: 353.60, widthPt: 248.76, heightPt: 16.80 }, single), { yMm: -0.40 }),
  applicantOccupation: calibrate(rect({ xPt: 189.48, yPt: 336.08, widthPt: 248.76, heightPt: 16.80 }, single), { yMm: -0.40 }),
  applicantPassportName: calibrate(rect({ xPt: 189.43, yPt: 318.63, widthPt: 189.43, heightPt: 16.80 }, single), { yMm: -0.40 }),
  additionalApplicantsCount: rect({ xPt: 488.20, yPt: 317.34, widthPt: 29.06, heightPt: 16.80 }, center),
  applicantDateOfBirthYear: calibrate(rect({ xPt: 226.20, yPt: 300.16, widthPt: 49.32, heightPt: 16.80 }, center), { yMm: -0.20 }),
  applicantDateOfBirthMonth: calibrate(rect({ xPt: 296.40, yPt: 300.16, widthPt: 21.84, heightPt: 16.80 }, center), { yMm: -0.20 }),
  applicantDateOfBirthDay: calibrate(rect({ xPt: 343.20, yPt: 300.16, widthPt: 22.08, heightPt: 16.80 }, center), { yMm: -0.20 }),
  applicantAge: calibrate(rect({ xPt: 398.76, yPt: 300.16, widthPt: 32.40, heightPt: 16.80 }, center), { yMm: -0.20 }),
  invitationPurpose: calibrate(rect({ xPt: 108.00, yPt: 190.68, widthPt: 395.28, heightPt: 38.40 }, narrative), { yMm: 0.45 }),
  invitationBackground: calibrate(rect({ xPt: 108.00, yPt: 136.44, widthPt: 395.28, heightPt: 37.09 }, narrative), { yMm: 0.45 }),
  relationshipToApplicant: calibrate(rect({ xPt: 108.00, yPt: 82.08, widthPt: 395.28, heightPt: 36.44 }, { ...narrative, maxLines: 1 }), { yMm: 0.45 }),
};
export const checkboxPlacements: Record<CheckboxPlacementKey, FieldPlacement> = {
  applicantGenderMale: calibrate(rect({ xPt: 403.44, yPt: 320.52, widthPt: 12.00, heightPt: 12.00 }, { fontSizePt: 10 }), { xMm: 0.25, yMm: -0.20 }),
  applicantGenderFemale: calibrate(rect({ xPt: 427.56, yPt: 320.52, widthPt: 12.00, heightPt: 12.00 }, { fontSizePt: 10 }), { xMm: 0.25, yMm: -0.20 }),
};
