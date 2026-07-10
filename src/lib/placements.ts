export type TextPlacement = {
  key: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontSizePt: number;
  minFontSizePt?: number;
  multiline?: boolean;
  maxLines?: number;
  lineHeight?: number;
};

export const textPlacements: TextPlacement[] = [
  { key: 'documentDateYear', xMm: 154, yMm: 24, widthMm: 12, heightMm: 5, fontSizePt: 10 },
  { key: 'documentDateMonth', xMm: 172, yMm: 24, widthMm: 8, heightMm: 5, fontSizePt: 10 },
  { key: 'documentDateDay', xMm: 186, yMm: 24, widthMm: 8, heightMm: 5, fontSizePt: 10 },
  { key: 'diplomaticMission', xMm: 76, yMm: 39, widthMm: 38, heightMm: 6, fontSizePt: 11, minFontSizePt: 8 },
  { key: 'inviterPostalCodeFirst3', xMm: 32, yMm: 195, widthMm: 16, heightMm: 5, fontSizePt: 10 },
  { key: 'inviterPostalCodeLast4', xMm: 53, yMm: 195, widthMm: 20, heightMm: 5, fontSizePt: 10 },
  { key: 'inviterAddress', xMm: 31, yMm: 203, widthMm: 124, heightMm: 8, fontSizePt: 10, minFontSizePt: 8 },
  { key: 'inviterName', xMm: 31, yMm: 214, widthMm: 75, heightMm: 7, fontSizePt: 11, minFontSizePt: 8 },
  { key: 'inviterPhone', xMm: 118, yMm: 213, widthMm: 38, heightMm: 6, fontSizePt: 10, minFontSizePt: 8 },
  { key: 'inviterExtension', xMm: 171, yMm: 213, widthMm: 24, heightMm: 6, fontSizePt: 10, minFontSizePt: 8 },
  { key: 'organisationName', xMm: 46, yMm: 230, widthMm: 98, heightMm: 6, fontSizePt: 10, minFontSizePt: 7 },
  { key: 'contactPersonName', xMm: 46, yMm: 240, widthMm: 58, heightMm: 6, fontSizePt: 10, minFontSizePt: 7 },
  { key: 'contactPhone', xMm: 118, yMm: 240, widthMm: 38, heightMm: 6, fontSizePt: 10, minFontSizePt: 8 },
  { key: 'contactExtension', xMm: 171, yMm: 240, widthMm: 24, heightMm: 6, fontSizePt: 10, minFontSizePt: 8 },
  { key: 'applicantNationality', xMm: 57, yMm: 80, widthMm: 38, heightMm: 6, fontSizePt: 10, minFontSizePt: 8 },
  { key: 'applicantOccupation', xMm: 135, yMm: 80, widthMm: 45, heightMm: 6, fontSizePt: 10, minFontSizePt: 8 },
  { key: 'applicantPassportName', xMm: 57, yMm: 91, widthMm: 88, heightMm: 6, fontSizePt: 10, minFontSizePt: 7 },
  { key: 'applicantDateOfBirthYear', xMm: 68, yMm: 101, widthMm: 18, heightMm: 5, fontSizePt: 10 },
  { key: 'applicantDateOfBirthMonth', xMm: 95, yMm: 101, widthMm: 9, heightMm: 5, fontSizePt: 10 },
  { key: 'applicantDateOfBirthDay', xMm: 112, yMm: 101, widthMm: 9, heightMm: 5, fontSizePt: 10 },
  { key: 'applicantAge', xMm: 137, yMm: 101, widthMm: 10, heightMm: 5, fontSizePt: 10 },
  { key: 'invitationPurpose', xMm: 27, yMm: 126, widthMm: 160, heightMm: 14, fontSizePt: 10, multiline: true, maxLines: 2, lineHeight: 1.3 },
  { key: 'invitationBackground', xMm: 27, yMm: 149, widthMm: 160, heightMm: 24, fontSizePt: 10, multiline: true, maxLines: 3, lineHeight: 1.3 },
  { key: 'relationshipToApplicant', xMm: 49, yMm: 181, widthMm: 80, heightMm: 7, fontSizePt: 10, minFontSizePt: 8 },
];

export type CheckPlacement = {
  key: string;
  xMm: number;
  yMm: number;
  sizeMm: number;
};

export const checkPlacements: CheckPlacement[] = [
  { key: 'applicantGenderMale', xMm: 157, yMm: 91, sizeMm: 3.2 },
  { key: 'applicantGenderFemale', xMm: 174, yMm: 91, sizeMm: 3.2 },
];
