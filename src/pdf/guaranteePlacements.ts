import { A4_HEIGHT_PT } from './constants';
import type { FieldPlacement } from './placements';

export type GuaranteeTextPlacementKey =
  | 'documentNumber'
  | 'documentDateYear'
  | 'documentDateMonth'
  | 'documentDateDay'
  | 'diplomaticMission'
  | 'applicantNationality'
  | 'applicantOccupation'
  | 'applicantPassportName'
  | 'applicantBirthYear'
  | 'applicantBirthMonth'
  | 'applicantBirthDay'
  | 'applicantAge'
  | 'guarantorPostalCodeFirst3'
  | 'guarantorPostalCodeLast4'
  | 'guarantorAddress'
  | 'guarantorOccupation'
  | 'guarantorName'
  | 'guarantorBirthYear'
  | 'guarantorBirthMonth'
  | 'guarantorBirthDay'
  | 'guarantorAge'
  | 'guarantorPhone'
  | 'guarantorExtension'
  | 'guarantorFax'
  | 'relationshipToApplicant'
  | 'organisationName'
  | 'contactPersonName'
  | 'contactPhone'
  | 'contactExtension'
  | 'contactFax';

export type GuaranteeCheckboxPlacementKey =
  | 'missionEmbassy'
  | 'missionConsulate'
  | 'applicantGenderMale'
  | 'applicantGenderFemale';

type PdfRect = { xPt: number; yPt: number; widthPt: number; heightPt: number };

function rect(
  { xPt, yPt, widthPt, heightPt }: PdfRect,
  extras: Omit<FieldPlacement, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'>,
): FieldPlacement {
  return {
    xMm: xPt * 25.4 / 72,
    yMm: (A4_HEIGHT_PT - (yPt + heightPt)) * 25.4 / 72,
    widthMm: widthPt * 25.4 / 72,
    heightMm: heightPt * 25.4 / 72,
    ...extras,
  };
}

const single = {
  fontSizePt: 10,
  minFontSizePt: 7,
  verticalAlign: 'middle' as const,
  paddingMm: 0.8,
};
const centre = { ...single, align: 'center' as const };
const right = { ...single, align: 'right' as const };

/**
 * Coordinates below come directly from the AcroForm widget rectangles in the
 * official one-page PDF supplied by the user. PDF coordinates use a bottom-left
 * origin; rect() converts them to millimetres from the A4 top-left corner.
 */
export const guaranteeTextPlacements: Record<GuaranteeTextPlacementKey, FieldPlacement> = {
  // The official form has no AcroForm field for an internal document number.
  // This is the only application-specific overlay and is deliberately kept in
  // the otherwise unused top-right margin above the official date fields.
  documentNumber: { xMm: 157, yMm: 16, widthMm: 43, heightMm: 7, ...right, fontSizePt: 8, minFontSizePt: 6 },

  documentDateYear: rect({ xPt: 429.641, yPt: 746.561, widthPt: 31.485, heightPt: 16.68 }, centre),
  documentDateMonth: rect({ xPt: 469.859, yPt: 746.925, widthPt: 32.795, heightPt: 16.68 }, centre),
  documentDateDay: rect({ xPt: 512.696, yPt: 747.289, widthPt: 33.449, heightPt: 16.68 }, centre),
  diplomaticMission: rect({ xPt: 83.9346, yPt: 714.415, widthPt: 92.4544, heightPt: 16.8 }, { ...centre, fontSizePt: 11 }),

  applicantNationality: rect({ xPt: 175.32, yPt: 617.4, widthPt: 237.48, heightPt: 16.8 }, single),
  applicantOccupation: rect({ xPt: 175.32, yPt: 599.88, widthPt: 237.48, heightPt: 16.8 }, single),
  applicantPassportName: rect({ xPt: 174.825, yPt: 581.846, widthPt: 204.753, heightPt: 16.8 }, single),
  applicantBirthYear: rect({ xPt: 213.12, yPt: 564.84, widthPt: 50.4, heightPt: 16.8 }, centre),
  applicantBirthMonth: rect({ xPt: 285.48, yPt: 564.84, widthPt: 26.16, heightPt: 16.8 }, centre),
  applicantBirthDay: rect({ xPt: 340.68, yPt: 564.84, widthPt: 26.4, heightPt: 16.8 }, centre),
  applicantAge: rect({ xPt: 403.8, yPt: 564.84, widthPt: 33.6, heightPt: 16.8 }, centre),

  guarantorPostalCodeFirst3: rect({ xPt: 194.004, yPt: 388.524, widthPt: 41.303, heightPt: 16.68 }, centre),
  guarantorPostalCodeLast4: rect({ xPt: 246.077, yPt: 388.814, widthPt: 41.303, heightPt: 16.68 }, centre),
  guarantorAddress: rect({ xPt: 177.24, yPt: 371.04, widthPt: 339.96, heightPt: 16.8 }, single),
  guarantorOccupation: rect({ xPt: 177.24, yPt: 353.52, widthPt: 310.68, heightPt: 16.8 }, single),
  // The PDF widget for this field is shorter than the printed line. The width
  // follows the printed line so affiliation, title and name can fit as required.
  guarantorName: rect({ xPt: 177.383, yPt: 332.365, widthPt: 310.537, heightPt: 16.68 }, single),
  guarantorBirthYear: rect({ xPt: 207.458, yPt: 313.541, widthPt: 61.595, heightPt: 16.68 }, centre),
  guarantorBirthMonth: rect({ xPt: 280.44, yPt: 314.196, widthPt: 41.304, heightPt: 16.68 }, centre),
  guarantorBirthDay: rect({ xPt: 332.477, yPt: 314.196, widthPt: 41.304, heightPt: 16.68 }, centre),
  guarantorAge: rect({ xPt: 399.96, yPt: 314.16, widthPt: 33.24, heightPt: 16.8 }, centre),
  guarantorPhone: rect({ xPt: 177.383, yPt: 297.019, widthPt: 204.621, heightPt: 16.68 }, single),
  guarantorExtension: rect({ xPt: 416.88, yPt: 296.674, widthPt: 68.795, heightPt: 16.68 }, centre),
  guarantorFax: rect({ xPt: 177.24, yPt: 279.12, widthPt: 308.04, heightPt: 16.8 }, single),
  relationshipToApplicant: rect({ xPt: 177.24, yPt: 261.6, widthPt: 308.04, heightPt: 16.8 }, single),

  organisationName: rect({ xPt: 177.24, yPt: 219.72, widthPt: 308.04, heightPt: 14.64 }, single),
  contactPersonName: rect({ xPt: 177.24, yPt: 205.68, widthPt: 308.04, heightPt: 13.44 }, single),
  contactPhone: rect({ xPt: 177.383, yPt: 189.019, widthPt: 205.276, heightPt: 16.68 }, single),
  contactExtension: rect({ xPt: 416.259, yPt: 190.486, widthPt: 68.795, heightPt: 16.68 }, centre),
  contactFax: rect({ xPt: 177.24, yPt: 177.36, widthPt: 308.88, heightPt: 13.44 }, single),
};

export const guaranteeCheckboxPlacements: Record<GuaranteeCheckboxPlacementKey, FieldPlacement> = {
  missionEmbassy: rect({ xPt: 255.0, yPt: 735.48, widthPt: 10.56, heightPt: 7.08 }, { fontSizePt: 10 }),
  missionConsulate: rect({ xPt: 255.84, yPt: 702.72, widthPt: 10.56, heightPt: 7.08 }, { fontSizePt: 10 }),
  applicantGenderMale: rect({ xPt: 420.6, yPt: 585.36, widthPt: 10.56, heightPt: 7.08 }, { fontSizePt: 10 }),
  applicantGenderFemale: rect({ xPt: 452.04, yPt: 585.36, widthPt: 10.56, heightPt: 7.08 }, { fontSizePt: 10 }),
};
