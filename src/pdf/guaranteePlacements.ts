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
  | 'guarantorPostalCode'
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

const single = {
  fontSizePt: 10,
  minFontSizePt: 7,
  verticalAlign: 'middle' as const,
  paddingMm: 0.8,
};
const centre = { ...single, align: 'center' as const };
const right = { ...single, align: 'right' as const };

// All coordinates are millimetres from the top-left corner of the A4 page.
// They intentionally live in one file so print calibration can be adjusted without
// changing the renderer. Initial values are converted from the previous preview.
export const guaranteeTextPlacements: Record<GuaranteeTextPlacementKey, FieldPlacement> = {
  documentNumber: { xMm: 157, yMm: 17, widthMm: 43, heightMm: 8, ...right, fontSizePt: 9 },
  documentDateYear: { xMm: 163, yMm: 28, widthMm: 12, heightMm: 7, ...centre },
  documentDateMonth: { xMm: 180, yMm: 28, widthMm: 9, heightMm: 7, ...centre },
  documentDateDay: { xMm: 193, yMm: 28, widthMm: 8, heightMm: 7, ...centre },
  diplomaticMission: { xMm: 27, yMm: 39, widthMm: 31, heightMm: 8, ...centre, fontSizePt: 10 },

  applicantNationality: { xMm: 65, yMm: 76, widthMm: 85, heightMm: 7, ...single },
  applicantOccupation: { xMm: 65, yMm: 82.5, widthMm: 85, heightMm: 7, ...single },
  applicantPassportName: { xMm: 65, yMm: 89, widthMm: 72, heightMm: 7, ...single },
  applicantBirthYear: { xMm: 79, yMm: 96, widthMm: 13, heightMm: 7, ...centre },
  applicantBirthMonth: { xMm: 103, yMm: 96, widthMm: 8, heightMm: 7, ...centre },
  applicantBirthDay: { xMm: 121, yMm: 96, widthMm: 8, heightMm: 7, ...centre },
  applicantAge: { xMm: 150, yMm: 96, widthMm: 10, heightMm: 7, ...centre },

  guarantorPostalCode: { xMm: 68, yMm: 159, widthMm: 30, heightMm: 7, ...single },
  guarantorAddress: { xMm: 65, yMm: 166, widthMm: 119, heightMm: 7, ...single },
  guarantorOccupation: { xMm: 65, yMm: 173, widthMm: 112, heightMm: 7, ...single },
  guarantorName: { xMm: 65, yMm: 179.5, widthMm: 112, heightMm: 7, ...single },
  guarantorBirthYear: { xMm: 96, yMm: 186, widthMm: 14, heightMm: 7, ...centre },
  guarantorBirthMonth: { xMm: 116, yMm: 186, widthMm: 9, heightMm: 7, ...centre },
  guarantorBirthDay: { xMm: 134, yMm: 186, widthMm: 9, heightMm: 7, ...centre },
  guarantorAge: { xMm: 157, yMm: 186, widthMm: 10, heightMm: 7, ...centre },
  guarantorPhone: { xMm: 65, yMm: 193, widthMm: 68, heightMm: 7, ...single },
  guarantorExtension: { xMm: 143, yMm: 193, widthMm: 29, heightMm: 7, ...centre },
  guarantorFax: { xMm: 65, yMm: 200, widthMm: 110, heightMm: 7, ...single },
  relationshipToApplicant: { xMm: 65, yMm: 207, widthMm: 110, heightMm: 7, ...single },

  organisationName: { xMm: 65, yMm: 220, widthMm: 110, heightMm: 7, ...single },
  contactPersonName: { xMm: 65, yMm: 226.5, widthMm: 110, heightMm: 7, ...single },
  contactPhone: { xMm: 65, yMm: 233, widthMm: 68, heightMm: 7, ...single },
  contactExtension: { xMm: 143, yMm: 233, widthMm: 29, heightMm: 7, ...centre },
  contactFax: { xMm: 65, yMm: 240, widthMm: 110, heightMm: 7, ...single },
};

export const guaranteeCheckboxPlacements: Record<GuaranteeCheckboxPlacementKey, FieldPlacement> = {
  missionEmbassy: { xMm: 92, yMm: 34.5, widthMm: 5, heightMm: 5, fontSizePt: 10 },
  missionConsulate: { xMm: 92, yMm: 46.5, widthMm: 5, heightMm: 5, fontSizePt: 10 },
  applicantGenderMale: { xMm: 153, yMm: 87.5, widthMm: 5, heightMm: 5, fontSizePt: 10 },
  applicantGenderFemale: { xMm: 166, yMm: 87.5, widthMm: 5, heightMm: 5, fontSizePt: 10 },
};
